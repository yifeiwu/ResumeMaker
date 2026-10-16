"""Verify real print-to-PDF output against the live preview DOM.

Usage: python print-verify.py <dir-with-tpl.pdf-and-tpl.dom.html>

Self-calibrating: the preview page count comes from the same run's dump-dom, so the
check is robust to font-metric differences across machines. Rules per template:

- ats / modern: PDF sheets == preview pages, every sheet is true A4, every sheet
  carries footer "Page i of N" with N == preview count.
- sidebar: the two-column grid is atomic and never splits, so long content spills
  across extra sheets. Require the preview's overflow warning instead, plus A4
  sheets, the name on sheet 1, and the final "Page N of N" footer on the last sheet.
"""
import re
import pathlib
import sys

A4 = (595.276, 841.89)
TPLS = ("ats", "modern", "sidebar")
fails = []


def say(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg)
    if not ok:
        fails.append(msg)


def main(d):
    from pypdf import PdfReader
    for tpl in TPLS:
        dom = (d / (tpl + ".dom.html")).read_text(encoding="utf-8")
        m = re.search(r"<title>printprobe-(\w+)-(\d+)pg</title>", dom)
        say(bool(m) and m.group(1) == tpl,
            "%s: fixture rendered template %s" % (tpl, m.group(1) if m else "?"))
        if not m:
            continue
        preview = int(m.group(2))
        preview2 = dom.count("page-foot")
        say(preview == preview2 and preview > 0,
            "%s: preview has %d page box(es)" % (tpl, preview))
        est_over = 'id="page-est" class="over"' in dom

        r = PdfReader(str(d / (tpl + ".pdf")))
        npdf = len(r.pages)
        say(npdf > 0, "%s: pdf has pages" % tpl)
        sheets = []
        for i, pg in enumerate(r.pages):
            mb = pg.mediabox
            w, h = float(mb.width), float(mb.height)
            say(abs(w - A4[0]) < 1 and abs(h - A4[1]) < 1,
                "%s: sheet %d is A4 (%.1f x %.1f pt)" % (tpl, i + 1, w, h))
            sheets.append(pg.extract_text() or "")

        if tpl in ("ats", "modern"):
            say(npdf == preview,
                "%s: pdf sheets (%d) == preview pages (%d)" % (tpl, npdf, preview))
            for i, txt in enumerate(sheets):
                fm = re.findall(r"Page (\d+) of (\d+)", txt)
                say(["%d of %d" % (i + 1, preview)] == ["%s of %s" % t for t in fm],
                    "%s: sheet %d footer is 'Page %d of %d'" % (tpl, i + 1, i + 1, preview))
        else:  # sidebar: atomic spill is a known limitation, the warning is the contract
            say(est_over,
                "sidebar: preview shows the overflow warning (print will spill)")
            say(npdf >= preview,
                "sidebar: pdf sheets (%d) >= preview pages (%d)" % (npdf, preview))
            say("Alex Morgan" in sheets[0],
                "sidebar: name prints on the first sheet")
            fm = re.findall(r"Page (\d+) of (\d+)", sheets[-1])
            say([(str(preview), str(preview))] == [(a, b) for a, b in fm] or
                ("Page %d of %d" % (preview, preview)) in sheets[-1],
                "sidebar: final sheet carries 'Page %d of %d'" % (preview, preview))
    print("print-verify: %s" % ("ALL PASS" if not fails else "%d FAILING" % len(fails)))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(pathlib.Path(sys.argv[1])))
