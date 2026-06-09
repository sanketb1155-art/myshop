// ================= CONTRACTOR MANAGER PRO - SCALABLE VERSION =================
// Version: 2.0
// Future me features add karne ke liye modular structure

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
    setTimeout(() => t.remove(), 2800);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('hi-IN', { 
        day: 'numeric', month: 'short', year: 'numeric' 
    });
}

function showLoading(btn, text = "Saving...") {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = text;
}

function hideLoading(btn) {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || "Save";
}

// ---------------- NAVIGATION ----------------
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = Array.from(document.querySelectorAll('.nav-item'))
        .find(item => item.getAttribute('onclick')?.includes(page));
    if (activeNav) activeNav.classList.add('active');

    if (page === 'dashboard') loadDashboard();
    if (page === 'records') loadRecords();
    if (page === 'reports') loadMonthlyReport();
}

// ---------------- DASHBOARD ----------------
function loadDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayTx = transactions.filter(t => t.date === today);

    let todayTotal = todayTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    document.getElementById('total-workers').textContent = workers.length;
    document.getElementById('today-advance').textContent = `₹${todayTotal}`;
    document.getElementById('total-advance').textContent = 
        `₹${transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)}`;

    const container = document.getElementById('recent-transactions');
    container.innerHTML = '<h3>Aaj Ka Hisab</h3>';

    if (todayTx.length === 0) {
        container.innerHTML += '<p class="empty">Aaj koi advance nahi liya</p>';
        return;
    }

    todayTx.forEach(tx => renderTransaction(tx, container));
}

// Helper to render one transaction
function renderTransaction(tx, container) {
    const worker = workers.find(w => w.id === tx.workerId);
    const div = document.createElement('div');
    div.className = 'transaction-item';
    div.innerHTML = `
        <strong>${worker ? worker.name : 'Unknown'}</strong><br>
        ₹${tx.amount} — ${tx.note || 'No reason'}<br>
        <small>${formatDate(tx.date)}</small>
        <br>
        <button class="btn" onclick="editTransaction('${tx.id}')">Edit</button>
        <button class="btn-danger" onclick="deleteTransaction('${tx.id}')">Delete</button>
    `;
    container.appendChild(div);
}

