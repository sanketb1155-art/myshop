// app.js
let workers = [];
let advances = [];
let currentPage = 'dashboard';

async function initApp() {
  auth.onAuthStateChanged(async user => {
    if (!user) {
      await auth.signInAnonymously();
    }
    loadData();
  });
}

async function loadData() {
  try {
    const wSnap = await db.collection("workers").get();
    workers = wSnap.docs.map(doc => ({id: doc.id, ...doc.data()}));

    const aSnap = await db.collection("advances").orderBy("date", "desc").get();
    advances = aSnap.docs.map(doc => ({id: doc.id, ...doc.data()}));

    renderCurrentPage();
  } catch(e) {
    console.error(e);
  }
}

// Real-time updates
function setupRealtime() {
  db.collection("workers").onSnapshot(() => loadData());
  db.collection("advances").onSnapshot(() => loadData());
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.innerHTML = type === 'success' ? 
    `✅ ${msg}` : `❌ ${msg}`;
  toast.style.background = type === 'success' ? '#166534' : '#7f1d1d';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function buttonFeedback(btn) {
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Saving...";
  return () => { btn.disabled = false; btn.textContent = orig; };
}

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
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

// Dashboard
function renderDashboard(container) {
  const totalW = workers.length;
  const totalA = advances.reduce((s, a) => s + Number(a.amount || 0), 0);
  const today = new Date().toISOString().split('T')[0];
  const todayA = advances.filter(a => a.date === today).reduce((s, a) => s + Number(a.amount || 0), 0);

  container.innerHTML = `
    <div class="card">
      <h2 class="text-xl font-bold mb-4">Dashboard</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${totalW}</div><div>Total Workers</div></div>
        <div class="stat-card"><div class="stat-value">₹${todayA}</div><div>Today's Advance</div></div>
        <div class="stat-card"><div class="stat-value">₹${totalA}</div><div>Total Advance</div></div>
      </div>
    </div>
    <div class="card">
      <h3>Recent Advances</h3>
      ${advances.slice(0,6).map(a => {
        const w = workers.find(wk => wk.id === a.workerId);
        return `<div class="flex justify-between py-3 border-b border-gray-700">
          <div><strong>\( {w ? w.name : 'Unknown'}</strong><br><small> \){a.date}</small></div>
          <div class="text-red-400 font-bold">- ₹${a.amount}</div>
        </div>`;
      }).join('') || '<p>No records</p>'}
    </div>
  `;
}

// Workers Page
function renderWorkers(container) {
  container.innerHTML = `
    <div class="card">
      <div class="flex justify-between mb-4">
        <h2 class="text-2xl font-bold">Workers</h2>
        <button onclick="showAddWorkerModal()" class="px-5 py-2 bg-blue-600 rounded-xl">+ Add</button>
      </div>
      <input type="text" id="search" placeholder="Search workers..." onkeyup="filterWorkers()" class="mb-4">
      <div id="workers-list"></div>
    </div>
  `;
  renderWorkersList();
}

function renderWorkersList() {
  const list = document.getElementById('workers-list');
  list.innerHTML = workers.map(w => {
    const totalAdv = advances.filter(a => a.workerId === w.id).reduce((s,a)=>s+Number(a.amount),0);
    return `
      <div class="card cursor-pointer" onclick="viewWorker('${w.id}')">
        <strong>${w.name}</strong><br>
        <small>\( {w.mobile} | Salary: ₹ \){w.salary}</small><br>
        <small class="text-red-400">Advance: ₹${totalAdv}</small>
      </div>`;
  }).join('');
}

function filterWorkers() {
  // Basic filter - can be enhanced
  renderWorkersList();
}

function showAddWorkerModal() {
  document.getElementById('modal-content').innerHTML = `
    <h3 class="text-xl mb-4">Add Worker</h3>
    <input id="wname" placeholder="Name">
    <input id="wmob" placeholder="Mobile">
    <input id="wsal" type="number" placeholder="Monthly Salary">
    <button onclick="saveWorker()">Save Worker</button>
    <button onclick="closeModal()">Cancel</button>
  `;
  document.getElementById('modal').style.display = 'flex';
}

async function saveWorker() {
  const name = document.getElementById('wname').value.trim();
  const mobile = document.getElementById('wmob').value.trim();
  const salary = parseFloat(document.getElementById('wsal').value);

  if (!name || !mobile || !salary) {
    showToast("All fields required", "error");
    return;
  }

  await db.collection("workers").add({ name, mobile, salary, createdAt: new Date().toISOString() });
  showToast("✅ Worker Added");
  closeModal();
}

// Advance Entry
function renderAdvance(container) {
  let opts = workers.map(w => `<option value="\( {w.id}"> \){w.name}</option>`).join('');
  container.innerHTML = `
    <div class="card">
      <h2>New Advance</h2>
      <select id="adv-worker"><option value="">Select Worker</option>${opts}</select>
      <input id="adv-amt" type="number" placeholder="Amount ₹">
      <input id="adv-date" type="date" value="${new Date().toISOString().split('T')[0]}">
      <input id="adv-reason" placeholder="Reason">
      <textarea id="adv-notes" placeholder="Notes"></textarea>
      <button onclick="saveAdvance(this)">Save Advance</button>
    </div>
  `;
}

async function saveAdvance(btn) {
  const reset = buttonFeedback(btn);
  const workerId = document.getElementById('adv-worker').value;
  const amount = parseFloat(document.getElementById('adv-amt').value);
  const date = document.getElementById('adv-date').value;
  const reason = document.getElementById('adv-reason').value;

  if (!workerId || !amount || !date || !reason) {
    showToast("Fill all fields", "error");
    reset();
    return;
  }

  await db.collection("advances").add({
    workerId, amount, date, reason,
    notes: document.getElementById('adv-notes').value || "",
    timestamp: new Date().toISOString()
  });

  showToast("✅ Advance Saved");
  reset();
  navigateTo('dashboard');
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// Records
function renderRecords(container) {
  container.innerHTML = `<div class="card"><h2>All Records</h2><div id="records-list"></div></div>`;
  const list = document.getElementById('records-list');
  list.innerHTML = advances.map(a => {
    const w = workers.find(wk => wk.id === a.workerId);
    return `<div class="card">
      <strong>\( {w ? w.name : ''}</strong> - ₹ \){a.amount} on ${a.date}<br>
      <small>${a.reason}</small>
    </div>`;
  }).join('');
}

// Reports
function renderReports(container) {
  container.innerHTML = `
    <div class="card">
      <h2>Reports</h2>
      <button onclick="exportJSON()" class="mb-3">Export JSON</button>
      <button onclick="exportCSV()">Export CSV</button>
    </div>
  `;
}

function exportJSON() {
  const dataStr = JSON.stringify({workers, advances}, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = 'contractor_backup.json';
  link.click();
  showToast("JSON Exported");
}

function exportCSV() {
  let csv = "Date,Worker,Amount,Reason\n";
  advances.forEach(a => {
    const w = workers.find(wk => wk.id === a.workerId);
    csv += `\( {a.date}, \){w ? w.name : ''},\( {a.amount}, \){a.reason}\n`;
  });
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'advances.csv';
  a.click();
  showToast("CSV Exported");
}

// Worker View (Basic)
async function viewWorker(id) {
  // You can expand this
  showToast("Worker Profile - Full view in next update");
}

// Start
window.onload = () => {
  initApp();
  setupRealtime();
};