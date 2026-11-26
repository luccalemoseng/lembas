# Lembas

A free, mobile-first, installable web app (PWA) for learning the Elvish languages
(Sindarin and Quenya) with short, gamified daily lessons.

> Lembas is a non-profit fan project. It is not affiliated with, endorsed by, or
> connected to the Tolkien Estate, Middle-earth Enterprises, or any of their
> licensees. All explanations are original; no text from the books is reproduced.

## Stack

- Vite + React 19 + TypeScript, Tailwind CSS 4, React Router
- Zustand (progress persisted to `localStorage`; no accounts)
- vite-plugin-pwa (offline support, install to home screen)
- Vitest, ESLint, Prettier
- Hosting: Cloudflare Pages (fully static; no Functions, KV or secrets needed)

## Getting started

```bash
nvm use          # Node 24 LTS or newer (see .nvmrc)
npm install
npm run dev      # http://localhost:5173
```

| Script                   | What it does                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| `npm run dev`            | Front-end dev server with hot reload                             |
| `npm run build`          | Type-check and build to `dist/`                                  |
| `npm run preview`        | Serve the production build locally (service worker active)       |
| `npm run pages:dev`      | Build, then serve `dist/` with `wrangler pages dev` (Cloudflare) |
| `npm test`               | Run all unit tests once                                          |
| `npm run lint`           | ESLint                                                           |
| `npm run format`         | Prettier (write)                                                 |
| `npm run content:review` | List content items still marked `"review"`                       |
| `npm run icons`          | Regenerate PWA icons from `public/favicon.svg`                   |

## Project layout

```
src/
  content/            Learning content (JSON) + schema + loader
    lexicon.json        Elvish words, names and phrases
    pronunciation.json  Pronunciation rules and stress examples
    tracks.json         Tracks (Pronunciation, Sindarin, ...) and their units
    achievements.json   Achievement titles, descriptions and conditions
    units/*.json        One file per unit: lessons and the item ids they teach
    schema.ts           zod schemas (the contract for the JSON files)
  engine/             Pure logic, fully unit-tested
    answer.ts           Typed-answer checking (accents optional, typo rules)
    lesson.ts           Builds a lesson's exercise list from content
    streak.ts           Daily streak and streak freezes
    xp.ts               XP and daily goal
    progress.ts         Lesson/unit unlocking
    hearts.ts           Daily hearts
    srs.ts              Spaced repetition (simplified SM-2)
    achievements.ts     Achievement conditions and progress
  store/progress.ts   Zustand store persisted to localStorage (versioned, with migrations)
  exercises/          One component per exercise type
  features/           Screens: path, lesson, practice, session runner, profile, about
  i18n/en.json        Every UI string (add a language by adding a file)
scripts/              Node scripts (content review)
```

## Editing content

All content is in `src/content/*.json`. You can edit it without touching code;
`npm test` validates every file against `schema.ts`.

Every item needs:

