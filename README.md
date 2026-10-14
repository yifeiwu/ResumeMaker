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
- Settings: font S/M/L, margins, accent color, page numbers, **Redact PII** (hides email/phone/location in preview + all exports)
- **Profiles:** multiple resumes (e.g. frontend-ats, manager-modern) with New/Duplicate/Delete/Rename; each autosaves separately; JSON io applies to the active profile
- **Undo/Redo:** 30-step in-memory history + Ctrl+Z / Ctrl+Shift+Z (typing uses native undo); plus backup-slot `Undo replace` for imports
- **Bullet coach:** per-job lint — flags short/long bullets, weak starts, missing metrics/action verbs
- **JD matcher:** paste a job ad → local keyword match score with hit/missing pills (nothing uploaded)
- **Page guard:** live `Est. X.X A4 pages` estimate with over-length / awkward-break warnings
- Persistence: autosave to `localStorage` + backup slot for Undo
- **JSON Save/Import (replace-only):** `Save .json` downloads `profile-YYYY-MM-DD.json` (`{version:1, exportedAt, profile, data}`); `Open .json` / drag-drop validates then confirms replace; corrupt files never wipe state; `Undo replace` restores backup. The **JSON view** (Resume | JSON toggle next to the template picker) shows the live JSON for the active profile with inline editing — Apply (Ctrl+Enter), Copy, Reset to current; invalid edits show an error and never wipe state
- **Example resume:** auto-loads on first visit (`Alex Morgan` demo with 3 jobs + `breakBefore` on 3rd to show 2-page output); `Load example` anytime
- **Printable file:** `Print / PDF` uses `@page A4` + `@media print` (only the sheet prints, selectable text); `Export .html` standalone printable file; `Export .txt` plain-text ATS version; `Quick PDF` one-click via html2pdf CDN (beta, rasterized — needs network)
- **Privacy:** everything stays in `localStorage`; Privacy card has Redact toggle + Erase-all; mobile Edit/Preview tabs, skip link, focus-visible styles
- **Self-test:** open `/test.html` (over http) for 9 automated checks (templates data, migrate, validation, round-trip, coach, JD, exports, JSON view envelope)

## Verify

```powershell
python -m http.server 8000
# open http://localhost:8000/test.html — expect "All 9 checks passed"
```

## JSON format

```json
{ "version": 1, "exportedAt": "2026-…", "data": { "contact": {}, "summary": "", "experience": [], "settings": {} } }
```

Raw state files (no envelope) also import. Validation rejects non-objects, missing fields, wrong types with a toast — current state untouched.
