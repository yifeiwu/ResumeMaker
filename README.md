# Interactive Resume Builder

Zero-build static app. Edit job history + skills/keywords, toggle/reorder sections, pick from 3 templates, set manual page breaks, live A4 preview, print to PDF.

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

- Editor: contact, summary, work history (bullets one-per-line, current-job, duplicate/reorder), skill groups + brief, education, projects, certifications, languages, custom sections
- Sections: all optional (eye toggle), reorderable, per-section + per-item **page break before** toggles (dashed red indicator → real A4 break in print)
- Templates: **ATS Classic** (parser-safe), **Modern** (color header + pills), **Sidebar** (two-column)
- Settings: font S/M/L, margins, accent color, page numbers
- Persistence: autosave to `localStorage` + backup slot for Undo
- **JSON Save/Import (replace-only):** `Save .json` downloads `name-YYYY-MM-DD.json` (`{version:1, exportedAt, data}`); `Open .json` / drag-drop validates then confirms replace; corrupt files never wipe state; `Undo replace` restores backup
- **Example resume:** auto-loads on first visit (`Alex Morgan` demo with 3 jobs + `breakBefore` on 3rd to show 2-page output); `Load example` anytime
- **Printable file:** `Print / PDF` uses `@page A4` + `@media print` (only the sheet prints); `Export .html` downloads a standalone printable file (auto-opens print dialog)

## JSON format

```json
{ "version": 1, "exportedAt": "2026-…", "data": { "contact": {}, "summary": "", "experience": [], "settings": {} } }
```

Raw state files (no envelope) also import. Validation rejects non-objects, missing fields, wrong types with a toast — current state untouched.
