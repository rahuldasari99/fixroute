// // server.js
// require('dotenv').config();
// const express = require('express');
// const path = require('path');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const cors = require('cors');
// const { createClient } = require('@supabase/supabase-js');
// const axios = require('axios');

// const Razorpay = require("razorpay");

// const razor = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });




// const app = express();
// app.use(express.json());
// app.use(cors());

// const PORT = process.env.PORT || 3000;
// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
// const JWT_SECRET = process.env.JWT_SECRET;

// if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET) {
//   console.error('Missing .env values. Fill SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET');
//   process.exit(1);
// }

// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// // helper: map role -> table name
// function tableForRole(role) {
//   switch ((role || '').toLowerCase()) {
//     case 'user': return 'users';
//     case 'serviceman': return 'servicemen';
//     case 'dealer': return 'dealers';
//     case 'admin': return 'admins';
//     default: return null;
//   }
// }

// /* =============================
//    SIGNUP
// ============================= */
// app.post('/api/signup', async (req, res) => {
//   try {
//     const { full_name, phone, email, password, role, extra } = req.body;
//     if (!email || !password || !role) return res.status(400).json({ error: 'email, password and role required' });

//     const table = tableForRole(role);
//     if (!table) return res.status(400).json({ error: 'invalid role' });

//     const { data: exists } = await supabase
//       .from(table)
//       .select('id')
//       .eq('email', email)
//       .maybeSingle();

//     if (exists) return res.status(400).json({ error: 'Email already registered' });

//     const password_hash = await bcrypt.hash(password, 10);

//     const row = { full_name, phone, email, password_hash };
//     if (role === 'serviceman' && extra) {
//       row.vehicle_types = extra.vehicle_types;
//       row.base_cost = extra.base_cost || null;
//     }

//     const { data, error } = await supabase
//       .from(table)
//       .insert([row])
//       .select()
//       .single();

//     if (error) return res.status(500).json({ error });

//     const token = jwt.sign({ id: data.id, role, table }, JWT_SECRET, { expiresIn: '7d' });

//     res.json({ token, profile: data });
//   } catch (err) {
//     res.status(500).json({ error: String(err) });
//   }
// });

// /* =============================
//    LOGIN
// ============================= */
// app.post('/api/login', async (req, res) => {
//   try {
//     const { email, password, role } = req.body;
//     if (!email || !password) return res.status(400).json({ error: 'email and password required' });

//     let table = role ? tableForRole(role) : null;
//     const tablesToCheck = table ? [table] : ['users','servicemen','dealers','admins'];

//     let found = null;
//     for (const t of tablesToCheck) {
//       const { data } = await supabase.from(t).select('*').eq('email', email).maybeSingle();
//       if (data) { found = { table: t, row: data }; break; }
//     }

//     if (!found) return res.status(400).json({ error: 'Invalid credentials' });

//     const ok = await bcrypt.compare(password, found.row.password_hash || '');
//     if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

//     const tableToRole = {
//       users: 'user',
//       servicemen: 'serviceman',
//       dealers: 'dealer',
//       admins: 'admin'
//     };

//     const userRole = tableToRole[found.table];

//     const token = jwt.sign({ id: found.row.id, role: userRole, table: found.table }, JWT_SECRET, { expiresIn: '7d' });
//     res.json({ token, profile: found.row });
//   } catch (err) {
//     res.status(500).json({ error: String(err) });
//   }
// });

// /* =============================
//    AUTH Middleware
// ============================= */
// function auth(req, res, next) {
//   const header = req.headers.authorization || '';
//   const token = header.startsWith('Bearer ') ? header.slice(7) : null;
//   if (!token) return res.status(401).json({ error: 'Unauthorized' });
//   try {
//     req.user = jwt.verify(token, JWT_SECRET);
//     next();
//   } catch (e) {
//     res.status(401).json({ error: 'Invalid token' });
//   }
// }

// /* =============================
//    /api/me
// ============================= */
// app.get('/api/me', auth, async (req, res) => {
//   try {
//     const { id, table } = req.user;

//     const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
//     if (error) return res.status(500).json({ error });

//     res.json({ profile: data });
//   } catch (err) {
//     res.status(500).json({ error: String(err) });
//   }
// });

// /* =============================
//    MAPBOX TOKEN
// ============================= */
// app.get("/api/mapbox-token", (req, res) => {
//   return res.json({ token: process.env.MAPBOX_TOKEN });
// });

// /* =============================
//    SERVICEMAN: UPDATE LOCATION
// ============================= */
// app.post("/api/serviceman/update-location", auth, async (req, res) => {
//   try {
//     if (req.user.role !== "serviceman")
//       return res.status(403).json({ error: "Only servicemen allowed" });

//     const { lat, lon } = req.body;
//     const { id } = req.user;