- `source`: where it appears in the published work (e.g. `"Appendix E, section I"`).
- `confidence`: `"high"` or `"review"`. **Items marked `"review"` are automatically
  removed from lessons** until you change them to `"high"`. Run `npm run content:review`
  to list them. A good reference for checking words is the
  [Eldamo lexicon](https://eldamo.org).

Rules for content:

- Glosses (`gloss`) are in English; use the author's own English glosses where they exist.
  The first gloss is the one shown; all are accepted as answers.
- `note` and `explanation` must be written in your own words. Do not paste text from the books.
- Do not add Elvish words that are not attested in the published work.

To add a lesson: add the items to `lexicon.json` or `pronunciation.json`, then reference
their ids from a lesson in `units/<unit>.json`. A unit must have 4 to 6 lessons.

## How lessons work

- Each lesson starts by introducing every new item (Elvish → English multiple choice),
  then a matching round, then harder exercises (English → Elvish, typing, and building
  phrases from word tiles in both directions).
- Short lessons are padded with review of earlier items in the same track.
- Wrong answers come back at the end of the lesson; the lesson ends when all are answered.
- XP: 10 for a first completion, 5 for a repeat, +5 for a perfect lesson (no mistakes),
  5 for a practice session.
- Hearts: 5 per day (a full set again each new local day). Each wrong answer in a lesson
  costs one; with none left the lesson stops without XP and cannot start. Matching
  mistakes and practice sessions never cost hearts. Each finished practice session gives
  one heart back.
- Practice (spaced repetition, simplified SM-2): every item you miss in a lesson enters
  your review deck at once (even if you quit or run out of hearts), due the same day. In
  practice, a right answer schedules it 1 day, then 3 days, then `interval × ease` days
  later. Ease starts at 2.5 (minimum 1.3); a right answer changes it with the SM-2
  formula (right = quality 4, no change; right with a typo = quality 3, −0.14), and a
  miss lowers it by a flat 0.2 and sends the card back to 1 day. When nothing is due,
  "Review what you have learned" runs a general review of items from completed lessons:
  a miss there resets the card, while a right answer to a card that is not due yet
  leaves its schedule unchanged.
- Achievements: defined in `src/content/achievements.json` (title, description and a
  condition: number of lessons, number of different lessons finished without a mistake, longest streak, XP, practice sessions,
  or finishing a given unit or track). They are checked after every session and shown in
  the summary and on the Profile screen.
- Streak: at least one finished lesson or practice session per calendar day (local
  time). A streak freeze covers one missed day; you start with 1 and earn one every 7
  streak days (maximum 2).
- Typed answers: accents are optional (`Annun` = `Annûn`). In English answers, one
  single-letter slip in one word of 6+ letters is forgiven (and pointed out), except a
  plural "s". Elvish must be spelled exactly, because a single
  letter can change the word (`mellon` "friend" vs `mellyn` "friends").

## Deploying to Cloudflare Pages

The app is a static site. `wrangler.toml` sets `pages_build_output_dir = "./dist"`.

1. **Push to GitHub**
   ```bash
   git add -A && git commit -m "Initial commit"
   git remote add origin git@github.com:<you>/lembas.git
   git push -u origin main
   ```
2. **Create the Pages project.** In the Cloudflare dashboard, go to
   **Workers & Pages → Create → Pages → Connect to Git** and pick the repository.
3. **Build settings**
   - Framework preset: _None_ (or _Vite_)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `24` (an LTS version; Pages also accepts newer
     LTS versions)
4. **Secrets and bindings:** none are needed. The handwriting check planned for Phase 4
   runs entirely in the browser, so there is no API key to configure.
5. **Preview deployments.** Every branch you push gets its own preview URL
   (`<branch>.<project>.pages.dev`). Open the _Deployments_ tab to find it. Production is
   the `main` branch.
6. **SPA routing.** The build contains no `404.html`, so Pages serves `index.html` for any
   unknown path (deep links like `/lesson/sin-durin-1` work). No `_redirects` file is needed.

### Testing locally with Cloudflare's runtime

```bash
npm run pages:dev   # builds, then serves dist/ at http://localhost:8788
```

## Checking the PWA on a phone

- **Android (Chrome):** open the site, then use the menu → _Install app_ (or the install
  banner). Launch it from the home screen: it opens full-screen without the address bar.
- **iOS (Safari):** open the site, tap _Share → Add to Home Screen_. iOS has no install
  prompt; this is the only way.
- **Offline test:** open the app once while online and wait for "ready to work offline".
  Then turn on airplane mode and reopen it. Lessons and progress keep working.
- In desktop Chrome, _DevTools → Application → Manifest_ shows any installability problems.

Note: iOS Safari does not support the Vibration API, so haptic feedback only works on
Android. Visual feedback works everywhere.

## Quality checks

- `npm test`: 127 unit tests covering answer checking and accent normalisation, streak
  and freeze rules (including daylight-saving changes), XP and daily goal, hearts,
  spaced repetition, achievements, saved-data migration, lesson
  generation for every lesson with several random seeds, unlock order, persistence, and
  content validation. One test parses every `.tsx` file and fails if it finds literal
  text between JSX tags, literal `{'strings'}` rendered as children, or literal
  `aria-label`/`placeholder`/`title`/`alt` attributes. (Strings built in plain
  TypeScript outside JSX are not detected; keep them in `src/i18n` by convention.)
- Lighthouse (mobile, production build, Phase 2): Performance 100, Accessibility 100,
  Best Practices 100, SEO 100 on `/`, `/practice`, `/profile` and `/lesson/sin-durin-1`. Lighthouse
  removed its separate "PWA" category in version 12, so installability is checked as
  described above.

## Licences

- Code: add the licence of your choice (e.g. MIT) in `LICENSE`.
- App icon, leaf ornament, map-contour texture and trail: original artwork drawn for this app.
- Fonts (self-hosted, Latin subsets only, see `src/fonts.css`):
  [Inter](https://rsms.me/inter/) and
  [Cormorant Garamond](https://github.com/CatharsisFonts/Cormorant), both under the SIL Open
  Font Licence 1.1, via Fontsource.
- Tengwar font (Phase 3): will be documented here once chosen; only fonts with a free
  licence (e.g. SIL OFL) will be bundled.
