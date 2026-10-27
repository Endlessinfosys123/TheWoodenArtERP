// Backfill script: posts vouchers for all existing invoices, payments, vendor bills, and transactions
require("dotenv").config();
const db = require("../src/db");
const ledgerService = require("../src/services/ledger");
const { newId } = require("../src/util");

const isApply = process.argv.includes("--apply");

async function backfill() {
  console.log(`=== Khata Desk -> Tally Double-Entry Backfill [${isApply ? "APPLY MODE" : "DRY RUN MODE"}] ===\n`);

  await db.init();

  await db.withTransaction(async (client) => {
    // 1. Fetch all existing records
    const clientsQ = await client.query("select id, data from clients");
    const vendorsQ = await client.query("select id, data from vendors");
    const invoicesQ = await client.query("select id, data, created_at, created_by from invoices order by created_at asc");
    const billsQ = await client.query("select id, data, created_at, created_by from vendor_bills order by created_at asc");
    const txnsQ = await client.query("select id, data, created_at, created_by from transactions order by created_at asc");

    console.log(`Found:`);
    console.log(`- ${clientsQ.rows.length} Clients`);
    console.log(`- ${vendorsQ.rows.length} Vendors`);
    console.log(`- ${invoicesQ.rows.length} Invoices`);
    console.log(`- ${billsQ.rows.length} Vendor Bills`);
    console.log(`- ${txnsQ.rows.length} Transactions (Income/Expense)\n`);

    // 2. Ensure Client Ledgers exist
    console.log("Syncing client ledgers...");
    for (const r of clientsQ.rows) {
      await ledgerService.getOrCreateClientLedger(client, r.data, r.id);
    }

    // 3. Ensure Vendor Ledgers exist
    console.log("Syncing vendor ledgers...");
    for (const r of vendorsQ.rows) {
      await ledgerService.getOrCreateVendorLedger(client, r.data, r.id);
    }

    // Map expense category to ledger
    const expCategoryMap = {
      "rent": "led_exp_rent",
      "electricity": "led_exp_electricity",
      "transport": "led_exp_transport",
      "fuel": "led_exp_fuel",
      "repair": "led_exp_repair",
      "office": "led_exp_office",
      "phone": "led_exp_phone",
      "food": "led_exp_food",
      "tax/fees": "led_exp_tax_fees",
      "tax": "led_exp_tax_fees",
      "fees": "led_exp_tax_fees",
      "machine": "led_machine",
      "machine running": "led_machine",
      "labour": "led_labour",
      "wages": "led_labour",
      "labour/wages": "led_labour"
    };

    const incCategoryMap = {
      "service": "led_inc_service",
      "interest": "led_inc_interest",
      "client payment": "led_sales_cnc"
    };

    let salesCount = 0;
    let rcptCount = 0;
    let purchCount = 0;
    let pymtCount = 0;
    let txnVchCount = 0;
    let mismatches = 0;

    // 4. Invoices & Invoice Payments
    console.log("\nPosting Sales Vouchers and Receipt Vouchers from Invoices...");
    for (const r of invoicesQ.rows) {
      const inv = r.data || {};
      const invId = r.id;
      const invNo = inv.no;

      if (!invNo) continue;

      // Check if sales voucher already exists
      const existingSales = await client.query(
        "select id from vouchers where source_type='invoice' and source_id=$1",
        [invId]
      );

      if (!existingSales.rows[0]) {
        if (isApply) {
          await ledgerService.postSalesVoucher(client, invId, inv, r.created_by);
        }
        salesCount++;
      }

      // Check payments array on this invoice
      const payments = inv.payments || [];
      const clientLedgerId = await ledgerService.getOrCreateClientLedger(client, inv.client || {}, inv.client?.id || null);

      let allocatedPaise = 0n;

      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        const pDate = p.date || inv.date || new Date().toISOString().slice(0, 10);
        const pFy = ledgerService.getFY(pDate);
        const pAmtPaise = ledgerService.toPaise(p.amount);
        allocatedPaise += pAmtPaise;

        const pSourceId = `${invId}_p_${i}`;

        const existingRcpt = await client.query(
          "select id from vouchers where source_type='invoice' and source_id=$1",
          [pSourceId]
        );

        if (!existingRcpt.rows[0]) {
          if (isApply) {
            const vno = await ledgerService.getNextVoucherNo(client, "receipt", pFy);
            const rcptVchId = "vch_" + newId();
            const now = p.at || Number(r.created_at) || Date.now();
            const bankLedgerId = (p.mode && p.mode.toLowerCase().includes("cash")) ? "led_cash" : "led_bank";

            await client.query(
              `insert into vouchers (
                id, vtype, vno, fy, vdate, narration, ref_no, mode, source_type, source_id,
                status, total_paise, created_by, created_at, updated_by, updated_at
              ) values ($1, 'receipt', $2, $3, $4, $5, $6, $7, 'invoice', $8, 'active', $9, $10, $11, $10, $11)`,
              [
                rcptVchId,
                vno,
                pFy,
                pDate,
                `Payment received for Inv #${invNo} (${p.mode || "Payment"})`,
                invNo,
                p.mode || "UPI",
                pSourceId,
                pAmtPaise,
                r.created_by,
                now
              ]
            );

            // Dr Cash/Bank, Cr Client
            await client.query(
              "insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, $4, 0, 1)",
              [newId(), rcptVchId, bankLedgerId, pAmtPaise]
            );
            await client.query(
              "insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, 0, $4, 2)",
              [newId(), rcptVchId, clientLedgerId, pAmtPaise]
            );

            // Bill ref against invoice
            await client.query(
              `insert into bill_refs (id, ledger_id, ref_type, ref_name, voucher_id, amount_paise, side)
               values ($1, $2, 'against', $3, $4, $5, 'Cr')`,
              [newId(), clientLedgerId, invNo, rcptVchId, pAmtPaise]
            );
          }
          rcptCount++;
        }
      }

      // Reconciliation check
      const oldPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const newPaidRupees = Number(allocatedPaise) / 100;
      if (Math.abs(oldPaid - newPaidRupees) > 0.01) {
        console.warn(`[MISMATCH] Invoice ${invNo}: old paid ₹${oldPaid} vs allocated ₹${newPaidRupees}`);
        mismatches++;
      }
    }

    // 5. Vendor Bills & Bill Payments
    console.log("\nPosting Purchase Vouchers and Payment Vouchers from Vendor Bills...");
    for (const r of billsQ.rows) {
      const bill = r.data || {};
      const billId = r.id;
      const billNo = bill.billNo || `BILL-${billId.slice(-6)}`;

      const existingPurch = await client.query(
        "select id from vouchers where source_type='vendor_bill' and source_id=$1",
        [billId]
      );

      if (!existingPurch.rows[0]) {
        if (isApply) {
          await ledgerService.postPurchaseVoucher(client, billId, bill, r.created_by);
        }
        purchCount++;
      }

      const payments = bill.payments || [];
      let vendorData = {};
      if (bill.vendorId) {
        const vq = await client.query("select data from vendors where id=$1", [bill.vendorId]);
        vendorData = vq.rows[0]?.data || {};
      }
      const vendorLedgerId = await ledgerService.getOrCreateVendorLedger(client, vendorData, bill.vendorId || null);

      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        const pDate = p.date || bill.date || new Date().toISOString().slice(0, 10);
        const pFy = ledgerService.getFY(pDate);
        const pAmtPaise = ledgerService.toPaise(p.amount);
        const pSourceId = `${billId}_p_${i}`;

        const existingPymt = await client.query(
          "select id from vouchers where source_type='vendor_bill' and source_id=$1",
          [pSourceId]
        );

        if (!existingPymt.rows[0]) {
          if (isApply) {
            const vno = await ledgerService.getNextVoucherNo(client, "payment", pFy);
            const pymtVchId = "vch_" + newId();
            const now = p.at || Number(r.created_at) || Date.now();
            const bankLedgerId = (p.mode && p.mode.toLowerCase().includes("cash")) ? "led_cash" : "led_bank";

            await client.query(
              `insert into vouchers (
                id, vtype, vno, fy, vdate, narration, ref_no, mode, source_type, source_id,
                status, total_paise, created_by, created_at, updated_by, updated_at
              ) values ($1, 'payment', $2, $3, $4, $5, $6, $7, 'vendor_bill', $8, 'active', $9, $10, $11, $10, $11)`,
              [
                pymtVchId,
                vno,
                pFy,
                pDate,
                `Payment made for Bill #${billNo}`,
                billNo,
                p.mode || "Bank",
                pSourceId,
                pAmtPaise,
                r.created_by,
                now
              ]
            );

            // Dr Vendor, Cr Cash/Bank
            await client.query(
              "insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, $4, 0, 1)",
              [newId(), pymtVchId, vendorLedgerId, pAmtPaise]
            );
            await client.query(
              "insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, 0, $4, 2)",
              [newId(), pymtVchId, bankLedgerId, pAmtPaise]
            );

            await client.query(
              `insert into bill_refs (id, ledger_id, ref_type, ref_name, voucher_id, amount_paise, side)
               values ($1, $2, 'against', $3, $4, $5, 'Dr')`,
              [newId(), vendorLedgerId, billNo, pymtVchId, pAmtPaise]
            );
          }
          pymtCount++;
        }
      }
    }

    // 6. Manual Transactions (Income & Expense)
    console.log("\nPosting Vouchers from manual transactions...");
    for (const r of txnsQ.rows) {
      const t = r.data || {};
      const txnId = r.id;

      const existingTxnVch = await client.query(
        "select id from vouchers where source_type='txn' and source_id=$1",
        [txnId]
      );

      if (!existingTxnVch.rows[0]) {
        if (isApply) {
          const tDate = t.date || new Date().toISOString().slice(0, 10);
          const tFy = ledgerService.getFY(tDate);
          const tAmtPaise = ledgerService.toPaise(t.amount);
          const isInc = t.type === "income";
          const vtype = isInc ? "receipt" : "payment";
          const vno = await ledgerService.getNextVoucherNo(client, vtype, tFy);
          const vchId = "vch_" + newId();
          const now = Number(r.created_at) || Date.now();
          const bankLedgerId = (t.mode && t.mode.toLowerCase().includes("cash")) ? "led_cash" : "led_bank";

          let contraLedgerId;
          const catKey = (t.category || "").toLowerCase().trim();

          if (isInc) {
            contraLedgerId = incCategoryMap[catKey] || "led_inc_other";
          } else {
            contraLedgerId = expCategoryMap[catKey] || "led_exp_other";
          }

          await client.query(
            `insert into vouchers (
              id, vtype, vno, fy, vdate, narration, ref_no, mode, source_type, source_id,
              status, total_paise, created_by, created_at, updated_by, updated_at
            ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'txn', $9, 'active', $10, $11, $12, $11, $12)`,
            [
              vchId,
              vtype,
              vno,
              tFy,
              tDate,
              `${t.category || (isInc ? "Income" : "Expense")} - ${t.party || t.note || "General"}`,
              t.note || null,
              t.mode || "Cash",
              txnId,
              tAmtPaise,
              r.created_by,
              now
            ]
          );

          if (isInc) {
            // Dr Bank/Cash, Cr Income Ledger
            await client.query("insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, $4, 0, 1)", [newId(), vchId, bankLedgerId, tAmtPaise]);
            await client.query("insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, 0, $4, 2)", [newId(), vchId, contraLedgerId, tAmtPaise]);
          } else {
            // Dr Expense Ledger, Cr Bank/Cash
            await client.query("insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, $4, 0, 1)", [newId(), vchId, contraLedgerId, tAmtPaise]);
            await client.query("insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, 0, $4, 2)", [newId(), vchId, bankLedgerId, tAmtPaise]);
          }
        }
        txnVchCount++;
      }
    }

    console.log("\n--- RECONCILIATION REPORT ---");
    console.log(`Sales Vouchers to post:      ${salesCount}`);
    console.log(`Receipt Vouchers to post:    ${rcptCount}`);
    console.log(`Purchase Vouchers to post:   ${purchCount}`);
    console.log(`Payment Vouchers to post:    ${pymtCount}`);
    console.log(`Transaction Vouchers to post:${txnVchCount}`);
    console.log(`Total Mismatches Found:      ${mismatches}`);

    if (mismatches > 0) {
      throw new Error(`Backfill stopped: ${mismatches} mismatches detected.`);
    }

    if (!isApply) {
      console.log("\n[DRY RUN COMPLETE] No changes were committed. To apply, run: node scripts/backfill-ledger.js --apply");
      // Rollback transaction in dry run mode
      throw new Error("DRY_RUN_ROLLBACK");
    } else {
      console.log("\n[SUCCESS] Backfill applied successfully into the database!");
    }
  }).catch((err) => {
    if (err.message === "DRY_RUN_ROLLBACK") {
      process.exit(0);
    }
    console.error("\nBackfill failed:", err.message);
    process.exit(1);
  });
}

backfill();
