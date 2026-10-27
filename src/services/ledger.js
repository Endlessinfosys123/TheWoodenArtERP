// Core Double-Entry Ledger Engine for Tally-style Accounting
const { query, withTransaction } = require("../db");
const { newId } = require("../util");

function toPaise(amt) {
  if (typeof amt === "bigint") return amt;
  const n = Number(amt || 0);
  if (isNaN(n)) return 0n;
  return BigInt(Math.round(n * 100));
}

function toRupees(paise) {
  return Number(paise || 0n) / 100;
}

function formatINR(paise, side = null) {
  const p = typeof paise === "bigint" ? paise : BigInt(paise || 0);
  const isNeg = p < 0n;
  const absP = isNeg ? -p : p;
  const num = (Number(absP) / 100).toFixed(2);
  const [intPart, decPart] = num.split(".");
  let lastThree = intPart.slice(-3);
  const otherNumbers = intPart.slice(0, -3);
  if (otherNumbers !== "") {
    lastThree = "," + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  const res = `${isNeg ? "-" : ""}${formattedInt}.${decPart}`;
  return side ? `${res} ${side}` : res;
}

// Financial Year April 1 to March 31 e.g. '26-27'
function getFY(dateStr) {
  if (!dateStr) dateStr = new Date().toISOString().slice(0, 10);
  const d = new Date(dateStr + "T00:00:00");
  const month = d.getMonth() + 1; // 1 - 12
  const year = d.getFullYear();
  const startYr = month >= 4 ? year : year - 1;
  const endYr = startYr + 1;
  return `${String(startYr).slice(-2)}-${String(endYr).slice(-2)}`;
}

// Check if a voucher date violates the books lock date
async function checkLockDate(client, vdate) {
  const res = await client.query("select data from settings where id='company'");
  const settings = res.rows[0]?.data || {};
  const lockDate = settings.books_lock_date || settings.booksLockDate;
  if (lockDate && vdate <= lockDate) {
    throw new Error(`Books are locked on or before ${lockDate}. Voucher on ${vdate} cannot be created, altered, or cancelled.`);
  }
}

// Atomic voucher numbering per voucher type & financial year
async function getNextVoucherNo(client, vtype, fy) {
  const prefixes = {
    sales: "SALES",
    purchase: "PURCH",
    receipt: "RCPT",
    payment: "PYMT",
    contra: "CNTR",
    journal: "JRNL",
    credit_note: "CN",
    debit_note: "DN"
  };
  const prefix = prefixes[vtype] || vtype.toUpperCase();

  // Row lock on voucher_sequences
  const seqRes = await client.query(
    "select last_no from voucher_sequences where vtype=$1 and fy=$2 for update",
    [vtype, fy]
  );

  let nextNo = 1;
  if (seqRes.rows.length === 0) {
    await client.query(
      "insert into voucher_sequences (vtype, fy, last_no) values ($1, $2, $3) on conflict (vtype, fy) do update set last_no = voucher_sequences.last_no + 1",
      [vtype, fy, 1]
    );
  } else {
    nextNo = seqRes.rows[0].last_no + 1;
    await client.query(
      "update voucher_sequences set last_no = $1 where vtype=$2 and fy=$3",
      [nextNo, vtype, fy]
    );
  }

  const padded = String(nextNo).padStart(4, "0");
  return `${prefix}/${fy}/${padded}`;
}

// Audit log helper
async function logAudit(client, { entity, entityId, action, before, after, userId }) {
  await client.query(
    "insert into audit_log (id, entity, entity_id, action, before, after, user_id, at) values ($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      newId(),
      entity,
      entityId,
      action,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      userId || null,
      Date.now()
    ]
  );
}

