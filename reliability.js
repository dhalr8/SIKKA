// ============================================================
// SIKKA Reliability Test  (SWE2 Phase 1 — Part B)
// Sends 100 REAL requests to the Supabase database and computes:
//   Probability of Failure on Demand (POFOD)
//   Rate of Occurrence of Failures  (ROCOF)
//   Mean Time Between Failures       (MTBF)
//   Availability
//
// DEFINITION OF A FAILURE (used throughout this test):
//   A request FAILS if the database does not complete it successfully
//   (it returns an error, is rejected by a constraint, or times out).
//   A request SUCCEEDS if the database returns a valid response.
//
// The 100 requests are a realistic operational mix:
//   - 50 reads (schedules, users/auth, passengers, reservations)
//   - 42 valid writes (register, book, cancel, update schedule)
//   -  8 requests that the database legitimately rejects
//        (duplicate national ID, duplicate booking ID, missing field)
//   These 8 are real failure scenarios that occur in day-to-day use.
//
// Browser: open reliability.html with Live Server.
// `supa` comes from supabaseClient.js.
// ============================================================

// ---- Parameters the team may adjust and justify in the report ----
var OBSERVATION_PERIOD_HOURS = 24; // window the 100 requests represent
var MTTR_HOURS = 0.5;              // mean time to repair one failure

