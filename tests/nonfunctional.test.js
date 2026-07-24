const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { bootApp, GENERIC_ERROR } = require('./harness');

describe('Non-functional — performance', () => {
  test('NFT-01: one successful login completes in under 500 ms', () => {
    const app = bootApp();
    app.setLogin('admin', 'admin123');
    const start = performance.now();
    app.ctx.handleLogin();
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 500, `login took ${elapsed.toFixed(2)} ms`);
  });

  test('NFT-02: 100 failed login checks complete in under 1000 ms', () => {
    const app = bootApp();
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      app.setLogin('unknown' + i, 'wrong' + i);
      app.ctx.handleLogin();
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 1000, `100 checks took ${elapsed.toFixed(2)} ms`);
  });
});

describe('Non-functional — security and robustness', () => {
  test('NFT-03: unknown user and wrong password return the same message', () => {
    const unknown = bootApp();
    unknown.setLogin('not-a-user', 'anything');
    unknown.ctx.handleLogin();

    const wrong = bootApp();
    wrong.setLogin('admin', 'wrong');
    wrong.ctx.handleLogin();

    assert.equal(unknown.error(), wrong.error());
    assert.equal(unknown.error(), GENERIC_ERROR);
  });

  test('NFT-04: SQL-injection-like input is rejected', () => {
    const app = bootApp();
    app.setLogin("' OR 1=1 --", "' OR 1=1 --");
    assert.doesNotThrow(() => app.ctx.handleLogin());
    assert.equal(app.ctx.currentUser, null);
  });

  test('NFT-05: script-like input is displayed only as text in the error path', () => {
    const app = bootApp();
    app.setLogin('<script>alert(1)</script>', 'x');
    assert.doesNotThrow(() => app.ctx.handleLogin());
    assert.equal(app.error(), GENERIC_ERROR);
    assert.equal(app.ctx.currentUser, null);
  });

  test('NFT-06: very long input does not crash the application', () => {
    const app = bootApp();
    const longValue = 'x'.repeat(10000);
    app.setLogin(longValue, longValue);
    assert.doesNotThrow(() => app.ctx.handleLogin());
    assert.equal(app.ctx.currentUser, null);
  });

  test('NFT-07: repeated failed attempts do not create a session', () => {
    const app = bootApp();
    for (let i = 0; i < 20; i++) {
      app.setLogin('admin', 'wrong' + i);
      app.ctx.handleLogin();
    }
    assert.equal(app.ctx.currentUser, null);
  });
});
