# Cabbagetown Odd Jobs — Static Site

Single-page marketing site for the teen-run odd-jobs crew in Cabbagetown, Atlanta. Form submissions land in a Google Sheet via a Google Apps Script Web App; photos go to a Google Drive folder.

## Project layout

```
.
├── README.md                   # repo docs (not deployed)
├── .gitignore
├── .env                        # local config (gitignored, not deployed)
├── public_html/                # the deployable site — exactly mirrors Hostinger's public_html/
│   ├── index.html              # the whole page — 11 sections in order
│   ├── css/styles.css          # design tokens + section styles (token block at top of file)
│   ├── js/main.js              # mobile nav toggle, footer year, service-card prefill, form submit
│   └── images/                 # production images used by index.html
│       ├── mascot-icon.png     # small standalone cabbage — header logo + favicon
│       ├── service-*.png       # service icons
│       ├── before-after/       # add real before/after photos here (see TODO list below)
│       └── archive/            # unused art, kept for reference
└── assests/                    # ORIGINAL ChatGPT images. Reference only; not deployed.
```

Anything inside `public_html/` is what goes live. Everything else stays local.

## Local preview

```sh
cd public_html
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just double-click `public_html/index.html` — it works as a `file://` URL too.

## Pre-launch TODOs

### 1. Set up the form endpoint (Google Sheet + Drive)

The "Request a quote" form posts to a Google Apps Script Web App that appends a row to a Google Sheet and saves any uploaded photos to a Google Drive folder. One-time setup:

1. **Create a Google Sheet.** Name it e.g. `Cabbagetown Odd Jobs Quotes`.
2. **Create a Drive folder** for photo uploads. Open the folder; the URL ends in `/folders/<FOLDER_ID>` — copy that ID.
3. **Open Apps Script.** From the Sheet: `Extensions → Apps Script`. Replace the default `Code.gs` with the script below. Set `DRIVE_FOLDER_ID` to the folder ID from step 2. Save.

   ```js
   // Bound to the destination Sheet. Extensions → Apps Script.
   const SHEET_NAME = "Quotes";
   const DRIVE_FOLDER_ID = "<paste a Drive folder ID here>";

   function doPost(e) {
     const body = JSON.parse(e.postData.contents);
     const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
     const imageUrls = (body.images || []).map(function (img) {
       const blob = Utilities.newBlob(
         Utilities.base64Decode(img.data),
         img.type || "image/jpeg",
         img.name || "photo"
       );
       const file = folder.createFile(blob);
       file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       return file.getUrl();
     });
     const ss = SpreadsheetApp.getActive();
     const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
     if (sheet.getLastRow() === 0) {
       sheet.appendRow(["Submitted","Service","Name","Phone","Email","Address","When","Notes","Images","User-Agent"]);
     }
     sheet.appendRow([
       body.submittedAt, body.service, body.name, body.phone, body.email,
       body.address, body.when, body.notes, imageUrls.join("\n"), body.userAgent
     ]);
     return ContentService.createTextOutput(JSON.stringify({ ok: true }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```

4. **Deploy as a Web App.** `Deploy → New deployment → Type: Web app`. Settings: **Execute as: Me**, **Who has access: Anyone**. Click Deploy and authorize when prompted. Copy the resulting Web App URL.
5. **Wire it into the site.** Open `public_html/js/main.js` and paste the Web App URL into `var APPS_SCRIPT_URL = ""`.
6. **Test.** Submit the form once on the live site. A new row should appear in the Sheet, and any attached photo should land in the Drive folder with a clickable link in the row's *Images* column.

### 2. Add real before/after photos

The gallery currently shows placeholder boxes. Add 6 photos to `public_html/images/before-after/`:

- `driveway-before.jpg` / `driveway-after.jpg`
- `leaves-before.jpg` / `leaves-after.jpg`
- `lawn-before.jpg` / `lawn-after.jpg`

Then, in `public_html/index.html`, replace each `<div class="ba-placeholder">…</div>` with `<img src="images/before-after/driveway-before.jpg" alt="Driveway covered in dirt before pressure washing" />` (and similar). Keep the `<figcaption>` lines as-is.

Aim for ~1500px wide, JPEG, under 300 KB each.

### 3. Replace placeholder neighbor quotes

In the **Trust** section there are three placeholder testimonials. Replace with real quotes once you have them. Keep the format short — a sentence each, plus first name + street.

### 4. Set the parent contact email

Footer currently has `parent@example.com`. Swap to a real address.

### 5. Set the Instagram link

Footer has `https://instagram.com/` as a placeholder. Swap to the real handle URL.

## Deploying to Hostinger

Everything that goes live is in `public_html/`. Nothing else in the repo gets deployed.

### Option A — rsync over SSH (recommended)

We have a `cabbage` SSH alias configured in `~/.ssh/config`. One command syncs the local `public_html/` to Hostinger's `public_html/`:

```sh
rsync -avz --delete --exclude='.DS_Store' public_html/ cabbage:public_html/
```

The trailing slash on `public_html/` matters — it copies *contents*, not the folder itself. `--delete` keeps Hostinger in sync (removes anything on the server that's no longer in the local `public_html/`). The `--exclude` keeps macOS junk files out. Add `-n` to do a dry run first.

### Option B — Hostinger File Manager (no terminal needed)
1. Log into Hostinger → **Files → File Manager**.
2. Navigate to `public_html/`.
3. Delete the existing files (back them up first if you want).
4. Drag-and-drop the **contents** of your local `public_html/` folder.
5. Hard-refresh the live site (⌘+Shift+R / Ctrl+Shift+R) to bust the browser cache.

### Domain notes
The current domain `cabbagetownoddjobs.com` should already be pointed at Hostinger. After upload, the live site replaces the Squarespace placeholder. If DNS is still pointing at Squarespace, update nameservers in your domain registrar to Hostinger's (`ns1.dns-parking.com`, `ns2.dns-parking.com` or whatever Hostinger gave you).

## Strongly recommended (separate from the website)

- **Set up a Google Business Profile** at https://www.google.com/business/. It's free, takes ~15 minutes, and ranks above the website for "odd jobs near me" in Cabbagetown. Include the same services, photos, and the service area. This single step probably moves the needle more than any code change here.

## Browser support

Modern evergreen browsers (Chrome, Safari, Firefox, Edge — last 2 versions). No IE support.

## Tech notes

- Vanilla HTML / CSS / JS. No build step.
- Google Fonts: Poppins (headings), Inter (body) — loaded via `<link>` with `preconnect` for fast first paint.
- CSS uses custom properties for design tokens. Edit them at the top of `public_html/css/styles.css` if the brand changes.
- Form submissions go to a Google Apps Script Web App (URL configured in `public_html/js/main.js`). Photos are base64-encoded client-side and decoded into Drive files by the script. A hidden honeypot field guards against most bot spam.
