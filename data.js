// ============================================================
// SIKKA Data Layer  (REAL Supabase version)
// Replaces the old in-memory DB. Requires (loaded BEFORE this file):
//   1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2   (global `supabase`)
//   2. supabaseClient.js                                       (global `supa`)
// Run sikka_schema.sql in Supabase first so the tables + seed rows exist.
// Open the site with Live Server (http://localhost:...) — NOT file:// —
// because password hashing needs a secure context.
// ============================================================

// Local cache. It is filled from Supabase by loadAll() and re-filled after
// every write, so the render functions can keep reading DB.* synchronously.
var DB = {
  users: [],
  schedules: [],
  passengers: [],
  reservations: [],
  auditLog: [],
  // "reports" are generated report files (display metadata) — kept static.
  // The live numbers on the Reports page (trends, utilisation, today's stats)
  // are computed from the REAL reservations/schedules below.
  reports: [
    {name:"DAILY BOOKING REPORT",       date:"Apr 3, 2026",  time:"9:41 AM",  type:"DAILY",   cat:"BOOKINGS",      bookings:35,  revenue:"1900 SAR",  size:"124KB"},
    {name:"DAILY REVENUE REPORT",       date:"May 9, 2026",  time:"7:00 PM",  type:"DAILY",   cat:"REVENUE",       bookings:35,  revenue:"499 SAR",   size:"98KB"},
    {name:"WEEKLY SUMMARY REPORT",      date:"Apr 1, 2026",  time:"9:41 AM",  type:"WEEKLY",  cat:"SUMMARY",       bookings:50,  revenue:"2900 SAR",  size:"340KB"},
    {name:"MONTHLY REVENUE REPORT",     date:"Apr 9, 2026",  time:"11:15 AM", type:"MONTHLY", cat:"REVENUE",       bookings:100, revenue:"28000 SAR", size:"812KB"},
    {name:"MONTHLY CANCELLATION REPORT",date:"May 15, 2026", time:"9:41 AM",  type:"MONTHLY", cat:"CANCELLATIONS", bookings:10,  revenue:"- SAR",     size:"210KB"},
    {name:"TRAIN UTILIZATION REPORT",   date:"Apr 3, 2026",  time:"3:30 AM",  type:"CUSTOM",  cat:"UTILIZATION",   bookings:98,  revenue:"71300 SAR", size:"540KB"}
  ]
};

var currentUser = null;
var currentPage = "dashboard";

// ---------- small helpers ----------

// SHA-256(text) as lowercase hex. Matches how passwords are stored:
// stored hash = sha256Hex(salt + password).
async function sha256Hex(text) {
  var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  var arr = Array.from(new Uint8Array(buf));
  return arr.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}

// Report a Supabase error to the user; returns true if there WAS an error.
function dbErr(res, where) {
  if (res && res.error) {
    alert("Database error in " + where + ":\n" + res.error.message);
    return true;
  }
  return false;
}

// Next reservation id in the "#BK-00000" format, based on real rows.
function nextResId() {
  var max = 0;
  for (var i = 0; i < DB.reservations.length; i++) {
    var m = String(DB.reservations[i].id || "").match(/(\d+)/);
    if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
  }
  return "#BK-" + String(max + 1).padStart(5, "0");
}

// Badge helper (unchanged from your original)
function bdg(text, cls) {
  var c = cls || "bg";
  var map = {Confirmed:"bg", ACTIVE:"bg", Cancelled:"br", FULL:"br", ARCHIVE:"by",
    DAILY:"bg", WEEKLY:"bb", MONTHLY:"by", CUSTOM:"bg", Administrator:"bb", Staff:"bg"};
  if (!cls) c = map[text] || "bg";
  return '<span class="badge ' + c + '">' + text + '</span>';
}
var badge = bdg; // alias so both names work

