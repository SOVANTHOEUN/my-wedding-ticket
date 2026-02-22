/**
 * Wedding E-Ticket — Root path handler for SNS link previews
 * Serves dynamic OG HTML to crawlers (Messenger, Telegram, etc.) when ?g=token is present.
 * Serves normal index.html to regular users.
 *
 * Uses vercel.json rewrite: / -> /api/root (middleware doesn't run on static sites).
 */

import { getGuestList } from './guest.js';

const CRAWLER_UA = [
  'facebookexternalhit',
  'facebookcatalog',
  'Facebot',
  'TelegramBot',
  'Telegram',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'Discordbot',
  'Pinterest',
  'meta-externalagent',
  'meta-externalfetcher',
  'meta-webindexer',
];

const DEFAULT_TITLE = 'សិរីមង្គលអាពាហ៍ពិពាហ៍ — VONG Sovanthoeun & ROENG Vila';
const DEFAULT_DESC = 'សូមគោរពអញ្ជើញមកចូលរួមអាពាហ៍ពិពាហ៍';
const COUPLE_NAMES = 'VONG Sovanthoeun & ROENG Vila';

function isCrawler(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_UA.some((bot) => ua.includes(bot.toLowerCase()));
}

function escapeHtml(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildOgHtml(opts) {
  const { title, description, imageUrl, pageUrl, appId } = opts;
  const fbAppId = appId ? `<meta property="fb:app_id" content="${escapeHtml(appId)}">` : '';
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
<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
<meta property="og:image:width" content="1022">
<meta property="og:image:height" content="1024">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="${escapeHtml('Wedding Invitation - VONG Sovanthoeun & ROENG Vila')}">
<meta property="og:url" content="${escapeHtml(pageUrl)}">
<meta property="og:site_name" content="Wedding Invitation">
<meta property="og:locale" content="km_KH">
${fbAppId}
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
  const ua = req.headers['user-agent'] || '';
  const token = getQueryParam(req, 'g').toLowerCase();
  const isShortPath = !!getQueryParam(req, 'short');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'my-wedding-ticket.vercel.app';
  const proto = req.headers['x-forwarded-proto'] === 'https' || req.headers['x-forwarded-proto'] === 'http'
    ? req.headers['x-forwarded-proto']
    : 'https';
  const baseUrl = `${proto}://${host}`;

  // Short path /g/g060: non-crawler -> redirect to /?g=g060
  if (isShortPath && !isCrawler(ua) && token && /^g\d+$/.test(token)) {
    const redirectUrl = `${baseUrl}/?g=${encodeURIComponent(token)}`;
    res.setHeader('Location', redirectUrl);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(302).redirect(redirectUrl);
  }

  // Crawler with ?g=token (from /?g= or /g/) -> serve dynamic OG HTML
  if (isCrawler(ua) && token && /^g\d+$/.test(token)) {
    let guestName = null;
    const list = await getGuestList();
    if (list) guestName = list[token] || null;

    const title = guestName
      ? `${DEFAULT_TITLE} — សូមគោរពអញ្ជើញ ${guestName}`
      : DEFAULT_TITLE;
    const description = guestName
      ? `${DEFAULT_DESC} — ${guestName}`
      : `${DEFAULT_DESC} — ${COUPLE_NAMES}`;
    const pageUrl = isShortPath ? `${baseUrl}/g/${token}` : `${baseUrl}/?g=${encodeURIComponent(token)}`;
    const imageUrl = `${baseUrl}/images/physical-ticket-cover.png`;
    const appId = process.env.META_APP_ID || process.env.FB_APP_ID || '';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(buildOgHtml({ title, description, imageUrl, pageUrl, appId }));
  }

  // Regular user -> serve index.html
  try {
    const indexUrl = `${baseUrl}/index.html`;
    const fetchRes = await fetch(indexUrl, {
      headers: { 'User-Agent': ua || 'Mozilla/5.0' },
    });
    if (!fetchRes.ok) {
      res.status(502).send('Unable to load page');
      return;
    }
    const html = await fetchRes.text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    console.error('root handler fetch error:', err);
    res.status(502).send('Unable to load page');
  }
}