//     const { data, error } = await supabase
//       .from("servicemen")
//       .update({ location_lat: lat, location_lng: lon })
//       .eq("id", id)
//       .select()
//       .single();

//     if (error) return res.status(500).json({ error });

//     res.json({ success: true, data });
//   } catch (err) {
//     res.status(500).json({ error: String(err) });
//   }
// });

// /* =============================
//    SERVICEMAN: DELETE LOCATION
// ============================= */
// app.post("/api/serviceman/delete-location", auth, async (req, res) => {
//   try {
//     if (req.user.role !== "serviceman")
//       return res.status(403).json({ error: "Only servicemen allowed" });

//     const { id } = req.user;

//     const { data, error } = await supabase
//       .from("servicemen")
//       .update({ location_lat: null, location_lng: null })
//       .eq("id", id)
//       .select()
//       .single();

//     if (error) return res.status(500).json({ error });

//     res.json({ success: true, data });
//   } catch (err) {
//     res.status(500).json({ error: String(err) });
//   }
// });

// /* =============================
//    ML: Recommend Servicemen
// ============================= */
// app.post('/api/recommend-servicemen', auth, async (req, res) => {
//   try {
//     const { service_type, lat, lng, max_distance_km = 25 } = req.body;

//     const { data: svcData } = await supabase
//       .from('servicemen')
//       .select('id, full_name, base_cost, rating, location_lat, location_lng, is_available')
//       .eq('is_available', true);

//     function haversineKm(lat1, lon1, lat2, lon2) {
//       if (lat2 == null) return 9999;
//       const toRad = v => (v * Math.PI) / 180;
//       const R = 6371;
//       const dLat = toRad(lat2 - lat1);
//       const dLon = toRad(lon2 - lon1);
//       const a = Math.sin(dLat/2)**2 +
//         Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) *
//         Math.sin(dLon/2)**2;
//       return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     }

//     const candidates = svcData
//       .map(s => ({ ...s, distance_km: haversineKm(lat, lng, s.location_lat, s.location_lng) }))
//       .filter(s => s.distance_km <= max_distance_km);

//     const mlPayload = {
//       user_lat: lat,
//       user_lng: lng,
//       service_type: service_type || '',
//       servicemen: candidates.map(c => ({
//         id: c.id,
//         full_name: c.full_name,
//         base_cost: Number(c.base_cost) || 0,
//         rating: Number(c.rating) || 0,
//         location_lat: c.location_lat,
//         location_lng: c.location_lng
//       }))
//     };

//     const mlResp = await axios.post('http://127.0.0.1:9000/predict', mlPayload);
//     res.json({ results: mlResp.data.results });
//   } catch (err) {
//     res.status(500).json({ error: String(err) });
//   }
// });

// /* =============================
//    BOOK SERVICE (User → Serviceman)
// ============================= */
// app.post('/api/book-service', auth, async (req, res) => {
//   try {
//     const { serviceman_id, service_type, lat, lng, eta_predicted } = req.body;
//     const user_id = req.user.id;

//     if (!serviceman_id || lat == null || lng == null) {
//       return res.status(400).json({ error: 'serviceman_id, lat, lng required' });
//     }

//     const row = {
//       user_id,
//       serviceman_id,
//       service_type,
//       lat,
//       lng,
//       eta_predicted,
//       status: 'pending'
//     };

//     const { data, error } = await supabase
//       .from('bookings')
//       .insert([row])
//       .select()
//       .single();

//     if (error) return res.status(500).json({ error });

//     res.json({ success: true, booking: data });
//   } catch (err) {
//     res.status(500).json({ error: String(err) });
//   }
  
// });

// /* =======================================================
//    ⭐ NEW API 1 — SERVICEMAN FETCHES USER REQUESTS
// ======================================================= */
// app.get('/api/serviceman/requests', auth, async (req, res) => {
//   try {
//     if (req.user.role !== "serviceman")
//       return res.status(403).json({ error: "Only servicemen can view requests" });

//     const serviceman_id = req.user.id;

//     // 1. Get bookings
//     const { data: bookings, error } = await supabase
//       .from("bookings")
//       .select("*")
//       .eq("serviceman_id", serviceman_id)
//       .order("created_at", { ascending: false });

//     if (error) return res.status(500).json({ error });

//     if (!bookings.length) return res.json({ success: true, requests: [] });

//     // 2. Extract all user_ids
//     const userIds = bookings.map(b => b.user_id);

//     // 3. Fetch user details from "users" table (NOT profiles!)
//     const { data: users } = await supabase
//       .from("users")
//       .select("id, full_name, phone")
//       .in("id", userIds);

//     // 4. Merge
//     const response = bookings.map(b => ({
//       ...b,
//       user: users.find(u => u.id === b.user_id) || null
//     }));

//     return res.json({ success: true, requests: response });

//   } catch (err) {
//     console.error("ERROR /api/serviceman/requests:", err);
//     return res.status(500).json({ error: String(err) });
//   }
// });

