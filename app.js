/* Resume Builder — vanilla static app (no build step). Vercel + GitHub Pages ready. */
"use strict";
const LS_KEY = "resume-builder-v1";
const BACKUP_KEY = "resume-builder-backup-v1";
const LEGACY_PROFILES_KEY = "resume-builder-profiles-v1";
const ACCENT_DEFAULT = "#1d4ed8";
const SCHEMA_VERSION = 1;
const HIST_MAX = 30;
const TEMPLATES = ["ats", "modern", "sidebar"];
const FONT_SIZES = ["small", "medium", "large"];
const MARGINS = ["narrow", "normal", "wide"];
const LIST_KEYS = ["experience", "skillGroups", "education", "projects", "certifications", "languages", "customSections"];

const SECTION_DEFS = [
  { id: "summary", label: "Summary" },
  { id: "experience", label: "Work History" },
  { id: "skills", label: "Skills / Keywords" },
  { id: "education", label: "Education" },
  { id: "projects", label: "Projects" },
  { id: "certifications", label: "Certifications" },
  { id: "languages", label: "Languages" },
];

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
const strArr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

/* ================= STATE SHAPE ================= */
function defaultState() {
  return {
    version: SCHEMA_VERSION,
    isExample: false,
    contact: { fullName: "", title: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" },
    summary: "",
    skillGroups: [],
    skillsBrief: "",
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    languages: [],
    customSections: [],
    sectionOrder: ["summary", "experience", "skills", "education", "projects", "certifications", "languages"],
    sectionsVisible: { summary: true, experience: true, skills: true, education: true, projects: false, certifications: false, languages: false },
    sectionBreaks: { summary: false, experience: false, skills: false, education: false, projects: false, certifications: false, languages: false },
    settings: { templateId: "ats", fontSize: "medium", margins: "normal", accent: ACCENT_DEFAULT, showPageNumbers: true, redactPII: false },
    jdText: "",
  };
}

function sampleState() {
  const s = defaultState();
  s.isExample = true;
  s.contact = { fullName: "Alex Morgan", title: "Senior Frontend Engineer", email: "alex.morgan@example.com", phone: "+1 (555) 014-2288", location: "Austin, TX", linkedin: "linkedin.com/in/alexmorgan", github: "github.com/alexmorgan", portfolio: "alexmorgan.dev" };
  s.summary = "Frontend engineer with 8+ years building responsive, accessible web apps in React/TypeScript. Led migration of a 200k-user dashboard to Vite + Tailwind, cutting load time 43%. Known for clean ATS-friendly delivery and mentoring juniors.";
  s.skillGroups = [
    { id: uid(), label: "Languages", keywords: "TypeScript, JavaScript, HTML, CSS, Python" },
    { id: uid(), label: "Frontend", keywords: "React, Vite, Tailwind CSS, Accessibility (a11y), Responsive design" },
    { id: uid(), label: "Tools & practices", keywords: "Git, GitHub Actions, CI/CD, Jest, Agile, Code review, Mentoring" },
  ];
  s.skillsBrief = "Keywords: React, TypeScript, Vite, Tailwind, ATS, CI/CD, performance, accessibility.";
  s.experience = [
    { id: uid(), company: "Northwind Labs", location: "Austin, TX", title: "Senior Frontend Engineer", start: "2022-03", end: "", current: true, breakBefore: false, hidden: false, bullets: ["Lead 4-engineer squad rebuilding analytics dashboard (200k MAU); cut LCP from 4.1s to 2.3s.", "Migrated CRA to Vite + Tailwind; build time 9min to 90s; PR throughput up 30%.", "Introduced print-safe reporting views; customer PDF exports up 2x.", "Mentor 3 juniors; run biweekly frontend guild on accessibility."] },
    { id: uid(), company: "Brightline Health", location: "Remote", title: "Frontend Engineer", start: "2019-06", end: "2022-02", current: false, breakBefore: false, hidden: false, bullets: ["Built scheduling SPA in React used by 1,200 clinics; 99.9% uptime.", "Added Jest + Playwright coverage from 20% to 78%; regressions down 60%.", "Partnered with design to ship WCAG 2.1 AA component library."] },
    { id: uid(), company: "Citysoft", location: "Dallas, TX", title: "Junior Web Developer", start: "2017-08", end: "2019-05", current: false, breakBefore: true, hidden: false, bullets: ["Shipped marketing pages (+35% conversion) and internal admin tools.", "Converted legacy jQuery widgets to React components."] },
  ];
  s.education = [{ id: uid(), school: "UT Austin", degree: "B.S. Computer Science", field: "", start: "2013", end: "2017", details: "Relevant: web systems, HCI. Senior project: campus events app.", breakBefore: false, hidden: false }];
  s.projects = [{ id: uid(), name: "print-resume-starter", link: "github.com/alexmorgan/print-resume-starter", tech: "HTML, CSS @page", bullets: ["Open-source A4 print stylesheet; 400+ stars."], breakBefore: false, hidden: false }];
  s.certifications = [{ id: uid(), name: "AWS Certified Cloud Practitioner", issuer: "Amazon", year: "2023" }];
  s.languages = [{ id: uid(), lang: "English", level: "Native" }, { id: uid(), lang: "Spanish", level: "Professional" }];
  s.sectionsVisible = { summary: true, experience: true, skills: true, education: true, projects: true, certifications: false, languages: false };
  return s;
}

/* ---- migrate / repair anything that comes out of localStorage, a file or the JSON view ---- */
function migrate(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const d = defaultState();
  const out = Object.assign(d, o);
  delete out.profileName; // single-resume app: old multi-profile name is no longer meaningful
  out.contact = Object.assign(d.contact, o.contact && typeof o.contact === "object" ? o.contact : {});
  out.settings = Object.assign(d.settings, o.settings && typeof o.settings === "object" ? o.settings : {});
  out.sectionsVisible = Object.assign(d.sectionsVisible, o.sectionsVisible || {});
  out.sectionBreaks = Object.assign(d.sectionBreaks, o.sectionBreaks || {});
  out.version = SCHEMA_VERSION;
  out.isExample = !!out.isExample;
  ["summary", "skillsBrief", "jdText"].forEach((k) => { if (typeof out[k] !== "string") out[k] = ""; });
  out.settings.templateId = oneOf(out.settings.templateId, TEMPLATES, "ats");
  out.settings.fontSize = oneOf(out.settings.fontSize, FONT_SIZES, "medium");
  out.settings.margins = oneOf(out.settings.margins, MARGINS, "normal");
  if (!/^#[0-9a-f]{3,8}$/i.test(str(out.settings.accent))) out.settings.accent = ACCENT_DEFAULT;
  out.settings.showPageNumbers = !!out.settings.showPageNumbers;
  out.settings.redactPII = !!out.settings.redactPII;
  if (!Array.isArray(out.sectionOrder) || !out.sectionOrder.length) out.sectionOrder = d.sectionOrder.slice();
  LIST_KEYS.forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
  const objs = (arr) => arr.filter((x) => x && typeof x === "object");
  out.experience = objs(out.experience).map((j) => ({ id: j.id || uid(), company: str(j.company), location: str(j.location), title: str(j.title), start: str(j.start), end: str(j.end), current: !!j.current, breakBefore: !!j.breakBefore, hidden: !!j.hidden, bullets: strArr(j.bullets) }));
  out.projects = objs(out.projects).map((p) => ({ id: p.id || uid(), name: str(p.name), link: str(p.link), tech: str(p.tech), breakBefore: !!p.breakBefore, hidden: !!p.hidden, bullets: strArr(p.bullets) }));
  out.education = objs(out.education).map((e) => ({ id: e.id || uid(), school: str(e.school), degree: str(e.degree), field: str(e.field), start: str(e.start), end: str(e.end), details: str(e.details), breakBefore: !!e.breakBefore, hidden: !!e.hidden }));
  out.skillGroups = objs(out.skillGroups).map((g) => ({ id: g.id || uid(), label: str(g.label), keywords: str(g.keywords) }));
  out.certifications = objs(out.certifications).map((c) => ({ id: c.id || uid(), name: str(c.name), issuer: str(c.issuer), year: str(c.year) }));
  out.languages = objs(out.languages).map((l) => ({ id: l.id || uid(), lang: str(l.lang), level: str(l.level) }));
  out.customSections = objs(out.customSections).map((c) => ({
    id: c.id || uid(),
    title: str(c.title),
    layout: c.layout === "text" ? "text" : "bullets",
    breakBefore: !!c.breakBefore,
    hidden: !!c.hidden,
    // legacy shape stored plain strings in `bullets`
    items: (Array.isArray(c.items) ? c.items : strArr(c.bullets)).map((it) => (it && typeof it === "object" ? { id: it.id || uid(), text: str(it.text), hidden: !!it.hidden } : { id: uid(), text: str(it), hidden: false })),
  }));
  return out;
}

/* ================= STORAGE ================= */
let storageWarned = false;
function loadInitialState() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { const m = migrate(JSON.parse(raw)); if (m) return m; } } catch {}
  return sampleState(); // first visit → example resume
}
function purgeLegacyProfiles() {
  try {
    const raw = localStorage.getItem(LEGACY_PROFILES_KEY);
    if (!raw) return;
    const m = JSON.parse(raw);
    if (m && Array.isArray(m.profiles)) m.profiles.forEach((p) => { if (p && p.id) localStorage.removeItem(LS_KEY + ":" + p.id); });
    localStorage.removeItem(LEGACY_PROFILES_KEY);
  } catch {}
}
let state = loadInitialState();
purgeLegacyProfiles();
let saveTimer = null;
function setSaveStatus(t) { const el = $("#save-status"); if (el) el.textContent = t; }
function persist(immediate) {
  const write = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      setSaveStatus("saved " + new Date().toLocaleTimeString());
    } catch {
      setSaveStatus("storage full — export a backup");
      if (!storageWarned) { storageWarned = true; toast("Browser storage is full — this change may not be saved. Use Save .json to keep it.", 5200); }
    }
  };
  setSaveStatus("saving…");
  if (immediate) { clearTimeout(saveTimer); write(); return; }
  clearTimeout(saveTimer); saveTimer = setTimeout(write, 500);
}
function backupCurrent() { try { localStorage.setItem(BACKUP_KEY, JSON.stringify(state)); } catch {} }
function hasBackup() { try { return !!localStorage.getItem(BACKUP_KEY); } catch { return false; } }

