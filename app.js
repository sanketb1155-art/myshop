// ================= CONTRACTOR MANAGER PRO - FIXED & PROFESSIONAL =================

let currentUser = null;
let workers = [];
let transactions = [];

let workersUnsubscribe = null;
let transactionsUnsubscribe = null;

// ---------------- UTILITIES ----------------
function toast(msg, type = "success") {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `success-toast ${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('hi-IN', { 
        day: 'numeric', month: 'short', year: 'numeric' 
    });
}

function showLoading(btn, text = "Saving...") {
    btn.disabled = true;
    btn.dataset.original = btn.textContent;
    btn.textContent = text;
}

function hideLoading(btn) {
    btn.disabled = false;
    btn.textContent = btn.dataset.original || "Save";
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
    });
}

// ---------------- NAVIGATION ----------------
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const navs = document.querySelectorAll('.bottom-nav .nav-item');
    navs.forEach(item => {
        if (item.getAttribute('onclick')?.includes(page)) item.classList.add('active');
    });

    if (page === 'dashboard') loadDashboard();
    if (page === 'records') loadRecords();
    if (page === 'reports') loadMonthlyReport();
}

// ---------------- DASHBOARD ----------------
function loadDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayTx = transactions.filter(t => t.date === today);
    const todayTotal = todayTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    document.getElementById('total-workers').textContent = workers.length;
    document.getElementById('today-advance').textContent = `₹${todayTotal}`;
    document.getElementById('month-advance').textContent = `₹${getMonthTotal()}`;
    document.getElementById('total-advance').textContent = `₹${transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)}`;

    const container = document.getElementById('recent-transactions');
    container.innerHTML = '<h2 class="section-title">📅 Aaj Ka Hisab</h2>';

    if (todayTx.length === 0) {
        container.innerHTML += '<p class="empty">Aaj koi advance nahi liya</p>';
        return;
    }

    todayTx.forEach(tx => renderTransaction(tx, container));
}

function getMonthTotal() {
    const month = new Date().toISOString().slice(0,7);
    return transactions
        .filter(t => t.date.startsWith(month))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

// ---------------- WORKERS ----------------
function loadWorkers() {
    const container = document.getElementById('workers-list');
    container.innerHTML = '';

    const search = (document.getElementById('worker-search')?.value || '').toLowerCase();
    const filtered = workers.filter(w => w.name.toLowerCase().includes(search));

    filtered.forEach(worker => {
        const total = transactions
            .filter(t => t.workerId === worker.id)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <strong>${worker.name}</strong><br>
            📱 \( {worker.mobile || '-'} | Salary: ₹ \){worker.salary || 0}<br>
            <strong>Total Advance: ₹${total}</strong>
            <br><br>
            <button class="btn" onclick="showWorkerHistory('${worker.id}')">📜 Full History</button>
            <button class="btn" onclick="editWorker('${worker.id}')">✏️ Edit</button>
            <button class="btn-danger" onclick="deleteWorker('${worker.id}')">🗑️ Delete</button>
        `;
        container.appendChild(div);
    });

    if (filtered.length === 0) container.innerHTML = '<p class="empty">Koi worker nahi mila</p>';
}

