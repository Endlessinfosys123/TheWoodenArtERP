const router = require("express").Router();
const { query, withTransaction } = require("../db");
const { requireAuth, requireAdmin } = require("../auth");
const { newId, ah } = require("../util");
const ledgerService = require("../services/ledger");

router.use(requireAuth);

// -------------------------------------------------------------
// 1. Account Groups
// -------------------------------------------------------------
router.get("/groups", ah(async (req, res) => {
  const { rows } = await query(
    "select id, name, parent_id, nature, is_system, sort from account_groups order by sort asc, name asc"
  );
  res.json({ groups: rows });
}));

// -------------------------------------------------------------
// 2. Ledgers list with current balance
// -------------------------------------------------------------
router.get("/ledgers", ah(async (req, res) => {
  const { group, party_type, q } = req.query;

  let sql = `
    select
      l.*,
      g.name as group_name,
      g.nature as group_nature,
      coalesce(sum(case when v.status='active' then vl.dr_paise else 0 end), 0)::bigint as total_dr_paise,
      coalesce(sum(case when v.status='active' then vl.cr_paise else 0 end), 0)::bigint as total_cr_paise
    from ledgers l
    join account_groups g on l.group_id = g.id
    left join voucher_lines vl on l.id = vl.ledger_id
    left join vouchers v on vl.voucher_id = v.id
    where l.active = true
  `;
  const params = [];

  if (group) {
    params.push(group);
    sql += ` and (l.group_id = $${params.length} or g.name = $${params.length})`;
  }
  if (party_type) {
    params.push(party_type);
    sql += ` and l.party_type = $${params.length}`;
  }
  if (q) {
    params.push(`%${q.trim()}%`);
    sql += ` and (l.name ilike $${params.length} or l.phone ilike $${params.length} or l.gstin ilike $${params.length})`;
  }

  sql += `
    group by l.id, g.name, g.nature
    order by l.name asc
  `;

  const { rows } = await query(sql, params);

  const ledgers = rows.map((r) => {
    const openingPaise = BigInt(r.opening_paise || 0);
    const totalDr = BigInt(r.total_dr_paise || 0);
    const totalCr = BigInt(r.total_cr_paise || 0);

    // Net balance in paise relative to Dr (positive = Dr, negative = Cr)
    const netDr = (r.opening_side === "Dr" ? openingPaise : -openingPaise) + totalDr - totalCr;
    const closingPaise = netDr >= 0n ? netDr : -netDr;
    const closingSide = netDr >= 0n ? "Dr" : "Cr";

    return {
      id: r.id,
      name: r.name,
      groupId: r.group_id,
      groupName: r.group_name,
      groupNature: r.group_nature,
      partyType: r.party_type,
      partyId: r.party_id,
      openingPaise: r.opening_paise.toString(),
      openingSide: r.opening_side,
      openingDate: r.opening_date,
      gstin: r.gstin,
      state: r.state,
      phone: r.phone,
      email: r.email,
      address: r.address,
      creditDays: r.credit_days,
      creditLimitPaise: r.credit_limit_paise?.toString() || "0",
      billWise: r.bill_wise,
      isSystem: r.is_system,
      active: r.active,
      totalDrPaise: totalDr.toString(),
      totalCrPaise: totalCr.toString(),
      closingPaise: closingPaise.toString(),
      closingSide,
      closingRupees: ledgerService.toRupees(closingPaise),
      formattedClosing: ledgerService.formatINR(closingPaise, closingSide)
    };
  });

  res.json({ ledgers });
}));

// Get or ensure ledger for a party (client or vendor)
router.get("/party-ledger/:partyType/:partyId", ah(async (req, res) => {
  const { partyType, partyId } = req.params;
  let ledgerId;
  await withTransaction(async (client) => {
    if (partyType === "client") {
      const cRes = await client.query("select id, data from clients where id=$1", [partyId]);
      const cData = cRes.rows[0]?.data || { name: "Client" };
      ledgerId = await ledgerService.getOrCreateClientLedger(client, cData, partyId);
    } else if (partyType === "vendor") {
      const vRes = await client.query("select id, data from vendors where id=$1", [partyId]);
      const vData = vRes.rows[0]?.data || { name: "Vendor" };
      ledgerId = await ledgerService.getOrCreateVendorLedger(client, vData, partyId);
    } else {
      throw new Error("Invalid party type");
    }
  });
  res.json({ ledgerId });
}));

// Create ledger (admin)
router.post("/ledgers", requireAdmin, ah(async (req, res) => {
  const { name, groupId, partyType, partyId, openingAmount, openingSide, gstin, state, phone, email, address, creditDays, billWise } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Ledger name is required." });
  if (!groupId) return res.status(400).json({ error: "Group is required." });

  const id = "led_" + newId();
  const openingPaise = ledgerService.toPaise(openingAmount || 0);
  const now = Date.now();

  await withTransaction(async (client) => {
    await client.query(
      `insert into ledgers (
        id, name, group_id, party_type, party_id, opening_paise, opening_side,
        gstin, state, phone, email, address, credit_days, bill_wise, is_system, active, created_at, updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, false, true, $15, $15)`,
      [
        id,
        name.trim(),
        groupId,
        partyType || null,
        partyId || null,
        openingPaise,
        openingSide || "Dr",
        gstin ? gstin.trim().toUpperCase() : null,
        state || null,
        phone || null,
        email || null,
        address || null,
        creditDays ? parseInt(creditDays, 10) : 0,
        billWise !== false,
        now
      ]
    );

    await ledgerService.logAudit(client, {
      entity: "ledger",
      entityId: id,
      action: "create",
      before: null,
      after: { id, name: name.trim(), groupId },
      userId: req.user.id
    });
  });

  res.json({ ok: true, id, name: name.trim() });
}));

// Update ledger (admin)
router.patch("/ledgers/:id", requireAdmin, ah(async (req, res) => {
  const { id } = req.params;
  const { name, groupId, openingAmount, openingSide, gstin, state, phone, email, address, creditDays, billWise, active } = req.body;

  await withTransaction(async (client) => {
    const existing = await client.query("select * from ledgers where id=$1", [id]);
    if (!existing.rows[0]) throw new Error("Ledger not found.");
    const prev = existing.rows[0];

    const updates = [];
    const params = [id];

    if (name !== undefined) { params.push(name.trim()); updates.push(`name=$${params.length}`); }
    if (groupId !== undefined) { params.push(groupId); updates.push(`group_id=$${params.length}`); }
    if (openingAmount !== undefined) { params.push(ledgerService.toPaise(openingAmount)); updates.push(`opening_paise=$${params.length}`); }
    if (openingSide !== undefined) { params.push(openingSide); updates.push(`opening_side=$${params.length}`); }
    if (gstin !== undefined) { params.push(gstin ? gstin.trim().toUpperCase() : null); updates.push(`gstin=$${params.length}`); }
    if (state !== undefined) { params.push(state || null); updates.push(`state=$${params.length}`); }
    if (phone !== undefined) { params.push(phone || null); updates.push(`phone=$${params.length}`); }
    if (email !== undefined) { params.push(email || null); updates.push(`email=$${params.length}`); }
    if (address !== undefined) { params.push(address || null); updates.push(`address=$${params.length}`); }
    if (creditDays !== undefined) { params.push(parseInt(creditDays, 10) || 0); updates.push(`credit_days=$${params.length}`); }
    if (billWise !== undefined) { params.push(!!billWise); updates.push(`bill_wise=$${params.length}`); }
    if (active !== undefined) { params.push(!!active); updates.push(`active=$${params.length}`); }

    params.push(Date.now());
    updates.push(`updated_at=$${params.length}`);

    await client.query(`update ledgers set ${updates.join(", ")} where id=$1`, params);

    await ledgerService.logAudit(client, {
      entity: "ledger",
      entityId: id,
      action: "update",
      before: prev,
      after: req.body,
      userId: req.user.id
    });
  });

  res.json({ ok: true });
}));

