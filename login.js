// ===== LOGIN & APP — Dhay (S-01, S-25) =====

// S-01: Login
function handleLogin() {
  var u = document.getElementById('loginUser').value;
  var p = document.getElementById('loginPass').value;
  var err = document.getElementById('loginError');
  // S-25: Validate
  if (!u || !p) { err.textContent = 'incorrect username or password'; return; }
  var found = DB.users.find(x => x.username === u && x.password === p);
  if (!found) { err.textContent = 'incorrect username or password'; return; }
  currentUser = found;
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appPage').style.display = 'flex';
  document.getElementById('userName').textContent = found.name;
  document.getElementById('userRole').textContent = found.role;
  document.getElementById('userAvatar').textContent = found.name[0].toUpperCase();
  navigate('dashboard');
}

function logout() {
  currentUser = null;
  document.getElementById('appPage').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').textContent = '';
}