// Find or create ledger for client
async function getOrCreateClientLedger(client, clientData, partyId = null) {
  const cName = (clientData.name || "").trim();
  const gstin = (clientData.gstin || "").trim().toUpperCase();

  if (partyId) {
    const byId = await client.query(
      "select id, name, group_id from ledgers where party_type='client' and party_id=$1",
      [partyId]
    );
    if (byId.rows[0]) return byId.rows[0].id;
  }

  if (gstin) {
    const byGst = await client.query(
      "select id, name, group_id from ledgers where party_type='client' and upper(gstin)=$1",
      [gstin]
    );
    if (byGst.rows[0]) {
      if (partyId && !byGst.rows[0].party_id) {
        await client.query("update ledgers set party_id=$1, updated_at=$2 where id=$3", [partyId, Date.now(), byGst.rows[0].id]);
      }
      return byGst.rows[0].id;
    }
  }

  const byName = await client.query(
    "select id, name, group_id from ledgers where party_type='client' and lower(name)=lower($1)",
    [cName]
  );
  if (byName.rows[0]) {
    if (partyId && !byName.rows[0].party_id) {
      await client.query("update ledgers set party_id=$1, updated_at=$2 where id=$3", [partyId, Date.now(), byName.rows[0].id]);
    }
    return byName.rows[0].id;
  }

  // Create new Client Ledger under Sundry Debtors
  const ledgerId = "led_c_" + newId();
  const now = Date.now();
  await client.query(
    `insert into ledgers (
      id, name, group_id, party_type, party_id, opening_paise, opening_side,
      gstin, state, phone, address, bill_wise, is_system, active, created_at, updated_at
    ) values ($1, $2, 'grp_debtors', 'client', $3, 0, 'Dr', $4, $5, $6, $7, true, false, true, $8, $8)`,
    [
      ledgerId,
      cName || "Unnamed Client",
      partyId,
      gstin || null,
      clientData.state || null,
      clientData.phone || null,
      clientData.address || null,
      now
    ]
  );

  return ledgerId;
}

// Find or create ledger for vendor
async function getOrCreateVendorLedger(client, vendorData, partyId = null) {
  const vName = (vendorData.name || "").trim();
  const gstin = (vendorData.gstin || "").trim().toUpperCase();

  if (partyId) {
    const byId = await client.query(
      "select id, name, group_id from ledgers where party_type='vendor' and party_id=$1",
      [partyId]
    );
    if (byId.rows[0]) return byId.rows[0].id;
  }

  if (gstin) {
    const byGst = await client.query(
      "select id, name, group_id from ledgers where party_type='vendor' and upper(gstin)=$1",
      [gstin]
    );
    if (byGst.rows[0]) {
      if (partyId && !byGst.rows[0].party_id) {
        await client.query("update ledgers set party_id=$1, updated_at=$2 where id=$3", [partyId, Date.now(), byGst.rows[0].id]);
      }
      return byGst.rows[0].id;
    }
  }

  const byName = await client.query(
    "select id, name, group_id from ledgers where party_type='vendor' and lower(name)=lower($1)",
    [vName]
  );
  if (byName.rows[0]) {
    if (partyId && !byName.rows[0].party_id) {
      await client.query("update ledgers set party_id=$1, updated_at=$2 where id=$3", [partyId, Date.now(), byName.rows[0].id]);
    }
    return byName.rows[0].id;
  }

  // Create new Vendor Ledger under Sundry Creditors
  const ledgerId = "led_v_" + newId();
  const now = Date.now();
  await client.query(
    `insert into ledgers (
      id, name, group_id, party_type, party_id, opening_paise, opening_side,
      gstin, state, phone, address, bill_wise, is_system, active, created_at, updated_at
    ) values ($1, $2, 'grp_creditors', 'vendor', $3, 0, 'Cr', $4, $5, $6, $7, true, false, true, $8, $8)`,
    [
      ledgerId,
      vName || "Unnamed Vendor",
      partyId,
      gstin || null,
      vendorData.state || null,
      vendorData.phone || null,
      vendorData.address || null,
      now
    ]
  );

  return ledgerId;
}

// Validate double-entry lines: Sum(Dr) === Sum(Cr)
function validateVoucherBalance(lines) {
  if (!lines || lines.length < 2) {
    throw new Error("A voucher must have at least 2 lines (debit and credit).");
  }
  let totalDr = 0n;
  let totalCr = 0n;
  for (const line of lines) {
    const dr = typeof line.dr_paise === "bigint" ? line.dr_paise : BigInt(line.dr_paise || 0);
    const cr = typeof line.cr_paise === "bigint" ? line.cr_paise : BigInt(line.cr_paise || 0);
    if (dr < 0n || cr < 0n) {
      throw new Error("Debit and credit amounts cannot be negative.");
    }
    if (dr > 0n && cr > 0n) {
      throw new Error("A voucher line cannot have both debit and credit amounts.");
    }
    totalDr += dr;
    totalCr += cr;
  }

  if (totalDr !== totalCr) {
    const diff = Number(totalDr > totalCr ? totalDr - totalCr : totalCr - totalDr) / 100;
    const shortSide = totalDr > totalCr ? "credit" : "debit";
    throw new Error(`Debit and credit are not equal: ₹${diff.toFixed(2)} ${shortSide} short.`);
  }

  return totalDr;
}

// -------------------------------------------------------------
// POSTING RULE A: Post Sales Voucher from Invoice
// -------------------------------------------------------------
async function postSalesVoucher(client, invoiceId, invoiceData, userId) {
  const vdate = invoiceData.date || new Date().toISOString().slice(0, 10);
  await checkLockDate(client, vdate);

  const fy = invoiceData.fy || getFY(vdate);
  const clientInfo = invoiceData.client || {};
  const clientLedgerId = await getOrCreateClientLedger(client, clientInfo, clientInfo.id || null);

  const grandTotalPaise = toPaise(invoiceData.total);
  const subTotalPaise = toPaise(invoiceData.sub);
  const isGst = invoiceData.gstMode === "gst";
  const isInter = isGst && !!invoiceData.inter;
  const taxPaise = isGst ? toPaise(invoiceData.tax) : 0n;

  const lines = [];
  let lineNo = 1;

  // Dr Client = grand total
  lines.push({
    ledger_id: clientLedgerId,
    dr_paise: grandTotalPaise,
    cr_paise: 0n,
    line_no: lineNo++
  });

  // Cr Sales = taxable subtotal
  // Default to CNC Job Work unless specifically material
  const salesLedgerId = invoiceData.items?.every(i => i.pricing === "sqft" || i.pricing === "unit" && i.material) ? "led_sales_mat" : "led_sales_cnc";
  lines.push({
    ledger_id: salesLedgerId,
    dr_paise: 0n,
    cr_paise: subTotalPaise,
    line_no: lineNo++
  });

  // GST Lines
  if (isGst && taxPaise > 0n) {
    if (isInter) {
      lines.push({
        ledger_id: "led_out_igst",
        dr_paise: 0n,
        cr_paise: taxPaise,
        line_no: lineNo++
      });
    } else {
      const cgst = taxPaise / 2n;
      const sgst = taxPaise - cgst;
      lines.push({
        ledger_id: "led_out_cgst",
        dr_paise: 0n,
        cr_paise: cgst,
        line_no: lineNo++
      });
      lines.push({
        ledger_id: "led_out_sgst",
        dr_paise: 0n,
        cr_paise: sgst,
        line_no: lineNo++
      });
    }
  }

  // Calculate difference for Round Off
  let sumDr = 0n;
  let sumCr = 0n;
  lines.forEach(l => { sumDr += l.dr_paise; sumCr += l.cr_paise; });

  const diff = sumDr - sumCr;
  if (diff > 0n) {
    // Dr > Cr, so Cr Round Off
    lines.push({
      ledger_id: "led_round_off",
      dr_paise: 0n,
      cr_paise: diff,
      line_no: lineNo++
    });
  } else if (diff < 0n) {
    // Cr > Dr, so Dr Round Off
    lines.push({
      ledger_id: "led_round_off",
      dr_paise: -diff,
      cr_paise: 0n,
      line_no: lineNo++
    });
  }

  // Validate balance
  const totalPaise = validateVoucherBalance(lines);

  // Check if voucher already exists for this invoice
  const existingVoucher = await client.query(
    "select * from vouchers where source_type='invoice' and source_id=$1",
    [invoiceId]
  );

  let voucherId;
  const now = Date.now();

  if (existingVoucher.rows[0]) {
    voucherId = existingVoucher.rows[0].id;
    const beforeVoucher = existingVoucher.rows[0];

    await client.query(
      `update vouchers set
        vno=$1, fy=$2, vdate=$3, narration=$4, status='active', cancel_reason=null,
        total_paise=$5, updated_by=$6, updated_at=$7
       where id=$8`,
      [
        invoiceData.no,
        fy,
        vdate,
        `Sales Invoice #${invoiceData.no} to ${clientInfo.name || "Client"}`,
        totalPaise,
        userId || null,
        now,
        voucherId
      ]
    );

    // Delete existing lines and bill_refs (idempotent overwrite)
    await client.query("delete from voucher_lines where voucher_id=$1", [voucherId]);
    await client.query("delete from bill_refs where voucher_id=$1 and ref_type='new'", [voucherId]);

    await logAudit(client, {
      entity: "voucher",
      entityId: voucherId,
      action: "update_sales",
      before: beforeVoucher,
      after: { id: voucherId, vno: invoiceData.no, total_paise: totalPaise.toString() },
      userId
    });
  } else {
    voucherId = "vch_" + newId();
    await client.query(
      `insert into vouchers (
        id, vtype, vno, fy, vdate, narration, ref_no, source_type, source_id,
        status, total_paise, created_by, created_at, updated_by, updated_at
      ) values ($1, 'sales', $2, $3, $4, $5, $6, 'invoice', $7, 'active', $8, $9, $10, $9, $10)`,
      [
        voucherId,
        invoiceData.no,
        fy,
        vdate,
        `Sales Invoice #${invoiceData.no} to ${clientInfo.name || "Client"}`,
        invoiceData.no,
        invoiceId,
        totalPaise,
        userId || null,
        now
      ]
    );

    await logAudit(client, {
      entity: "voucher",
      entityId: voucherId,
      action: "create_sales",
      before: null,
      after: { id: voucherId, vno: invoiceData.no, total_paise: totalPaise.toString() },
      userId
    });
  }

  // Insert voucher lines
  for (const l of lines) {
    await client.query(
      "insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, $4, $5, $6)",
      [newId(), voucherId, l.ledger_id, l.dr_paise, l.cr_paise, l.line_no]
    );
  }

  // Insert bill_ref New Ref
  await client.query(
    "insert into bill_refs (id, ledger_id, ref_type, ref_name, voucher_id, amount_paise, side, due_date) values ($1, $2, 'new', $3, $4, $5, 'Dr', $6)",
    [newId(), clientLedgerId, invoiceData.no, voucherId, grandTotalPaise, invoiceData.dueDate || null]
  );

  return { voucherId, vno: invoiceData.no, totalPaise };
}

