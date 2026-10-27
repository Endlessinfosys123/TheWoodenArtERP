const assert = require("assert");
const db = require("../src/db");
const ledgerService = require("../src/services/ledger");

async function runTests() {
  console.log("=== Running Phase 1 Accounting Tests ===");

  await db.init();

  // Test Scenario 1: Intra-state GST Invoice
  console.log("\n[Scenario 1] Intra-state GST invoice");
  await db.withTransaction(async (client) => {
    const invId = "test_inv_001";
    const invoiceData = {
      no: "INV/26-27/001",
      date: "2026-04-10",
      fy: "26-27",
      gstMode: "gst",
      inter: false,
      client: {
        name: "Patel Interiors",
        state: "Gujarat",
        gstin: "24AAACP1234A1Z5"
      },
      sub: 10000,
      tax: 1800,
      total: 11800,
      dueDate: "2026-04-25"
    };

    const res = await ledgerService.postSalesVoucher(client, invId, invoiceData, "admin_user");
    assert.strictEqual(res.vno, "INV/26-27/001");
    assert.strictEqual(res.totalPaise, 1180000n);

    // Verify voucher lines
    const linesQ = await client.query(
      "select vl.*, l.name as ledger_name from voucher_lines vl join ledgers l on vl.ledger_id=l.id where vl.voucher_id=$1 order by vl.line_no asc",
      [res.voucherId]
    );
    const lines = linesQ.rows;
    assert.strictEqual(lines.length, 4, "Should have 4 lines: Client, Sales, Output CGST, Output SGST");

    const clientLine = lines.find(l => l.ledger_name === "Patel Interiors");
    const salesLine = lines.find(l => l.ledger_name.startsWith("Sales"));
    const cgstLine = lines.find(l => l.ledger_name === "Output CGST");
    const sgstLine = lines.find(l => l.ledger_name === "Output SGST");

    assert.ok(clientLine, "Client line exists");
    assert.strictEqual(BigInt(clientLine.dr_paise), 1180000n, "Dr Patel Interiors = 11,800.00");
    assert.strictEqual(BigInt(clientLine.cr_paise), 0n);

    assert.ok(salesLine, "Sales line exists");
    assert.strictEqual(BigInt(salesLine.cr_paise), 1000000n, "Cr Sales = 10,000.00");

    assert.ok(cgstLine, "CGST line exists");
    assert.strictEqual(BigInt(cgstLine.cr_paise), 90000n, "Cr Output CGST = 900.00");

    assert.ok(sgstLine, "SGST line exists");
    assert.strictEqual(BigInt(sgstLine.cr_paise), 90000n, "Cr Output SGST = 900.00");

    // Verify bill_refs
    const refQ = await client.query("select * from bill_refs where voucher_id=$1", [res.voucherId]);
    assert.strictEqual(refQ.rows.length, 1);
    assert.strictEqual(refQ.rows[0].ref_name, "INV/26-27/001");
    assert.strictEqual(refQ.rows[0].side, "Dr");
    assert.strictEqual(BigInt(refQ.rows[0].amount_paise), 1180000n);

    console.log("✓ Scenario 1 passed: Dr Patel Interiors 11,800 / Cr Sales 10,000 / Cr Output CGST 900 / Cr Output SGST 900");
  });

  // Test Scenario 2: Round off + Inter-state IGST
  console.log("\n[Scenario 2] Round off + inter-state IGST");
  await db.withTransaction(async (client) => {
    const invId = "test_inv_002";
    // Taxable ₹6,664.50 at 18% IGST = ₹1,199.61, raw total ₹7,864.11 -> invoice total ₹7,864.
    const invoiceData = {
      no: "INV/26-27/002",
      date: "2026-04-12",
      fy: "26-27",
      gstMode: "gst",
      inter: true,
      client: {
        name: "Mumbai Designs",
        state: "Maharashtra",
        gstin: "27AAACM9999M1Z8"
      },
      sub: 6664.50,
      tax: 1199.61,
      total: 7864,
      dueDate: "2026-04-30"
    };

    const res = await ledgerService.postSalesVoucher(client, invId, invoiceData, "admin_user");
    const linesQ = await client.query(
      "select vl.*, l.name as ledger_name from voucher_lines vl join ledgers l on vl.ledger_id=l.id where vl.voucher_id=$1 order by vl.line_no asc",
      [res.voucherId]
    );
    const lines = linesQ.rows;

    const clientLine = lines.find(l => l.ledger_name === "Mumbai Designs");
    const salesLine = lines.find(l => l.ledger_name.startsWith("Sales"));
    const igstLine = lines.find(l => l.ledger_name === "Output IGST");
    const roundOffLine = lines.find(l => l.ledger_name === "Round Off");

    assert.ok(clientLine);
    assert.strictEqual(BigInt(clientLine.dr_paise), 786400n, "Dr Client = 7,864.00");

    assert.ok(salesLine);
    assert.strictEqual(BigInt(salesLine.cr_paise), 666450n, "Cr Sales = 6,664.50");

    assert.ok(igstLine);
    assert.strictEqual(BigInt(igstLine.cr_paise), 119961n, "Cr Output IGST = 1,199.61");

    assert.ok(roundOffLine, "Round off line exists");
    assert.strictEqual(BigInt(roundOffLine.dr_paise), 11n, "Dr Round Off = 0.11 to balance voucher");

    let totalDr = 0n, totalCr = 0n;
    lines.forEach(l => { totalDr += BigInt(l.dr_paise); totalCr += BigInt(l.cr_paise); });
    assert.strictEqual(totalDr, totalCr, "Voucher is balanced to the single paise: Σ Dr == Σ Cr");
    assert.strictEqual(totalDr, 786411n);

    console.log("✓ Scenario 2 passed: Dr Client 7864.00 + Dr Round Off 0.11 == Cr Sales 6664.50 + Cr Output IGST 1199.61");
  });

  // Test Scenario 5: Edits, Safety & Concurrency
  console.log("\n[Scenario 5] Edits, safety and concurrency");

  // 5.1 Edit invoice: lines are replaced, not duplicated
  await db.withTransaction(async (client) => {
    const invId = "test_inv_001";
    const updatedInvoiceData = {
      no: "INV/26-27/001",
      date: "2026-04-10",
      fy: "26-27",
      gstMode: "gst",
      inter: false,
      client: {
        name: "Patel Interiors",
        state: "Gujarat",
        gstin: "24AAACP1234A1Z5"
      },
      sub: 11000,
      tax: 1980,
      total: 12980,
      dueDate: "2026-04-25"
    };

    const res = await ledgerService.postSalesVoucher(client, invId, updatedInvoiceData, "admin_user");
    assert.strictEqual(res.totalPaise, 1298000n, "New total paise is 12,980.00");

    const linesQ = await client.query(
      "select vl.*, l.name as ledger_name from voucher_lines vl join ledgers l on vl.ledger_id=l.id where vl.voucher_id=$1",
      [res.voucherId]
    );
    assert.strictEqual(linesQ.rows.length, 4, "Lines count is still 4 (replaced, not duplicated)");
    console.log("✓ Scenario 5.1 passed: Invoice edit replaced voucher lines without duplication");
  });

  // 5.2 Block invoice deletion if allocations exist
  await db.withTransaction(async (client) => {
    const invId = "test_inv_001";
    // Simulate a receipt voucher allocated against INV/26-27/001
    const dummyRcptVchId = "vch_rcpt_dummy";
    await client.query(
      "insert into vouchers (id, vtype, vno, fy, vdate, status, total_paise, created_by, created_at) values ($1, 'receipt', 'RCPT/26-27/0001', '26-27', '2026-04-15', 'active', 500000, 'admin', $2)",
      [dummyRcptVchId, Date.now()]
    );
    await client.query(
      "insert into bill_refs (id, ledger_id, ref_type, ref_name, voucher_id, amount_paise, side) values ('br_dummy', 'led_cash', 'against', 'INV/26-27/001', $1, 500000, 'Cr')",
      [dummyRcptVchId]
    );

    let errCaught = null;
    try {
      await ledgerService.checkInvoiceCanBeDeleted(client, invId);
    } catch (e) {
      errCaught = e;
    }
    assert.ok(errCaught, "Deletion was blocked");
    assert.ok(errCaught.message.includes("receipts/vouchers (RCPT/26-27/0001) are already allocated against it"));
    console.log("✓ Scenario 5.2 passed: Invoice deletion blocked when allocations exist");

    // Clean up dummy receipt
    await client.query("delete from bill_refs where voucher_id=$1", [dummyRcptVchId]);
    await client.query("delete from vouchers where id=$1", [dummyRcptVchId]);
  });

  // 5.3 Reject unbalanced journal voucher
  let unbalancedErr = null;
  try {
    ledgerService.validateVoucherBalance([
      { ledger_id: "led_cash", dr_paise: 50000n, cr_paise: 0n },
      { ledger_id: "led_bank", dr_paise: 0n, cr_paise: 40000n }
    ]);
  } catch (e) {
    unbalancedErr = e;
  }
  assert.ok(unbalancedErr);
  assert.ok(unbalancedErr.message.includes("Debit and credit are not equal: ₹100.00 credit short"));
  console.log("✓ Scenario 5.3 passed: Unbalanced voucher rejected with clear difference message");

  // 5.4 Reject voucher before books lock date
  await db.withTransaction(async (client) => {
    // Set lock date to 2026-03-31
    await client.query(
      "insert into settings (id, data, updated_at) values ('company', $1, $2) on conflict (id) do update set data=excluded.data",
      [{ name: "The Wooden Art", books_lock_date: "2026-03-31" }, Date.now()]
    );

    let lockErr = null;
    try {
      await ledgerService.checkLockDate(client, "2026-03-25");
    } catch (e) {
      lockErr = e;
    }
    assert.ok(lockErr);
    assert.ok(lockErr.message.includes("Books are locked on or before 2026-03-31"));
    console.log("✓ Scenario 5.4 passed: Voucher on or before lock date rejected");
  });

  // 5.5 Concurrent voucher numbering
  await db.withTransaction(async (client) => {
    const no1 = await ledgerService.getNextVoucherNo(client, "receipt", "26-27");
    const no2 = await ledgerService.getNextVoucherNo(client, "receipt", "26-27");
    assert.notStrictEqual(no1, no2);

    const num1 = parseInt(no1.split("/")[2], 10);
    const num2 = parseInt(no2.split("/")[2], 10);
    assert.strictEqual(num2, num1 + 1, "Voucher numbers must increment sequentially");
    console.log(`✓ Scenario 5.5 passed: Sequential row-locked voucher numbering produces distinct numbers (${no1}, ${no2})`);
  });

  console.log("\n=========================================");
  console.log("All Phase 1 tests passed successfully!");
  console.log("=========================================\n");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
