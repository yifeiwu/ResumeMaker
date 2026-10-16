# Interactive Resume Builder

Zero-build static app. Edit job history + skills/keywords, toggle/reorder sections, pick from 3 templates, set manual page breaks, live A4 preview, print to PDF. One resume, stored in your browser — no accounts, no uploads, no build step.

## Run locally

No Node needed. Any static server works:

```powershell
python -m http.server 8000
# open http://localhost:8000
```

Or just open `index.html` directly (file:// works, Export/Print work best over http).

## Deploy

**Vercel (recommended):** push this folder to GitHub → Vercel → New Project → Import → defaults (no build command needed, output `.`). `vercel.json` handles clean URLs + caching.

**GitHub Pages:** Settings → Pages → Deploy from branch → `master` / root. App works from subpath with no changes (relative asset paths).

## Features

- Editor: contact, summary, work history (bullets one-per-line, current-job, duplicate/reorder/hide), skill groups + brief, education, projects, certifications, languages, custom sections
- Sections: all optional (eye toggle), reorderable, per-section + per-item **page break before** toggles (dashed red indicator → real A4 break in print)
- Custom sections: bulleted **or** paragraph layout, per-line hide/delete, break-before toggle
- Templates: **ATS Classic** (parser-safe), **Modern** (color header + pills), **Sidebar** (two-column)
- **Real A4 pagination:** the preview lays the resume out into real A4 page boxes (210x297mm), so page 2 (and 3) are visible and the page count is exact - there is no guessing. Long sections split across pages (the section title repeats on continuations), manual breaks are honoured, and each page footer carries an accurate `Page X of Y`. Pagination is computed from A4 constants, so it is identical at any window size and while the preview pane is hidden.
- **Print (WYSIWYG):** `Print / PDF` prints the page boxes one per A4 sheet at 1:1 (`@page{size:A4;margin:0}`, content inset by your margin setting, so printer hardware margins never clip anything). The page count you see in the preview is the page count you get, and the text stays selectable. Break markers (red dashed lines) are a preview affordance only - stripped before anything is printed or exported.
- Settings: font S/M/L, margins, accent color, print footer, **Redact PII** (removes email/phone/location from the preview, `.txt` and Quick PDF — the values are dropped rather than replaced with placeholders, and `Save .json` + the JSON view keep the real values so your backups stay complete); one undo step per colour-picker drag, not per pixel
- **Undo/Redo:** 30-step in-memory history + Ctrl+Z / Ctrl+Shift+Z (typing uses native undo) covering *every* edit — text, settings and imports; plus a backup-slot `Undo replace` for whole-file restores. Pending keystrokes are flushed on tab hide/close, so nothing is lost to the autosave debounce
- **Bullet coach:** per-item lint — flags short/long bullets, weak starts, missing metrics/action verbs
- **JD matcher:** paste a job ad → local keyword score. Alias canonicalisation (k8s→kubernetes, js→javascript), plural folding, requirement-style lines weighted higher, terms already in your skill groups boosted; nothing uploaded
- **Page guard:** live `Est. X.X pages` with over-length / awkward-break warnings (suppressed on narrow screens where the on-screen sheet isn't A4 width)
- Persistence: debounced autosave to `localStorage`; storage-full failures are reported instead of silently swallowed
- **JSON Save/Import (replace-only):** `Save .json` downloads `name-YYYY-MM-DD.json` (`{version, exportedAt, data}`); `Open .json` / drag-drop validates then confirms replace; corrupt files never wipe state. The **JSON view** (Resume | JSON toggle next to the template picker) shows the live JSON with inline editing — Apply (Ctrl+Enter), Copy, Reset. Invalid JSON shows an error and never touches state; if the resume changes while you have hand-edits pending you get a staleness warning before Apply can discard them
- **Example resume:** auto-loads on first visit (`Alex Morgan` demo, 3 jobs, `breakBefore` on the 3rd to show 2-page output); `Load example` anytime
- **Printable file:** `Print / PDF` (A4, selectable text), `Export .txt` plain-text ATS version, and `Quick PDF` - a one-click PDF of **every** A4 page, assembled page-by-page from the preview boxes via html2canvas + jsPDF (both SRI-pinned from CDN, so it needs network). Quick PDF is rasterized, so its text is not selectable; use `Print / PDF` when you need selectable text
- **Privacy:** everything stays in `localStorage`; Privacy card has Redact toggle + Erase-all (also purges keys from the retired multi-profile version); mobile Edit/Preview tabs, skip link, focus-visible styles, `aria-pressed` toggles
- **Self-test:** `/test.html` (14 unit checks) + `/e2e.html` (55 browser integration checks) — no network, no build; `./check.ps1` runs both

## Verify

```powershell
.\check.ps1
# starts a temp server, runs /test.html + /e2e.html in headless Edge, exits non-zero on failure
```

Open them by hand instead: `python -m http.server 8000`, then
`http://localhost:8000/test.html` (14 unit checks) and `http://localhost:8000/e2e.html`
(55 browser integration checks: JSON view round-trip, invalid input, staleness guard, export/print
paths, undo granularity, A4 pagination incl. a no-content-loss invariant).

## Desktop-first

The layout targets desktop: a 440px editor beside a live A4 preview, A4 sheets shown at true
210x297mm, sticky preview pane. Narrow windows switch to the Edit/Preview tab layout - those rules
are `screen`-scoped on purpose, because print paper is ~794px wide and an unscoped `max-width`
query would hide the resume when printing (it did, once).

**In the print dialog choose A4 and margins "None"/"Default"** - the sheets are already A4-sized and
include their own margins, so "Default" (browser adds its own) would shrink and re-flow them.

## Known limitation

The **Sidebar** template is a two-column CSS grid, so it is never split across pages - splitting a
grid would strand half-empty pages. If a sidebar resume runs past one page the page guard says
"1 page overflow" and the browser paginates that page itself. Use ATS Classic or Modern for
multi-page resumes.

## JSON format

```json
{ "version": 1, "exportedAt": "2026-…", "data": { "contact": {}, "summary": "", "experience": [], "settings": {} } }
```

Raw state files (no envelope) also import. Validation rejects non-objects, arrays, missing resume keys and wrong field types with a message — current state untouched. `migrate()` repairs anything that slips past validation (missing arrays, bad template/accent values, legacy custom-section `bullets`).
