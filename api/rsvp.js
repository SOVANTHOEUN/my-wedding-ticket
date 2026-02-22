/**
 * Wedding E-Ticket — RSVP API
 * GET  /api/rsvp?g=token or ?b=token — Get guest's current RSVP (if any)
 * POST /api/rsvp — Insert new RSVP (first submission)
 * PATCH /api/rsvp — Update existing RSVP (change mind)
 *
 * Sheet columns: token | guest_name | guest_side | status | reg_dttm | mod_dttm | message | device_type | location
 * - guest_side: "groom" or "bride" (derived from token)
 * - device_type: from client (mobile/tablet/desktop)
 * - location: from Vercel geo headers (city, region, country, postal, lat/lng)
 *
 * Env: GUEST_LIST_SHEET — sheet name for guest list (default: first sheet). Use if guest list is on a named tab.
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

function getGuestListRanges() {
  const sheetName = process.env.GUEST_LIST_SHEET || '';
  const prefix = sheetName ? `'${sheetName.replace(/'/g, "''")}'!` : '';
  return { groom: prefix + 'A:B', bride: prefix + 'D:E' };
}

async function getGuestList(sheets) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const ranges = getGuestListRanges();
  const [groomRes, brideRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: ranges.groom }),
    sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: ranges.bride })
  ]);
  const data = {};
  const gPattern = /^g\d+$/;
  const bPattern = /^b\d+$/;

  (groomRes.data.values || []).forEach((row, i) => {
    const colA = (row[0] || '').toString().trim();
    const colB = (row[1] || '').toString().trim();
    let token, name;
    const colBIsName = colB && !/^https?:\/\//i.test(colB);
    if (colBIsName && gPattern.test(colA.toLowerCase())) {
      token = colA.toLowerCase();
      name = colB;
    } else if (colA) {
      token = 'g' + String(i + 1).padStart(3, '0');
      name = colA;
    }
    if (token && name) data[token] = name;
  });

  (brideRes.data.values || []).forEach((row, i) => {
    const colD = (row[0] || '').toString().trim();
    const colE = (row[1] || '').toString().trim();
    let token, name;
    const colEIsName = colE && !/^https?:\/\//i.test(colE);
    if (colEIsName && bPattern.test(colD.toLowerCase())) {
      token = colD.toLowerCase();
      name = colE;
    } else if (colD) {
      token = 'b' + String(i + 1).padStart(3, '0');
      name = colD;
    }
    if (token && name) data[token] = name;
  });
  return data;
}

async function getRsvpRows(sheets) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'RSVP!A2:I'
  });
  return res.data.values || [];
}

function getGuestSide(token) {
  return /^b\d+$/i.test(token) ? 'bride' : 'groom';
}

function findRsvpRow(rows, token) {
  const t = token.toLowerCase();
  for (let i = 0; i < rows.length; i++) {
    const rowToken = (rows[i][0] || '').toString().toLowerCase().trim();
    if (rowToken === t) return { index: i, row: rows[i] };
  }
  return null;
}

function parseRsvpRow(row) {
  if (!row || row.length < 6) return null;
  const hasGuestSide = row.length >= 9 && (row[2] === 'groom' || row[2] === 'bride');
  return {
    status: (hasGuestSide ? row[3] : row[2] || '').toLowerCase(),
    reg_dttm: hasGuestSide ? row[4] : row[3],
    mod_dttm: hasGuestSide ? row[5] : row[4],
    message: hasGuestSide ? row[6] : row[5] || ''
  };
}

async function appendRsvp(sheets, token, guestName, status, message, device_type, location) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const regDttm = new Date().toISOString();
  const guestSide = getGuestSide(token);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'RSVP!A2:I',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[token, guestName, guestSide, status, regDttm, '', message || '', device_type || '', location || '']]
    }
  });
}

async function updateRsvpRow(sheets, rowIndex, token, guestName, status, regDttm, message, device_type, location) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const modDttm = new Date().toISOString();
  const guestSide = getGuestSide(token);
  const range = `RSVP!A${rowIndex + 2}:I${rowIndex + 2}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[token, guestName, guestSide, status, regDttm, modDttm, message || '', device_type || '', location || '']]
    }
  });
}

async function getSheets() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const credsJson = process.env.GUEST_SHEET_CREDENTIALS || process.env.GOOGLE_SHEET_CREDENTIALS;
  if (!sheetId || !credsJson) return null;
  try {
    const { google } = await import('googleapis');
    const creds = typeof credsJson === 'string' ? JSON.parse(credsJson.trim()) : credsJson;
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    return google.sheets({ version: 'v4', auth });
  } catch (e) {
    console.error('Sheets auth error:', e.message);
    throw new Error('Invalid GUEST_SHEET_CREDENTIALS. Check JSON format.');
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  let sheets;
  try {
    sheets = await getSheets();
  } catch (e) {
    console.error('RSVP init error:', e.message);
    return res.status(503).json({ error: e.message || 'Sheets configuration error' });
  }
  if (!sheets) {
    return res.status(503).json({ error: 'RSVP requires GOOGLE_SHEET_ID and GUEST_SHEET_CREDENTIALS' });
  }

  // ——— GET: Check if guest has submitted ———
  if (req.method === 'GET') {
    const token = (req.query.g || req.query.b || '').toLowerCase().trim();
    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }
    try {
      const rows = await getRsvpRows(sheets);
      const found = findRsvpRow(rows, token);
      if (!found) {
        return res.status(200).json({ submitted: false });
      }
      const parsed = parseRsvpRow(found.row);
      if (!parsed) return res.status(200).json({ submitted: false });
      return res.status(200).json({
        submitted: true,
        status: parsed.status,
        reg_dttm: parsed.reg_dttm || null,
        mod_dttm: parsed.mod_dttm || null,
        message: parsed.message || ''
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
      const hint = process.env.GUEST_LIST_SHEET
        ? 'Token not in guest list. Check GUEST_LIST_SHEET and sheet columns A:B (groom), D:E (bride).'
        : 'Token not in guest list. If guest list is on a named sheet (not first tab), set GUEST_LIST_SHEET env var.';
      return res.status(404).json({ error: 'Guest not found', hint });
    }

    const found = findRsvpRow(rows, token);

    // ——— PATCH: Update existing ———
    if (req.method === 'PATCH') {
      if (!found) {
        return res.status(404).json({ error: 'No RSVP found. Submit first.' });
      }
      const parsed = parseRsvpRow(found.row);
      const regDttm = (parsed && parsed.reg_dttm) || new Date().toISOString();
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
    console.error('RSVP error:', e.message, e.stack);
    const msg = e.message || String(e);
    const isPermission = /permission|forbidden|403/i.test(msg);
    const isNotFound = /not found|404|Unable to parse range/i.test(msg);
    let errMsg = 'Failed to save RSVP';
    if (isPermission) errMsg = 'Sheet permission denied. Share the spreadsheet with the service account email (Editor).';
    else if (isNotFound) errMsg = 'Sheet or range not found. Check GUEST_LIST_SHEET and RSVP tab names.';
    else if (msg) errMsg += ': ' + msg.slice(0, 100);
    return res.status(500).json({ error: errMsg });
  }
};
