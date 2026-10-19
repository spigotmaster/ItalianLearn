#!/usr/bin/env python3
"""Convert an Anki .apkg into the Parole site files. Standard library only.

  python3 tools/make_site.py path/to/deck.apkg [--content-version N] [--version X.Y.Z] [--order note|due]

Writes (relative to the site root, the folder above tools/):
  data/deck.json   decks, note types (fields, templates, css), notes, cards, media map
  media/           audio and images, renamed to <number>.<ext> (numbers come from the apkg)
  sw.js            generated from tools/sw.template.js (precache lists, versions)

Export the deck from Anki with "Support older Anki versions" ticked, so it contains collection.anki2/anki21.
Card keys are note guid + template ord and never change, so progress survives content updates.
"""
import argparse, json, os, re, shutil, sqlite3, sys, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('apkg')
ap.add_argument('--content-version', type=int, default=1, help='bump whenever the deck content or media changes')
ap.add_argument('--version', help='app version to stamp into app.js and sw.js (default: unchanged)')
ap.add_argument('--order', choices=['note', 'due'], default='note',
                help="new-card order: 'note' = order the notes were created (default), 'due' = Anki's stored new-card order")
a = ap.parse_args()

tmp = tempfile.mkdtemp()
with zipfile.ZipFile(a.apkg) as z:
    names = z.namelist()
    z.extractall(tmp)
cands = [n for n in ('collection.anki21', 'collection.anki2') if n in names]
if not cands:
    sys.exit('This .apkg has no collection.anki21/anki2 (newer exports use collection.anki21b, which is not supported). '
             'Re-export from Anki with "Support older Anki versions" ticked.')

def count(n):
    return sqlite3.connect(os.path.join(tmp, n)).execute('select count(*) from notes').fetchone()[0]
db = max(cands, key=count)
con = sqlite3.connect(os.path.join(tmp, db))
models = json.loads(con.execute('select models from col').fetchone()[0])
decks = json.loads(con.execute('select decks from col').fetchone()[0])

notes_raw = con.execute('select id, guid, mid, flds, tags from notes order by id').fetchall()
nidx = {r[0]: i for i, r in enumerate(notes_raw)}
notes = [{'g': r[1], 'm': str(r[2]), 'f': r[3].split('\x1f'), 't': r[4].strip()} for r in notes_raw]
cards_raw = con.execute('select nid, ord, did, due from cards').fetchall()
cards_raw.sort(key=(lambda c: (nidx[c[0]], c[1])) if a.order == 'note' else (lambda c: (c[3], c[1])))
cards = [[nidx[c[0]], c[1], str(c[2])] for c in cards_raw if c[0] in nidx]

used = {n['m'] for n in notes}
mdl = {}
for mid, m in models.items():
    if mid in used:
        mdl[mid] = {'name': m['name'], 'f': [f['name'] for f in sorted(m['flds'], key=lambda f: f['ord'])],
                    't': [{'n': t['name'], 'q': t['qfmt'], 'a': t['afmt']} for t in sorted(m['tmpls'], key=lambda t: t['ord'])],
                    'css': m.get('css', '')}
dids = []
for c in cards:
    if c[2] not in dids:
        dids.append(c[2])
dlist = [{'id': d, 'name': decks[d]['name']} for d in dids if d in decks]

# media: apkg 'media' maps number -> filename; files are stored under the number
mm = json.load(open(os.path.join(tmp, 'media')))
mdir = os.path.join(ROOT, 'media')
shutil.rmtree(mdir, ignore_errors=True)
os.makedirs(mdir)
media = {}
for num, fn in mm.items():
    src = os.path.join(tmp, num)
    if os.path.isfile(src):
        ext = os.path.splitext(fn)[1].lower()
        shutil.copyfile(src, os.path.join(mdir, num + ext))
        media['%s' % fn] = 'media/%s%s' % (num, ext)

# report media references the apkg does not contain
refs = set()
for n in notes:
    for f in n['f']:
        refs.update(re.findall(r'\[sound:([^\]]+)\]', f))
        refs.update(re.findall(r'''src=["']([^"']+)["']''', f))
missing = sorted(r for r in refs if r not in media)

os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
deck = {'content_version': a.content_version, 'decks': dlist, 'models': mdl, 'notes': notes, 'cards': cards, 'media': media}
with open(os.path.join(ROOT, 'data', 'deck.json'), 'w', encoding='utf8') as fh:
    json.dump(deck, fh, ensure_ascii=False, separators=(',', ':'))

# version stamp + service worker
appjs = os.path.join(ROOT, 'app.js')
src = open(appjs, encoding='utf8').read()
if a.version:
    src = re.sub(r"const AV='[^']*'", "const AV='%s'" % a.version, src, count=1)
    open(appjs, 'w', encoding='utf8').write(src)
version = re.search(r"const AV='([^']*)'", src).group(1)
shell = ['./', './index.html', './styles.css', './app.js', './manifest.json', './data/deck.json',
         './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png']
for s in shell[1:]:
    if not os.path.isfile(os.path.join(ROOT, s[2:])):
        print('WARNING: missing shell file', s)
tpl = open(os.path.join(ROOT, 'tools', 'sw.template.js'), encoding='utf8').read()
sw = (tpl.replace('__VERSION__', version).replace('__MEDIA_VER__', str(a.content_version))
         .replace('__SHELL__', json.dumps(shell)).replace('__MEDIA__', json.dumps(['./' + p for p in sorted(media.values())])))
open(os.path.join(ROOT, 'sw.js'), 'w', encoding='utf8').write(sw)

size = sum(os.path.getsize(os.path.join(mdir, f)) for f in os.listdir(mdir))
print('decks: %s' % ', '.join(d['name'] for d in dlist))
print('notes: %d | cards: %d | media files: %d (%.1f MB) | order: %s' % (len(notes), len(cards), len(media), size / 1e6, a.order))
print('app version %s | content version %d' % (version, a.content_version))
print('media referenced but not in the apkg: %d' % len(missing))
for m in missing[:20]:
    print('   ', m)
