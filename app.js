// ==================== Mazdoor Advance Register Pro - app.js ====================

let currentUser = null;
let workers = [];
let transactions = [];

// Realtime Listeners
let workersUnsubscribe = null;
let transactionsUnsubscribe = null;

// Show Page
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItems = document.querySelectorAll('.nav-item');
    if (page === 'dashboard') navItems[0].classList.add('active');
    else if (page === 'workers') navItems[1].classList.add('active');
    else if (page === 'reports') navItems[3].classList.add('active');
    else if (page === 'settings') navItems[4].classList.add('active');
}

// Load Dashboard
async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    let totalWorkers = workers.length;
    let todayAdvance = 0;
    let monthAdvance = 0;
    let totalAdvance = 0;
    let recentTx = [];

    transactions.forEach(tx => {
        const txDate = tx.date;
        totalAdvance += tx.amount || 0;
        
        if (txDate === today) todayAdvance += tx.amount || 0;
        if (txDate.startsWith(currentMonth)) monthAdvance += tx.amount || 0;
        
        recentTx.push(tx);
    });

    // Sort recent
    recentTx.sort((a, b) => new Date(b.date) - new Date(a.date));
    recentTx = recentTx.slice(0, 5);

    document.getElementById('total-workers').textContent = totalWorkers;
    document.getElementById('today-advance').textContent = `₹${todayAdvance}`;
    document.getElementById('month-advance').textContent = `₹${monthAdvance}`;
    document.getElementById('total-advance').textContent = `₹${totalAdvance}`;

    // Recent Transactions
    const recentContainer = document.getElementById('recent-transactions');
    recentContainer.innerHTML = '';
    
    if (recentTx.length === 0) {
        recentContainer.innerHTML = '<p class="empty">No recent transactions</p>';
        return;
    }

    recentTx.forEach(tx => {
        const worker = workers.find(w => w.id === tx.workerId);
        const name = worker ? worker.name : 'Unknown';
        
        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <strong>\( {name}</strong> - ₹ \){tx.amount}
            <small>${tx.date} ${tx.note ? `| ${tx.note}` : ''}</small>
        `;
        recentContainer.appendChild(div);
    });
}

// Load Workers
function loadWorkers() {
    const container = document.getElementById('workers-list');
    container.innerHTML = '';

    const searchTerm = document.getElementById('worker-search').value.toLowerCase();

    const filtered = workers.filter(w => 
        w.name.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty">No workers found</p>';
        return;
    }

    filtered.forEach(worker => {
        const totalAdvance = transactions
            .filter(t => t.workerId === worker.id)
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${worker.name}</strong><br>
                    <small>Salary: ₹${worker.salary || 0} | Mobile: ${worker.mobile || 'N/A'}</small>
                </div>
                <div style="text-align:right;">
                    <small>Advance: ₹${totalAdvance}</small><br>
                    <button onclick="showWorkerDetail('${worker.id}')" class="btn-primary" style="padding:6px 12px; font-size:12px;">View</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Search Workers
function searchWorkers() {
    loadWorkers();
}

// Show Add Worker Modal
function showAddWorkerModal() {
    document.getElementById('add-worker-modal').style.display = 'flex';
    document.getElementById('worker-name').value = '';
    document.getElementById('worker-mobile').value = '';
    document.getElementById('worker-salary').value = '';
}

// Add Worker
async function addWorker() {
    const name = document.getElementById('worker-name').value.trim();
    const mobile = document.getElementById('worker-mobile').value.trim();
    const salary = parseFloat(document.getElementById('worker-salary').value);

    if (!name || !salary) {
        alert("Name aur Salary required hai");
        return;
    }

    try {
        await db.collection('workers').add({
            name,
            mobile: mobile || '',
            salary: salary || 0,
            joiningDate: new Date().toISOString().split('T')[0],
            status: 'Active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        closeModal();
        toast("Worker added successfully");
    } catch (e) {
        console.error(e);
        alert("Error adding worker");
    }
}

// Show Worker Detail
async function showWorkerDetail(workerId) {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const workerTx = transactions.filter(t => t.workerId === workerId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalAdvance = workerTx.reduce((sum, t) => sum + t.amount, 0);
    const balance = (worker.salary || 0) - totalAdvance;

    let html = `
        <h2>${worker.name}</h2>
        <p>Salary: ₹${worker.salary || 0}</p>
        <p>Total Advance: ₹${totalAdvance}</p>
        <p>Balance: ₹${balance}</p>
        <hr>
        <h3>Transactions</h3>
    `;

    if (workerTx.length === 0) {
        html += '<p>No transactions yet</p>';
    } else {
        workerTx.forEach(tx => {
            html += `
                <div class="transaction-item">
                    \( {tx.date} - ₹ \){tx.amount}
                    \( {tx.note ? `<br><small> \){tx.note}</small>` : ''}
                    <button onclick="editTransaction('${tx.id}')" style="margin-left:10px;">Edit</button>
                    <button onclick="deleteTransaction('${tx.id}')" class="btn-danger" style="margin-left:5px;">Delete</button>
                </div>
            `;
        });
    }

    // For simplicity, show in alert (you can improve with modal)
    const detailModal = document.createElement('div');
    detailModal.className = 'modal';
    detailModal.style.display = 'flex';
    detailModal.innerHTML = `
        <div class="modal-content" style="max-height:90vh; overflow:auto;">
            ${html}
            <button onclick="this.parentElement.parentElement.remove()" class="btn">Close</button>
        </div>
    `;
    document.body.appendChild(detailModal);
}

// Add Entry Modal
function showAddEntry() {
    const select = document.getElementById('worker-select');
    select.innerHTML = '<option value="">Select Worker</option>';
    
    workers.forEach(worker => {
        const opt = document.createElement('option');
        opt.value = worker.id;
        opt.textContent = worker.name;
        select.appendChild(opt);
    });

    document.getElementById('add-entry-modal').style.display = 'flex';
    document.getElementById('amount').value = '';
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('note').value = '';
}

// Save Advance
async function saveAdvance() {
    const workerId = document.getElementById('worker-select').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('tx-date').value;
    const note = document.getElementById('note').value.trim();

    if (!workerId || !amount || !date) {
        alert("Worker, Amount aur Date required hai");
        return;
    }

    try {
        await db.collection('transactions').add({
            workerId,
            amount,
            date,
            note: note || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        closeModal();
        toast("Advance saved successfully");
    } catch (e) {
        console.error(e);
        alert("Error saving advance");
    }
}

// Load Monthly Report
function loadMonthlyReport() {
    const select = document.getElementById('month-select');
    const currentYear = new Date().getFullYear();
    
    if (select.options.length === 0) {
        for (let i = 0; i < 12; i++) {
            const d = new Date(currentYear, i);
            const val = d.toISOString().slice(0,7);
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = d.toLocaleString('default', { month: 'long', year: 'numeric' });
            select.appendChild(opt);
        }
        select.value = new Date().toISOString().slice(0,7);
    }

    const month = select.value;
    const container = document.getElementById('monthly-report');
    container.innerHTML = '';

    let grandTotal = 0;

    workers.forEach(worker => {
        const monthTx = transactions.filter(t => 
            t.workerId === worker.id && t.date.startsWith(month)
        );
        const totalAdvance = monthTx.reduce((sum, t) => sum + t.amount, 0);
        grandTotal += totalAdvance;

        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <strong>${worker.name}</strong><br>
            Salary: ₹${worker.salary || 0}<br>
            Advance: ₹${totalAdvance}<br>
            Balance: ₹${(worker.salary || 0) - totalAdvance}
        `;
        container.appendChild(div);
    });

    if (workers.length > 0) {
        const totalDiv = document.createElement('div');
        totalDiv.style.marginTop = '15px';
        totalDiv.style.fontWeight = 'bold';
        totalDiv.innerHTML = `Grand Total Advance: ₹${grandTotal}`;
        container.appendChild(totalDiv);
    }
}

