/**
 * Wedding E-Ticket — Dynamic Open Graph page for SNS crawlers
 * Returns HTML with meta tags so shared links show rich previews with guest name.
 *
 * Invoked by middleware when a crawler (Facebook, Telegram, etc.) requests /?g=token.
 */

import { getGuestList } from './guest.js';

const DEFAULT_TITLE = 'សិរីមង្គលអាពាហ៍ពិពាហ៍ — VONG Sovanthoeun & ROENG Vila';
const DEFAULT_DESC = 'សូមគោរពអញ្ជើញមកចូលរួមអាពាហ៍ពិពាហ៍';
const COUPLE_NAMES = 'VONG Sovanthoeun & ROENG Vila';

function escapeHtml(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(opts) {
  const {
    title,
    description,
    imageUrl,
    pageUrl,
  } = opts;

  return `<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:url" content="${escapeHtml(pageUrl)}">
<meta property="og:site_name" content="Wedding Invitation">
<meta property="og:locale" content="km_KH">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">
</head>
<body>
<p>សូមចុចដើម្បីបើកធៀប — <a href="${escapeHtml(pageUrl)}">Click to Open Invitation</a></p>
</body>
</html>`;
}

function getQueryParam(req, key) {
  if (req.query && req.query[key]) return String(req.query[key]).trim();
  try {
    const url = new URL(req.url || '', 'https://example.com');
    return url.searchParams.get(key) || '';
  } catch (_) { return ''; }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min

  const token = getQueryParam(req, 'g').toLowerCase();
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'my-wedding-ticket.vercel.app';
  const proto = req.headers['x-forwarded-proto'] === 'https' || req.headers['x-forwarded-proto'] === 'http'
    ? req.headers['x-forwarded-proto']
    : 'https';
  const baseUrl = `${proto}://${host}`;
  const pageUrl = token ? `${baseUrl}/?g=${encodeURIComponent(token)}` : baseUrl + '/';
  const imageUrl = `${baseUrl}/images/physical-ticket-cover.png`;

  let guestName = null;
  if (token) {
    const list = await getGuestList();
    if (list) guestName = list[token] || null;
  }

  const title = guestName
    ? `${DEFAULT_TITLE} — សូមគោរពអញ្ជើញ ${guestName}`
    : DEFAULT_TITLE;
  const description = guestName
    ? `${DEFAULT_DESC} — ${guestName}`
    : `${DEFAULT_DESC} — ${COUPLE_NAMES}`;

  const html = buildHtml({ title, description, imageUrl, pageUrl });
  res.status(200).send(html);
};