// -------------------------------------------------------------
// Safe Invoice Deletion Check
// -------------------------------------------------------------
async function checkInvoiceCanBeDeleted(client, invoiceId) {
  const vRes = await client.query("select id, vno, vdate from vouchers where source_type='invoice' and source_id=$1", [invoiceId]);
  if (!vRes.rows[0]) return; // no voucher, ok to delete

  const { id: voucherId, vno, vdate } = vRes.rows[0];
  await checkLockDate(client, vdate);

  // Check if any receipts/credits are allocated against this invoice ref
  const againstRes = await client.query(
    "select br.*, v.vno as rcpt_vno from bill_refs br join vouchers v on br.voucher_id=v.id where br.ref_name=$1 and br.ref_type='against' and v.status='active'",
    [vno]
  );

  if (againstRes.rows.length > 0) {
    const refs = againstRes.rows.map(r => r.rcpt_vno || r.ref_name).join(", ");
    throw new Error(`Cannot delete invoice ${vno}: receipts/vouchers (${refs}) are already allocated against it. Please un-allocate or cancel those vouchers first.`);
  }

  // Safe to cancel the sales voucher
  await client.query(
    "update vouchers set status='cancelled', cancel_reason='Invoice deleted', updated_at=$1 where id=$2",
    [Date.now(), voucherId]
  );

  // Also remove its new bill_ref
  await client.query("delete from bill_refs where voucher_id=$1 and ref_type='new'", [voucherId]);
}

// -------------------------------------------------------------
// POSTING RULE B: Post Purchase Voucher from Vendor Bill
// -------------------------------------------------------------
async function postPurchaseVoucher(client, billId, billData, userId) {
  const vdate = billData.date || new Date().toISOString().slice(0, 10);
  await checkLockDate(client, vdate);

  const fy = getFY(vdate);
  const billNo = (billData.billNo || "").trim() || `BILL-${billId.slice(-6)}`;

  // Fetch vendor details
  let vendorData = {};
  if (billData.vendorId) {
    const vq = await client.query("select data from vendors where id=$1", [billData.vendorId]);
    vendorData = vq.rows[0]?.data || {};
  }
  const vendorLedgerId = await getOrCreateVendorLedger(client, vendorData, billData.vendorId || null);

  const grandTotalPaise = toPaise(billData.amount);
  const taxPaise = toPaise(billData.tax);
  const purchasePaise = grandTotalPaise - taxPaise;

  // Determine GST state vs Company state
  const coRes = await client.query("select data from settings where id='company'");
  const coState = (coRes.rows[0]?.data?.state || "Gujarat").trim().toLowerCase();
  const vState = (vendorData.state || "").trim().toLowerCase();
  const isInter = vState && vState !== coState;

  const lines = [];
  let lineNo = 1;

  // Dr Purchase Account
  lines.push({
    ledger_id: "led_purch_mat",
    dr_paise: purchasePaise,
    cr_paise: 0n,
    line_no: lineNo++
  });

  // Dr Input GST
  if (taxPaise > 0n) {
    if (isInter) {
      lines.push({
        ledger_id: "led_in_igst",
        dr_paise: taxPaise,
        cr_paise: 0n,
        line_no: lineNo++
      });
    } else {
      const cgst = taxPaise / 2n;
      const sgst = taxPaise - cgst;
      lines.push({
        ledger_id: "led_in_cgst",
        dr_paise: cgst,
        cr_paise: 0n,
        line_no: lineNo++
      });
      lines.push({
        ledger_id: "led_in_sgst",
        dr_paise: sgst,
        cr_paise: 0n,
        line_no: lineNo++
      });
    }
  }

  // Cr Vendor = bill total
  lines.push({
    ledger_id: vendorLedgerId,
    dr_paise: 0n,
    cr_paise: grandTotalPaise,
    line_no: lineNo++
  });

  const totalPaise = validateVoucherBalance(lines);

  const existingVoucher = await client.query(
    "select * from vouchers where source_type='vendor_bill' and source_id=$1",
    [billId]
  );

  let voucherId;
  const now = Date.now();

  if (existingVoucher.rows[0]) {
    voucherId = existingVoucher.rows[0].id;
    const beforeVoucher = existingVoucher.rows[0];

    await client.query(
      `update vouchers set
        vno=$1, fy=$2, vdate=$3, narration=$4, status='active', cancel_reason=null,
        total_paise=$5, updated_by=$6, updated_at=$7
       where id=$8`,
      [
        billNo,
        fy,
        vdate,
        `Purchase Bill #${billNo} from ${vendorData.name || "Vendor"}`,
        totalPaise,
        userId || null,
        now,
        voucherId
      ]
    );

    await client.query("delete from voucher_lines where voucher_id=$1", [voucherId]);
    await client.query("delete from bill_refs where voucher_id=$1 and ref_type='new'", [voucherId]);

    await logAudit(client, {
      entity: "voucher",
      entityId: voucherId,
      action: "update_purchase",
      before: beforeVoucher,
      after: { id: voucherId, vno: billNo, total_paise: totalPaise.toString() },
      userId
    });
  } else {
    voucherId = "vch_" + newId();
    await client.query(
      `insert into vouchers (
        id, vtype, vno, fy, vdate, narration, ref_no, source_type, source_id,
        status, total_paise, created_by, created_at, updated_by, updated_at
      ) values ($1, 'purchase', $2, $3, $4, $5, $6, 'vendor_bill', $7, 'active', $8, $9, $10, $9, $10)`,
      [
        voucherId,
        billNo,
        fy,
        vdate,
        `Purchase Bill #${billNo} from ${vendorData.name || "Vendor"}`,
        billNo,
        billId,
        totalPaise,
        userId || null,
        now
      ]
    );

    await logAudit(client, {
      entity: "voucher",
      entityId: voucherId,
      action: "create_purchase",
      before: null,
      after: { id: voucherId, vno: billNo, total_paise: totalPaise.toString() },
      userId
    });
  }

  for (const l of lines) {
    await client.query(
      "insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, $4, $5, $6)",
      [newId(), voucherId, l.ledger_id, l.dr_paise, l.cr_paise, l.line_no]
    );
  }

  // Insert bill_ref New Ref
  await client.query(
    "insert into bill_refs (id, ledger_id, ref_type, ref_name, voucher_id, amount_paise, side, due_date) values ($1, $2, 'new', $3, $4, $5, 'Cr', $6)",
    [newId(), vendorLedgerId, billNo, voucherId, grandTotalPaise, billData.dueDate || null]
  );

  return { voucherId, vno: billNo, totalPaise };
}

