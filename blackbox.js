// ============================================================
// SIKKA Black-Box Testing  (SWE2 Phase 2 — Part B)
// Techniques: Equivalence Partitioning (EP) + Boundary Value Analysis (BVA)
//
// Tests the SIX project requirements from the assignment brief:
//   R1 Create, update, and delete train schedules
//   R2 Define routes, departure, and arrival times
//   R3 Specify seat capacity and ticket pricing
//   R4 Process ticket reservations
//   R5 Validate seat availability before confirmation
//   R6 Automatically update the remaining seat capacity
//
// Black-box = we only supply inputs through the application's own
// functions and observe the outcome in the database. No internal code
// is inspected.
// ============================================================

async function runBlackBox() {
  var tag = Date.now();
  var results = [];

  function record(id, req, technique, partition, input, expected, actual) {
    results.push({
      id: id, req: req, technique: technique, partition: partition,
      input: input, expected: expected, actual: actual,
      status: (expected === actual) ? "PASS" : "FAIL"
    });
  }

  // ---------- make sure the database loaded and we are logged in ----------
  await loadAll();
  if (!DB.users.length || !DB.schedules.length || !DB.passengers.length) {
    var why = "Could not load data from the database. Check that sikka_schema.sql has been run, "
            + "that you opened this page with Live Server (not file://), and that you are online.";
    if (typeof document !== "undefined" && document.getElementById("bbResults"))
      document.getElementById("bbResults").innerHTML = "<b style='color:#b00'>" + why + "</b>";
    throw new Error(why);
  }
  if (!currentUser) currentUser = DB.users.find(function (u) { return u.username === "admin"; }) || DB.users[0];

  // ---------- helpers that drive the REAL app functions ----------
  function $(id) { return document.getElementById(id); }

  async function createSchedule(id, route, dep, arr, seats, price) {
    $("mainContent").innerHTML = renderSchedules();
    $("sId").value = id; $("sRoute").value = route;
    $("sDep").value = dep; $("sArr").value = arr;
    $("sSeats").value = seats; $("sPrice").value = price;
    await addSchedule();
    await loadAll();
    return DB.schedules.some(function (s) { return s.id === id; }) ? "Created" : "Rejected";
  }

  async function bookTicket_(passId, trainId) {
    $("mainContent").innerHTML = renderBooking();
    $("bPass").value = passId === null ? "" : String(passId);
    $("bTrain").value = trainId === null ? "" : String(trainId);
    var before = DB.reservations.length;
    await bookTicket();
    await loadAll();
    return DB.reservations.length > before ? "Booked" : "Rejected";
  }

  function schedule(id) { return DB.schedules.find(function (s) { return s.id === id; }); }
  function remaining(id) { var s = schedule(id); return s ? (s.seats - s.booked) : null; }

  // a registered passenger to book with
  var pax = DB.passengers[0];

  // ============================================================
  // R1 — Create, update, and delete train schedules
  // ============================================================
  var r1id = "BB" + tag + "A";
  record("TC-01", "R1", "EP", "Valid: unique Train ID + all fields",
    "ID=" + r1id + ", route filled, seats=100, price=60", "Created",
    await createSchedule(r1id, "BB ROUTE A " + tag, "Apr 20, 2026 9:00 AM", "Apr 20, 2026 3:00 PM", "100", "60"));

  record("TC-02", "R1", "EP", "Invalid: duplicate Train ID",
    "ID=TRN-001 (already exists)", "Rejected",
    await createSchedule("TRN-001", "DUP ROUTE", "Apr 20, 2026 9:00 AM", "Apr 20, 2026 3:00 PM", "50", "40"));

  record("TC-03", "R1", "EP", "Invalid: required field empty",
    "route = '' (empty)", "Rejected",
    await createSchedule("BB" + tag + "B", "", "Apr 20, 2026 9:00 AM", "Apr 20, 2026 3:00 PM", "50", "40"));

  // delete (archive) the schedule created in TC-01
  await deleteSchedule(r1id);
  await loadAll();
  var arch = schedule(r1id);
  record("TC-04", "R1", "EP", "Valid: archive an existing schedule",
    "Archive " + r1id, "ARCHIVE", arch ? arch.status : "not found");

  // ============================================================
  // R2 — Define routes, departure and arrival times
  // ============================================================
  record("TC-05", "R2", "EP", "Valid: arrival after departure",
    "dep=Apr 20 9:00 AM, arr=Apr 20 3:00 PM", "Created",
    await createSchedule("BB" + tag + "C", "BB ROUTE C " + tag, "Apr 20, 2026 9:00 AM", "Apr 20, 2026 3:00 PM", "50", "40"));

  record("TC-06", "R2", "EP", "Invalid: arrival before departure",
    "dep=Apr 20 3:00 PM, arr=Apr 20 9:00 AM", "Rejected",
    await createSchedule("BB" + tag + "D", "BB ROUTE D " + tag, "Apr 20, 2026 3:00 PM", "Apr 20, 2026 9:00 AM", "50", "40"));

  record("TC-07", "R2", "BVA", "Boundary: arrival equals departure",
    "dep = arr = Apr 20, 2026 9:00 AM", "Rejected",
    await createSchedule("BB" + tag + "E", "BB ROUTE E " + tag, "Apr 20, 2026 9:00 AM", "Apr 20, 2026 9:00 AM", "50", "40"));

  // ============================================================
  // R3 — Specify seat capacity and ticket pricing  (BVA focus)
  // Valid seat capacity: integer >= 1 ; valid price: > 0
  // ============================================================
  record("TC-08", "R3", "BVA", "Just below minimum seats (0)",
    "seats = 0", "Rejected",
    await createSchedule("BB" + tag + "F", "BB ROUTE F " + tag, "Apr 20, 2026 9:00 AM", "Apr 20, 2026 3:00 PM", "0", "40"));

  record("TC-09", "R3", "BVA", "Minimum valid seats (1)",
    "seats = 1", "Created",
    await createSchedule("BB" + tag + "G", "BB ROUTE G " + tag, "Apr 20, 2026 9:00 AM", "Apr 20, 2026 3:00 PM", "1", "40"));

  record("TC-10", "R3", "EP", "Invalid class: negative seats",
    "seats = -1", "Rejected",
    await createSchedule("BB" + tag + "H", "BB ROUTE H " + tag, "Apr 20, 2026 9:00 AM", "Apr 20, 2026 3:00 PM", "-1", "40"));

  record("TC-11", "R3", "BVA", "Just below minimum price (0)",
    "price = 0", "Rejected",
    await createSchedule("BB" + tag + "I", "BB ROUTE I " + tag, "Apr 20, 2026 9:00 AM", "Apr 20, 2026 3:00 PM", "50", "0"));

  record("TC-12", "R3", "BVA", "Minimum valid price (1)",
    "price = 1", "Created",
    await createSchedule("BB" + tag + "J", "BB ROUTE J " + tag, "Apr 20, 2026 9:00 AM", "Apr 20, 2026 3:00 PM", "50", "1"));

  // ============================================================
  // R5 setup — a train with EXACTLY 2 seats for boundary testing
  // ============================================================
  var capId = "BB" + tag + "CAP";
  var capRoute = "BB CAP ROUTE " + tag;
  await createSchedule(capId, capRoute, "Apr 20, 2026 9:00 AM", "Apr 20, 2026 3:00 PM", "2", "50");

  // ============================================================
  // R4 — Process ticket reservations
  // ============================================================
  record("TC-13", "R4", "EP", "Valid: passenger and train selected",
    "passenger=" + pax.name + ", train=" + capId, "Booked",
    await bookTicket_(pax.id, capId));

  record("TC-14", "R4", "EP", "Invalid: no passenger selected",
    "passenger = (none), train = " + capId, "Rejected",
    await bookTicket_(null, capId));

  record("TC-15", "R4", "EP", "Invalid: no train selected",
    "passenger = " + pax.name + ", train = (none)", "Rejected",
    await bookTicket_(pax.id, null));

  // ============================================================
  // R6 (part 1) — capacity decremented by exactly 1 after TC-13
  // ============================================================
  var remAfterFirst = remaining(capId);
  record("TC-19", "R6", "EP", "Valid: one booking decrements capacity by 1",
    "capacity 2, one booking made", "1 seat remaining", remAfterFirst + " seat remaining");

  // ============================================================
  // R5 — Validate seat availability before confirmation  (BVA)
  // ============================================================
  record("TC-16", "R5", "BVA", "Above boundary: 1 seat remaining",
    "remaining = 1, attempt booking", "Booked",
    await bookTicket_(pax.id, capId));

  var remAfterLast = remaining(capId);
  record("TC-20", "R6", "BVA", "Boundary: last seat booked leaves 0",
    "capacity 2, two bookings made", "0 seats remaining", remAfterLast + " seats remaining");

  record("TC-17", "R5", "BVA", "At boundary: 0 seats remaining",
    "remaining = 0, attempt booking", "Rejected",
    await bookTicket_(pax.id, capId));

  record("TC-18", "R5", "EP", "Invalid class: fully booked train",
    "train TRN-002 (200/200 booked)", "Rejected",
    await bookTicket_(pax.id, "TRN-002"));

  // ============================================================
  // R6 (part 2) — cancelling a booking returns the seat
  // ============================================================
  var mine = DB.reservations.filter(function (r) { return r.train === capRoute && r.status === "Confirmed"; });
  var remBeforeCancel = remaining(capId);
  if (mine.length) {
    await cancelRes(mine[0].id);
    await loadAll();
  }
  var remAfterCancel = remaining(capId);
  record("TC-21", "R6", "EP", "Valid: cancellation releases the seat",
    "cancel 1 booking (remaining was " + remBeforeCancel + ")",
    (remBeforeCancel + 1) + " seats remaining", remAfterCancel + " seats remaining");

  // ============================================================
  // Report
  // ============================================================
  var passed = results.filter(function (r) { return r.status === "PASS"; }).length;
  var L = [];
  L.push("===== SIKKA BLACK-BOX TEST RESULTS (EP + BVA) =====");
  L.push("Executed: " + new Date().toLocaleString());
  L.push("Total test cases: " + results.length + "   Passed: " + passed + "   Failed: " + (results.length - passed));
  L.push("");
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    L.push(r.status + "  " + r.id + " [" + r.req + "/" + r.technique + "] " + r.partition);
    L.push("      input: " + r.input);
    L.push("      expected: " + r.expected + "   |   actual: " + r.actual);
  }
  var summary = L.join("\n");
  if (typeof console !== "undefined") console.log(summary);

  if (typeof document !== "undefined") {
    var host = $("bbResults");
    if (host) {
      var h = "<p><b>" + results.length + " test cases — " + passed + " passed, " +
        (results.length - passed) + " failed</b></p>";
      h += "<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;font-size:12px;width:100%'>";
      h += "<tr style='background:#1f3a5f;color:#fff'><th>ID</th><th>Req</th><th>Technique</th><th>Partition / Boundary</th><th>Input</th><th>Expected</th><th>Actual</th><th>Status</th></tr>";
      for (var i = 0; i < results.length; i++) {
        var r = results[i];
        h += "<tr style='background:" + (r.status === "PASS" ? "#eafaef" : "#fdecea") + "'>" +
          "<td>" + r.id + "</td><td>" + r.req + "</td><td>" + r.technique + "</td><td>" + r.partition + "</td>" +
          "<td>" + r.input + "</td><td>" + r.expected + "</td><td>" + r.actual + "</td>" +
          "<td><b>" + r.status + "</b></td></tr>";
      }
      h += "</table>";
      host.innerHTML = h;
    }
  }

  return { results: results, summary: summary };
}

if (typeof document !== "undefined" && document.getElementById("bbResults")) { runBlackBox(); }
if (typeof module !== "undefined" && module.exports) { module.exports = { runBlackBox: runBlackBox }; }
