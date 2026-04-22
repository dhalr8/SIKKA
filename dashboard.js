// ===== DASHBOARD — Lana (S-18, S-19) =====

function renderDashboard() {
  var conf = DB.reservations.filter(r => r.status === 'Confirmed').length;
  var html = '<h2>Dashboard</h2>';
  html += '<div class="stats-row">';
  html += '<div class="stat-card"><div class="stat-value">' + DB.schedules.length + '</div><div class="stat-label">Trains</div></div>';
  html += '<div class="stat-card"><div class="stat-value">250</div><div class="stat-label">Passengers</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + conf + '</div><div class="stat-label">Bookings</div></div>';
  html += '<div class="stat-card"><div class="stat-value">10000</div><div class="stat-label">Revenue</div></div>';
  html += '</div>';

  // S-19: Occupancy
  html += '<div style="display:flex;gap:20px;flex-wrap:wrap">';
  html += '<div class="card" style="flex:1 1 400px;padding:20px"><div class="card-header" style="border:none;padding:0 0 12px">Train Occupancy</div>';
  DB.schedules.forEach(function(s) {
    var pct = Math.round(s.booked / s.seats * 100);
    var color = pct >= 100 ? '#e53935' : pct >= 50 ? '#FF9800' : '#4CAF50';
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">';
    html += '<span style="width:130px;font-size:12px;font-weight:500">' + s.route.split(' TO ')[0] + '</span>';
    html += '<div class="bar-bg"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
    html += '<span style="font-size:12px;font-weight:600;width:40px">' + pct + '%</span></div>';
  });
  html += '</div>';

  // Alerts
  html += '<div class="card" style="flex:1 1 280px;padding:20px"><div class="card-header" style="border:none;padding:0 0 12px">Alerts</div>';
  html += '<div style="background:#FFEBEE;border-radius:6px;padding:8px 12px;font-size:12px;font-weight:600;color:#e53935;margin-bottom:12px">Delayed Trains</div>';
  html += '<div style="padding:8px 0;border-bottom:1px solid #f0f0f0">🚆 Riyadh Express delayed</div>';

  html += '</div></div>';

  document.getElementById('page-dashboard').innerHTML = html;
}

// ===== USERS — Lana (S-02, S-03) =====

function renderUsers() {
  var html = '<h2>User Management</h2>';
  html += '<div class="card"><table><thead><tr><th>USERNAME</th><th>ROLE</th><th>NAME</th><th>ACTIONS</th></tr></thead><tbody>';
  DB.users.forEach(function(u) {
    html += '<tr><td><b>' + u.username + '</b></td><td>' + badge(u.role) + '</td><td>' + u.name + '</td>';
    html += '<td><button class="btn btn-outline btn-sm" onclick="assignRole(' + u.id + ')">Role</button> ';
    html += '<button class="btn btn-sm" style="background:#FF9800;color:white;border:none" onclick="resetPass(' + u.id + ')">Reset</button></td></tr>';
  });
  html += '</tbody></table></div>';
  document.getElementById('page-users').innerHTML = html;
}

// S-02: Assign Role
function assignRole(id) {
  var u = DB.users.find(x => x.id === id);
  var nr = prompt('Role for ' + u.username + ' (Administrator / Staff):', u.role);
  if (nr === 'Administrator' || nr === 'Staff') { u.role = nr; renderUsers(); }
}

// S-03: Reset Password
function resetPass(id) {
  var u = DB.users.find(x => x.id === id);
  var temp = 'temp' + Math.floor(1000 + Math.random() * 9000);
  u.password = temp;
  alert('Temporary password for ' + u.username + ': ' + temp);
}

// ===== AUDIT — Lana (S-26, S-27) =====

function renderAudit() {
  var html = '<h2>Audit Log & Backups</h2>';
  html += '<button class="btn btn-green" onclick="runBackup()" style="margin-bottom:16px">🔄 Run Backup (S-26)</button>';
  html += '<div class="card"><table><thead><tr><th>TIMESTAMP</th><th>USER</th><th>ACTION</th><th>DETAILS</th></tr></thead><tbody>';
  DB.auditLog.slice().reverse().forEach(function(a) {
    html += '<tr><td>' + a.time + '</td><td><b>' + a.user + '</b></td><td>' + badge(a.action) + '</td><td>' + a.detail + '</td></tr>';
  });
  html += '</tbody></table></div>';
  document.getElementById('page-audit').innerHTML = html;
}

// S-26: Backup
function runBackup() {
  DB.auditLog.push({ time: new Date().toLocaleString(), user:'system', action:'Backup', detail:'Database backup completed' });
  alert('Backup completed.\nTables: Users, Schedules, Passengers, Reservations, AuditLog');
  renderAudit();
}
