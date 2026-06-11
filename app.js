import {
db,
authListener,
loginWithGoogle,
logoutUser
} from "./firebase.js";

import {
collection,
addDoc,
getDocs,
getDoc,
doc,
updateDoc,
deleteDoc,
query,
orderBy,
onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ==========================
   GLOBAL STATE
========================== */

let currentPage = "dashboard";

let workers = [];
let advances = [];
let attendance = [];

let currentUser = null;

/* ==========================
   LOADING SCREEN
========================== */

window.addEventListener("load", () => {

setTimeout(() => {

const loading =
document.getElementById(
"loadingScreen"
);

if (loading) {
loading.style.display = "none";
}

}, 1500);

});

/* ==========================
   DATE
========================== */

const todayDate =
document.getElementById(
"todayDate"
);

if (todayDate) {

todayDate.innerText =
new Date().toLocaleDateString(
"en-IN",
{
weekday:"long",
day:"numeric",
month:"long",
year:"numeric"
}
);

}

/* ==========================
   TOAST
========================== */

function showToast(
message,
type = "success"
){

const container =
document.getElementById(
"toastContainer"
);

const toast =
document.createElement("div");

toast.className =
"toast";

toast.innerHTML = `
<strong>${type.toUpperCase()}</strong>
<br>
${message}
`;

container.appendChild(toast);

setTimeout(() => {

toast.remove();

},3000);

}

/* ==========================
   MODAL
========================== */

function openModal(html){

const modal =
document.getElementById(
"globalModal"
);

const body =
document.getElementById(
"modalBody"
);

body.innerHTML = html;

modal.classList.remove(
"hidden"
);

}

function closeModal(){

document
.getElementById(
"globalModal"
)
.classList.add(
"hidden"
);

}

window.closeModal =
closeModal;

/* ==========================
   AUTH
========================== */

authListener((user)=>{

if(user){

currentUser = user;

showToast(
`Welcome ${user.displayName}`
);

loadRealtimeData();

}else{

showLoginScreen();

}

});

function showLoginScreen(){

openModal(`

<h2 style="margin-bottom:15px;">
Login Required
</h2>

<button
class="btn btn-primary"
id="googleLoginBtn">

Google Login

</button>

`);

document
.getElementById(
"googleLoginBtn"
)
.onclick = async ()=>{

try{

await loginWithGoogle();

closeModal();

}catch(err){

showToast(
"Login Failed",
"error"
);

}

};

}

/* ==========================
   REALTIME FIREBASE
========================== */

function loadRealtimeData(){

onSnapshot(

collection(db,"workers"),

(snapshot)=>{

workers =
snapshot.docs.map(
doc=>({
id:doc.id,
...doc.data()
})
);

updateDashboard();

if(
currentPage==="workers"
){
renderWorkers();
}

}

);

onSnapshot(

collection(db,"advances"),

(snapshot)=>{

advances =
snapshot.docs.map(
doc=>({
id:doc.id,
...doc.data()
})
);

updateDashboard();

}

);

onSnapshot(

collection(db,"attendance"),

(snapshot)=>{

attendance =
snapshot.docs.map(
doc=>({
id:doc.id,
...doc.data()
})
);

updateDashboard();

}

);

}

/* ==========================
   DASHBOARD
========================== */

function updateDashboard(){

const totalWorkers =
workers.length;

const activeWorkers =
workers.filter(
w=>w.status==="Active"
).length;

const today =
new Date()
.toISOString()
.split("T")[0];

const todayAdvance =
advances
.filter(
a=>a.date===today
)
.reduce(
(sum,a)=>
sum+Number(a.amount),
0
);

const monthlyAdvance =
advances.reduce(
(sum,a)=>
sum+Number(a.amount),
0
);

setText(
"totalWorkers",
totalWorkers
);

setText(
"activeWorkers",
activeWorkers
);

setText(
"todayAdvance",
`₹${todayAdvance}`
);

setText(
"monthlyAdvance",
`₹${monthlyAdvance}`
);

generateAIInsights();

}

/* ==========================
   AI INSIGHTS
========================== */

function generateAIInsights(){

const box =
document.getElementById(
"aiInsights"
);

if(!box) return;

const active =
workers.filter(
w=>w.status==="Active"
).length;

const totalAdv =
advances.reduce(
(s,a)=>
s+Number(a.amount),
0
);

box.innerHTML = `

<div class="ai-card">

👷 Active Workers:
<b>${active}</b>

<br><br>

💰 Total Advances:
<b>₹${totalAdv}</b>

<br><br>

🤖 AI Suggestion:

${
totalAdv > 50000
?
"Expenses are high this month."
:
"Expenses are under control."
}

</div>

`;

}

/* ==========================
   HELPERS
========================== */

function setText(id,value){

const el =
document.getElementById(id);

if(el){
el.textContent = value;
}

}

/* ==========================
   NAVIGATION
========================== */

document
.querySelectorAll(
".nav-item"
)
.forEach(btn=>{

btn.addEventListener(
"click",
()=>{

document
.querySelectorAll(
".nav-item"
)
.forEach(
n=>n.classList.remove(
"active"
)
);

btn.classList.add(
"active"
);

currentPage =
btn.dataset.page;

renderPage();

}
);

});

function renderPage(){

switch(currentPage){

case "dashboard":

renderDashboard();

break;

case "workers":

renderWorkers();

break;

case "attendance":

renderAttendance();

break;

case "advance":

renderAdvance();

break;

case "reports":

renderReports();

break;

}

}



/* ==========================
   WORKERS PAGE
========================== */

function renderWorkers(){

const content =
document.getElementById(
"mainContent"
);

content.innerHTML = `

<div class="card">

<div class="card-title">
👷 Worker Management
</div>

<input
type="text"
id="workerSearch"
placeholder="Search Worker..."
>

<div id="workersList"></div>

</div>

`;

renderWorkersList();

document
.getElementById(
"workerSearch"
)
.addEventListener(
"input",
renderWorkersList
);

}

/* ==========================
   WORKER LIST
========================== */

function renderWorkersList(){

const box =
document.getElementById(
"workersList"
);

if(!box) return;

const search =
(
document.getElementById(
"workerSearch"
)?.value || ""
)
.toLowerCase();

const filtered =
workers.filter(w=>{

return (
w.name || ""
)
.toLowerCase()
.includes(search);

});

box.innerHTML =
filtered.map(worker=>`

<div class="worker-card">

<div class="worker-info">

<h3>
${worker.name}
</h3>

<p>
${worker.mobile || ""}
</p>

<p>
${worker.trade || ""}
</p>

</div>

<div>

<span class="
status-badge
${worker.status==="Active"
?
"active"
:
"inactive"
}
">

${worker.status}

</span>

<br><br>

<button
class="btn btn-primary"
onclick="
editWorker(
'${worker.id}'
)
">

Edit

</button>

<br><br>

<button
class="btn btn-danger"
onclick="
deleteWorkerData(
'${worker.id}'
)
">

Delete

</button>

</div>

</div>

`).join("");

}

/* ==========================
   FAB BUTTON
========================== */

const fabBtn =
document.getElementById(
"fabBtn"
);

if(fabBtn){

fabBtn.onclick = ()=>{

if(
currentPage==="workers"
){

showWorkerForm();

return;

}

if(
currentPage==="advance"
){

showAdvanceForm();

return;

}

if(
currentPage==="attendance"
){

showAttendanceForm();

return;

}

};

}

/* ==========================
   ADD WORKER
========================== */

function showWorkerForm(){

openModal(`

<h2>
Add Worker
</h2>

<input
id="workerName"
placeholder="Full Name"
>

<input
id="workerMobile"
placeholder="Mobile Number"
>

<input
id="workerTrade"
placeholder="Trade"
>

<select
id="workerStatus"
>

<option>
Active
</option>

<option>
Inactive
</option>

</select>

<button
class="btn btn-success"
id="saveWorkerBtn"
>

Save Worker

</button>

`);

document
.getElementById(
"saveWorkerBtn"
)
.onclick =
saveWorker;

}

/* ==========================
   SAVE WORKER
========================== */

async function saveWorker(){

const name =
document.getElementById(
"workerName"
).value.trim();

const mobile =
document.getElementById(
"workerMobile"
).value.trim();

const trade =
document.getElementById(
"workerTrade"
).value.trim();

const status =
document.getElementById(
"workerStatus"
).value;

if(!name){

showToast(
"Worker Name Required",
"error"
);

return;

}

try{

await addDoc(

collection(
db,
"workers"
),

{
name,
mobile,
trade,
status,
createdAt:
new Date()
.toISOString()
}

);

showToast(
"Worker Added"
);

closeModal();

}catch(err){

console.error(err);

showToast(
"Save Failed",
"error"
);

}

}

/* ==========================
   EDIT WORKER
========================== */

window.editWorker =
async function(id){

const worker =
workers.find(
w=>w.id===id
);

if(!worker)
return;

openModal(`

<h2>
Edit Worker
</h2>

<input
id="editName"
value="${worker.name}"
>

<input
id="editMobile"
value="${worker.mobile || ""}"
>

<input
id="editTrade"
value="${worker.trade || ""}"
>

<select
id="editStatus"
>

<option
${worker.status==="Active"
?
"selected"
:
""}
>

Active

</option>

<option
${worker.status==="Inactive"
?
"selected"
:
""}
>

Inactive

</option>

</select>

<button
class="btn btn-success"
id="updateWorkerBtn"
>

Update Worker

</button>

`);

document
.getElementById(
"updateWorkerBtn"
)
.onclick =
()=>updateWorker(id);

};

/* ==========================
   UPDATE WORKER
========================== */

async function updateWorker(id){

try{

await updateDoc(

doc(
db,
"workers",
id
),

{
name:
document
.getElementById(
"editName"
)
.value,

mobile:
document
.getElementById(
"editMobile"
)
.value,

trade:
document
.getElementById(
"editTrade"
)
.value,

status:
document
.getElementById(
"editStatus"
)
.value
}

);

showToast(
"Worker Updated"
);

closeModal();

}catch(err){

console.error(err);

showToast(
"Update Failed",
"error"
);

}

}

/* ==========================
   DELETE WORKER
========================== */

window.deleteWorkerData =
async function(id){

const confirmDelete =
confirm(
"Delete Worker?"
);

if(
!confirmDelete
)
return;

try{

await deleteDoc(

doc(
db,
"workers",
id
)

);

showToast(
"Worker Deleted"
);

}catch(err){

console.error(err);

showToast(
"Delete Failed",
"error"
);

}

};

/* ==========================
   DASHBOARD PAGE
========================== */

function renderDashboard(){

const content =
document.getElementById(
"mainContent"
);

content.innerHTML = `

<div class="card">

<div class="card-title">
📊 Quick Overview
</div>

<p>
Total Workers :
<b>
${workers.length}
</b>
</p>

<br>

<p>
Total Advances :
<b>
${advances.length}
</b>
</p>

<br>

<p>
Attendance Entries :
<b>
${attendance.length}
</b>
</p>

</div>

<div class="chart-box">

<canvas
id="dashboardChart"
></canvas>

</div>

`;

setTimeout(
loadDashboardChart,
300
);

}

/* ==========================
   CHART
========================== */

function loadDashboardChart(){

const chartCanvas =
document.getElementById(
"dashboardChart"
);

if(!chartCanvas)
return;

new Chart(
chartCanvas,
{
type:"bar",
data:{
labels:[
"Workers",
"Advances",
"Attendance"
],
datasets:[
{
data:[
workers.length,
advances.length,
attendance.length
]
}
]
}
}
);

}


/* ==========================
   ATTENDANCE PAGE
========================== */

function renderAttendance(){

const content =
document.getElementById(
"mainContent"
);

content.innerHTML = `

<div class="card">

<div class="card-title">
📅 Attendance
</div>

<div id="attendanceWorkers">
</div>

</div>

`;

const box =
document.getElementById(
"attendanceWorkers"
);

box.innerHTML =
workers.map(worker=>`

<div class="worker-card">

<div>

<b>
${worker.name}
</b>

<br>

${worker.trade || ""}

</div>

<select
id="att_${worker.id}"
>

<option>
Present
</option>

<option>
Absent
</option>

<option>
Half Day
</option>

</select>

</div>

`).join("");

box.innerHTML += `

<button
class="btn btn-success"
onclick="saveAttendance()"
>

Save Attendance

</button>

`;

}

/* ==========================
   SAVE ATTENDANCE
========================== */

window.saveAttendance =
async function(){

const today =
new Date()
.toISOString()
.split("T")[0];

try{

for(const worker of workers){

const status =
document.getElementById(
`att_${worker.id}`
).value;

await addDoc(

collection(
db,
"attendance"
),

{
workerId:
worker.id,

workerName:
worker.name,

status,

date:today,

createdAt:
Date.now()
}

);

}

showToast(
"Attendance Saved"
);

}catch(err){