function pgn() {
  return '<div class="pg">&larr; Previous <span class="pg-a">1</span> 2 3 ... 67 68 Next &rarr;</div>';
}
var pagination = pgn;

function topNav() {
  return '<div class="top-nav"><span>ABOUT</span><span>SERVICES</span><span>BLOG</span><span>CONTACT</span></div>';
}

// ---------- load everything from Supabase into DB ----------
async function loadAll() {
  var r = await Promise.all([
    supa.from("users").select("*").order("id"),
    supa.from("schedules").select("*").order("id"),
    supa.from("passengers").select("*").order("id"),
    supa.from("reservations").select("*"),
    supa.from("audit_log").select("*").order("ts")
  ]);
  var u = r[0], s = r[1], p = r[2], rv = r[3], a = r[4];
  if (dbErr(u,"load users") || dbErr(s,"load schedules") || dbErr(p,"load passengers") ||
      dbErr(rv,"load reservations") || dbErr(a,"load audit_log")) return;

  DB.users        = u.data  || [];
  DB.schedules    = s.data  || [];
  DB.passengers   = p.data  || [];
  DB.reservations = rv.data || [];
  DB.auditLog     = (a.data || []).map(function (x) {
    return { time: x.ts, user: x.actor, action: x.action, detail: x.detail };
  });
}

// ---------- S-01: Login (real, hashed) ----------
async function handleLogin() {
  var uname = document.getElementById("loginUser").value.trim();
  var pw    = document.getElementById("loginPass").value;
  var err   = document.getElementById("loginError");
  err.textContent = "";

  if (!uname || !pw) { err.textContent = "incorrect username or password"; return; }

  var res = await supa.from("users").select("*").eq("username", uname);
  if (dbErr(res, "login")) return;
  var user = res.data && res.data[0];

  if (!user) { err.textContent = "incorrect username or password"; return; }

  var attempt = await sha256Hex(user.salt + pw);
  if (attempt !== user.hash) { err.textContent = "incorrect username or password"; return; }

  currentUser = user;
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("appPage").style.display = "flex";
  document.getElementById("sidebarName").textContent = user.name;
  document.getElementById("sidebarRole").textContent = user.role;

  // record the login in the real audit trail (S-27)
  await supa.from("audit_log").insert({ actor: user.username, action: "Login", detail: user.name + " logged in" });

  await navigate("dashboard");
}

function logout() {
  currentUser = null;
  document.getElementById("appPage").style.display = "none";
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
  document.getElementById("loginError").textContent = "";
}

// ---------- Navigation ----------
// Every page reload pulls fresh data from Supabase, then renders. This is
// what makes writes appear instantly and survive a browser refresh.
async function navigate(page) {
  currentPage = page;
  document.querySelectorAll(".nav-link").forEach(function (a) { a.classList.remove("active"); });
  var link = document.querySelector('[data-page="' + page + '"]');
  if (link) link.classList.add("active");

  var mc = document.getElementById("mainContent");
  mc.innerHTML = '<div style="padding:24px;color:#999">Loading…</div>';

  await loadAll();

  switch (page) {
    case "dashboard":    mc.innerHTML = renderDashboard();    break;
    case "schedules":    mc.innerHTML = renderSchedules();    break;
    case "reservations": mc.innerHTML = renderReservations(); break;
    case "passengers":   mc.innerHTML = renderPassengers();   break;
    case "booking":      mc.innerHTML = renderBooking();      break;
    case "reports":      mc.innerHTML = renderReports();      break;
    case "users":        mc.innerHTML = renderUsers();        break;
    case "audit":        mc.innerHTML = renderAudit();        break;
    default:             mc.innerHTML = renderDashboard();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".nav-link").forEach(function (a) {
    a.addEventListener("click", function () { navigate(a.dataset.page); });
  });
  var lp = document.getElementById("loginPass");
  if (lp) lp.addEventListener("keydown", function (e) { if (e.key === "Enter") handleLogin(); });
});