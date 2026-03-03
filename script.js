// ===== Helpers =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const money = (n) => `$${n.toFixed(2)}`;

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function toISODate(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

// ===== State =====
const THEME_KEY = "novadash_theme";
const COLLAPSE_KEY = "novadash_collapse";
let rangeDays = 7;
let statusFilter = "all";
let searchTerm = "";
let sortMode = "date_desc"; // date_desc | date_asc | amount_desc | amount_asc

// Demo transactions
const NAMES = ["Sarah Khan","Omar Ali","Liam Smith","Noah Brown","Amelia Jones","Maya Patel","Hassan Ahmed","Chloe White"];
const ITEMS = ["Starter Plan","Pro Plan","Team Plan","Consultation","Website Package","Add-ons","Maintenance","Hosting"];

const now = new Date();
let txns = Array.from({length: 26}).map((_, i) => {
  const daysAgo = Math.floor(Math.random() * 60);
  const d = new Date(now);
  d.setDate(now.getDate() - daysAgo);
  const statusRand = Math.random();
  const status = statusRand < 0.72 ? "paid" : statusRand < 0.9 ? "pending" : "failed";
  const amount = Number((Math.random()*220 + 19).toFixed(2));
  return {
    id: `TX-${String(10240 + i)}`,
    date: toISODate(d),
    customer: NAMES[Math.floor(Math.random()*NAMES.length)],
    item: ITEMS[Math.floor(Math.random()*ITEMS.length)],
    status,
    amount
  };
});

// ===== Elements =====
const app = $(".app");
const sidebar = $("#sidebar");
const collapseBtn = $("#collapseBtn");
const mobileMenuBtn = $("#mobileMenuBtn");

const themeToggle = $("#themeToggle");
const searchInput = $("#searchInput");
const statusSelect = $("#statusFilter");
const exportBtn = $("#exportBtn");

const segBtns = $$(".seg__btn");
const rangeLabel = $("#rangeLabel");

const kpiRevenue = $("#kpiRevenue");
const kpiOrders = $("#kpiOrders");
const kpiCustomers = $("#kpiCustomers");
const kpiRefunds = $("#kpiRefunds");
const revDelta = $("#revDelta");
const ordDelta = $("#ordDelta");
const cusDelta = $("#cusDelta");
const refDelta = $("#refDelta");

const barsWrap = $("#bars");
const peakDay = $("#peakDay");
const avgRev = $("#avgRev");

const donut = $("#donut");
const paidPct = $("#paidPct");
const pendingPct = $("#pendingPct");
const failedPct = $("#failedPct");
const txnCount = $("#txnCount");

const tbody = $("#tbody");
const sortAmountBtn = $("#sortAmountBtn");
const sortDateBtn = $("#sortDateBtn");

const addTxnBtn = $("#addTxnBtn");

// Modal (details)
const modal = $("#modal");
const modalClose = $("#modalClose");
const mTitle = $("#mTitle");
const mStatus = $("#mStatus");
const mCustomer = $("#mCustomer");
const mItem = $("#mItem");
const mDate = $("#mDate");
const mAmount = $("#mAmount");
const markPaidBtn = $("#markPaidBtn");
const deleteBtn = $("#deleteBtn");
let activeTxnId = null;

// Add modal
const addModal = $("#addModal");
const addClose = $("#addClose");
const addForm = $("#addForm");
const addNote = $("#addNote");

// Progress
const progressBar = $("#progressBar");

// ===== Theme =====
function setTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  const icon = themeToggle?.querySelector(".icon");
  if (icon) icon.textContent = theme === "light" ? "☀" : "☾";
}
const savedTheme = localStorage.getItem(THEME_KEY);
setTheme(savedTheme === "light" ? "light" : "dark");

themeToggle?.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  setTheme(cur === "dark" ? "light" : "dark");
});

// ===== Sidebar collapse + mobile =====
function setCollapsed(isCollapsed){
  app.classList.toggle("is-collapsed", isCollapsed);
  localStorage.setItem(COLLAPSE_KEY, isCollapsed ? "1" : "0");
}
setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");

collapseBtn?.addEventListener("click", () => {
  setCollapsed(!app.classList.contains("is-collapsed"));
});

