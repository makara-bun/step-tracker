# Pip Steps

A step tracker PWA. Log your steps and your chosen character (Pip, Miso or Nori) walks up the hill
towards your daily goal. See your steps per day, month and year.

It runs entirely in the browser. There's no server or account, and your steps stay on your device.

## Run it

Needs Python 3 to serve the files, which Macs already have.

    npm start

Then open http://127.0.0.1:8090. Opening `docs/index.html` directly won't work, because browsers
don't load JavaScript modules or service workers from `file://`.

## Publish it for free

`docs/` is the whole app, so any static host can serve it. For GitHub Pages:

1. Create a repository on GitHub and push this project to it. Pages needs a public repository on
   the free plan. Your steps are never in the repository, as they only live in your browser.
2. In the repository, go to **Settings > Pages**.
3. Under **Build and deployment**, pick **Deploy from a branch**, then your main branch and `/docs`.
4. After a minute or so, it's live at `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

Everyone who opens that address gets their own empty copy, and nobody can see anyone else's steps.

## Put it on your phone

Install it first, then start logging. On iPhone, the home screen app has separate storage from
Safari, so steps logged in a Safari tab don't carry over.

- **iPhone:** open the address in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open the address in Chrome, then choose **Add to Home screen** or **Install app**.

## Good to know

- **Your steps are only on this one device and browser.** They don't sync. Use **Back up your
  steps** on the Day screen now and then, and keep the file somewhere else.
- **Browsers can delete site data.** Clearing browser data erases your steps. Safari can also delete
  data for sites you haven't visited in 7 days, unless the app is on your home screen.
- **It works fully offline** once it has been opened, including saving steps.
- **Updates arrive on the second open.** The app starts from its saved copy and fetches the new one
  for next time.
- **Steps are entered by hand.** Web apps can't read Apple Health or Google Fit.
- **It needs JavaScript**, because that's what saves your steps.
- **Distances are estimates**, based on a 75 cm stride (`METERS_PER_STEP` in `views.js`).

## Change the styles

CSS is built by Tailwind from `assets/web.css` into `docs/app.css`.

    npm install
    npm run web:css        # or npm run web:css:watch

Run this whenever you use a Tailwind class that isn't already in `docs/app.css`.

## Test

    npm test

## How it fits together

Everything is in `docs/js/`:

- `app.js` connects the app to the page: addresses, forms, scrolling and backup files.
- `pages.js` decides which screen an address shows and what each form does.
- `screens.js` holds the HTML for each screen, and `art.js` holds the drawings. To add a walker,
  list it in `walkers` in `views.js` and draw its three poses in `art.js`.
- `views.js` turns stored steps into what each screen shows.
- `store.js` saves to `localStorage`, and reads and writes backup files.
- `html.js` is the template tag that escapes values, so typed text can't become markup.
- `theme.js` sets day or night before the page paints.

`docs/sw.js` is the service worker. List any new file in `PRECACHE` and bump `VERSION`. A test
fails if a published file is missing from the list.

Only `app.js` and `theme.js` touch the page, so the rest can be tested in Node.

Every screen's address is a hash, like `#/month/2026-10`, so the app works on any static host and
in any subfolder. Keep paths in `docs/` relative for the same reason.

## Day and night

The switch at the top of every screen is saved per device, and the first visit follows the device's
setting. Colours that change at night are the CSS variables in `assets/web.css`, so art should use
classes like `fill-on-air` rather than fixed colours for anything drawn directly on the sky.

## The older Go version

The server version is still here: `main.go`, `server.go`, `store.go`, `views.go`, `server_test.go`,
`go.mod`, `go.sum`, `templates/`, `static/` and `assets/app.css`. Nothing in `docs/` uses any of it.
It runs with `go run .` on http://127.0.0.1:8080 and stores data in `steps.db`.

To move steps from it to the browser version:

    npm run export-old-data

That reads `steps.db` without changing it and writes `my-steps-backup.json`. Open **Back up your
steps** in the app and choose **Restore a backup**. The file holds your personal data, so it's
ignored by git and kept out of `docs/`.
