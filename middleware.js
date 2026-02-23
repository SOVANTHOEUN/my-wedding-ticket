/**
 * Wedding E-Ticket — Edge middleware for SNS link previews
 * When a crawler (Facebook, Messenger, Telegram, etc.) requests /?g=token or /?b=token,
 * rewrite to /api/og-page to serve HTML with dynamic Open Graph meta tags.
 */

import { rewrite, next } from '@vercel/functions';

// Only actual crawler bots — NOT Messenger in-app browser (which uses FBAN/FBAV/FB_IAB)
const CRAWLER_UA = [
  'facebookexternalhit',
  'facebookcatalog',
  'Facebot',
  'TelegramBot',
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

function isCrawler(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_UA.some((bot) => ua.includes(bot.toLowerCase()));
}

export const config = {
  matcher: ['/', '/index.html'],
};

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!isCrawler(ua)) return next();

  const url = new URL(request.url);
  const g = url.searchParams.get('g');
  const b = url.searchParams.get('b');
  const token = g || b;
  const param = g ? 'g' : (b ? 'b' : null);
  if (!token || !param || !/^(g|b)\d+$/i.test(token)) return next();

  return rewrite(new URL(`/api/og-page?${param}=${encodeURIComponent(token)}`, request.url));
}
