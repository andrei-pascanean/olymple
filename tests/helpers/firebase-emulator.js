const EMULATOR_AUTH_URL = 'http://localhost:9099';
const EMULATOR_FIRESTORE_URL = 'http://localhost:8082';
const PROJECT_ID = 'olymple';

/**
 * Create a test user in the Auth Emulator via REST API.
 */
async function createTestUser(email = 'testuser@example.com', displayName = 'Test User') {
  const resp = await fetch(
    `${EMULATOR_AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'testpassword123',
        displayName,
        returnSecureToken: true,
      }),
    }
  );
  const data = await resp.json();
  return {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
  };
}

/**
 * Sign in on a page using email/password via the Firebase SDK.
 * Must be called AFTER page.goto('/?emulator=true').
 */
async function signInOnPage(page, email = 'testuser@example.com', password = 'testpassword123') {
  return await page.evaluate(
    async ({ email, password }) => {
      const cred = await fbAuth.signInWithEmailAndPassword(email, password);
      return {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
      };
    },
    { email, password }
  );
}

/**
 * Sign out on a page.
 */
async function signOutOnPage(page) {
  await page.evaluate(() => fbAuth.signOut());
}

/**
 * Read a Firestore document from the emulator via REST API.
 */
async function readFirestoreDoc(path) {
  const url = `${EMULATOR_FIRESTORE_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
  const resp = await fetch(url);
  if (resp.status === 404) return null;
  const data = await resp.json();
  return data.fields || null;
}

/**
 * Poll for a Firestore document to appear (for async sync operations).
 */
async function waitForFirestoreDoc(path, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const doc = await readFirestoreDoc(path);
    if (doc) return doc;
    await new Promise(r => setTimeout(r, 200));
  }
  return null;
}

/**
 * Clear all data from Auth and Firestore emulators.
 */
async function clearEmulators() {
  await fetch(
    `${EMULATOR_AUTH_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: 'DELETE' }
  );
  await fetch(
    `${EMULATOR_FIRESTORE_URL}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' }
  );
}

export {
  createTestUser,
  signInOnPage,
  signOutOnPage,
  readFirestoreDoc,
  waitForFirestoreDoc,
  clearEmulators,
  EMULATOR_AUTH_URL,
  EMULATOR_FIRESTORE_URL,
  PROJECT_ID,
};
