import { Store } from './store.js?v=4';
import { demoData, demoSnapshots } from './seed.js?v=4';
import { totals, cardSummary, forecast, alerts, monthStats, lastMonths, won, short, todayStr, toStr, parse, daysBetween, nextOnDay } from './calc.js?v=4';

// ---------- constants ----------
const EXP_CATS = ['식비', '카페·간식', '교통', '쇼핑', '주거·관리비', '통신', '의료', '교육', '경조사', '보험', '금융비용', '세금', '투자', '사업자금', '기타'];
const INC_CATS = ['급여', '사업소득', '배당·이자', '임대수입', '기타수입'];
const CAT_ICON = { '식비': '🍚', '카페·간식': '☕', '교통': '🚗', '쇼핑': '🛍️', '주거·관리비': '🏠', '통신': '📱', '의료': '💊', '교육': '📚', '경조사': '💐', '보험': '🛡️', '금융비용': '🏦', '세금': '🧾', '투자': '📈', '사업자금': '💼', '기타': '•', '급여': '💰', '사업소득': '💼', '배당·이자': '🪙', '임대수입': '🏢', '기타수입': '➕', '카드대금': '💳', '이체': '↔️' };
const ACCT_KINDS = { bank: '입출금', cash: '현금', savings: '저축·파킹', securities: '증권 예수금', loan: '대출' };
const INV_KINDS = ['주식', 'ETF', '채권', '코인', '펀드', '부동산', '기타'];
const PAL = ['#C9A227', '#2BB5A5', '#6C8CF5', '#9B7BEA', '#E5584F', '#E0A12E', '#7C8796', '#E07BA6', '#4FB6E0'];
const CARD_BG = ['linear-gradient(135deg,#2B3B57,#111925)', 'linear-gradient(135deg,#7A5A12,#C9A227)', 'linear-gradient(135deg,#0F6A63,#2BB5A5)', 'linear-gradient(135deg,#4B3A8A,#8C73E0)', 'linear-gradient(135deg,#7A2622,#E5584F)'];
const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  flow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17V9M12 17V5M17 17v-6M4 21h16"/></svg>',
  cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/></svg>',
  invest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 6-6 4 4 8-8M15 7h6v6"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
};
const NAV = [
  { id: 'home', label: '홈', sub: () => `기준 ${fmtDate(todayStr())}` },
  { id: 'flow', label: '흐름', sub: () => '월별 수입·지출과 거래 내역' },
  { id: 'cards', label: '카드', sub: () => '결제 예정액과 결제일' },
  { id: 'invest', label: '투자', sub: () => '보유 종목과 수익률' },
  { id: 'settings', label: '자산·설정', sub: () => '계좌 · 고정 지출 · 가져오기 · 백업' },
];

// ---------- state & helpers ----------
const S = { view: 'home', month: todayStr().slice(0, 7), flowKind: 'all', charts: [] };
const D = Store.data;
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : 0; };
const fmtDate = (s) => { const d = parse(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`; };
const acctName = (id) => D.accounts.find((a) => a.id === id)?.name;
const cardName = (id) => D.cards.find((c) => c.id === id)?.name;

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 2200); }
async function guard(fn) { try { await fn(); } catch (e) { console.error(e); toast('저장 실패: ' + e.message); } }

function openModal(title, html, { wide = false } = {}) {
  $('#modal-title').textContent = title; $('#modal-body').innerHTML = html;
  $('.sheet').classList.toggle('wide', wide); $('#modal').classList.remove('hidden');
  return $('#modal-body');
}
function closeModal() { $('#modal').classList.add('hidden'); $('#modal-body').innerHTML = ''; }

function opts(list, sel) { return list.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'selected' : ''}>${esc(l)}</option>`; }).join(''); }

// ---------- charts ----------
function chart(canvas, config) { const c = new window.Chart(canvas, config); S.charts.push(c); return c; }
function clearCharts() { S.charts.forEach((c) => c.destroy()); S.charts = []; }
function chartDefaults() {
  const C = window.Chart; if (!C) return;
  C.defaults.color = '#8A94A3'; C.defaults.font.family = "'Pretendard Variable', Pretendard, 'Malgun Gothic', sans-serif"; C.defaults.font.size = 11.5;
  C.defaults.borderColor = 'rgba(255,255,255,.06)'; C.defaults.plugins.legend.labels.boxWidth = 10; C.defaults.plugins.legend.labels.boxHeight = 10;
  C.defaults.plugins.tooltip.backgroundColor = '#263142'; C.defaults.plugins.tooltip.padding = 10; C.defaults.plugins.tooltip.cornerRadius = 10;
  C.defaults.maintainAspectRatio = false;
}
const yShort = { ticks: { callback: (v) => short(v) }, grid: { color: 'rgba(255,255,255,.05)' } };

// ---------- balances ----------
function effect(t) {
  if (!t || !t.account_id || t.source === 'import') return null;
  if (t.kind === 'income') return { id: t.account_id, delta: Number(t.amount) };
  if (t.kind === 'expense' || t.kind === 'card_payment') return { id: t.account_id, delta: -Number(t.amount) };
  return null;
}
async function applyEffect(e, sign = 1) {
  if (!e) return; const a = D.accounts.find((x) => x.id === e.id); if (!a) return;
  await Store.save('accounts', { ...a, balance: Number(a.balance) + sign * e.delta });
}

let snapTimer;
function scheduleSnapshot() {
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => { const t = totals(D); Store.snapshot(todayStr(), { net_worth: t.netWorth, cash: t.cash, invest: t.invest, debt: t.debt }).catch(() => {}); }, 1200);
}
async function refresh() { render(); scheduleSnapshot(); }

// ---------- navigation ----------
function buildNav() {
  const item = (n) => `<button class="nav-item" data-view="${n.id}">${ICONS[n.id]}<span>${n.label}</span></button>`;
  $('#nav-side').innerHTML = NAV.map(item).join(''); $('#nav-bottom').innerHTML = NAV.map(item).join('');
  document.querySelectorAll('.nav-item').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
}
function go(v) { S.view = v; location.hash = v; render(); window.scrollTo({ top: 0 }); }

function render() {
  clearCharts();
  const n = NAV.find((x) => x.id === S.view) || NAV[0];
  $('#view-title').textContent = n.label; $('#view-sub').textContent = n.sub();
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === n.id));
  ({ home: renderHome, flow: renderFlow, cards: renderCards, invest: renderInvest, settings: renderSettings })[n.id]();
}

// ---------- HOME ----------
function renderHome() {
  const t = totals(D), al = alerts(D), f = forecast(D, 60);
  const snaps = [...D.snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const past = [...snaps].reverse().find((s) => daysBetween(s.date, todayStr()) >= 28);
  const chg = past ? t.netWorth - Number(past.net_worth) : null;
  const ms = monthStats(D, todayStr().slice(0, 7));
  const upcoming = f.series.slice(0, 15).flatMap((d) => d.events.map((e) => ({ ...e, date: d.date }))).slice(0, 7);
  const invRet = t.investCost ? (t.invest - t.investCost) / t.investCost : 0;

  $('#view').innerHTML = `
    ${al.length ? `<div class="alerts">${al.map((a) => `<div class="alert ${a.level}"><i class="dot"></i><div><b>${esc(a.title)}</b><span>${esc(a.body)}</span></div></div>`).join('')}</div>` : ''}
    <div class="grid g3">
      <div class="card hero span2">
        <div class="label">순자산</div>
        <div class="big num">${won(t.netWorth)}</div>
        <div class="muted small">${chg === null ? '기록이 쌓이면 지난달 대비 변화가 표시됩니다' : `지난달 대비 <b class="${chg >= 0 ? 'up' : 'down'}">${won(chg, { sign: true })}</b>`}</div>
        <div class="chips">
          <span class="chip">총자산<b>${short(t.assets)}</b></span><span class="chip">총부채<b>${short(t.debt)}</b></span>
          <span class="chip">이번 달 수입<b class="up">${short(ms.income)}</b></span><span class="chip">이번 달 지출<b class="down">${short(ms.expense)}</b></span>
        </div>
      </div>
      <div class="card"><h3>다가오는 출금·입금 <span class="muted small">14일</span></h3>
        <div class="list">${upcoming.length ? upcoming.map((e) => `<div class="row"><div class="grow"><b>${esc(e.label)}</b><span>${fmtDate(e.date)}</span></div><div class="amt num ${e.amount >= 0 ? 'up' : ''}">${won(e.amount, { sign: true })}</div></div>`).join('') : '<div class="empty">예정된 항목이 없습니다</div>'}</div>
      </div>
    </div>
    <div class="grid g4" style="margin-top:var(--gap)">
      ${stat('현금성 자산', won(t.cash), '입출금 통장 + 현금')}
      ${stat('저축·예수금', won(t.savings + t.securitiesCash), '파킹통장 · 증권 예수금')}
      ${stat('투자 평가액', won(t.invest), `수익률 <span class="${invRet >= 0 ? 'up' : 'down'}">${(invRet * 100).toFixed(1)}%</span>`)}
      ${stat('부채', won(t.debt), `카드 ${short(t.cardDebt)} · 대출 ${short(t.loans)}`, 'down')}
    </div>
    <div class="grid g3" style="margin-top:var(--gap)">
      <div class="card span2"><h3>현금 흐름 예측 <span class="muted small">60일 · 최저 ${won(f.min.balance)} (${f.min.date.slice(5).replace('-', '/')})</span></h3><div class="chart-box tall"><canvas id="c-fc"></canvas></div></div>
      <div class="card"><h3>자산 구성</h3><div class="chart-box tall"><canvas id="c-mix"></canvas></div></div>
    </div>
    <div class="grid g2" style="margin-top:var(--gap)">
      <div class="card"><h3>순자산 추이</h3><div class="chart-box"><canvas id="c-nw"></canvas></div></div>
      <div class="card"><h3>이번 달 지출 TOP 5 <button class="btn sm ghost" data-go="flow">흐름 보기 →</button></h3>${catBars(ms.byCat, 5)}</div>
    </div>`;
  $('[data-go]')?.addEventListener('click', (e) => go(e.target.dataset.go));

  chart($('#c-fc'), {
    type: 'line',
    data: { labels: f.series.map((d) => d.date.slice(5).replace('-', '/')), datasets: [
      { data: f.series.map((d) => d.balance), borderColor: '#C9A227', borderWidth: 2.5, backgroundColor: 'rgba(201,162,39,.12)', fill: true, tension: .25,
        pointRadius: f.series.map((d) => (d.events.length ? 3.5 : 0)), pointBackgroundColor: f.series.map((d) => (d.events.reduce((s, e) => s + e.amount, 0) >= 0 ? '#2BB5A5' : '#E5584F')) },
      { data: f.series.map(() => 0), borderColor: 'rgba(229,88,79,.6)', borderDash: [5, 5], borderWidth: 1, pointRadius: 0, hidden: f.min.balance > t.cash * 0.25 },
    ] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => (c.datasetIndex ? null : `잔액 ${won(c.raw)}`), afterLabel: (c) => (c.datasetIndex ? '' : f.series[c.dataIndex].events.map((e) => `${e.label} ${won(e.amount, { sign: true })}`).join('\n')) } } },
      scales: { x: { ticks: { maxTicksLimit: 9 }, grid: { display: false } }, y: yShort } },
  });
  const byKind = {}; D.investments.forEach((i) => { byKind[i.kind] = (byKind[i.kind] || 0) + Number(i.qty) * Number(i.current_price); });
  const mix = [['현금성', t.cash], ['저축·파킹', t.savings], ['증권 예수금', t.securitiesCash], ...Object.entries(byKind)].filter((x) => x[1] > 0);
  chart($('#c-mix'), { type: 'doughnut', data: { labels: mix.map((x) => x[0]), datasets: [{ data: mix.map((x) => x[1]), backgroundColor: PAL, borderColor: '#161D27', borderWidth: 2 }] },
    options: { cutout: '64%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.label} ${won(c.raw)} (${((c.raw / t.assets) * 100).toFixed(1)}%)` } } } } });
  const pts = [...snaps.filter((s) => s.date !== todayStr()).slice(-11), { date: todayStr(), net_worth: t.netWorth }];
  chart($('#c-nw'), { type: 'line', data: { labels: pts.map((p) => p.date.slice(2, 7).replace('-', '.')), datasets: [{ data: pts.map((p) => p.net_worth), borderColor: '#2BB5A5', backgroundColor: 'rgba(43,181,165,.1)', fill: true, tension: .3, pointRadius: 3 }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => won(c.raw) } } }, scales: { x: { grid: { display: false } }, y: yShort } } });
}
function stat(label, value, sub, cls = '') { return `<div class="card stat"><div class="label">${label}</div><div class="value num ${cls}">${value}</div><div class="sub">${sub}</div></div>`; }
function catBars(byCat, n = 99) {
  const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, n); const tot = Object.values(byCat).reduce((s, v) => s + v, 0);
  if (!rows.length) return '<div class="empty">이번 달 지출 기록이 없습니다</div>';
  return `<div class="list">${rows.map(([k, v], i) => `<div class="row"><div class="ico">${CAT_ICON[k] || '•'}</div><div class="grow"><b>${esc(k)}</b><div class="bar"><i style="width:${(v / rows[0][1]) * 100}%;background:${PAL[i % PAL.length]}"></i></div></div><div class="amt num">${won(v)}<div class="muted small" style="text-align:right">${((v / tot) * 100).toFixed(0)}%</div></div></div>`).join('')}</div>`;
}