/* ================= UNDO HISTORY ================= */
let histPast = [], histFuture = [];
let pendingPreEdit = null;
function pushHistory() {
  const snap = JSON.stringify(state);
  if (histPast.length && histPast[histPast.length - 1] === snap) return;
  histPast.push(snap);
  if (histPast.length > HIST_MAX) histPast.shift();
  histFuture = [];
  syncHistButtons();
}
function recordEditSnapshot() {
  if (!pendingPreEdit) return;
  const snap = pendingPreEdit;
  pendingPreEdit = null;
  if (histPast.length && histPast[histPast.length - 1] === snap) return;
  histPast.push(snap);
  if (histPast.length > HIST_MAX) histPast.shift();
  histFuture = [];
  syncHistButtons();
}
function undoHistory() {
  if (!histPast.length) return toast("Nothing to undo");
  histFuture.push(JSON.stringify(state));
  state = migrate(JSON.parse(histPast.pop()));
  persist(true); renderEditor(); renderPreview(); toast("Undone");
}
function redoHistory() {
  if (!histFuture.length) return toast("Nothing to redo");
  histPast.push(JSON.stringify(state));
  state = migrate(JSON.parse(histFuture.pop()));
  persist(true); renderEditor(); renderPreview(); toast("Redone");
}
function syncHistButtons() {
  const u = $("#btn-hist-undo"), r = $("#btn-hist-redo");
  if (u) u.disabled = !histPast.length;
  if (r) r.disabled = !histFuture.length;
}

/* ================= BULLET COACH ================= */
const WEAK_STARTS = ["responsible for", "helped", "worked on", "assisted", "tasked with", "helped with", "worked with", "in charge of"];
const ACTION_VERBS = ["led", "built", "shipped", "launched", "migrated", "designed", "owned", "drove", "cut", "improved", "increased", "reduced", "mentored", "introduced", "partnered", "added", "created", "automated", "converted"];
function lintBullet(b) {
  const w = [];
  const s = (b || "").trim();
  if (!s) return w;
  if (s.length < 24) w.push("Too short — add scope or outcome.");
  if (s.length > 170) w.push("Long (" + s.length + " chars) — consider splitting.");
  const low = s.toLowerCase();
  if (WEAK_STARTS.some((p) => low.startsWith(p))) w.push("Weak start — use an action verb (Led/Built/Shipped…).");
  if (!/\d/.test(s)) w.push("No metric — add %, $, time, or count.");
  if (!ACTION_VERBS.some((v) => low.startsWith(v)) && !/\b(led|built|shipped|cut|improved|migrated|designed|owned|drove|mentored)\b/.test(low)) w.push("No strong action verb detected.");
  return w;
}
function coachForBullets(bullets) {
  const items = (bullets || []).filter(Boolean);
  if (!items.length) return `<div class="coach">No bullets yet — add 2–4 per role, each with a metric.</div>`;
  const flagged = [];
  items.forEach((b, i) => { const w = lintBullet(b); if (w.length) flagged.push(`<li><strong>#${i + 1}:</strong> ${esc(w.join(" "))}</li>`); });
  const withMetric = items.filter((b) => /\d/.test(b)).length;
  if (!flagged.length) return `<div class="coach good">✓ ${items.length} bullets, ${withMetric} with metrics. Strong.</div>`;
  return `<div class="coach bad"><strong>Coach:</strong> ${withMetric}/${items.length} bullets have metrics.<ul>${flagged.slice(0, 4).join("")}</ul></div>`;
}

/* ================= JD MATCHER ================= */
const STOPWORDS = new Set(("we,you,our,the,and,for,with,will,are,has,have,from,that,this,who,can,all,any,per,into,years,year,work,team,role,ability,strong,plus,including,within,across,your,about,join,help,needs,using,used,use,etc,minimum,preferred,requirements,required,responsibilities,experience,knowledge,skills,benefits,etc,well,good,new,like,etc").split(","));
/* abbreviations and aliases that a naive substring match would miss */
const SKILL_ALIASES = {
  k8s: "kubernetes", golang: "go", js: "javascript", ts: "typescript", ml: "machine learning",
  ai: "artificial intelligence", ux: "user experience", ui: "user interface", db: "database",
  gcp: "google cloud", aws: "amazon web services", postgres: "postgresql", postgre: "postgresql",
  nodejs: "node.js", nextjs: "next.js", reactjs: "react", vuejs: "vue", sass: "scss",
  ci: "ci/cd", cd: "ci/cd", ios: "ios", android: "android", pm: "product management", qa: "quality assurance",
};
const REQ_HINTS = /requirement|qualification|must have|essential|responsibilit|you have|nice to have/;
/* light plural folding — plain words only, so "node.js" and "ci/cd" survive intact */
const stem = (w) => {
  if (!/^[a-z]{4,}$/.test(w) || /ss$/.test(w)) return w;
  if (/ies$/.test(w)) return w.slice(0, -3) + "y";
  if (/(sses|shes|ches)$/.test(w)) return w.slice(0, -2);
  if (/[^s]s$/.test(w) && w.length > 5) return w.slice(0, -1);
  return w;
};
const canon = (w) => SKILL_ALIASES[w] || stem(w);
function resumeCorpus() {
  const parts = [state.summary, state.skillsBrief, state.contact.title,
    ...state.skillGroups.map((g) => (g.label || "") + " " + (g.keywords || "")),
    ...state.experience.flatMap((j) => [j.title, j.company, ...(j.bullets || [])]),
    ...state.projects.flatMap((p) => [p.name, p.tech, ...(p.bullets || [])]),
    ...state.education.map((e) => [e.school, e.degree, e.field].join(" "))];
  return parts.join(" \n").toLowerCase();
}
/* weights: requirement-style lines count double, terms already in your own skill groups count more */
function jdWeights(jd) {
  const weights = {};
  const mine = new Set();
  state.skillGroups.forEach((g) => (g.keywords || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).forEach((k) => mine.add(k)));
  let section = "";
  String(jd || "").split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (t && t.length < 40 && /:$/.test(t)) { section = t.replace(/:$/, "").toLowerCase(); return; } // heading line
    const w = REQ_HINTS.test(section) ? 2.2 : 1;
    (t.toLowerCase().match(/[a-z][a-z0-9+#./-]{2,}/g) || []).forEach((raw) => {
      const clean = raw.replace(/^[./-]+|[./-]+$/g, "");
      if (clean.length < 3 || STOPWORDS.has(clean)) return;
      const k = canon(clean);
      if (STOPWORDS.has(k)) return;
      weights[k] = (weights[k] || 0) + w + (mine.has(clean) || mine.has(k) ? 1.5 : 0);
    });
  });
  return weights;
}
function topKeywords(weights, n) {
  return Object.entries(weights).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n || 30).map((e) => e[0]);
}
function extractJdKeywords(jd) { return topKeywords(jdWeights(jd), 30); }
function jdResult() {
  const jd = (state.jdText || "").trim();
  if (jd.length < 40) return null;
  const weights = jdWeights(jd);
  const kws = topKeywords(weights, 30);
  const corpus = resumeCorpus();
  const has = (k) => corpus.includes(k) || corpus.includes(stem(k)) ||
    Object.entries(SKILL_ALIASES).some(([a, b]) => (a === k ? corpus.includes(b) : b === k && corpus.includes(a)));
  const matched = kws.filter(has);
  const missing = kws.filter((k) => !has(k));
  const total = kws.reduce((a, k) => a + weights[k], 0) || 1;
  const got = matched.reduce((a, k) => a + weights[k], 0);
  return { score: Math.round((got / total) * 100), matched: matched.slice(0, 18), missing: missing.slice(0, 18), total: kws.length };
}
function jdResultsHtml() {
  const jd = jdResult();
  if (!jd) return `<p class="hint">Paste 40+ characters to see a keyword match score.</p>`;
  return `<div><span class="jd-score">Match: ${jd.score}%</span> <span class="hint">(${jd.matched.length}/${jd.total} top keywords found)</span></div>
    <div class="jd-pills">${jd.matched.map((k) => `<span class="hit">✓ ${esc(k)}</span>`).join("")}</div>
    ${jd.missing.length ? `<p class="hint">Missing — add them naturally if true:</p><div class="jd-pills">${jd.missing.map((k) => `<span class="miss">${esc(k)}</span>`).join("")}</div>`
      : `<p class="hint">No missing top keywords — strong coverage.</p>`}`;
}