mobileMenuBtn?.addEventListener("click", () => {
  sidebar.classList.toggle("is-open");
});
document.addEventListener("click", (e) => {
  if (window.matchMedia("(max-width: 860px)").matches) {
    const inside = sidebar.contains(e.target) || mobileMenuBtn.contains(e.target);
    if (!inside) sidebar.classList.remove("is-open");
  }
});

// ===== Navigation demo =====
$$(".nav__item").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".nav__item").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    // demo: just close menu on mobile
    sidebar.classList.remove("is-open");
  });
});

// ===== Filters =====
segBtns.forEach(b => {
  b.addEventListener("click", () => {
    segBtns.forEach(x => { x.classList.remove("is-active"); x.setAttribute("aria-selected","false"); });
    b.classList.add("is-active");
    b.setAttribute("aria-selected","true");
    rangeDays = Number(b.dataset.range || "7");
    rangeLabel.textContent = String(rangeDays);
    renderAll();
  });
});

statusSelect?.addEventListener("change", () => {
  statusFilter = statusSelect.value;
  renderAll();
});

searchInput?.addEventListener("input", () => {
  searchTerm = (searchInput.value || "").trim().toLowerCase();
  renderTable();
});

// ===== Sorting =====
sortAmountBtn?.addEventListener("click", () => {
  sortMode = sortMode === "amount_desc" ? "amount_asc" : "amount_desc";
  renderTable();
});
sortDateBtn?.addEventListener("click", () => {
  sortMode = sortMode === "date_desc" ? "date_asc" : "date_desc";
  renderTable();
});

// ===== Data derivations =====
function withinRange(dateISO){
  const d = new Date(dateISO);
  const start = new Date();
  start.setDate(now.getDate() - (rangeDays - 1));
  start.setHours(0,0,0,0);
  return d >= start;
}

function filteredTxns(){
  let rows = txns.filter(t => withinRange(t.date));
  if (statusFilter !== "all") rows = rows.filter(t => t.status === statusFilter);
  if (searchTerm){
    rows = rows.filter(t =>
      t.id.toLowerCase().includes(searchTerm) ||
      t.customer.toLowerCase().includes(searchTerm) ||
      t.item.toLowerCase().includes(searchTerm) ||
      t.status.toLowerCase().includes(searchTerm)
    );
  }
  return rows;
}

function applySort(rows){
  const copy = [...rows];
  if (sortMode === "date_desc") copy.sort((a,b)=> b.date.localeCompare(a.date));
  if (sortMode === "date_asc") copy.sort((a,b)=> a.date.localeCompare(b.date));
  if (sortMode === "amount_desc") copy.sort((a,b)=> b.amount - a.amount);
  if (sortMode === "amount_asc") copy.sort((a,b)=> a.amount - b.amount);
  return copy;
}

// ===== KPIs =====
function calcKPIs(rows){
  const revenue = rows.filter(r => r.status === "paid").reduce((s,r)=> s+r.amount, 0);
  const orders = rows.length;
  const customers = new Set(rows.map(r => r.customer)).size;
  const refunds = rows.filter(r => r.status === "failed").reduce((s,r)=> s + (r.amount * 0.25), 0); // demo proxy
  return { revenue, orders, customers, refunds };
}

function calcDelta(current, previous){
  if (previous <= 0 && current <= 0) return 0;
  if (previous <= 0) return 100;
  return ((current - previous) / previous) * 100;
}

