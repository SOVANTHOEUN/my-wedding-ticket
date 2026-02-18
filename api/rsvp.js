/**
 * Wedding E-Ticket — RSVP API
 * POST /api/rsvp — Saves RSVP (confirm/decline) to Google Sheet "RSVP" tab.
 * Requires: GOOGLE_SHEET_ID + GUEST_SHEET_CREDENTIALS (with spreadsheets scope for write)
 *
 * Body: { token: "g001", status: "confirm"|"decline", message?: "optional note" }
 */

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

async function appendRsvp(sheets, token, guestName, status, message) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const timestamp = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'RSVP!A:E',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[token, guestName, status, timestamp, message || '']]
    }
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const token = (body.token || '').toLowerCase().trim();
  const status = (body.status || '').toLowerCase();
  const message = typeof body.message === 'string' ? body.message.slice(0, 500).trim() : '';

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }
  if (status !== 'confirm' && status !== 'decline' && status !== 'undecided') {
    return res.status(400).json({ error: 'Status must be confirm, decline, or undecided' });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const credsJson = process.env.GUEST_SHEET_CREDENTIALS || process.env.GOOGLE_SHEET_CREDENTIALS;

  if (!sheetId || !credsJson) {
    return res.status(503).json({ error: 'RSVP requires Google Sheets configuration' });
  }

  try {
    const { google } = await import('googleapis');
    const creds = JSON.parse(credsJson);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const guestList = await getGuestList(sheets);
    const guestName = guestList[token];

    if (!guestName) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    await appendRsvp(sheets, token, guestName, status, message);
    return res.status(200).json({ ok: true, status });
  } catch (e) {
    console.error('RSVP error:', e.message);
    return res.status(500).json({ error: 'Failed to save RSVP' });
  }
};
