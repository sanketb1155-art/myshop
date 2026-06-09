// ================= HISABBOOK - PRACTICAL CONTRACTOR APP =================

let workers = [];
let transactions = [];

let workersUnsubscribe = null;
let transactionsUnsubscribe = null;

// ---------------- UTILITIES ----------------
function toast(msg) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'success-toast';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('hi-IN');
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
    container.innerHTML = '<h2>Aaj Ka Hisab</h2>';

    if (todayTx.length === 0) {
        container.innerHTML += '<p class="empty">Aaj koi entry nahi</p>';
        return;
    }

    todayTx.forEach(tx => renderTransaction(tx, container));
}

function getMonthTotal() {
    const month = new Date().toISOString().slice(0, 7);
    return transactions
        .filter(t => t.date.startsWith(month))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

// ---------------- WORKERS ----------------
function loadWorkers() {
    const container = document.getElementById('workers-list');
    container.innerHTML = '';

    const search = document.getElementById('worker-search').value.toLowerCase().trim();
    const filtered = workers.filter(w => w.name.toLowerCase().includes(search));

    filtered.forEach(worker => {
        const balance = getWorkerBalance(worker.id);

        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <strong>${worker.name}</strong><br>
            Balance: <strong>₹${balance}</strong>
            <br><br>
            <button class="btn" onclick="showWorkerHistory('${worker.id}')">History Dekho</button>
            <button class="btn-danger" onclick="deleteWorker('${worker.id}')">Delete</button>
        `;
        container.appendChild(div);
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty">Koi worker nahi mila</p>';
    }
}

function getWorkerBalance(workerId) {
    return transactions
        .filter(t => t.workerId === workerId)
        .reduce((sum, t) => {
            return sum + (t.type === 'payment' ? -Number(t.amount) : Number(t.amount));
        }, 0);
}

// ---------------- ADD WORKER ----------------
function showAddWorkerModal() {
    document.getElementById('add-worker-modal').style.display = 'flex';
}

async function addWorker() {
    const name = document.getElementById('worker-name').value.trim();
    if (!name) return alert("Naam likho");

    const exists = workers.some(w => w.name.toLowerCase() === name.toLowerCase());
    if (exists) return alert("Ye naam pehle se hai!");

    try {
        await db.collection('workers').add({
            name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        closeModal();
        toast('Worker Added');
        document.getElementById('worker-name').value = '';
    } catch (e) {
        alert(e.message);
    }
}

// ---------------- ENTRY (Advance or Payment) ----------------
function showAddEntry() {
    const select = document.getElementById('worker-select');
    select.innerHTML = '<option value="">Worker chuno</option>';
    workers.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = w.name;
        select.appendChild(opt);
    });
    document.getElementById('add-entry-modal').style.display = 'flex';
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
}

async function saveEntry() {
    const workerId = document.getElementById('worker-select').value;
    const amount = Number(document.getElementById('amount').value);
    const type = document.getElementById('entry-type').value;
    const date = document.getElementById('tx-date').value;
    const note = document.getElementById('note').value.trim();

    if (!workerId || !amount || !date) {
        return alert("Sab bharo");
    }

    try {
        await db.collection('transactions').add({
            workerId,
            amount,
            type,           // 'advance' or 'payment'
            date,
            note,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        closeModal();
        toast(type === 'payment' ? 'Payment Recorded' : 'Advance Recorded');
    } catch (e) {
        alert(e.message);
    }
}

// ---------------- HISTORY ----------------
function showWorkerHistory(workerId) {
    const worker = workers.find(w => w.id === workerId);
    const workerTx = transactions
        .filter(t => t.workerId === workerId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = `<h3>${worker.name} - History</h3><br>`;
    let runningBalance = 0;

    workerTx.forEach(tx => {
        const amt = Number(tx.amount);
        runningBalance += (tx.type === 'payment' ? -amt : amt);

        html += `
            <div class="transaction-item">
                <strong>\( {tx.type === 'payment' ? '💸 Payment' : '📤 Advance'}</strong> - ₹ \){amt}<br>
                ${tx.note ? tx.note + '<br>' : ''}
                <small>\( {formatDate(tx.date)} | Balance: ₹ \){runningBalance}</small>
            </div>`;
    });

    if (workerTx.length === 0) html += '<p>No entries yet</p>';

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:3000;';
    modal.innerHTML = `
        <div style="background:#1E293B;padding:20px;border-radius:16px;max-width:92%;max-height:85%;overflow:auto;">
            ${html}
            <br><button class="btn-primary" onclick="this.closest('div[style*=\'position:fixed\']').remove()">Close</button>
        </div>`;
    document.body.appendChild(modal);
}

// ---------------- RECORDS & REPORTS ----------------
function loadRecords() {
    const container = document.getElementById('records-list');
    container.innerHTML = '<h2>Poora History</h2>';
    const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(tx => renderTransaction(tx, container));
}

function renderTransaction(tx, container) {
    const worker = workers.find(w => w.id === tx.workerId);
    const div = document.createElement('div');
    div.className = 'transaction-item';
    div.innerHTML = `
        <strong>${worker ? worker.name : 'Unknown'}</strong><br>
        \( {tx.type === 'payment' ? '💸 Payment' : '📤 Advance'} : ₹ \){tx.amount}<br>
        ${tx.note || ''}<br>
        <small>${formatDate(tx.date)}</small>
    `;
    container.appendChild(div);
}

function loadMonthlyReport() {
    const container = document.getElementById('monthly-report');
    container.innerHTML = '<h2>Month Report</h2>';

    workers.forEach(worker => {
        const txs = transactions.filter(t => t.workerId === worker.id);
        const advance = txs.filter(t => t.type === 'advance').reduce((s, t) => s + Number(t.amount), 0);
        const payment = txs.filter(t => t.type === 'payment').reduce((s, t) => s + Number(t.amount), 0);
        const balance = advance - payment;

        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <strong>${worker.name}</strong><br>
            Advance: ₹\( {advance} | Payment: ₹ \){payment}<br>
            <strong>Baaki: ₹${balance}</strong>
        `;
        container.appendChild(div);
    });
}

// ---------------- SETTINGS ----------------
function exportData() {
    const data = {workers, transactions, exportedAt: new Date().toISOString()};
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hisabbook_backup.json';
    a.click();
    toast('Backup Downloaded');
}

async function deleteWorker(id) {
    if (!confirm("Worker delete karna hai?")) return;
    await db.collection('workers').doc(id).delete();
    toast('Worker Deleted');
}

function logout() {
    auth.signOut();
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
        loadMonthlyReport();
    });
}

function initApp() {
    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('user-info').textContent = user.email;
            setupRealtimeListeners();
            showPage('dashboard');
        } else {
            const email = prompt('Email:');
            const pass = prompt('Password:');
            if (email && pass) auth.signInWithEmailAndPassword(email, pass);
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp);