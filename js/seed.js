// Demo data (sample only — replaced by your own data once you start entering it)
import { toStr } from './calc.js?v=4';

export function demoData() {
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const id = (p, i) => `${p}-${i}`;
  const accounts = [
    { id: 'a1', name: '주거래 통장', kind: 'bank', institution: '하나은행', balance: 8450000, sort: 1 },
    { id: 'a2', name: '생활비 통장', kind: 'bank', institution: '카카오뱅크', balance: 1230000, sort: 2 },
    { id: 'a3', name: '비상금 파킹통장', kind: 'savings', institution: '토스뱅크', balance: 15000000, sort: 3 },
    { id: 'a4', name: '증권 예수금', kind: 'securities', institution: '키움증권', balance: 2100000, sort: 4 },
    { id: 'a5', name: '지갑 현금', kind: 'cash', institution: '', balance: 320000, sort: 5 },
    { id: 'a6', name: '신용대출', kind: 'loan', institution: '하나은행', balance: -30000000, sort: 6 },
  ];
  const cards = [
    { id: 'c1', name: '현대카드 M', issuer: '현대카드', pay_day: 15, pay_account_id: 'a1', credit_limit: 10000000 },
    { id: 'c2', name: '삼성카드 taptap', issuer: '삼성카드', pay_day: new Date(Date.now() + 4 * 86400000).getDate(), pay_account_id: 'a2', credit_limit: 5000000 },
  ];
  const recurring = [
    { id: 'r1', name: '급여·사업소득', kind: 'income', category: '사업소득', amount: 6500000, day_of_month: 10, account_id: 'a1', active: true },
    { id: 'r2', name: '관리비', kind: 'expense', category: '주거·관리비', amount: 280000, day_of_month: 25, account_id: 'a2', active: true },
    { id: 'r3', name: '보험료', kind: 'expense', category: '보험', amount: 210000, day_of_month: 5, account_id: 'a1', active: true },
    { id: 'r4', name: '대출 이자', kind: 'expense', category: '금융비용', amount: 125000, day_of_month: 20, account_id: 'a1', active: true },
    { id: 'r5', name: '휴대폰 요금', kind: 'expense', category: '통신', amount: 89000, day_of_month: 12, card_id: 'c1', active: true },
    { id: 'r6', name: 'ETF 적립', kind: 'expense', category: '투자', amount: 500000, day_of_month: 11, account_id: 'a1', active: true },
  ];
  const cats = [['식비', 9000, 65000], ['교통', 1500, 45000], ['쇼핑', 15000, 180000], ['카페·간식', 4000, 12000], ['의료', 8000, 60000], ['경조사', 50000, 100000], ['교육', 30000, 150000]];
  const merchants = { '식비': ['점심 식사', '배달의민족', '이마트', '저녁 회식'], '교통': ['주유', '택시', '주차'], '쇼핑': ['쿠팡', '올리브영', '무신사'], '카페·간식': ['스타벅스', '메가커피'], '의료': ['약국', '병원'], '경조사': ['결혼 축의금', '조의금'], '교육': ['온라인 강의', '도서 구입'] };
  const tx = [];
  const now = new Date();
  for (let m = 5; m >= 0; m--) {
    const y = now.getFullYear(), mo = now.getMonth() - m;
    const inc = new Date(y, mo, 10);
    if (inc <= now) tx.push({ id: id('ti', m), date: toStr(inc), kind: 'income', category: '사업소득', amount: 6500000 + Math.round(rnd() * 8) * 100000, account_id: 'a1', memo: '급여·사업소득', source: 'manual' });
    if (m % 2 === 0) { const d = new Date(y, mo, 28); if (d <= now) tx.push({ id: id('tb', m), date: toStr(d), kind: 'income', category: '배당·이자', amount: 80000 + Math.round(rnd() * 60000), account_id: 'a4', memo: '배당금', source: 'manual' }); }
    for (const r of recurring.filter((x) => x.kind === 'expense')) {
      const d = new Date(y, mo, r.day_of_month);
      if (d <= now) tx.push({ id: id('tr' + r.id, m), date: toStr(d), kind: 'expense', category: r.category, amount: r.amount, account_id: r.account_id || null, card_id: r.card_id || null, settled: false, memo: r.name, source: 'manual' });
    }
    const n = 22 + Math.round(rnd() * 10);
    for (let k = 0; k < n; k++) {
      const [cat, lo, hi] = cats[Math.floor(rnd() * cats.length)];
      if ((cat === '경조사' || cat === '교육' || cat === '의료') && rnd() < 0.6) continue;
      const day = 1 + Math.floor(rnd() * 28);
      const d = new Date(y, mo, day); if (d > now) continue;
      const card = rnd() < 0.7 ? (rnd() < 0.55 ? 'c1' : 'c2') : null;
      const list = merchants[cat];
      tx.push({ id: id('tx', `${m}-${k}`), date: toStr(d), kind: 'expense', category: cat, amount: Math.round((lo + rnd() * (hi - lo)) / 100) * 100, account_id: card ? null : (rnd() < 0.5 ? 'a2' : 'a5'), card_id: card, settled: false, memo: list[Math.floor(rnd() * list.length)], source: 'manual' });
    }
  }
  // card usage before the last pay date's statement is already paid
  for (const c of cards) {
    const lastPay = new Date(now.getFullYear(), now.getMonth(), c.pay_day);
    if (lastPay > now) lastPay.setMonth(lastPay.getMonth() - 1);
    const cutoff = new Date(lastPay); cutoff.setDate(cutoff.getDate() - 14);
    tx.filter((t) => t.card_id === c.id).forEach((t) => { if (t.date <= toStr(cutoff)) t.settled = true; });
  }
  const investments = [
    { id: 'i1', name: '삼성전자', ticker: '005930', kind: '주식', qty: 120, avg_price: 68000, current_price: 61500 },
    { id: 'i2', name: 'TIGER 미국S&P500', ticker: '360750', kind: 'ETF', qty: 300, avg_price: 15200, current_price: 21800 },
    { id: 'i3', name: 'KODEX 200', ticker: '069500', kind: 'ETF', qty: 150, avg_price: 33500, current_price: 36200 },
    { id: 'i4', name: '국고채 3년', ticker: '', kind: '채권', qty: 1, avg_price: 5000000, current_price: 5080000 },
    { id: 'i5', name: '비트코인', ticker: 'BTC', kind: '코인', qty: 0.03, avg_price: 82000000, current_price: 96000000 },
  ];
  return { accounts, cards, transactions: tx, recurring, investments };
}

// monthly history ending near today's net worth (sample trend)
export function demoSnapshots(current) {
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const now = new Date(); const out = []; let nw = current;
  for (let m = 1; m <= 6; m++) {
    nw -= 450000 + Math.round(rnd() * 700000);
    out.unshift({ id: `s-${m}`, date: toStr(new Date(now.getFullYear(), now.getMonth() - m, 28)), net_worth: nw });
  }
  return out;
}
