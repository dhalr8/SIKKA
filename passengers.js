// ===== PASSENGERS — Munirah (S-09, S-10, S-11, S-25) =====

function renderPassengers() {
  var html = '<h2>Passengers</h2>';

  // S-09: Register form
  html += '<div style="background:#E8F5E9;border-radius:10px;padding:12px 16px;font-size:14px;font-weight:600;color:#4CAF50;margin-bottom:16px">Add New Passenger</div>';
  html += '<div class="form-card" style="max-width:600px;margin:0 auto 20px"><div id="passMsg"></div>';
  html += '<input id="passName" class="form-input-round" placeholder="Full Name"/>';
  html += '<input id="passNid" class="form-input-round" placeholder="National ID"/>';
  html += '<input id="passPhone" class="form-input-round" placeholder="phone"/>';
  html += '<input id="passEmail" class="form-input-round" placeholder="Email"/>';
  html += '<div style="text-align:center"><button class="btn btn-outline" onclick="registerPassenger()">Register</button></div></div>';

  // S-11: Search
  html += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">';
  html += '<span>☰</span><input id="passSearch" class="search-box" style="flex:1" placeholder="search passengers by name, ID, or email" oninput="searchPassenger()"/>';
  html += '</div>';

  // Table
  html += '<div class="card"><table><thead><tr><th>NAME</th><th>ID</th><th>PHONE</th><th>EMAIL</th><th>STATUS</th><th>ACTIONS</th></tr></thead>';
  html += '<tbody id="passengerTableBody">';
  DB.passengers.forEach(function(p) {
    html += passengerRow(p);
  });
  html += '</tbody></table></div>' + pagination();

  document.getElementById('page-passengers').innerHTML = html;
}

function passengerRow(p) {
  return '<tr><td>' + p.name + '</td><td>' + p.nid + '</td><td>' + p.phone + '</td><td>' + p.email + '</td>' +
    '<td>' + badge(p.status) + '</td>' +
    '<td><button class="btn btn-outline btn-sm" onclick="editPassenger(' + p.id + ')">Edit</button></td></tr>';
}

// S-09: Register
function registerPassenger() {
  var name = document.getElementById('passName').value;
  var nid = document.getElementById('passNid').value;
  var phone = document.getElementById('passPhone').value;
  var email = document.getElementById('passEmail').value;
  var msg = document.getElementById('passMsg');

  // S-25: Validate
  if (!name || !nid || !phone) { msg.innerHTML = '<div class="alert alert-err">Name, ID, and phone are required.</div>'; return; }
  if (email && !email.includes('@')) { msg.innerHTML = '<div class="alert alert-err">Invalid email format.</div>'; return; }
  if (DB.passengers.find(p => p.nid === nid)) { msg.innerHTML = '<div class="alert alert-err">Passenger with this ID already exists.</div>'; return; }

  DB.passengers.push({ id:DB.nextPassId++, name:name, nid:nid, phone:phone, email:email, status:'ACTIVE' });
  msg.innerHTML = '<div class="alert alert-ok">Registered: ' + name + '</div>';
  document.getElementById('passName').value = '';
  document.getElementById('passNid').value = '';
  document.getElementById('passPhone').value = '';
  document.getElementById('passEmail').value = '';
  renderPassengers();
}

// S-10: Update
function editPassenger(id) {
  var p = DB.passengers.find(x => x.id === id);
  var nn = prompt('Update name (' + p.name + '):', p.name);
  var np = prompt('Update phone (' + p.phone + '):', p.phone);
  var ne = prompt('Update email (' + p.email + '):', p.email);
  if (nn) p.name = nn;
  if (np) p.phone = np;
  if (ne) p.email = ne;
  renderPassengers();
}

// S-11: Search
function searchPassenger() {
  var term = document.getElementById('passSearch').value.toLowerCase();
  var filtered = DB.passengers.filter(p => p.name.toLowerCase().includes(term) || p.nid.includes(term) || p.email.toLowerCase().includes(term));
  var tbody = document.getElementById('passengerTableBody');
  var html = '';
  filtered.forEach(function(p) { html += passengerRow(p); });
  if (filtered.length === 0) html = '<tr><td colspan="6" style="text-align:center;color:#999;padding:20px">No passengers found.</td></tr>';
  tbody.innerHTML = html;
}
