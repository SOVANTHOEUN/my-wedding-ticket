/**
 * Wedding E-Ticket — Secure guest lookup API
 * Returns only the requested guest name (never exposes full list).
 *
 * Data source: Google Sheets
 * Env: GOOGLE_SHEET_ID + GUEST_SHEET_CREDENTIALS (service account JSON)
 * Sheet format: Col A = token (g001) or names; Col B = name if Col A is token.
 */

// In-memory cache for Google Sheets (persists across warm invocations)
if (!global.guestListCache) global.guestListCache = { data: null, expires: 0 };
const cache = global.guestListCache;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getGuestList() {
  const now = Date.now();
  if (cache.data && cache.expires > now) return cache.data;

  // Google Sheets
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const credsJson = process.env.GUEST_SHEET_CREDENTIALS || process.env.GOOGLE_SHEET_CREDENTIALS;
  if (sheetId && credsJson) {
    try {
      const { google } = await import('googleapis');
      const creds = JSON.parse(credsJson);
      const auth = new google.auth.GoogleAuth({
        credentials: creds,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'A:B' // Col A = names (or token); Col B = name if Col A is token
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
      cache.data = data;
      cache.expires = now + CACHE_TTL_MS;
      return data;
    } catch (e) {
      console.error('Google Sheets fetch error:', e.message);
    }
  }

  return null;
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'private, max-age=300'); // 5 min cache

  const token = (req.query.g || '').toLowerCase().trim();
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const list = await getGuestList();
  if (!list) {
    return res.status(503).json({ error: 'Guest list not configured' });
  }

  const name = list[token] || null;
  return res.status(200).json({ name });
}

export default handler;
export { getGuestList };
