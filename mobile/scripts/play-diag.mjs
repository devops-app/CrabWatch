// Diagnostic: query Google Play Android Publisher API directly.
// Usage: node scripts/play-diag.mjs
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const KEY = JSON.parse(readFileSync(new URL('../google-service-account.json', import.meta.url), 'utf8'));
const PACKAGE = 'com.dsigncodehub.crabwatch';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

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

async function api(token, path, method = 'GET') {
  const res = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: method === 'POST' ? '{}' : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

const token = await getAccessToken();
console.log('✔ access token acquired for', KEY.client_email);

// 1. Create an edit
const edit = await api(token, '/edits', 'POST');
console.log('\n=== edits.create ===', edit.status);
if (edit.status !== 200) {
  console.log(JSON.stringify(edit.body, null, 2));
  process.exit(0);
}
const editId = edit.body.id;
console.log('edit id:', editId);

// 2. List tracks
const tracks = await api(token, `/edits/${editId}/tracks`);
console.log('\n=== tracks.list ===', tracks.status);
if (tracks.status === 200) {
  for (const t of tracks.body.tracks || []) {
    const ver = (t.release?.versionCodes || []).map(v => v.versionCode).join(',');
    console.log(`track: ${t.track}  status: ${t.release?.status}  versionCodes: ${ver}`);
  }
} else {
  console.log(JSON.stringify(tracks.body, null, 2));
}

// 3. App details (listing presence)
const details = await api(token, `/edits/${editId}/details/en-US`);
console.log('\n=== details.get (en-US) ===', details.status);
if (details.status === 200) {
  const d = details.body;
  console.log('title:', d.title || '(empty)');
  console.log('shortDescription:', d.shortDescription ? `${d.shortDescription.length} chars` : '(empty)');
  console.log('fullDescription:', d.fullDescription ? `${d.fullDescription.length} chars` : '(empty)');
  console.log('defaultLanguage:', d.defaultLanguage);
} else {
  console.log(JSON.stringify(details.body, null, 2));
}

// 4. Images (screenshots)
const images = await api(token, `/edits/${editId}/images/en-US/phoneScreenshots`);
console.log('\n=== images.list (en-US phoneScreenshots) ===', images.status);
if (images.status === 200) {
  console.log('screenshot sets:', (images.body.images || []).length);
} else {
  console.log(JSON.stringify(images.body, null, 2));
}

// 5. Testers for closed track
const closed = await api(token, `/edits/${editId}/tracks/closed`);
console.log('\n=== tracks.get (closed) ===', closed.status);
if (closed.status === 200) {
  console.log('status:', closed.body.release?.status);
  console.log('versionCodes:', (closed.body.release?.versionCodes || []).map(v => v.versionCode).join(','));
} else {
  console.log(JSON.stringify(closed.body, null, 2));
}

// 6. Delete the edit (no changes made)
const delRes = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/edits/${editId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});
console.log('\n=== edits.delete ===', delRes.status);
