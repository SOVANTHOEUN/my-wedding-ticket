# Wedding E-Ticket

A static wedding invitation (e-ticket) website for **VONG Sovanthoeun & ROENG Vila** — សិរីមង្គលអាពាហ៍ពិពាហ៍.

## Project structure

```
my-wedding-ticket/
├── index.html          # Version selector (main entry)
├── wedding-invitation V7.html   # Primary invitation (ticket cover + detail)
├── js/
│   └── translations.js # Multi-language (KM, EN, KR)
├── api/
│   ├── guest.js        # Guest lookup from Google Sheets (serverless)
│   └── rsvp.js         # RSVP submit to Google Sheets (serverless)
├── images/             # Gallery photos, QR codes
├── audio/              # Background music
├── README.md
├── vercel.json         # Security headers, CSP
└── SECURITY-SETUP.md   # Guest list & RSVP configuration
```

## Setup (local)

1. **Clone or download** this project.
2. **Open the site**  
   - Option A: Double-click `index.html` (or `wedding-invitation V7.html`) to open in your browser.  
   - Option B: **Use a local server** (recommended — required for QR download to work):
     ```bash
     # Node (easiest)
     npx serve
     # Or: npm run serve
     # Then open the URL shown (e.g. http://localhost:3000)
     ```
     ```bash
     # Python 3
     python3 -m http.server 8000
     # Then visit http://localhost:8000
     ```
   - **Note:** QR code download buttons only work when the page is served over HTTP (Option B) or when deployed. If opened from file://, clicking will open the image in a new tab — use right-click (desktop) or long-press (mobile) to save.
3. **Add your assets (optional)**  
   - Gallery: Add images in `images/` and update the gallery in `index.html` to use `<img src="images/photo1.jpg" alt="...">` inside each `.gallery-item`.  
   - Maps/QR: Replace `#` in “Open in Google Maps” and QR links with your real Google Maps URL and QR image paths (e.g. `images/qr-usd.png`).

No build step or database is required; the site is plain HTML, CSS, and JavaScript.

## Deployment (Vercel – recommended)

Vercel is free for personal projects and works well for static sites.

### 1. Push your code to GitHub

1. Create a new repository on [GitHub](https://github.com/new).
2. In your project folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial wedding e-ticket"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repo name.

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
2. Click **Add New…** → **Project**.
3. Import your GitHub repository (e.g. `my-wedding-ticket`).
4. Leave **Root Directory** as `.` and **Build Command** empty (static site).
5. Click **Deploy**. Vercel will build and give you a URL like `https://my-wedding-ticket-xxx.vercel.app`.

### 3. Your live URL

- After deploy, the **live URL** is shown on the project dashboard.
- You can add a **custom domain** in Vercel: Project → **Settings** → **Domains**.

### 4. Updating the site later

1. Edit files locally (e.g. in Cursor).
2. Commit and push to the same branch (e.g. `main`):
   ```bash
   git add .
   git commit -m "Update invitation text"
   git push
   ```
3. Vercel will automatically redeploy; your live URL will show the changes in a minute or two.

## Other hosting options

- **Netlify**: Drag-and-drop the project folder at [app.netlify.com/drop](https://app.netlify.com/drop), or connect a Git repo for auto-deploys.
- **GitHub Pages**: Push to GitHub, then in the repo go to **Settings** → **Pages** → Source: **main** branch, folder **/ (root)**. Site will be at `https://USERNAME.github.io/REPO_NAME/`.

## Tech stack

- HTML5, CSS3 (custom properties, flexbox, grid)
- Vanilla JavaScript (no frameworks)
- Google Fonts: Montserrat, Poppins, Playfair Display, Noto Serif Khmer

## License

Private use for the wedding. Modify as needed for your event.
