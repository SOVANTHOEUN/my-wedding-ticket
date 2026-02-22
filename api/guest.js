/**
 * Wedding E-Ticket — Secure guest lookup API
 * Returns only the requested guest name (never exposes full list).
 *
 * Data source (in order):
 * 1. api/guests.json — static file from build (instant, no cold start)
 * 2. Google Sheets — when guests.json is empty OR when token not found (new guests added after deploy)
 * Env: GOOGLE_SHEET_ID + GUEST_SHEET_CREDENTIALS (service account JSON)
 * Sheet format: Col A:B = groom's guests (g001, g002...); Col D:E = bride's guests (b001, b002...).
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let staticGuests = {};
try {
  staticGuests = require('./guests.json');
} catch (_) {}

// In-memory cache for Google Sheets (persists across warm invocations)
if (!global.guestListCache) global.guestListCache = { data: null, expires: 0 };
const cache = global.guestListCache;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getGuestListRanges() {
  const sheetName = process.env.GUEST_LIST_SHEET || '';
  const prefix = sheetName ? `'${sheetName.replace(/'/g, "''")}'!` : '';
  return { groom: prefix + 'A:B', bride: prefix + 'D:E' };
}

async function fetchFromSheets() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const credsJson = process.env.GUEST_SHEET_CREDENTIALS || process.env.GOOGLE_SHEET_CREDENTIALS;
  if (!sheetId || !credsJson) return null;

  const now = Date.now();
  if (cache.data && cache.expires > now) return cache.data;

  try {
    const { google } = await import('googleapis');
    const creds = JSON.parse(credsJson);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    const sheets = google.sheets({ version: 'v4', auth });
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
    cache.data = data;
    cache.expires = now + CACHE_TTL_MS;
    return data;
  } catch (e) {
    console.error('Google Sheets fetch error:', e.message);
    return null;
  }
}

async function getGuestList() {
  // Use static data first — instant, no network call
  if (staticGuests && typeof staticGuests === 'object' && Object.keys(staticGuests).length > 0) {
    return staticGuests;
  }
  return fetchFromSheets();
}

/** Look up guest name by token. Checks static first, then Sheets (for new guests added after deploy). */
async function getGuestName(token) {
  const hasStatic = staticGuests && typeof staticGuests === 'object' && Object.keys(staticGuests).length > 0;
  let name = hasStatic ? (staticGuests[token] || null) : null;
  if (name === null) {
    const sheetList = await fetchFromSheets();
    if (sheetList) name = sheetList[token] || null;
  }
  return name;
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'private, max-age=300'); // 5 min cache

  const token = (req.query.g || req.query.b || '').toLowerCase().trim();
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const hasStatic = staticGuests && typeof staticGuests === 'object' && Object.keys(staticGuests).length > 0;
  if (!hasStatic && !process.env.GOOGLE_SHEET_ID) {
    return res.status(503).json({ error: 'Guest list not configured' });
  }

  const name = await getGuestName(token);
  return res.status(200).json({ name });
}

export default handler;
export { getGuestList, getGuestName };
