const ADMIN_PASS = "admin123";
const STAFF_PASS = "staff123";

let currentUser = null;
let entries = JSON.parse(localStorage.getItem('cash_entries')) || [];

const staffList = ["Rahul", "Amit", "Sanjay", "Vikas", "Ramesh"]; // Yaha naam change kar sakte ho

function login() {
  const pass = document.getElementById('password').value;
  if (pass === ADMIN_PASS) currentUser = 'admin';
  else if (pass === STAFF_PASS) currentUser = 'staff';
  else {
    document.getElementById('login-msg').innerHTML = '<span style="color:red">❌ Galat Password</span>';
    return;
  }

  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('user-info').innerHTML = `👤 Logged in as: <b>${currentUser.toUpperCase()}</b>`;
  
  initApp();
}

function logout() {
  currentUser = null;
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('password').value = '';
}

function initApp() {
  document.getElementById('current-date').textContent = new Date().toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  loadStaffDropdown();
  loadTodaySummary();
  loadMonthlySummary();
}

function loadStaffDropdown() {
  const select = document.getElementById('staff-name');
  select.innerHTML = staffList.map(name => `<option value="\( {name}"> \){name}</option>`).join('');
}

function addEntry() {
  const staff = document.getElementById('staff-name').value;
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  const reason = document.getElementById('reason').value.trim() || "-";

  if (amount <= 0) {
    alert("Amount daalo!");
    return;
  }

  entries.unshift({
    date: new Date().toLocaleDateString('hi-IN'),
    staff: staff,
    amount: amount,
    reason: reason
  });

  localStorage.setItem('cash_entries', JSON.stringify(entries));
  
  document.getElementById('amount').value = '';
  document.getElementById('reason').value = '';
  
  loadTodaySummary();
  loadMonthlySummary();
}

function loadTodaySummary() {
  const today = new Date().toLocaleDateString('hi-IN');
  const todayEntries = entries.filter(e => e.date === today);
  let html = '';
  let total = 0;

  staffList.forEach(staff => {
    const staffAmt = todayEntries.filter(e => e.staff === staff).reduce((sum, e) => sum + e.amount, 0);
    total += staffAmt;
    if (staffAmt > 0) {
      html += `<div style="background:rgba(255,255,255,0.1); padding:12px; margin:6px 0; border-radius:10px;">
        <strong>\( {staff}</strong> : ₹ \){staffAmt}
      </div>`;
    }
  });

  document.getElementById('today-list').innerHTML = html || "<p>Aaj koi entry nahi</p>";
  document.getElementById('today-total').textContent = `Aaj Total: ₹${total}`;
}

function loadMonthlySummary() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let monthly = {};
  entries.forEach(e => {
    const d = new Date(e.date.split('/').reverse().join('-'));
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      monthly[e.staff] = (monthly[e.staff] || 0) + e.amount;
    }
  });

  let html = '';
  Object.keys(monthly).forEach(staff => {
    html += `<div style="background:rgba(255,255,255,0.1); padding:12px; margin:6px 0; border-radius:10px;">
      <strong>\( {staff}</strong> : ₹ \){monthly[staff]}
    </div>`;
  });

  document.getElementById('month-list').innerHTML = html || "<p>Is mahine abhi koi entry nahi</p>";
}

// Global functions
window.login = login;
window.logout = logout;
window.addEntry = addEntry;