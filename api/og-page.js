/**
 * Wedding E-Ticket — Dynamic Open Graph page for SNS crawlers
 * Returns HTML with meta tags so shared links show rich previews with guest name.
 *
 * Invoked by middleware when a crawler (Facebook, Telegram, etc.) requests /?g=token or /?b=token.
 */

import { getGuestName } from './guest.js';

const SHORT_TITLE = 'សិរីមង្គលអាពាហ៍ពិពាហ៍ — Sovanthoeun & Vila';
const DEFAULT_TITLE = 'សិរីមង្គលអាពាហ៍ពិពាហ៍ — VONG Sovanthoeun & ROENG Vila';
const INVITE_LINE = 'សូមគោរពអញ្ជើញមកចូលរួមអាពាហ៍ពិពាហ៍ —';

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
    fbAppId = '',
  } = opts;

  return `<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:image:url" content="${escapeHtml(imageUrl)}">
<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
<meta property="og:image:width" content="1022">
<meta property="og:image:height" content="1024">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="${escapeHtml('Wedding Invitation - VONG Sovanthoeun & ROENG Vila')}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(pageUrl)}">
<meta property="og:site_name" content="Wedding Invitation">
<meta property="og:locale" content="km_KH">
${(fbAppId && fbAppId.trim()) ? `<meta property="fb:app_id" content="${escapeHtml(fbAppId.trim())}">` : ''}
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

  const g = getQueryParam(req, 'g').toLowerCase();
  const b = getQueryParam(req, 'b').toLowerCase();
  const token = g || b;
  const param = g ? 'g' : (b ? 'b' : null);
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'my-wedding-ticket.vercel.app';
  const proto = req.headers['x-forwarded-proto'] === 'https' || req.headers['x-forwarded-proto'] === 'http'
    ? req.headers['x-forwarded-proto']
    : 'https';
  const baseUrl = `${proto}://${host}`;
  const pageUrl = token && param ? `${baseUrl}/?${param}=${encodeURIComponent(token)}` : baseUrl + '/';
  const imageUrl = `${baseUrl}/images/physical-ticket-cover.jpg`;

  let guestName = null;
  if (token) {
    guestName = await getGuestName(token);
  }

  // Title: wedding + guest invite line (all in og:title so it shows same size)
  const title = guestName
    ? `${SHORT_TITLE} — សូមគោរពអញ្ជើញ ${guestName}`
    : DEFAULT_TITLE;
  // Description: invitation line + guest name only (no duplicate of guest invite)
  const description = guestName
    ? `${INVITE_LINE}\n${guestName}`
    : `សូមគោរពអញ្ជើញមកចូលរួមអាពាហ៍ពិពាហ៍ — VONG Sovanthoeun & ROENG Vila`;

  const fbAppId = (process.env.META_APP_ID || process.env.FB_APP_ID || '').trim();
  const html = buildHtml({ title, description, imageUrl, pageUrl, fbAppId });
  res.status(200).send(html);
};