/* ---------- import validation ---------- */
const RESUME_KEYS = ["contact", "experience", "summary", "skillGroups", "education", "projects", "certifications", "languages", "customSections", "sectionOrder", "settings"];
function validateResumeFile(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "Not a JSON object.";
  const data = obj.data && typeof obj.data === "object" && !Array.isArray(obj.data) ? obj.data : obj;
  if (!RESUME_KEYS.some((k) => k in data)) return "Missing resume fields (contact/experience/summary/skills).";
  if (data.contact !== undefined && (!data.contact || typeof data.contact !== "object" || Array.isArray(data.contact))) return "'contact' must be an object.";
  if (data.settings !== undefined && (!data.settings || typeof data.settings !== "object" || Array.isArray(data.settings))) return "'settings' must be an object.";
  for (const k of ["summary", "skillsBrief", "jdText"]) if (data[k] !== undefined && typeof data[k] !== "string") return `'${k}' must be a string.`;
  for (const k of [...LIST_KEYS, "sectionOrder"]) if (data[k] !== undefined && !Array.isArray(data[k])) return `'${k}' must be an array.`;
  return null;
}
function normalizeImport(obj) {
  const data = obj.data && typeof obj.data === "object" && !Array.isArray(obj.data) ? obj.data : obj;
  return migrate(Object.assign({}, data, { version: SCHEMA_VERSION }));
}

/* ---------- section helpers ---------- */
function allSections() {
  const customs = state.customSections.map((c) => ({ id: "custom_" + c.id, label: c.title || "Custom section" }));
  const fixed = SECTION_DEFS.map((d) => ({ ...d }));
  const order = state.sectionOrder.filter((id) => fixed.some((f) => f.id === id) || id.startsWith("custom_"));
  fixed.forEach((f) => { if (!order.includes(f.id)) order.push(f.id); });
  customs.forEach((c) => { if (!order.includes(c.id)) order.push(c.id); });
  return { order, fixed, customs };
}
function sectionVisible(id) {
  if (id.startsWith("custom_")) { const c = state.customSections.find((x) => "custom_" + x.id === id); return c ? !c.hidden : false; }
  return !!state.sectionsVisible[id];
}
function sectionBreak(id) {
  if (id.startsWith("custom_")) { const c = state.customSections.find((x) => "custom_" + x.id === id); return !!(c && c.breakBefore); }
  return !!state.sectionBreaks[id];
}
function customItems(c) { return ((c && c.items) || []).filter((it) => it && !it.hidden && String(it.text || "").trim()); }
function isSectionEmpty(id) {
  if (id === "summary") return !state.summary.trim();
  if (id === "skills") return !state.skillsBrief.trim() && !state.skillGroups.some((g) => (g.keywords || "").trim() || (g.label || "").trim());
  if (id === "experience") return !state.experience.filter((j) => !j.hidden).length;
  if (id === "education") return !state.education.filter((j) => !j.hidden).length;
  if (id === "projects") return !state.projects.filter((j) => !j.hidden).length;
  if (id === "certifications") return !state.certifications.length;
  if (id === "languages") return !state.languages.length;
  if (id.startsWith("custom_")) { const c = state.customSections.find((x) => "custom_" + x.id === id); return !c || !customItems(c).length; }
  return true;
}
function fmtDate(v) {
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  if (m) { const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return months[+m[2] - 1] + " " + m[1]; }
  return v;
}
function dateRange(s, e, cur) { return [fmtDate(s), cur ? "Present" : fmtDate(e)].filter(Boolean).join(" – "); }
function dateSpan(s, e) { return [fmtDate(s), fmtDate(e)].filter(Boolean).join(" – "); }
function redact(v, kind) {
  if (!state.settings.redactPII) return v;
  if (!v) return "";
  if (kind === "email") return "[email redacted]";
  if (kind === "phone") return "[phone redacted]";
  if (kind === "loc") return "[location redacted]";
  return v;
}

