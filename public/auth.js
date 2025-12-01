// // auth.js (frontend)
// const apiBase = ''; // same origin

// // --- ROLE CHANGE HANDLER (Signup page only) ---
// const sRole = document.getElementById('s_role');
// const extraDiv = document.getElementById('extraFields');

// if (sRole) {
//   sRole.addEventListener('change', () => {
//     extraDiv.innerHTML = '';
//     if (sRole.value === 'serviceman') {
//       extraDiv.innerHTML = `
//         <input id="s_vehicle_types" placeholder="Vehicle types (comma-separated)"><br>
//         <input id="s_base_cost" placeholder="Base cost (numeric)"><br>
//       `;
//     }
//     if (sRole.value === 'dealer') {
//       extraDiv.innerHTML = `
//         <input id="s_shop_name" placeholder="Shop name"><br>
//         <input id="s_address" placeholder="Address"><br>
//       `;
//     }
//   });
// }

// // --- SIGNUP HANDLER ---
// const btnSignup = document.getElementById('btnSignup');
// if (btnSignup) {
//   btnSignup.addEventListener('click', async () => {
//     const full_name = document.getElementById('s_name').value;
//     const phone = document.getElementById('s_phone').value;
//     const email = document.getElementById('s_email').value;
//     const password = document.getElementById('s_password').value;
//     const role = document.getElementById('s_role').value;

//     if (!email || !password) return alert('Email & password required');

//     const extra = {};
//     if (role === 'serviceman') {
//       extra.vehicle_types = document.getElementById('s_vehicle_types')?.value || '';
//       extra.base_cost = parseFloat(document.getElementById('s_base_cost')?.value || 0) || 0;
//     }
//     if (role === 'dealer') {
//       extra.shop_name = document.getElementById('s_shop_name')?.value || '';
//       extra.address = document.getElementById('s_address')?.value || '';
//     }

//     const res = await fetch(`${apiBase}/api/signup`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ full_name, phone, email, password, role, extra })
//     });

//     const j = await res.json();
//     if (!res.ok) return alert(j.error || JSON.stringify(j));

//     localStorage.setItem('token', j.token);
//     localStorage.setItem('role', role);
//     window.location = 'dashboard.html';
//   });
// }

// // --- LOGIN HANDLER ---
// const btnLogin = document.getElementById('btnLogin');
// if (btnLogin) {
//   btnLogin.addEventListener('click', async () => {
//     const email = document.getElementById('l_email').value;
//     const password = document.getElementById('l_password').value;
//     const role = document.getElementById('l_role').value || null;

//     if (!email || !password) return alert('Email & password required');

//     const res = await fetch(`${apiBase}/api/login`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ email, password, role })
//     });

//     const j = await res.json();
//     if (!res.ok) return alert(j.error || JSON.stringify(j));

//     localStorage.setItem('token', j.token);
//     localStorage.setItem('role', j.profile.role || role);
//     window.location = 'dashboard.html';
//   });
// }
// auth.js (frontend)
const apiBase = ''; // same origin (MUST BE FIRST LINE)

// --- ROLE CHANGE HANDLER (Signup page only) ---
const sRole = document.getElementById('s_role');
const extraDiv = document.getElementById('extraFields');

if (sRole) {
  sRole.addEventListener('change', () => {
    extraDiv.innerHTML = '';
    if (sRole.value === 'serviceman') {
      extraDiv.innerHTML = `
        <input id="s_vehicle_types" placeholder="Vehicle types (comma-separated)"><br>
        <input id="s_base_cost" placeholder="Base cost (numeric)"><br>
      `;
    }
    if (sRole.value === 'dealer') {
      extraDiv.innerHTML = `
        <input id="s_shop_name" placeholder="Shop name"><br>
        <input id="s_address" placeholder="Address"><br>
      `;
    }
  });
}

// --- SIGNUP HANDLER ---
const btnSignup = document.getElementById('btnSignup');
if (btnSignup) {
  btnSignup.addEventListener('click', async () => {
    const full_name = document.getElementById('s_name').value;
    const phone = document.getElementById('s_phone').value;
    const email = document.getElementById('s_email').value;
    const password = document.getElementById('s_password').value;
    const role = document.getElementById('s_role').value;

    if (!email || !password) return alert('Email & password required');

    const extra = {};
    if (role === 'serviceman') {
      extra.vehicle_types = document.getElementById('s_vehicle_types')?.value || '';
      extra.base_cost = parseFloat(document.getElementById('s_base_cost')?.value || 0) || 0;
    }
    if (role === 'dealer') {
      extra.shop_name = document.getElementById('s_shop_name')?.value || '';
      extra.address = document.getElementById('s_address')?.value || '';
    }

    const res = await fetch(`${apiBase}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, phone, email, password, role, extra })
    });

    const j = await res.json();
    if (!res.ok) return alert(j.error || JSON.stringify(j));

    localStorage.setItem('token', j.token);
    localStorage.setItem('role', role);

    // OLD functionality → always redirect to dashboard
    window.location = 'dashboard.html';
  });
}

// --- LOGIN HANDLER ---
const btnLogin = document.getElementById('btnLogin');
if (btnLogin) {
  btnLogin.addEventListener('click', async () => {
    const email = document.getElementById('l_email').value;
    const password = document.getElementById('l_password').value;
    const role = document.getElementById('l_role').value || null;

    if (!email || !password) return alert('Email & password required');

    const res = await fetch(`${apiBase}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });

    const j = await res.json();
    if (!res.ok) return alert(j.error || JSON.stringify(j));

    // OLD functionality preserved
    localStorage.setItem('token', j.token);
    localStorage.setItem('role', j.profile.role || role);

    // NEW: Admin redirect (no impact to old system)
    if (j.profile.role === 'admin') {
      return window.location = 'admin.html';
    }

    // OLD redirect preserved
    window.location = 'dashboard.html';
  });
}