// ---------- FLOW ----------
function renderFlow() {
  const ym = S.month, ms = monthStats(D, ym), months = lastMonths(6);
  const [y, m] = ym.split('-').map(Number);
  const rate = ms.income ? (ms.net / ms.income) * 100 : 0;
  let tx = D.transactions.filter((t) => t.date.startsWith(ym));
  if (S.flowKind === 'income') tx = tx.filter((t) => t.kind === 'income');
  if (S.flowKind === 'expense') tx = tx.filter((t) => t.kind === 'expense');
  if (S.flowKind === 'card') tx = tx.filter((t) => t.card_id);
  tx.sort((a, b) => b.date.localeCompare(a.date) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const groups = {}; tx.forEach((t) => (groups[t.date] = groups[t.date] || []).push(t));

  $('#view').innerHTML = `
    <div class="toolbar">
      <div class="month-nav"><button class="icon-btn" id="m-prev">‹</button><span>${y}년 ${m}월</span><button class="icon-btn" id="m-next">›</button></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="imp">은행 파일 가져오기</button><button class="btn sm primary" id="add-tx">＋ 기록</button></div>
    </div>
    <div class="grid g3 kpi3">
      ${stat('수입', `<span class="up">${won(ms.income)}</span>`, `${ms.count}건 기록`)}
      ${stat('지출', `<span class="down">${won(ms.expense)}</span>`, '카드 사용 포함 · 카드대금 결제 제외')}
      ${stat('순저축', won(ms.net, { sign: true }), `저축률 ${rate.toFixed(0)}%`)}
    </div>
    <div class="grid g3" style="margin-top:var(--gap)">
      <div class="card span2"><h3>최근 6개월 수입·지출</h3><div class="chart-box"><canvas id="c-6m"></canvas></div></div>
      <div class="card"><h3>지출 카테고리</h3><div class="chart-box sm"><canvas id="c-cat"></canvas></div></div>
    </div>
    <div class="grid g2" style="margin-top:var(--gap)">
      <div class="card"><h3>카테고리별 지출</h3>${catBars(ms.byCat)}</div>
      <div class="card"><h3>거래 내역
        <span class="seg">${[['all', '전체'], ['income', '수입'], ['expense', '지출'], ['card', '카드']].map(([k, l]) => `<button data-k="${k}" class="${S.flowKind === k ? 'on' : ''}">${l}</button>`).join('')}</span></h3>
        <div class="list">${Object.keys(groups).length ? Object.entries(groups).map(([d, list]) => `<div class="day-head">${fmtDate(d)}</div>${list.map(txRow).join('')}`).join('') : '<div class="empty">이 달의 거래가 없습니다</div>'}</div>
      </div>
    </div>`;
  $('#m-prev').onclick = () => { S.month = toStr(new Date(y, m - 2, 1)).slice(0, 7); render(); };
  $('#m-next').onclick = () => { S.month = toStr(new Date(y, m, 1)).slice(0, 7); render(); };
  $('#add-tx').onclick = () => txForm(); $('#imp').onclick = importForm;
  document.querySelectorAll('.seg button').forEach((b) => (b.onclick = () => { S.flowKind = b.dataset.k; render(); }));
  document.querySelectorAll('[data-tx]').forEach((r) => (r.onclick = () => txForm(D.transactions.find((t) => t.id === r.dataset.tx))));

  const st = months.map((mm) => monthStats(D, mm));
  chart($('#c-6m'), { type: 'bar', data: { labels: months.map((mm) => `${Number(mm.slice(5))}월`), datasets: [
    { label: '수입', data: st.map((x) => x.income), backgroundColor: '#2BB5A5', borderRadius: 6, maxBarThickness: 26 },
    { label: '지출', data: st.map((x) => x.expense), backgroundColor: '#E5584F', borderRadius: 6, maxBarThickness: 26 },
  ] }, options: { plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label} ${won(c.raw)}` } } }, scales: { x: { grid: { display: false } }, y: yShort } } });
  const cats = Object.entries(ms.byCat).sort((a, b) => b[1] - a[1]);
  if (cats.length) chart($('#c-cat'), { type: 'doughnut', data: { labels: cats.map((c) => c[0]), datasets: [{ data: cats.map((c) => c[1]), backgroundColor: PAL, borderColor: '#161D27', borderWidth: 2 }] },
    options: { cutout: '62%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label} ${won(c.raw)}` } } } } });
}
function txRow(t) {
  const sign = t.kind === 'income' ? 1 : -1;
  const cat = t.kind === 'card_payment' ? '카드대금' : t.kind === 'transfer' ? '이체' : (t.category || '기타');
  const via = t.card_id ? `💳 ${esc(cardName(t.card_id) || '카드')}${t.settled ? '' : ' · 결제 전'}` : esc(acctName(t.account_id) || '');
  return `<div class="row click" data-tx="${t.id}"><div class="ico">${CAT_ICON[cat] || '•'}</div><div class="grow"><b>${esc(t.memo || cat)}</b><span>${esc(cat)} · ${via}${t.source === 'import' ? ' · <span class="pill">가져옴</span>' : ''}</span></div><div class="amt num ${sign > 0 ? 'up' : ''}">${won(sign * t.amount, { sign: true })}</div></div>`;
}

