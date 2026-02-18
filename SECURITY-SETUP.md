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

## 3. Guest List — Google Sheets

The guest list is **never exposed** in the client. The API returns only the requested name.

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
   - **Share your Google Sheet** with the service account email (e.g. `xxx@project.iam.gserviceaccount.com`):
     - **Viewer** — for guest lookup only
     - **Editor** — required if using RSVP (so the API can write to the RSVP tab)

3. **Vercel Environment Variables:**
   - `GOOGLE_SHEET_ID` — Your sheet ID: `1ANpuNf9J1Q1yk8q2oxcIfP0H8R_klsPIAwhz7A3-O3A`
   - `GUEST_SHEET_CREDENTIALS` or `GOOGLE_SHEET_CREDENTIALS` — Paste the **entire** JSON key file content (minified, single line works best)

4. Redeploy.

### RSVP Feature (optional)

If you use the RSVP feature, create an **RSVP** tab with columns: `token` | `guest_name` | `status` | `reg_dttm` | `mod_dttm` | `message` | `device_type` | `location`. Status: `confirm`, `decline`, or `undecided`. `reg_dttm` = first submit time; `mod_dttm` = last update time (empty on first submit). `device_type` = mobile/tablet/desktop (from client). `location` = city, region, country (from Vercel geo headers). The API uses `valueInputOption: RAW` to insert values only. To avoid new rows inheriting header formatting, add a blank row 2 with default (no) formatting — data rows will then inherit from row 2.

## 4. HTTPS

Vercel serves over HTTPS by default. Your site at `https://my-wedding-ticket.vercel.app` is already secure.

## 5. Local Development

When running locally (`npm run serve`), the `/api/guest` endpoint is not available. Guests will show the default name. To test the API locally, use [Vercel CLI](https://vercel.com/cli): `vercel dev`.
