// ================= CONTRACTOR MANAGER PRO =================

let currentUser = null;
let workers = [];
let transactions = [];

let workersUnsubscribe = null;
let transactionsUnsubscribe = null;

// ---------------- PAGE NAVIGATION ----------------

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });

    const pageEl = document.getElementById(page);
    if (pageEl) pageEl.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(i => {
        i.classList.remove('active');
    });
}

// ---------------- DASHBOARD ----------------

function loadDashboard() {

    const today = new Date().toISOString().split('T')[0];
    const month = new Date().toISOString().slice(0,7);

    let todayAdvance = 0;
    let monthAdvance = 0;
    let totalAdvance = 0;

    transactions.forEach(tx => {

        totalAdvance += Number(tx.amount || 0);

        if(tx.date === today){
            todayAdvance += Number(tx.amount || 0);
        }

        if(tx.date.startsWith(month)){
            monthAdvance += Number(tx.amount || 0);
        }
    });

    document.getElementById('total-workers').textContent =
        workers.length;

    document.getElementById('today-advance').textContent =
        `₹${todayAdvance}`;

    document.getElementById('month-advance').textContent =
        `₹${monthAdvance}`;

    document.getElementById('total-advance').textContent =
        `₹${totalAdvance}`;

    loadRecentTransactions();
}

function loadRecentTransactions(){

    const container =
        document.getElementById('recent-transactions');

    container.innerHTML = '';

    const recent =
        [...transactions]
        .sort((a,b)=>
            new Date(b.date)-new Date(a.date)
        )
        .slice(0,5);

    if(recent.length===0){
        container.innerHTML =
            '<p class="empty">No Transactions</p>';
        return;
    }

    recent.forEach(tx=>{

        const worker =
            workers.find(w=>w.id===tx.workerId);

        const div = document.createElement('div');

        div.className='transaction-item';

        div.innerHTML = `
            <strong>
                ${worker ? worker.name : 'Unknown'}
            </strong>
            <br>
            ₹${tx.amount}
            <br>
            <small>${tx.date}</small>
        `;

        container.appendChild(div);
    });
}

// ---------------- WORKERS ----------------

function searchWorkers(){
    loadWorkers();
}

function loadWorkers(){

    const container =
        document.getElementById('workers-list');

    container.innerHTML='';

    const search =
        document.getElementById('worker-search')
        ?.value
        ?.toLowerCase() || '';

    const filtered =
        workers.filter(w =>
            w.name.toLowerCase().includes(search)
        );

    if(filtered.length===0){
        container.innerHTML =
            '<p class="empty">No Workers</p>';
        return;
    }

    filtered.forEach(worker=>{

        const advance =
            transactions
            .filter(t=>t.workerId===worker.id)
            .reduce((a,b)=>a+Number(b.amount||0),0);

        const div =
            document.createElement('div');

        div.className='transaction-item';

        div.innerHTML = `
            <strong>${worker.name}</strong>
            <br>
            Mobile:
            ${worker.mobile || '-'}
            <br>
            Salary:
            ₹${worker.salary || 0}
            <br><br>

            Advance:
            ₹${advance}

            <br><br>

            <button
                class="btn-danger"
                onclick="deleteWorker('${worker.id}')">
                Delete
            </button>
        `;

        container.appendChild(div);
    });
}

function showAddWorkerModal(){

    document.getElementById(
        'add-worker-modal'
    ).style.display='flex';
}

async function addWorker(){

    const name =
        document.getElementById('worker-name')
        .value.trim();

    const mobile =
        document.getElementById('worker-mobile')
        .value.trim();

    const salary =
        Number(
            document.getElementById(
                'worker-salary'
            ).value
        );

    if(!name){
        alert('Enter Worker Name');
        return;
    }

    try{

        await db.collection('workers').add({

            name,
            mobile,
            salary,

            createdAt:
            firebase.firestore.FieldValue
            .serverTimestamp()

        });

        closeModal();

        toast('Worker Added');

    }catch(err){

        console.error(err);

        alert(err.message);
    }
}

async function deleteWorker(id){

    if(!confirm('Delete Worker?'))
        return;

    await db.collection('workers')
    .doc(id)
    .delete();
}

// ---------------- ADVANCE ----------------

