/**
 * Dynamic OG image — 1200x630 (Facebook recommended)
 * Ensures consistent image display across Messenger, Facebook, etc.
 */

import { ImageResponse } from '@vercel/og';

function getBaseUrl(request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'my-wedding-ticket.vercel.app';
  const proto = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'https';
  return `${proto}://${host}`;
}

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const baseUrl = getBaseUrl(request);
  const coverUrl = `${baseUrl}/images/physical-ticket-cover.png`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#1a3a2a',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={coverUrl}
          alt="Wedding Invitation"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}
