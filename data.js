// ===== SIKKA Data Store — Dhay =====
var DB = {
  users: [
    {id:1, username:"admin", password:"admin123", role:"Administrator", name:"dhay"},
    {id:2, username:"staff1", password:"staff123", role:"Staff", name:"Danah"},
    {id:3, username:"staff2", password:"staff123", role:"Staff", name:"Lana"}
  ],
  schedules: [
    {id:"TRN-001", route:"RIYADH TO JEDDAH", dep:"Apr 3, 2026 9:41 AM", arr:"Apr 9, 2026 11:15 AM", seats:120, booked:63, price:50, status:"ACTIVE"},
    {id:"TRN-002", route:"JEDDAH TO RIYADH", dep:"May 9, 2026 7:00 PM", arr:"May 15, 2026 9:41 AM", seats:200, booked:200, price:90, status:"FULL"},
    {id:"TRN-003", route:"RIYADH TO DAMMAM", dep:"Apr 1, 2026 9:41 AM", arr:"Apr 3, 2026 3:30 AM", seats:80, booked:0, price:45, status:"ACTIVE"}
  ],
  passengers: [
    {id:1, name:"Fatima Khaldi", nid:"123670376", phone:"555893790", email:"Fatima@outlook.com"},
    {id:2, name:"Ahmad Fahad", nid:"114675376", phone:"5890679243", email:"Ahmad@outlook.com"}
  ],
  reservations: [
    {id:"#BK-00331", passenger:"Fatima khalid", train:"Riyadh Express", date:"10/03/2026", seat:"3D", status:"Confirmed"},
    {id:"#BK-00341", passenger:"Ahmad Fahad", train:"Dammam Shuttle", date:"14/05/2026", seat:"12B", status:"Cancelled"},
    {id:"#BK-00222", passenger:"Sara hamad", train:"Haramain Line", date:"28/10/2026", seat:"8C", status:"Confirmed"},
    {id:"#BK-00677", passenger:"Waad Ahmed", train:"Haramain Line", date:"03/03/2026", seat:"7A", status:"Confirmed"},
    {id:"#BK-00444", passenger:"Layan Faisal", train:"Haramain Line", date:"30/06/2026", seat:"10A", status:"Confirmed"},
    {id:"#BK-00514", passenger:"Ghada khalid", train:"Haramain Line", date:"19/04/2026", seat:"3B", status:"Confirmed"},
    {id:"#BK-00446", passenger:"Hasan Ibrahem", train:"Dammam Shuttle", date:"20/8/2026", seat:"3F", status:"Confirmed"}
  ],
  reports: [
    {name:"DAILY BOOKING REPORT", date:"Apr 3, 2026", time:"9:41 AM", type:"DAILY", cat:"BOOKINGS", bookings:35, revenue:"1900 SAR", size:"124KB"},
    {name:"DAILY REVENUE REPORT", date:"May 9, 2026", time:"7:00 PM", type:"DAILY", cat:"REVENUE", bookings:35, revenue:"499 SAR", size:"98KB"},
    {name:"WEEKLY SUMMARY REPORT", date:"Apr 1, 2026", time:"9:41 AM", type:"WEEKLY", cat:"SUMMARY", bookings:50, revenue:"2900 SAR", size:"340KB"},
    {name:"MONTHLY REVENUE REPORT", date:"Apr 9, 2026", time:"11:15 AM", type:"MONTHLY", cat:"REVENUE", bookings:100, revenue:"28000 SAR", size:"812KB"},
    {name:"MONTHLY CANCELLATION REPORT", date:"May 15, 2026", time:"9:41 AM", type:"MONTHLY", cat:"CANCELLATIONS", bookings:10, revenue:"- SAR", size:"210KB"},
    {name:"TRAIN UTILIZATION REPORT", date:"Apr 3, 2026", time:"3:30 AM", type:"CUSTOM", cat:"UTILIZATION", bookings:98, revenue:"71300 SAR", size:"540KB"}
  ],
  auditLog: [
    {time:"2026-04-01 08:00", user:"admin", action:"Login", detail:"Admin logged in"},
    {time:"2026-04-01 08:15", user:"admin", action:"Create Schedule", detail:"Created TRN-001"},
    {time:"2026-04-01 09:00", user:"staff1", action:"Register Passenger", detail:"Registered Fatima Khaldi"},
    {time:"2026-04-01 09:30", user:"staff1", action:"Book Ticket", detail:"Booked #BK-00331"},
    {time:"2026-04-02 10:00", user:"staff1", action:"Cancel Reservation", detail:"Cancelled #BK-00341"},
    {time:"2026-04-03 08:00", user:"system", action:"Backup", detail:"Daily backup completed"}
  ],
  nextRes: 447,
  nextPass: 3
};

var currentUser = null;
var currentPage = "dashboard";

// Badge helper
function bdg(text, cls) {
  var c = cls || "bg";
  var map = {Confirmed:"bg", ACTIVE:"bg", Cancelled:"br", FULL:"br", ARCHIVE:"by",
    DAILY:"bg", WEEKLY:"bb", MONTHLY:"by", CUSTOM:"bg", Administrator:"bb", Staff:"bg"};
  if (!cls) c = map[text] || "bg";
  return '<span class="badge ' + c + '">' + text + '</span>';
}

// Pagination helper
function pgn() {
  return '<div class="pg">&larr; Previous <span class="pg-a">1</span> 2 3 ... 67 68 Next &rarr;</div>';
}

// Top nav
function topNav() {
  return '<div class="top-nav"><span>ABOUT</span><span>SERVICES</span><span>BLOG</span><span>CONTACT</span></div>';
}

// S-01: Login
function handleLogin() {
  var u = document.getElementById("loginUser").value;
  var p = document.getElementById("loginPass").value;
  var err = document.getElementById("loginError");
  if (!u || !p) { err.textContent = "incorrect username or password"; return; }
  var found = null;
  for (var i = 0; i < DB.users.length; i++) {
    if (DB.users[i].username === u && DB.users[i].password === p) { found = DB.users[i]; break; }
  }
  if (!found) { err.textContent = "incorrect username or password"; return; }
  currentUser = found;
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("appPage").style.display = "flex";
  document.getElementById("sidebarName").textContent = found.name;
  document.getElementById("sidebarRole").textContent = found.role;
  navigate("dashboard");
}

function logout() {
  currentUser = null;
  document.getElementById("appPage").style.display = "none";
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
  document.getElementById("loginError").textContent = "";
}

// Navigation
function navigate(page) {
  currentPage = page;
  document.querySelectorAll(".nav-link").forEach(function(a) { a.classList.remove("active"); });
  var link = document.querySelector('[data-page="' + page + '"]');
  if (link) link.classList.add("active");
  var mc = document.getElementById("mainContent");
  switch(page) {
    case "dashboard": mc.innerHTML = renderDashboard(); break;
    case "schedules": mc.innerHTML = renderSchedules(); break;
    case "reservations": mc.innerHTML = renderReservations(); break;
    case "passengers": mc.innerHTML = renderPassengers(); break;
    case "booking": mc.innerHTML = renderBooking(); break;
    case "reports": mc.innerHTML = renderReports(); break;
    case "users": mc.innerHTML = renderUsers(); break;
    case "audit": mc.innerHTML = renderAudit(); break;
    default: mc.innerHTML = renderDashboard();
  }
}

// Setup nav clicks
document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll(".nav-link").forEach(function(a) {
    a.addEventListener("click", function() { navigate(a.dataset.page); });
  });
  document.getElementById("loginPass").addEventListener("keydown", function(e) {
    if (e.key === "Enter") handleLogin();
  });
});
