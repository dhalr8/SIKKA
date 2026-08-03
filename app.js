// ============================================================
// SIKKA Application Logic  (REAL Supabase version)
// Render functions read from the DB cache (filled by loadAll()).
// Every ACTION that changes data now writes to Supabase, then calls
// navigate(page) which reloads from the DB and re-renders.
// ============================================================


// ============================================================
// LANA — Dashboard + Users + Audit
// ============================================================

function renderDashboard() {
  var conf = 0;
  for (var i = 0; i < DB.reservations.length; i++) {
    if (DB.reservations[i].status === "Confirmed") conf++;
  }
  var revenue = 0;
  for (var i = 0; i < DB.reservations.length; i++) {
    if (DB.reservations[i].status === "Confirmed" && DB.reservations[i].price) revenue += Number(DB.reservations[i].price);
  }

  var h = topNav() + '<h2>Dashboard</h2>';
  h += '<div class="stats-row">';
  h += '<div class="stat-card"><div class="stat-val">' + DB.schedules.length + '</div><div class="stat-lbl">Trains</div></div>';
  h += '<div class="stat-card"><div class="stat-val">' + DB.passengers.length + '</div><div class="stat-lbl">Passengers</div></div>';
  h += '<div class="stat-card"><div class="stat-val">' + conf + '</div><div class="stat-lbl">Bookings</div></div>';
  h += '<div class="stat-card"><div class="stat-val">' + revenue + '</div><div class="stat-lbl">Revenue (SAR)</div></div>';
  h += '</div>';
  h += '<div style="display:flex;gap:16px;flex-wrap:wrap">';
  h += '<div class="card" style="flex:1 1 380px;padding:16px"><div style="font-size:13px;font-weight:600;color:#4CAF50;margin-bottom:12px">Train Occupancy</div>';
  for (var i = 0; i < DB.schedules.length; i++) {
    var s = DB.schedules[i];
    var pct = Math.round(s.booked / s.seats * 100);
    var col = pct >= 100 ? "#e53935" : pct >= 50 ? "#FF9800" : "#4CAF50";
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
    h += '<span style="width:110px;font-size:11px">' + s.route.split(" TO ")[0] + '</span>';
    h += '<div class="bar-bg"><div class="bar-fill" style="width:' + pct + '%;background:' + col + '"></div></div>';
    h += '<span style="font-size:11px;font-weight:600;width:35px">' + pct + '%</span></div>';
  }
  h += '</div>';
  h += '<div class="card" style="flex:1 1 250px;padding:16px"><div style="font-size:13px;font-weight:600;margin-bottom:12px">Alerts</div>';
  h += '<div style="background:#FFEBEE;border-radius:5px;padding:6px 10px;font-size:10px;font-weight:600;color:#e53935;margin-bottom:10px">Full Trains</div>';
  var anyFull = false;
  for (var i = 0; i < DB.schedules.length; i++) {
    if (DB.schedules[i].booked >= DB.schedules[i].seats) {
      h += '<div style="font-size:12px;padding:6px 0">🚆 ' + DB.schedules[i].route + ' is full</div>';
      anyFull = true;
    }
  }
  if (!anyFull) h += '<div style="font-size:12px;padding:6px 0;color:#999">No full trains.</div>';
  h += '</div></div>';
  return h;
}

function renderUsers() {
  var h = topNav() + '<h2>User Management (S-02 / S-03)</h2>';
  h += '<div class="card"><table><thead><tr><th>USERNAME</th><th>ROLE</th><th>NAME</th><th>ACTIONS</th></tr></thead><tbody>';
  for (var i = 0; i < DB.users.length; i++) {
    var u = DB.users[i];
    h += '<tr><td><b>' + u.username + '</b></td><td>' + bdg(u.role) + '</td><td>' + u.name + '</td>';
    h += '<td><button class="btn btn-o btn-sm" onclick="assignRole(' + u.id + ')">Role</button> ';
    h += '<button class="btn btn-sm" style="background:#FF9800;color:white;border:none" onclick="resetPass(' + u.id + ')">Reset</button></td></tr>';
  }
  h += '</tbody></table></div>';
  return h;
}

