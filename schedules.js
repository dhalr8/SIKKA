// ===== SCHEDULES — Danah (S-04, S-05, S-06, S-07, S-08) =====

function renderSchedules() {
    var active = DB.schedules.filter(s => s.status !== 'ARCHIVE');
    var archived = DB.schedules.filter(s => s.status === 'ARCHIVE');
    var avgOcc = Math.round(DB.schedules.reduce((s,t) => s + t.booked/t.seats, 0) / DB.schedules.length * 100);
  
    var html = '<h2>Train Schedules</h2>';
    html += '<div class="stats-row">';
    html += '<div class="stat-card"><div class="stat-value">' + DB.schedules.length + '</div><div class="stat-label">TOTAL TRAINS</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + active.length + '</div><div class="stat-label">OPEN FOR BOOKING</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + avgOcc + '%</div><div class="stat-label">AVG OCCUPANCY</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + archived.length + '</div><div class="stat-label">ARCHIVES</div></div>';
    html += '</div>';
  
    // S-04: Add button
    html += '<div style="margin-bottom:16px">';
    html += '<button class="btn btn-green" onclick="toggleAddSchedule()">+ Add New Schedule</button> ';
    html += '<button class="btn btn-outline" onclick="toggleArchived()">View Archived (S-08)</button>';
    html += '</div>';
  
    // S-04: Add form
    html += '<div id="addScheduleForm" style="display:none" class="form-card" style="max-width:600px">';
    html += '<div class="card-header">Create New Schedule (S-04)</div>';
    html += '<div id="schedMsg"></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px">';
    html += '<input id="schedId" class="form-input" placeholder="Train ID (e.g. TRN-004)"/>';
    html += '<input id="schedRoute" class="form-input" placeholder="Route (e.g. RIYADH TO MAKKAH)"/>';
    html += '<input id="schedDepDate" class="form-input" placeholder="Dep Date (Apr 20, 2026)"/>';
    html += '<input id="schedDepTime" class="form-input" placeholder="Dep Time (9:00 AM)"/>';
    html += '<input id="schedArrDate" class="form-input" placeholder="Arr Date"/>';
    html += '<input id="schedArrTime" class="form-input" placeholder="Arr Time"/>';
    html += '<input id="schedSeats" class="form-input" type="number" placeholder="Total Seats"/>';
    html += '<input id="schedPrice" class="form-input" type="number" placeholder="Price (SAR)"/>';
    html += '</div><div style="padding:0 12px 12px"><button class="btn btn-green" onclick="addSchedule()">Create Schedule</button></div></div>';
  
    // S-08: Archived
    html += '<div id="archivedSection" style="display:none" class="card" style="margin-bottom:16px">';
    html += '<div class="card-header" style="color:#FF9800">Archived Schedules (S-08)</div>';
    if (archived.length === 0) {
      html += '<div style="padding:20px;text-align:center;color:#999">No archived schedules.</div>';
    } else {
      html += '<table><thead><tr><th>TRAIN ID</th><th>ROUTE</th><th>SEATS</th><th>PRICE</th><th>STATUS</th></tr></thead><tbody>';
      archived.forEach(function(s) { html += '<tr><td><b>' + s.id + '</b></td><td>' + s.route + '</td><td>' + s.seats + '</td><td>' + s.price + ' SAR</td><td>' + badge('ARCHIVE') + '</td></tr>'; });
      html += '</tbody></table>';
    }
    html += '</div>';
  
    // S-07: Active table
    html += '<div class="card"><div class="card-header">Active Schedules (S-07)</div>';
    html += '<table><thead><tr><th>TRAIN ID</th><th>ROUTE</th><th>DEPARTURE</th><th>ARRIVAL</th><th>SEATS</th><th>PRICE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>';
    active.forEach(function(s) {
      html += '<tr><td style="font-weight:600;color:#4CAF50">' + s.id + '</td><td>' + s.route + '</td>';
      html += '<td>' + s.depDate + ' ' + s.depTime + '</td><td>' + s.arrDate + ' ' + s.arrTime + '</td>';
      html += '<td>' + s.booked + '/' + s.seats + '</td><td><b>' + s.price + '</b> SAR</td>';
      html += '<td>' + badge(s.status) + '</td>';
      html += '<td><span style="cursor:pointer;margin-right:8px" onclick="editSchedule(\'' + s.id + '\')">✏️</span>';
      html += '<span style="cursor:pointer" onclick="deleteSchedule(\'' + s.id + '\')">🗑</span></td></tr>';
    });
    html += '</tbody></table></div>' + pagination();
  
    document.getElementById('page-schedules').innerHTML = html;
  }
  
  function toggleAddSchedule() {
    var f = document.getElementById('addScheduleForm');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
  }
  function toggleArchived() {
    var f = document.getElementById('archivedSection');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
  }
  
  // S-04: Create
  function addSchedule() {
    var id = document.getElementById('schedId').value;
    var route = document.getElementById('schedRoute').value;
    var seats = document.getElementById('schedSeats').value;
    var price = document.getElementById('schedPrice').value;
    var msg = document.getElementById('schedMsg');
    if (!id || !route || !seats || !price) { msg.innerHTML = '<div class="alert alert-err">All fields required.</div>'; return; }
    if (DB.schedules.find(s => s.id === id)) { msg.innerHTML = '<div class="alert alert-err">Train ID already exists.</div>'; return; }
    if (parseInt(seats) <= 0 || parseFloat(price) <= 0) { msg.innerHTML = '<div class="alert alert-err">Seats and price must be positive.</div>'; return; }
    DB.schedules.push({ id:id, route:route, depDate:document.getElementById('schedDepDate').value||'Apr 20, 2026', depTime:document.getElementById('schedDepTime').value||'9:00 AM',
      arrDate:document.getElementById('schedArrDate').value||'Apr 20, 2026', arrTime:document.getElementById('schedArrTime').value||'3:00 PM', seats:parseInt(seats), booked:0, price:parseFloat(price), status:'ACTIVE' });
    renderSchedules();
  }
  
  // S-05: Edit
  function editSchedule(id) {
    var s = DB.schedules.find(x => x.id === id);
    var np = prompt('Update price for ' + s.route + ' (current: ' + s.price + ' SAR):', s.price);
    if (np && !isNaN(np)) { s.price = parseFloat(np); renderSchedules(); }
  }
  
  // S-06: Delete
  function deleteSchedule(id) {
    if (confirm('Archive schedule ' + id + '?')) {
      var s = DB.schedules.find(x => x.id === id);
      s.status = 'ARCHIVE';
      renderSchedules();
    }
  }