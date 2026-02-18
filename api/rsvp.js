/**
 * Wedding E-Ticket — RSVP API
 * GET  /api/rsvp?g=token — Get guest's current RSVP (if any)
 * POST /api/rsvp — Insert new RSVP (first submission)
 * PATCH /api/rsvp — Update existing RSVP (change mind)
 *
 * Sheet columns: token | guest_name | status | reg_dttm | mod_dttm | message | device_type | location
 * - device_type: from client (mobile/tablet/desktop)
 * - location: from Vercel geo headers (city, region, country, postal, lat/lng)
 *
 * valueInputOption: RAW — insert values only, no format inheritance
 */

function getLocationFromHeaders(req) {
  const h = req.headers || {};
  const get = (k) => h[k] || h[k.toLowerCase()] || '';
  let city = get('x-vercel-ip-city');
  try { if (city) city = decodeURIComponent(city); } catch (_) {}
  const region = get('x-vercel-ip-country-region');
  const country = get('x-vercel-ip-country');
  const postal = get('x-vercel-ip-postal-code');
  const lat = get('x-vercel-ip-latitude');
  const lng = get('x-vercel-ip-longitude');
  const parts = [city, region, country].filter(Boolean);
  let loc = parts.length ? parts.join(', ') : '';
  if (postal) loc += (loc ? ' ' : '') + '(' + postal + ')';
  if (lat && lng) loc += (loc ? ' ' : '') + '[' + lat + ',' + lng + ']';
  return loc.trim() || '';
}

async function getGuestList(sheets) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'A:B'
  });
  const rows = res.data.values || [];
  const data = {};
  const tokenPattern = /^g\d+$/;
  rows.forEach((row, i) => {
    const colA = (row[0] || '').toString().trim();
    const colB = (row[1] || '').toString().trim();
    let token, name;
    if (colB && tokenPattern.test(colA.toLowerCase())) {
      token = colA.toLowerCase();
      name = colB;
    } else if (colA) {
      token = 'g' + String(i + 1).padStart(3, '0');
      name = colA;
    }
    if (token && name) data[token] = name;
  });
  return data;
}

async function getRsvpRows(sheets) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'RSVP!A2:H'
  });
  return res.data.values || [];
}

function findRsvpRow(rows, token) {
  const t = token.toLowerCase();
  for (let i = 0; i < rows.length; i++) {
    const rowToken = (rows[i][0] || '').toString().toLowerCase().trim();
    if (rowToken === t) return { index: i, row: rows[i] };
  }
  return null;
}

async function appendRsvp(sheets, token, guestName, status, message, device_type, location) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const regDttm = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'RSVP!A2:H',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[token, guestName, status, regDttm, '', message || '', device_type || '', location || '']]
    }
  });
}

async function updateRsvpRow(sheets, rowIndex, token, guestName, status, regDttm, message, device_type, location) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const modDttm = new Date().toISOString();
  const range = `RSVP!A${rowIndex + 2}:H${rowIndex + 2}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[token, guestName, status, regDttm, modDttm, message || '', device_type || '', location || '']]
    }
  });
}

async function getSheets() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const credsJson = process.env.GUEST_SHEET_CREDENTIALS || process.env.GOOGLE_SHEET_CREDENTIALS;
  if (!sheetId || !credsJson) return null;
  const { google } = await import('googleapis');
  const creds = JSON.parse(credsJson);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const sheets = await getSheets();
  if (!sheets) {
    return res.status(503).json({ error: 'RSVP requires Google Sheets configuration' });
  }

  // ——— GET: Check if guest has submitted ———
  if (req.method === 'GET') {
    const token = (req.query.g || '').toLowerCase().trim();
    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }
    try {
      const rows = await getRsvpRows(sheets);
      const found = findRsvpRow(rows, token);
      if (!found) {
        return res.status(200).json({ submitted: false });
      }
      const row = found.row;
      return res.status(200).json({
        submitted: true,
        status: (row[2] || '').toLowerCase(),
        reg_dttm: row[3] || null,
        mod_dttm: row[4] || null,
        message: row[5] || ''
      });
    } catch (e) {
      console.error('RSVP GET error:', e.message);
      return res.status(500).json({ error: 'Failed to fetch RSVP' });
    }
  }

  // ——— POST / PATCH: Validate body ———
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const token = (body.token || '').toLowerCase().trim();
  const status = (body.status || '').toLowerCase();
  const message = typeof body.message === 'string' ? body.message.slice(0, 500).trim() : '';
  const device_type = typeof body.device_type === 'string' ? body.device_type.slice(0, 50).trim() : '';
  const location = getLocationFromHeaders(req);

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }
  if (status !== 'confirm' && status !== 'decline' && status !== 'undecided') {
    return res.status(400).json({ error: 'Status must be confirm, decline, or undecided' });
  }

  try {
    // Fetch guest list and RSVP rows in parallel (saves ~1 round-trip)
    const [guestList, rows] = await Promise.all([getGuestList(sheets), getRsvpRows(sheets)]);
    const guestName = guestList[token];
    if (!guestName) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    const found = findRsvpRow(rows, token);

    // ——— PATCH: Update existing ———
    if (req.method === 'PATCH') {
      if (!found) {
        return res.status(404).json({ error: 'No RSVP found. Submit first.' });
      }
      const row = found.row;
      const regDttm = row[3] || new Date().toISOString();
      await updateRsvpRow(sheets, found.index, token, guestName, status, regDttm, message, device_type, location);
      return res.status(200).json({ ok: true, status, updated: true });
    }

    // ——— POST: Insert new ———
    if (found) {
      return res.status(409).json({ error: 'Already submitted. Use update to change.' });
    }
    await appendRsvp(sheets, token, guestName, status, message, device_type, location);
    return res.status(200).json({ ok: true, status });
  } catch (e) {
    console.error('RSVP error:', e.message);
    return res.status(500).json({ error: 'Failed to save RSVP' });
  }
};
