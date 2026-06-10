// =====================================
// GLOBAL STATE
// =====================================

let workers = [];
let advances = [];
let attendance = [];

let currentPage = "dashboard";

let workersUnsub = null;
let advancesUnsub = null;
let attendanceUnsub = null;

// =====================================
// INIT APP
// =====================================

window.addEventListener(
  "load",
  async () => {

    updateTodayDate();

    await initializeRealtime();

    navigateTo("dashboard");

  }
);

// =====================================
// DATE
// =====================================

function updateTodayDate() {

  const el =
    document.getElementById(
      "today-date"
    );

  if (!el) return;

  el.innerText =
    new Date().toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );
}

// =====================================
// REALTIME LISTENERS
// =====================================

async function initializeRealtime() {

  if (workersUnsub)
    workersUnsub();

  if (advancesUnsub)
    advancesUnsub();

  if (attendanceUnsub)
    attendanceUnsub();

  workersUnsub =
    db.collection("workers")
    .orderBy("name")
    .onSnapshot(snapshot => {

      workers =
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

      renderCurrentPage();

    });

  advancesUnsub =
    db.collection("advances")
    .orderBy("date", "desc")
    .onSnapshot(snapshot => {

      advances =
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

      renderCurrentPage();

    });

  attendanceUnsub =
    db.collection("attendance")
    .onSnapshot(snapshot => {

      attendance =
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

      renderCurrentPage();

    });

}

// =====================================
// NAVIGATION
// =====================================

function navigateTo(page) {

  currentPage = page;

  document
    .querySelectorAll(".nav-btn")
    .forEach(btn =>
      btn.classList.remove("active")
    );

  const activeBtn =
    [...document.querySelectorAll(".nav-btn")]
      .find(btn =>
        btn.innerText
          .toLowerCase()
          .includes(page)
      );

  if (activeBtn)
    activeBtn.classList.add(
      "active"
    );

  renderCurrentPage();
}

// =====================================
// PAGE ROUTER
// =====================================

function renderCurrentPage() {

  const main =
    document.getElementById(
      "main-content"
    );

  if (!main) return;

  switch(currentPage) {

    case "dashboard":
      renderDashboard(main);
      break;

    case "workers":
      renderWorkers(main);
      break;

    case "attendance":
      renderAttendance(main);
      break;

    case "advance":
      renderAdvance(main);
      break;

    case "reports":
      renderReports(main);
      break;

    case "settings":
      renderSettings(main);
      break;
  }

}

// =====================================
// DASHBOARD
// =====================================

function renderDashboard(main) {

  const totalWorkers =
    workers.filter(
      w => w.active !== false
    ).length;

  const totalAdvance =
    advances.reduce(
      (sum,a)=>
      sum + Number(a.amount || 0),
      0
    );

  const currentMonth =
    new Date().getMonth();

  const monthlyAdvance =
    advances.filter(a => {

      const d =
        new Date(a.date);

      return (
        d.getMonth() === currentMonth
      );

    })
    .reduce(
      (sum,a)=>
      sum + Number(a.amount || 0),
      0
    );

  main.innerHTML = `

  <div class="stats-grid">

    <div class="stat-card">
      <div class="stat-value">
        ${totalWorkers}
      </div>
      <div class="stat-label">
        Workers
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-value">
        ₹${totalAdvance}
      </div>
      <div class="stat-label">
        Total Advance
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-value">
        ₹${monthlyAdvance}
      </div>
      <div class="stat-label">
        Monthly Advance
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-value">
        ${attendance.length}
      </div>
      <div class="stat-label">
        Attendance
      </div>
    </div>

  </div>

  <div class="card">

    <div class="card-title">
      Recent Transactions
    </div>

    ${
      advances.length === 0
      ? `<p>No Records Found</p>`
      : advances
          .slice(0,10)
          .map(a => {

            const worker =
              workers.find(
                w =>
                w.id === a.workerId
              );

            return `

            <div class="table-row">

              <div>
                <strong>
                  ${
                    worker
                    ? worker.name
                    : "Unknown"
                  }
                </strong>
                <br>
                <small>
                  ${a.date}
                </small>
              </div>

              <div>
                ₹${a.amount}
              </div>

            </div>

            `;

          }).join("")
    }

  </div>

  `;
}

// =====================================
// WORKERS PAGE
// =====================================