function txForm(t = null) {
  const isNew = !t; t = t || { kind: 'expense', date: todayStr(), amount: '', category: '식비' };
  const pays = [...D.accounts.filter((a) => a.kind !== 'loan').map((a) => ['a:' + a.id, `🏦 ${a.name}`]), ...D.cards.map((c) => ['c:' + c.id, `💳 ${c.name}`])];
  const paySel = t.card_id ? 'c:' + t.card_id : t.account_id ? 'a:' + t.account_id : (pays[0] || [''])[0];
  const body = openModal(isNew ? '기록 추가' : '기록 수정', `
    <form class="form" id="f">
      <div class="seg" style="width:max-content">${[['expense', '지출'], ['income', '수입']].map(([k, l]) => `<button type="button" data-kind="${k}" class="${t.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <input type="hidden" name="kind" value="${t.kind === 'income' ? 'income' : 'expense'}" />
      <label>금액 (원)<input name="amount" inputmode="numeric" value="${t.amount ? Number(t.amount).toLocaleString('ko-KR') : ''}" placeholder="0" required autofocus /></label>
      <div class="two"><label>날짜<input type="date" name="date" value="${t.date}" required /></label>
      <label>카테고리<select name="category" id="cat">${opts(t.kind === 'income' ? INC_CATS : EXP_CATS, t.category)}</select></label></div>
      <label>계좌 · 카드<select name="pay">${opts(pays, paySel)}</select></label>
      <label>메모<input name="memo" value="${esc(t.memo || '')}" placeholder="예: 점심 식사" /></label>
      <div class="form-actions">${isNew ? '<span></span>' : '<button type="button" class="btn danger" id="del">삭제</button>'}<button class="btn primary">저장</button></div>
    </form>`);
  const f = $('#f', body);
  f.amount.addEventListener('input', () => { const v = num(f.amount.value); f.amount.value = v ? v.toLocaleString('ko-KR') : ''; });
  body.querySelectorAll('[data-kind]').forEach((b) => (b.onclick = () => {
    body.querySelectorAll('[data-kind]').forEach((x) => x.classList.toggle('on', x === b)); f.kind.value = b.dataset.kind;
    $('#cat', body).innerHTML = opts(b.dataset.kind === 'income' ? INC_CATS : EXP_CATS);
  }));
  f.onsubmit = (e) => { e.preventDefault(); guard(async () => {
    const [pt, pid] = f.pay.value.split(':');
    const rec = { ...(isNew ? {} : t), kind: f.kind.value, amount: num(f.amount.value), date: f.date.value, category: f.category.value, memo: f.memo.value.trim(),
      account_id: pt === 'a' ? pid : null, card_id: pt === 'c' ? pid : null, settled: pt === 'c' ? (isNew ? false : !!t.settled) : false, source: isNew ? 'manual' : t.source };
    if (!rec.amount) return toast('금액을 입력하세요');
    if (rec.kind === 'income' && rec.card_id) return toast('수입은 계좌를 선택하세요');
    if (!isNew) await applyEffect(effect(t), -1);
    const saved = await Store.save('transactions', rec);
    await applyEffect(effect(saved), 1);
    closeModal(); toast('저장했습니다'); refresh();
  }); };
  $('#del', body)?.addEventListener('click', () => guard(async () => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    await applyEffect(effect(t), -1); await Store.remove('transactions', t.id); closeModal(); toast('삭제했습니다'); refresh();
  }));
}

// ---------- CARDS ----------
function renderCards() {
  const list = cardSummary(D);
  const totalBill = list.reduce((s, x) => s + x.bill, 0);
  $('#view').innerHTML = `
    <div class="toolbar"><div class="muted small">결제 예정액 = 아직 결제 처리하지 않은 카드 사용 합계 · 합계 <b class="gold">${won(totalBill)}</b></div><button class="btn sm primary" id="add-card">＋ 카드 추가</button></div>
    ${list.length ? `<div class="grid g3">${list.map((s, i) => `
      <div class="card" style="padding:12px">
        <div class="cc" style="background:${CARD_BG[i % CARD_BG.length]}">
          <div><div class="t">${esc(s.card.issuer || '카드')}</div><div class="n">${esc(s.card.name)}</div></div>
          <div><div class="t">결제 예정액</div><div class="bill num">${won(s.bill)}</div></div>
          <div class="meta"><span>${fmtDate(s.due)} 결제${s.account ? ` · ${esc(s.account.name)}` : ''}</span><span class="dday">${s.dday === 0 ? 'D-DAY' : 'D-' + s.dday}</span></div>
        </div>
        ${s.short > 0 ? `<div class="alert danger" style="margin-top:10px"><i class="dot"></i><div><b>결제 계좌 잔액 부족</b><span>${esc(s.account.name)} 잔액 ${won(s.account.balance)} · ${won(s.short)} 부족</span></div></div>` : ''}
        ${s.card.credit_limit ? `<div style="margin-top:10px" class="small muted">한도 사용 ${((s.bill / s.card.credit_limit) * 100).toFixed(0)}% · ${won(s.card.credit_limit)}<div class="bar"><i style="width:${Math.min(100, (s.bill / s.card.credit_limit) * 100)}%;background:var(--gold)"></i></div></div>` : ''}
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn sm primary" data-settle="${s.card.id}" ${s.bill > 0 ? '' : 'disabled'}>결제 처리</button><button class="btn sm" data-edit-card="${s.card.id}">편집</button></div>
      </div>`).join('')}</div>` : '<div class="card empty">등록된 카드가 없습니다. 카드와 결제일을 등록하면 결제 예정액과 잔액 부족을 미리 알려드립니다.</div>'}
    <div class="grid g2" style="margin-top:var(--gap)">
      ${list.map((s) => { const tx = D.transactions.filter((t) => t.card_id === s.card.id && t.kind === 'expense' && !t.settled).sort((a, b) => b.date.localeCompare(a.date));
        return `<div class="card"><h3>${esc(s.card.name)} 결제 전 사용 <span class="muted small">${tx.length}건</span></h3><div class="list">${tx.length ? tx.slice(0, 12).map(txRow).join('') : '<div class="empty">결제 전 사용 내역이 없습니다</div>'}</div></div>`; }).join('')}
    </div>`;
  $('#add-card').onclick = () => cardForm();
  document.querySelectorAll('[data-edit-card]').forEach((b) => (b.onclick = () => cardForm(D.cards.find((c) => c.id === b.dataset.editCard))));
  document.querySelectorAll('[data-settle]').forEach((b) => (b.onclick = () => settleCard(b.dataset.settle)));
  document.querySelectorAll('[data-tx]').forEach((r) => (r.onclick = () => txForm(D.transactions.find((t) => t.id === r.dataset.tx))));
}
function settleCard(cardId) {
  const s = cardSummary(D).find((x) => x.card.id === cardId);
  const body = openModal('카드 결제 처리', `
    <form class="form" id="f"><p class="muted" style="margin:0">${esc(s.card.name)}의 결제 전 사용분 <b class="gold">${won(s.bill)}</b>을 결제 완료로 표시하고, 선택한 계좌 잔액에서 차감합니다.</p>
      <label>출금 계좌<select name="acct">${opts(D.accounts.filter((a) => a.kind !== 'loan').map((a) => [a.id, `${a.name} (${won(a.balance)})`]), s.card.pay_account_id)}</select></label>
      <label>결제일<input type="date" name="date" value="${todayStr()}" /></label>
      <div class="form-actions"><span></span><button class="btn primary">결제 처리</button></div></form>`);
  $('#f', body).onsubmit = (e) => { e.preventDefault(); guard(async () => {
    const f = e.target; const tx = D.transactions.filter((t) => t.card_id === cardId && t.kind === 'expense' && !t.settled);
    await Store.saveMany('transactions', tx.map((t) => ({ ...t, settled: true })));
    const pay = await Store.save('transactions', { kind: 'card_payment', category: '카드대금', amount: s.bill, date: f.date.value, account_id: f.acct.value, card_id: cardId, settled: true, memo: `${s.card.name} 대금`, source: 'manual' });
    await applyEffect(effect(pay), 1);
    closeModal(); toast('결제 처리했습니다'); refresh();
  }); };
}
function cardForm(c = null) {
  const isNew = !c; c = c || { pay_day: 15 };
  const body = openModal(isNew ? '카드 추가' : '카드 편집', `
    <form class="form" id="f">
      <div class="two"><label>카드 이름<input name="name" value="${esc(c.name || '')}" required placeholder="예: 현대카드 M" /></label><label>카드사<input name="issuer" value="${esc(c.issuer || '')}" /></label></div>
      <div class="two"><label>결제일 (매월)<input name="pay_day" type="number" min="1" max="31" value="${c.pay_day}" required /></label><label>한도 (선택)<input name="credit_limit" inputmode="numeric" value="${c.credit_limit ? Number(c.credit_limit).toLocaleString('ko-KR') : ''}" /></label></div>
      <label>결제 계좌<select name="pay_account_id"><option value="">선택 안 함</option>${opts(D.accounts.filter((a) => a.kind !== 'loan').map((a) => [a.id, a.name]), c.pay_account_id)}</select></label>
      <div class="form-actions">${isNew ? '<span></span>' : '<button type="button" class="btn danger" id="del">삭제</button>'}<button class="btn primary">저장</button></div></form>`);
  const f = $('#f', body);
  f.onsubmit = (e) => { e.preventDefault(); guard(async () => {
    await Store.save('cards', { ...(isNew ? {} : c), name: f.name.value.trim(), issuer: f.issuer.value.trim(), pay_day: Number(f.pay_day.value), credit_limit: num(f.credit_limit.value) || null, pay_account_id: f.pay_account_id.value || null });
    closeModal(); toast('저장했습니다'); refresh();
  }); };
  $('#del', body)?.addEventListener('click', () => guard(async () => { if (!confirm('카드를 삭제할까요? 사용 기록은 남습니다.')) return; await Store.remove('cards', c.id); closeModal(); refresh(); }));
}

// ---------- INVEST ----------
function renderInvest() {
  const rows = D.investments.map((i) => { const ev = i.qty * i.current_price, cost = i.qty * i.avg_price; return { ...i, ev, cost, pl: ev - cost, ret: cost ? (ev - cost) / cost : 0 }; }).sort((a, b) => b.ev - a.ev);
  const ev = rows.reduce((s, r) => s + r.ev, 0), cost = rows.reduce((s, r) => s + r.cost, 0), pl = ev - cost;
  const byKind = {}; rows.forEach((r) => (byKind[r.kind] = (byKind[r.kind] || 0) + r.ev));
  $('#view').innerHTML = `
    <div class="toolbar"><div class="muted small">현재가는 직접 입력합니다 · 마지막 수정 ${rows.length ? fmtDate(rows.map((r) => String(r.updated_at || todayStr()).slice(0, 10)).sort().pop()) : '-'}</div>
      <div style="display:flex;gap:8px"><button class="btn sm" id="prices" ${rows.length ? '' : 'disabled'}>현재가 일괄 수정</button><button class="btn sm primary" id="add-inv">＋ 종목 추가</button></div></div>
    <div class="grid g3 kpi3">${stat('평가금액', won(ev), `${rows.length}개 종목`)}${stat('투자원금', won(cost), '평균 매입가 × 수량')}${stat('평가손익', `<span class="${pl >= 0 ? 'up' : 'down'}">${won(pl, { sign: true })}</span>`, `수익률 ${cost ? ((pl / cost) * 100).toFixed(2) : '0.00'}%`)}</div>
    <div class="grid g3" style="margin-top:var(--gap)">
      <div class="card"><h3>자산군 비중</h3><div class="chart-box"><canvas id="c-kind"></canvas></div></div>
      <div class="card span2"><h3>종목별 수익률</h3><div class="chart-box"><canvas id="c-ret"></canvas></div></div>
    </div>
    <div class="card" style="margin-top:var(--gap)"><h3>보유 종목</h3>${rows.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>종목</th><th>구분</th><th class="r">수량</th><th class="r">평균단가</th><th class="r">현재가</th><th class="r">평가금액</th><th class="r">손익</th><th class="r">수익률</th></tr></thead><tbody>
      ${rows.map((r) => `<tr class="row click" data-inv="${r.id}" style="display:table-row"><td><b>${esc(r.name)}</b> <span class="muted small">${esc(r.ticker || '')}</span></td><td><span class="pill">${esc(r.kind)}</span></td><td class="r num">${Number(r.qty).toLocaleString('ko-KR')}</td><td class="r num">${won(r.avg_price)}</td><td class="r num">${won(r.current_price)}</td><td class="r num"><b>${won(r.ev)}</b></td><td class="r num ${r.pl >= 0 ? 'up' : 'down'}">${won(r.pl, { sign: true })}</td><td class="r num ${r.pl >= 0 ? 'up' : 'down'}">${(r.ret * 100).toFixed(2)}%</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">보유 종목을 추가하세요</div>'}</div>`;
  $('#add-inv').onclick = () => invForm(); $('#prices').onclick = priceForm;
  document.querySelectorAll('[data-inv]').forEach((r) => (r.onclick = () => invForm(D.investments.find((i) => i.id === r.dataset.inv))));
  if (!rows.length) return;
  const kinds = Object.entries(byKind);
  chart($('#c-kind'), { type: 'doughnut', data: { labels: kinds.map((k) => k[0]), datasets: [{ data: kinds.map((k) => k[1]), backgroundColor: PAL, borderColor: '#161D27', borderWidth: 2 }] }, options: { cutout: '62%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.label} ${won(c.raw)} (${((c.raw / ev) * 100).toFixed(1)}%)` } } } } });
  const byRet = [...rows].sort((a, b) => b.ret - a.ret);
  chart($('#c-ret'), { type: 'bar', data: { labels: byRet.map((r) => r.name), datasets: [{ data: byRet.map((r) => +(r.ret * 100).toFixed(2)), backgroundColor: byRet.map((r) => (r.ret >= 0 ? '#2BB5A5' : '#E5584F')), borderRadius: 6, maxBarThickness: 22 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.raw}% · ${won(byRet[c.dataIndex].pl, { sign: true })}` } } }, scales: { x: { ticks: { callback: (v) => v + '%' } }, y: { grid: { display: false } } } } });
}
function invForm(i = null) {
  const isNew = !i; i = i || { kind: '주식', qty: '', avg_price: '', current_price: '' };
  const n = (v) => (v === '' || v == null ? '' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 8 }));
  const body = openModal(isNew ? '종목 추가' : '종목 편집', `
    <form class="form" id="f">
      <div class="two"><label>종목명<input name="name" value="${esc(i.name || '')}" required /></label><label>코드 (선택)<input name="ticker" value="${esc(i.ticker || '')}" /></label></div>
      <div class="two"><label>구분<select name="kind">${opts(INV_KINDS, i.kind)}</select></label><label>수량<input name="qty" inputmode="decimal" value="${n(i.qty)}" required /></label></div>
      <div class="two"><label>평균 매입가<input name="avg_price" inputmode="decimal" value="${n(i.avg_price)}" required /></label><label>현재가<input name="current_price" inputmode="decimal" value="${n(i.current_price)}" required /></label></div>
      <div class="form-actions">${isNew ? '<span></span>' : '<button type="button" class="btn danger" id="del">삭제</button>'}<button class="btn primary">저장</button></div></form>`);
  const f = $('#f', body);
  f.onsubmit = (e) => { e.preventDefault(); guard(async () => {
    await Store.save('investments', { ...(isNew ? {} : i), name: f.name.value.trim(), ticker: f.ticker.value.trim(), kind: f.kind.value, qty: num(f.qty.value), avg_price: num(f.avg_price.value), current_price: num(f.current_price.value), updated_at: new Date().toISOString() });
    closeModal(); toast('저장했습니다'); refresh();
  }); };
  $('#del', body)?.addEventListener('click', () => guard(async () => { if (!confirm('종목을 삭제할까요?')) return; await Store.remove('investments', i.id); closeModal(); refresh(); }));
}
function priceForm() {
  const body = openModal('현재가 일괄 수정', `<form class="form" id="f">${D.investments.map((i) => `<label>${esc(i.name)} <span class="muted">(평균 ${won(i.avg_price)})</span><input name="${i.id}" inputmode="decimal" value="${Number(i.current_price).toLocaleString('ko-KR', { maximumFractionDigits: 8 })}" /></label>`).join('')}
    <div class="form-actions"><span></span><button class="btn primary">모두 저장</button></div></form>`);
  $('#f', body).onsubmit = (e) => { e.preventDefault(); guard(async () => {
    const now = new Date().toISOString();
    await Store.saveMany('investments', D.investments.map((i) => ({ ...i, current_price: num(e.target[i.id].value), updated_at: now })));
    closeModal(); toast('현재가를 갱신했습니다'); refresh();
  }); };
}

// ---------- SETTINGS ----------
function renderSettings() {
  const t = totals(D);
  const accts = [...D.accounts].sort((a, b) => (a.sort || 0) - (b.sort || 0));
  $('#view').innerHTML = `
    <div class="grid g2">
      <div class="card"><h3>계좌 <button class="btn sm primary" id="add-acct">＋ 계좌</button></h3>
        <div class="list">${accts.length ? accts.map((a) => `<div class="row click" data-acct="${a.id}"><div class="ico">${{ bank: '🏦', cash: '💵', savings: '🐷', securities: '📊', loan: '📉' }[a.kind] || '🏦'}</div><div class="grow"><b>${esc(a.name)}</b><span>${esc(ACCT_KINDS[a.kind] || a.kind)}${a.institution ? ' · ' + esc(a.institution) : ''}</span></div><div class="amt num ${a.kind === 'loan' ? 'down' : ''}">${won(a.balance)}</div></div>`).join('') : '<div class="empty">계좌를 추가하세요</div>'}</div>
        <div class="muted small" style="margin-top:10px">총자산 ${won(t.assets)} · 대출 ${won(t.loans)}</div></div>
      <div class="card"><h3>고정 수입·지출 <button class="btn sm primary" id="add-rec">＋ 추가</button></h3>
        <div class="list">${D.recurring.length ? [...D.recurring].sort((a, b) => a.day_of_month - b.day_of_month).map((r) => `<div class="row click" data-rec="${r.id}"><div class="ico">${CAT_ICON[r.category] || '•'}</div><div class="grow"><b>${esc(r.name)}${r.active === false ? ' <span class="pill">중지</span>' : ''}</b><span>매월 ${r.day_of_month}일 · ${esc(r.card_id ? '💳 ' + (cardName(r.card_id) || '') : acctName(r.account_id) || '')}</span></div><div class="amt num ${r.kind === 'income' ? 'up' : ''}">${won((r.kind === 'income' ? 1 : -1) * r.amount, { sign: true })}</div></div>`).join('') : '<div class="empty">월급·관리비·보험료 같은 고정 항목을 등록하면 현금 흐름을 예측합니다</div>'}</div></div>
    </div>
    <div class="grid g3" style="margin-top:var(--gap)">
      <div class="card"><h3>은행 거래내역 가져오기</h3><p class="muted small" style="margin-top:0">은행·카드사에서 내려받은 엑셀(xls·xlsx)이나 CSV 파일을 올리면 날짜·입금·출금·적요·잔액 열을 자동으로 찾아 기록합니다. 이미 있는 거래는 건너뜁니다.</p><button class="btn" id="imp">파일 선택</button></div>
      <div class="card"><h3>백업</h3><p class="muted small" style="margin-top:0">모든 데이터를 JSON 파일로 저장하거나 불러옵니다. 한 달에 한 번 백업을 권합니다.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="exp">백업 저장</button><label class="btn" style="display:inline-block">불러오기<input type="file" id="restore" accept=".json" hidden /></label></div></div>
      <div class="card"><h3>계정</h3>
        ${Store.cloud ? `<p class="muted small" style="margin-top:0">Supabase에 안전하게 동기화 중입니다. 휴대폰과 PC에서 같은 계정으로 로그인하면 같은 데이터를 봅니다.</p><button class="btn" id="logout">로그아웃</button>`
          : `<p class="muted small" style="margin-top:0"><b class="gold">데모 모드</b> · 이 기기 브라우저에만 저장됩니다. <code>js/config.js</code>에 Supabase 주소와 키를 넣으면 로그인과 기기 간 동기화가 켜집니다.</p><button class="btn danger" id="reset">샘플 데이터 지우고 새로 시작</button>`}
      </div>
    </div>`;
  $('#add-acct').onclick = () => acctForm(); $('#add-rec').onclick = () => recForm(); $('#imp').onclick = importForm;
  document.querySelectorAll('[data-acct]').forEach((r) => (r.onclick = () => acctForm(D.accounts.find((a) => a.id === r.dataset.acct))));
  document.querySelectorAll('[data-rec]').forEach((r) => (r.onclick = () => recForm(D.recurring.find((x) => x.id === r.dataset.rec))));
  $('#exp').onclick = () => { const b = new Blob([Store.exportJSON()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `my-assets-backup-${todayStr()}.json`; a.click(); URL.revokeObjectURL(a.href); };
  $('#restore').onchange = (e) => { const file = e.target.files[0]; if (!file) return; file.text().then((txt) => guard(async () => { await Store.importJSON(txt); toast('백업을 불러왔습니다'); refresh(); })); };
  $('#logout')?.addEventListener('click', async () => { await Store.signOut(); location.reload(); });
  $('#reset')?.addEventListener('click', () => guard(async () => { if (!confirm('이 기기의 모든 데이터를 지울까요? 먼저 백업을 권합니다.')) return; await Store.resetDemo(); localStorage.setItem('ma:v1:seeded', '1'); $('#demo-badge').classList.add('hidden'); toast('새로 시작합니다'); refresh(); }));
}
function acctForm(a = null) {
  const isNew = !a; a = a || { kind: 'bank', balance: 0 };
  const body = openModal(isNew ? '계좌 추가' : '계좌 편집', `
    <form class="form" id="f">
      <div class="two"><label>이름<input name="name" value="${esc(a.name || '')}" required placeholder="예: 주거래 통장" /></label><label>금융사<input name="institution" value="${esc(a.institution || '')}" /></label></div>
      <div class="two"><label>종류<select name="kind">${opts(Object.entries(ACCT_KINDS), a.kind)}</select></label><label>현재 잔액 (대출은 남은 원금)<input name="balance" inputmode="numeric" value="${Math.abs(Number(a.balance || 0)).toLocaleString('ko-KR')}" required /></label></div>
      <div class="form-actions">${isNew ? '<span></span>' : '<button type="button" class="btn danger" id="del">삭제</button>'}<button class="btn primary">저장</button></div></form>`);
  const f = $('#f', body);
  f.onsubmit = (e) => { e.preventDefault(); guard(async () => {
    const bal = num(f.balance.value);
    await Store.save('accounts', { ...(isNew ? { sort: D.accounts.length + 1 } : a), name: f.name.value.trim(), institution: f.institution.value.trim(), kind: f.kind.value, balance: f.kind.value === 'loan' ? -Math.abs(bal) : bal });
    closeModal(); toast('저장했습니다'); refresh();
  }); };
  $('#del', body)?.addEventListener('click', () => guard(async () => { if (!confirm('계좌를 삭제할까요? 거래 기록은 남습니다.')) return; await Store.remove('accounts', a.id); closeModal(); refresh(); }));
}
function recForm(r = null) {
  const isNew = !r; r = r || { kind: 'expense', day_of_month: 25, active: true, category: '주거·관리비' };
  const pays = [...D.accounts.filter((a) => a.kind !== 'loan').map((a) => ['a:' + a.id, `🏦 ${a.name}`]), ...D.cards.map((c) => ['c:' + c.id, `💳 ${c.name}`])];
  const body = openModal(isNew ? '고정 항목 추가' : '고정 항목 편집', `
    <form class="form" id="f">
      <div class="two"><label>이름<input name="name" value="${esc(r.name || '')}" required placeholder="예: 관리비" /></label><label>구분<select name="kind" id="rk">${opts([['expense', '지출'], ['income', '수입']], r.kind)}</select></label></div>
      <div class="two"><label>금액<input name="amount" inputmode="numeric" value="${r.amount ? Number(r.amount).toLocaleString('ko-KR') : ''}" required /></label><label>매월 일자<input name="day" type="number" min="1" max="31" value="${r.day_of_month}" required /></label></div>
      <div class="two"><label>카테고리<select name="category" id="rc">${opts(r.kind === 'income' ? INC_CATS : EXP_CATS, r.category)}</select></label><label>계좌 · 카드<select name="pay">${opts(pays, r.card_id ? 'c:' + r.card_id : 'a:' + r.account_id)}</select></label></div>
      <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" name="active" style="width:auto" ${r.active !== false ? 'checked' : ''} /> 사용 중</label>
      <div class="form-actions">${isNew ? '<span></span>' : '<button type="button" class="btn danger" id="del">삭제</button>'}<button class="btn primary">저장</button></div></form>`);
  const f = $('#f', body);
  $('#rk', body).onchange = () => { $('#rc', body).innerHTML = opts(f.kind.value === 'income' ? INC_CATS : EXP_CATS); };
  f.onsubmit = (e) => { e.preventDefault(); guard(async () => {
    const [pt, pid] = f.pay.value.split(':');
    await Store.save('recurring', { ...(isNew ? {} : r), name: f.name.value.trim(), kind: f.kind.value, amount: num(f.amount.value), day_of_month: Number(f.day.value), category: f.category.value, account_id: pt === 'a' ? pid : null, card_id: pt === 'c' && f.kind.value === 'expense' ? pid : null, active: f.active.checked });
    closeModal(); toast('저장했습니다'); refresh();
  }); };
  $('#del', body)?.addEventListener('click', () => guard(async () => { if (!confirm('삭제할까요?')) return; await Store.remove('recurring', r.id); closeModal(); refresh(); }));
}

// ---------- IMPORT (bank xls / xlsx / csv) ----------
const RX = { date: /거래일시|거래일자|거래일|이용일|일자|날짜|date/i, out: /출금|찾으신|지급|이용금액/, in: /입금|맡기신/, memo: /적요|기재내용|내용|메모|거래처|받는분|보낸분|입금자|사용처|가맹점|통장표시/, balance: /잔액/, amount: /금액/ };
const CAT_RX = [[/스타벅스|커피|카페|메가|이디야|투썸|빽다방/, '카페·간식'], [/배달|배민|요기요|쿠팡이츠|식당|마트|이마트|홈플러스|롯데마트|편의점|GS25|CU|세븐/, '식비'], [/주유|택시|카카오T|주차|하이패스|에너지|칼텍스|오일|교통/, '교통'], [/SKT|KT|LG ?U|통신|텔레콤/, '통신'], [/쿠팡|네이버페이|11번가|G마켓|무신사|올리브영|옥션/, '쇼핑'], [/보험|생명|화재|손해/, '보험'], [/국세|지방세|세무서|국고|원천세|부가세/, '세금'], [/관리비|월세|임대료/, '주거·관리비'], [/이자|대출/, '금융비용'], [/병원|약국|의원|치과/, '의료']];
const CARD_PAY_RX = /(현대|삼성|신한|국민|KB|롯데|하나|우리|비씨|BC|NH|농협|씨티)\s?카드|카드\s?(대금|결제대금)/;
function guessCat(memo, kind) {
  if (kind === 'income') return /급여|월급|상여/.test(memo) ? '급여' : /이자|배당/.test(memo) ? '배당·이자' : '기타수입';
  for (const [rx, c] of CAT_RX) if (rx.test(memo)) return c;
  return '기타';
}
function parseDate(v) {
  if (v === '' || v == null) return null;
  if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return { date: toStr(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), ts: v }; }
  const s = String(v).trim(); let m = s.match(/(20\d{2})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/);
  if (!m) { m = s.match(/^(20\d{2})(\d{2})(\d{2})/); if (!m) return null; }
  const z = (n) => String(n).padStart(2, '0');
  return { date: `${m[1]}-${z(m[2])}-${z(m[3])}`, ts: s };
}
function importForm() {
  if (!window.XLSX) return toast('파일 읽기 도구를 불러오지 못했습니다. 인터넷 연결을 확인하세요.');
  const body = openModal('은행 거래내역 가져오기', `
    <div class="form"><label>파일 (xls · xlsx · csv)<input type="file" id="file" accept=".xls,.xlsx,.csv" /></label>
      <label>어느 계좌의 내역인가요?<select id="acct">${opts(D.accounts.filter((a) => a.kind !== 'loan').map((a) => [a.id, a.name]))}</select></label>
      <div id="preview" class="muted small">은행 앱·인터넷뱅킹에서 '거래내역 조회 → 엑셀 저장'한 파일을 그대로 올리면 됩니다.</div></div>`, { wide: true });
  $('#file', body).onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const rows = readRows(buf);
      const hi = rows.slice(0, 40).findIndex((r) => r.some((c) => RX.date.test(String(c))) && r.some((c) => RX.out.test(String(c)) || RX.in.test(String(c)) || RX.amount.test(String(c))));
      if (hi < 0) return ($('#preview', body).innerHTML = '<span class="down">날짜·금액 열을 찾지 못했습니다. 은행에서 받은 원본 파일인지 확인하세요.</span>');
      const head = rows[hi].map((c) => String(c).replace(/\s+/g, ''));
      const find = (rx, not) => head.findIndex((h) => rx.test(h) && !(not && not.test(h)));
      const memo = find(RX.memo);
      const extra = head.map((h, i) => (i !== memo && /추가메모|의뢰인|수취인|받는분|보낸분|거래내용|내통장표시|가맹점|사용처/.test(h) ? i : -1)).filter((i) => i >= 0);
      const col = { date: find(RX.date), out: find(RX.out, /잔액/), in: find(RX.in, /잔액/), memo, extra, balance: find(RX.balance), amount: find(RX.amount, /잔액|입금|출금/) };
      showMapping(body, head, rows.slice(hi + 1), col);
    } catch (err) { $('#preview', body).innerHTML = `<span class="down">파일을 읽지 못했습니다: ${esc(err.message)}</span>`; }
  };
}
// .xls from some banks (e.g. KB) is really an HTML table — read those with DOMParser
function readRows(buf) {
  const peek = new TextDecoder('utf-8').decode(buf.slice(0, 400)).trimStart().toLowerCase();
  if (peek.startsWith('<')) {
    let text = new TextDecoder('utf-8').decode(buf);
    if ((text.match(/�/g) || []).length > 20) text = new TextDecoder('euc-kr').decode(buf);
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return [...doc.querySelectorAll('tr')].map((tr) => [...tr.children].filter((c) => /^(TD|TH)$/.test(c.tagName)).map((td) => {
      td.querySelectorAll('br').forEach((b) => b.replaceWith(' '));
      return td.textContent.replace(/ /g, ' ').trim();
    }));
  }
  const wb = window.XLSX.read(buf, { type: 'array' });
  return window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
}
function showMapping(body, head, data, col) {
  const sel = (k, label) => `<label>${label}<select data-col="${k}"><option value="-1">없음</option>${head.map((h, i) => `<option value="${i}" ${col[k] === i ? 'selected' : ''}>${esc(h || `열 ${i + 1}`)}</option>`).join('')}</select></label>`;
  const box = $('#preview', body);
  box.innerHTML = `${col.extra.length ? `<p class="small muted" style="margin:0 0 8px">내용에 함께 붙이는 열: ${col.extra.map((i) => esc(head[i])).join(', ')}</p>` : ''}<div class="grid g3" style="gap:10px">${sel('date', '날짜')}${sel('out', '출금 금액')}${sel('in', '입금 금액')}${sel('memo', '적요·내용')}${sel('balance', '잔액 (선택)')}${sel('amount', '금액 (입출금 한 열일 때)')}</div><div id="pv" style="margin-top:12px"></div>`;
  const build = () => {
    box.querySelectorAll('[data-col]').forEach((s) => (col[s.dataset.col] = Number(s.value)));
    col.extra = col.extra.filter((i) => i !== col.memo);
    const acct = $('#acct', body).value;
    const exists = new Set(D.transactions.filter((t) => t.account_id === acct).map((t) => `${t.date}|${t.kind}|${Number(t.amount)}|${t.memo || ''}`));
    const items = []; let latest = null, dup = 0;
    for (const r of data) {
      const d = parseDate(r[col.date]); if (!d) continue;
      let inc = col.in >= 0 ? num(r[col.in]) : 0, out = col.out >= 0 ? num(r[col.out]) : 0;
      if (!inc && !out && col.amount >= 0) { const a = num(r[col.amount]); if (a >= 0) inc = a; else out = -a; }
      if (!inc && !out) continue;
      const memo = [...new Set([col.memo, ...col.extra].filter((i) => i >= 0).map((i) => String(r[i] ?? '').trim()).filter(Boolean))].join(' · ');
      const kind = inc > 0 ? 'income' : (CARD_PAY_RX.test(memo) && !/체크/.test(memo) ? 'card_payment' : 'expense');
      const amount = inc > 0 ? inc : out;
      const key = `${d.date}|${kind}|${amount}|${memo}`;
      if (exists.has(key)) { dup++; continue; }
      exists.add(key);
      items.push({ date: d.date, kind, amount, memo, category: kind === 'card_payment' ? '카드대금' : guessCat(memo, kind), account_id: acct, source: 'import', settled: false });
      if (col.balance >= 0 && String(r[col.balance]).trim() !== '') { const b = num(r[col.balance]); if (!latest || String(d.ts) >= String(latest.ts)) latest = { ts: d.ts, balance: b }; }
    }
    const inSum = items.filter((x) => x.kind === 'income').reduce((s, x) => s + x.amount, 0), outSum = items.filter((x) => x.kind !== 'income').reduce((s, x) => s + x.amount, 0);
    $('#pv', body).innerHTML = `<p style="margin:0 0 8px">새 거래 <b class="gold">${items.length}건</b> · 입금 <span class="up">${won(inSum)}</span> · 출금 <span class="down">${won(outSum)}</span>${dup ? ` · 이미 있는 ${dup}건 제외` : ''}${latest ? ` · 최근 잔액 <b>${won(latest.balance)}</b>으로 계좌 잔액 갱신` : ''}</p>
      <div class="scroll-x"><table class="tbl"><thead><tr><th>날짜</th><th>구분</th><th>카테고리</th><th>내용</th><th class="r">금액</th></tr></thead><tbody>${items.slice(0, 8).map((x) => `<tr><td>${x.date}</td><td>${{ income: '입금', expense: '출금', card_payment: '카드대금' }[x.kind]}</td><td>${esc(x.category)}</td><td>${esc(x.memo)}</td><td class="r num">${won(x.amount)}</td></tr>`).join('')}</tbody></table></div>
      ${items.length > 8 ? `<p class="muted small">외 ${items.length - 8}건</p>` : ''}
      <div class="form-actions"><span class="muted small">카드대금 출금은 지출 통계에서 빠집니다 (카드 사용분과 이중 집계 방지)</span><button class="btn primary" id="go" ${items.length ? '' : 'disabled'}>${items.length}건 가져오기</button></div>`;
    $('#go', body).onclick = () => guard(async () => {
      await Store.saveMany('transactions', items);
      if (latest) { const a = D.accounts.find((x) => x.id === acct); await Store.save('accounts', { ...a, balance: latest.balance }); }
      closeModal(); toast(`${items.length}건을 가져왔습니다`); S.month = items.map((x) => x.date).sort().pop().slice(0, 7); go('flow');
    });
  };
  box.querySelectorAll('[data-col]').forEach((s) => (s.onchange = build)); $('#acct', body).onchange = build; build();
}

// ---------- boot ----------
async function start() {
  await Store.loadAll();
  if (!Store.cloud && !D.accounts.length && !localStorage.getItem('ma:v1:seeded')) {
    const demo = demoData();
    for (const [t, rows] of Object.entries(demo)) await Store.saveMany(t, rows);
    await Store.saveMany('snapshots', demoSnapshots(totals(D).netWorth));
    localStorage.setItem('ma:v1:seeded', 'demo');
  }
  if (!Store.cloud && localStorage.getItem('ma:v1:seeded') === 'demo') $('#demo-badge').classList.remove('hidden');
  $('#mode-label').textContent = Store.cloud ? '동기화 사용 중' : '데모 모드 · 이 기기 저장';
  $('#boot').classList.add('hidden'); $('#auth').classList.add('hidden'); $('#app').classList.remove('hidden');
  buildNav();
  const h = location.hash.slice(1); if (NAV.some((n) => n.id === h)) S.view = h;
  render(); scheduleSnapshot();
}
async function boot() {
  chartDefaults();
  $('#modal-close').onclick = closeModal; $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  $('#quick-add').onclick = () => txForm();
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h !== S.view && NAV.some((n) => n.id === h)) { S.view = h; render(); } });
  try {
    const session = await Store.session();
    if (session) return await start();
  } catch (e) { console.error(e); }
  $('#boot').classList.add('hidden'); $('#auth').classList.remove('hidden');
  let signup = false;
  $('#auth-signup').onclick = () => { signup = !signup; $('#auth-form button[type=submit]').textContent = signup ? '계정 만들기' : '로그인'; $('#auth-signup').textContent = signup ? '이미 계정이 있어요' : '처음이면 계정 만들기'; };
  $('#auth-form').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; $('#auth-msg').textContent = '확인 중…';
    const { error, data } = signup ? await Store.signUp(f.email.value, f.password.value) : await Store.signIn(f.email.value, f.password.value);
    if (error) {
      const m = /not confirmed/i.test(error.message) ? '메일 인증이 아직 안 됐습니다. 인증 메일을 다시 보냈으니 링크를 눌러 주세요.'
        : /invalid login/i.test(error.message) ? '이메일 또는 비밀번호가 맞지 않습니다.'
        : /already registered/i.test(error.message) ? '이미 가입된 이메일입니다. 로그인해 주세요.' : error.message;
      $('#auth-msg').textContent = m;
      if (/not confirmed/i.test(error.message)) Store.resend(f.email.value);
      return;
    }
    if (signup && !data.session) { $('#auth-msg').textContent = '확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인하세요.'; return; }
    try { await start(); } catch (err) { $('#auth-msg').textContent = '데이터를 불러오지 못했습니다: ' + err.message; }
  };
}
boot();