// -------------------------------------------------------------
// 3. Statement of Account for a Ledger (Running Balance)
// -------------------------------------------------------------
router.get("/ledgers/:id/statement", ah(async (req, res) => {
  const { id } = req.params;
  const { from, to } = req.query;

  const ledgerQ = await query(
    "select l.*, g.name as group_name, g.nature as group_nature from ledgers l join account_groups g on l.group_id=g.id where l.id=$1",
    [id]
  );
  if (!ledgerQ.rows[0]) return res.status(404).json({ error: "Ledger not found." });
  const led = ledgerQ.rows[0];

  // 1. Calculate opening balance before `from` date
  let preDr = 0n;
  let preCr = 0n;
  const initialOpening = BigInt(led.opening_paise || 0);

  if (from) {
    const preVchQ = await query(
      `select coalesce(sum(vl.dr_paise), 0)::bigint as sum_dr, coalesce(sum(vl.cr_paise), 0)::bigint as sum_cr
       from voucher_lines vl
       join vouchers v on vl.voucher_id = v.id
       where vl.ledger_id = $1 and v.status = 'active' and v.vdate < $2`,
      [id, from]
    );
    preDr = BigInt(preVchQ.rows[0]?.sum_dr || 0);
    preCr = BigInt(preVchQ.rows[0]?.sum_cr || 0);
  }

  const initialNetDr = (led.opening_side === "Dr" ? initialOpening : -initialOpening);
  const openingNetDr = initialNetDr + preDr - preCr;
  const openingPaise = openingNetDr >= 0n ? openingNetDr : -openingNetDr;
  const openingSide = openingNetDr >= 0n ? "Dr" : "Cr";

  // 2. Fetch active transactions in range
  let vchSql = `
    select
      v.id as voucher_id,
      v.vtype,
      v.vno,
      v.vdate,
      v.narration,
      v.mode,
      v.source_type,
      v.source_id,
      vl.dr_paise,
      vl.cr_paise,
      vl.line_no
    from voucher_lines vl
    join vouchers v on vl.voucher_id = v.id
    where vl.ledger_id = $1 and v.status = 'active'
  `;
  const params = [id];

  if (from) {
    params.push(from);
    vchSql += ` and v.vdate >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    vchSql += ` and v.vdate <= $${params.length}`;
  }

  vchSql += " order by v.vdate asc, v.created_at asc, vl.line_no asc";

  const { rows } = await query(vchSql, params);

  // Compute running balance
  let runningNetDr = openingNetDr;
  let periodTotalDr = 0n;
  let periodTotalCr = 0n;

  const entries = rows.map((r) => {
    const dr = BigInt(r.dr_paise || 0);
    const cr = BigInt(r.cr_paise || 0);
    periodTotalDr += dr;
    periodTotalCr += cr;
    runningNetDr = runningNetDr + dr - cr;

    const balPaise = runningNetDr >= 0n ? runningNetDr : -runningNetDr;
    const balSide = runningNetDr >= 0n ? "Dr" : "Cr";

    return {
      voucherId: r.voucher_id,
      vtype: r.vtype,
      vno: r.vno,
      date: r.vdate,
      narration: r.narration,
      mode: r.mode,
      sourceType: r.source_type,
      sourceId: r.source_id,
      drPaise: dr.toString(),
      crPaise: cr.toString(),
      drRupees: ledgerService.toRupees(dr),
      crRupees: ledgerService.toRupees(cr),
      balancePaise: balPaise.toString(),
      balanceSide: balSide,
      balanceRupees: ledgerService.toRupees(balPaise),
      formattedBalance: ledgerService.formatINR(balPaise, balSide)
    };
  });

  const closingPaise = runningNetDr >= 0n ? runningNetDr : -runningNetDr;
  const closingSide = runningNetDr >= 0n ? "Dr" : "Cr";

  res.json({
    ledger: {
      id: led.id,
      name: led.name,
      partyType: led.party_type,
      partyId: led.party_id,
      groupName: led.group_name,
      gstin: led.gstin,
      phone: led.phone,
      address: led.address
    },
    period: { from: from || null, to: to || null },
    opening: {
      paise: openingPaise.toString(),
      side: openingSide,
      rupees: ledgerService.toRupees(openingPaise),
      formatted: ledgerService.formatINR(openingPaise, openingSide)
    },
    entries,
    totals: {
      drPaise: periodTotalDr.toString(),
      crPaise: periodTotalCr.toString(),
      drRupees: ledgerService.toRupees(periodTotalDr),
      crRupees: ledgerService.toRupees(periodTotalCr)
    },
    closing: {
      paise: closingPaise.toString(),
      side: closingSide,
      rupees: ledgerService.toRupees(closingPaise),
      formatted: ledgerService.formatINR(closingPaise, closingSide)
    }
  });
}));

// -------------------------------------------------------------
// 4. Pending / Open Bill References (for allocation UI)
// -------------------------------------------------------------
router.get("/ledgers/:id/pending-bills", ah(async (req, res) => {
  const { id } = req.params;

  // Find all 'new' bill refs for this ledger, and compute remaining amount
  const { rows } = await query(
    `select
       br.ref_name,
       br.side,
       br.due_date,
       br.amount_paise as original_paise,
       v.vdate as bill_date,
       v.vno,
       v.source_type,
       v.source_id,
       coalesce(
         (select sum(a.amount_paise) from bill_refs a
          join vouchers av on a.voucher_id = av.id
          where a.ledger_id = br.ledger_id and a.ref_name = br.ref_name and a.ref_type = 'against' and av.status = 'active'),
         0
       )::bigint as settled_paise
     from bill_refs br
     join vouchers v on br.voucher_id = v.id
     where br.ledger_id = $1 and br.ref_type = 'new' and v.status = 'active'
     order by v.vdate asc, br.ref_name asc`,
    [id]
  );

  const pending = [];
  for (const r of rows) {
    const orig = BigInt(r.original_paise || 0);
    const settled = BigInt(r.settled_paise || 0);
    const pend = orig - settled;

    if (pend > 0n) {
      pending.push({
        refName: r.ref_name,
        billDate: r.bill_date,
        dueDate: r.due_date,
        vno: r.vno,
        sourceType: r.source_type,
        sourceId: r.source_id,
        side: r.side,
        originalPaise: orig.toString(),
        settledPaise: settled.toString(),
        pendingPaise: pend.toString(),
        pendingRupees: ledgerService.toRupees(pend),
        formattedPending: ledgerService.formatINR(pend, r.side)
      });
    }
  }

  res.json({ pending });
}));

// -------------------------------------------------------------
// 5. Day Book & Vouchers Register
// -------------------------------------------------------------
router.get("/vouchers", ah(async (req, res) => {
  const { type, from, to, ledger } = req.query;

  let sql = `
    select
      v.id, v.vtype, v.vno, v.fy, v.vdate, v.narration, v.ref_no, v.mode,
      v.source_type, v.source_id, v.status, v.cancel_reason, v.total_paise,
      v.created_by, v.created_at
    from vouchers v
    where 1=1
  `;
  const params = [];

  if (type) {
    params.push(type);
    sql += ` and v.vtype = $${params.length}`;
  }
  if (from) {
    params.push(from);
    sql += ` and v.vdate >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    sql += ` and v.vdate <= $${params.length}`;
  }
  if (ledger) {
    params.push(ledger);
    sql += ` and exists (select 1 from voucher_lines vl where vl.voucher_id = v.id and vl.ledger_id = $${params.length})`;
  }

  sql += " order by v.vdate desc, v.created_at desc limit 1000";

  const { rows } = await query(sql, params);

  const vouchers = rows.map((v) => ({
    id: v.id,
    vtype: v.vtype,
    vno: v.vno,
    fy: v.fy,
    date: v.vdate,
    narration: v.narration,
    refNo: v.ref_no,
    mode: v.mode,
    sourceType: v.source_type,
    sourceId: v.source_id,
    status: v.status,
    cancelReason: v.cancel_reason,
    totalPaise: v.total_paise.toString(),
    totalRupees: ledgerService.toRupees(v.total_paise),
    formattedTotal: ledgerService.formatINR(v.total_paise)
  }));

  res.json({ vouchers });
}));

