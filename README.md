# Parole

Offline flashcards for the first 1,000 Italian words: an Anki-style spaced-repetition app that installs on an iPhone from a web page. Vanilla JS, no build step, no third-party scripts, fonts or CDNs, no accounts, no analytics, nothing leaves the device.

## What is in this folder

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | the app |
| `sw.js` | service worker (offline + updates). **Generated**, edit `tools/sw.template.js` |
| `manifest.json`, `icons/` | install metadata and icons (192, 512, apple-touch 180) |
| `data/deck.json` | the deck converted from the .apkg (notes, cards, note types, media map) |
| `media/` | the deck's audio and pictures, copied unchanged from the .apkg |
| `tools/make_site.py` | .apkg to site converter (Python 3, standard library only) |

Content source: the owner's file `1000_most_common_Italian_words_V2.apkg`. **Owner: record where that deck came from and its licence here** (not known to the developer): ______

## 1. Pick the permanent URL first

Progress is stored in the browser against the exact web address. If the address changes later, every phone starts empty. Decide it now and never move it.

For GitHub Pages the address is `https://USERNAME.github.io/REPO/`. Choose the repo name carefully. (All repos under one username share the same `USERNAME.github.io` storage, which is fine because Parole uses its own database name.)

Everything uses relative paths, so it works under `/REPO/`. `index.html` must sit directly in the folder the address points to. A nested folder gives "page not found".

## 2. Deploy to GitHub Pages

1. Create a new **public** repo on github.com (Pages on free accounts needs public).
2. Unzip this download. Upload the **contents** of the `parole` folder (so `index.html` is at the top of the repo), including the hidden `.nojekyll` file. On github.com use Add file > Upload files and drag everything in. The `media` folder has about 2,300 files, so if the web upload struggles, use GitHub Desktop or `git push`.
3. Repo Settings > Pages > Build and deployment > Source: **Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
4. Wait a minute or two, then open `https://USERNAME.github.io/REPO/` in Safari on the iPhone.
5. Stay online on that first visit until Settings > Update shows **Ready offline ✓** (about 34 MB downloads once; use Wi-Fi).
6. Tap Share > **Add to Home Screen**, then open Parole from the icon. Install it before relying on it: Safari can delete a website's data after about a week of not visiting, but installed home-screen apps are exempt.
7. Write the final URL in this README.

Moving progress over from the earlier hosted version of the app: there, Settings > Export backup. Here, first-run Restore (or Settings > Import backup). The backup format and card keys are the same.

## 3. Test on a real iPhone after every deploy

- **P-1** Open from the home-screen icon, wait for Ready offline ✓, turn on airplane mode, force-quit, relaunch: decks, study, audio and pictures all work.
- **P-2** Deploy a changed version (see section 4). With no review running, Decks shows **Update ready. Tap to update**; during a review it never appears. Tap it: the app reloads once and progress is kept.
- **P-3** Delete the icon, reinstall from Safari, use Restore at first run with a backup file: progress returns.
- **P-4** Audio plays with the silent switch off. (It may be muted with the switch on.) If the phone has no Italian voice, the speak button is hidden and Settings says how to add one (Settings > Accessibility > Spoken Content > Voices). Cards with deck audio never need it.
- **D-1** Export a backup, erase all data, restore it: everything returns. A file with one changed character is refused and nothing changes.

## 4. Releasing changes

**Code change** (app.js, styles.css, index.html, tools/sw.template.js): make the edit, then run

```
python3 tools/make_site.py path/to/1000_most_common_Italian_words_V2.apkg --version 1.0.1 --content-version 1
```

This stamps the new version into both `app.js` and `sw.js`. Using the same apkg and the same content version leaves the deck and media unchanged. Then upload the changed files (`app.js`, `sw.js`, and whatever else you edited). Every release must use a new version number, because that is what makes phones notice.

**Deck change**: export the new deck from Anki with "Support older Anki versions" ticked, run the same command with the new file and `--content-version 2` (and a new `--version`), upload everything that changed (`data/deck.json`, `media/`, `sw.js`, `app.js`). Cards are matched by note guid + card number, so progress is kept; cards removed from the deck keep their history but disappear. `--order due` uses Anki's stored new-card order instead of the numbered list order (the default).

**Phones update like this**: the new worker downloads in the background, Decks shows the banner, tapping it switches over and reloads. Nothing reloads by itself. The app checks at launch and at most once a day while open; Settings > Check for update does it on demand.

Release checklist: bump version, run the command, upload, wait for the Pages build, open on an iPhone, confirm the update banner (P-2), confirm Ready offline.

## 5. How it behaves (short)

- Scheduler: Anki v2-style SM-2 with fixed constants (steps 1m/10m, graduate 1d, easy 4d, ease 2.5, hard x1.2, easy x1.3, lapse steps 10m, leech at 8 lapses, learn-ahead 20 min, day starts 04:00). Two cards per note (Italian to English, English to Italian), one deck.
- Cards render from the deck's own templates. HTML is sanitised; note-type colours, backgrounds and font sizes are ignored so dark mode and text zoom work.
- Storage: IndexedDB (localStorage fallback), saved after every answer. Backups are JSON with a SHA-256 checksum; import replaces everything after a preview and confirmation, and a safety snapshot (latest two kept) is taken first.
- 15 pictures named in the deck are not actually inside the .apkg, so those cards show no picture. Nine notes have no picture at all.

## 6. Not included (and why)

- Phase 2 "compare progress" backend: designed in the brief, not built. Friends board works from pasted snippets instead.
- The converter is Python, not Node.
- Android was not a goal and is untested.
- No automated test suite is shipped. The developer ran scheduler, backup, rendering, storage and service-worker checks before handing over, but a real-iPhone pass (section 3) is still needed.

## 7. Names and licences

"Parole" is a working name and can be changed (title in `index.html`, `manifest.json`, `app.js`). No Anki name, logo or code is used; the scheduler was written from the public Anki manual.
