const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { bootApp, GENERIC_ERROR } = require('./harness');

describe('Functional tests — login', () => {
  test('FT-01: empty username and password are rejected', () => {
    const app = bootApp();
    app.setLogin('', '');
    app.ctx.handleLogin();
    assert.equal(app.error(), GENERIC_ERROR);
    assert.equal(app.ctx.currentUser, null);
  });

  test('FT-02: missing username is rejected', () => {
    const app = bootApp();
    app.setLogin('', 'admin123');
    app.ctx.handleLogin();
    assert.equal(app.error(), GENERIC_ERROR);
  });

  test('FT-03: missing password is rejected', () => {
    const app = bootApp();
    app.setLogin('admin', '');
    app.ctx.handleLogin();
    assert.equal(app.error(), GENERIC_ERROR);
  });

  test('FT-04: unknown username is rejected', () => {
    const app = bootApp();
    app.setLogin('unknown', 'admin123');
    app.ctx.handleLogin();
    assert.equal(app.error(), GENERIC_ERROR);
    assert.equal(app.ctx.currentUser, null);
  });

  test('FT-05: wrong password is rejected', () => {
    const app = bootApp();
    app.setLogin('admin', 'wrong');
    app.ctx.handleLogin();
    assert.equal(app.error(), GENERIC_ERROR);
    assert.equal(app.ctx.currentUser, null);
  });

  test('FT-06: administrator can log in', () => {
    const app = bootApp();
    app.setLogin('admin', 'admin123');
    app.ctx.handleLogin();
    assert.equal(app.ctx.currentUser.username, 'admin');
    assert.equal(app.ctx.currentUser.role, 'Administrator');
    assert.equal(app.el('loginPage').style.display, 'none');
    assert.equal(app.el('appPage').style.display, 'flex');
    assert.equal(app.el('sidebarName').textContent, 'dhay');
    assert.equal(app.el('sidebarRole').textContent, 'Administrator');
  });

  test('FT-07: staff account can log in', () => {
    const app = bootApp();
    app.setLogin('staff1', 'staff123');
    app.ctx.handleLogin();
    assert.equal(app.ctx.currentUser.username, 'staff1');
    assert.equal(app.ctx.currentUser.role, 'Staff');
  });

  test('FT-08: credentials are case-sensitive', () => {
    const app = bootApp();
    app.setLogin('Admin', 'admin123');
    app.ctx.handleLogin();
    assert.equal(app.ctx.currentUser, null);
  });
});

describe('Functional tests — session and data', () => {
  test('FT-09: logout clears the current user', () => {
    const app = bootApp();
    app.setLogin('admin', 'admin123');
    app.ctx.handleLogin();
    app.ctx.logout();
    assert.equal(app.ctx.currentUser, null);
  });

  test('FT-10: logout restores login page and hides app page', () => {
    const app = bootApp();
    app.setLogin('admin', 'admin123');
    app.ctx.handleLogin();
    app.ctx.logout();
    assert.equal(app.el('appPage').style.display, 'none');
    assert.equal(app.el('loginPage').style.display, 'flex');
  });

  test('FT-11: logout clears login fields and error', () => {
    const app = bootApp();
    app.setLogin('admin', 'admin123');
    app.ctx.handleLogin();
    app.el('loginError').textContent = 'old error';
    app.ctx.logout();
    assert.equal(app.el('loginUser').value, '');
    assert.equal(app.el('loginPass').value, '');
    assert.equal(app.el('loginError').textContent, '');
  });

  test('FT-12: seeded schedules contain active train records', () => {
    const app = bootApp();
    assert.ok(app.ctx.DB.schedules.length >= 1);
    assert.ok(app.ctx.DB.schedules.some((s) => s.status === 'ACTIVE'));
  });
});
