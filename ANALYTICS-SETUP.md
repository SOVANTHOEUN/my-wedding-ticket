# Google Analytics 4 Setup Guide

This guide walks you through setting up Google Analytics 4 (GA4) for your wedding e-ticket site from scratch.

---

## Step 1: Create a Google Analytics Account

1. Go to [analytics.google.com](https://analytics.google.com)
2. Sign in with your Google account
3. Click **Start measuring** (or **Admin** → **Create Account** if you already have Analytics)

---

## Step 2: Create an Account (optional)

1. **Account name**: e.g. "Wedding E-Ticket" or your name
2. Configure data sharing settings (optional)
3. Click **Next**

---

## Step 3: Create a GA4 Property

1. **Property name**: e.g. "Wedding Invitation"
2. **Reporting time zone**: Select your timezone (e.g. Asia/Phnom_Penh)
3. **Currency**: Your preferred currency (e.g. USD)
4. Click **Next**

---

## Step 4: Business Details (optional)

1. Select your industry: **Lifestyle** or **Other**
2. Business size: **Small** (or as appropriate)
3. Select how you plan to use Analytics (e.g. **Examine user behavior**)
4. Click **Create**
5. Accept the Terms of Service

---

## Step 5: Set Up a Web Data Stream

1. Select **Web** as the platform
2. **Website URL**: Your live URL (e.g. `https://my-wedding-ticket.vercel.app`)
3. **Stream name**: e.g. "Wedding E-Ticket"
4. Click **Create stream**

---

## Step 6: Get Your Measurement ID

1. After creating the stream, you'll see **Web stream details**
2. Copy your **Measurement ID** — it looks like `G-XXXXXXXXXX`
3. You'll need this for the next step

---

## Step 7: Add the Measurement ID to This Project

1. Open **`js/analytics-config.js`** in this project
2. Replace `G-XXXXXXXXXX` with your actual Measurement ID:
   ```javascript
   window.GA_MEASUREMENT_ID = 'G-ABC123XYZ';  // Your real ID from Step 6
   ```
3. Save the file

The same config is used by `index.html` and `wedding-invitation V7.html` — you only edit this one file.

---

## Step 8: Deploy

1. Commit and push your changes
2. Vercel will auto-deploy
3. Visit your site — Analytics will start collecting data within a few minutes

---

## Verify It's Working

1. Go to [analytics.google.com](https://analytics.google.com)
2. Select your property
3. Open **Reports** → **Realtime**
4. Visit your wedding site in another tab
5. You should see yourself as an active user within ~30 seconds

You can also use [Tag Assistant](https://tagassistant.google.com/) to verify the tag is firing.

---

## What Gets Tracked

- **Page views** — Each visit to index.html and wedding-invitation V7.html
- **Session data** — Duration, device type, location (country-level)
- **Traffic sources** — Where visitors came from (direct, referral, etc.)

Data typically appears in standard reports within 24–48 hours. Realtime reports show activity within seconds.
