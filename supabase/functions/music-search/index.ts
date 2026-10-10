// Supabase Edge Function: music search (Spotify + YouTube).
// Keeps API secrets server-side. Requires a signed-in user (JWT verified by Supabase).
//
// Secrets (supabase secrets set ...):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, YOUTUBE_API_KEY

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  image_url: string | null;
  preview_url: string | null;
  external_url: string;
  source: 'spotify' | 'youtube';
};

let spotifyToken: { value: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && Date.now() < spotifyToken.expiresAt - 60_000) return spotifyToken.value;

  const id = Deno.env.get('SPOTIFY_CLIENT_ID');
  const secret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!id || !secret) throw new Error('Spotify is not configured');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Spotify auth failed (${res.status})`);
  const json = await res.json();
  spotifyToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return spotifyToken.value;
}

async function searchSpotify(q: string): Promise<Track[]> {
  const token = await getSpotifyToken();
  const url = new URL('https://api.spotify.com/v1/search');
  url.searchParams.set('q', q);
  url.searchParams.set('type', 'track');
  url.searchParams.set('limit', '20');

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Spotify search failed (${res.status})`);
  const data = await res.json();

  // deno-lint-ignore no-explicit-any
  return (data.tracks?.items ?? []).map((item: any): Track => ({
    id: item.id,
    title: item.name,
    // deno-lint-ignore no-explicit-any
    artist: item.artists.map((a: any) => a.name).join(', '),
    album: item.album?.name ?? '',
    image_url: item.album?.images?.[0]?.url ?? null,
    preview_url: item.preview_url ?? null,
    external_url: item.external_urls?.spotify ?? `https://open.spotify.com/track/${item.id}`,
    source: 'spotify',
  }));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function searchYouTube(q: string): Promise<Track[]> {
  const key = Deno.env.get('YOUTUBE_API_KEY');
  if (!key) throw new Error('YouTube is not configured');

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', q);
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoCategoryId', '10');
  url.searchParams.set('maxResults', '20');
  url.searchParams.set('key', key);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube search failed (${res.status})`);
  const data = await res.json();

  // deno-lint-ignore no-explicit-any
  return (data.items ?? []).map((item: any): Track => ({
    id: item.id.videoId,
    title: decodeEntities(item.snippet.title),
    artist: decodeEntities(item.snippet.channelTitle),
    album: '',
    image_url: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? null,
    preview_url: null, // YouTube has no audio preview; the app opens the video instead
    external_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    source: 'youtube',
  }));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { q, source } = await req.json();
    const query = String(q ?? '').trim().slice(0, 100);
    if (query.length < 2) return json({ tracks: [] });
    if (source !== 'spotify' && source !== 'youtube') return json({ error: 'Invalid source' }, 400);

    const tracks = source === 'spotify' ? await searchSpotify(query) : await searchYouTube(query);
    return json({ tracks });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : 'Search failed' }, 502);
  }
});
