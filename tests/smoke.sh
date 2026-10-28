#!/usr/bin/env bash
# Builds the bundled example end to end and checks what came out.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
ex="$here/examples/specification"
rm -rf "$ex/out"
node "$here/scripts/check.mjs" "$ex/spec.md"
node "$here/scripts/build.mjs" "$ex/spec.md"
out="$ex/out"
test -s "$out/booking-specification-example.docx"
test -s "$out/booking-specification-example.pdf"
test -s "$out/contact.png"
pages=$(node -e "console.log(require('$out/report.json').pages)")
missing=$(node -e "console.log(require('$out/report.json').toc.filter(t=>!t.page).length)")
[ "$pages" -ge 4 ] || { echo "FAIL: only $pages pages" >&2; exit 1; }
[ "$missing" = 0 ] || { echo "FAIL: $missing headings without a page number" >&2; exit 1; }
# a broken source must be refused
bad="$(mktemp -d "$here/.tmp-XXXX")"
printf -- '---\ntitle: T\ndate: 2026-01-01\nauthor: A\n---\n# One\n\nTODO write this\n' > "$bad/bad.md"
if node "$here/scripts/check.mjs" "$bad/bad.md" >/dev/null; then echo "FAIL: placeholder not caught" >&2; rm -rf "$bad"; exit 1; fi
rm -rf "$bad"
echo "smoke OK: $pages pages, contents complete, placeholder refused"