// Export Data
async function exportData() {
    const data = {
        workers: workers,
        transactions: transactions
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mazdoor-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    toast("Data exported successfully");
}

// Export CSV
function exportCSV() {
    let csv = "Date,Worker,Amount,Note\n";
    transactions.forEach(tx => {
        const worker = workers.find(w => w.id === tx.workerId);
        csv += `\( {tx.date}, \){worker ? worker.name : ''},\( {tx.amount}," \){tx.note || ''}"\n`;
    });
    
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mazdoor-transactions-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
}

// Import (basic)
document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            // Import logic (batch write)
            toast("Import feature coming soon (batch write needed)");
        } catch (err) {
            alert("Invalid JSON file");
        }
    };
    reader.readAsText(file);
});

// Close Modal
function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

// Toast Notification
function toast(msg) {
    const t = document.createElement('div');
    t.style.position = 'fixed';
    t.style.bottom = '80px';
    t.style.left = '50%';
    t.style.transform = 'translateX(-50%)';
    t.style.background = '#22C55E';
    t.style.color = 'black';
    t.style.padding = '10px 20px';
    t.style.borderRadius = '8px';
    t.style.zIndex = '1000';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// Logout
function logout() {
    if (confirm("Logout karna hai?")) {
        auth.signOut();
    }
}

// Edit / Delete Transaction (basic)
async function deleteTransaction(txId) {
    if (confirm("Delete this transaction?")) {
        await db.collection('transactions').doc(txId).delete();
        toast("Transaction deleted");
    }
}

async function editTransaction(txId) {
    alert("Edit feature - full modal coming in next update");
    // Can be expanded
}

// Realtime Data Loading
function setupRealtimeListeners() {
    // Workers
    if (workersUnsubscribe) workersUnsubscribe();
    workersUnsubscribe = db.collection('workers').onSnapshot(snapshot => {
        workers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadWorkers();
        loadDashboard();
    });

    // Transactions
    if (transactionsUnsubscribe) transactionsUnsubscribe();
    transactionsUnsubscribe = db.collection('transactions').onSnapshot(snapshot => {
        transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadDashboard();
        loadMonthlyReport();
    });
}

// Initialize App
function initApp() {
    // Auth State
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            document.getElementById('user-info').textContent = user.email || 'Admin';
            setupRealtimeListeners();
            showPage('dashboard');
        } else {
            // Simple login prompt (you can make full login page)
            const email = prompt("Enter Admin Email:");
            const pass = prompt("Enter Password:");
            if (email && pass) {
                auth.signInWithEmailAndPassword(email, pass).catch(err => {
                    alert("Login failed: " + err.message);
                });
            }
        }
    });

    // PWA Install Prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        deferredPrompt = e;
        console.log("PWA Install prompt ready");
    });
}

// Start App
document.addEventListener('DOMContentLoaded', initApp);

console.log("%cMazdoor Advance Register Pro Loaded Successfully ✅", "color:#22C55E; font-size:16px;");