// ============================================================
// SIKKA Reliability Test  (SWE2 Phase 1 — Part B)
// Applies 100 REAL requests to the Supabase database and computes:
//   Probability of Failure on Demand (POFOD)
//   Rate of Occurrence of Failures  (ROCOF)
//   Mean Time Between Failures       (MTBF)
//   Availability
//
// A "request" = one real database operation (read or write) sent to
// Supabase over the network. A request SUCCEEDS if the database returns
// a valid response with no error. It FAILS if the request errors, times
// out, or the service is unavailable (a real outage shows up here).
//
// Browser:  open reliability.html with Live Server.
// The global `supa` client comes from supabaseClient.js.
// ============================================================

// ---- Parameters the team may adjust and justify in the report ----
var OBSERVATION_PERIOD_HOURS = 24; // window the 100 requests represent
var MTTR_HOURS = 0.5;              // mean time to repair one failure

async function runReliability() {
  var now = (typeof performance !== "undefined" && performance.now)
    ? function () { return performance.now(); }
    : function () { return Date.now(); };

  var tag = Date.now();               // unique suffix so writes don't collide
  var results = [];
  var requests = [];

  function add(name, category, fn) { requests.push({ name: name, category: category, fn: fn }); }

  // ---------- 50 READ requests ----------
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

  // ---------- 50 WRITE requests ----------
  // 20 passenger inserts (unique national IDs)
  for (var i = 0; i < 20; i++)
    (function (k) {
      add("register passenger #" + k, "Write: register passenger",
        function () {
          return supa.from("passengers").insert({
            name: "Load Test " + k,
            nid: "LT" + tag + "-" + k,
            phone: "0500000000",
            email: "lt" + k + "@test.com"
          });
        });
    })(i);

  // 15 reservation inserts (unique ids we can cancel later)
  var resIds = [];
  for (var i = 0; i < 15; i++)
    (function (k) {
      var rid = "#LT-" + tag + "-" + k;
      resIds.push(rid);
      add("create reservation #" + k, "Write: create reservation",
        function () {
          return supa.from("reservations").insert({
            id: rid, passenger: "Load Test " + k, train: "RIYADH TO JEDDAH",
            date: "01/01/2026", seat: "A" + k, status: "Confirmed", price: 50
          });
        });
    })(i);

  // 10 cancellations (update the reservations we just created)
  for (var i = 0; i < 10; i++)
    (function (k) {
      add("cancel reservation #" + k, "Write: cancel reservation",
        function () {
          return supa.from("reservations").update({ status: "Cancelled" }).eq("id", resIds[k]);
        });
    })(i);

  // 5 schedule updates
  var schedIds = ["TRN-001", "TRN-002", "TRN-003", "TRN-001", "TRN-003"];
  for (var i = 0; i < 5; i++)
    (function (k) {
      add("update schedule " + schedIds[k] + " #" + k, "Write: update schedule",
        function () {
          return supa.from("schedules").update({ status: "ACTIVE" }).eq("id", schedIds[k]);
        });
    })(i);

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
    var ms = now() - t0;
    results.push({ name: req.name, category: req.category, passed: ok, note: note, ms: ms });
  }
  var totalMs = now() - t0all;

  // ---------- metrics ----------
  var n = results.length;
  var failures = 0, sumMs = 0;
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
    measuredElapsedSeconds: (totalMs / 1000),
    avgLatencyMs: (sumMs / n),
    observationPeriodHours: T, mttrHours: mttr,
    POFOD: pofod, ROCOF_per_hour: rocof,
    MTBF_hours: (mtbf === Infinity ? null : mtbf),
    Availability_observed: availObserved,
    Availability_timeModel: availTime
  };

  // ---------- text summary ----------
  var L = [];
  L.push("===== SIKKA RELIABILITY RESULTS (real Supabase requests) =====");
  L.push("Run started: " + new Date(startWall).toLocaleString());
  L.push("Total requests (demands): " + n);
  L.push("Successes: " + successes + "   Failures: " + failures);
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

// auto-run in the browser; export for Node verification
if (typeof document !== "undefined") { runReliability(); }
if (typeof module !== "undefined" && module.exports) { module.exports = { runReliability: runReliability }; }