// ---------------- WORKERS ----------------
function loadWorkers() {
    const container = document.getElementById('workers-list');
    container.innerHTML = '';

    const searchTerm = (document.getElementById('worker-search')?.value || '').toLowerCase();
    const filtered = workers.filter(w => w.name.toLowerCase().includes(searchTerm));

    filtered.forEach(worker => {
        const totalAdvance = transactions
            .filter(t => t.workerId === worker.id)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <strong>${worker.name}</strong><br>
            📱 \( {worker.mobile || '-'} | Salary: ₹ \){worker.salary || 0}<br>
            Total Advance: <strong>₹${totalAdvance}</strong>
            <br><br>
            <button class="btn" onclick="showWorkerHistory('${worker.id}')">History</button>
            <button class="btn" onclick="editWorker('${worker.id}')">Edit</button>
            <button class="btn-danger" onclick="deleteWorker('${worker.id}')">Delete</button>
        `;
        container.appendChild(div);
    });

    if (filtered.length === 0) container.innerHTML = '<p class="empty">No workers found</p>';
}

async function addWorker() {
    const btn = event.target;
    showLoading(btn);

    const name = document.getElementById('worker-name').value.trim();
    const mobile = document.getElementById('worker-mobile').value.trim();
    const salary = Number(document.getElementById('worker-salary').value) || 0;

    if (!name) {
        alert("Naam zaroori hai");
        hideLoading(btn);
        return;
    }

    try {
        await db.collection('workers').add({
            name, mobile, salary,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        closeModal();
        toast('Worker Added');
    } catch (e) { alert(e.message); }
    hideLoading(btn);
}

async function editWorker(id) {
    const worker = workers.find(w => w.id === id);
    if (!worker) return;

    const newName = prompt("New Name:", worker.name);
    if (newName === null) return;

    await db.collection('workers').doc(id).update({
        name: newName.trim() || worker.name,
        mobile: prompt("New Mobile:", worker.mobile) || worker.mobile,
        salary: Number(prompt("New Salary:", worker.salary)) || worker.salary
    });
    toast('Worker Updated');
}

// ---------------- ADVANCE / TRANSACTIONS ----------------
function showAddEntry() {
    const select = document.getElementById('worker-select');
    select.innerHTML = '<option value="">Select Worker</option>';
    workers.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id; opt.textContent = w.name;
        select.appendChild(opt);
    });
    document.getElementById('add-entry-modal').style.display = 'flex';
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
}

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
        toast('Advance Saved Successfully');
    } catch (e) { alert(e.message); }
    hideLoading(btn);
}

async function deleteTransaction(id) {
    if (!confirm("Transaction delete karein?")) return;
    await db.collection('transactions').doc(id).delete();
    toast('Transaction Deleted');
}

async function editTransaction(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const newAmount = prompt("New Amount:", tx.amount);
    const newNote = prompt("New Reason:", tx.note || '');
    const newDate = prompt("New Date (YYYY-MM-DD):", tx.date);

    if (newAmount === null) return;

    await db.collection('transactions').doc(id).update({
        amount: Number(newAmount) || tx.amount,
        note: newNote || tx.note,
        date: newDate || tx.date
    });
    toast('Transaction Updated');
}

// ---------------- WORKER FULL HISTORY ----------------
function showWorkerHistory(workerId) {
    const worker = workers.find(w => w.id === workerId);
    const workerTx = transactions
        .filter(t => t.workerId === workerId)
        .sort((a,b) => new Date(b.date) - new Date(a.date));

    let html = `<h3>${worker ? worker.name : ''} - Full History</h3>`;
    if (workerTx.length === 0) {
        html += '<p class="empty">No transactions yet</p>';
    } else {
        workerTx.forEach(tx => {
            html += `
                <div class="transaction-item">
                    <strong>₹${tx.amount}</strong> — ${tx.note || 'No reason'}<br>
                    <small>${formatDate(tx.date)}</small>
                </div>`;
        });
    }
    alert(html); // Simple modal ke liye abhi alert, baad mein custom modal bana sakte hain
}

// ---------------- RECORDS (Full History + Filter) ----------------
function loadRecords() {
    const container = document.getElementById('records-list');
    container.innerHTML = `
        <h3>Poora Record</h3>
        <input type="text" id="record-search" placeholder="Search by name or reason" onkeyup="filterRecords()">
    `;

    renderAllRecords(container);
}

function renderAllRecords(container) {
    const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(tx => renderTransaction(tx, container));
}

window.filterRecords = function() {
    // Can be enhanced later with debounce
    loadRecords();
};

// ---------------- REPORTS ----------------
function loadMonthlyReport() {
    const container = document.getElementById('monthly-report');
    container.innerHTML = '<h3>Month-wise Summary</h3>';

    workers.forEach(worker => {
        const total = transactions
            .filter(t => t.workerId === worker.id)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `<strong>\( {worker.name}</strong><br>Total Advance: ₹ \){total}`;
        container.appendChild(div);
    });
}

// ---------------- MODALS & SETTINGS ----------------
function showAddWorkerModal() {
    document.getElementById('add-worker-modal').style.display = 'flex';
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

async function deleteWorker(id) {
    if (!confirm("Pura worker delete karein?")) return;
    await db.collection('workers').doc(id).delete();
    toast('Worker Deleted');
}

function exportData() {
    const data = {
        version: "2.0",
        exportedAt: new Date().toISOString(),
        workers, 
        transactions
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `contractor_backup_v2_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    toast('Backup Downloaded (Safe for future restore)');
}

// ---------------- FIREBASE ----------------
function setupRealtimeListeners() {
    workersUnsubscribe = db.collection('workers').onSnapshot(snap => {
        workers = snap.docs.map(d => ({id: d.id, ...d.data()}));
        loadWorkers();
        loadDashboard();
    });

    transactionsUnsubscribe = db.collection('transactions').onSnapshot(snap => {
        transactions = snap.docs.map(d => ({id: d.id, ...d.data()}));
        loadDashboard();
        loadRecords();
    });
}

function initApp() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            document.getElementById('user-info').textContent = user.email || "User";
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