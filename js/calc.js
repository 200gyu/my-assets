// Pure finance calculations over Store.data (no DOM).
export const CASH_KINDS = ['bank', 'cash'];
export const ASSET_KINDS = ['bank', 'cash', 'savings', 'securities'];

export const todayStr = () => toStr(new Date());
export function toStr(d) { const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; }
export function parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const lastDay = (y, m) => new Date(y, m + 1, 0).getDate();

// next date (>= from) whose day-of-month is `day`, clamped to month length
export function nextOnDay(day, from = new Date()) {
  const y = from.getFullYear(), m = from.getMonth();
  let d = new Date(y, m, Math.min(day, lastDay(y, m)));
  if (toStr(d) < toStr(from)) d = new Date(y, m + 1, Math.min(day, lastDay(y, m + 1)));
  return d;
}

export function cardBill(data, cardId) {
  return data.transactions.filter((t) => t.card_id === cardId && t.kind === 'expense' && !t.settled).reduce((s, t) => s + Number(t.amount), 0);
}

export function cardSummary(data) {
  return data.cards.map((c) => {
    const bill = cardBill(data, c.id);
    const due = toStr(nextOnDay(Number(c.pay_day)));
    const acct = data.accounts.find((a) => a.id === c.pay_account_id);
    return { card: c, bill, due, dday: daysBetween(todayStr(), due), account: acct, short: acct ? Math.max(0, bill - Number(acct.balance)) : 0 };
  }).sort((a, b) => a.due.localeCompare(b.due));
}

export function totals(data) {
  const sumKinds = (ks) => data.accounts.filter((a) => ks.includes(a.kind)).reduce((s, a) => s + Number(a.balance), 0);
  const cash = sumKinds(CASH_KINDS);
  const savings = sumKinds(['savings']);
  const securitiesCash = sumKinds(['securities']);
  const invest = data.investments.reduce((s, i) => s + Number(i.qty) * Number(i.current_price), 0);
  const investCost = data.investments.reduce((s, i) => s + Number(i.qty) * Number(i.avg_price), 0);
  const loans = data.accounts.filter((a) => a.kind === 'loan').reduce((s, a) => s + Math.abs(Number(a.balance)), 0);
  const cardDebt = data.cards.reduce((s, c) => s + cardBill(data, c.id), 0);
  const assets = cash + savings + securitiesCash + invest;
  const debt = loans + cardDebt;
  return { cash, savings, securitiesCash, invest, investCost, loans, cardDebt, assets, debt, netWorth: assets - debt };
}

// Cash (bank + cash accounts) projected day by day
export function forecast(data, days = 60) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  let bal = totals(data).cash;
  const events = {};
  const add = (date, amount, label) => { (events[date] = events[date] || []).push({ amount, label }); };
  const end = new Date(start); end.setDate(end.getDate() + days);

  // current card bills on their next pay date
  for (const s of cardSummary(data)) if (s.bill > 0) add(s.due, -s.bill, `${s.card.name} 결제`);
  // recurring items for each month in range
  for (const r of data.recurring.filter((x) => x.active !== false)) {
    for (let k = 0; k <= Math.ceil(days / 28) + 1; k++) {
      const base = new Date(start.getFullYear(), start.getMonth() + k, 1);
      const d = new Date(base.getFullYear(), base.getMonth(), Math.min(Number(r.day_of_month), lastDay(base.getFullYear(), base.getMonth())));
      if (d < start || d > end) continue;
      const amt = Number(r.amount) * (r.kind === 'income' ? 1 : -1);
      if (r.card_id && r.kind === 'expense') {
        // charged to a card → leaves the bank on the card's pay date after the charge
        const card = data.cards.find((c) => c.id === r.card_id);
        if (!card) continue;
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const pay = nextOnDay(Number(card.pay_day), next);
        if (pay <= end) add(toStr(pay), amt, `${r.name} (${card.name})`);
      } else add(toStr(d), amt, r.name);
    }
  }
  const series = [];
  let min = { date: toStr(start), balance: bal };
  for (let i = 0; i <= days; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const ds = toStr(d);
    const ev = events[ds] || [];
    bal += ev.reduce((s, e) => s + e.amount, 0);
    series.push({ date: ds, balance: bal, events: ev });
    if (bal < min.balance) min = { date: ds, balance: bal };
  }
  return { series, min };
}

export function alerts(data) {
  const out = [];
  for (const s of cardSummary(data)) {
    if (s.bill <= 0 || s.dday > 7) continue;
    const when = s.dday === 0 ? '오늘' : `D-${s.dday}`;
    if (s.short > 0) out.push({ level: 'danger', title: `${s.card.name} 결제 ${when} · 잔액 부족`, body: `${won(s.bill)} 결제 예정, ${s.account.name} 잔액이 ${won(s.short)} 부족합니다.` });
    else out.push({ level: s.dday <= 3 ? 'warn' : 'info', title: `${s.card.name} 결제 ${when}`, body: `${s.due.slice(5).replace('-', '/')} ${won(s.bill)} 출금 예정${s.account ? ` (${s.account.name})` : ''}` });
  }
  const f = forecast(data, 45);
  if (f.min.balance < 0) out.push({ level: 'danger', title: '현금 부족 예상', body: `${f.min.date.slice(5).replace('-', '/')}에 현금성 잔액이 ${won(f.min.balance)}로 내려갈 것으로 예상됩니다.` });
  const soon = new Date(); soon.setDate(soon.getDate() + 3);
  for (const r of data.recurring.filter((x) => x.active !== false && x.kind === 'expense' && !x.card_id)) {
    const d = nextOnDay(Number(r.day_of_month));
    if (d <= soon) out.push({ level: 'info', title: `${r.name} 출금 ${daysBetween(todayStr(), toStr(d)) === 0 ? '오늘' : 'D-' + daysBetween(todayStr(), toStr(d))}`, body: `${won(r.amount)}` });
  }
  return out;
}

export function monthStats(data, ym) {
  const tx = data.transactions.filter((t) => t.date.startsWith(ym));
  const income = tx.filter((t) => t.kind === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = tx.filter((t) => t.kind === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const byCat = {};
  tx.filter((t) => t.kind === 'expense').forEach((t) => { const k = t.category || '기타'; byCat[k] = (byCat[k] || 0) + Number(t.amount); });
  return { income, expense, net: income - expense, byCat, count: tx.length };
}

export function lastMonths(n) {
  const out = []; const d = new Date();
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(toStr(x).slice(0, 7)); }
  return out;
}

export function won(v, { sign = false } = {}) {
  const n = Math.round(Number(v) || 0);
  const s = Math.abs(n).toLocaleString('ko-KR') + '원';
  return (n < 0 ? '−' : sign && n > 0 ? '+' : '') + s;
}
export function short(v) {
  const n = Number(v) || 0, a = Math.abs(n), sg = n < 0 ? '−' : '';
  if (a >= 1e8) return sg + (a / 1e8).toFixed(a >= 1e9 ? 1 : 2).replace(/\.?0+$/, '') + '억';
  if (a >= 1e4) return sg + Math.round(a / 1e4).toLocaleString('ko-KR') + '만';
  return sg + Math.round(a).toLocaleString('ko-KR');
}