// S-02: Assign role (writes to DB)
async function assignRole(id) {
  var u = DB.users.find(function (x) { return x.id === id; });
  if (!u) return;
  var nr = prompt("Role for " + u.username + " (Administrator / Staff):", u.role);
  if (nr !== "Administrator" && nr !== "Staff") return;
  var res = await supa.from("users").update({ role: nr }).eq("id", id);
  if (dbErr(res, "assign role")) return;
  await supa.from("audit_log").insert({ actor: currentUser.username, action: "Assign Role", detail: u.username + " -> " + nr });
  navigate("users");
}

// S-03: Reset password (writes a new salted hash to DB)
async function resetPass(id) {
  var u = DB.users.find(function (x) { return x.id === id; });
  if (!u) return;
  var tmp = "temp" + Math.floor(1000 + Math.random() * 9000);
  var newHash = await sha256Hex(u.salt + tmp);
  var res = await supa.from("users").update({ hash: newHash }).eq("id", id);
  if (dbErr(res, "reset password")) return;
  await supa.from("audit_log").insert({ actor: currentUser.username, action: "Reset Password", detail: "Reset " + u.username });
  alert("Temporary password for " + u.username + ": " + tmp);
}

function renderAudit() {
  var h = topNav() + '<h2>Audit Log (S-26 / S-27)</h2>';
  h += '<button class="btn btn-g" onclick="runBackup()" style="margin-bottom:14px">Run Backup (S-26)</button>';
  h += '<div class="card"><table><thead><tr><th>TIMESTAMP</th><th>USER</th><th>ACTION</th><th>DETAILS</th></tr></thead><tbody>';
  for (var i = DB.auditLog.length - 1; i >= 0; i--) {
    var a = DB.auditLog[i];
    h += '<tr><td>' + new Date(a.time).toLocaleString() + '</td><td><b>' + a.user + '</b></td><td>' + bdg(a.action) + '</td><td>' + a.detail + '</td></tr>';
  }
  h += '</tbody></table></div>';
  return h;
}

// S-26: Backup (records an entry in the real audit_log)
async function runBackup() {
  var res = await supa.from("audit_log").insert({ actor: "system", action: "Backup", detail: "Database backup completed" });
  if (dbErr(res, "backup")) return;
  alert("Backup logged.\nTables: users, schedules, passengers, reservations, audit_log");
  navigate("audit");
}


// ============================================================
// DANAH — Schedules
// ============================================================