// /* =============================
//    SERVICEMAN: ACCEPTED (NEW)
//    returns accepted bookings for the serviceman
// ============================= */
// app.get('/api/serviceman/accepted', auth, async (req, res) => {
//   try {
//     if (req.user.role !== "serviceman")
//       return res.status(403).json({ success: false, error: "Only servicemen can view accepted bookings" });

//     const serviceman_id = req.user.id;

//     const { data: bookings, error } = await supabase
//       .from('bookings')
//       .select('*')
//       .eq('serviceman_id', serviceman_id)
//       .eq('status', 'accepted')
//       .order('created_at', { ascending: false });

//     if (error) return res.status(500).json({ success: false, error });

//     if (!bookings || bookings.length === 0) return res.json({ success: true, requests: [] });

//     const userIds = bookings.map(b => b.user_id);

//     const { data: users } = await supabase
//       .from('users')
//       .select('id, full_name, phone')
//       .in('id', userIds);

//     const response = bookings.map(b => ({
//       ...b,
//       user: users.find(u => u.id === b.user_id) || null
//     }));

//     return res.json({ success: true, requests: response });

//   } catch (err) {
//     console.error("ERROR /api/serviceman/accepted:", err);
//     return res.status(500).json({ success: false, error: String(err) });
//   }
// });
// /* =============================
//    LIVE UPDATE SERVICEMAN LOCATION
// ============================= */
// app.post("/api/serviceman/live-location", auth, async (req, res) => {
//   try {
//     if (req.user.role !== "serviceman")
//       return res.status(403).json({ error: "Only servicemen allowed" });

//     const { lat, lng, booking_id } = req.body;

//     if (!booking_id)
//       return res.status(400).json({ error: "booking_id required" });

//     await supabase
//       .from("bookings")
//       .update({
//         live_lat: lat,
//         live_lng: lng
//       })
//       .eq("id", booking_id);

//     return res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: String(err) });
//   }
// });
// /* =============================
//    USER FETCHES LIVE TRACKING
// ============================= */
// app.get("/api/live-tracking/:booking_id", async (req, res) => {
//   try {
//     const booking_id = req.params.booking_id;

//     const { data: booking, error } = await supabase
//       .from("bookings")
//       .select("*")
//       .eq("id", booking_id)
//       .single();

//     if (error || !booking)
//       return res.status(404).json({ error: "Booking not found" });

//     return res.json({
//       success: true,
//       user_lat: booking.lat,
//       user_lng: booking.lng,
//       tech_lat: booking.live_lat || booking.location_lat,
//       tech_lng: booking.live_lng || booking.location_lng,
//       status: booking.status
//     });

//   } catch (err) {
//     return res.status(500).json({ error: String(err) });
//   }
// });

// /* =============================
//    SERVICEMAN updates booking status (accept / reject)
//    UPDATED: when accepted, save serviceman_lat/lng from servicemen table into bookings
// ============================= */
// app.post("/api/serviceman/update-status", auth, async (req, res) => {
//   try {
//     const { role, id: serviceman_id } = req.user;
//     if (role !== "serviceman")
//       return res.status(403).json({ success: false, error: "Only servicemen can update status" });

//     const { id, status } = req.body; // Booking ID + new status

//     if (!id || !status)
//       return res.status(400).json({ success: false, error: "id and status required" });

//     // prepare update object
//     const updateObj = { status };

//     if (status === 'accepted') {
//       // fetch serviceman live location from servicemen table
//       const { data: sm, error: smErr } = await supabase
//         .from('servicemen')
//         .select('location_lat, location_lng')
//         .eq('id', serviceman_id)
//         .maybeSingle();

//       if (smErr) {
//         console.warn("Could not fetch serviceman location:", smErr);
//       } else {
//         if (sm && sm.location_lat != null && sm.location_lng != null) {
//           updateObj.serviceman_lat = sm.location_lat;
//           updateObj.serviceman_lng = sm.location_lng;
//         }
//       }
//     }

//     const { data: updatedBooking, error: updateErr } = await supabase
//       .from('bookings')
//       .update(updateObj)
//       .eq('id', id)
//       .eq('serviceman_id', serviceman_id)
//       .select()
//       .single();

//     if (updateErr) {
//       console.error("STATUS UPDATE ERROR", updateErr);
//       return res.status(500).json({ success: false, error: updateErr });
//     }

//     // fetch user info to include
//     let user = null;
//     if (updatedBooking && updatedBooking.user_id) {
//       const { data: u } = await supabase
//         .from('users')
//         .select('id, full_name, phone')
//         .eq('id', updatedBooking.user_id)
//         .maybeSingle();
//       user = u || null;
//     }

//     return res.json({ success: true, booking: { ...updatedBooking, user } });