/* ================= EDITOR ================= */
function renderEditor() {
  const ed = $("#editor");
  if (!ed) return;
  const { order } = allSections();
  const visibleCount = order.filter(sectionVisible).length;

  ed.innerHTML = `
  <div class="card">
    <h2>Sections <span class="tag">${visibleCount}/${order.length} visible</span></h2>
    <p class="hint">Toggle any section on/off. Hidden sections never appear in preview or print. Arrows reorder.</p>
    ${order.map((id, i) => {
      const isCustom = id.startsWith("custom_");
      const name = isCustom ? esc((state.customSections.find((x) => "custom_" + x.id === id) || {}).title || "Custom") : esc((SECTION_DEFS.find((d) => d.id === id) || {}).label || id);
      const label = isCustom ? `${name} <span class="tag">custom</span>` : name;
      const on = sectionVisible(id);
      return `<div class="sec-row ${on ? "" : "off"}">
        <button type="button" data-act="sec-eye" data-id="${esc(id)}" class="eye" aria-pressed="${on ? "true" : "false"}" aria-label="Toggle ${isCustom ? "custom" : id} section">${on ? "👁 On" : "🚫 Off"}</button>
        <span class="grow">${label}</span>
        <span class="mini-btns">
          <button type="button" data-act="sec-up" data-id="${esc(id)}" ${i === 0 ? "disabled" : ""} aria-label="Move section up">↑</button>
          <button type="button" data-act="sec-down" data-id="${esc(id)}" ${i === order.length - 1 ? "disabled" : ""} aria-label="Move section down">↓</button>
          <button type="button" data-act="sec-break" data-id="${esc(id)}" title="Toggle page break before this section">${sectionBreak(id) ? "⤓ break ✓" : "⤓ break"}</button>
        </span></div>`;
    }).join("")}
    <div class="mini-btns" style="margin-top:6px">
      <button type="button" data-act="custom-add">+ Add custom section</button>
    </div>
  </div>

  <div class="card">
    <h2>Tailor to job posting <span class="tag">local only</span></h2>
    <p class="hint">Paste a job description. Requirement lines are weighted higher; nothing is uploaded.</p>
    <label for="jd-text">Job description<textarea id="jd-text" rows="5" placeholder="Paste the job ad here…">${esc(state.jdText)}</textarea></label>
    <div id="jd-results">${jdResultsHtml()}</div>
  </div>

  <div class="card">
    <h2>Contact / Header</h2>
    ${state.settings.redactPII ? `<p class="hint">Redact PII is ON — email/phone/location show as redacted in preview + exports.</p>` : ``}
    <label>Full name<input data-f="contact.fullName" value="${esc(state.contact.fullName)}" placeholder="Jordan Lee" /></label>
    <label>Job title<input data-f="contact.title" value="${esc(state.contact.title)}" placeholder="Product Designer" /></label>
    <div class="row2">
      <label>Email<input data-f="contact.email" value="${esc(state.contact.email)}" placeholder="you@mail.com" /></label>
      <label>Phone<input data-f="contact.phone" value="${esc(state.contact.phone)}" placeholder="+1 …" /></label>
    </div>
    <label>Location<input data-f="contact.location" value="${esc(state.contact.location)}" placeholder="City, ST" /></label>
    <div class="row3">
      <label>LinkedIn<input data-f="contact.linkedin" value="${esc(state.contact.linkedin)}" /></label>
      <label>GitHub<input data-f="contact.github" value="${esc(state.contact.github)}" /></label>
      <label>Portfolio<input data-f="contact.portfolio" value="${esc(state.contact.portfolio)}" /></label>
    </div>
  </div>

  <div class="card" ${sectionVisible("summary") ? "" : "hidden"}>
    <h2>Summary</h2>
    <label>Brief (2–3 lines)<textarea data-f="summary" placeholder="Years of experience, stack, 1–2 quantified wins…">${esc(state.summary)}</textarea></label>
    <div class="coach ${state.summary.trim().length > 40 ? "good" : ""}">${state.summary.trim().length < 40 ? "Tip: aim for 40–400 characters with 1–2 metrics." : `✓ ${state.summary.trim().length} characters.`}</div>
  </div>

  <div class="card" ${sectionVisible("experience") ? "" : "hidden"}>
    <h2>Work history <span class="mini-btns"><button type="button" data-act="job-add">+ Add job</button></span></h2>
    <p class="hint">Bullets: one per line. Use ⤓ to force a page break before a job when printing.</p>
    ${state.experience.map((j, i) => `
      <div class="item ${j.hidden ? "hidden-item" : ""}">
        <div class="item-head"><strong>${esc(j.title || "Untitled role")} @ ${esc(j.company || "Company")}</strong>
          <span class="mini-btns">
            <button type="button" data-act="job-up" data-i="${i}" aria-label="Move job up">↑</button>
            <button type="button" data-act="job-down" data-i="${i}" aria-label="Move job down">↓</button>
            <button type="button" data-act="job-dup" data-i="${i}">Duplicate</button>
            <button type="button" data-act="job-del" data-i="${i}">Delete</button>
          </span></div>
        <div class="row2">
          <label>Job title<input data-j="title" data-i="${i}" value="${esc(j.title)}" /></label>
          <label>Company<input data-j="company" data-i="${i}" value="${esc(j.company)}" /></label>
        </div>
        <div class="row3">
          <label>Start<input type="month" data-j="start" data-i="${i}" value="${esc(j.start)}" /></label>
          <label>End<input type="month" data-j="end" data-i="${i}" value="${esc(j.end)}" ${j.current ? "disabled" : ""} /></label>
          <label>Location<input data-j="location" data-i="${i}" value="${esc(j.location)}" /></label>
        </div>
        <label class="check"><input type="checkbox" data-jc="current" data-i="${i}" ${j.current ? "checked" : ""} /> Currently work here</label>
        <label>Achievements (one per line)<textarea data-jb="${i}" rows="4">${esc(j.bullets.join("\n"))}</textarea></label>
        ${coachForBullets(j.bullets)}
        <div class="mini-btns">
          <button type="button" data-act="job-break" data-i="${i}">${j.breakBefore ? "⤓ Page break before: ON" : "⤓ Page break before: off"}</button>
          <button type="button" data-act="job-hide" data-i="${i}">${j.hidden ? "👁 Unhide in output" : "🚫 Hide from output"}</button>
        </div>
      </div>`).join("") || `<p class="hint">No jobs yet — click + Add job, or Load example.</p>`}
  </div>

  <div class="card" ${sectionVisible("skills") ? "" : "hidden"}>
    <h2>Skills / Keywords <span class="mini-btns"><button type="button" data-act="skill-add">+ Add group</button></span></h2>
    <label>Brief / keyword line<textarea data-f="skillsBrief" placeholder="Keywords: React, TypeScript, CI/CD, …">${esc(state.skillsBrief)}</textarea></label>
    ${state.skillGroups.map((g, i) => `
      <div class="item"><div class="item-head"><strong>${esc(g.label || "Group")}</strong>
        <span class="mini-btns"><button type="button" data-act="skill-del" data-i="${i}">Delete</button></span></div>
        <label>Group label<input data-sg="label" data-i="${i}" value="${esc(g.label)}" placeholder="Languages" /></label>
        <label>Keywords (comma-separated)<input data-sg="keywords" data-i="${i}" value="${esc(g.keywords)}" placeholder="React, TypeScript, …" /></label>
      </div>`).join("")}
  </div>

  <div class="card" ${sectionVisible("education") ? "" : "hidden"}>
    <h2>Education <span class="mini-btns"><button type="button" data-act="edu-add">+ Add</button></span></h2>
    ${state.education.map((e, i) => `
      <div class="item ${e.hidden ? "hidden-item" : ""}"><div class="item-head"><strong>${esc(e.school || "School")}</strong>
        <span class="mini-btns"><button type="button" data-act="edu-del" data-i="${i}">Delete</button></span></div>
        <div class="row2"><label>School<input data-ed="school" data-i="${i}" value="${esc(e.school)}" /></label>
        <label>Degree<input data-ed="degree" data-i="${i}" value="${esc(e.degree)}" placeholder="B.S. …" /></label></div>
        <div class="row3"><label>Field<input data-ed="field" data-i="${i}" value="${esc(e.field)}" /></label>
        <label>Start<input data-ed="start" data-i="${i}" value="${esc(e.start)}" /></label>
        <label>End<input data-ed="end" data-i="${i}" value="${esc(e.end)}" /></label></div>
        <label>Details<input data-ed="details" data-i="${i}" value="${esc(e.details)}" /></label>
        <div class="mini-btns"><button type="button" data-act="edu-break" data-i="${i}">${e.breakBefore ? "⤓ Break before: ON" : "⤓ Break before: off"}</button>
        <button type="button" data-act="edu-hide" data-i="${i}">${e.hidden ? "👁 Unhide" : "🚫 Hide"}</button></div>
      </div>`).join("") || `<p class="hint">No education entries.</p>`}
  </div>

  <div class="card" ${sectionVisible("projects") ? "" : "hidden"}>
    <h2>Projects <span class="mini-btns"><button type="button" data-act="proj-add">+ Add</button></span></h2>
    ${state.projects.map((p, i) => `
      <div class="item ${p.hidden ? "hidden-item" : ""}"><div class="item-head"><strong>${esc(p.name || "Project")}</strong>
        <span class="mini-btns"><button type="button" data-act="proj-del" data-i="${i}">Delete</button></span></div>
        <div class="row2"><label>Name<input data-pr="name" data-i="${i}" value="${esc(p.name)}" /></label>
        <label>Link<input data-pr="link" data-i="${i}" value="${esc(p.link)}" /></label></div>
      <label>Tech<input data-pr="tech" data-i="${i}" value="${esc(p.tech)}" /></label>
      <label>Bullets (one per line)<textarea data-prb="${i}">${esc(p.bullets.join("\n"))}</textarea></label>
      ${coachForBullets(p.bullets)}
      <div class="mini-btns"><button type="button" data-act="proj-break" data-i="${i}">${p.breakBefore ? "⤓ Break before: ON" : "⤓ Break before: off"}</button>
      <button type="button" data-act="proj-hide" data-i="${i}">${p.hidden ? "👁 Unhide" : "🚫 Hide"}</button></div>
    </div>`).join("") || `<p class="hint">No projects.</p>`}
  </div>

  <div class="card" ${sectionVisible("certifications") ? "" : "hidden"}>
    <h2>Certifications <span class="mini-btns"><button type="button" data-act="cert-add">+ Add</button></span></h2>
    ${state.certifications.map((c, i) => `<div class="item"><div class="row3">
      <label>Name<input data-ce="name" data-i="${i}" value="${esc(c.name)}" /></label>
      <label>Issuer<input data-ce="issuer" data-i="${i}" value="${esc(c.issuer)}" /></label>
      <label>Year<input data-ce="year" data-i="${i}" value="${esc(c.year)}" /></label></div>
      <div class="mini-btns"><button type="button" data-act="cert-del" data-i="${i}">Delete</button></div></div>`).join("") || `<p class="hint">None.</p>`}
  </div>

  <div class="card" ${sectionVisible("languages") ? "" : "hidden"}>
    <h2>Languages <span class="mini-btns"><button type="button" data-act="lang-add">+ Add</button></span></h2>
    ${state.languages.map((l, i) => `<div class="item"><div class="row2">
      <label>Language<input data-la="lang" data-i="${i}" value="${esc(l.lang)}" /></label>
      <label>Level<input data-la="level" data-i="${i}" value="${esc(l.level)}" /></label></div>
      <div class="mini-btns"><button type="button" data-act="lang-del" data-i="${i}">Delete</button></div></div>`).join("") || `<p class="hint">None.</p>`}
  </div>

  ${state.customSections.map((c, i) => `
  <div class="card"><h2>Custom: ${esc(c.title || "Untitled")} <span class="mini-btns"><button type="button" data-act="custom-del" data-i="${i}">Delete section</button></span></h2>
    <label>Section title<input data-cu="title" data-i="${i}" value="${esc(c.title)}" placeholder="Volunteering" /></label>
    <label>Layout<select data-cu="layout" data-i="${i}"><option value="bullets" ${c.layout !== "text" ? "selected" : ""}>Bulleted list</option><option value="text" ${c.layout === "text" ? "selected" : ""}>Paragraphs</option></select></label>
    <label>Items (one per line)<textarea data-cui="${i}" rows="4">${esc(c.items.map((it) => it.text).join("\n"))}</textarea></label>
    ${c.items.map((it, k) => `<div class="subitem ${it.hidden ? "hidden-item" : ""}"><span class="grow">${esc(it.text || "(empty line)")}</span>
      <span class="mini-btns">
        <button type="button" data-act="custom-item-toggle" data-i="${i}" data-k="${k}">${it.hidden ? "👁 Show" : "🚫 Hide"}</button>
        <button type="button" data-act="custom-item-del" data-i="${i}" data-k="${k}">Delete</button>
      </span></div>`).join("")}
    <div class="mini-btns">
      <button type="button" data-act="custom-break" data-i="${i}">${c.breakBefore ? "⤓ Break before: ON" : "⤓ Break before: off"}</button>
      <button type="button" data-act="custom-hide" data-i="${i}">${c.hidden ? "👁 Unhide" : "🚫 Hide from output"}</button>
    </div>
  </div>`).join("")}

  <div class="card">
    <h2>Privacy</h2>
    <p class="hint">All data stays in this browser (<code>localStorage</code>). JSON/HTML/PDF/TXT exports are files you control — nothing is uploaded to any server.</p>
    <p class="hint">Redaction applies to the preview, <code>.html</code>, <code>.txt</code> and Quick PDF. <strong>Save .json</strong> and the JSON view always contain your real contact details — check before sharing.</p>
    <div class="mini-btns">
      <button type="button" data-act="privacy-redact">${state.settings.redactPII ? "Show PII" : "Redact PII for sharing"}</button>
      <button type="button" data-act="privacy-erase">Erase ALL local data</button>
    </div>
  </div>
  `;
  const jdEl = $("#jd-text");
  if (jdEl) jdEl.addEventListener("input", (e) => { state.jdText = e.target.value; persist(); renderPreview(); debounceJd(); });
  syncPreviewControls();
  syncHistButtons();
}
let jdTimer = null;
function debounceJd() { clearTimeout(jdTimer); jdTimer = setTimeout(updateJdResults, 700); }
function updateJdResults() { const el = $("#jd-results"); if (el) el.innerHTML = jdResultsHtml(); }

