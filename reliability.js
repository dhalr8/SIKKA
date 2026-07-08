// ============================================================
// SIKKA Reliability Test Harness  (SWE2 Phase 1 — part b)
// Applies 100 requests to the REAL system functions and computes:
//   Probability of Failure on Demand (POFOD)
//   Rate of Occurrence of Failures  (ROCOF)
//   Mean Time Between Failures       (MTBF)
//   Availability
//
// A "demand" = one system operation (login, register, book, cancel,
// create schedule, render a page). A demand is a SUCCESS if the system
// behaves correctly — including correctly REJECTING bad input. It is a
// FAILURE only if the system crashes or produces the wrong outcome.
//
// Run in the browser: open reliability.html  (results shown on screen).
// ============================================================

// ---- Parameters the team may adjust and must justify in the report ----
var OBSERVATION_PERIOD_HOURS = 24; // the window the 100 requests represent
var MTTR_HOURS = 0.5;              // mean time to repair one failure

(function () {

  // ---- controllable stubs so real functions run without a live UI ----
  navigate = function () {};                 // isolate each operation
  window.alert = function () {};
  var CONFIRM_ANSWER = true;
  window.confirm = function () { return CONFIRM_ANSWER; };
  var PROMPT_ANSWER = null;
  window.prompt = function () { return PROMPT_ANSWER; };

  function $(id) { return document.getElementById(id); }
  function setVal(id, v) { var el = $(id); if (el) el.value = v; }

  // render a page into #mainContent so its form inputs exist as real DOM
  function show(html) { $("mainContent").innerHTML = html; }

  var results = [];
  function record(name, category, passed, note) {
    results.push({ name: name, category: category, passed: passed, note: note || "" });
  }

  // run one operation; any thrown error is itself a failure (a crash)
  function op(name, category, fn) {
    try {
      var r = fn();
      record(name, category, !!r.passed, r.note);
    } catch (e) {
      record(name, category, false, "exception: " + (e && e.message ? e.message : e));
    }
  }

  // ============================================================
  // 1) AUTHENTICATION  (20 demands)
  // ============================================================
  function loginAttempt(user, pass) {
    currentUser = null;                 // fresh session per demand
    setVal("loginUser", user);
    setVal("loginPass", pass);
    handleLogin();
    return currentUser;
  }
  var authCases = [
    ["admin", "admin123", true],
    ["staff1", "staff123", true],
    ["staff2", "staff123", true],
    ["admin", "wrongpass", false],
    ["ghost", "whatever", false],
    ["admin", "", false],
    ["", "admin123", false]
  ];
  for (var a = 0; a < 20; a++) {
    (function () {
      var c = authCases[a % authCases.length];
      op("login " + c[0] + "/" + (c[1] || "(empty)"), "Authentication", function () {
        var u = loginAttempt(c[0], c[1]);
        var accepted = !!u;
        var passed = (accepted === c[2]);   // did accept/reject match expectation?
        return { passed: passed, note: c[2] ? "should accept" : "should reject" };
      });
    })();
  }

  // ============================================================
  // 2) PASSENGER REGISTRATION  (20 demands)
  // ============================================================
  show(renderPassengers());
  function registerAttempt(name, nid, phone, email) {
    var before = DB.passengers.length;
    setVal("pName", name); setVal("pNid", nid); setVal("pPhone", phone); setVal("pEmail", email);
    registerPass();
    show(renderPassengers()); // rebuild inputs for the next call
    return DB.passengers.length - before; // 1 if added, 0 if rejected
  }
  for (var r1 = 0; r1 < 15; r1++) {
    (function (i) {
      op("register valid passenger #" + i, "Passenger Registration", function () {
        var added = registerAttempt("Test User " + i, "NID" + (500000 + i), "05000000" + i, "user" + i + "@mail.com");
        return { passed: added === 1, note: "should create profile" };
      });
    })(r1);
  }
  // duplicate national ID (uses an existing one) -> should reject
  op("register duplicate NID", "Passenger Registration", function () {
    var added = registerAttempt("Dup Person", "123670376", "0500000000", "dup@mail.com");
    return { passed: added === 0, note: "duplicate NID should reject" };
  });
  op("register missing name", "Passenger Registration", function () {
    var added = registerAttempt("", "NID900001", "0500000001", "x@mail.com");
    return { passed: added === 0, note: "empty required field should reject" };
  });
  op("register missing phone", "Passenger Registration", function () {
    var added = registerAttempt("No Phone", "NID900002", "", "x@mail.com");
    return { passed: added === 0, note: "empty required field should reject" };
  });
  op("register invalid email", "Passenger Registration", function () {
    var added = registerAttempt("Bad Email", "NID900003", "0500000003", "notanemail");
    return { passed: added === 0, note: "invalid email should reject" };
  });
  op("register another valid", "Passenger Registration", function () {
    var added = registerAttempt("Late User", "NID900004", "0500000004", "late@mail.com");
    return { passed: added === 1, note: "should create profile" };
  });

  // ============================================================
  // 3) BOOKING  (25 demands)
  // ============================================================
  function bookAttempt(passId, trainId) {
    show(renderBooking());
    setVal("bPass", passId);
    setVal("bTrain", trainId);
    var before = DB.reservations.length;
    bookTicket();
    return DB.reservations.length - before; // 1 if booked, 0 if not
  }
  function findSchedule(id) {
    for (var i = 0; i < DB.schedules.length; i++) if (DB.schedules[i].id === id) return DB.schedules[i];
    return null;
  }
  var somePassId = DB.passengers[0].id;

  // 16 valid bookings across trains that have free seats
  for (var b = 0; b < 16; b++) {
    (function (i) {
      var trainId = (i % 2 === 0) ? "TRN-001" : "TRN-003";
      op("book valid on " + trainId + " #" + i, "Booking", function () {
        var s = findSchedule(trainId);
        var seatsBefore = s.booked;
        var booked = bookAttempt(somePassId, trainId);
        var ok = (booked === 1) && (s.booked === seatsBefore + 1);
        return { passed: ok, note: "valid booking should confirm + decrement seat" };
      });
    })(b);
  }
  // full train -> should reject
  for (var b2 = 0; b2 < 3; b2++) {
    op("book on full train TRN-002 #" + b2, "Booking", function () {
      var booked = bookAttempt(somePassId, "TRN-002");
      return { passed: booked === 0, note: "full train should reject" };
    });
  }
  // missing selections -> should reject
  op("book with no passenger", "Booking", function () {
    var booked = bookAttempt("", "TRN-001");
    return { passed: booked === 0, note: "no passenger should reject" };
  });
  op("book with no train", "Booking", function () {
    var booked = bookAttempt(somePassId, "");
    return { passed: booked === 0, note: "no train should reject" };
  });
  // adversarial / robustness probes
  op("book on non-existent train TRN-999", "Booking", function () {
    var booked = bookAttempt(somePassId, "TRN-999");
    return { passed: booked === 0, note: "unknown train id should be handled, not crash" };
  });
  op("book on non-existent train ZZZ", "Booking", function () {
    var booked = bookAttempt(somePassId, "ZZZ");
    return { passed: booked === 0, note: "unknown train id should be handled, not crash" };
  });
  op("book with invalid passenger id 99999", "Booking", function () {
    var booked = bookAttempt("99999", "TRN-001");
    return { passed: booked === 0 || booked === 1, note: "unknown passenger id should be handled, not crash" };
  });
  op("book after archiving the train", "Booking", function () {
    var s = findSchedule("TRN-003"); var prev = s.status;
    s.status = "ARCHIVE";
    var booked = bookAttempt(somePassId, "TRN-003");
    s.status = prev;
    return { passed: booked === 0, note: "archived train should not accept bookings" };
  });

  // ============================================================
  // 4) SCHEDULE MANAGEMENT  (15 demands)
  // ============================================================
  function addScheduleAttempt(id, route, dep, arr, seats, price) {
    show(renderSchedules());
    setVal("sId", id); setVal("sRoute", route); setVal("sDep", dep);
    setVal("sArr", arr); setVal("sSeats", seats); setVal("sPrice", price);
    var before = DB.schedules.length;
    addSchedule();
    return DB.schedules.length - before;
  }
  for (var s1 = 0; s1 < 9; s1++) {
    (function (i) {
      op("create valid schedule #" + i, "Schedule Mgmt", function () {
        var added = addScheduleAttempt("NEW-" + i, "CITY" + i + " TO CITY" + (i + 1),
          "Apr 20, 2026 9:00 AM", "Apr 20, 2026 3:00 PM", "100", "60");
        return { passed: added === 1, note: "valid schedule should be created" };
      });
    })(s1);
  }
  op("create duplicate schedule id", "Schedule Mgmt", function () {
    var added = addScheduleAttempt("TRN-001", "DUP TO DUP", "d", "a", "50", "40");
    return { passed: added === 0, note: "duplicate id should reject" };
  });
  op("create schedule zero seats", "Schedule Mgmt", function () {
    var added = addScheduleAttempt("ZERO-1", "A TO B", "d", "a", "0", "40");
    return { passed: added === 0, note: "zero seats should reject" };
  });
  op("create schedule negative price", "Schedule Mgmt", function () {
    var added = addScheduleAttempt("NEG-1", "A TO B", "d", "a", "50", "-5");
    return { passed: added === 0, note: "negative price should reject" };
  });
  op("create schedule missing route", "Schedule Mgmt", function () {
    var added = addScheduleAttempt("MISS-1", "", "d", "a", "50", "40");
    return { passed: added === 0, note: "missing field should reject" };
  });
  op("edit schedule price", "Schedule Mgmt", function () {
    PROMPT_ANSWER = "77";
    var s = findSchedule("TRN-001");
    editSchedule("TRN-001");
    PROMPT_ANSWER = null;
    return { passed: s.price === 77, note: "price should update" };
  });
  op("archive (delete) schedule", "Schedule Mgmt", function () {
    CONFIRM_ANSWER = true;
    deleteSchedule("NEW-0");
    var s = findSchedule("NEW-0");
    return { passed: s && s.status === "ARCHIVE", note: "schedule should be archived" };
  });

  // ============================================================
  // 5) CANCELLATION  (5 demands)
  // ============================================================
  function firstConfirmedId() {
    for (var i = 0; i < DB.reservations.length; i++)
      if (DB.reservations[i].status === "Confirmed") return DB.reservations[i].id;
    return null;
  }
  for (var c = 0; c < 4; c++) {
    op("cancel confirmed reservation #" + c, "Cancellation", function () {
      CONFIRM_ANSWER = true;
      var id = firstConfirmedId();
      if (!id) return { passed: true, note: "no confirmed reservation left (ok)" };
      cancelRes(id);
      var res = null;
      for (var i = 0; i < DB.reservations.length; i++) if (DB.reservations[i].id === id) res = DB.reservations[i];
      return { passed: res && res.status === "Cancelled", note: "status should become Cancelled" };
    });
  }
  op("cancel then decline prompt", "Cancellation", function () {
    CONFIRM_ANSWER = false; // user says "No"
    var id = firstConfirmedId();
    var before = id ? "Confirmed" : null;
    if (id) cancelRes(id);
    CONFIRM_ANSWER = true;
    var res = null;
    for (var i = 0; i < DB.reservations.length; i++) if (DB.reservations[i].id === id) res = DB.reservations[i];
    return { passed: !id || (res && res.status === before), note: "declining should keep it Confirmed" };
  });

  // ============================================================
  // 6) PAGE RENDERING  (5 demands)
  // ============================================================
  var renderers = [
    ["render dashboard", renderDashboard],
    ["render reservations", renderReservations],
    ["render reports", renderReports],
    ["render schedules", renderSchedules],
    ["render passengers", renderPassengers]
  ];
  for (var d = 0; d < renderers.length; d++) {
    (function (rr) {
      op(rr[0], "Rendering", function () {
        var html = rr[1]();
        return { passed: typeof html === "string" && html.length > 0, note: "page should render without error" };
      });
    })(renderers[d]);
  }

  // ============================================================
  // 7) REQUIREMENTS CORRECTNESS  (10 demands)
  // A demand fails if the system's OUTPUT is wrong for the spec,
  // even when nothing crashes. These probe real, documented defects.
  // ============================================================

  // S-18: dashboard total-trains must reflect real data (correct in code)
  op("dashboard trains count is real", "Requirements", function () {
    var html = renderDashboard();
    var ok = html.indexOf('>' + DB.schedules.length + '</div><div class="stat-lbl">Trains</div>') !== -1;
    return { passed: ok, note: "trains stat should equal number of schedules" };
  });
  // S-18: dashboard active-bookings must reflect confirmed reservations (correct in code)
  op("dashboard bookings count is real", "Requirements", function () {
    var conf = 0;
    for (var i = 0; i < DB.reservations.length; i++) if (DB.reservations[i].status === "Confirmed") conf++;
    var html = renderDashboard();
    var ok = html.indexOf('>' + conf + '</div><div class="stat-lbl">Bookings</div>') !== -1;
    return { passed: ok, note: "bookings stat should equal confirmed reservations" };
  });
  // S-19: dashboard occupancy % must be computed from booked/seats (correct in code)
  op("dashboard occupancy is computed", "Requirements", function () {
    var s = DB.schedules[0];
    var pct = Math.round(s.booked / s.seats * 100);
    var html = renderDashboard();
    return { passed: html.indexOf(pct + "%") !== -1, note: "occupancy should be booked/seats" };
  });
  // S-21: reports total-bookings must reflect real data (correct in code)
  op("reports bookings count is real", "Requirements", function () {
    var conf = 0;
    for (var i = 0; i < DB.reservations.length; i++) if (DB.reservations[i].status === "Confirmed") conf++;
    var html = renderReports();
    var ok = html.indexOf('>' + conf + '</div><div class="stat-lbl">TOTAL BOOKINGS TODAY</div>') !== -1;
    return { passed: ok, note: "today bookings should equal confirmed reservations" };
  });
  // S-18 DEFECT: passenger count is hard-coded 250, not the real total
  op("dashboard passenger count is real", "Requirements", function () {
    var html = renderDashboard();
    var ok = html.indexOf('>' + DB.passengers.length + '</div><div class="stat-lbl">Passengers</div>') !== -1;
    return { passed: ok, note: "passengers stat is hard-coded 250 (should be DB total)" };
  });
  // S-18 DEFECT: revenue is hard-coded 10000, not computed from bookings
  op("dashboard revenue is computed", "Requirements", function () {
    var html = renderDashboard();
    var hardcoded = html.indexOf('>10000</div><div class="stat-lbl">Revenue</div>') !== -1;
    return { passed: !hardcoded, note: "revenue is hard-coded 10000, not computed" };
  });
  // S-23 DEFECT: reports "revenue today" is hard-coded 1500 SAR
  op("reports revenue today is computed", "Requirements", function () {
    var html = renderReports();
    var hardcoded = html.indexOf('>1500 SAR</div>') !== -1;
    return { passed: !hardcoded, note: "revenue today is hard-coded 1500 SAR" };
  });
  // S-15 DEFECT: confirmation Booking ID differs from the stored reservation ID
  op("confirmation ID matches stored reservation", "Requirements", function () {
    show(renderBooking());
    setVal("bPass", somePassId); setVal("bTrain", "TRN-001");
    bookTicket();
    var conf = $("bookConf").innerHTML;
    var m = conf.match(/Booking ID:\s*([0-9]+)/);
    var shownId = m ? m[1] : null;
    var storedId = DB.reservations[DB.reservations.length - 1].id; // "#BK-00xxx"
    var ok = shownId !== null && ("#BK-" + shownId === storedId || shownId === storedId);
    return { passed: ok, note: "shown ID (" + shownId + ") differs from stored ID (" + storedId + ")" };
  });
  // S-13 DEFECT: stored reservation record has no price field
  op("stored reservation includes price", "Requirements", function () {
    var last = DB.reservations[DB.reservations.length - 1];
    return { passed: last.hasOwnProperty("price"), note: "reservation record stores no price" };
  });
  // Data integrity: every reservation.train should match a real schedule route
  op("reservations reference real schedules", "Requirements", function () {
    var routes = {};
    for (var i = 0; i < DB.schedules.length; i++) routes[DB.schedules[i].route] = true;
    var allValid = true;
    for (var j = 0; j < DB.reservations.length; j++) {
      if (!routes[DB.reservations[j].train]) { allValid = false; break; }
    }
    return { passed: allValid, note: "seed reservations use train names not in the schedule table" };
  });

  // ============================================================
  // METRICS
  // ============================================================
  var n = results.length;
  var failures = 0;
  for (var i = 0; i < results.length; i++) if (!results[i].passed) failures++;
  var successes = n - failures;

  var T = OBSERVATION_PERIOD_HOURS;
  var mttr = MTTR_HOURS;
  var pofod = failures / n;
  var rocof = failures / T;                         // failures per hour
  var mtbf = failures > 0 ? T / failures : Infinity; // hours between failures
  var availability = failures > 0 ? mtbf / (mtbf + mttr) : 1;

  var metrics = {
    demands: n,
    successes: successes,
    failures: failures,
    observationPeriodHours: T,
    mttrHours: mttr,
    POFOD: pofod,
    ROCOF_per_hour: rocof,
    MTBF_hours: mtbf,
    Availability: availability
  };

  // ---- text summary (always logged; visible in the browser console too) ----
  var lines = [];
  lines.push("===== SIKKA RELIABILITY RESULTS =====");
  lines.push("Total demands (requests): " + n);
  lines.push("Successes: " + successes + "   Failures: " + failures);
  lines.push("Observation period T: " + T + " h    MTTR: " + mttr + " h");
  lines.push("POFOD  = f/n         = " + failures + "/" + n + " = " + pofod.toFixed(4));
  lines.push("ROCOF  = f/T         = " + failures + "/" + T + " = " + rocof.toFixed(4) + " failures/hour");
  lines.push("MTBF   = T/f         = " + (failures > 0 ? (T + "/" + failures + " = " + mtbf.toFixed(3) + " hours") : "no failures observed (infinite)"));
  lines.push("Availability = MTBF/(MTBF+MTTR) = " + (availability * 100).toFixed(3) + "%");
  lines.push("");
  var byCat = {};
  for (var i = 0; i < results.length; i++) {
    var c = results[i].category;
    byCat[c] = byCat[c] || { total: 0, fail: 0 };
    byCat[c].total++; if (!results[i].passed) byCat[c].fail++;
  }
  lines.push("Failures by category:");
  for (var cat in byCat) lines.push("  " + cat + ": " + byCat[cat].fail + " / " + byCat[cat].total);
  var summaryText = lines.join("\n");
  console.log(summaryText);

  // ---- on-screen table (browser) ----
  var host = $("relResults");
  if (host) {
    var html = "<pre style='background:#f6f8fa;padding:14px;border-radius:8px;white-space:pre-wrap'>" + summaryText + "</pre>";
    html += "<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;font-size:12px;width:100%'>";
    html += "<tr style='background:#1f3a5f;color:#fff'><th>#</th><th>Operation</th><th>Category</th><th>Result</th><th>Note</th></tr>";
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      html += "<tr style='background:" + (r.passed ? "#eafaef" : "#fdecea") + "'>" +
        "<td>" + (i + 1) + "</td><td>" + r.name + "</td><td>" + r.category + "</td>" +
        "<td><b>" + (r.passed ? "PASS" : "FAIL") + "</b></td><td>" + r.note + "</td></tr>";
    }
    html += "</table>";
    host.innerHTML = html;
  }

  // expose for the headless (jsdom) verification run
  if (typeof window !== "undefined") { window.__SIKKA_METRICS = metrics; window.__SIKKA_RESULTS = results; }
})();