function showAddEntry(){

    const select =
        document.getElementById(
            'worker-select'
        );

    select.innerHTML =
        '<option value="">Select Worker</option>';

    workers.forEach(worker=>{

        const opt =
            document.createElement('option');

        opt.value =
            worker.id;

        opt.textContent =
            worker.name;

        select.appendChild(opt);
    });

    document.getElementById(
        'add-entry-modal'
    ).style.display='flex';

    document.getElementById(
        'tx-date'
    ).value =
        new Date()
        .toISOString()
        .split('T')[0];
}

async function saveAdvance(){

    const workerId =
        document.getElementById(
            'worker-select'
        ).value;

    const amount =
        Number(
            document.getElementById(
                'amount'
            ).value
        );

    const date =
        document.getElementById(
            'tx-date'
        ).value;

    const note =
        document.getElementById(
            'note'
        ).value;

    if(!workerId || !amount){

        alert('Fill All Fields');
        return;
    }

    await db.collection(
        'transactions'
    ).add({

        workerId,
        amount,
        date,
        note,

        createdAt:
        firebase.firestore.FieldValue
        .serverTimestamp()

    });

    closeModal();

    toast('Advance Saved');
}

// ---------------- REPORTS ----------------

function loadMonthlyReport(){

    const container =
        document.getElementById(
            'monthly-report'
        );

    if(!container) return;

    container.innerHTML='';

    workers.forEach(worker=>{

        const total =
            transactions
            .filter(t =>
                t.workerId===worker.id
            )
            .reduce((a,b)=>
                a+Number(b.amount||0)
            ,0);

        const div =
            document.createElement('div');

        div.className =
            'transaction-item';

        div.innerHTML=`
            <strong>${worker.name}</strong>
            <br>
            Salary:
            ₹${worker.salary}
            <br>
            Advance:
            ₹${total}
        `;

        container.appendChild(div);
    });
}

// ---------------- EXPORT ----------------

function exportData(){

    const data = {
        workers,
        transactions
    };

    const blob =
        new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:
                'application/json'
            }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement('a');

    a.href=url;

    a.download='backup.json';

    a.click();
}

function exportCSV(){

    let csv =
        'Worker,Amount,Date\n';

    transactions.forEach(tx=>{

        const worker =
            workers.find(
                w=>w.id===tx.workerId
            );

        csv +=
        `${worker?.name || ''},${tx.amount},${tx.date}\n`;
    });

    const blob =
        new Blob([csv]);

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement('a');

    a.href=url;

    a.download='report.csv';

    a.click();
}

// ---------------- UI ----------------

function closeModal(){

    document
    .querySelectorAll('.modal')
    .forEach(m =>
        m.style.display='none'
    );
}

function toast(msg){

    alert(msg);
}

function logout(){

    auth.signOut();
}

// ---------------- FIREBASE ----------------

function setupRealtimeListeners(){

    if(workersUnsubscribe)
        workersUnsubscribe();

    workersUnsubscribe =
        db.collection('workers')
        .onSnapshot(snapshot=>{

            workers =
                snapshot.docs.map(doc=>({
                    id:doc.id,
                    ...doc.data()
                }));

            loadWorkers();
            loadDashboard();
            loadMonthlyReport();
        });

    if(transactionsUnsubscribe)
        transactionsUnsubscribe();

    transactionsUnsubscribe =
        db.collection('transactions')
        .onSnapshot(snapshot=>{

            transactions =
                snapshot.docs.map(doc=>({
                    id:doc.id,
                    ...doc.data()
                }));

            loadDashboard();
            loadMonthlyReport();
        });
}

// ---------------- START ----------------

function initApp(){

    auth.onAuthStateChanged(user=>{

        if(user){

            currentUser=user;

            document
            .getElementById('user-info')
            .textContent =
            user.email;

            setupRealtimeListeners();

        }else{

            const email =
                prompt(
                    'Enter Email'
                );

            const pass =
                prompt(
                    'Enter Password'
                );

            if(email && pass){

                auth
                .signInWithEmailAndPassword(
                    email,
                    pass
                )
                .catch(err=>{

                    alert(
                        err.message
                    );
                });
            }
        }
    });
}

document.addEventListener(
    'DOMContentLoaded',
    initApp
);