// Safe Vendor Bill Deletion Check
async function checkVendorBillCanBeDeleted(client, billId) {
  const vRes = await client.query("select id, vno, vdate from vouchers where source_type='vendor_bill' and source_id=$1", [billId]);
  if (!vRes.rows[0]) return;

  const { id: voucherId, vno, vdate } = vRes.rows[0];
  await checkLockDate(client, vdate);

  const againstRes = await client.query(
    "select br.*, v.vno as pymt_vno from bill_refs br join vouchers v on br.voucher_id=v.id where br.ref_name=$1 and br.ref_type='against' and v.status='active'",
    [vno]
  );

  if (againstRes.rows.length > 0) {
    const refs = againstRes.rows.map(r => r.pymt_vno || r.ref_name).join(", ");
    throw new Error(`Cannot delete vendor bill ${vno}: payment vouchers (${refs}) are already allocated against it. Please un-allocate or cancel those vouchers first.`);
  }

  await client.query(
    "update vouchers set status='cancelled', cancel_reason='Vendor bill deleted', updated_at=$1 where id=$2",
    [Date.now(), voucherId]
  );

  await client.query("delete from bill_refs where voucher_id=$1 and ref_type='new'", [voucherId]);
}

// -------------------------------------------------------------
// Manual Transactions (Income & Expense) Posting
// -------------------------------------------------------------
const expCategoryMap = {
  rent: "led_exp_rent",
  electricity: "led_exp_electricity",
  transport: "led_exp_transport",
  fuel: "led_exp_fuel",
  repair: "led_exp_repair",
  office: "led_exp_office",
  phone: "led_exp_phone",
  food: "led_exp_food",
  "tax/fees": "led_exp_tax_fees",
  tax: "led_exp_tax_fees",
  fees: "led_exp_tax_fees",
  machine: "led_machine",
  "machine running": "led_machine",
  labour: "led_labour",
  wages: "led_labour",
  "labour/wages": "led_labour"
};

const incCategoryMap = {
  service: "led_inc_service",
  interest: "led_inc_interest",
  "client payment": "led_sales_cnc"
};