//   } catch (err) {
//     console.error("update-status ERR:", err);
//     return res.status(500).json({ success: false, error: String(err) });
//   }
// });
// /* =============================
//    USER — GET ALL BOOKINGS
// ============================= */
// app.get('/api/user/bookings', auth, async (req, res) => {
//   try {
//     if (req.user.role !== "user")
//       return res.status(403).json({ error: "Only users allowed" });

//     const user_id = req.user.id;

//     // Fetch bookings
//     const { data: bookings, error } = await supabase
//       .from("bookings")
//       .select("*")
//       .eq("user_id", user_id)
//       .order("created_at", { ascending: false });

//     if (error) {
//       console.error("BOOKINGS FETCH ERROR:", error);
//       return res.status(500).json({ error });
//     }

//     if (!bookings.length) return res.json({ success: true, bookings: [] });

//     // Fetch servicemen
//     const servIds = bookings.map(b => b.serviceman_id);

//     const { data: servicemen } = await supabase
//       .from("servicemen")
//       .select("id, full_name, phone, location_lat, location_lng")
//       .in("id", servIds);

//     const merged = bookings.map(b => ({
//       ...b,
//       serviceman: servicemen.find(s => s.id === b.serviceman_id) || null
//     }));

//     return res.json({ success: true, bookings: merged });

//   } catch (err) {
//     return res.status(500).json({ error: String(err) });
//   }
// });

// // FIX: Unified token validator for all billing routes
// async function validateToken(req) {
//   try {
//     const header = req.headers.authorization || "";
//     const token = header.startsWith("Bearer ") ? header.slice(7) : null;

//     if (!token) return null;

//     // jwt verify
//     const decoded = jwt.verify(token, JWT_SECRET);
//     return decoded; // { id, role, table }
//   } catch (err) {
//     return null;
//   }
// }

// /* =============================
//    BILLING — SEND BILL (Serviceman)
// ============================= */
// app.post("/api/send-bill", async (req, res) => {
//   try {
//     const user = await validateToken(req);
//     if (!user || user.role !== "serviceman")
//       return res.status(401).json({ error: "Invalid token" });

//     const { booking_id, base_price, extra_charges, description } = req.body;

//     if (!base_price) {
//       return res.status(400).json({ error: "Base price is required" });
//     }

//     const total = Number(base_price) + Number(extra_charges || 0);

//     if (isNaN(total)) {
//       return res.status(400).json({ error: "Invalid price values" });
//     }

//     const { data: booking, error: bErr } = await supabase
//       .from("bookings")
//       .select("*")
//       .eq("id", booking_id)
//       .single();

//     if (bErr || !booking)
//       return res.status(404).json({ error: "Booking not found" });

//     if (booking.serviceman_id !== user.id)
//       return res.status(403).json({ error: "Not your booking" });

//     const { data: bill, error: billErr } = await supabase
//       .from("bills")
//       .insert({
//         booking_id,
//         user_id: booking.user_id,
//         serviceman_id: user.id,
//         amount: total,
//         description,
//         status: "sent"
//       })
//       .select()
//       .single();

//     if (billErr) {
//       console.log("Supabase Insert Error:", billErr);
//       return res.status(500).json({ error: "Failed to send bill" });
//     }

//     await supabase.from("bookings")
//       .update({ status: "completed" })
//       .eq("id", booking_id);

//     res.json({ success: true, bill });

//   } catch (err) {
//     console.error("SERVER ERROR in /api/send-bill:", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });


// /* =============================
//    USER FETCHES BILL
// ============================= */
// app.get("/api/bill/:booking_id", async (req, res) => {
//   const user = await validateToken(req);
//   if (!user) return res.status(401).json({ error: "Invalid token" });

//   const booking_id = req.params.booking_id;

//   const { data: bill, error } = await supabase
//     .from("bills")
//     .select("*")
//     .eq("booking_id", booking_id)
//     .single();

//   if (error || !bill)
//     return res.status(404).json({ error: "Bill not found" });

//   if (bill.user_id !== user.id && bill.serviceman_id !== user.id)
//     return res.status(403).json({ error: "Not allowed" });

//   res.json({ success: true, bill });
// });

// /* =============================
//    Razorpay Order Creation
// ============================= */
// /* =============================
//    Razorpay Order Creation
// ============================= */
// app.post("/api/create-payment", async (req, res) => {
//   try {
//     const user = await validateToken(req);
//     if (!user || user.role !== "user")
//       return res.status(401).json({ error: "Invalid token" });

//     const { bill_id } = req.body;

//     const { data: bill, error: billErr } = await supabase
//       .from("bills")
//       .select("*")
//       .eq("id", bill_id)
//       .single();

//     if (billErr || !bill)
//       return res.status(404).json({ error: "Bill not found" });

//     // FIX: Razorpay receipt must be < 40 characters
//     const shortReceipt = "rcpt_" + bill_id.substring(0, 10);