function renderSchedules() {
  var active = [], archived = [];
  for (var i = 0; i < DB.schedules.length; i++) {
    if (DB.schedules[i].status === "ARCHIVE") archived.push(DB.schedules[i]);
    else active.push(DB.schedules[i]);
  }
  var avgOcc = 0;
  for (var i = 0; i < DB.schedules.length; i++) avgOcc += DB.schedules[i].booked / DB.schedules[i].seats;
  avgOcc = DB.schedules.length ? Math.round(avgOcc / DB.schedules.length * 100) : 0;

  var h = topNav() + '<h2>Train Schedules</h2>';
  h += '<div class="stats-row">';
  h += '<div class="stat-card"><div class="stat-val">' + DB.schedules.length + '</div><div class="stat-lbl">TOTAL TRAINS</div></div>';
  h += '<div class="stat-card"><div class="stat-val">' + active.length + '</div><div class="stat-lbl">OPEN FOR BOOKING</div></div>';
  h += '<div class="stat-card"><div class="stat-val">' + avgOcc + '%</div><div class="stat-lbl">AVG OCCUPANCY</div></div>';
  h += '<div class="stat-card"><div class="stat-val">' + archived.length + '</div><div class="stat-lbl">ARCHIVES</div></div>';
  h += '</div>';

  h += '<div style="margin-bottom:14px">';
  h += '<button class="btn btn-g" onclick="showAddSched()">+ Add New Schedule</button> ';
  h += '<button class="btn btn-o" onclick="showArchived()">View Archived (S-08)</button>';
  h += '</div>';

  h += '<div id="addSchedForm" style="display:none" class="card" style="margin-bottom:14px"><div class="card-hdr">Create New Schedule (S-04)</div>';
  h += '<div style="padding:14px"><div id="schedMsg"></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  h += '<input id="sId" class="form-input" placeholder="Train ID (e.g. TRN-004)"/>';
  h += '<input id="sRoute" class="form-input" placeholder="Route (e.g. RIYADH TO MAKKAH)"/>';
  h += '<input id="sDep" class="form-input" placeholder="Departure (Apr 20, 2026 9:00 AM)"/>';
  h += '<input id="sArr" class="form-input" placeholder="Arrival (Apr 20, 2026 3:00 PM)"/>';
  h += '<input id="sSeats" class="form-input" type="number" placeholder="Total Seats"/>';
  h += '<input id="sPrice" class="form-input" type="number" placeholder="Price (SAR)"/>';
  h += '</div><button class="btn btn-g" onclick="addSchedule()" style="margin-top:6px">Create Schedule</button></div></div>';

  h += '<div id="archivedSection" style="display:none" class="card"><div class="card-hdr" style="color:#FF9800">Archived Schedules (S-08)</div>';
  if (archived.length === 0) {
    h += '<div style="padding:16px;text-align:center;color:#999">No archived schedules.</div>';
  } else {
    h += '<table><thead><tr><th>ID</th><th>ROUTE</th><th>SEATS</th><th>PRICE</th><th>STATUS</th></tr></thead><tbody>';
    for (var i = 0; i < archived.length; i++) {
      var s = archived[i];
      h += '<tr><td><b>' + s.id + '</b></td><td>' + s.route + '</td><td>' + s.seats + '</td><td>' + s.price + ' SAR</td><td>' + bdg("ARCHIVE") + '</td></tr>';
    }
    h += '</tbody></table>';
  }
  h += '</div>';

  h += '<div class="card"><div class="card-hdr">Active Schedules (S-07)</div>';
  h += '<table><thead><tr><th>TRAIN ID</th><th>ROUTE</th><th>DEPARTURE</th><th>ARRIVAL</th><th>SEATS</th><th>PRICE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>';
  for (var i = 0; i < active.length; i++) {
    var s = active[i];
    h += '<tr><td style="font-weight:600;color:#4CAF50">' + s.id + '</td><td>' + s.route + '</td>';
    h += '<td>' + s.dep + '</td><td>' + s.arr + '</td>';
    h += '<td>' + s.booked + '/' + s.seats + '</td><td><b>' + s.price + '</b> SAR</td>';
    h += '<td>' + bdg(s.status) + '</td>';
    h += '<td><span style="cursor:pointer;margin-right:6px" onclick="editSchedule(\'' + s.id + '\')">✏️</span>';
    h += '<span style="cursor:pointer" onclick="deleteSchedule(\'' + s.id + '\')">🗑</span></td></tr>';
  }
  h += '</tbody></table></div>' + pgn();
  return h;
}

function showAddSched() {
  var f = document.getElementById("addSchedForm");
  if (f) f.style.display = f.style.display === "none" ? "block" : "none";
}
function showArchived() {
  var f = document.getElementById("archivedSection");
  if (f) f.style.display = f.style.display === "none" ? "block" : "none";
}

// S-04: Create schedule (INSERT)
async function addSchedule() {
  var id = document.getElementById("sId").value.trim();
  var route = document.getElementById("sRoute").value.trim();
  var seats = document.getElementById("sSeats").value;
  var price = document.getElementById("sPrice").value;
  var msg = document.getElementById("schedMsg");

  if (!id || !route || !seats || !price) { msg.innerHTML = '<div class="alert-err">All fields required.</div>'; return; }
  if (DB.schedules.find(function (s) { return s.id === id; })) { msg.innerHTML = '<div class="alert-err">Train ID already exists.</div>'; return; }
  if (parseInt(seats, 10) <= 0 || parseFloat(price) <= 0) { msg.innerHTML = '<div class="alert-err">Seats and price must be positive.</div>'; return; }

  var res = await supa.from("schedules").insert({
    id: id, route: route,
    dep: document.getElementById("sDep").value || "Apr 20, 2026 9:00 AM",
    arr: document.getElementById("sArr").value || "Apr 20, 2026 3:00 PM",
    seats: parseInt(seats, 10), booked: 0, price: parseFloat(price), status: "ACTIVE"
  });
  if (dbErr(res, "create schedule")) return;
  await supa.from("audit_log").insert({ actor: currentUser.username, action: "Create Schedule", detail: "Created " + id });
  navigate("schedules");
}

// S-05: Edit price (UPDATE)
async function editSchedule(id) {
  var s = DB.schedules.find(function (x) { return x.id === id; });
  if (!s) return;
  var np = prompt("Update price for " + s.route + " (current: " + s.price + " SAR):", s.price);
  if (!np || isNaN(np)) return;
  var res = await supa.from("schedules").update({ price: parseFloat(np) }).eq("id", id);
  if (dbErr(res, "update schedule")) return;
  navigate("schedules");
}

