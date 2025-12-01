const token = localStorage.getItem("token");

async function api(url, method="GET", body=null) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: body ? JSON.stringify(body) : null
  });
  return res.json();
}

// LOAD USERS
async function loadUsers() {
  const data = await api("/api/admin/users");
  renderTable(data.users, "users");
}

// LOAD SERVICEMEN
async function loadServicemen() {
  const data = await api("/api/admin/servicemen");
  renderTable(data.servicemen, "servicemen");
}

// LOAD BILLS
async function loadBills() {
  const data = await api("/api/admin/bills");
  renderTable(data.bills, "bills");
}

// LOAD BOOKINGS
async function loadBookings() {
  const data = await api("/api/admin/bookings");
  renderTable(data.bookings, "bookings");
}

// RENDER TABLE
// RENDER TABLE (STYLED + FITS SCREEN)
function renderTable(rows, tableName) {
  if (!rows || rows.length === 0) {
    document.getElementById("content").innerHTML = `
      <p class="no-data">No data available</p>
    `;
    return;
  }

  const cols = Object.keys(rows[0]);

  let html = `
    <h3 class="table-title">${tableName.toUpperCase()}</h3>

    <div class="table-wrapper">
      <table class="styled-table">
        <thead>
          <tr>
            ${cols.map(c => `<th>${c.replace(/_/g, " ")}</th>`).join("")}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  rows.forEach(r => {
    html += `<tr>`;
    cols.forEach(c => {
      html += `<td>${r[c] !== null ? r[c] : "-"}</td>`;
    });

    html += `
      <td>
        <button class="btn btn-book" onclick='editRow("${tableName}", "${r.id}")'>Edit</button>
      </td>
    `;
    html += `</tr>`;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("content").innerHTML = html;
}


// EDIT ROW
function editRow(table, id) {
  const updates = prompt("Enter JSON updates like: {\"full_name\":\"New Name\"}");
  if (!updates) return;

  api("/api/admin/update", "PUT", {
    table,
    id,
    updates: JSON.parse(updates)
  }).then(d => {
    alert("Updated!");
    if (table === "users") loadUsers();
    if (table === "serviceman") loadServicemen();
  });
}

/***********************************************
 *  ADMIN PANEL — PROFILE + LOGOUT SYSTEM
 ***********************************************/

(function () {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  // If this is admin page AND not admin → force logout
  if (window.location.pathname.includes("admin.html")) {
    if (!token || role !== "admin") {
      localStorage.clear();
      return window.location = "index.html";
    }
  }

  // ───────────────────────────────────────────────
  // LOAD ADMIN PROFILE INTO HEADER + PAGE
  // ───────────────────────────────────────────────
  async function loadAdminProfile() {
    if (!token) return;

    try {
      const r = await fetch("/api/me", {
        headers: { Authorization: "Bearer " + token }
      });

      if (!r.ok) {
        localStorage.clear();
        return window.location = "index.html";
      }

      const j = await r.json();
      
      // NAVBAR name
      const nameNavEl = document.getElementById("adminNameNav");
      if (nameNavEl) nameNavEl.textContent = j.profile.full_name || "Admin";

      // ADMIN PROFILE SECTION
      const adminInfoEl = document.getElementById("adminProfileInfo");
      if (adminInfoEl) {
        adminInfoEl.innerHTML = `
          <p><strong>Name:</strong> ${j.profile.full_name || "-"}</p>
          <p><strong>Email:</strong> ${j.profile.email || "-"}</p>
          <p><strong>Phone:</strong> ${j.profile.phone || "-"}</p>
          <p><strong>Role:</strong> Admin</p>
        `;
      }

    } catch (err) {
      console.error("Admin profile load error:", err);
    }
  }

  // Auto-load profile when admin.html is opened
  if (window.location.pathname.includes("admin.html")) {
    loadAdminProfile();
  }

  // ───────────────────────────────────────────────
  // LOGOUT button (admin & user pages)
  // ───────────────────────────────────────────────
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.clear();
      window.location = "index.html";
    });
  }

})();
