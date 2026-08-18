require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  });

  const siteResult = await pool.query(
    `insert into sites (name, address) values ($1,$2) returning id`,
    ['Meridian Business Park', '400 Meridian Way']
  );
  const siteId = siteResult.rows[0].id;

  const passwordHash = await bcrypt.hash('patrol123', 10);

  const guards = [
    { name: 'M. Alvarez', badge: 'GS-2471', email: 'alvarez@example.com', role: 'GUARD' },
    { name: 'D. Okafor', badge: 'GS-1980', email: 'okafor@example.com', role: 'GUARD' },
    { name: 'Site Admin', badge: null, email: 'admin@example.com', role: 'ADMIN' },
  ];
  const guardIds = {};
  for (const g of guards) {
    const result = await pool.query(
      `insert into users (site_id, name, badge_number, email, password_hash, role)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [siteId, g.name, g.badge, g.email, passwordHash, g.role]
    );
    guardIds[g.name] = result.rows[0].id;
  }

  const checkpoints = [
    ['Main Gate', 'Perimeter · Entry Post', 'NFC-0114', false, null, 1],
    ['Loading Dock', 'East Wing', 'NFC-0122', false, null, 2],
    ['Fire Panel Room', 'Building B, Ground Floor', 'NFC-0133', true,
      'Confirm panel reads Normal (green). If any zone shows Trouble or Alarm, do not silence — call Command Center at ext. 411 immediately.', 3],
    ['Fire Extinguisher — Garage', 'Parking Structure B, L1', 'NFC-0141', true,
      'Check pressure gauge is in the green band and the pin/tamper seal is intact.', 4],
    ['Rooftop Access', 'Building A Roof', 'NFC-0152', false, 'Verify roof access door is locked. Do not prop open.', 5],
    ['East Perimeter Fence', 'Rear Lot', 'NFC-0167', false, null, 6],
  ];
  for (const [name, zone, tag, isAsset, order, sort] of checkpoints) {
    await pool.query(
      `insert into checkpoints (site_id, name, zone, nfc_tag_id, is_asset_check, post_order, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [siteId, name, zone, tag, isAsset, order, sort]
    );
  }

  await pool.query(
    `insert into client_contacts (site_id, name, email, phone) values ($1,$2,$3,$4)`,
    [siteId, 'Property Manager', 'manager@meridianbp.example', '+15555550123']
  );

  const zones = [
    ['Main Gate / Lobby', false, '06:00–22:00', 'Badge + visitor log required'],
    ['Loading Dock', false, '05:00–20:00', 'Vendor badge only'],
    ['Fire Panel Room', true, 'Escort only', 'Security + facilities access only'],
    ['Parking Structure B', false, '24 hours', 'Plate recognition enabled'],
    ['Rooftop Access', true, 'Escort only', 'Alarmed door, no propping'],
    ['Suite 210 (tenant)', false, '07:00–21:00', 'Tenant badge + contractor list'],
  ];
  for (const [name, locked, schedule, note] of zones) {
    await pool.query(
      `insert into zones (site_id, name, locked, schedule, note) values ($1,$2,$3,$4,$5)`,
      [siteId, name, locked, schedule, note]
    );
  }

  const sensors = [
    ['Loading dock roll-gate', 'Loading Dock', 'door'],
    ['Fire panel — Building B', 'Fire Panel Room', 'panel'],
    ['Rooftop stairwell door', 'Rooftop Access', 'door'],
    ['Server room temp', 'Building A, L2', 'temperature'],
    ['Rear lot motion', 'East Perimeter Fence', 'motion'],
  ];
  for (const [name, zone, type] of sensors) {
    await pool.query(`insert into sensors (site_id, name, zone, type) values ($1,$2,$3,$4)`, [siteId, name, zone, type]);
  }

  const trainings = [
    [guardIds['M. Alvarez'], 'Fire panel response', 100, 'COMPLETE'],
    [guardIds['M. Alvarez'], 'De-escalation refresher', 60, 'DUE'],
    [guardIds['D. Okafor'], 'Visitor management workflow', 100, 'COMPLETE'],
    [guardIds['D. Okafor'], 'Active threat response', 40, 'OVERDUE'],
  ];
  for (const [guardId, course, pct, status] of trainings) {
    await pool.query(
      `insert into trainings (site_id, guard_id, course, pct, status) values ($1,$2,$3,$4,$5)`,
      [siteId, guardId, course, pct, status]
    );
  }

  console.log('Seeded site:', siteId);
  console.log('Login with badge GS-2471 or GS-1980, or email admin@example.com — password: patrol123');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