//     const order = await razor.orders.create({
//       amount: Number(bill.amount) * 100, // FIX: using bill.amount
//       currency: "INR",
//       receipt: shortReceipt
//     });

//     return res.json({
//       success: true,
//       order_id: order.id,
//       amount: Number(bill.amount) * 100,
//       key: process.env.RAZORPAY_KEY_ID
//     });
//   } catch (err) {
//     console.error("ERROR in create-payment:", err);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// });


// /* =============================
//    Razorpay Payment Verification
// ============================= */
// app.post("/api/verify-payment", async (req, res) => {
//   try {
//     const user = await validateToken(req);
//     if (!user || user.role !== "user")
//       return res.status(401).json({ error: "Invalid token" });

//     const {
//       razorpay_payment_id,
//       razorpay_order_id,
//       razorpay_signature,
//       bill_id
//     } = req.body;

//     const expected = require("crypto")
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(razorpay_order_id + "|" + razorpay_payment_id)
//       .digest("hex");

//     if (expected !== razorpay_signature)
//       return res.status(400).json({ error: "Signature mismatch" });

//     const { data: bill, error } = await supabase
//       .from("bills")
//       .select("*")
//       .eq("id", bill_id)
//       .single();

//     if (!bill)
//       return res.status(404).json({ error: "Bill not found" });

//     await supabase
//       .from("bills")
//       .update({ status: "paid" })
//       .eq("id", bill_id);

//     await supabase
//       .from("bookings")
//       .update({ status: "closed" })
//       .eq("id", bill.booking_id);   // FIXED

//     res.json({ success: true });
//   } catch (err) {
//     console.error("ERROR verify-payment:", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });


// /* =============================
//    USER FETCHES BILL (Supports ?booking_id= )
// ============================= */
// app.get("/api/bills", async (req, res) => {
//   try {
//     const user = await validateToken(req);
//     if (!user) return res.json({ success: false, error: "Invalid token" });

//     const { booking_id } = req.query;
//     if (!booking_id)
//       return res.json({ success: false, error: "booking_id required" });

//     const { data: bills, error } = await supabase
//       .from("bills")
//       .select("*")
//       .eq("booking_id", booking_id);

//     if (error) throw error;  // Makes debugging easier

//     res.json({ success: true, bills });
//   } catch (err) {
//     console.error("ERROR /api/bills:", err);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// });

// /* =============================
//    STATIC FRONTEND
// ============================= */
// app.use(express.static(path.join(__dirname, 'public')));
// app.get('/*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// /* =============================
//    START SERVER
// ============================= */
// app.listen(PORT, () => console.log(`FixRoute server running at http://localhost:${PORT}`)); 


// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const Razorpay = require("razorpay");

const razor = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});