async function addWorker() {
    const btn = event.target;
    showLoading(btn);

    const name = document.getElementById('worker-name').value.trim();
    const mobile = document.getElementById('worker-mobile').value.trim();
    const salary = Number(document.getElementById('worker-salary').value) || 0;

    if (!name) {
        alert("Worker ka naam daalna zaroori hai");
        hideLoading(btn);
        return;
    }

    // Duplicate name check
    const exists = workers.some(w => w.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        alert("Same naam ka worker pehle se hai!");
        hideLoading(btn);
        return;
    }

    try {
        await db.collection('workers').add({
            name, mobile, salary,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        closeModal();
        toast('✅ Worker Successfully Added');
    } catch (e) {
        alert("Error: " + e.message);
    }
    hideLoading(btn);
}

// ---------------- ADVANCE ----------------
async function saveAdvance() {
    const btn = event.target;
    showLoading(btn);

    const workerId = document.getElementById('worker-select').value;
    const amount = Number(document.getElementById('amount').value);
    const date = document.getElementById('tx-date').value;
    const note = document.getElementById('note').value.trim();

    if (!workerId || !amount || !date) {
        alert("Sab fields bharo");
        hideLoading(btn);
        return;
    }

    try {
        await db.collection('transactions').add({
            workerId, amount, date, note,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        closeModal();
        toast('✅ Advance Saved Successfully');
    } catch (e) {
        alert("Error: " + e.message);
    }
    hideLoading(btn);
}

function showAddEntry() {
    const select = document.getElementById('worker-select');
    select.innerHTML = '<option value="">Worker Select Karein</option>';
    workers.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = w.name;
        select.appendChild(opt);
    });
    document.getElementById('add-entry-modal').style.display = 'flex';
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
}

// ---------------- HISTORY & EDIT ----------------
function showWorkerHistory(workerId) {
    const worker = workers.find(w => w.id === workerId);
    const workerTx = transactions
        .filter(t => t.workerId === workerId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = `<h3>${worker ? worker.name : ''} - Full History</h3><br>`;

    if (workerTx.length === 0) {
        html += '<p>No transactions yet</p>';
    } else {
        workerTx.forEach(tx => {
            html += `
                <div class="transaction-item" style="margin-bottom:12px;">
                    <strong>₹${tx.amount}</strong> — ${tx.note || 'Reason nahi diya'}<br>
                    <small>${formatDate(tx.date)}</small>
                </div>`;
        });
    }
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:2000;';
    modal.innerHTML = `<div style="background:#1E293B;padding:20px;border-radius:16px;max-width:90%;max-height:80%;overflow:auto;">${html}<br><button class="btn-primary" onclick="this.parentElement.parentElement.remove()">Close</button></div>`;
    document.body.appendChild(modal);
}

async function editWorker(id) {
    const worker = workers.find(w => w.id === id);
    if (!worker) return;
    const newName = prompt("Naya Naam:", worker.name);
    if (newName === null) return;
    await db.collection('workers').doc(id).update({ name: newName.trim() || worker.name });
    toast('Worker Updated');
}

// ---------------- RECORDS ----------------
function loadRecords() {
    const container = document.getElementById('records-list');
    container.innerHTML = '<h2 class="section-title">📖 Poora Record</h2>';
    const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(tx => renderTransaction(tx, container));
}

function renderTransaction(tx, container) {
    const worker = workers.find(w => w.id === tx.workerId);
    const div = document.createElement('div');
    div.className = 'transaction-item';
    div.innerHTML = `
        <strong>${worker ? worker.name : 'Unknown'}</strong><br>
        ₹${tx.amount} — ${tx.note || 'No reason'}<br>
        <small>${formatDate(tx.date)}</small>
    `;
    container.appendChild(div);
}

// ---------------- REPORTS ----------------
function loadMonthlyReport() {
    const container = document.getElementById('monthly-report');
    container.innerHTML = '<h2 class="section-title">📊 Month-wise Summary</h2>';

    if (workers.length === 0) {
        container.innerHTML += '<p class="empty">Koi worker nahi hai</p>';
        return;
    }

    workers.forEach(worker => {
        const total = transactions
            .filter(t => t.workerId === worker.id)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <strong>${worker.name}</strong><br>
            Total Advance: <strong>₹${total}</strong>
        `;
        container.appendChild(div);
    });
}

// ---------------- SETTINGS ----------------
function exportData() {
    const data = { version: "2.1", exportedAt: new Date().toISOString(), workers, transactions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    toast('Backup Downloaded');
}

async function deleteWorker(id) {
    if (!confirm("Worker aur uske saare records delete karein?")) return;
    await db.collection('workers').doc(id).delete();
    toast('Worker Deleted');
}

function logout() { auth.signOut(); }

// ---------------- FIREBASE ----------------
function setupRealtimeListeners() {
    if (workersUnsubscribe) workersUnsubscribe();
    if (transactionsUnsubscribe) transactionsUnsubscribe();

    workersUnsubscribe = db.collection('workers').onSnapshot(snap => {
        workers = snap.docs.map(d => ({id: d.id, ...d.data()}));
        loadWorkers();
        loadDashboard();
        loadRecords();
        loadMonthlyReport();
    });

    transactionsUnsubscribe = db.collection('transactions').onSnapshot(snap => {
        transactions = snap.docs.map(d => ({id: d.id, ...d.data()}));
        loadDashboard();
        loadRecords();
        loadMonthlyReport();
    });
}

function initApp() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            document.getElementById('user-info').textContent = user.email;
            setupRealtimeListeners();
            showPage('dashboard');
        } else {
            const email = prompt('Email:');
            const pass = prompt('Password:');
            if (email && pass) auth.signInWithEmailAndPassword(email, pass).catch(e => alert(e.message));
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp);