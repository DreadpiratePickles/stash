<div align="center">

# 🧠 Stash

### **You save things everywhere. You find them never.**

![python](https://img.shields.io/badge/python-3.11%2B-3776AB?logo=python&logoColor=white)
![fastapi](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![react native](https://img.shields.io/badge/React%20Native-61DAFB?logo=react&logoColor=black)
![mongodb](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![license](https://img.shields.io/badge/license-MIT-blueviolet)

</div>

---

The screenshot of the cafe your friend sent you is in your camera roll, next to four hundred
other screenshots. The Spotify link is in a text thread from three weeks ago. The book someone
mentioned at dinner is nowhere, because you didn't write it down at all. Notes apps don't fix
this — they just give the graveyard a search bar.

**Stash** is a second brain for that category of thing: you dump a screenshot, a link, or a
note in under two seconds, an LLM figures out what it actually *is*, and a rediscovery feed
brings it back later when it's actually relevant — cafes in the morning, music at night,
the stuff you saved and then forgot.

---

## What this is

A FastAPI backend and an Expo/React Native app, talking over a small JSON API, backed by
MongoDB.

**The capture → enrich loop, concretely:** you pick a screenshot from your library, take a
photo, or paste a link/note. On save, the backend sends the text and/or image straight to an
OpenAI vision-capable chat completion (`gpt-5.1` by default, configurable) with a system prompt
that demands structured JSON back: a title, a 1–2 sentence summary, a category (from a fixed
list — `movie`, `music`, `place`, `book`, `article`, `idea`, `person`, `video`, `other`), 2–5
tags, and a free-form metadata object for whatever the model can pull out (venue, artist,
author, year, url). That's the whole enrichment pipeline — one model call, one JSON contract,
stored as-is on the document.

**Rediscovery is a set of hand-written rules, not a recommendation model.** `GET
/stashes/rediscover` buckets categories by hour of day (place/article/book in the morning,
music/movie in the evening, etc.), pulls anything within roughly a 15-mile box of your current
coordinates if you share location, and mixes in your oldest never-resurfaced saves so nothing
gets permanently buried. It's deliberately simple — see [Honest caveats](#honest-caveats) for
what "smart" doesn't mean here.

**Search is a MongoDB regex** over title, summary, raw text, note, tags, and category — a
real, useful substring search, not semantic search.

---

## Quickstart

**Prerequisites:** Python 3.10+, Node.js with pnpm or yarn, a MongoDB instance (local or
Atlas), an OpenAI API key (optional — enrichment degrades gracefully without one, see below).

There is no `.env.example` in this repo — the variables below are read directly out of
`backend/server.py` and `frontend/src/lib/api.ts`.

**Backend** (`backend/.env`):

```env
MONGO_URL=mongodb://localhost:27017    # required — no default, boot fails without it
DB_NAME=stash                          # required — no default
JWT_SECRET=change-me                   # optional, defaults to "dev-secret" — set a real one
OPENAI_API_KEY=sk-...                  # optional — see "without a key" below
LLM_MODEL=gpt-5.1                      # optional, this is the default
ADMIN_EMAIL=hello@stash.app            # optional, seeds a login on first boot
ADMIN_PASSWORD=Stash2026!              # optional, matches the pre-filled login screen
```

```bash
cd backend
pip install -r requirements.txt
python server.py            # serves on :8000, seeds the admin user on first startup
```

**Frontend** (`frontend/.env`):

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

```bash
cd frontend
pnpm install                # or yarn install
npx expo start
```

The login screen ships pre-filled with the admin credentials above, so the fastest way to see
real data is: start both servers, open the app, hit "Log in" without typing anything, and tap
the **+** button to make your first stash.

---

## Why this design

**Enrichment happens synchronously, in the request path, on every save.** `POST /stashes`
doesn't return until the model call finishes — there's no job queue, no background worker,
no webhook. That's a deliberate trade for a project this size: one code path to reason about,
no infrastructure to run, and the UI already shows an "AI is enriching…" spinner while it
waits. The cost is that a slow or rate-limited OpenAI response makes the save itself slow.

**No API key doesn't mean no app.** If `OPENAI_API_KEY` is unset, or the completion call
throws for any reason (rate limit, malformed JSON, network), `enrich_content()` falls back to
`_fallback_enrich()`: the title becomes the first line of whatever text you typed, the summary
is the first 200 characters, the category is `other`, and tags are empty. The endpoint never
fails because enrichment failed — it just gets dumber. This means you can run the whole app,
end to end, with zero OpenAI spend, and see exactly how much the AI step is actually doing by
comparing a stash saved with a key configured against one saved without.

**Images live inline as base64, in the same MongoDB document as everything else.** No S3,
no CDN, no separate blob store. That's simple to run and simple to reason about, and it's the
right call for a personal, single-instance tool — it is very much the wrong call at any scale
where photo library imports get large or numerous (see caveats).

---

## Worked example

Say you screenshot a Spotify "Now Playing" card and text/pin it, or take a photo of a menu
board outside a cafe, and hand it to Stash as a screenshot capture. The request:

```json
POST /api/stashes
{
  "type": "screenshot",
  "image_base64": "<jpeg bytes>",
  "note": "friend said this place has the best cold brew",
  "lat": 40.7128,
  "lng": -74.0060
}
```

The backend attaches the image as a `data:image/jpeg;base64,...` URL alongside a text prompt
and sends both to the model in one chat completion, asking for JSON only. A plausible response,
stored on the new document exactly as returned:

```json
{
  "title": "Kaffe Bar — Cold Brew",
  "summary": "Neighborhood coffee shop recommended by a friend for its cold brew.",
  "category": "place",
  "tags": ["coffee", "cold-brew", "recommendation"],
  "metadata": { "venue": "Kaffe Bar" }
}
```

That document now shows up in the feed under "Place," in search for "cold brew" or "kaffe,"
and — because it has coordinates and a `place` category — it's a candidate for the Rediscover
feed the next time you're near those coordinates, or the next time the clock rolls into the
morning bucket.

---

## Honest caveats

Things the README shouldn't oversell, verified against the actual code:

- **The "share/screenshot layer" capture the project's own vision doc describes isn't built.**
  There's no iOS share extension, no Android `ACTION_SEND` intent filter — nothing in
  `app.json` registers one. Capture today is entirely in-app: open Stash, pick a photo from
  your library or camera roll, or paste a link/note. You cannot yet share *into* Stash from
  another app.
- **Voice capture is a type the API accepts, not a feature that exists.** `StashCreate.type`
  allows `"voice"` in a code comment, and the capture screen imports a `Mic` icon it never
  renders or wires to anything. No UI path ever sends `type: "voice"`.
- **"Smart" Rediscovery is fixed rules, not learning.** Time-of-day category buckets, a flat
  ±0.15° lat/lng bounding box (roughly 10–15 miles, not a real distance calculation), and
  oldest-never-resurfaced-first. It gets more relevant as you use it in the sense that it has
  more data to bucket, not in the sense that it adapts to your behavior.
- **Search is regex, not semantic.** It will not find a stash about "the place with good
  coffee" if you search "caffeine" — it matches substrings, not meaning.
- **CORS is wide open** (`allow_origins=["*"]` combined with `allow_credentials=True`) — fine
  for local development, not something to ship as-is.
- **`JWT_SECRET` defaults to the literal string `"dev-secret"`** if you don't set one. The app
  will boot and work perfectly with a token secret anyone reading this README also knows.
- **No CI.** There's no GitHub Actions workflow in this repo — tests exist but nothing runs
  them automatically on push or PR.
- **The test suite's own tracking file is an empty template.** `test_result.md` is scaffolding
  for a testing protocol with zero actual entries logged — treat it as unused, not as a status
  report.
- **The backend test suite needs live infrastructure.** `backend/tests/backend_test.py` (14
  tests) hits a *running* backend and a real MongoDB instance — no mocks — and reads its base
  URL out of `frontend/.env`, so it also depends on the frontend being configured. There's no
  frontend test suite at all.
- **The pre-seeded admin credential doesn't match the code's own default.** The login screen
  is pre-filled with `hello@stash.app` / `Stash2026!`, and the integration tests hardcode that
  same email — but `server.py`'s own default for `ADMIN_EMAIL` (used if you don't set the env
  var) is a different placeholder address. Set `ADMIN_EMAIL=hello@stash.app` explicitly if you
  want the pre-filled login to actually work.

---

## Project structure

```text
.
├── backend/
│   ├── server.py           # the entire API: auth, stash CRUD, enrichment, rediscover, search
│   ├── requirements.txt
│   └── tests/backend_test.py   # integration tests against a live server + Mongo
├── frontend/
│   ├── app/                 # Expo Router screens: login, register, capture, tabs, stash detail
│   └── src/                 # api client, auth context, theme, storage, StashCard component
├── memory/PRD.md            # the original product spec this was built from
└── design_guidelines.json   # color/typography tokens the frontend theme is derived from
```

## Roadmap / extension points

- [ ] Real share-sheet capture (iOS share extension, Android `ACTION_SEND`) — the actual "wedge" the PRD describes, not yet built
- [ ] Background enrichment queue, so save latency stops being tied to OpenAI response time
- [ ] Object storage for images instead of inline base64 in MongoDB
- [ ] Real distance calculation for location-based rediscovery instead of a flat lat/lng box
- [ ] Voice capture, following through on the type the API already accepts
- [ ] Embedding-based search alongside the existing regex search
- [ ] CI: run `backend/tests/backend_test.py` on push against a disposable Mongo instance

## License

MIT — see [LICENSE](LICENSE).