// Get voucher detail with lines
router.get("/vouchers/:id", ah(async (req, res) => {
  const { id } = req.params;
  const vRes = await query("select * from vouchers where id=$1", [id]);
  if (!vRes.rows[0]) return res.status(404).json({ error: "Voucher not found." });
  const v = vRes.rows[0];

  const linesRes = await query(
    `select vl.*, l.name as ledger_name, g.name as group_name
     from voucher_lines vl
     join ledgers l on vl.ledger_id = l.id
     join account_groups g on l.group_id = g.id
     where vl.voucher_id = $1
     order by vl.line_no asc`,
    [id]
  );

  const refsRes = await query(
    "select * from bill_refs where voucher_id = $1",
    [id]
  );

  res.json({
    voucher: {
      id: v.id,
      vtype: v.vtype,
      vno: v.vno,
      fy: v.fy,
      date: v.vdate,
      narration: v.narration,
      refNo: v.ref_no,
      mode: v.mode,
      sourceType: v.source_type,
      sourceId: v.source_id,
      status: v.status,
      cancelReason: v.cancel_reason,
      totalPaise: v.total_paise.toString(),
      totalRupees: ledgerService.toRupees(v.total_paise),
      formattedTotal: ledgerService.formatINR(v.total_paise),
      lines: linesRes.rows.map((l) => ({
        id: l.id,
        ledgerId: l.ledger_id,
        ledgerName: l.ledger_name,
        groupName: l.group_name,
        drPaise: l.dr_paise.toString(),
        crPaise: l.cr_paise.toString(),
        drRupees: ledgerService.toRupees(l.dr_paise),
        crRupees: ledgerService.toRupees(l.cr_paise),
        lineNo: l.line_no
      })),
      billRefs: refsRes.rows.map((r) => ({
        id: r.id,
        ledgerId: r.ledger_id,
        refType: r.ref_type,
        refName: r.ref_name,
        amountPaise: r.amount_paise.toString(),
        amountRupees: ledgerService.toRupees(r.amount_paise),
        side: r.side,
        dueDate: r.due_date
      }))
    }
  });
}));