// S-06: Archive (UPDATE status)
async function deleteSchedule(id) {
  if (!confirm("Archive schedule " + id + "?")) return;
  var res = await supa.from("schedules").update({ status: "ARCHIVE" }).eq("id", id);
  if (dbErr(res, "archive schedule")) return;
  await supa.from("audit_log").insert({ actor: currentUser.username, action: "Archive Schedule", detail: "Archived " + id });
  navigate("schedules");
}


// ============================================================
// MUNIRAH — Passengers
// ============================================================

function renderPassengers() {
  var h = topNav() + '<h2>Passengers</h2>';
  h += '<div style="background:#E8F5E9;border-radius:8px;padding:10px 14px;font-size:13px;font-weight:600;color:#4CAF50;margin-bottom:14px">Add New Passenger</div>';
  h += '<div class="card" style="padding:16px;max-width:550px;margin:0 auto 16px"><div id="passMsg"></div>';
  h += '<input id="pName" class="form-round" placeholder="Full Name"/>';
  h += '<input id="pNid" class="form-round" placeholder="National ID"/>';
  h += '<input id="pPhone" class="form-round" placeholder="phone"/>';
  h += '<input id="pEmail" class="form-round" placeholder="Email"/>';
  h += '<div style="text-align:center"><button class="btn btn-o" onclick="registerPass()">Register</button></div></div>';

  h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">';
  h += '<input id="passSearch" class="search-input" style="flex:1" placeholder="search passengers by name, ID, or email" oninput="filterPassengers()"/>';
  h += '</div>';

  h += '<div class="card"><table><thead><tr><th>NAME</th><th>ID</th><th>PHONE</th><th>EMAIL</th><th>STATUS</th><th>ACTIONS</th></tr></thead>';
  h += '<tbody id="passBody">';
  for (var i = 0; i < DB.passengers.length; i++) h += passRow(DB.passengers[i]);
  h += '</tbody></table></div>' + pgn();
  return h;
}

function passRow(p) {
  return '<tr><td>' + p.name + '</td><td>' + p.nid + '</td><td>' + p.phone + '</td><td>' + p.email + '</td>' +
    '<td>' + bdg("ACTIVE") + '</td>' +
    '<td><button class="btn btn-o btn-sm" onclick="editPassenger(' + p.id + ')">Edit</button></td></tr>';
}

// S-09: Register passenger (INSERT)
async function registerPass() {
  var name = document.getElementById("pName").value.trim();
  var nid = document.getElementById("pNid").value.trim();
  var phone = document.getElementById("pPhone").value.trim();
  var email = document.getElementById("pEmail").value.trim();
  var msg = document.getElementById("passMsg");

  if (!name || !nid || !phone) { msg.innerHTML = '<div class="alert-err">Name, ID, and phone are required.</div>'; return; }
  if (email && email.indexOf("@") === -1) { msg.innerHTML = '<div class="alert-err">Invalid email format.</div>'; return; }
  if (DB.passengers.find(function (p) { return p.nid === nid; })) { msg.innerHTML = '<div class="alert-err">Passenger with this ID already exists.</div>'; return; }

  // id is a serial column — do NOT send it; Supabase assigns it.
  var res = await supa.from("passengers").insert({ name: name, nid: nid, phone: phone, email: email || "" });
  if (dbErr(res, "register passenger")) return;
  await supa.from("audit_log").insert({ actor: currentUser.username, action: "Register Passenger", detail: "Registered " + name });
  navigate("passengers");
}

// S-10: Update passenger (UPDATE)
async function editPassenger(id) {
  var p = DB.passengers.find(function (x) { return x.id === id; });
  if (!p) return;
  var nn = prompt("Update name (" + p.name + "):", p.name);
  var np = prompt("Update phone (" + p.phone + "):", p.phone);
  var ne = prompt("Update email (" + p.email + "):", p.email);
  var res = await supa.from("passengers").update({
    name: nn || p.name, phone: np || p.phone, email: ne || p.email
  }).eq("id", id);
  if (dbErr(res, "update passenger")) return;
  navigate("passengers");
}