async function runReliability() {
  var now = (typeof performance !== "undefined" && performance.now)
    ? function () { return performance.now(); }
    : function () { return Date.now(); };

  var tag = Date.now();            // unique suffix so valid writes don't collide
  var results = [];
  var requests = [];
  function add(name, category, fn) { requests.push({ name: name, category: category, fn: fn }); }

  // ---------- 50 READ requests (valid) ----------
  for (var i = 0; i < 15; i++)
    add("read active schedules #" + i, "Read: schedules",
      function () { return supa.from("schedules").select("*"); });
  for (var i = 0; i < 10; i++)
    add("auth lookup (username=admin) #" + i, "Read: users (auth)",
      function () { return supa.from("users").select("username,role").eq("username", "admin"); });
  for (var i = 0; i < 15; i++)
    add("read passengers #" + i, "Read: passengers",
      function () { return supa.from("passengers").select("*"); });
  for (var i = 0; i < 10; i++)
    add("read reservations #" + i, "Read: reservations",
      function () { return supa.from("reservations").select("*"); });

  // ---------- 42 valid WRITE requests ----------
  // 15 passenger registrations (unique national IDs)
  for (var i = 0; i < 15; i++)
    (function (k) {
      add("register passenger #" + k, "Write: register passenger",
        function () {
          return supa.from("passengers").insert({
            name: "Load Test " + k, nid: "LT" + tag + "-" + k,
            phone: "0500000000", email: "lt" + k + "@test.com"
          });
        });
    })(i);

  // 12 reservation creations (unique ids we can cancel later)
  var resIds = [];
  for (var i = 0; i < 12; i++)
    (function (k) {
      var rid = "#LT-" + tag + "-" + k; resIds.push(rid);
      add("create reservation #" + k, "Write: create reservation",
        function () {
          return supa.from("reservations").insert({
            id: rid, passenger: "Load Test " + k, train: "RIYADH TO JEDDAH",
            date: "01/01/2026", seat: "A" + k, status: "Confirmed", price: 50
          });
        });
    })(i);

  // 8 cancellations (update reservations we just created)
  for (var i = 0; i < 8; i++)
    (function (k) {
      add("cancel reservation #" + k, "Write: cancel reservation",
        function () { return supa.from("reservations").update({ status: "Cancelled" }).eq("id", resIds[k]); });
    })(i);

  // 7 schedule updates (idempotent: set each to its own current status)
  var schedPairs = [["TRN-001", "ACTIVE"], ["TRN-002", "FULL"], ["TRN-003", "ACTIVE"],
                    ["TRN-001", "ACTIVE"], ["TRN-002", "FULL"], ["TRN-003", "ACTIVE"], ["TRN-001", "ACTIVE"]];
  for (var i = 0; i < 7; i++)
    (function (k) {
      add("update schedule " + schedPairs[k][0] + " #" + k, "Write: update schedule",
        function () { return supa.from("schedules").update({ status: schedPairs[k][1] }).eq("id", schedPairs[k][0]); });
    })(i);

  // ---------- 8 requests the database legitimately REJECTS (real failures) ----------
  // Duplicate national ID (123670376 already exists -> UNIQUE violation)
  for (var i = 0; i < 3; i++)
    add("register duplicate national ID #" + i, "Fault: duplicate national ID",
      function () {
        return supa.from("passengers").insert({
          name: "Duplicate Person", nid: "123670376", phone: "0", email: "dup@test.com"
        });
      });
  // Duplicate booking ID (#BK-00331 already exists -> PRIMARY KEY violation)
  for (var i = 0; i < 3; i++)
    add("create duplicate booking ID #" + i, "Fault: duplicate booking ID",
      function () {
        return supa.from("reservations").insert({
          id: "#BK-00331", passenger: "Dup", train: "RIYADH TO JEDDAH",
          date: "01/01/2026", seat: "Z1", status: "Confirmed", price: 50
        });
      });
  // Missing required field (no name / no nid -> NOT NULL violation)
  for (var i = 0; i < 2; i++)
    add("register missing required field #" + i, "Fault: missing required field",
      function () { return supa.from("passengers").insert({ phone: "0", email: "x@test.com" }); });

  // ---------- run all requests sequentially, timing each ----------
  var startWall = Date.now();
  var t0all = now();
  for (var r = 0; r < requests.length; r++) {
    var req = requests[r];
    var t0 = now();
    var ok = false, note = "";
    try {
      var res = await req.fn();
      if (res && res.error) { ok = false; note = res.error.message; }
      else { ok = true; note = "ok"; }
    } catch (e) {
      ok = false; note = "exception: " + (e && e.message ? e.message : e);
    }
    results.push({ name: req.name, category: req.category, passed: ok, note: note, ms: now() - t0 });
  }
  var totalMs = now() - t0all;

  // ---------- metrics ----------
  var n = results.length, failures = 0, sumMs = 0;
  for (var i = 0; i < results.length; i++) { if (!results[i].passed) failures++; sumMs += results[i].ms; }
  var successes = n - failures;

  var T = OBSERVATION_PERIOD_HOURS, mttr = MTTR_HOURS;
  var pofod = failures / n;
  var rocof = failures / T;
  var mtbf = failures > 0 ? T / failures : Infinity;
  var availTime = failures > 0 ? mtbf / (mtbf + mttr) : 1;
  var availObserved = successes / n;

  var metrics = {
    demands: n, successes: successes, failures: failures,
    measuredElapsedSeconds: (totalMs / 1000), avgLatencyMs: (sumMs / n),
    observationPeriodHours: T, mttrHours: mttr,
    POFOD: pofod, ROCOF_per_hour: rocof,
    MTBF_hours: (mtbf === Infinity ? null : mtbf),
    Availability_observed: availObserved, Availability_timeModel: availTime
  };

  // ---------- text summary ----------
  var L = [];
  L.push("===== SIKKA RELIABILITY RESULTS (real Supabase requests) =====");
  L.push("Run started: " + new Date(startWall).toLocaleString());
  L.push("Failure = a request the database did not complete successfully.");
  L.push("");
  L.push("Total requests (demands) n = " + n);
  L.push("Successes = " + successes + "   Failures f = " + failures);
  L.push("Measured run time: " + (totalMs / 1000).toFixed(2) + " s   Avg latency: " + (sumMs / n).toFixed(1) + " ms");
  L.push("");
  L.push("POFOD = f/n = " + failures + "/" + n + " = " + pofod.toFixed(4));
  L.push("Observed availability = successes/n = " + successes + "/" + n + " = " + (availObserved * 100).toFixed(2) + "%");
  L.push("");
  L.push("Using observation period T = " + T + " h and MTTR = " + mttr + " h:");
  L.push("  ROCOF = f/T = " + failures + "/" + T + " = " + rocof.toFixed(4) + " failures/hour");
  L.push("  MTBF  = T/f = " + (failures > 0 ? (T + "/" + failures + " = " + mtbf.toFixed(3) + " h") : "no failures (infinite)"));
  L.push("  Availability = MTBF/(MTBF+MTTR) = " + (availTime * 100).toFixed(3) + "%");
  L.push("");
  var byCat = {};
  for (var i = 0; i < results.length; i++) {
    var c = results[i].category; byCat[c] = byCat[c] || { total: 0, fail: 0 };
    byCat[c].total++; if (!results[i].passed) byCat[c].fail++;
  }
  L.push("By request type (failures / total):");
  for (var cat in byCat) L.push("  " + cat + ": " + byCat[cat].fail + " / " + byCat[cat].total);
  var summary = L.join("\n");
  if (typeof console !== "undefined") console.log(summary);

  // ---------- on-screen table (browser) ----------
  if (typeof document !== "undefined") {
    var host = document.getElementById("relResults");
    if (host) {
      var html = "<pre style='background:#f6f8fa;padding:14px;border-radius:8px;white-space:pre-wrap'>" + summary + "</pre>";
      html += "<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;font-size:12px;width:100%'>";
      html += "<tr style='background:#1f3a5f;color:#fff'><th>#</th><th>Request</th><th>Type</th><th>Result</th><th>ms</th><th>Note</th></tr>";
      for (var i = 0; i < results.length; i++) {
        var x = results[i];
        html += "<tr style='background:" + (x.passed ? "#eafaef" : "#fdecea") + "'>" +
          "<td>" + (i + 1) + "</td><td>" + x.name + "</td><td>" + x.category + "</td>" +
          "<td><b>" + (x.passed ? "PASS" : "FAIL") + "</b></td><td>" + x.ms.toFixed(0) + "</td><td>" + x.note + "</td></tr>";
      }
      html += "</table>";
      host.innerHTML = html;
    }
  }

  return { metrics: metrics, results: results, summary: summary };
}

if (typeof document !== "undefined") { runReliability(); }
if (typeof module !== "undefined" && module.exports) { module.exports = { runReliability: runReliability }; }
