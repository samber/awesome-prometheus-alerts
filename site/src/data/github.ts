import { GITHUB_TOKEN } from 'astro:env/server';
import { GITHUB_API_REPO_URL } from './site';

// Every page includes <Header>, which needs the star count, so this module-level
// cache ensures a single build only ever fires one request instead of one per page.
let starsPromise: Promise<number> | null = null;

export function getGithubStars(): Promise<number> {
  if (!starsPromise) {
    starsPromise = fetchGithubStars().catch((err) => {
      starsPromise = null;
      throw err;
    });
  }
  return starsPromise;
}

async function fetchGithubStars(): Promise<number> {
  const headers: Record<string, string> = { 'Accept': 'application/vnd.github+json' };
  // Authenticating raises the rate limit from 60 to 5000 req/hour, which matters
  // in CI where runners share IPs and easily trip the unauthenticated limit.
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  const res = await fetch(GITHUB_API_REPO_URL, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.stargazers_count ?? 0;
}