function kpiRender(){
  const rows = filteredTxns();
  const k = calcKPIs(rows);

  // previous period (same size)
  const prevStart = new Date();
  prevStart.setDate(now.getDate() - (rangeDays * 2 - 1));
  prevStart.setHours(0,0,0,0);
  const prevEnd = new Date();
  prevEnd.setDate(now.getDate() - rangeDays);
  prevEnd.setHours(23,59,59,999);

  let prev = txns.filter(t => {
    const d = new Date(t.date);
    return d >= prevStart && d <= prevEnd;
  });
  if (statusFilter !== "all") prev = prev.filter(t => t.status === statusFilter);

  const pk = calcKPIs(prev);

  const rd = clamp(calcDelta(k.revenue, pk.revenue), -999, 999);
  const od = clamp(calcDelta(k.orders, pk.orders), -999, 999);
  const cd = clamp(calcDelta(k.customers, pk.customers), -999, 999);
  const fd = clamp(calcDelta(k.refunds, pk.refunds), -999, 999);

  kpiRevenue.textContent = money(k.revenue);
  kpiOrders.textContent = String(k.orders);
  kpiCustomers.textContent = String(k.customers);
  kpiRefunds.textContent = money(k.refunds);

  revDelta.textContent = `${rd >= 0 ? "+" : ""}${rd.toFixed(0)}%`;
  ordDelta.textContent = `${od >= 0 ? "+" : ""}${od.toFixed(0)}%`;
  cusDelta.textContent = `${cd >= 0 ? "+" : ""}${cd.toFixed(0)}%`;
  refDelta.textContent = `${fd >= 0 ? "+" : ""}${fd.toFixed(0)}%`;
}

// ===== Bars chart (daily paid revenue) =====
function renderBars(){
  const rows = filteredTxns().filter(r => r.status === "paid");
  // bucket per day in range
  const buckets = Array.from({length: rangeDays}).map((_, i) => {
    const d = new Date();
    d.setDate(now.getDate() - (rangeDays - 1 - i));
    const key = toISODate(d);
    return { key, value: 0 };
  });

  const map = new Map(buckets.map(b => [b.key, b]));
  rows.forEach(r => {
    const b = map.get(r.date);
    if (b) b.value += r.amount;
  });

  const max = Math.max(1, ...buckets.map(b => b.value));
  const avg = buckets.reduce((s,b)=> s+b.value, 0) / buckets.length;

  // peak
  let peak = buckets[0];
  buckets.forEach(b => { if (b.value > peak.value) peak = b; });

  barsWrap.innerHTML = buckets.map(b => {
    const h = (b.value / max) * 100;
    const tip = `${b.key} • ${money(b.value)}`;
    return `<div class="bar" style="height:${Math.max(6, h)}%" data-tip="${tip.replace(/"/g,'')}"></div>`;
  }).join("");

  peakDay.textContent = `${peak.key} (${money(peak.value)})`;
  avgRev.textContent = money(avg);
}

// ===== Donut (status %) =====
function renderDonut(){
  const rows = filteredTxns();
  const total = Math.max(1, rows.length);
  const paid = rows.filter(r => r.status === "paid").length;
  const pending = rows.filter(r => r.status === "pending").length;
  const failed = rows.filter(r => r.status === "failed").length;

  const pPaid = (paid/total)*100;
  const pPending = (pending/total)*100;
  const pFailed = 100 - pPaid - pPending;

  donut.style.background = `conic-gradient(
    var(--paid) 0 ${pPaid}%,
    var(--pending) ${pPaid}% ${pPaid + pPending}%,
    var(--failed) ${pPaid + pPending}% 100%
  )`;

  paidPct.textContent = `${pPaid.toFixed(0)}%`;
  pendingPct.textContent = `${pPending.toFixed(0)}%`;
  failedPct.textContent = `${pFailed.toFixed(0)}%`;
  txnCount.textContent = String(rows.length);
}

// ===== Table =====
function statusBadge(status){
  return `<span class="badge ${status}">${status.toUpperCase()}</span>`;
}

