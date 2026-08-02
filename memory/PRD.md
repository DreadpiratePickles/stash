# Stash — PRD

## Vision
A second brain for ephemeral content discovery: movies, music, cafes, books, Wikipedia rabbit holes, people, and ideas. **Save it in two seconds. Find it when it matters. Never lose a rec again.**

## Wedge
Bypass platform API restrictions by intercepting at the **share/screenshot layer**. The user actively sends content into Stash; AI then enriches, categorizes, and resurfaces it.

## Moat
What happens *after* the save:
- AI enrichment (auto title, summary, category, tags, metadata extraction)
- Vision AI for screenshots (extracts venue, title, artist, app source)
- Contextual resurfacing (time-of-day + location + forgotten gems)

## MVP Features
- JWT email/password auth with a pre-seeded master admin
- Capture flow: screenshot / camera / link / text note (+ optional location)
- AI enrichment via OpenAI API key (gpt-5.1 vision-capable)
- Tab navigation: Feed, Rediscover, Search, Profile
- Stash detail with extracted metadata + user notes
- Smart Rediscover: time-of-day priority categories, nearby places, forgotten gems
- Search across titles, summaries, tags, raw text, notes
- Profile dashboard with per-category breakdown

## Stack
- Backend: FastAPI + MongoDB (motor) + openai (LlmChat)
- Auth: passlib/bcrypt + python-jose JWT
- Frontend: Expo Router (TypeScript), react-native-safe-area-context, lucide-react-native
- Storage: expo-secure-store for JWT, AsyncStorage via shared util

## Backend endpoints (/api)
- POST /auth/register, POST /auth/login, GET /auth/me
- POST /stashes (creates + AI enriches), GET /stashes?category=
- GET /stashes/search?q=
- GET /stashes/rediscover?lat=&lng=
- GET /stashes/{id}, PATCH /stashes/{id}, DELETE /stashes/{id}
- GET /stats

## Smart business hook
The Rediscover feed creates a daily reason-to-open the app — the retention/habit lever every "save-it-and-forget-it" competitor (Pocket, Notion, Instapaper) lacks. Future: weekly "your week in saves" digest, share-sheet target on iOS for true 2-second capture.