/* ---------- editor events (delegated) ---------- */
function bindEditor() {
  const ed = $("#editor");
  if (!ed) return;
  ed.addEventListener("focusin", () => { pendingPreEdit = JSON.stringify(state); });
  ed.addEventListener("input", (e) => {
    const t = e.target;
    const i = +(t.dataset.i ?? -1);
    recordEditSnapshot(); // every editable field is undoable
    if (t.id === "jd-text") { state.jdText = t.value; persist(); renderPreview(); debounceJd(); return; }
    if (t.dataset.f) {
      const parts = t.dataset.f.split(".");
      if (parts.length === 2) state[parts[0]][parts[1]] = t.value;
      else state[parts[0]] = t.value;
      persist(); renderPreview(); return;
    }
    if (t.hasAttribute("data-j")) { state.experience[i][t.dataset.j] = t.value; persist(); renderPreview(); }
    else if (t.hasAttribute("data-jb")) { state.experience[i].bullets = splitLines(t.value); persist(); renderPreview(); }
    else if (t.dataset.sg) { state.skillGroups[i][t.dataset.sg] = t.value; persist(); renderPreview(); }
    else if (t.dataset.ed) { state.education[i][t.dataset.ed] = t.value; persist(); renderPreview(); }
    else if (t.dataset.pr) { state.projects[i][t.dataset.pr] = t.value; persist(); renderPreview(); }
    else if (t.hasAttribute("data-prb")) { state.projects[i].bullets = splitLines(t.value); persist(); renderPreview(); }
    else if (t.dataset.ce) { state.certifications[i][t.dataset.ce] = t.value; persist(); renderPreview(); }
    else if (t.dataset.la) { state.languages[i][t.dataset.la] = t.value; persist(); renderPreview(); }
    else if (t.dataset.cu) { state.customSections[i][t.dataset.cu] = t.value; persist(); renderPreview(); }
    else if (t.hasAttribute("data-cui")) { setCustomItems(state.customSections[i], t.value); persist(); renderPreview(); }
  });
  ed.addEventListener("change", (e) => {
    const t = e.target;
    const i = +(t.dataset.i ?? -1);
    if (t.dataset.jc === "current") { pushHistory(); state.experience[i].current = t.checked; if (t.checked) state.experience[i].end = ""; persist(); renderEditor(); renderPreview(); }
    // re-render on blur so per-item rows catch up with the textarea (focus is leaving anyway)
    else if (t.hasAttribute("data-cui")) { setCustomItems(state.customSections[i], t.value); persist(); renderEditor(); renderPreview(); }
  });
  ed.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const act = b.dataset.act; const i = +(b.dataset.i ?? -1); const k = +(b.dataset.k ?? -1); const id = b.dataset.id;
    if (act !== "privacy-erase") pushHistory(); // cancel-able confirm must not consume history
    const R = () => { persist(); renderEditor(); renderPreview(); };
    if (act === "sec-eye") {
      if (id.startsWith("custom_")) { const c = state.customSections.find((x) => "custom_" + x.id === id); if (c) c.hidden = !c.hidden; }
      else state.sectionsVisible[id] = !state.sectionsVisible[id];
      R();
    } else if (act === "sec-up" || act === "sec-down") {
      const o = state.sectionOrder; const p = o.indexOf(id); const j = act === "sec-up" ? p - 1 : p + 1;
      if (p > -1 && j >= 0 && j < o.length) { [o[p], o[j]] = [o[j], o[p]]; } R();
    } else if (act === "sec-break") {
      if (id.startsWith("custom_")) { const c = state.customSections.find((x) => "custom_" + x.id === id); if (c) c.breakBefore = !c.breakBefore; }
      else state.sectionBreaks[id] = !state.sectionBreaks[id];
      R(); toast(sectionBreak(id) ? "Page break ON before section" : "Page break OFF");
    } else if (act === "job-add") { state.experience.unshift({ id: uid(), company: "", location: "", title: "", start: "", end: "", current: false, bullets: [""], breakBefore: false, hidden: false }); R(); }
    else if (act === "job-del") { state.experience.splice(i, 1); R(); }
    else if (act === "job-dup") { const c = clone(state.experience[i]); c.id = uid(); state.experience.splice(i + 1, 0, c); R(); }
    else if (act === "job-up" || act === "job-down") { const a = state.experience; const j = act === "job-up" ? i - 1 : i + 1; if (j >= 0 && j < a.length) { [a[i], a[j]] = [a[j], a[i]]; } R(); }
    else if (act === "job-break") { state.experience[i].breakBefore = !state.experience[i].breakBefore; R(); }
    else if (act === "job-hide") { state.experience[i].hidden = !state.experience[i].hidden; R(); }
    else if (act === "skill-add") { state.skillGroups.push({ id: uid(), label: "", keywords: "" }); R(); }
    else if (act === "skill-del") { state.skillGroups.splice(i, 1); R(); }
    else if (act === "edu-add") { state.education.push({ id: uid(), school: "", degree: "", field: "", start: "", end: "", details: "", breakBefore: false, hidden: false }); R(); }
    else if (act === "edu-del") { state.education.splice(i, 1); R(); }
    else if (act === "edu-break") { state.education[i].breakBefore = !state.education[i].breakBefore; R(); }
    else if (act === "edu-hide") { state.education[i].hidden = !state.education[i].hidden; R(); }
    else if (act === "proj-add") { state.projects.push({ id: uid(), name: "", link: "", tech: "", bullets: [""], breakBefore: false, hidden: false }); R(); }
    else if (act === "proj-del") { state.projects.splice(i, 1); R(); }
    else if (act === "proj-break") { state.projects[i].breakBefore = !state.projects[i].breakBefore; R(); }
    else if (act === "proj-hide") { state.projects[i].hidden = !state.projects[i].hidden; R(); }
    else if (act === "cert-add") { state.certifications.push({ id: uid(), name: "", issuer: "", year: "" }); R(); }
    else if (act === "cert-del") { state.certifications.splice(i, 1); R(); }
    else if (act === "lang-add") { state.languages.push({ id: uid(), lang: "", level: "" }); R(); }
    else if (act === "lang-del") { state.languages.splice(i, 1); R(); }
    else if (act === "custom-add") { const c = { id: uid(), title: "Custom section", layout: "bullets", items: [], breakBefore: false, hidden: false }; state.customSections.push(c); state.sectionOrder.push("custom_" + c.id); R(); }
    else if (act === "custom-del") { const [c] = state.customSections.splice(i, 1); state.sectionOrder = state.sectionOrder.filter((x) => x !== "custom_" + (c && c.id)); R(); }
    else if (act === "custom-break") { state.customSections[i].breakBefore = !state.customSections[i].breakBefore; R(); }
    else if (act === "custom-hide") { state.customSections[i].hidden = !state.customSections[i].hidden; R(); }
    else if (act === "custom-item-toggle") { const it = (state.customSections[i].items || [])[k]; if (it) it.hidden = !it.hidden; R(); }
    else if (act === "custom-item-del") { const c = state.customSections[i]; if (c && c.items[k]) c.items.splice(k, 1); R(); }
    else if (act === "privacy-redact") { state.settings.redactPII = !state.settings.redactPII; R(); toast(state.settings.redactPII ? "PII redacted in outputs" : "PII visible"); }
    else if (act === "privacy-erase") {
      if (!confirm("Erase ALL local data? This cannot be undone.")) return;
      try { localStorage.removeItem(LS_KEY); localStorage.removeItem(BACKUP_KEY); } catch {}
      purgeLegacyProfiles();
      location.reload();
    }
  });
}
function splitLines(v) { return String(v).split("\n").map((s) => s.trim()).filter(Boolean); }
function setCustomItems(c, value) {
  if (!c) return;
  const prev = c.items || [];
  c.items = String(value).split("\n").map((line, k) => ({ id: (prev[k] && prev[k].id) || uid(), text: line.trim(), hidden: !!(prev[k] && prev[k].hidden) }));
}