function renderTable(){
  let rows = filteredTxns();
  rows = applySort(rows);

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.customer}</td>
      <td>${r.item}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="right">${money(r.amount)}</td>
      <td class="right">
        <button class="link-btn" data-open="${r.id}" type="button">View</button>
      </td>
    </tr>
  `).join("");

  // bind view buttons
  $$("[data-open]", tbody).forEach(btn => {
    btn.addEventListener("click", () => openModal(btn.dataset.open));
  });
}

// ===== Details modal =====
function openModal(id){
  const t = txns.find(x => x.id === id);
  if (!t) return;

  activeTxnId = id;
  mTitle.textContent = t.id;
  mCustomer.textContent = t.customer;
  mItem.textContent = t.item;
  mDate.textContent = t.date;
  mAmount.textContent = money(t.amount);

  mStatus.className = "pill";
  mStatus.classList.add(t.status === "paid" ? "up" : t.status === "failed" ? "down" : "");
  mStatus.textContent = t.status.toUpperCase();

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}

function closeModal(){
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
  activeTxnId = null;
}

modalClose?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

markPaidBtn?.addEventListener("click", () => {
  if (!activeTxnId) return;
  const t = txns.find(x => x.id === activeTxnId);
  if (!t) return;
  t.status = "paid";
  closeModal();
  renderAll();
});

deleteBtn?.addEventListener("click", () => {
  if (!activeTxnId) return;
  txns = txns.filter(x => x.id !== activeTxnId);
  closeModal();
  renderAll();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modal.classList.contains("is-open")) closeModal();
    if (addModal.classList.contains("is-open")) closeAdd();
    sidebar.classList.remove("is-open");
  }
});

// ===== Add transaction modal =====
function openAdd(){
  addModal.classList.add("is-open");
  addModal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
  addNote.textContent = "";
  addForm.reset();
  // clear errors
  $$("input", addForm).forEach(i => i.classList.remove("bad"));
  $$(".err", addForm).forEach(e => e.textContent = "");
}

function closeAdd(){
  addModal.classList.remove("is-open");
  addModal.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

addTxnBtn?.addEventListener("click", openAdd);
addClose?.addEventListener("click", closeAdd);
addModal?.addEventListener("click", (e) => { if (e.target === addModal) closeAdd(); });

function setErr(input, msg){
  input.classList.add("bad");
  const err = input.closest("label")?.querySelector(".err");
  if (err) err.textContent = msg || "";
}
function clearErr(input){
  input.classList.remove("bad");
  const err = input.closest("label")?.querySelector(".err");
  if (err) err.textContent = "";
}

addForm?.addEventListener("input", (e) => {
  const el = e.target;
  if (el.matches("input")) clearErr(el);
  addNote.textContent = "";
});

addForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  addNote.textContent = "";

  const customer = addForm.elements.customer;
  const item = addForm.elements.item;
  const status = addForm.elements.status;
  const amount = addForm.elements.amount;

  let ok = true;

  if (!customer.value.trim() || customer.value.trim().length < 2){ setErr(customer,"Enter customer name."); ok = false; }
  if (!item.value.trim() || item.value.trim().length < 2){ setErr(item,"Enter item name."); ok = false; }
  const amt = Number(amount.value);
  if (!Number.isFinite(amt) || amt <= 0){ setErr(amount,"Enter valid amount."); ok = false; }

  if (!ok){
    addNote.textContent = "Fix the highlighted fields and try again.";
    return;
  }

  const id = `TX-${Math.floor(10000 + Math.random()*89999)}`;
  txns.unshift({
    id,
    date: toISODate(new Date()),
    customer: customer.value.trim(),
    item: item.value.trim(),
    status: status.value,
    amount: Number(amt.toFixed(2))
  });

  addNote.textContent = "✅ Added. Updating dashboard…";
  closeAdd();
  renderAll();
});

// ===== Export CSV =====
function exportCSV(){
  const rows = applySort(filteredTxns());
  const head = ["id","date","customer","item","status","amount"];
  const lines = [head.join(",")].concat(
    rows.map(r => [
      r.id,
      r.date,
      `"${String(r.customer).replace(/"/g,'""')}"`,
      `"${String(r.item).replace(/"/g,'""')}"`,
      r.status,
      r.amount
    ].join(","))
  );
  const blob = new Blob([lines.join("\n")], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `novadash_${rangeDays}d.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
exportBtn?.addEventListener("click", exportCSV);

// ===== Progress bar =====
function updateProgress(){
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const scrollHeight = (document.documentElement.scrollHeight || document.body.scrollHeight) - document.documentElement.clientHeight;
  const p = scrollHeight ? (scrollTop/scrollHeight)*100 : 0;
  progressBar.style.width = `${p.toFixed(2)}%`;
}
window.addEventListener("scroll", updateProgress);
window.addEventListener("resize", updateProgress);
updateProgress();

// ===== Render all =====
function renderAll(){
  kpiRender();
  renderBars();
  renderDonut();
  renderTable();
}

renderAll();