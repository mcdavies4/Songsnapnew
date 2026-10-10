# SongSnap

Share what you're listening to. Expo (iOS / Android / web) + Supabase.

Migrated off Emergent: the FastAPI + MongoDB backend is replaced by Supabase (Postgres, Auth, one Edge Function). There is no server to host.

```
app/                      Expo Router screens
  (tabs)/                 Feed, Search, Create, Profile
  user/[id].tsx           Someone's profile + follow
  post/[id].tsx           Post + comments
  edit-profile.tsx
components/               PostCard, PostList, ProfileHeader, …
lib/api.ts                All data access (Supabase queries + RPC)
store/auth.ts             Session, Google sign-in, guest sign-in, guest → Google upgrade
supabase/migrations/      Schema, RLS, counters, feed RPC
supabase/functions/music-search/   Spotify + YouTube search (keeps API keys server-side)
```

## 1. Supabase project

1. Create a project at supabase.com.
2. **SQL Editor** → paste `supabase/migrations/20261010000000_init.sql` → Run.
   (Or with the CLI: `supabase link --project-ref <ref>` then `supabase db push`.)

## 2. Auth

**Google provider**
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client → **Web application**.
2. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Sign In / Providers → Google → paste Client ID + Secret → Enable.

**Guest mode** – Authentication → Sign In / Providers → enable **Anonymous sign-ins**.

**Guest → Google upgrade** – Authentication → Sign In / Providers → enable **Manual linking**.

**Redirect URLs** – Authentication → URL Configuration:
- Site URL: your live web URL, e.g. `https://songsnap.pages.dev`
- Additional redirect URLs:
  - `https://songsnap.pages.dev` (and any custom domain)
  - `http://localhost:8081`
  - `songsnap://auth-callback`
  - `exp://**` (Expo Go during development)

## 3. Music search function

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase secrets set SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... YOUTUBE_API_KEY=...
npx supabase functions deploy music-search
```

Use the same Spotify / YouTube keys the Emergent backend had.

> Spotify no longer returns 30-second `preview_url`s for most apps. When there's no preview, the play button opens the track in Spotify instead.

## 4. Run locally

```bash
cp .env.example .env         # fill in Project URL + anon/publishable key (Settings → API)
npm install
npx expo start               # press w for web, or scan with Expo Go
```

## 5. Deploy the web app

Build: `npx expo export --platform web --clear` → static files in `dist/`.

**Cloudflare Pages** – connect the repo:
- Build command: `npx expo export --platform web --clear`
- Output directory: `dist`
- Environment variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `NODE_VERSION=22`

Env vars are baked in at build time: after adding or changing them, redeploy (Deployments → Retry deployment). If they're missing, the site shows a "SongSnap isn't configured" message.

Cloudflare serves `index.html` for unknown paths, so deep links like `/post/<id>` just work.

**Vercel** – same build command and output directory; `vercel.json` handles the SPA rewrites.

## 6. Mobile builds

```bash
npm i -g eas-cli
eas build -p android    # or -p ios
```
Add the two `EXPO_PUBLIC_*` variables as EAS environment variables first.

## What changed from the Emergent version

- Backend: FastAPI + MongoDB → Supabase Postgres with row-level security. Counts (followers, likes, comments, posts) are maintained by database triggers, so they can't drift or be tampered with.
- Auth: Google sign-in via Supabase (works on web and native; the old Expo auth proxy is gone). "Demo mode" is now a real guest account that can be upgraded to Google without losing posts.
- New: follow/unfollow from profiles, comments screen, delete own posts/comments, edit profile, infinite scroll feed.
- Fixed: logout/alerts did nothing on web; YouTube posts tried to play a web page as audio; tapping a user in search did nothing; user search exposed email addresses.
- Existing MongoDB data on Emergent is not carried over.