// S-11: Search (client-side over loaded rows — no DB round trip needed)
function filterPassengers() {
  var term = document.getElementById("passSearch").value.toLowerCase();
  var body = document.getElementById("passBody");
  var html = "";
  for (var i = 0; i < DB.passengers.length; i++) {
    var p = DB.passengers[i];
    if (p.name.toLowerCase().indexOf(term) !== -1 || String(p.nid).indexOf(term) !== -1 || (p.email || "").toLowerCase().indexOf(term) !== -1) {
      html += passRow(p);
    }
  }
  if (!html) html = '<tr><td colspan="6" style="text-align:center;color:#999;padding:16px">No passengers found.</td></tr>';
  body.innerHTML = html;
}


// ============================================================
// NAWAL — Booking
// ============================================================

function renderBooking() {
  var h = '<div style="text-align:center;padding:16px 0">';
  h += '<h2 style="text-decoration:underline;text-decoration-color:#4CAF50">Book Ticket</h2>';
  h += '<div class="bk-card"><div id="bookConf"></div><div id="bookMsg"></div>';

  h += '<div style="margin-bottom:10px;text-align:left"><label style="font-size:11px;font-weight:600">Select Passenger: <span style="font-size:9px;color:#777">(must be registered first)</span></label>';
  h += '<select id="bPass" class="bk-sel" style="margin-top:4px"><option value="">-- Select registered passenger --</option>';
  for (var i = 0; i < DB.passengers.length; i++) {
    var p = DB.passengers[i];
    h += '<option value="' + p.id + '">' + p.name + ' (' + p.nid + ')</option>';
  }
  h += '</select>';
  if (DB.passengers.length === 0) h += '<div style="font-size:10px;color:#e53935;margin-top:3px">No passengers registered. Go to Passengers page first.</div>';
  h += '</div>';

  h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:left">';
  h += '<div><div style="font-size:11px;font-weight:600;margin-bottom:3px">Select Train:</div><select id="bTrain" class="bk-sel"><option value="">-- Select --</option>';
  for (var i = 0; i < DB.schedules.length; i++) {
    var s = DB.schedules[i];
    if (s.status !== "ARCHIVE") h += '<option value="' + s.id + '">' + s.route + ' (' + (s.seats - s.booked) + ' left)</option>';
  }
  h += '</select></div>';
  h += '<div><div style="font-size:11px;font-weight:600;margin-bottom:3px">Ticket:</div><select class="bk-sel"><option>VIP ticket</option><option>Economy</option></select></div>';
  h += '<div><div style="font-size:11px;font-weight:600;margin-bottom:3px">Payment:</div><select class="bk-sel"><option>Wallet</option><option>Card</option><option>Cash</option></select></div>';
  h += '<div style="display:flex;align-items:flex-end;grid-column:1/4"><button class="bk-btn" onclick="bookTicket()">BOOK NOW</button></div>';
  h += '</div></div></div>';
  return h;
}

// S-13/S-14/S-15: Book (validate seats, INSERT reservation, UPDATE booked count)
async function bookTicket() {
  var passId = document.getElementById("bPass").value;
  var trainId = document.getElementById("bTrain").value;
  var msg = document.getElementById("bookMsg");
  var conf = document.getElementById("bookConf");

  if (!passId) { msg.innerHTML = '<div class="alert-err">Please select a registered passenger.</div>'; conf.innerHTML = ""; return; }
  if (!trainId) { msg.innerHTML = '<div class="alert-err">Please select a train.</div>'; conf.innerHTML = ""; return; }

  var s = DB.schedules.find(function (x) { return x.id === trainId; });
  if (!s) return;
  if (s.booked >= s.seats) { msg.innerHTML = '<div class="alert-err">No seats available on this train.</div>'; conf.innerHTML = ""; return; }

  var p = DB.passengers.find(function (x) { return x.id === parseInt(passId, 10); });
  var seat = String.fromCharCode(65 + Math.floor(Math.random() * 4)) + Math.floor(Math.random() * 40 + 1);
  var newId = nextResId();

  // 1) create the reservation
  var r1 = await supa.from("reservations").insert({
    id: newId, passenger: p.name, train: s.route, train_id: s.id,
    date: new Date().toLocaleDateString(), seat: seat, status: "Confirmed", price: s.price
  });
  if (dbErr(r1, "create reservation")) return;

  // 2) decrement available seats (booked + 1)
  var r2 = await supa.from("schedules").update({ booked: s.booked + 1 }).eq("id", s.id);
  if (dbErr(r2, "update seats")) return;

  await supa.from("audit_log").insert({ actor: currentUser.username, action: "Book Ticket", detail: "Booked " + newId });

  msg.innerHTML = "";
  conf.innerHTML = '<div class="confirm-box"><h2 style="margin-bottom:12px">Booking Confirmed!</h2>' +
    '<p style="font-size:13px;margin:4px 0">Passenger: ' + p.name + '</p>' +
    '<p style="font-size:13px;margin:4px 0">Booking ID: ' + newId + '</p>' +
    '<p style="font-size:13px;margin:4px 0">Train: ' + s.route + '</p>' +
    '<p style="font-size:13px;margin:4px 0">Seat: ' + seat + '</p>' +
    '<p style="font-size:13px;margin:4px 0">Price: ' + s.price + ' SAR</p>' +
    '<br><button class="btn btn-o" onclick="navigate(\'booking\')">Done</button></div>';
}


