// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

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

// SIGNUP -> inserts into appropriate table
app.post('/api/signup', async (req, res) => {
  try {
    const { full_name, phone, email, password, role, extra } = req.body;
    if (!email || !password || !role) return res.status(400).json({ error: 'email, password and role required' });

    const table = tableForRole(role);
    if (!table) return res.status(400).json({ error: 'invalid role' });

    // check if email exists in that table already
    const { data: exists, error: existsError } = await supabase
      .from(table)
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);

    // build row object depending on role (accepts optional extra fields)
    const row = { full_name, phone, email, password_hash };
    if (role === 'serviceman' && extra && extra.vehicle_types !== undefined) {
      row.vehicle_types = extra.vehicle_types; // expected comma separated string
      row.base_cost = extra.base_cost || null;
    }
    if (role === 'dealer' && extra && extra.shop_name !== undefined) {
      row.shop_name = extra.shop_name;
      row.address = extra.address || null;
    }
    // admins just get the basic fields

    const { data, error } = await supabase
      .from(table)
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error', error);
      return res.status(500).json({ error: 'DB insert failed', detail: error });
    }

    // sign JWT: include id and role and table for quick lookup
    const token = jwt.sign({ id: data.id, role, table }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({ token, profile: data });
  } catch (err) {
    console.error('signup err', err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
});

// LOGIN -> checks appropriate table depending on role param
// client should pass role with login. If omitted, server will search tables in order.
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    let table = null;
    if (role) table = tableForRole(role);

    // if role provided: check only that table
    // else: search in all tables in priority: users, servicemen, dealers, admins
    const tablesToCheck = table ? [table] : ['users','servicemen','dealers','admins'];

    let found = null;
    for (const t of tablesToCheck) {
      const { data, error } = await supabase.from(t).select('*').eq('email', email).maybeSingle();
      if (error) {
        console.warn('supabase select error', t, error);
        continue;
      }
      if (data) { found = { table: t, row: data }; break; }
    }

    if (!found) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, found.row.password_hash || '');
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    // derive role from table
    const tableToRole = { users: 'user', servicemen: 'serviceman', dealers: 'dealer', admins: 'admin' };
    const userRole = tableToRole[found.table] || 'user';

    const token = jwt.sign({ id: found.row.id, role: userRole, table: found.table }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, profile: found.row });
  } catch (err) {
    console.error('login err', err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
});

// auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// /api/me -> returns profile from the table in token, or checks by id
app.get('/api/me', auth, async (req, res) => {
  try {
    const { id, table } = req.user;
    const t = table || tableForRole(req.user.role);
    if (!t) return res.status(400).json({ error: 'Bad token' });

    const { data, error } = await supabase.from(t).select('*').eq('id', id).maybeSingle();
    if (error) return res.status(500).json({ error: 'DB error', detail: error });

    return res.json({ profile: data });
  } catch (err) {
    console.error('/api/me err', err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
});

/* Optional: debugging route to list small subset (only for dev) */
app.get('/debug/tables', async (req, res) => {
  try {
    const r1 = await supabase.from('users').select('id,email').limit(5);
    const r2 = await supabase.from('servicemen').select('id,email').limit(5);
    const r3 = await supabase.from('dealers').select('id,email').limit(5);
    const r4 = await supabase.from('admins').select('id,email').limit(5);
    res.json({ users: r1, servicemen: r2, dealers: r3, admins: r4 });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

//mapbox

// Send Mapbox token to frontend
app.get("/api/mapbox-token", (req, res) => {
  return res.json({ token: process.env.MAPBOX_TOKEN });
});

//servicemen map update
// Update serviceman location
app.post("/api/serviceman/update-location", auth, async (req, res) => {
  try {
    const { lat, lon } = req.body;
    const { id, role } = req.user;

    if (role !== "serviceman")
      return res.status(403).json({ error: "Only servicemen can update location" });

    const { data, error } = await supabase
      .from("servicemen")
      .update({
        location_lat: lat,
        location_lng: lon
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error });

    return res.json({ success: true, data });

  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Delete location
app.post("/api/serviceman/delete-location", auth, async (req, res) => {
  try {
    const { id, role } = req.user;

    if (role !== "serviceman")
      return res.status(403).json({ error: "Only servicemen can delete location" });

    const { data, error } = await supabase
      .from("servicemen")
      .update({
        location_lat: null,
        location_lng: null
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error });

    return res.json({ success: true, data });

  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Recommend servicemen: find nearby servicemen from DB, call Python ML service for ETA, return sorted
app.post('/api/recommend-servicemen', auth, async (req, res) => {
  try {
    const { service_type, lat, lng, max_distance_km = 25 } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });

    // Fetch available servicemen with locations
    const { data: svcData, error } = await supabase
      .from('servicemen')
      .select('id, full_name, base_cost, rating, location_lat, location_lng, is_available')
      .eq('is_available', true);

    if (error) return res.status(500).json({ error });

    function haversineKm(lat1, lon1, lat2, lon2) {
      if (lat2 == null || lon2 == null) return 9999;
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
                Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*
                Math.sin(dLon/2)*Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    const candidates = (svcData || [])
      .map(s => {
        const distance_km = haversineKm(lat, lng, s.location_lat, s.location_lng);
        return { ...s, distance_km };
      })
      .filter(s => s.distance_km <= max_distance_km)
      .slice(0, 200); // safety limit

    // Prepare payload for Python ML service
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

    // Call Python ML service (local)
    const mlResp = await axios.post('http://127.0.0.1:9000/predict', mlPayload, { timeout: 15000 });
    const results = mlResp.data.results || [];

    return res.json({ results });

  } catch (err) {
    console.error('/api/recommend-servicemen err', err.toString());
    return res.status(500).json({ error: String(err) });
  }
});

// Book service (insert into bookings)
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
      service_type: service_type || null,
      lat: lat,
      lng: lng,
      eta_predicted: eta_predicted || null,
      status: 'created'
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('/api/book-service supabase insert', error);
      return res.status(500).json({ error: error });
    }

    return res.json({ success: true, booking: data });
  } catch (err) {
    console.error('/api/book-service err', err);
    return res.status(500).json({ error: String(err) });
  }
});


// static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`FixRoute server listening on http://localhost:${PORT}`));