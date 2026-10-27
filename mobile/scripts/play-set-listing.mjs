// Set the Google Play store listing (en-US) so the production track can accept a release.
// Usage: node scripts/play-set-listing.mjs
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const KEY = JSON.parse(readFileSync(new URL('../google-service-account.json', import.meta.url), 'utf8'));
const PACKAGE = 'com.dsigncodehub.crabwatch';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

const LISTING = {
  language: 'en-US',
  title: 'CrabWatch',
  shortDescription:
    'AI-guided crab observation: capture, identify species, and contribute to marine research.',
  fullDescription: [
    'CrabWatch is an AI-guided field tool for observing and documenting crabs.',
    '',
    'Take guided photos of a single crab, and our AI identifies the species, estimates carapace size using a coin reference, and flags the observation for researcher review. Unknown species are automatically added to the database, so the app keeps learning as you explore.',
    '',
    'Key features:',
    '- AI species detection with confidence scoring and researcher validation',
    '- Guided multi-angle capture (dorsal, ventral, close-up) with on-device quality checks',
    '- Coin-reference size estimation (MYR series) for consistent measurements',
    '- GPS location capture with map picker',
    '- Analytics: size frequency, gender ratio, CW50, condition index, species distribution, and trends',
    '- Gamification: XP, levels, streaks, missions, achievements, and a community leaderboard',
    '- Bilingual: English and Bahasa Melayu',
    '',
    'Built for researchers, students, and citizen scientists documenting crab populations.',
  ].join('\n'),
  videoUrl: null,
};

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: KEY.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = b64url(signer.sign(KEY.private_key));
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(`${header}.${claims}.${signature}`)}`,
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(tokenJson));
  return tokenJson.access_token;
}

async function api(token, path, method = 'GET', body) {
  const res = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

const token = await getAccessToken();
console.log('access token acquired for', KEY.client_email);

const edit = await api(token, '/edits', 'POST');
if (edit.status !== 200) {
  console.log('edits.create failed:', edit.status, JSON.stringify(edit.body, null, 2));
  process.exit(1);
}
const editId = edit.body.id;
console.log('edit id:', editId);

// Set the en-US listing
const setRes = await api(token, `/edits/${editId}/details/en-US`, 'PUT', LISTING);
console.log('\n=== details.set (en-US) ===', setRes.status);
if (setRes.status !== 200) {
  console.log(JSON.stringify(setRes.body, null, 2));
  // Try to delete the edit to avoid leaving a dangling one
  await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/edits/${editId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  process.exit(1);
}
console.log('title:', setRes.body.title);
console.log('shortDescription:', setRes.body.shortDescription);
console.log('fullDescription length:', setRes.body.fullDescription?.length);

// Commit the edit
const commit = await api(token, `/edits/${editId}/commit`, 'POST');
console.log('\n=== edits.commit ===', commit.status);
if (commit.status !== 200) {
  console.log(JSON.stringify(commit.body, null, 2));
  process.exit(1);
}
console.log('Listing committed successfully.');
