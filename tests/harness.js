const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP_FILE = path.join(__dirname, '..', 'data.js');
const GENERIC_ERROR = 'incorrect username or password';

function makeElement(id) {
  return {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    classList: { add() {}, remove() {} },
    addEventListener() {},
  };
}

function bootApp() {
  const elements = {};
  const getEl = (id) => (elements[id] ||= makeElement(id));

  const document = {
    getElementById: getEl,
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener() {},
  };

  const sandbox = {
    console,
    document,
    alert() {},
    confirm() { return true; },
    prompt() { return null; },
    performance,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    renderDashboard: () => '<h2>Dashboard</h2>',
    renderSchedules: () => '',
    renderReservations: () => '',
    renderPassengers: () => '',
    renderBooking: () => '',
    renderReports: () => '',
    renderUsers: () => '',
    renderAudit: () => '',
  };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(APP_FILE, 'utf8'), sandbox, { filename: APP_FILE });

  return {
    ctx: sandbox,
    el: getEl,
    setLogin(username, password) {
      getEl('loginUser').value = username;
      getEl('loginPass').value = password;
    },
    error() { return getEl('loginError').textContent; },
  };
}

module.exports = { bootApp, GENERIC_ERROR };
