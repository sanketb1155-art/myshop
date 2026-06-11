import { db } from './firebase.js';
import {
  collection, addDoc, getDocs, query, orderBy, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ---------- GLOBAL STATE ----------
let currentPage = 'dashboard';
let workersCache = [];
let advancesCache = [];
let attendanceCache = [];

// ---------- TOAST ----------
function showToast(text, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  toast.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ---------- DATA LOADERS ----------
async function loadWorkers() {
  const q = query(collection(db, "workers"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  workersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return workersCache;
}

async function loadAdvances() {
  const q = query(collection(db, "advances"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  advancesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return advancesCache;
}

async function loadAttendance() {
  const q = query(collection(db, "attendance"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  attendanceCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return attendanceCache;
}

// ---------- NAVIGATION ----------
function updateNav() {
  const nav = document.getElementById('bottomNav');
  if (!nav) return;
  const items = [
    { page: 'dashboard', icon: 'fa-home', label: 'Dashboard' },
    { page: 'workers', icon: 'fa-users', label: 'Workers' },
    { page: 'advance', icon: 'fa-coins', label: 'Advance' },
    { page: 'attendance', icon: 'fa-calendar-check', label: 'Attendance' },
    { page: 'records', icon: 'fa-folder-open', label: 'Records' },
    { page: 'reports', icon: 'fa-chart-bar', label: 'Reports' },
    { page: 'settings', icon: 'fa-cog', label: 'Settings' }
  ];
  nav.innerHTML = items.map(i => `
    <div class="nav-item ${currentPage === i.page ? 'active' : ''}" data-page="${i.page}">
      <i class="fas ${i.icon}"></i><span>${i.label}</span>
    </div>`).join('');

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      const page = el.dataset.page;
      if (page) renderPage(page);
    });
  });
}

// ---------- PAGE RENDERERS ----------
async function renderPage(page) {
  currentPage = page;
  const content = document.getElementById('mainContent');
  if (!content) return;
  await loadWorkers();
  await loadAdvances();
  await loadAttendance();

  switch (page) {
    case 'dashboard': renderDashboard(content); break;
    case 'workers': renderWorkers(content); break;
    case 'advance': renderAdvance(content); break;
    case 'attendance': renderAttendance(content); break;
    case 'records': renderRecords(content); break;
    case 'reports': renderReports(content); break;
    case 'settings': renderSettings(content); break;
  }
  updateNav();
}

function renderDashboard(container) {
  const totalWorkers = workersCache.length;
  const activeWorkers = workersCache.filter(w => w.status === 'Active').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAdvances = advancesCache.filter(a => a.date === todayStr).reduce((s, a) => s + Number(a.amount), 0);

  const now = new Date();
  const monthlyAdvances = advancesCache.filter(a => {
    const d = new Date(a.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, a) => s + Number(a.amount), 0);

  const totalAdvance = advancesCache.reduce((s, a) => s + Number(a.amount), 0);

  container.innerHTML = `
    <h2 style="color:white; margin-bottom:12px;"><i class="fas fa-tachometer-alt"></i> Dashboard</h2>
    <div class="glass-card" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div><span style="color:#aaa;">Total Workers</span><h3>${totalWorkers}</h3></div>
      <div><span style="color:#aaa;">Active</span><h3>${activeWorkers}</h3></div>
      <div><span style="color:#aaa;">Today Advance</span><h3>₹${todayAdvances}</h3></div>
      <div><span style="color:#aaa;">Month Advance</span><h3>₹${monthlyAdvances}</h3></div>
    </div>
    <div class="glass-card">Total Advance: <strong>₹${totalAdvance}</strong> | Transactions: ${advancesCache.length}</div>
    <button class="btn btn-primary" id="quickAddWorker"><i class="fas fa-plus"></i> Add Worker</button>
  `;
  document.getElementById('quickAddWorker')?.addEventListener('click', () => renderPage('workers'));
}

function renderWorkers(container) {
  container.innerHTML = `
    <h2 style="color:white;">👷 Workers</h2>
    <button class="btn btn-primary" id="addWorkerBtn"><i class="fas fa-plus"></i> Add Worker</button>
    <div style="margin-top:12px;" id="workerList">
      ${workersCache.map(w => `
        <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center;">
          <div><strong>${w.name}</strong><br><small>${w.trade || ''}</small></div>
          <span class="badge">${w.status || 'Active'}</span>
        </div>`).join('')}
    </div>
  `;
  document.getElementById('addWorkerBtn')?.addEventListener('click', () => showWorkerModal());
}

function showWorkerModal(worker = null) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3 style="color:white;">${worker ? 'Edit' : 'Add'} Worker</h3>
      <input id="wName" placeholder="Full Name" value="${worker?.name || ''}">
      <input id="wMobile" placeholder="Mobile Number" value="${worker?.mobile || ''}">
      <input id="wTrade" placeholder="Trade (Mason, Painter...)" value="${worker?.trade || ''}">
      <select id="wStatus">
        <option ${worker?.status === 'Active' ? 'selected' : ''}>Active</option>
        <option ${worker?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
      </select>
      <div style="display:flex; gap:10px; margin-top:12px;">
        <button class="btn btn-primary" id="saveWorkerBtn">Save</button>
        <button class="btn" id="closeModalBtn">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('closeModalBtn').onclick = () => modal.remove();
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  document.getElementById('saveWorkerBtn').onclick = async () => {
    const btn = document.getElementById('saveWorkerBtn');
    btn.disabled = true;
    btn.innerHTML = 'Saving...';
    const data = {
      name: document.getElementById('wName').value,
      mobile: document.getElementById('wMobile').value,
      trade: document.getElementById('wTrade').value,
      status: document.getElementById('wStatus').value,
      createdAt: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, "workers"), data);
      showToast('Worker Added Successfully', 'success');
      modal.remove();
      renderPage('workers');
    } catch (e) {
      showToast('Error saving worker', 'error');
      btn.disabled = false;
      btn.innerHTML = 'Save';
    }
  };
}

function renderAdvance(container) {
  container.innerHTML = `
    <h2 style="color:white;">💰 Advance</h2>
    <button class="btn btn-primary" id="addAdvanceBtn"><i class="fas fa-plus"></i> New Advance</button>
    <div style="margin-top:12px;" id="advanceList">
      ${advancesCache.slice(0, 20).map(a => `
        <div class="glass-card">
          <strong>₹${a.amount}</strong> - ${a.reason || 'No reason'}<br>
          <small>${a.date} | Worker: ${workersCache.find(w=>w.id===a.workerId)?.name || 'Unknown'}</small>
        </div>`).join('')}
    </div>
  `;

  document.getElementById('addAdvanceBtn')?.addEventListener('click', () => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Advance Entry</h3>
        <select id="advWorker">${workersCache.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}</select>
        <input id="advAmount" type="number" placeholder="Amount (₹)">
        <input id="advReason" placeholder="Reason">
        <input id="advDate" type="date" value="${new Date().toISOString().split('T')[0]}">
        <div style="display:flex; gap:10px; margin-top:12px;">
          <button class="btn btn-primary" id="saveAdvanceBtn">Save</button>
          <button class="btn" id="closeAdvModal">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('closeAdvModal').onclick = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    document.getElementById('saveAdvanceBtn').onclick = async () => {
      const btn = document.getElementById('saveAdvanceBtn');
      btn.disabled = true; btn.innerHTML = 'Saving...';
      await addDoc(collection(db, "advances"), {
        workerId: document.getElementById('advWorker').value,
        amount: document.getElementById('advAmount').value,
        reason: document.getElementById('advReason').value,
        date: document.getElementById('advDate').value,
        createdAt: new Date().toISOString()
      });
      showToast('Advance Saved', 'success');
      modal.remove();
      renderPage('advance');
    };
  });
}

function renderAttendance(container) {
  const today = new Date().toISOString().split('T')[0];
  container.innerHTML = `
    <h2>📅 Attendance (${today})</h2>
    <div id="attendanceList">
      ${workersCache.map(w => `
        <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center;">
          <span>${w.name}</span>
          <select class="attStatus" data-worker-id="${w.id}">
            <option>Present</option>
            <option>Absent</option>
            <option>Half Day</option>
          </select>
        </div>`).join('')}
    </div>
    <button class="btn btn-primary" id="saveAttBtn" style="margin-top:12px;">Save Attendance</button>
  `;

  document.getElementById('saveAttBtn')?.addEventListener('click', async () => {
    const selects = document.querySelectorAll('.attStatus');
    const btn = document.getElementById('saveAttBtn');
    btn.disabled = true; btn.innerHTML = 'Saving...';
    for (let sel of selects) {
      await addDoc(collection(db, "attendance"), {
        workerId: sel.dataset.workerId,
        status: sel.value,
        date: today
      });
    }
    showToast('Attendance Updated', 'success');
    btn.disabled = false; btn.innerHTML = 'Save Attendance';
    renderPage('attendance');
  });
}

function renderRecords(container) {
  container.innerHTML = `
    <h2>📚 Records</h2>
    <input type="text" id="recordSearch" placeholder="Search by name, reason, amount...">
    <div id="recordResults" style="margin-top:12px;">
      ${advancesCache.map(a => {
        const worker = workersCache.find(w => w.id === a.workerId);
        return `<div class="glass-card">₹${a.amount} - ${a.reason} (${a.date}) - ${worker?.name || ''}</div>`;
      }).join('')}
    </div>
  `;
  document.getElementById('recordSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = advancesCache.filter(a => {
      const worker = workersCache.find(w => w.id === a.workerId);
      return (a.reason || '').toLowerCase().includes(q) ||
             String(a.amount).includes(q) ||
             (worker?.name || '').toLowerCase().includes(q);
    });
    document.getElementById('recordResults').innerHTML = filtered.map(a => {
      const worker = workersCache.find(w => w.id === a.workerId);
      return `<div class="glass-card">₹${a.amount} - ${a.reason} (${a.date}) - ${worker?.name || ''}</div>`;
    }).join('');
  });
}

