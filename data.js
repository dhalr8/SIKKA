// ===== SIKKA Fake Data — Dhay =====
const DB = {
  users: [
    { id:1, username:"admin", password:"admin123", role:"Administrator", name:"dhay" },
    { id:2, username:"staff1", password:"staff123", role:"Staff", name:"Danah" },
    { id:3, username:"staff2", password:"staff123", role:"Staff", name:"Lana" }
  ],
  schedules: [
    { id:"TRN-001", route:"RIYADH TO JEDDAH", depDate:"Apr 3, 2026", depTime:"9:41 AM", arrDate:"Apr 9, 2026", arrTime:"11:15 AM", seats:120, booked:63, price:50, status:"ACTIVE" },
    { id:"TRN-002", route:"JEDDAH TO RIYADH", depDate:"May 9, 2026", depTime:"7:00 PM", arrDate:"May 15, 2026", arrTime:"9:41 AM", seats:200, booked:200, price:90, status:"FULL" },
    { id:"TRN-003", route:"RIYADH TO DAMMAM", depDate:"Apr 1, 2026", depTime:"9:41 AM", arrDate:"Apr 3, 2026", arrTime:"3:30 AM", seats:80, booked:0, price:45, status:"ACTIVE" }
  ],
  passengers: [
    { id:1, name:"Fatima Khaldi", nid:"123670376", phone:"555893790", email:"Fatima@outlook.com", status:"ACTIVE" },
    { id:2, name:"Ahmad Fahad", nid:"114675376", phone:"5890679243", email:"Ahmad@outlook.com", status:"ACTIVE" }
  ],
  reservations: [
    { id:"#BK-00331", passenger:"Fatima khalid", train:"Riyadh Express", date:"10/03/2026", seat:"3D", status:"Confirmed" },
    { id:"#BK-00341", passenger:"Ahmad Fahad", train:"Dammam Shuttle", date:"14/05/2026", seat:"12B", status:"Cancelled" },
    { id:"#BK-00222", passenger:"Sara hamad", train:"Haramain Line", date:"28/10/2026", seat:"8C", status:"Confirmed" },
    { id:"#BK-00677", passenger:"Waad Ahmed", train:"Haramain Line", date:"03/03/2026", seat:"7A", status:"Confirmed" },
    { id:"#BK-00444", passenger:"Layan Faisal", train:"Haramain Line", date:"30/06/2026", seat:"10A", status:"Confirmed" },
    { id:"#BK-00514", passenger:"Ghada khalid", train:"Haramain Line", date:"19/04/2026", seat:"3B", status:"Confirmed" },
    { id:"#BK-00446", passenger:"Hasan Ibrahem", train:"Dammam Shuttle", date:"20/8/2026", seat:"3F", status:"Confirmed" }
  ],
  reports: [
    { name:"DAILY BOOKING REPORT", date:"Apr 3, 2026", time:"9:41 AM", type:"DAILY", cat:"BOOKINGS", bookings:35, revenue:"1900 SAR", size:"124KB" },
    { name:"DAILY REVENUE REPORT", date:"May 9, 2026", time:"7:00 PM", type:"DAILY", cat:"REVENUE", bookings:35, revenue:"499 SAR", size:"98KB" },
    { name:"WEEKLY SUMMARY REPORT", date:"Apr 1, 2026", time:"9:41 AM", type:"WEEKLY", cat:"SUMMARY", bookings:50, revenue:"2900 SAR", size:"340KB" },
    { name:"MONTHLY REVENUE REPORT", date:"Apr 9, 2026", time:"11:15 AM", type:"MONTHLY", cat:"REVENUE", bookings:100, revenue:"28000 SAR", size:"812KB" },
    { name:"MONTHLY CANCELLATION REPORT", date:"May 15, 2026", time:"9:41 AM", type:"MONTHLY", cat:"CANCELLATIONS", bookings:10, revenue:"- SAR", size:"210KB" },
    { name:"TRAIN UTILIZATION REPORT", date:"Apr 3, 2026", time:"3:30 AM", type:"CUSTOM", cat:"UTILIZATION", bookings:98, revenue:"71300 SAR", size:"540KB" }
  ],
  auditLog: [
    { time:"2026-04-01 08:00", user:"admin", action:"Login", detail:"Admin logged in" },
    { time:"2026-04-01 08:15", user:"admin", action:"Create Schedule", detail:"Created TRN-001" },
    { time:"2026-04-01 09:00", user:"staff1", action:"Register Passenger", detail:"Registered Fatima Khaldi" },
    { time:"2026-04-01 09:30", user:"staff1", action:"Book Ticket", detail:"Booked #BK-00331" },
    { time:"2026-04-02 10:00", user:"staff1", action:"Cancel Reservation", detail:"Cancelled #BK-00341" },
    { time:"2026-04-03 08:00", user:"system", action:"Backup", detail:"Daily backup completed" }
  ],
  nextResId: 447,
  nextPassId: 3
};

// Current user
let currentUser = null;

// Navigation
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  document.getElementById('page-' + page).style.display = 'block';
  const nav = document.getElementById('nav-' + page);
  if (nav) nav.classList.add('active');
  // Render page
  const renderers = { dashboard:renderDashboard, schedules:renderSchedules, reservations:renderReservations,
    passengers:renderPassengers, booking:renderBooking, reports:renderReports, users:renderUsers, audit:renderAudit };
  if (renderers[page]) renderers[page]();
}

// Badge helper
function badge(text, type) {
  const map = { Confirmed:'badge-green', ACTIVE:'badge-green', Cancelled:'badge-red', FULL:'badge-red',
    ARCHIVE:'badge-yellow', DAILY:'badge-green', WEEKLY:'badge-blue', MONTHLY:'badge-yellow', CUSTOM:'badge-green',
    Administrator:'badge-blue', Staff:'badge-green' };
  return `<span class="badge ${map[type||text]||'badge-green'}">${text}</span>`;
}

// Pagination helper
function pagination() {
  return `<div class="pagination">← Previous <span class="pg-active">1</span> 2 3 ... 67 68 Next →</div>`;
}