async function postTxnVoucher(client, txnId, txnData, userId) {
  const vdate = txnData.date || new Date().toISOString().slice(0, 10);
  await checkLockDate(client, vdate);

  const fy = getFY(vdate);
  const amtPaise = toPaise(txnData.amount || 0);
  if (amtPaise <= 0n) return null;

  const isInc = txnData.type === "income";
  const vtype = isInc ? "receipt" : "payment";
  const mode = txnData.mode || "Bank";
  const bankLedgerId = (mode.toLowerCase().includes("cash")) ? "led_cash" : "led_bank";

  const catKey = (txnData.category || "").toLowerCase().trim();
  const contraLedgerId = isInc ? (incCategoryMap[catKey] || "led_inc_other") : (expCategoryMap[catKey] || "led_exp_other");

  const lines = [];
  if (isInc) {
    lines.push({ ledger_id: bankLedgerId, dr_paise: amtPaise, cr_paise: 0n, line_no: 1 });
    lines.push({ ledger_id: contraLedgerId, dr_paise: 0n, cr_paise: amtPaise, line_no: 2 });
  } else {
    lines.push({ ledger_id: contraLedgerId, dr_paise: amtPaise, cr_paise: 0n, line_no: 1 });
    lines.push({ ledger_id: bankLedgerId, dr_paise: 0n, cr_paise: amtPaise, line_no: 2 });
  }

  const existing = await client.query("select * from vouchers where source_type='txn' and source_id=$1", [txnId]);
  let voucherId, vno;
  const now = Date.now();
  const narration = txnData.note || `${isInc ? "Income" : "Expense"}: ${txnData.category || ""} - ${txnData.party || ""}`.trim();

  if (existing.rows[0]) {
    voucherId = existing.rows[0].id;
    vno = existing.rows[0].vno;
    await client.query(
      `update vouchers set vtype=$1, fy=$2, vdate=$3, narration=$4, mode=$5, status='active', cancel_reason=null,
       total_paise=$6, updated_by=$7, updated_at=$8 where id=$9`,
      [vtype, fy, vdate, narration, mode, amtPaise, userId || null, now, voucherId]
    );
    await client.query("delete from voucher_lines where voucher_id=$1", [voucherId]);
  } else {
    vno = await getNextVoucherNo(client, vtype, fy);
    voucherId = "vch_" + newId();
    await client.query(
      `insert into vouchers (id, vtype, vno, fy, vdate, narration, ref_no, mode, source_type, source_id, status, total_paise, created_by, created_at, updated_by, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'txn', $9, 'active', $10, $11, $12, $11, $12)`,
      [voucherId, vtype, vno, fy, vdate, narration, txnData.party || null, mode, txnId, amtPaise, userId || null, now]
    );
  }

  for (const l of lines) {
    await client.query(
      "insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, $4, $5, $6)",
      [newId(), voucherId, l.ledger_id, l.dr_paise, l.cr_paise, l.line_no]
    );
  }

  return { voucherId, vno };
}

async function deleteTxnVoucher(client, txnId) {
  const existing = await client.query("select * from vouchers where source_type='txn' and source_id=$1", [txnId]);
  if (!existing.rows[0]) return;
  await checkLockDate(client, existing.rows[0].vdate);
  await client.query("delete from voucher_lines where voucher_id=$1", [existing.rows[0].id]);
  await client.query("delete from vouchers where id=$1", [existing.rows[0].id]);
}

// -------------------------------------------------------------
// Invoice & Vendor Bill Payment Synchronization
// -------------------------------------------------------------
async function syncInvoicePayments(client, invoiceId, invoiceData, userId) {
  const payments = invoiceData.payments || [];
  const invNo = invoiceData.no;
  if (!invNo) return;

  const clientInfo = invoiceData.client || {};
  const clientLedgerId = await getOrCreateClientLedger(client, clientInfo, clientInfo.id || null);

  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    const pSourceId = `${invoiceId}_p_${i}`;
    const pDate = p.date || invoiceData.date || new Date().toISOString().slice(0, 10);
    const pFy = getFY(pDate);
    const pAmtPaise = toPaise(p.amount);
    if (pAmtPaise <= 0n) continue;

    const pMode = p.mode || "Bank";
    const bankLedgerId = (pMode.toLowerCase().includes("cash")) ? "led_cash" : "led_bank";
    const narration = p.note || `Payment received for Inv #${invNo} (${pMode})`;

    const existing = await client.query("select * from vouchers where source_type='invoice' and source_id=$1", [pSourceId]);
    let rcptVchId;
    const now = p.at || Date.now();

    if (existing.rows[0]) {
      rcptVchId = existing.rows[0].id;
      await client.query(
        `update vouchers set vdate=$1, narration=$2, mode=$3, total_paise=$4, status='active', updated_by=$5, updated_at=$6 where id=$7`,
        [pDate, narration, pMode, pAmtPaise, userId || null, now, rcptVchId]
      );
      await client.query("delete from voucher_lines where voucher_id=$1", [rcptVchId]);
      await client.query("delete from bill_refs where voucher_id=$1", [rcptVchId]);
    } else {
      const vno = await getNextVoucherNo(client, "receipt", pFy);
      rcptVchId = "vch_" + newId();
      await client.query(
        `insert into vouchers (id, vtype, vno, fy, vdate, narration, ref_no, mode, source_type, source_id, status, total_paise, created_by, created_at, updated_by, updated_at)
         values ($1, 'receipt', $2, $3, $4, $5, $6, $7, 'invoice', $8, 'active', $9, $10, $11, $10, $11)`,
        [rcptVchId, vno, pFy, pDate, narration, invNo, pMode, pSourceId, pAmtPaise, userId || null, now]
      );
    }

    await client.query(
      "insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, $4, 0, 1)",
      [newId(), rcptVchId, bankLedgerId, pAmtPaise]
    );
    await client.query(
      "insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, 0, $4, 2)",
      [newId(), rcptVchId, clientLedgerId, pAmtPaise]
    );

    await client.query(
      `insert into bill_refs (id, ledger_id, ref_type, ref_name, voucher_id, amount_paise, side)
       values ($1, $2, 'against', $3, $4, $5, 'Cr')`,
      [newId(), clientLedgerId, invNo, rcptVchId, pAmtPaise]
    );
  }
}