// ============================================================
// SARAH — Reservations + Reports
// ============================================================

var resFilter = "All";

function renderReservations() {
  var h = topNav() + '<h2>Reservations (S-12 / S-17)</h2>';
  h += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:14px;flex-wrap:wrap">';
  var filters = ["All", "Confirmed", "Cancelled"];
  for (var f = 0; f < filters.length; f++) {
    h += '<span class="filter-tab' + (filters[f] === resFilter ? ' active' : '') + '" onclick="resFilter=\'' + filters[f] + '\';navigate(\'reservations\')">' + filters[f] + '</span>';
  }
  h += '<input id="resSearch" class="search-input" style="flex:1;min-width:200px" placeholder="search by name, booking ID, or Train" oninput="filterReservations()"/>';
  h += '</div>';

  h += '<div class="card"><table><thead><tr><th>BOOKING ID</th><th>PASSENGER</th><th>TRAIN</th><th>DATE</th><th>SEAT</th><th>STATUS</th><th>ACTION</th></tr></thead>';
  h += '<tbody id="resBody">';
  for (var i = 0; i < DB.reservations.length; i++) {
    var r = DB.reservations[i];
    if (resFilter !== "All" && r.status !== resFilter) continue;
    h += resRow(r);
  }
  h += '</tbody></table></div>' + pgn();
  return h;
}

function resRow(r) {
  return '<tr><td><b>' + r.id + '</b></td><td>' + r.passenger + '</td><td>' + r.train + '</td><td>' + r.date + '</td><td><b>' + r.seat + '</b></td>' +
    '<td>' + bdg(r.status) + '</td>' +
    '<td>' + (r.status === "Confirmed" ? '<span class="btn-cancel" onclick="cancelRes(\'' + r.id + '\')">cancel</span>' : '') + '</td></tr>';
}

function filterReservations() {
  var term = document.getElementById("resSearch").value.toLowerCase();
  var body = document.getElementById("resBody");
  var html = "";
  for (var i = 0; i < DB.reservations.length; i++) {
    var r = DB.reservations[i];
    if (resFilter !== "All" && r.status !== resFilter) continue;
    if (term && r.passenger.toLowerCase().indexOf(term) === -1 && String(r.id).indexOf(term) === -1 && r.train.toLowerCase().indexOf(term) === -1) continue;
    html += resRow(r);
  }
  if (!html) html = '<tr><td colspan="7" style="text-align:center;color:#999;padding:16px">No reservations found.</td></tr>';
  body.innerHTML = html;
}

// S-16: Cancel reservation (UPDATE status, give the seat back)
async function cancelRes(id) {
  if (!confirm("Cancel reservation " + id + "?")) return;
  var r = DB.reservations.find(function (x) { return x.id === id; });
  if (!r) return;

  var res = await supa.from("reservations").update({ status: "Cancelled" }).eq("id", id);
  if (dbErr(res, "cancel reservation")) return;

  // release the seat: match the exact train by id (unique); fall back to
  // route only for older reservations that have no train_id stored.
  var s = null;
  if (r.train_id) s = DB.schedules.find(function (x) { return x.id === r.train_id; });
  if (!s) s = DB.schedules.find(function (x) { return x.route === r.train; });
  if (s && s.booked > 0) await supa.from("schedules").update({ booked: s.booked - 1 }).eq("id", s.id);

  await supa.from("audit_log").insert({ actor: currentUser.username, action: "Cancel", detail: "Cancelled " + id });
  navigate("reservations");
}

