# Dev-only: verify HTML tag nesting + that every local asset exists.
# Run: python3 tools/audit_html.py

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOID = {"area","base","br","col","embed","hr","img","input","link",
        "meta","param","source","track","wbr"}

class Checker(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []
        self.assets = set()

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        # collect local asset references
        for key in ("src", "href", "poster"):
            v = d.get(key)
            if v and not v.startswith(("http", "#", "data:", "mailto:", "tel:")):
                self.assets.add(v)
        for key in ("data-src", "data-src-desktop", "data-src-mobile"):
            v = d.get(key)
            if v and not v.startswith(("http", "#")):
                self.assets.add(v)
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append(f"line {self.getpos()[0]}: stray </{tag}>")
            return
        top, line = self.stack.pop()
        if top != tag:
            self.errors.append(
                f"line {self.getpos()[0]}: </{tag}> closes <{top}> opened at line {line}")

html = ROOT / "landing.html"
src = html.read_text(encoding="utf-8")
c = Checker()
c.feed(src)

print(f"HTML nesting   : {'OK' if not c.errors else str(len(c.errors)) + ' problem(s)'}")
for e in c.errors:
    print("   ", e)
if c.stack:
    print("  unclosed:", [(t, l) for t, l in c.stack])

missing = []
for a in sorted(c.assets):
    if not (ROOT / a).exists():
        missing.append(a)

print(f"Local assets   : {len(c.assets)} referenced, {len(missing)} missing")
for m in missing:
    print("   MISSING:", m)

# Guard: the skip link hides itself via a custom class. Those hiding
# properties must be !important, otherwise Tailwind preflight's border-box
# sizing lets padding utilities (px-5/py-2) win and the link renders as a
# visible orange box on every page load.
css = (ROOT / "css/tailwind.css").read_text(encoding="utf-8")
skip_ok = False
if "sr-only-focusable" in css:
    m = re.search(r"\.sr-only-focusable[^{]*\{([^}]*)\}", css)
    body = m.group(1) if m else ""
    # normalise whitespace so this works on minified output too
    body_n = re.sub(r"\s+", "", body)
    checks = {
        "width": "width:1px!important",
        "height": "height:1px!important",
        "padding": "padding:0!important",
        "clip-path": "clip-path:inset(50%)!important",
        "overflow": "overflow:hidden!important",
    }
    missing_props = [k for k, v in checks.items() if v not in body_n]
    skip_ok = not missing_props
    if skip_ok:
        print("Skip-link rule  : OK (all hiding props !important)")
    else:
        print(f"Skip-link rule  : NOT IMPORTANT for {missing_props} — link will leak")
else:
    print("Skip-link rule  : not found")

# sanity: every referenced id hook used by JS exists in the HTML
js = (ROOT / "js/landing.js").read_text(encoding="utf-8")
ids = set(re.findall(r"\$\('#([a-zA-Z0-9_-]+)'\)", js))
absent = [i for i in sorted(ids) if f'id="{i}"' not in src]
print(f"JS id hooks    : {len(ids)} used, {len(absent)} absent")
for a in absent:
    print("   ABSENT:", a)

sys.exit(1 if (c.errors or missing or absent or not skip_ok) else 0)