#!/usr/bin/env node
/**
 * Generate api/guests.json from Google Sheets at build time.
 * Run: node scripts/generate-guests.js
 * Env: GOOGLE_SHEET_ID, GUEST_SHEET_CREDENTIALS (or GOOGLE_SHEET_CREDENTIALS)
 *
 * When guests.json exists with data, the API uses it for instant lookup (no Sheets call at runtime).
 * Run this before deploy, or add to Vercel build: "build": "node scripts/generate-guests.js"
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'api', 'guests.json');

async function generate() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const credsJson = process.env.GUEST_SHEET_CREDENTIALS || process.env.GOOGLE_SHEET_CREDENTIALS;

  if (!sheetId || !credsJson) {
    console.warn('[generate-guests] Missing GOOGLE_SHEET_ID or credentials; skipping. API will use Sheets at runtime.');
    writeFileSync(OUT, JSON.stringify({}, null, 0));
    return;
  }

  try {
    const { google } = await import('googleapis');
    const creds = JSON.parse(credsJson);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A:B',
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

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(data, null, 0));
    console.log('[generate-guests] Wrote', Object.keys(data).length, 'guests to api/guests.json');
  } catch (e) {
    console.warn('[generate-guests] Error:', e.message, '- API will use Sheets at runtime.');
    writeFileSync(OUT, JSON.stringify({}, null, 0));
  }
}

generate();
