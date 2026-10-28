#!/usr/bin/env bash
# Builds the bundled example end to end and checks what came out.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
ex="$here/examples/specification"
rm -rf "$ex/out"
node "$here/scripts/check.mjs" "$ex/spec.md"
# no brand: the plain theme, whatever the default brand of this machine is
node "$here/scripts/build.mjs" "$ex/spec.md" --brand none
out="$ex/out"
test -s "$out/booking-specification-example.docx"
test -s "$out/booking-specification-example.pdf"
test -s "$out/contact.png"
pages=$(node -e "console.log(require('$out/report.json').pages)")
missing=$(node -e "console.log(require('$out/report.json').toc.filter(t=>!t.page).length)")
[ "$pages" -ge 4 ] || { echo "FAIL: only $pages pages" >&2; exit 1; }
[ "$missing" = 0 ] || { echo "FAIL: $missing headings without a page number" >&2; exit 1; }
# a house brand from DOSSIER_HOME: logo, band and footer land in the document
home="$(mktemp -d "$here/.tmp-XXXX")"
mkdir -p "$home/brands" && cp -r "$here/examples/brand/northwind" "$home/brands/"
DOSSIER_HOME="$home" node "$here/scripts/build.mjs" "$ex/spec.md" --brand northwind --out "$ex/out-brand" >/dev/null
pdftotext "$ex/out-brand/booking-specification-example.pdf" - | grep -q "northwind.example" || { echo "FAIL: brand footer missing" >&2; rm -rf "$home"; exit 1; }
media=$(unzip -l "$ex/out-brand/booking-specification-example.docx" | grep -c "word/media/" || true)
[ "$media" -ge 3 ] || { echo "FAIL: brand logo or band missing ($media images)" >&2; rm -rf "$home"; exit 1; }
rm -rf "$home" "$ex/out-brand"
# a broken source must be refused
bad="$(mktemp -d "$here/.tmp-XXXX")"
printf -- '---\ntitle: T\ndate: 2026-01-01\nauthor: A\n---\n# One\n\nTODO write this\n' > "$bad/bad.md"
if node "$here/scripts/check.mjs" "$bad/bad.md" >/dev/null; then echo "FAIL: placeholder not caught" >&2; rm -rf "$bad"; exit 1; fi
rm -rf "$bad"
echo "smoke OK: $pages pages, contents complete, brand applied, placeholder refused"