// -------------------------------------------------------------
// 6. Create Voucher (Receipt, Payment, Contra, Journal, CN, DN)
// -------------------------------------------------------------
router.post("/vouchers", ah(async (req, res) => {
  const { vtype, date, narration, refNo, mode, lines, billAllocations } = req.body;
  if (!vtype) return res.status(400).json({ error: "Voucher type is required." });
  if (!lines || !Array.isArray(lines) || lines.length < 2) {
    return res.status(400).json({ error: "A voucher requires at least two lines." });
  }

  // Permissions check: staff may only create receipt and payment
  if (req.user.role !== "admin" && !["receipt", "payment"].includes(vtype)) {
    return res.status(403).json({ error: `Only an admin can create a ${vtype} voucher.` });
  }

  const vdate = date || new Date().toISOString().slice(0, 10);
  const fy = ledgerService.getFY(vdate);

  const formattedLines = lines.map((l, idx) => ({
    ledger_id: l.ledgerId,
    dr_paise: ledgerService.toPaise(l.drAmount || l.drPaise || 0),
    cr_paise: ledgerService.toPaise(l.crAmount || l.crPaise || 0),
    line_no: idx + 1
  }));

  // Double-entry balance check
  const totalPaise = ledgerService.validateVoucherBalance(formattedLines);

  let newVoucherId;
  let vno;

  await withTransaction(async (client) => {
    await ledgerService.checkLockDate(client, vdate);

    vno = await ledgerService.getNextVoucherNo(client, vtype, fy);
    newVoucherId = "vch_" + newId();
    const now = Date.now();

    await client.query(
      `insert into vouchers (
        id, vtype, vno, fy, vdate, narration, ref_no, mode, source_type,
        status, total_paise, created_by, created_at, updated_by, updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'manual', 'active', $9, $10, $11, $10, $11)`,
      [
        newVoucherId,
        vtype,
        vno,
        fy,
        vdate,
        narration || null,
        refNo || null,
        mode || null,
        totalPaise,
        req.user.id,
        now
      ]
    );

    for (const l of formattedLines) {
      await client.query(
        "insert into voucher_lines (id, voucher_id, ledger_id, dr_paise, cr_paise, line_no) values ($1, $2, $3, $4, $5, $6)",
        [newId(), newVoucherId, l.ledger_id, l.dr_paise, l.cr_paise, l.line_no]
      );
    }

    // Process bill allocations if provided
    if (Array.isArray(billAllocations) && billAllocations.length > 0) {
      for (const alloc of billAllocations) {
        const amtPaise = ledgerService.toPaise(alloc.amount || alloc.amountPaise || 0);
        if (amtPaise <= 0n) continue;

        await client.query(
          `insert into bill_refs (
            id, ledger_id, ref_type, ref_name, voucher_id, amount_paise, side, due_date
          ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            newId(),
            alloc.ledgerId,
            alloc.refType || "against",
            alloc.refName,
            newVoucherId,
            amtPaise,
            alloc.side || (vtype === "receipt" ? "Cr" : "Dr"),
            alloc.dueDate || null
          ]
        );

        // Sync write-back to invoice.payments or bill.payments for backward compatibility
        if (alloc.refType === "against" && alloc.refName) {
          const amtRupees = Number(amtPaise) / 100;
          if (vtype === "receipt") {
            const invQ = await client.query("select id, data from invoices where data->>'no' = $1", [alloc.refName]);
            if (invQ.rows[0]) {
              const invData = invQ.rows[0].data || {};
              const curPayments = invData.payments || [];
              curPayments.push({
                amount: amtRupees,
                date: vdate,
                mode: mode || "Payment",
                note: vno,
                at: now,
                by: req.user.id
              });
              invData.payments = curPayments;
              await client.query("update invoices set data=$1, updated_at=$2 where id=$3", [invData, now, invQ.rows[0].id]);
            }
          } else if (vtype === "payment") {
            const billQ = await client.query("select id, data from vendor_bills where data->>'billNo' = $1", [alloc.refName]);
            if (billQ.rows[0]) {
              const billData = billQ.rows[0].data || {};
              const curPayments = billData.payments || [];
              curPayments.push({
                amount: amtRupees,
                date: vdate,
                mode: mode || "Payment",
                note: vno,
                at: now,
                by: req.user.id
              });
              billData.payments = curPayments;
              await client.query("update vendor_bills set data=$1, updated_at=$2 where id=$3", [billData, now, billQ.rows[0].id]);
            }
          }
        }
      }
    }

    await ledgerService.logAudit(client, {
      entity: "voucher",
      entityId: newVoucherId,
      action: "create_" + vtype,
      before: null,
      after: { id: newVoucherId, vno, vtype, total_paise: totalPaise.toString() },
      userId: req.user.id
    });
  });

  res.json({
    ok: true,
    voucherId: newVoucherId,
    vno,
    totalPaise: totalPaise.toString(),
    formattedTotal: ledgerService.formatINR(totalPaise)
  });
}));

// Cancel voucher with reason (admin only)
router.post("/vouchers/:id/cancel", requireAdmin, ah(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: "Cancellation reason is required." });
  }

  await withTransaction(async (client) => {
    const vRes = await client.query("select * from vouchers where id=$1", [id]);
    if (!vRes.rows[0]) throw new Error("Voucher not found.");
    const v = vRes.rows[0];

    await ledgerService.checkLockDate(client, v.vdate);

    await client.query(
      "update vouchers set status='cancelled', cancel_reason=$1, updated_by=$2, updated_at=$3 where id=$4",
      [reason.trim(), req.user.id, Date.now(), id]
    );

    // Remove bill allocations associated with this cancelled voucher
    await client.query("delete from bill_refs where voucher_id=$1", [id]);

    await ledgerService.logAudit(client, {
      entity: "voucher",
      entityId: id,
      action: "cancel",
      before: v,
      after: { id, status: "cancelled", cancel_reason: reason.trim() },
      userId: req.user.id
    });
  });

  res.json({ ok: true, message: "Voucher cancelled successfully." });
}));

// -------------------------------------------------------------
// 7. Reports: Trial Balance
// -------------------------------------------------------------
router.get("/reports/trial-balance", ah(async (req, res) => {
  const { asOn } = req.query;

  let sql = `
    select
      g.id as group_id,
      g.name as group_name,
      g.nature as group_nature,
      g.sort as group_sort,
      l.id as ledger_id,
      l.name as ledger_name,
      l.opening_paise,
      l.opening_side,
      coalesce(sum(case when v.status='active' then vl.dr_paise else 0 end), 0)::bigint as period_dr,
      coalesce(sum(case when v.status='active' then vl.cr_paise else 0 end), 0)::bigint as period_cr
    from ledgers l
    join account_groups g on l.group_id = g.id
    left join voucher_lines vl on l.id = vl.ledger_id
    left join vouchers v on vl.voucher_id = v.id and ($1::date is null or v.vdate <= $1::date)
    where l.active = true
    group by g.id, g.name, g.nature, g.sort, l.id, l.name, l.opening_paise, l.opening_side
    order by g.sort asc, l.name asc
  `;

  const { rows } = await query(sql, [asOn || null]);

  let totalDebitPaise = 0n;
  let totalCreditPaise = 0n;

  const groupsMap = {};

  for (const r of rows) {
    const openingPaise = BigInt(r.opening_paise || 0);
    const dr = BigInt(r.period_dr || 0);
    const cr = BigInt(r.period_cr || 0);

    const netDr = (r.opening_side === "Dr" ? openingPaise : -openingPaise) + dr - cr;
    if (netDr === 0n) continue; // skip zero balances for neat reporting

    const isDr = netDr > 0n;
    const absPaise = isDr ? netDr : -netDr;

    if (isDr) {
      totalDebitPaise += absPaise;
    } else {
      totalCreditPaise += absPaise;
    }

    if (!groupsMap[r.group_id]) {
      groupsMap[r.group_id] = {
        groupId: r.group_id,
        groupName: r.group_name,
        groupNature: r.group_nature,
        ledgers: [],
        totalDrPaise: 0n,
        totalCrPaise: 0n
      };
    }

    if (isDr) groupsMap[r.group_id].totalDrPaise += absPaise;
    else groupsMap[r.group_id].totalCrPaise += absPaise;

    groupsMap[r.group_id].ledgers.push({
      ledgerId: r.ledger_id,
      ledgerName: r.ledger_name,
      drPaise: isDr ? absPaise.toString() : "0",
      crPaise: !isDr ? absPaise.toString() : "0",
      drRupees: isDr ? ledgerService.toRupees(absPaise) : 0,
      crRupees: !isDr ? ledgerService.toRupees(absPaise) : 0,
      formattedDr: isDr ? ledgerService.formatINR(absPaise) : "",
      formattedCr: !isDr ? ledgerService.formatINR(absPaise) : ""
    });
  }

  const groups = Object.values(groupsMap).map((g) => ({
    groupId: g.groupId,
    groupName: g.groupName,
    groupNature: g.groupNature,
    totalDrPaise: g.totalDrPaise.toString(),
    totalCrPaise: g.totalCrPaise.toString(),
    totalDrRupees: ledgerService.toRupees(g.totalDrPaise),
    totalCrRupees: ledgerService.toRupees(g.totalCrPaise),
    formattedDr: g.totalDrPaise > 0n ? ledgerService.formatINR(g.totalDrPaise) : "",
    formattedCr: g.totalCrPaise > 0n ? ledgerService.formatINR(g.totalCrPaise) : "",
    ledgers: g.ledgers
  }));

  const differencePaise = totalDebitPaise > totalCreditPaise ? totalDebitPaise - totalCreditPaise : totalCreditPaise - totalDebitPaise;

  res.json({
    asOn: asOn || null,
    groups,
    totalDebitPaise: totalDebitPaise.toString(),
    totalCreditPaise: totalCreditPaise.toString(),
    totalDebitRupees: ledgerService.toRupees(totalDebitPaise),
    totalCreditRupees: ledgerService.toRupees(totalCreditPaise),
    formattedTotalDebit: ledgerService.formatINR(totalDebitPaise),
    formattedTotalCredit: ledgerService.formatINR(totalCreditPaise),
    isBalanced: totalDebitPaise === totalCreditPaise,
    differencePaise: differencePaise.toString()
  });
}));

module.exports = router;