function renderWorkers(main) {

  main.innerHTML = `

  <div class="card">

    <button
      class="btn"
      onclick="openWorkerModal()"
    >
      + Add Worker
    </button>

    <br><br>

    <input
      id="worker-search"
      placeholder="Search Worker"
      onkeyup="searchWorkers()"
    >

  </div>

  <div id="workers-list">

  ${
    workers.map(worker => {

      const totalAdvance =
        advances
          .filter(
            a =>
            a.workerId === worker.id
          )
          .reduce(
            (s,a)=>
            s+Number(a.amount||0),
            0
          );

      const payable =
        Number(worker.salary)
        - totalAdvance;

      return `

      <div
        class="worker-card"
        onclick="viewWorker('${worker.id}')"
      >

        <div class="worker-name">
          ${worker.name}
        </div>

        <div class="worker-meta">

          Salary :
          ₹${worker.salary}

          <br>

          Advance :
          ₹${totalAdvance}

          <br>

          Payable :
          ₹${payable}

        </div>

      </div>

      `;

    }).join("")
  }

  </div>

  `;
}

// =====================================
// SEARCH WORKER
// =====================================

function searchWorkers() {

  const search =
    document
      .getElementById(
        "worker-search"
      )
      .value
      .toLowerCase();

  const list =
    document.getElementById(
      "workers-list"
    );

  const filtered =
    workers.filter(w =>
      w.name
        .toLowerCase()
        .includes(search)
    );

  list.innerHTML =
    filtered.map(worker => `

      <div
        class="worker-card"
        onclick="viewWorker('${worker.id}')"
      >

        <div class="worker-name">
          ${worker.name}
        </div>

        <div class="worker-meta">
          Salary :
          ₹${worker.salary}
        </div>

      </div>

    `).join("");
}

// =====================================
// ADD WORKER MODAL
// =====================================

function openWorkerModal() {

  document.getElementById(
    "modal-content"
  ).innerHTML = `

  <h2>Add Worker</h2>

  <br>

  <input
    id="worker-name"
    placeholder="Worker Name"
  >

  <input
    id="worker-salary"
    type="number"
    placeholder="Monthly Salary"
  >

  <input
    id="joining-date"
    type="date"
    value="${
      new Date()
      .toISOString()
      .split("T")[0]
    }"
  >

  <button
    class="btn"
    onclick="saveWorker()"
  >
    Save Worker
  </button>

  `;

  document.getElementById(
    "modal"
  ).style.display = "flex";
}

// =====================================
// SAVE WORKER
// =====================================

async function saveWorker() {

  const name =
    document
      .getElementById(
        "worker-name"
      )
      .value
      .trim();

  const salary =
    Number(
      document
      .getElementById(
        "worker-salary"
      )
      .value
    );

  const joiningDate =
    document
      .getElementById(
        "joining-date"
      )
      .value;

  if (!name) {

    showToast(
      "Enter Worker Name",
      "error"
    );

    return;
  }

  if (salary <= 0) {

    showToast(
      "Enter Salary",
      "error"
    );

    return;
  }

  await addWorker({

    name,
    salary,
    joiningDate,

    active:true,

    createdAt:
      new Date()
      .toISOString()

  });

  closeModal();

  showToast(
    "Worker Added"
  );

}




// =====================================
// CLOSE MODAL
// =====================================

function closeModal() {

  document.getElementById(
    "modal"
  ).style.display = "none";

}

// =====================================
// VIEW WORKER PROFILE
// =====================================

function viewWorker(workerId) {

  const worker =
    workers.find(
      w => w.id === workerId
    );

  if (!worker) return;

  const workerAdvances =
    advances.filter(
      a => a.workerId === workerId
    );

  const totalAdvance =
    workerAdvances.reduce(
      (sum,a)=>
      sum + Number(a.amount || 0),
      0
    );

  const payable =
    Number(worker.salary)
    - totalAdvance;

  const workerAttendance =
    attendance.filter(
      a => a.workerId === workerId
    );

  document.getElementById(
    "modal-content"
  ).innerHTML = `

  <h2>${worker.name}</h2>

  <br>

  <div class="worker-meta">

    Salary :
    ₹${worker.salary}

    <br><br>

    Total Advance :
    ₹${totalAdvance}

    <br><br>

    Payable :
    ₹${payable}

    <br><br>

    Attendance :
    ${workerAttendance.length}

  </div>

  <br>

  <button
    class="btn"
    onclick="editWorker('${worker.id}')"
  >
    Edit Worker
  </button>

  <br><br>

  <button
    class="btn btn-danger"
    onclick="removeWorker('${worker.id}')"
  >
    Delete Worker
  </button>

  <br><br>

  <h3>Transactions</h3>

  ${
    workerAdvances.length
    ? workerAdvances.map(a => `

      <div class="table-row">

        <div>
          ${a.date}
        </div>

        <div>
          ₹${a.amount}
        </div>

      </div>

    `).join("")
    : "<p>No Records</p>"
  }

  `;

  document.getElementById(
    "modal"
  ).style.display = "flex";
}

