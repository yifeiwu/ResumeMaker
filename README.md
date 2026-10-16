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
- **Real A4 pagination:** the preview lays the resume out into actual A4 page boxes, so page 2 (and 3) are visible and the page count is exact - there is no guessing. Long sections split across pages (the section title repeats on continuations), manual breaks are honoured, and each page footer carries an accurate `Page X of Y`.
- **Print/Export:** `Print / PDF` prints the page boxes one per sheet; `Export .html` ships the same boxes plus all template CSS. Break markers (red dashed lines) are a preview affordance only - they are stripped before anything is printed, exported or turned into a PDF. Page numbers are real, because pagination is computed rather than left to the browser.
- Settings: font S/M/L, margins, accent color, print footer, **Redact PII** (hides email/phone/location in the preview, `.html`, `.txt` and Quick PDF — `Save .json` and the JSON view keep the real values); one undo step per colour-picker drag, not per pixel
- **Undo/Redo:** 30-step in-memory history + Ctrl+Z / Ctrl+Shift+Z (typing uses native undo) covering *every* edit — text, settings and imports; plus a backup-slot `Undo replace` for whole-file restores. Pending keystrokes are flushed on tab hide/close, so nothing is lost to the autosave debounce
- **Bullet coach:** per-item lint — flags short/long bullets, weak starts, missing metrics/action verbs
- **JD matcher:** paste a job ad → local keyword score. Alias canonicalisation (k8s→kubernetes, js→javascript), plural folding, requirement-style lines weighted higher, terms already in your skill groups boosted; nothing uploaded
- **Page guard:** live `Est. X.X pages` with over-length / awkward-break warnings (suppressed on narrow screens where the on-screen sheet isn't A4 width)
- Persistence: debounced autosave to `localStorage`; storage-full failures are reported instead of silently swallowed
- **JSON Save/Import (replace-only):** `Save .json` downloads `name-YYYY-MM-DD.json` (`{version, exportedAt, data}`); `Open .json` / drag-drop validates then confirms replace; corrupt files never wipe state. The **JSON view** (Resume | JSON toggle next to the template picker) shows the live JSON with inline editing — Apply (Ctrl+Enter), Copy, Reset. Invalid JSON shows an error and never touches state; if the resume changes while you have hand-edits pending you get a staleness warning before Apply can discard them
- **Example resume:** auto-loads on first visit (`Alex Morgan` demo, 3 jobs, `breakBefore` on the 3rd to show 2-page output); `Load example` anytime
- **Printable file:** `Print / PDF` uses `@page A4` + `@media print` (only the sheet prints, selectable text); `Export .html` standalone printable file that keeps all template CSS; `Export .txt` plain-text ATS version; `Quick PDF` one-click via html2pdf CDN (beta, rasterized, SRI-pinned, needs network) - single page only, since html2pdf cannot paginate; for 2+ pages use `Print / PDF`
- **Privacy:** everything stays in `localStorage`; Privacy card has Redact toggle + Erase-all (also purges keys from the retired multi-profile version); mobile Edit/Preview tabs, skip link, focus-visible styles, `aria-pressed` toggles
- **Self-test:** `/test.html` (12 unit checks) + `/e2e.html` (30 browser integration checks) — no network, no build; `./check.ps1` runs both

## Verify

```powershell
.\check.ps1
# starts a temp server, runs /test.html + /e2e.html in headless Edge, exits non-zero on failure
```

Open them by hand instead: `python -m http.server 8000`, then
`http://localhost:8000/test.html` (12 unit checks) and `http://localhost:8000/e2e.html`
(51 browser integration checks: JSON view round-trip, invalid input, staleness guard, export/print
paths, undo granularity, A4 pagination incl. a no-content-loss invariant).

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
