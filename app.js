// =============================
// Contractor Manager Pro
// Complete Rebuilt app.js
// =============================

let workers = [];
let advances = [];
let currentPage = "dashboard";

let workersListener = null;
let advancesListener = null;

// =============================
// INIT
// =============================

window.onload = initApp;

async function initApp() {
  auth.onAuthStateChanged(async (user) => {
    try {
      if (!user) {
        await auth.signInAnonymously();
      }

      setupRealtime();
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  });

  setupModalClose();
}

// =============================
// REALTIME
// =============================

function setupRealtime() {
  if (workersListener) workersListener();
  if (advancesListener) advancesListener();

  workersListener = db
    .collection("workers")
    .orderBy("name")
    .onSnapshot((snap) => {
      workers = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      renderCurrentPage();
    });

  advancesListener = db
    .collection("advances")
    .orderBy("date", "desc")
    .onSnapshot((snap) => {
      advances = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      renderCurrentPage();
    });
}

// =============================
// NAVIGATION
// =============================

function navigateTo(page) {
  currentPage = page;

  document.querySelectorAll(".nav-btn")
    .forEach(btn => btn.classList.remove("active"));

  const activeBtn = [...document.querySelectorAll(".nav-btn")]
    .find(btn => btn.getAttribute("onclick")?.includes(page));

  if (activeBtn) {
    activeBtn.classList.add("active");
  }

  renderCurrentPage();
}

// =============================
// RENDER
// =============================

function renderCurrentPage() {
  const container = document.getElementById("main-content");

  if (!container) return;

  switch (currentPage) {
    case "dashboard":
      renderDashboard(container);
      break;

    case "workers":
      renderWorkers(container);
      break;

    case "advance":
      renderAdvance(container);
      break;

    case "records":
      renderRecords(container);
      break;

    case "reports":
      renderReports(container);
      break;
  }
}

// =============================
// TOAST
// =============================

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.innerHTML =
    type === "success"
      ? `✅ ${msg}`
      : `❌ ${msg}`;

  toast.style.background =
    type === "success"
      ? "#166534"
      : "#991b1b";

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// =============================
// DASHBOARD
// =============================

function renderDashboard(container) {

  const totalWorkers = workers.length;

  const totalAdvance =
    advances.reduce(
      (sum, a) => sum + Number(a.amount || 0),
      0
    );

  const today =
    new Date().toISOString().split("T")[0];

  const todayAdvance =
    advances
      .filter(a => a.date === today)
      .reduce(
        (sum, a) => sum + Number(a.amount || 0),
        0
      );

  container.innerHTML = `
  <div class="card">

    <h2>Dashboard</h2>

    <div class="stats-grid">

      <div class="stat-card">
        <div class="stat-value">${totalWorkers}</div>
        <div>Workers</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">₹${todayAdvance}</div>
        <div>Today's Advance</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">₹${totalAdvance}</div>
        <div>Total Advance</div>
      </div>

    </div>

  </div>

  <div class="card">

    <h3>Recent Transactions</h3>

    ${
      advances.length
      ? advances.slice(0,10).map(a => {

          const worker =
            workers.find(
              w => w.id === a.workerId
            );

          return `
            <div style="padding:10px 0;border-bottom:1px solid #334155">
              <strong>${worker ? worker.name : "Unknown"}</strong>
              <br>
              ₹${a.amount}
              <br>
              <small>${a.date}</small>
            </div>
          `;

        }).join("")
      : "<p>No transactions found</p>"
    }

  </div>
  `;
}

// =============================
// WORKERS
// =============================

function renderWorkers(container) {

  container.innerHTML = `
  <div class="card">

    <div class="flex justify-between items-center">

      <h2>Workers</h2>

      <button onclick="showAddWorkerModal()">
        + Add Worker
      </button>

    </div>

    <input
      id="worker-search"
      placeholder="Search worker"
      oninput="filterWorkers()"
    >

    <div id="workers-list"></div>

  </div>
  `;

  renderWorkersList();
}

function renderWorkersList(search = "") {

  const list =
    document.getElementById("workers-list");

  if (!list) return;

  const filtered =
    workers.filter(w => {

      return (
        w.name
          .toLowerCase()
          .includes(search.toLowerCase())
        ||
        (w.mobile || "")
          .includes(search)
      );

    });

  list.innerHTML =
    filtered.map(worker => {

      const totalAdvance =
        advances
          .filter(a =>
            a.workerId === worker.id
          )
          .reduce(
            (s,a)=>
              s + Number(a.amount || 0),
            0
          );

      const payable =
        Number(worker.salary) -
        totalAdvance;

      return `
      <div class="card">

        <div class="flex justify-between">

          <div>

            <strong>${worker.name}</strong>
            <br>
            <small>${worker.mobile}</small>

          </div>

          <div>

            ₹${worker.salary}

          </div>

        </div>

        <br>

        <div class="flex justify-between">

          <span>
            Advance ₹${totalAdvance}
          </span>

          <span>
            Payable ₹${payable}
          </span>

        </div>

        <br>

        <button
          onclick="deleteWorker('${worker.id}')"
        >
          Delete
        </button>

      </div>
      `;

    }).join("");
}

function filterWorkers() {

  const value =
    document
      .getElementById("worker-search")
      .value;

  renderWorkersList(value);
}

// =============================
// MODAL
// =============================

function showAddWorkerModal() {

  const modal =
    document.getElementById("modal");

  const content =
    document.getElementById("modal-content");

  content.innerHTML = `

    <h3>Add Worker</h3>

    <input
      id="w-name"
      placeholder="Name"
    >

    <input
      id="w-mobile"
      placeholder="Mobile"
    >

    <input
      id="w-salary"
      type="number"
      placeholder="Salary"
    >

    <button onclick="saveWorker()">
      Save Worker
    </button>

  `;

  modal.style.display = "flex";
}

function closeModal() {

  document
    .getElementById("modal")
    .style.display = "none";
}

function setupModalClose() {

  const modal =
    document.getElementById("modal");

  modal.addEventListener("click", (e) => {

    if (e.target.id === "modal") {
      closeModal();
    }

  });
}

// =============================
// SAVE WORKER
// =============================

async function saveWorker() {

  const name =
    document
      .getElementById("w-name")
      .value
      .trim();

  const mobile =
    document
      .getElementById("w-mobile")
      .value
      .trim();

  const salary =
    Number(
      document
        .getElementById("w-salary")
        .value
    );

  if (!name) {
    return showToast(
      "Name required",
      "error"
    );
  }

  if (
    !/^[6-9]\d{9}$/.test(mobile)
  ) {
    return showToast(
      "Invalid mobile",
      "error"
    );
  }

  if (salary <= 0) {
    return showToast(
      "Invalid salary",
      "error"
    );
  }

  const duplicate =
    workers.find(
      w => w.mobile === mobile
    );

  if (duplicate) {

    return showToast(
      "Worker already exists",
      "error"
    );

  }

  await db
    .collection("workers")
    .add({
      name,
      mobile,
      salary,
      createdAt:
        new Date().toISOString()
    });

  closeModal();

  showToast("Worker Added");
}

// =============================
// DELETE WORKER
// =============================

async function deleteWorker(id) {

  if (
    !confirm(
      "Delete worker?"
    )
  ) return;

  await db
    .collection("workers")
    .doc(id)
    .delete();

  showToast("Deleted");
}

// =============================
// ADVANCE ENTRY
// =============================

function renderAdvance(container) {

  const options =
    workers.map(
      w =>
        `<option value="${w.id}">
          ${w.name}
        </option>`
    ).join("");

  container.innerHTML = `

  <div class="card">

    <h2>Advance Entry</h2>

    <select id="adv-worker">
      <option value="">
        Select Worker
      </option>
      ${options}
    </select>

    <input
      id="adv-amount"
      type="number"
      placeholder="Amount"
    >

    <input
      id="adv-date"
      type="date"
      value="${
        new Date()
          .toISOString()
          .split("T")[0]
      }"
    >

    <input
      id="adv-reason"
      placeholder="Reason"
    >

    <textarea
      id="adv-notes"
      placeholder="Notes"
    ></textarea>

    <button
      onclick="saveAdvance()"
    >
      Save Advance
    </button>

  </div>
  `;
}

async function saveAdvance() {

  const workerId =
    document
      .getElementById("adv-worker")
      .value;

  const amount =
    Number(
      document
        .getElementById("adv-amount")
        .value
    );

  const date =
    document
      .getElementById("adv-date")
      .value;

  const reason =
    document
      .getElementById("adv-reason")
      .value
      .trim();

  const notes =
    document
      .getElementById("adv-notes")
      .value
      .trim();

  if (!workerId)
    return showToast(
      "Select worker",
      "error"
    );

  if (amount <= 0)
    return showToast(
      "Invalid amount",
      "error"
    );

  await db
    .collection("advances")
    .add({
      workerId,
      amount,
      date,
      reason,
      notes,
      createdAt:
        new Date().toISOString()
    });

  showToast("Advance Saved");

  navigateTo("dashboard");
}

// =============================
// RECORDS
// =============================

function renderRecords(container) {

  container.innerHTML = `
  <div class="card">
    <h2>Records</h2>
    ${
      advances.map(a=>{

        const worker =
          workers.find(
            w=>w.id===a.workerId
          );

        return `
          <div
            style="padding:10px 0"
          >
            <strong>
              ${
                worker
                  ? worker.name
                  : "Unknown"
              }
            </strong>
            <br>
            ₹${a.amount}
            <br>
            ${a.reason || ""}
          </div>
        `;

      }).join("")
    }
  </div>
  `;
}

// =============================
// REPORTS
// =============================

function renderReports(container) {

  const total =
    advances.reduce(
      (s,a)=>
        s + Number(a.amount || 0),
      0
    );

  container.innerHTML = `
  <div class="card">

    <h2>Reports</h2>

    <h3>
      Total Advance:
      ₹${total}
    </h3>

    <br>

    <button
      onclick="exportJSON()"
    >
      Export JSON
    </button>

    <br><br>

    <button
      onclick="exportCSV()"
    >
      Export CSV
    </button>

  </div>
  `;
}

// =============================
// EXPORT JSON
// =============================

function exportJSON() {

  const data =
    JSON.stringify(
      {
        workers,
        advances
      },
      null,
      2
    );

  const blob =
    new Blob(
      [data],
      {
        type:
        "application/json"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;
  a.download =
    "contractor-backup.json";

  a.click();

  showToast("JSON Exported");
}

// =============================
// EXPORT CSV
// =============================

function exportCSV() {

  let csv =
    "Date,Worker,Amount,Reason\n";

  advances.forEach(a => {

    const worker =
      workers.find(
        w => w.id === a.workerId
      );

    csv +=
      `"${a.date}","${worker ? worker.name : ""}","${a.amount}","${a.reason || ""}"\n`;

  });

  const blob =
    new Blob(
      [csv],
      { type:"text/csv" }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    "advances.csv";

  link.click();

  showToast("CSV Exported");
}