const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET) {
  console.error('Missing .env values. Fill SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// helper: map role -> table name
function tableForRole(role) {
  switch ((role || '').toLowerCase()) {
    case 'user': return 'users';
    case 'serviceman': return 'servicemen';
    case 'dealer': return 'dealers';
    case 'admin': return 'admins';
    default: return null;
  }
}

/* =============================
   SIGNUP
============================= */
app.post('/api/signup', async (req, res) => {
  try {
    const { full_name, phone, email, password, role, extra } = req.body;
    if (!email || !password || !role) return res.status(400).json({ error: 'email, password and role required' });

    const table = tableForRole(role);
    if (!table) return res.status(400).json({ error: 'invalid role' });

    const { data: exists } = await supabase
      .from(table)
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);

    const row = { full_name, phone, email, password_hash };
    if (role === 'serviceman' && extra) {
      row.vehicle_types = extra.vehicle_types;
      row.base_cost = extra.base_cost || null;
    }

    const { data, error } = await supabase
      .from(table)
      .insert([row])
      .select()
      .single();

    if (error) return res.status(500).json({ error });

    const token = jwt.sign({ id: data.id, role, table }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, profile: data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/* =============================
   LOGIN
============================= */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    let table = role ? tableForRole(role) : null;
    const tablesToCheck = table ? [table] : ['users','servicemen','dealers','admins'];

    let found = null;
    for (const t of tablesToCheck) {
      const { data } = await supabase.from(t).select('*').eq('email', email).maybeSingle();
      if (data) { found = { table: t, row: data }; break; }
    }

    if (!found) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, found.row.password_hash || '');
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const tableToRole = {
      users: 'user',
      servicemen: 'serviceman',
      dealers: 'dealer',
      admins: 'admin'
    };

    const userRole = tableToRole[found.table];

    const token = jwt.sign({ id: found.row.id, role: userRole, table: found.table }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, profile: found.row });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/* =============================
   AUTH Middleware
============================= */
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

 function adminOnly(req, res, next) {
   if (!req.user || req.user.role !== "admin") {
     return res.status(403).json({ error: "Admin only" });
   }
   next();
 }
/* =============================
   /api/me
============================= */
app.get('/api/me', auth, async (req, res) => {
  try {
    const { id, table } = req.user;

    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error) return res.status(500).json({ error });

    res.json({ profile: data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/* =============================
   MAPBOX TOKEN
============================= */
app.get("/api/mapbox-token", (req, res) => {
  return res.json({ token: process.env.MAPBOX_TOKEN });
});

/* =============================
   SERVICEMAN: UPDATE LOCATION
============================= */
app.post("/api/serviceman/update-location", auth, async (req, res) => {
  try {
    if (req.user.role !== "serviceman")
      return res.status(403).json({ error: "Only servicemen allowed" });

    const { lat, lon } = req.body;
    const { id } = req.user;

    const { data, error } = await supabase
      .from("servicemen")
      .update({ location_lat: lat, location_lng: lon })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/* =============================
   SERVICEMAN: DELETE LOCATION
============================= */
app.post("/api/serviceman/delete-location", auth, async (req, res) => {
  try {
    if (req.user.role !== "serviceman")
      return res.status(403).json({ error: "Only servicemen allowed" });

    const { id } = req.user;

    const { data, error } = await supabase
      .from("servicemen")
      .update({ location_lat: null, location_lng: null })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/* =============================
   ML: Recommend Servicemen
============================= */
app.post('/api/recommend-servicemen', auth, async (req, res) => {
  try {
    const { service_type, lat, lng, max_distance_km = 25 } = req.body;

    const { data: svcData } = await supabase
      .from('servicemen')
      .select('id, full_name, base_cost, rating, location_lat, location_lng, is_available')
      .eq('is_available', true);

    function haversineKm(lat1, lon1, lat2, lon2) {
      if (lat2 == null) return 9999;
      const toRad = v => (v * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2)**2 +
        Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) *
        Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const candidates = svcData
      .map(s => ({ ...s, distance_km: haversineKm(lat, lng, s.location_lat, s.location_lng) }))
      .filter(s => s.distance_km <= max_distance_km);

    const mlPayload = {
      user_lat: lat,
      user_lng: lng,
      service_type: service_type || '',
      servicemen: candidates.map(c => ({
        id: c.id,
        full_name: c.full_name,
        base_cost: Number(c.base_cost) || 0,
        rating: Number(c.rating) || 0,
        location_lat: c.location_lat,
        location_lng: c.location_lng
      }))
    };

    const mlResp = await axios.post('http://127.0.0.1:9000/predict', mlPayload);
    res.json({ results: mlResp.data.results });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/* =============================
   BOOK SERVICE (User → Serviceman)
============================= */
app.post('/api/book-service', auth, async (req, res) => {
  try {
    const { serviceman_id, service_type, lat, lng, eta_predicted } = req.body;
    const user_id = req.user.id;

    if (!serviceman_id || lat == null || lng == null) {
      return res.status(400).json({ error: 'serviceman_id, lat, lng required' });
    }

    const row = {
      user_id,
      serviceman_id,
      service_type,
      lat,
      lng,
      eta_predicted,
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert([row])
      .select()
      .single();

    if (error) return res.status(500).json({ error });

    res.json({ success: true, booking: data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
  
});

/* =======================================================
   ⭐ NEW API 1 — SERVICEMAN FETCHES USER REQUESTS
======================================================= */
app.get('/api/serviceman/requests', auth, async (req, res) => {
  try {
    if (req.user.role !== "serviceman")
      return res.status(403).json({ error: "Only servicemen can view requests" });

    const serviceman_id = req.user.id;

    // 1. Get bookings
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("serviceman_id", serviceman_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error });

    if (!bookings.length) return res.json({ success: true, requests: [] });

    // 2. Extract all user_ids
    const userIds = bookings.map(b => b.user_id);

    // 3. Fetch user details from "users" table (NOT profiles!)
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, phone")
      .in("id", userIds);

    // 4. Merge
    const response = bookings.map(b => ({
      ...b,
      user: users.find(u => u.id === b.user_id) || null
    }));

    return res.json({ success: true, requests: response });

  } catch (err) {
    console.error("ERROR /api/serviceman/requests:", err);
    return res.status(500).json({ error: String(err) });
  }
});

/* =============================
   SERVICEMAN: ACCEPTED (NEW)
   returns accepted bookings for the serviceman
============================= */
app.get('/api/serviceman/accepted', auth, async (req, res) => {
  try {
    if (req.user.role !== "serviceman")
      return res.status(403).json({ success: false, error: "Only servicemen can view accepted bookings" });

    const serviceman_id = req.user.id;

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('serviceman_id', serviceman_id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ success: false, error });

    if (!bookings || bookings.length === 0) return res.json({ success: true, requests: [] });

    const userIds = bookings.map(b => b.user_id);

    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, phone')
      .in('id', userIds);

    const response = bookings.map(b => ({
      ...b,
      user: users.find(u => u.id === b.user_id) || null
    }));

    return res.json({ success: true, requests: response });

  } catch (err) {
    console.error("ERROR /api/serviceman/accepted:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});
/* =============================
   LIVE UPDATE SERVICEMAN LOCATION
============================= */
app.post("/api/serviceman/live-location", auth, async (req, res) => {
  try {
    if (req.user.role !== "serviceman")
      return res.status(403).json({ error: "Only servicemen allowed" });

    const { lat, lng, booking_id } = req.body;

    if (!booking_id)
      return res.status(400).json({ error: "booking_id required" });

    await supabase
      .from("bookings")
      .update({
        live_lat: lat,
        live_lng: lng
      })
      .eq("id", booking_id);

    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
/* =============================
   USER FETCHES LIVE TRACKING
============================= */
app.get("/api/live-tracking/:booking_id", async (req, res) => {
  try {
    const booking_id = req.params.booking_id;

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (error || !booking)
      return res.status(404).json({ error: "Booking not found" });

    return res.json({
      success: true,
      user_lat: booking.lat,
      user_lng: booking.lng,
      tech_lat: booking.live_lat || booking.location_lat,
      tech_lng: booking.live_lng || booking.location_lng,
      status: booking.status
    });

  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

/* =============================
   SERVICEMAN updates booking status (accept / reject)
   UPDATED: when accepted, save serviceman_lat/lng from servicemen table into bookings
============================= */
app.post("/api/serviceman/update-status", auth, async (req, res) => {
  try {
    const { role, id: serviceman_id } = req.user;
    if (role !== "serviceman")
      return res.status(403).json({ success: false, error: "Only servicemen can update status" });

    const { id, status } = req.body; // Booking ID + new status

    if (!id || !status)
      return res.status(400).json({ success: false, error: "id and status required" });

    // prepare update object
    const updateObj = { status };

    if (status === 'accepted') {
      // fetch serviceman live location from servicemen table
      const { data: sm, error: smErr } = await supabase
        .from('servicemen')
        .select('location_lat, location_lng')
        .eq('id', serviceman_id)
        .maybeSingle();

      if (smErr) {
        console.warn("Could not fetch serviceman location:", smErr);
      } else {
        if (sm && sm.location_lat != null && sm.location_lng != null) {
          updateObj.serviceman_lat = sm.location_lat;
          updateObj.serviceman_lng = sm.location_lng;
        }
      }
    }

    const { data: updatedBooking, error: updateErr } = await supabase
      .from('bookings')
      .update(updateObj)
      .eq('id', id)
      .eq('serviceman_id', serviceman_id)
      .select()
      .single();

    if (updateErr) {
      console.error("STATUS UPDATE ERROR", updateErr);
      return res.status(500).json({ success: false, error: updateErr });
    }

    // fetch user info to include
    let user = null;
    if (updatedBooking && updatedBooking.user_id) {
      const { data: u } = await supabase
        .from('users')
        .select('id, full_name, phone')
        .eq('id', updatedBooking.user_id)
        .maybeSingle();
      user = u || null;
    }

    return res.json({ success: true, booking: { ...updatedBooking, user } });

  } catch (err) {
    console.error("update-status ERR:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});
/* =============================
   USER — GET ALL BOOKINGS
============================= */
app.get('/api/user/bookings', auth, async (req, res) => {
  try {
    if (req.user.role !== "user")
      return res.status(403).json({ error: "Only users allowed" });

    const user_id = req.user.id;

    // Fetch bookings
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("BOOKINGS FETCH ERROR:", error);
      return res.status(500).json({ error });
    }

    if (!bookings.length) return res.json({ success: true, bookings: [] });

    // Fetch servicemen
    const servIds = bookings.map(b => b.serviceman_id);

    const { data: servicemen } = await supabase
      .from("servicemen")
      .select("id, full_name, phone, location_lat, location_lng")
      .in("id", servIds);

    const merged = bookings.map(b => ({
      ...b,
      serviceman: servicemen.find(s => s.id === b.serviceman_id) || null
    }));

    return res.json({ success: true, bookings: merged });

  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});


// FIX: Unified token validator for all billing routes
async function validateToken(req) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return null;

    // jwt verify
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // { id, role, table }
  } catch (err) {
    return null;
  }
}

/* =============================
   BILLING — SEND BILL (Serviceman)
============================= */
/* =============================
   BILLING — SEND BILL (Serviceman) with AI pricing
============================= */
/* =============================
   BILLING — SEND BILL (Serviceman) with AI pricing
============================= */
app.post("/api/send-bill", async (req, res) => {
  try {
    const user = await validateToken(req);
    if (!user || user.role !== "serviceman")
      return res.status(401).json({ error: "Invalid token" });

    const { booking_id, spare_part_price = 0, final_price, description } = req.body;

    // Fetch booking
    const { data: booking } = await supabase
      .from("bookings")
      .select(`*, servicemen(*)`)
      .eq("id", booking_id)
      .single();

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // final_price already includes AI price + spare part
    const amountToCharge = Number(final_price); 

    // Insert bill
    const { data: bill, error } = await supabase
      .from("bills")
      .insert({
        booking_id,
        user_id: booking.user_id,
        serviceman_id: user.id,
        amount: amountToCharge,          // <-- Correct amount
        spare_part_price: spare_part_price, 
        ai_price: final_price - spare_part_price, // <-- AI price only
        description: description || "AI generated bill",
        status: "sent"
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: "Failed to send bill" });

    // Mark job completed
    await supabase.from("bookings")
      .update({ status: "completed" })
      .eq("id", booking_id);

    return res.json({
      success: true,
      bill
    });

  } catch (err) {
    console.error("SERVER ERROR in /api/send-bill:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



/* =============================
   USER FETCHES BILL
============================= */
app.get("/api/bill/:booking_id", async (req, res) => {
  const user = await validateToken(req);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  const booking_id = req.params.booking_id;

  const { data: bill, error } = await supabase
    .from("bills")
    .select("*")
    .eq("booking_id", booking_id)
    .single();

  if (error || !bill)
    return res.status(404).json({ error: "Bill not found" });

  if (bill.user_id !== user.id && bill.serviceman_id !== user.id)
    return res.status(403).json({ error: "Not allowed" });

  res.json({ success: true, bill });
});

/* =============================
   Razorpay Order Creation
============================= */
/* =============================
   Razorpay Order Creation
============================= */
app.post("/api/create-payment", async (req, res) => {
  try {
    const user = await validateToken(req);
    if (!user || user.role !== "user")
      return res.status(401).json({ error: "Invalid token" });

    const { bill_id } = req.body;

    const { data: bill, error: billErr } = await supabase
      .from("bills")
      .select("*")
      .eq("id", bill_id)
      .single();

    if (billErr || !bill)
      return res.status(404).json({ error: "Bill not found" });

    // FIX: Razorpay receipt must be < 40 characters
    const shortReceipt = "rcpt_" + bill_id.substring(0, 10);

    const order = await razor.orders.create({
      amount: Number(bill.amount) * 100, // FIX: using bill.amount
      currency: "INR",
      receipt: shortReceipt
    });

    return res.json({
      success: true,
      order_id: order.id,
      amount: Number(bill.amount) * 100,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error("ERROR in create-payment:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


/* =============================
   Razorpay Payment Verification
============================= */
app.post("/api/verify-payment", async (req, res) => {
  try {
    const user = await validateToken(req);
    if (!user || user.role !== "user")
      return res.status(401).json({ error: "Invalid token" });

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      bill_id
    } = req.body;

    const expected = require("crypto")
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expected !== razorpay_signature)
      return res.status(400).json({ error: "Signature mismatch" });

    const { data: bill, error } = await supabase
      .from("bills")
      .select("*")
      .eq("id", bill_id)
      .single();

    if (!bill)
      return res.status(404).json({ error: "Bill not found" });

    await supabase
      .from("bills")
      .update({ status: "paid" })
      .eq("id", bill_id);

    await supabase
      .from("bookings")
      .update({ status: "closed" })
      .eq("id", bill.booking_id);   // FIXED

    res.json({ success: true });
  } catch (err) {
    console.error("ERROR verify-payment:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/* =============================
   USER FETCHES BILL (Supports ?booking_id= )
============================= */
app.get("/api/bills", async (req, res) => {
  try {
    const user = await validateToken(req);
    if (!user) return res.json({ success: false, error: "Invalid token" });

    const { booking_id } = req.query;
    if (!booking_id)
      return res.json({ success: false, error: "booking_id required" });

    const { data: bills, error } = await supabase
      .from("bills")
      .select("*")
      .eq("booking_id", booking_id);

    if (error) throw error;  // Makes debugging easier

    res.json({ success: true, bills });
  } catch (err) {
    console.error("ERROR /api/bills:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

//admin
app.get("/api/admin/users", auth, adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, users: data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
app.get("/api/admin/servicemen", auth, adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("servicemen")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, servicemen: data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put("/api/admin/update", auth, adminOnly, async (req, res) => {
  try {
    const { table, id, updates } = req.body;  
    if (!table || !id || !updates) {
      return res.status(400).json({ error: "table, id, updates required" });
    }

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, updated: data });

  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
app.get("/api/admin/bills", auth, adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bills")
      .select("*, users(full_name), servicemen(full_name)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, bills: data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
app.get("/api/admin/bookings", auth, adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, users(full_name), servicemen(full_name)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, bookings: data });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});


/* =============================
   STATIC FRONTEND
============================= */
app.use(express.static(path.join(__dirname, 'public')));
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* =============================
   START SERVER
============================= */
app.listen(PORT, () => console.log(`FixRoute server running at http://localhost:${PORT}`)); 