/* ================= TEMPLATES ================= */
function contactLine(c) {
  const parts = [redact(c.email, "email"), redact(c.phone, "phone"), redact(c.location, "loc"), c.linkedin, c.github, c.portfolio].filter(Boolean).map(esc);
  return parts.join(" &nbsp;•&nbsp; ");
}
function breakHtml() { return `<div class="pb-indicator"></div>`; }

function secSummary() {
  if (!sectionVisible("summary") || isSectionEmpty("summary")) return "";
  return `${sectionBreak("summary") ? breakHtml() : ""}<div class="r-sec"><h2 class="r-sec-title">Summary</h2><div class="preserve">${esc(state.summary)}</div></div>`;
}
function secExperience() {
  const jobs = state.experience.filter((j) => !j.hidden);
  if (!sectionVisible("experience") || !jobs.length) return "";
  return `${sectionBreak("experience") ? breakHtml() : ""}<div class="r-sec"><h2 class="r-sec-title">Experience</h2>${jobs.map((j) => `
    ${j.breakBefore ? breakHtml() : ""}
    <div class="r-job"><div class="r-job-head"><span>${esc(j.title || "Role")} — ${esc(j.company)}</span><span>${esc(dateRange(j.start, j.end, j.current))}</span></div>
    ${j.location ? `<div class="r-job-sub"><span>${esc(j.location)}</span></div>` : ""}
    <ul class="r-list">${j.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>`).join("")}</div>`;
}
function secSkills(pills) {
  if (!sectionVisible("skills") || isSectionEmpty("skills")) return "";
  const groups = state.skillGroups.filter((g) => g.label || g.keywords);
  const kw = groups.map((g) => `<div class="skill-group"><strong>${esc(g.label)}:</strong> ${esc(g.keywords)}</div>`).join("");
  const brief = state.skillsBrief.trim() ? `<div class="preserve">${esc(state.skillsBrief)}</div>` : "";
  const pillHtml = pills ? `<div class="pills">${groups.flatMap((g) => (g.keywords || "").split(",").map((s) => s.trim()).filter(Boolean)).slice(0, 30).map((k) => `<span>${esc(k)}</span>`).join("")}</div>` : "";
  return `${sectionBreak("skills") ? breakHtml() : ""}<div class="r-sec"><h2 class="r-sec-title">Skills</h2>${brief}${kw}${pillHtml}</div>`;
}
function secEducation() {
  const rows = state.education.filter((e) => !e.hidden);
  if (!sectionVisible("education") || !rows.length) return "";
  return `${sectionBreak("education") ? breakHtml() : ""}<div class="r-sec"><h2 class="r-sec-title">Education</h2>${rows.map((e) => `
    ${e.breakBefore ? breakHtml() : ""}<div class="r-job"><div class="r-job-head"><span>${esc(e.school)}</span><span>${esc(dateSpan(e.start, e.end))}</span></div>
    <div class="r-job-sub"><span>${esc([e.degree, e.field].filter(Boolean).join(", "))}</span></div>
    ${e.details ? `<div class="preserve">${esc(e.details)}</div>` : ""}</div>`).join("")}</div>`;
}
function secProjects() {
  const rows = state.projects.filter((p) => !p.hidden);
  if (!sectionVisible("projects") || !rows.length) return "";
  return `${sectionBreak("projects") ? breakHtml() : ""}<div class="r-sec"><h2 class="r-sec-title">Projects</h2>${rows.map((p) => `
    ${p.breakBefore ? breakHtml() : ""}<div class="r-job"><div class="r-job-head"><span>${esc(p.name)}${p.link ? ` — ${esc(p.link)}` : ""}</span></div>
    ${p.tech ? `<div class="r-job-sub"><span>${esc(p.tech)}</span></div>` : ""}
    <ul class="r-list">${p.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>`).join("")}</div>`;
}
function secCerts() {
  if (!sectionVisible("certifications") || !state.certifications.length) return "";
  return `${sectionBreak("certifications") ? breakHtml() : ""}<div class="r-sec"><h2 class="r-sec-title">Certifications</h2><ul class="r-list">${state.certifications.map((c) => `<li><strong>${esc(c.name)}</strong>${c.issuer ? ` — ${esc(c.issuer)}` : ""}${c.year ? ` (${esc(c.year)})` : ""}</li>`).join("")}</ul></div>`;
}
function secLangs() {
  if (!sectionVisible("languages") || !state.languages.length) return "";
  return `${sectionBreak("languages") ? breakHtml() : ""}<div class="r-sec"><h2 class="r-sec-title">Languages</h2><div>${state.languages.map((l) => esc(l.lang + (l.level ? ` (${l.level})` : ""))).join(" &nbsp;•&nbsp; ")}</div></div>`;
}
function secCustom(id) {
  const c = state.customSections.find((x) => "custom_" + x.id === id);
  const items = customItems(c);
  if (!c || c.hidden || !items.length) return "";
  const body = c.layout === "text"
    ? items.map((it) => `<div class="preserve">${esc(it.text)}</div>`).join("")
    : `<ul class="r-list">${items.map((it) => `<li>${esc(it.text)}</li>`).join("")}</ul>`;
  return `${c.breakBefore ? breakHtml() : ""}<div class="r-sec"><h2 class="r-sec-title">${esc(c.title || "Additional")}</h2>${body}</div>`;
}
function sectionHtml(id, pills) {
  if (id === "summary") return secSummary();
  if (id === "experience") return secExperience();
  if (id === "skills") return secSkills(pills);
  if (id === "education") return secEducation();
  if (id === "projects") return secProjects();
  if (id === "certifications") return secCerts();
  if (id === "languages") return secLangs();
  if (id.startsWith("custom_")) return secCustom(id);
  return "";
}

/* ---- preview ---- */
function buildSheetHtml() {
  const tpl = state.settings.templateId || "ats";
  const c = state.contact;
  const title = c.title ? `<div class="r-title">${esc(c.title)}</div>` : "";
  const cline = contactLine(c);
  const { order } = allSections();
  const sideIds = ["skills", "certifications", "languages"];
  const head = `<div class="r-head"><h1 class="r-name">${esc(c.fullName || "Your Name")}</h1>${title}${cline ? `<div class="r-contact">${cline}</div>` : ""}</div>`;
  let body;
  if (tpl === "sidebar") {
    const side = order.filter((id) => sideIds.includes(id)).map((id) => sectionHtml(id, false)).join("");
    const main = order.filter((id) => !sideIds.includes(id)).map((id) => sectionHtml(id, false)).join("");
    body = `${head}<div class="r-cols"><div class="r-side">${side || `<p class="hint no-print">Enable Skills / Certs / Languages to fill the sidebar.</p>`}</div><div>${main}</div></div>`;
  } else {
    body = `${head}${order.map((id) => sectionHtml(id, tpl === "modern")).join("")}`;
  }
  if (!order.some((id) => sectionVisible(id) && !isSectionEmpty(id))) body += `<p class="hint no-print">Nothing visible yet — enable a section or load the example.</p>`;
  const footer = state.settings.showPageNumbers ? `<div class="page-footer"><span>${esc(c.fullName)} — Resume</span><span>${esc(c.title)}</span></div>` : "";
  return body + footer;
}
let previewQueued = false;
function renderPreview() { // coalesced: at most one paint per animation frame
  if (previewQueued) return;
  previewQueued = true;
  requestAnimationFrame(() => { previewQueued = false; paintPreview(); });
}
function paintPreview() {
  const sheet = $("#sheet");
  if (!sheet) return;
  sheet.className = `sheet tpl-${state.settings.templateId} fs-${state.settings.fontSize} mg-${state.settings.margins}`;
  sheet.style.setProperty("--accent", state.settings.accent);
  sheet.innerHTML = buildSheetHtml();
  syncPreviewControls();
  syncJsonView();
  updatePageEstimate();
}

/* ---- page overflow guard ---- */
function updatePageEstimate() {
  const sheet = $("#sheet"), el = $("#page-est");
  if (!sheet || !el || !sheet.clientWidth) return; // hidden (JSON view) → no meaningless numbers
  if (sheet.clientWidth < 620) { el.textContent = "Est. n/a on a narrow screen — print for real page count"; el.className = ""; return; }
  const pages = sheet.scrollHeight / ((sheet.clientWidth * 297) / 210);
  const manual = (sheet.innerHTML.match(/pb-indicator/g) || []).length;
  let msg = `Est. ${pages.toFixed(1)} pages (${manual} manual break${manual === 1 ? "" : "s"})`;
  if (pages > 2.05) msg += " — over 2 pages: trim or add a break";
  else if (pages > 1.05 && pages < 1.25) msg += " — awkward 1.2 pages: trim a little or force 2 clean pages";
  el.textContent = msg;
  el.className = pages > 2.05 ? "over" : pages > 1.05 && pages < 1.25 ? "warn" : "";
}

/* ================= PLAIN TEXT (ATS .txt) ================= */
function resumeToText() {
  const L = [];
  const c = state.contact;
  L.push(c.fullName || "Your Name");
  if (c.title) L.push(c.title);
  L.push([redact(c.email, "email"), redact(c.phone, "phone"), redact(c.location, "loc"), c.linkedin, c.github, c.portfolio].filter(Boolean).join(" | "));
  L.push("");
  const { order } = allSections();
  const bullets = (arr) => arr.forEach((b) => L.push("- " + b));
  order.forEach((id) => {
    if (!sectionVisible(id) || isSectionEmpty(id)) return;
    if (id === "summary") { L.push("SUMMARY"); L.push(state.summary.trim()); L.push(""); }
    else if (id === "experience") {
      L.push("EXPERIENCE");
      state.experience.filter((j) => !j.hidden).forEach((j) => {
        L.push(`${j.title || "Role"} — ${j.company} (${dateRange(j.start, j.end, j.current)})`);
        if (j.location) L.push(j.location);
        bullets(j.bullets); L.push("");
      });
    } else if (id === "skills") {
      L.push("SKILLS");
      if (state.skillsBrief.trim()) L.push(state.skillsBrief.trim());
      state.skillGroups.forEach((g) => { if (g.label || g.keywords) L.push(`${g.label}: ${g.keywords}`.trim()); });
      L.push("");
    } else if (id === "education") {
      L.push("EDUCATION");
      state.education.filter((e) => !e.hidden).forEach((e) => {
        L.push([e.school, [e.degree, e.field].filter(Boolean).join(", "), dateSpan(e.start, e.end) && `(${dateSpan(e.start, e.end)})`].filter(Boolean).join(" — "));
        if (e.details) L.push(e.details);
      });
      L.push("");
    } else if (id === "projects") {
      L.push("PROJECTS");
      state.projects.filter((p) => !p.hidden).forEach((p) => {
        L.push(`${p.name}${p.link ? " — " + p.link : ""}${p.tech ? " [" + p.tech + "]" : ""}`);
        bullets(p.bullets);
      });
      L.push("");
    } else if (id === "certifications") { L.push("CERTIFICATIONS"); state.certifications.forEach((x) => L.push(`- ${x.name}${x.issuer ? " — " + x.issuer : ""}${x.year ? " (" + x.year + ")" : ""}`)); L.push(""); }
    else if (id === "languages") { L.push("LANGUAGES"); L.push(state.languages.map((l) => l.lang + (l.level ? ` (${l.level})` : "")).join(", ")); L.push(""); }
    else if (id.startsWith("custom_")) {
      const cu = state.customSections.find((x) => "custom_" + x.id === id);
      const items = customItems(cu);
      if (cu && items.length) { L.push((cu.title || "Additional").toUpperCase()); cu.layout === "text" ? items.forEach((it) => L.push(it.text)) : bullets(items.map((it) => it.text)); L.push(""); }
    }
  });
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function syncPreviewControls() {
  $$(".tpl-btn").forEach((b) => b.classList.toggle("active", b.dataset.tpl === state.settings.templateId));
  const fs = $("#set-fontsize"); if (fs) fs.value = state.settings.fontSize;
  const mg = $("#set-margins"); if (mg) mg.value = state.settings.margins;
  const ac = $("#set-accent"); if (ac) ac.value = state.settings.accent;
  const pn = $("#set-pagenum"); if (pn) pn.checked = state.settings.showPageNumbers;
  const rd = $("#set-redact"); if (rd) rd.checked = state.settings.redactPII;
  const eb = $("#example-banner"); if (eb) eb.hidden = !state.isExample;
  const ub = $("#btn-undo"); if (ub) ub.disabled = !hasBackup();
  syncHistButtons();
}

/* ================= TOOLBAR / IO ================= */
function toast(msg, ms) {
  const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), ms || 2400);
}
function download(filename, text, type) {
  const blob = new Blob([text], { type: type || "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function exportFilename(ext) {
  const n = str(state.contact.fullName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resume";
  return `${n}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}
function doExportJSON() {
  persist(true);
  download(exportFilename("json"), JSON.stringify(currentEnvelope(), null, 2));
  toast("Saved .json file");
}

/* ================= JSON VIEW (Resume | JSON) ================= */
let activeView = "resume";
let jsonRendered = "";   // exact text last written into the textarea
let jsonStale = false;
function currentEnvelope() { return { version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: state }; }
function setJsonStale(on) {
  const el = $("#json-stale");
  jsonStale = on;
  if (el) el.hidden = !on;
}
function refreshJsonView() {
  const ta = $("#json-view-text"); if (!ta) return;
  ta.value = JSON.stringify(currentEnvelope(), null, 2);
  jsonRendered = ta.value;
  setJsonStale(false);
  const err = $("#json-view-error"); if (err) { err.hidden = true; err.textContent = ""; }
}
function syncJsonView() {
  if (activeView !== "json") return;
  const ta = $("#json-view-text"); if (!ta) return;
  if (ta.value === jsonRendered) refreshJsonView(); // untouched → keep the snapshot live
  else setJsonStale(true);                           // hand-edited → don't throw it away silently
}
function setView(v) {
  activeView = v;
  $$(".view-btn").forEach((b) => { const on = b.dataset.view === v; b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on)); });
  const sheet = $("#sheet"), jv = $("#json-view");
  if (sheet) sheet.hidden = v !== "resume";
  if (jv) jv.hidden = v !== "json";
  if (v === "json") refreshJsonView();
  else { setJsonStale(false); renderPreview(); }
}
function showResumeView() { if (activeView !== "resume") setView("resume"); }
function showJsonError(msg) { const el = $("#json-view-error"); if (!el) return; el.textContent = msg; el.hidden = false; }
function applyJsonView() {
  const ta = $("#json-view-text"); if (!ta) return;
  if (jsonStale && !confirm("The resume changed since this JSON was loaded.\n\nApplying will discard those newer changes (Undo can bring them back). Continue?")) return;
  let obj;
  try { obj = JSON.parse(ta.value); }
  catch (e) { showJsonError("Invalid JSON: " + e.message); return; }
  const err = validateResumeFile(obj);
  if (err) { showJsonError("Invalid resume JSON: " + err); return; }
  pushHistory(); backupCurrent();
  state = normalizeImport(obj);
  refreshJsonView();
  persist(true); renderEditor(); renderPreview();
  toast("JSON applied (Ctrl+Z to undo)");
}
function bindJsonView() {
  $$(".view-btn").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  const ap = $("#json-view-apply"); if (ap) ap.addEventListener("click", applyJsonView);
  const rs = $("#json-view-reset"); if (rs) rs.addEventListener("click", () => { refreshJsonView(); toast("JSON reset to current state"); });
  const cp = $("#json-view-copy"); if (cp) cp.addEventListener("click", () => {
    const ta = $("#json-view-text"); if (!ta) return;
    (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => toast("JSON copied"), () => { ta.focus(); ta.select(); toast("Press Ctrl+C to copy"); });
  });
  const ta = $("#json-view-text");
  if (ta) ta.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); applyJsonView(); } });
}

function requestReplace(newState, label) {
  const jobs = (newState.experience || []).length;
  const ok = confirm(`${label}\n\nThis REPLACES the current resume (no merge).\nIncoming: ${newState.contact?.fullName || "Untitled"} — ${jobs} job(s).\n\nA backup is kept for Undo. Continue?`);
  if (!ok) return;
  pushHistory(); backupCurrent();
  state = normalizeImport(newState);
  persist(true); renderEditor(); renderPreview();
  toast("Replaced resume (Undo available)");
}
function doImportFile(file) {
  if (!file) return;
  if (file.size > 1024 * 1024) { toast("File too large (>1MB)"); return; }
  const r = new FileReader();
  r.onload = () => {
    try {
      const obj = JSON.parse(r.result);
      const err = validateResumeFile(obj);
      if (err) { toast("Invalid resume file: " + err, 3500); return; }
      requestReplace(obj, "Open JSON file?");
    } catch { toast("Could not parse JSON file", 3000); }
  };
  r.readAsText(file);
}
function standaloneHtml() {
  showResumeView();
  paintPreview();
  const node = $("#sheet").cloneNode(true);
  node.removeAttribute("hidden");
  const accent = esc(state.settings.accent);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Resume — ${esc(state.contact.fullName || "resume")}</title>
<style>
@page{size:A4;margin:12mm}
body{font-family:"Segoe UI",system-ui,Arial,sans-serif;margin:0;background:#fff;color:#111}
.no-print{display:none!important}
.sheet{max-width:210mm;margin:0 auto;padding:14mm;font-size:12pt;line-height:1.45}
.r-name{margin:0;font-size:24pt;line-height:1.1}
.r-title{color:${accent};font-weight:600;margin:2px 0 6px;font-size:12.5pt}
.r-contact{font-size:9.5pt;color:#334155;margin-bottom:10px}
.r-sec{margin-top:12pt;break-inside:avoid}
.r-sec-title{font-size:11pt;text-transform:uppercase;letter-spacing:.08em;border-bottom:2px solid ${accent};padding-bottom:2px;margin:0 0 6px}
.r-job{margin-bottom:9pt;break-inside:avoid}
.r-job-head{display:flex;justify-content:space-between;gap:8px;font-weight:700}
.r-job-sub{font-style:italic;color:#334155;font-size:9.8pt}
.r-list{margin:4px 0 0 18px;padding:0}.r-list li{margin:2px 0}
.pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.pills span{border:1px solid #c7d2fe;background:#eef2ff;border-radius:20px;padding:1px 9px;font-size:9.5pt}
.skill-group{margin-bottom:6pt}.skill-group strong{font-size:10pt}
.preserve{white-space:pre-line}
.page-footer{margin-top:12pt;font-size:8.5pt;color:#64748b;display:flex;justify-content:space-between}
.tpl-modern .r-head{background:${accent};color:#fff;margin:-14mm -14mm 10px;padding:18px 14mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tpl-modern .r-title,.tpl-modern .r-contact{color:#fff}
.tpl-sidebar .r-cols{display:grid;grid-template-columns:62mm 1fr;gap:8mm}
.tpl-sidebar .r-side{background:#f1f5f9;margin:-14mm 0 -14mm -14mm;padding:14mm 6mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tpl-sidebar .r-side .r-sec-title{border-color:#0f172a}
.tpl-sidebar .r-name{font-size:20pt}
.pb-indicator{break-before:page;height:0;border-top:2px dashed #ef4444}
</style></head><body>${node.outerHTML}<script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`;
}
function ensureHtml2Pdf() {
  if (window.html2pdf) return Promise.resolve();
  toast("Loading PDF engine…");
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.crossOrigin = "anonymous";
    s.referrerPolicy = "no-referrer";
    s.integrity = "sha384-Yv5O+t3uE3hunW8uyrbpPW3iw6/5/Y7HitWJBLgqfMoA36NogMmy+8wWZMpn3HWc";
    s.onload = resolve; s.onerror = () => reject(new Error("cdn"));
    document.head.appendChild(s);
  });
}
function doQuickPdf() {
  showResumeView();
  paintPreview();
  ensureHtml2Pdf().then(() => {
    toast("Generating PDF… (beta: rasterized — use Print/PDF for selectable text)");
    const opt = { margin: 0, filename: exportFilename("pdf"), image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } };
    try { window.html2pdf().set(opt).from($("#sheet")).save().catch(() => toast("PDF failed — use Print / PDF instead", 3000)); }
    catch { toast("PDF failed — use Print / PDF instead", 3000); }
  }).catch(() => toast("PDF engine needs network — use Print / PDF instead", 3500));
}

function bindToolbar() {
  $$(".tpl-btn").forEach((b) => b.addEventListener("click", () => { pushHistory(); state.settings.templateId = b.dataset.tpl; persist(); renderPreview(); }));
  const fz = $("#set-fontsize"); if (fz) fz.addEventListener("change", (e) => { pushHistory(); state.settings.fontSize = e.target.value; persist(); renderPreview(); });
  const mg = $("#set-margins"); if (mg) mg.addEventListener("change", (e) => { pushHistory(); state.settings.margins = e.target.value; persist(); renderPreview(); });
  const ac = $("#set-accent");
  if (ac) {
    let accentSnapshotted = false;
    // a colour-picker drag fires input dozens of times: one undo step per drag, not per pixel
    ac.addEventListener("input", (e) => {
      if (!accentSnapshotted) { pushHistory(); accentSnapshotted = true; }
      state.settings.accent = e.target.value; persist(); renderPreview();
    });
    ac.addEventListener("change", () => { accentSnapshotted = false; });
  }
  const pn = $("#set-pagenum"); if (pn) pn.addEventListener("change", (e) => { pushHistory(); state.settings.showPageNumbers = e.target.checked; persist(); renderPreview(); });
  const rd = $("#set-redact"); if (rd) rd.addEventListener("change", (e) => { pushHistory(); state.settings.redactPII = e.target.checked; persist(); renderEditor(); renderPreview(); });
  const bp = $("#btn-print"); if (bp) bp.addEventListener("click", () => { persist(true); showResumeView(); paintPreview(); window.print(); });
  const be = $("#btn-export-json"); if (be) be.addEventListener("click", doExportJSON);
  const bh = $("#btn-export-html"); if (bh) bh.addEventListener("click", () => { download(exportFilename("html"), standaloneHtml(), "text/html"); toast("Exported printable .html"); });
  const bt = $("#btn-export-txt"); if (bt) bt.addEventListener("click", () => { download(exportFilename("txt"), resumeToText(), "text/plain"); toast("Exported plain-text .txt"); });
  const bq = $("#btn-quick-pdf"); if (bq) bq.addEventListener("click", doQuickPdf);
  const bn = $("#btn-new"); if (bn) bn.addEventListener("click", () => {
    if (!confirm("Clear the resume? (backup kept for Undo)")) return;
    pushHistory(); backupCurrent(); state = defaultState(); persist(true); renderEditor(); renderPreview(); toast("Cleared — Undo available");
  });
  const bx = $("#btn-example"); if (bx) bx.addEventListener("click", () => requestReplace(sampleState(), "Load example resume?"));
  const bu = $("#btn-undo"); if (bu) bu.addEventListener("click", () => {
    try { const raw = localStorage.getItem(BACKUP_KEY); if (!raw) return toast("No backup"); pushHistory(); state = migrate(JSON.parse(raw)); persist(true); renderEditor(); renderPreview(); toast("Restored backup"); }
    catch { toast("Restore failed"); }
  });
  const hu = $("#btn-hist-undo"); if (hu) hu.addEventListener("click", undoHistory);
  const hr = $("#btn-hist-redo"); if (hr) hr.addEventListener("click", redoHistory);
  const bi = $("#btn-import-json"); if (bi) bi.addEventListener("click", () => $("#file-input").click());
  const fi = $("#file-input"); if (fi) fi.addEventListener("change", (e) => { doImportFile(e.target.files[0]); e.target.value = ""; });
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); doImportFile(e.dataTransfer.files[0]); } });
  // never lose the last debounced keystrokes to a closed tab
  document.addEventListener("visibilitychange", () => { if (document.hidden) persist(true); });
  window.addEventListener("pagehide", () => persist(true));
  document.addEventListener("keydown", (e) => {
    const tag = (document.activeElement?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return; // let native undo work while typing
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undoHistory(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redoHistory(); }
  });
  const bf = $("#btn-banner-fresh"); if (bf) bf.addEventListener("click", () => { pushHistory(); backupCurrent(); state = defaultState(); persist(true); renderEditor(); renderPreview(); });
  const bd = $("#btn-banner-dismiss"); if (bd) bd.addEventListener("click", () => { state.isExample = false; persist(); renderPreview(); });
  const te = $("#tab-edit"), tp = $("#tab-preview");
  const setTab = (which) => {
    document.body.classList.toggle("show-editor", which === "edit");
    document.body.classList.toggle("show-preview", which === "preview");
    if (te) { te.classList.toggle("active", which === "edit"); te.setAttribute("aria-pressed", String(which === "edit")); }
    if (tp) { tp.classList.toggle("active", which === "preview"); tp.setAttribute("aria-pressed", String(which === "preview")); }
  };
  if (te) te.addEventListener("click", () => setTab("edit"));
  if (tp) tp.addEventListener("click", () => setTab("preview"));
  document.body.classList.add("show-editor");
}

/* test hooks (used by test.html + e2e.html — init is skipped in test.html, so these stay pure) */
window.ResumeTest = {
  SCHEMA_VERSION, validateResumeFile, migrate, normalizeImport, lintBullet, extractJdKeywords, jdResult,
  resumeToText, sampleState, defaultState, currentEnvelope, buildSheetHtml, isSectionEmpty, allSections,
  flushPreview: paintPreview,
  getState: () => state, setState: (s) => { state = migrate(s); },
};

/* init (skipped in test.html, whose editor/sheet are hidden placeholders) */
(function init() {
  const ed = document.getElementById("editor"), sheet = document.getElementById("sheet");
  if (!ed || ed.hasAttribute("hidden") || !sheet) return;
  bindEditor(); bindToolbar(); bindJsonView(); renderEditor(); renderPreview();
})();
