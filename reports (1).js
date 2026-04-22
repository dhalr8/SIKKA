// ===== REPORTS — Sarah (S-20, S-21, S-22, S-23, S-24) =====

function renderReports() {
  var conf = DB.reservations.filter(r => r.status === 'Confirmed');
  var canc = DB.reservations.filter(r => r.status === 'Cancelled');

  var html = '<h2>Reports</h2>';

  // Filter buttons
  html += '<div class="report-grid">';
  ['Daily','Weekly','Monthly','Revenue','Utilization'].forEach(function(t) {
    html += '<span class="filter-tab">' + t + '</span>';
  });
  html += '</div>';

  // Filters
  html += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap">';
  html += '<span style="font-size:12px;font-weight:600">FILTER BY :</span>';
  html += '<select class="search-box"><option>Select Date</option></select>';
  html += '<select class="search-box"><option>All Routes</option></select>';
  html += '<select class="search-box"><option>All Types</option></select>';
  html += '<span class="btn btn-green" style="margin-left:auto;font-size:11px">Apply Filters</span>';
  html += '</div>';

  // S-21: Stats
  html += '<div class="stats-row">';
  html += '<div class="stat-card"><div class="stat-value">' + conf.length + '</div><div class="stat-label">TOTAL BOOKINGS TODAY</div></div>';
  html += '<div class="stat-card"><div class="stat-value">1500 SAR</div><div class="stat-label">REVENUE TODAY</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + canc.length + '</div><div class="stat-label">CANCELLATIONS TODAY</div></div>';
  html += '</div>';

  // S-22: Generated reports table
  html += '<h3 style="margin-bottom:4px">GENERATED REPORTS</h3>';
  html += '<div style="font-size:11px;color:#999;margin-bottom:12px">All reports - sorted by date</div>';
  html += '<div class="card"><table><thead><tr><th>REPORT NAME</th><th>DATE</th><th>PERIOD</th><th>TYPE</th><th>BOOKINGS</th><th>REVENUE</th><th>FILE SIZE</th><th>DOWNLOAD</th></tr></thead><tbody>';
  DB.reports.forEach(function(r) {
    html += '<tr><td style="font-weight:600;font-size:11px">' + r.name + '</td>';
    html += '<td>' + r.date + ' ' + r.time + '</td>';
    html += '<td>' + badge(r.type) + '</td><td>' + r.cat + '</td>';
    html += '<td>' + r.bookings + '</td><td style="color:#4CAF50;font-weight:600">' + r.revenue + '</td>';
    html += '<td style="color:#4CAF50">' + r.size + '</td><td style="cursor:pointer">⬇</td></tr>';
  });
  html += '</tbody></table></div>';

  // S-20: Trends + S-24: Utilization
  html += '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:20px">';

  // S-20: Trends
  html += '<div class="card" style="flex:1 1 300px;padding:16px"><div class="card-header" style="border:none;padding:0 0 10px">Reservation Trends (S-20)</div>';
  var dates = {};
  DB.reservations.forEach(function(r) { dates[r.date] = (dates[r.date] || 0) + 1; });
  Object.keys(dates).sort().forEach(function(d) {
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f5f5f5;font-size:12px"><span>' + d + '</span><span style="font-weight:600">' + dates[d] + ' bookings</span></div>';
  });
  html += '</div>';

  // S-24: Utilization
  html += '<div class="card" style="flex:1 1 300px;padding:16px"><div class="card-header" style="border:none;padding:0 0 10px">Train Utilization (S-24)</div>';
  DB.schedules.filter(s => s.status !== 'ARCHIVE').forEach(function(s) {
    var pct = Math.round(s.booked / s.seats * 100);
    var color = pct >= 100 ? '#e53935' : pct >= 60 ? '#FF9800' : '#4CAF50';
    html += '<div style="margin-bottom:10px"><div style="font-size:12px;font-weight:600;margin-bottom:4px">' + s.route + '</div>';
    html += '<div style="display:flex;align-items:center;gap:8px"><div class="bar-bg" style="width:120px"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
    html += '<span style="font-size:11px;font-weight:600">' + pct + '%</span></div>';
    html += '<div style="font-size:10px;color:#999;margin-top:2px">' + s.booked + '/' + s.seats + ' seats</div></div>';
  });
  html += '</div></div>';

  html += pagination();
  document.getElementById('page-reports').innerHTML = html;
}
