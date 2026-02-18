# Security Setup Guide

This guide explains how to configure the secure guest lookup and deploy with security headers.

## 1. Content Security Policy (CSP) & Security Headers

Already configured in `vercel.json`. Headers include:
- **Content-Security-Policy** — Restricts script/style/font sources
- **X-Content-Type-Options: nosniff** — Prevents MIME sniffing
- **X-Frame-Options: SAMEORIGIN** — Prevents clickjacking
- **Referrer-Policy** — Controls referrer information
- **Permissions-Policy** — Restricts camera/mic/geolocation

## 2. Guest Name Sanitization

Guest names are sanitized to prevent XSS:
- Max 100 characters
- HTML/script characters (`< > " ' &`) are stripped

## 3. Guest List — Choose One Data Source

The guest list is **never exposed** in the client. The API returns only the requested name.

### Option A: Environment Variable (Simplest)

1. Generate the JSON:
   ```bash
   node scripts/export-guest-list-json.js
   ```

2. In [Vercel Dashboard](https://vercel.com) → Your Project → **Settings** → **Environment Variables**:
   - **Name:** `GUEST_LIST_JSON`
   - **Value:** Paste the JSON output (single line is fine)
   - Apply to Production, Preview, Development

3. Redeploy.

### Option B: Google Sheets (Editable without redeploy)

**Format A — Names only (auto-generated tokens):**
- Column A = guest names. Row 1 = g001, Row 2 = g002, etc.

**Format B — Token + Name:**
- Column A = token (g001, g002), Column B = guest name. Row 1 = header optional.

2. **Google Cloud setup:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a project (or use existing)
   - Enable **Google Sheets API** (APIs & Services → Library → search "Sheets API")
   - Create **Service Account** (APIs & Services → Credentials → Create Credentials → Service Account)
   - Download the JSON key file
   - **Share your Google Sheet** with the service account email (e.g. `xxx@project.iam.gserviceaccount.com`) as **Viewer**

3. **Vercel Environment Variables:**
   - `GOOGLE_SHEET_ID` — Your sheet ID: `1ANpuNf9J1Q1yk8q2oxcIfP0H8R_klsPIAwhz7A3-O3A`
   - `GUEST_SHEET_CREDENTIALS` or `GOOGLE_SHEET_CREDENTIALS` — Paste the **entire** JSON key file content (minified, single line works best)

4. Redeploy.

## 4. HTTPS

Vercel serves over HTTPS by default. Your site at `https://my-wedding-ticket.vercel.app` is already secure.

## 5. Local Development

When running locally (`npm run serve`), the `/api/guest` endpoint is not available. Guests will show the default name. To test the API locally, use [Vercel CLI](https://vercel.com/cli): `vercel dev`.
