// ===== BOOK TICKET — Nawal (S-13, S-14, S-15) =====

function renderBooking() {
  var html = '<div style="text-align:center;padding:20px 0">';
  html += '<h2 style="text-decoration:underline;text-decoration-color:#4CAF50">Book Ticket</h2>';
  html += '<div class="booking-card" style="position:relative" id="bookingCard">';
  html += '<div id="bookConfirm"></div><div id="bookMsg"></div>';
  html += '<div class="booking-grid">';

  // Passenger dropdown (registered only)
  html += '<div style="grid-column:1/4"><div class="booking-label">Select Passenger: <span style="font-size:10px;color:#777">(must be registered first)</span></div>';
  html += '<select id="bookPass" class="booking-select"><option value="">-- Select registered passenger --</option>';
  DB.passengers.forEach(function(p) { html += '<option value="' + p.id + '">' + p.name + ' (' + p.nid + ')</option>'; });
  html += '</select>';
  if (DB.passengers.length === 0) html += '<div style="font-size:11px;color:#e53935;margin-top:4px">No passengers registered. Go to Passengers page first.</div>';
  html += '</div>';

  // Train dropdown
  html += '<div><div class="booking-label">Select Train:</div><select id="bookTrain" class="booking-select"><option value="">-- Select train --</option>';
  DB.schedules.filter(s => s.status !== 'ARCHIVE').forEach(function(s) {
    html += '<option value="' + s.id + '">' + s.route + ' (' + (s.seats - s.booked) + ' seats left)</option>';
  });
  html += '</select></div>';

  html += '<div><div class="booking-label">Select Ticket:</div><select class="booking-select"><option>VIP ticket</option><option>Economy</option></select></div>';
  html += '<div><div class="booking-label">Destination:</div><select class="booking-select"><option>MAKKAH</option><option>RIYADH</option><option>JEDDAH</option><option>DAMMAM</option></select></div>';
  html += '<div><div class="booking-label">Time:</div><select class="booking-select"><option>2:45PM</option><option>8:00AM</option><option>10:00AM</option></select></div>';
  html += '<div><div class="booking-label">Payment:</div><select class="booking-select"><option>Wallet</option><option>Card</option><option>Cash</option></select></div>';
  html += '<div style="display:flex;align-items:flex-end"><button class="book-now-btn" onclick="bookTicket()">BOOK<br>NOW</button></div>';
  html += '</div></div></div>';

  document.getElementById('page-booking').innerHTML = html;
}

function bookTicket() {
  var passId = document.getElementById('bookPass').value;
  var trainId = document.getElementById('bookTrain').value;
  var msg = document.getElementById('bookMsg');
  var conf = document.getElementById('bookConfirm');

  // S-25: Validate
  if (!passId) { msg.innerHTML = '<div class="alert alert-err">Please select a registered passenger.</div>'; conf.innerHTML = ''; return; }
  if (!trainId) { msg.innerHTML = '<div class="alert alert-err">Please select a train.</div>'; conf.innerHTML = ''; return; }

  var s = DB.schedules.find(x => x.id === trainId);

  // S-14: Validate Seat Availability
  if (s.booked >= s.seats) {
    msg.innerHTML = '<div class="alert alert-err">No seats available on this train.</div>';
    conf.innerHTML = '';
    return;
  }

  // S-13: Create Reservation
  var p = DB.passengers.find(x => x.id === parseInt(passId));
  var seat = String.fromCharCode(65 + Math.floor(Math.random() * 4)) + Math.floor(Math.random() * 40 + 1);
  var bid = Math.floor(100000000 + Math.random() * 900000000);
  s.booked++;
  DB.reservations.push({ id:'#BK-' + String(DB.nextResId++).padStart(5,'0'), passenger:p.name, train:s.route, date:new Date().toLocaleDateString(), seat:seat, status:'Confirmed' });

  msg.innerHTML = '';

  // S-15: Booking Confirmation
  conf.innerHTML = '<div class="confirm-overlay">' +
    '<div class="confirm-box">' +
    '<h2 style="margin-bottom:16px">Booking Confirmed!</h2>' +
    '<p>Passenger name: ' + p.name + '</p>' +
    '<p>Booking ID: ' + bid + '</p>' +
    '<p>Train: ' + s.route + '</p>' +
    '<p>Seat: ' + seat + '</p>' +
    '<p>Price: ' + s.price + ' SAR</p>' +
    '<br><button class="btn btn-outline" onclick="closeConfirm()">Done</button>' +
    '</div></div>';
}

function closeConfirm() {
  document.getElementById('bookConfirm').innerHTML = '';
  renderBooking();
}