// =====================================
// EDIT WORKER
// =====================================

function editWorker(workerId) {

  const worker =
    workers.find(
      w => w.id === workerId
    );

  if (!worker) return;

  document.getElementById(
    "modal-content"
  ).innerHTML = `

  <h2>Edit Worker</h2>

  <br>

  <input
    id="edit-name"
    value="${worker.name}"
  >

  <input
    id="edit-salary"
    type="number"
    value="${worker.salary}"
  >

  <button
    class="btn"
    onclick="updateWorkerData('${worker.id}')"
  >
    Update Worker
  </button>

  `;

}

// =====================================
// UPDATE WORKER
// =====================================

async function updateWorkerData(
  workerId
) {

  const name =
    document
      .getElementById(
        "edit-name"
      )
      .value
      .trim();

  const salary =
    Number(
      document
        .getElementById(
          "edit-salary"
        )
        .value
    );

  await updateWorker(
    workerId,
    {
      name,
      salary
    }
  );

  closeModal();

  showToast(
    "Worker Updated"
  );

}

// =====================================
// DELETE WORKER
// =====================================

async function removeWorker(
  workerId
) {

  const ok =
    confirm(
      "Delete Worker?"
    );

  if (!ok) return;

  await deleteWorker(
    workerId
  );

  closeModal();

  showToast(
    "Worker Deleted"
  );

}

// =====================================
// ATTENDANCE PAGE
// =====================================

function renderAttendance(
  main
) {

  main.innerHTML = `

  <div class="card">

    <div class="card-title">

      Attendance

    </div>

    <select
      id="attendance-worker"
    >

      <option value="">
        Select Worker
      </option>

      ${
        workers.map(w => `
          <option
            value="${w.id}"
          >
            ${w.name}
          </option>
        `).join("")
      }

    </select>

    <div
      class="attendance-grid"
    >

      <button
        class="attendance-btn present"
        onclick="markAttendance('P')"
      >
        Present
      </button>

      <button
        class="attendance-btn absent"
        onclick="markAttendance('A')"
      >
        Absent
      </button>

      <button
        class="attendance-btn halfday"
        onclick="markAttendance('HD')"
      >
        Half Day
      </button>

      <button
        class="attendance-btn overtime"
        onclick="markAttendance('OT')"
      >
        Overtime
      </button>

    </div>

  </div>

  <div class="card">

    <div class="card-title">

      Today's Attendance

    </div>

    ${
      attendance
      .slice(-20)
      .reverse()
      .map(a => {

        const worker =
          workers.find(
            w =>
            w.id === a.workerId
          );

        return `

        <div class="table-row">

          <div>
            ${
              worker
              ? worker.name
              : "Unknown"
            }
          </div>

          <div>
            ${a.status}
          </div>

        </div>

        `;

      }).join("")
    }

  </div>

  `;
}

// =====================================
// MARK ATTENDANCE
// =====================================

async function markAttendance(
  status
) {

  const workerId =
    document
      .getElementById(
        "attendance-worker"
      )
      .value;

  if (!workerId) {

    showToast(
      "Select Worker",
      "error"
    );

    return;
  }

  await saveAttendance({

    workerId,

    status,

    date:
      new Date()
      .toISOString()
      .split("T")[0],

    createdAt:
      new Date()
      .toISOString()

  });

  showToast(
    "Attendance Saved"
  );

}





// =====================================
// ADVANCE PAGE
// =====================================

function renderAdvance(main) {

  main.innerHTML = `

  <div class="card">

    <div class="card-title">
      Advance Entry
    </div>

    <select id="advance-worker">

      <option value="">
        Select Worker
      </option>

      ${
        workers.map(w => `
          <option value="${w.id}">
            ${w.name}
          </option>
        `).join("")
      }

    </select>

    <input
      id="advance-amount"
      type="number"
      placeholder="Amount"
    >

    <input
      id="advance-date"
      type="date"
      value="${
        new Date()
          .toISOString()
          .split("T")[0]
      }"
    >

    <textarea
      id="advance-note"
      placeholder="Reason / Note"
    ></textarea>

    <button
      class="btn"
      onclick="saveAdvanceEntry()"
    >
      Save Advance
    </button>

  </div>

  <div class="card">

    <div class="card-title">
      Recent Advances
    </div>

    ${
      advances.slice(0,20).map(a => {

        const worker =
          workers.find(
            w => w.id === a.workerId
          );

        return `

        <div class="table-row">

          <div>

            <strong>
              ${worker ? worker.name : "Unknown"}
            </strong>

            <br>

            <small>
              ${a.note || ""}
            </small>

          </div>

          <div>

            ₹${a.amount}

          </div>

        </div>

        `;

      }).join("")
    }

  </div>

  `;
}