async function syncBillPayments(client, billId, billData, userId) {
  const payments = billData.payments || [];
  const billNo = billData.billNo;
  if (!billNo) return;

  const vendorId = billData.vendorId || null;
  let vendorData = { name: "Vendor" };
  if (vendorId) {
    const vRes = await client.query("select data from vendors where id=$1", [vendorId]);
    if (vRes.rows[0]) vendorData = vRes.rows[0].data || vendorData;
  }
  const vendorLedgerId = await getOrCreateVendorLedger(client, vendorData, vendorId);

  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    const pSourceId = `${billId}_p_${i}`;
    const pDate = p.date || billData.date || new Date().toISOString().slice(0, 10);
    const pFy = getFY(pDate);
    const pAmtPaise = toPaise(p.amount);
    if (pAmtPaise <= 0n) continue;

    const pMode = p.mode || "Bank";
    const bankLedgerId = (pMode.toLowerCase().includes("cash")) ? "led_cash" : "led_bank";
    const narration = p.note || `Payment made for Bill #${billNo} (${pMode})`;

    const existing = await client.query("select * from vouchers where source_type='vendor_bill' and source_id=$1", [pSourceId]);
    let pymtVchId;
    const now = p.at || Date.now();

    if (existing.rows[0]) {
      pymtVchId = existing.rows[0].id;
      await client.query(
        `update vouchers set vdate=$1, narration=$2, mode=$3, total_paise=$4, status='active', updated_by=$5, updated_at=$6 where id=$7`,
        [pDate, narration, pMode, pAmtPaise, userId || null, now, pymtVchId]
      );
      await client.query("delete from voucher_lines where voucher_id=$1", [pymtVchId]);
      await client.query("delete from bill_refs where voucher_id=$1", [pymtVchId]);
    } else {
      const vno = await getNextVoucherNo(client, "payment", pFy);
      pymtVchId = "vch_" + newId();
      await client.query(
        `insert into vouchers (id, vtype, vno, fy, vdate, narration, ref_no, mode, source_type, source_id, status, total_paise, created_by, created_at, updated_by, updated_at)
         values ($1, 'payment', $2, $3, $4, $5, $6, $7, 'vendor_bill', $8, 'active', $9, $10, $11, $10, $11)`,
        [pymtVchId, vno, pFy, pDate, narration, billNo, pMode, pSourceId, pAmtPaise, userId || null, now]
      );
    }

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
}

module.exports = {
  toPaise,
  toRupees,
  formatINR,
  getFY,
  getNextVoucherNo,
  checkLockDate,
  logAudit,
  validateVoucherBalance,
  getOrCreateClientLedger,
  getOrCreateVendorLedger,
  postSalesVoucher,
  checkInvoiceCanBeDeleted,
  postPurchaseVoucher,
  checkVendorBillCanBeDeleted,
  postTxnVoucher,
  deleteTxnVoucher,
  syncInvoicePayments,
  syncBillPayments
};
