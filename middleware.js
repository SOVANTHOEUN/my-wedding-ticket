/**
 * Wedding E-Ticket — Edge middleware for SNS link previews
 * When a crawler (Facebook, Messenger, Telegram, etc.) requests /?g=token,
 * rewrite to /api/og-page to serve HTML with dynamic Open Graph meta tags.
 */

import { rewrite, next } from '@vercel/functions';

const CRAWLER_UA = [
  'facebookexternalhit',
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
  const token = url.searchParams.get('g');
  if (!token || !/^g\d+$/i.test(token)) return next();

  return rewrite(new URL(`/api/og-page?g=${encodeURIComponent(token)}`, request.url));
}