// =====================================
// SAVE ADVANCE
// =====================================

async function saveAdvanceEntry() {

  const workerId =
    document
      .getElementById("advance-worker")
      .value;

  const amount =
    Number(
      document
        .getElementById("advance-amount")
        .value
    );

  const date =
    document
      .getElementById("advance-date")
      .value;

  const note =
    document
      .getElementById("advance-note")
      .value
      .trim();

  if (!workerId) {
    showToast("Select Worker","error");
    return;
  }

  if (amount <= 0) {
    showToast("Invalid Amount","error");
    return;
  }

  await addAdvance({
    workerId,
    amount,
    date,
    note,
    createdAt:
      new Date().toISOString()
  });

  showToast("Advance Saved");
}

// =====================================
// REPORTS PAGE
// =====================================

function renderReports(main) {

  const totalAdvance =
    advances.reduce(
      (sum,a)=>
      sum + Number(a.amount||0),
      0
    );

  const totalSalary =
    workers.reduce(
      (sum,w)=>
      sum + Number(w.salary||0),
      0
    );

  const payable =
    totalSalary - totalAdvance;

  main.innerHTML = `

  <div class="report-card">

    <h2>Reports</h2>

    <br>

    <div class="table-row">
      <span>Total Salary</span>
      <strong>₹${totalSalary}</strong>
    </div>

    <div class="table-row">
      <span>Total Advance</span>
      <strong>₹${totalAdvance}</strong>
    </div>

    <div class="table-row">
      <span>Payable</span>
      <strong>₹${payable}</strong>
    </div>

  </div>

  <div class="card">

    <button
      class="btn"
      onclick="exportCSV()"
    >
      Export CSV
    </button>

    <br><br>

    <button
      class="btn btn-success"
      onclick="backupJSON()"
    >
      Backup JSON
    </button>

  </div>

  `;
}

// =====================================
// EXPORT CSV
// =====================================

function exportCSV() {

  let csv =
    "Worker,Amount,Date,Note\n";

  advances.forEach(a => {

    const worker =
      workers.find(
        w => w.id === a.workerId
      );

    csv +=
      `"${worker ? worker.name : ''}","${a.amount}","${a.date}","${a.note || ''}"\n`;

  });

  const blob =
    new Blob(
      [csv],
      {
        type:"text/csv"
      }
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

// =====================================
// JSON BACKUP
// =====================================

function backupJSON() {

  const data = {

    workers,
    advances,
    attendance,

    backupDate:
      new Date()
      .toISOString()

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
        "application/json"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "contractor-backup.json";

  link.click();

  showToast("Backup Downloaded");
}

// =====================================
// SETTINGS PAGE
// =====================================

function renderSettings(main) {

  main.innerHTML = `

  <div class="card">

    <div class="card-title">
      Settings
    </div>

    <button
      class="btn"
      onclick="backupJSON()"
    >
      Download Backup
    </button>

    <br><br>

    <button
      class="btn"
      onclick="exportCSV()"
    >
      Export CSV
    </button>

    <br><br>

    <button
      class="btn btn-danger"
      onclick="resetAppData()"
    >
      Reset Data
    </button>

  </div>

  `;
}

// =====================================
// RESET APP
// =====================================

async function resetAppData() {

  const ok =
    confirm(
      "Delete All Data?"
    );

  if (!ok) return;

  showToast(
    "Manual Reset Required",
    "error"
  );
}

// =====================================
// TOAST
// =====================================

function showToast(
  message,
  type = "success"
) {

  const toast =
    document.getElementById(
      "toast"
    );

  if (!toast) return;

  toast.innerText = message;

  toast.style.background =
    type === "error"
      ? "#dc2626"
      : "#16a34a";

  toast.classList.add(
    "show"
  );

  setTimeout(() => {

    toast.classList.remove(
      "show"
    );

  },2500);

}

// =====================================
// MODAL CLOSE CLICK
// =====================================

document.addEventListener(
  "click",
  (e) => {

    const modal =
      document.getElementById(
        "modal"
      );

    if (
      e.target === modal
    ) {

      closeModal();

    }

  }
);