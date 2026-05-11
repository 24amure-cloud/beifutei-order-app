/** 日計レジャーから KPI・集計を生成（会計確定データベース） */

function hourOf(ts) {
  return new Date(ts).getHours();
}

function firstLineName(name) {
  return String(name || '')
    .split('\n')[0]
    .trim()
    .slice(0, 80);
}

export function buildDailyReport(entries, dateKey, options = {}) {
  const cogsPct = Math.min(100, Math.max(0, Number(options.cogsPercent) || 0));
  const day = entries.filter((e) => e.dateKey === dateKey);

  let grandTotal = 0;
  let cashTotal = 0;
  let cardTotal = 0;
  let nhPlanTotal = 0;
  let foodTotal = 0;

  const byTable = new Map();
  const byHour = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    checkouts: 0,
    sales: 0,
  }));

  let menSum = 0;
  let womenSum = 0;
  const staySamples = [];
  let nhSessionCount = 0;
  let nhExtendedCount = 0;

  const productMap = new Map();

  for (const e of day) {
    grandTotal += e.total;
    if (e.payment === 'card' || e.payment === 'card_5pct') cardTotal += e.total;
    else cashTotal += e.total;

    const nh = Math.max(0, Number(e.nomihodaiPlanYen) || 0);
    nhPlanTotal += nh;
    foodTotal += Math.max(0, Number(e.normalSubtotal) || 0);

    const tl = String(e.tableLabel || '?');
    const curT =
      byTable.get(tl) || ({
        tableLabel: tl,
        checkouts: 0,
        sales: 0,
        nhSales: 0,
        lastCheckoutMemo: '',
      });
    curT.checkouts += 1;
    curT.sales += e.total;
    curT.nhSales += nh;
    const rowMemo = typeof e.checkoutMemo === 'string' ? e.checkoutMemo.trim() : '';
    if (rowMemo) curT.lastCheckoutMemo = rowMemo;
    byTable.set(tl, curT);

    const h = hourOf(e.recordedAt);
    byHour[h].checkouts += 1;
    byHour[h].sales += e.total;

    if (nh > 0) {
      nhSessionCount += 1;
      const ext = Number(e.extensionCount);
      if (Number.isFinite(ext) && ext > 0) nhExtendedCount += 1;
      const m = Number(e.menCount);
      const w = Number(e.womenCount);
      if (Number.isFinite(m) && m >= 0) menSum += m;
      if (Number.isFinite(w) && w >= 0) womenSum += w;
      const sm = Number(e.stayMinutes);
      if (Number.isFinite(sm) && sm >= 0) staySamples.push(sm);
    }

    const lines = Array.isArray(e.lines) ? e.lines : [];
    for (const ln of lines) {
      if (!ln || ln.name == null) continue;
      const label = firstLineName(ln.name);
      const key = `${ln.kind || 'n'}::${label}`;
      const p = productMap.get(key) || { key, label, kind: ln.kind || 'normal', count: 0, revenue: 0 };
      p.count += 1;
      if (ln.kind === 'normal' && ln.price != null) p.revenue += Math.max(0, Number(ln.price) || 0);
      productMap.set(key, p);
    }
  }

  const extensionRatePct = nhSessionCount > 0 ? (nhExtendedCount / nhSessionCount) * 100 : null;
  const avgStayMin =
    staySamples.length > 0 ? staySamples.reduce((a, b) => a + b, 0) / staySamples.length : null;

  const peopleTotal = menSum + womenSum;
  const genderRatio =
    peopleTotal > 0
      ? { menPct: (menSum / peopleTotal) * 100, womenPct: (womenSum / peopleTotal) * 100, menSum, womenSum }
      : null;

  const costYen = grandTotal * (cogsPct / 100);
  const grossProfit = grandTotal - costYen;

  const products = Array.from(productMap.values()).sort((a, b) => b.count - a.count);

  let peakHour = 0;
  let peakSales = -1;
  for (const slot of byHour) {
    if (slot.sales > peakSales) {
      peakSales = slot.sales;
      peakHour = slot.hour;
    }
  }
  let busyHour = 0;
  let busyCount = -1;
  for (const slot of byHour) {
    if (slot.checkouts > busyCount) {
      busyCount = slot.checkouts;
      busyHour = slot.hour;
    }
  }

  const totalLineItems = products.reduce((s, p) => s + p.count, 0);

  const checkoutRows = [...day]
    .sort((a, b) => (Number(b.recordedAt) || 0) - (Number(a.recordedAt) || 0))
    .map((e) => ({
      id: e.id,
      recordedAt: Number(e.recordedAt) || 0,
      tableLabel: String(e.tableLabel || '?'),
      checkoutMemo: typeof e.checkoutMemo === 'string' ? e.checkoutMemo.trim() : '',
      total: Math.max(0, Number(e.total) || 0),
      payment:
        e.payment === 'card_5pct' ? 'card_5pct' : e.payment === 'card' ? 'card' : 'cash',
    }));

  return {
    dateKey,
    checkoutCount: day.length,
    grandTotal,
    cashTotal,
    cardTotal,
    nhPlanTotal,
    foodTotal,
    byTable: Array.from(byTable.values()).sort((a, b) => b.sales - a.sales),
    byHour,
    extensionRatePct,
    nhSessionCount,
    nhExtendedCount,
    avgStayMin,
    genderRatio,
    cogsPct,
    costYen,
    grossProfit,
    products,
    totalLineItems,
    peakHour,
    peakSales,
    busyHour,
    busyCount,
    checkoutRows,
  };
}
