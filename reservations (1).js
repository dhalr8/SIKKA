// ===== RESERVATIONS — Sarah (S-12, S-16, S-17) =====

var resFilter = 'All';

function renderReservations() {
  var html = '<h2>Reservations</h2>';

  // S-17: Filter tabs
  html += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap">';
  ['All','Confirmed','Cancelled'].forEach(function(f) {
    html += '<span class="filter-tab' + (f === resFilter ? ' active' : '') + '" onclick="filterRes(\'' + f + '\')">' + f + '</span>';
  });
  html += '<input id="resSearch" class="search-box" style="flex:1;min-width:250px" placeholder="search passengers by name, booking ID, or Train" oninput="renderReservations()"/>';
  html += '</div>';

  // S-12: Table
  var search = document.getElementById('resSearch') ? document.getElementById('resSearch').value.toLowerCase() : '';
  var list = DB.reservations;
  if (resFilter !== 'All') list = list.filter(r => r.status === resFilter);
  if (search) list = list.filter(r => r.passenger.toLowerCase().includes(search) || r.id.includes(search) || r.train.toLowerCase().includes(search));

  html += '<div class="card"><table><thead><tr><th>BOOKING ID</th><th>PASSENGER</th><th>TRAIN</th><th>DATE</th><th>SEAT</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>';
  list.forEach(function(r) {
    html += '<tr><td><b>' + r.id + '</b></td><td>' + r.passenger + '</td><td>' + r.train + '</td><td>' + r.date + '</td><td><b>' + r.seat + '</b></td>';
    html += '<td>' + badge(r.status) + '</td>';
    // S-16: Cancel button
    html += '<td>' + (r.status === 'Confirmed' ? '<span class="btn-cancel" onclick="cancelRes(\'' + r.id + '\')">cancel</span>' : '') + '</td></tr>';
  });
  if (list.length === 0) html += '<tr><td colspan="7" style="text-align:center;color:#999;padding:20px">No reservations found.</td></tr>';
  html += '</tbody></table></div>' + pagination();

  document.getElementById('page-reservations').innerHTML = html;
}

function filterRes(f) { resFilter = f; renderReservations(); }

// S-16: Cancel Reservation
function cancelRes(id) {
  if (confirm('Cancel reservation ' + id + '?')) {
    var r = DB.reservations.find(x => x.id === id);
    r.status = 'Cancelled';
    DB.auditLog.push({ time:new Date().toLocaleString(), user:'staff', action:'Cancel', detail:'Cancelled ' + id });
    renderReservations();
  }
}