function renderReports(container) {
  const totalAdv = advancesCache.reduce((s, a) => s + Number(a.amount), 0);
  container.innerHTML = `
    <h2>📊 Reports</h2>
    <div class="glass-card">Total Advances: ₹${totalAdv}</div>
    <button class="btn" id="exportJSONBtn"><i class="fas fa-download"></i> Export JSON</button>
    <button class="btn" id="importJSONBtn" style="margin-top:8px;"><i class="fas fa-upload"></i> Import JSON</button>
    <input type="file" id="importFileInput" accept=".json" style="display:none;">
  `;
  document.getElementById('exportJSONBtn')?.addEventListener('click', () => {
    const data = { workers: workersCache, advances: advancesCache, attendance: attendanceCache };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `contractor_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showToast('Exported successfully', 'success');
  });
  document.getElementById('importJSONBtn')?.addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json.workers) {
        for (let w of json.workers) await addDoc(collection(db, "workers"), w);
      }
      showToast('Import completed', 'success');
      renderPage('reports');
    } catch (err) {
      showToast('Invalid file', 'error');
    }
  });
}

function renderSettings(container) {
  container.innerHTML = `
    <h2>⚙ Settings</h2>
    <button class="btn" id="backupNowBtn"><i class="fas fa-save"></i> Backup Now (Export JSON)</button>
    <p style="color:#aaa; margin-top:20px;">Version 1.0 · Contractor Manager Pro</p>
  `;
  document.getElementById('backupNowBtn')?.addEventListener('click', () => {
    const data = { workers: workersCache, advances: advancesCache, attendance: attendanceCache };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `full_backup_${Date.now()}.json`;
    a.click();
    showToast('Backup downloaded', 'success');
  });
}

// Make renderPage globally accessible for inline calls (e.g., quick actions)
window.renderPage = renderPage;

// ---------- INITIAL LOAD ----------
window.addEventListener('DOMContentLoaded', () => {
  renderPage('dashboard');
});