function renderReports() {
  var conf = 0, canc = 0, revenue = 0;
  for (var i = 0; i < DB.reservations.length; i++) {
    if (DB.reservations[i].status === "Confirmed") { conf++; if (DB.reservations[i].price) revenue += Number(DB.reservations[i].price); }
    else canc++;
  }

  var h = topNav() + '<h2>Reports</h2>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">';
  var tabs = ["Daily", "Weekly", "Monthly", "Revenue", "Utilization"];
  for (var t = 0; t < tabs.length; t++) h += '<span class="filter-tab">' + tabs[t] + '</span>';
  h += '</div>';

  h += '<div class="stats-row">';
  h += '<div class="stat-card"><div class="stat-val">' + conf + '</div><div class="stat-lbl">CONFIRMED BOOKINGS</div></div>';
  h += '<div class="stat-card"><div class="stat-val">' + revenue + ' SAR</div><div class="stat-lbl">CONFIRMED REVENUE</div></div>';
  h += '<div class="stat-card"><div class="stat-val">' + canc + '</div><div class="stat-lbl">CANCELLATIONS</div></div>';
  h += '</div>';

  h += '<h3 style="font-size:14px;margin-bottom:3px">GENERATED REPORTS</h3>';
  h += '<div style="font-size:10px;color:#999;margin-bottom:10px">All reports - sorted by date</div>';
  h += '<div class="card"><table><thead><tr><th>REPORT NAME</th><th>DATE</th><th>PERIOD</th><th>TYPE</th><th>BOOKINGS</th><th>REVENUE</th><th>SIZE</th><th></th></tr></thead><tbody>';
  for (var i = 0; i < DB.reports.length; i++) {
    var r = DB.reports[i];
    h += '<tr><td style="font-weight:600;font-size:10px">' + r.name + '</td>';
    h += '<td style="font-size:11px">' + r.date + ' ' + r.time + '</td>';
    h += '<td>' + bdg(r.type) + '</td><td style="font-size:11px">' + r.cat + '</td>';
    h += '<td>' + r.bookings + '</td><td style="color:#4CAF50;font-weight:600">' + r.revenue + '</td>';
    h += '<td style="color:#4CAF50">' + r.size + '</td><td style="cursor:pointer">⬇</td></tr>';
  }
  h += '</tbody></table></div>';

  h += '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:16px">';
  h += '<div class="card" style="flex:1 1 280px;padding:14px"><div style="font-size:13px;font-weight:600;color:#4CAF50;margin-bottom:8px">Reservation Trends (S-20)</div>';
  var dates = {};
  for (var i = 0; i < DB.reservations.length; i++) {
    var d = DB.reservations[i].date;
    dates[d] = (dates[d] || 0) + 1;
  }
  var dateKeys = Object.keys(dates).sort();
  for (var i = 0; i < dateKeys.length; i++) {
    h += '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f5f5f5;font-size:11px"><span>' + dateKeys[i] + '</span><span style="font-weight:600">' + dates[dateKeys[i]] + '</span></div>';
  }
  h += '</div>';

  h += '<div class="card" style="flex:1 1 280px;padding:14px"><div style="font-size:13px;font-weight:600;color:#4CAF50;margin-bottom:8px">Train Utilization (S-24)</div>';
  for (var i = 0; i < DB.schedules.length; i++) {
    var s = DB.schedules[i];
    if (s.status === "ARCHIVE") continue;
    var pct = Math.round(s.booked / s.seats * 100);
    var col = pct >= 100 ? "#e53935" : pct >= 50 ? "#FF9800" : "#4CAF50";
    h += '<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;margin-bottom:3px">' + s.route + '</div>';
    h += '<div style="display:flex;align-items:center;gap:6px"><div class="bar-bg" style="width:100px"><div class="bar-fill" style="width:' + pct + '%;background:' + col + '"></div></div>';
    h += '<span style="font-size:10px;font-weight:600">' + pct + '%</span></div>';
    h += '<div style="font-size:9px;color:#999">' + s.booked + '/' + s.seats + ' seats</div></div>';
  }
  h += '</div></div>' + pgn();
  return h;
}