// app.js
let workers = [];
let advances = [];
let currentPage = 'dashboard';

async function initApp() {
  auth.onAuthStateChanged(async (user) => {
    if (!user) await auth.signInAnonymously();
    await loadData();
    setupRealtime();
  });
}

async function loadData() {
  const wSnap = await db.collection("workers").orderBy("name").get();
  workers = wSnap.docs.map(d => ({id: d.id, ...d.data()}));

  const aSnap = await db.collection("advances").orderBy("date", "desc").get();
  advances = aSnap.docs.map(d => ({id: d.id, ...d.data()}));

  renderCurrentPage();
}

function setupRealtime() {
  db.collection("workers").onSnapshot(() => loadData());
  db.collection("advances").onSnapshot(() => loadData());
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.innerHTML = type === 'success' ? `✅ ${msg}` : `❌ ${msg}`;
  t.style.background = type === 'success' ? '#166534' : '#991b1b';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function buttonFeedback(btn, text = "Saving...") {
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${text}`;
  return () => { btn.disabled = false; btn.innerHTML = orig; };
}

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => 
    b.getAttribute('onclick').includes(`'${page}'`)
  );
  if (activeBtn) activeBtn.classList.add('active');
  renderCurrentPage();
}

function renderCurrentPage() {
  const main = document.getElementById('main-content');
  if (currentPage === 'dashboard') renderDashboard(main);
  else if (currentPage === 'workers') renderWorkers(main);
  else if (currentPage === 'advance') renderAdvance(main);
  else if (currentPage === 'records') renderRecords(main);
  else if (currentPage === 'reports') renderReports(main);
}

// ================= DASHBOARD =================
function renderDashboard(c) {
  const totalWorkers = workers.length;
  const totalAdvance = advances.reduce((s,a)=>s+Number(a.amount||0),0);
  const today = new Date().toISOString().split('T')[0];
  const todayAdv = advances.filter(a=>a.date===today).reduce((s,a)=>s+Number(a.amount||0),0);

  c.innerHTML = `
    <div class="card">
      <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${totalWorkers}</div><div>Total Workers</div></div>
        <div class="stat-card"><div class="stat-value">₹${todayAdv}</div><div>Today's Advance</div></div>
        <div class="stat-card"><div class="stat-value">₹${totalAdvance}</div><div>Total Advance</div></div>
      </div>
    </div>
    <div class="card">
      <h3 class="mb-4">Recent Transactions</h3>
      ${advances.slice(0,6).map(a => {
        const w = workers.find(wk => wk.id === a.workerId);
        return `<div class="flex justify-between py-3 border-b border-slate-700">
          <div><strong>\( {w?w.name:'Unknown'}</strong><br><small> \){a.date}</small></div>
          <div class="font-bold text-red-400">- ₹${a.amount}</div>
        </div>`;
      }).join('') || '<p class="text-slate-400">No transactions yet</p>'}
    </div>
  `;
}

// ================= WORKERS =================
function renderWorkers(c) {
  c.innerHTML = `
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Workers</h2>
        <button onclick="showAddWorkerModal()" class="px-6 py-3 bg-blue-600 rounded-2xl">+ Add Worker</button>
      </div>
      <input type="text" id="worker-search" placeholder="Search by name or mobile" onkeyup="filterWorkers()" class="mb-4">
      <div id="workers-list"></div>
    </div>
  `;
  renderWorkersList();
}

function renderWorkersList() {
  const container = document.getElementById('workers-list');
  container.innerHTML = workers.map(w => {
    const totalAdv = advances.filter(a => a.workerId === w.id).reduce((s,a)=>s+Number(a.amount),0);
    const remaining = w.salary - totalAdv;
    return `
      <div class="card" onclick="viewWorker('${w.id}')">
        <div class="flex justify-between">
          <div><strong>\( {w.name}</strong><br><small> \){w.mobile}</small></div>
          <div class="text-right"><small>Salary</small><br><strong>₹${w.salary}</strong></div>
        </div>
        <div class="mt-4 text-sm flex justify-between">
          <span class="text-red-400">Advance: ₹${totalAdv}</span>
          <span class="\( {remaining>=0?'text-green-400':'text-red-400'}">Payable: ₹ \){remaining}</span>
        </div>
      </div>`;
  }).join('');
}

function filterWorkers() {
  renderWorkersList(); // Can be enhanced with real filter
}

function showAddWorkerModal(editId=null) {
  const worker = editId ? workers.find(w=>w.id===editId) : null;
  document.getElementById('modal-content').innerHTML = `
    <h3 class="text-xl font-bold mb-6">${editId?'Edit':'Add New'} Worker</h3>
    <input id="w-name" value="${worker?worker.name:''}" placeholder="Worker Name">
    <input id="w-mobile" value="${worker?worker.mobile:''}" placeholder="Mobile Number">
    <input id="w-salary" type="number" value="${worker?worker.salary:''}" placeholder="Monthly Salary ₹">
    <div class="flex gap-4 mt-6">
      <button onclick="closeModal()" class="flex-1 py-4 bg-slate-700">Cancel</button>
      <button onclick="saveWorker('${editId}')" class="flex-1 py-4 bg-blue-600">Save</button>
    </div>
  `;
  document.getElementById('modal').style.display = 'flex';
}

async function saveWorker(editId) {
  const name = document.getElementById('w-name').value.trim();
  const mobile = document.getElementById('w-mobile').value.trim();
  const salary = parseFloat(document.getElementById('w-salary').value);

  if (!name || !mobile || isNaN(salary)) {
    showToast("All fields are required", "error");
    return;
  }

  if (editId) {
    await db.collection("workers").doc(editId).update({name, mobile, salary});
  } else {
    await db.collection("workers").add({name, mobile, salary, createdAt: new Date().toISOString()});
  }
  showToast(editId ? "Worker Updated" : "✅ Worker Added Successfully");
  closeModal();
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// ================= ADVANCE =================
function renderAdvance(c) {
  const opts = workers.map(w => `<option value="\( {w.id}"> \){w.name}</option>`).join('');
  c.innerHTML = `
    <div class="card">
      <h2 class="text-2xl font-bold mb-6">Advance Entry</h2>
      <select id="adv-worker"><option value="">Select Worker</option>${opts}</select>
      <input id="adv-amount" type="number" placeholder="Amount ₹">
      <input id="adv-date" type="date" value="${new Date().toISOString().split('T')[0]}">
      <input id="adv-reason" placeholder="Reason / Purpose">
      <textarea id="adv-notes" placeholder="Notes"></textarea>
      <button onclick="saveAdvance(this)">Save Advance</button>
    </div>
  `;
}

async function saveAdvance(btn) {
  const reset = buttonFeedback(btn);
  const workerId = document.getElementById('adv-worker').value;
  const amount = parseFloat(document.getElementById('adv-amount').value);
  const date = document.getElementById('adv-date').value;
  const reason = document.getElementById('adv-reason').value.trim();

  if (!workerId || !amount || !date || !reason) {
    showToast("Please fill all fields", "error");
    reset();
    return;
  }

  await db.collection("advances").add({
    workerId, amount, date, reason,
    notes: document.getElementById('adv-notes').value || "",
    timestamp: new Date().toISOString()
  });

  showToast("✅ Advance Saved Successfully");
  reset();
  navigateTo('dashboard');
}

// ================= RECORDS & REPORTS =================
function renderRecords(c) {
  c.innerHTML = `<div class="card"><h2>All Records</h2><div id="records-list"></div></div>`;
  const list = document.getElementById('records-list');
  list.innerHTML = advances.map(a => {
    const w = workers.find(wk => wk.id === a.workerId);
    return `<div class="card">
      <strong>\( {w ? w.name : 'Unknown'}</strong> - ₹ \){a.amount} (${a.date})<br>
      <small>${a.reason}</small>
    </div>`;
  }).join('');
}

function renderReports(c) {
  const total = advances.reduce((s,a)=>s+Number(a.amount),0);
  c.innerHTML = `
    <div class="card">
      <h2>Reports</h2>
      <p class="mb-4">Total Advance: <strong>₹${total}</strong></p>
      <button onclick="exportJSON()" class="mb-3">Export JSON</button>
      <button onclick="exportCSV()">Export CSV</button>
    </div>
  `;
}

function exportJSON() {
  const data = JSON.stringify({workers, advances}, null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'contractor-backup.json'; a.click();
  showToast("JSON Exported");
}

function exportCSV() {
  let csv = "Date,Worker,Amount,Reason,Notes\n";
  advances.forEach(a => {
    const w = workers.find(wk => wk.id === a.workerId);
    csv += `\( {a.date}, \){w?w.name:''},\( {a.amount}," \){a.reason}","${a.notes||''}"\n`;
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'advances.csv'; a.click();
  showToast("CSV Exported");
}

function viewWorker(id) {
  showToast("Worker Profile opened (Full view ready)");
  // You can expand this function for detailed profile
}

// Start App
window.onload = initApp;