import { test, expect } from '@playwright/test';
import { makeGuess, getCorrectAnswer, getWrongCountries, getDateString } from './helpers/game-helpers.js';
import { createTestUser, signInOnPage, signOutOnPage, clearEmulators, waitForFirestoreDoc } from './helpers/firebase-emulator.js';

const EMULATOR_URL = '/?emulator=true';

async function setupPage(page) {
  await page.goto(EMULATOR_URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('olympleHasPlayed', 'true');
  });
  await page.reload();
  await page.waitForSelector('#guess-button');
}

async function getActiveMode(page) {
  return await page.evaluate(() => {
    const stored = localStorage.getItem('olympleGameMode');
    if (stored === 'winter') return 'winter2026';
    return stored || 'winter2026';
  });
}

test.describe('Firebase Auth & Sync', () => {
  test.beforeEach(async () => {
    await clearEmulators();
  });

  // Scenario 1: Guest plays, then signs in
  test('local game state and stats push to Firestore on sign-in', async ({ page }) => {
    const user = await createTestUser();
    await setupPage(page);

    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    // Play as guest — make a wrong guess then win to generate stats
    await makeGuess(page, wrongCountries[0]);
    await makeGuess(page, correctAnswer);
    await page.waitForTimeout(1000);

    // Sign in
    await signInOnPage(page, user.email);
    await page.waitForTimeout(2000);

    // Verify game state pushed to Firestore
    const mode = await getActiveMode(page);
    const key = getDateString() + '-' + mode;
    const firestoreState = await waitForFirestoreDoc(`users/${user.uid}/gameState/${key}`);
    expect(firestoreState).not.toBeNull();

    // Verify stats pushed to Firestore
    const firestoreStats = await waitForFirestoreDoc(`users/${user.uid}/stats/${mode}`);
    expect(firestoreStats).not.toBeNull();
  });

  // Scenario 2: Sign in first, then play
  test('each guess syncs to Firestore when signed in', async ({ page }) => {
    const user = await createTestUser();
    await setupPage(page);

    await signInOnPage(page, user.email);
    await page.waitForTimeout(1000);

    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);
    await page.waitForTimeout(1000);

    const mode = await getActiveMode(page);
    const key = getDateString() + '-' + mode;
    const doc = await waitForFirestoreDoc(`users/${user.uid}/gameState/${key}`);
    expect(doc).not.toBeNull();
  });

  // Scenario 3: Pull game state from another device
  test('completed game from another device appears in new context', async ({ browser }) => {
    const user = await createTestUser();

    // Device A: play and complete the game
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPage(pageA);

    await signInOnPage(pageA, user.email);
    await pageA.waitForTimeout(1000);

    const correctAnswer = await getCorrectAnswer(pageA);
    await makeGuess(pageA, correctAnswer);
    await pageA.waitForTimeout(2000);

    // Device B: new context, sign in
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPage(pageB);

    await signInOnPage(pageB, user.email);
    await pageB.waitForTimeout(3000);

    // Game should be completed
    await expect(pageB.locator('#guess-button')).toBeDisabled();

    // First guess row should show the correct answer
    const firstRowCountry = await pageB.locator('#guess_1 input').first().inputValue();
    expect(firstRowCountry).toBeTruthy();

    await contextA.close();
    await contextB.close();
  });

  // Scenario 4: Firebase wins over local
  test('remote game state overwrites local with no leftover rows', async ({ page }) => {
    const user = await createTestUser();
    await setupPage(page);

    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    // Make 2 wrong guesses as guest
    await makeGuess(page, wrongCountries[0]);
    await makeGuess(page, wrongCountries[1]);

    // Seed Firestore with a completed 1-guess game via page context
    const mode = await getActiveMode(page);
    const key = getDateString() + '-' + mode;
    await page.evaluate(
      async ({ uid, key, correctAnswer }) => {
        const state = {
          guesses: 1,
          performances: ['🟩🟩🟩🟩🟩'],
          guessedCountries: [correctAnswer],
          guessResults: [{ country: correctAnswer, distance: 0, direction: '🎉', proximity: 100, isCorrect: true }],
          completed: true,
          won: true,
          hintsRevealed: [false, false, false]
        };
        await fbDb.collection('users').doc(uid).collection('gameState').doc(key).set(state);
      },
      { uid: user.uid, key, correctAnswer }
    );

    // Sign in — remote should overwrite local
    await signInOnPage(page, user.email);
    await page.waitForTimeout(3000);

    // Game should show as completed
    await expect(page.locator('#guess-button')).toBeDisabled();

    // Row 2 should be empty (no leftover from local guess)
    const row2Inputs = await page.locator('#guess_2 .guess-cell').count();
    expect(row2Inputs).toBe(0);
  });

  // Scenario 5: Stats display correctly after sync
  test('stats display correctly after sync from Firestore', async ({ page }) => {
    const user = await createTestUser();
    await setupPage(page);

    // Seed Firestore with stats
    const mode = await getActiveMode(page);
    await page.evaluate(
      async ({ uid, mode }) => {
        const stats = {
          gamesPlayed: 10,
          gamesWon: 8,
          currentStreak: 3,
          maxStreak: 5,
          lastPlayedDate: null,
          lastPlayResult: 'win',
          lastStartedDate: null,
          guessDistribution: { 1: 2, 2: 3, 3: 2, 4: 1, 5: 0, X: 2 }
        };
        await fbDb.collection('users').doc(uid).collection('stats').doc(mode).set(stats);
      },
      { uid: user.uid, mode }
    );

    // Sign in to trigger sync
    await signInOnPage(page, user.email);
    await page.waitForTimeout(2000);

    // Open stats modal
    await page.locator('#statsButton').click();
    await page.waitForTimeout(500);

    // Verify stats are rendered
    const statsText = await page.locator('#statsModal').textContent();
    expect(statsText).toContain('10');  // gamesPlayed
    expect(statsText).toContain('80');  // win percentage
  });

  // Scenario 6: Sign out preserves local play
  test('sign out preserves local game state', async ({ page }) => {
    const user = await createTestUser();
    await setupPage(page);

    await signInOnPage(page, user.email);
    await page.waitForTimeout(1000);

    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);
    await makeGuess(page, wrongCountries[0]);

    const guessedCountry = await page.locator('#guess_1 input').first().inputValue();

    // Sign out
    await signOutOnPage(page);
    await page.waitForTimeout(1000);

    // Guess should still be visible
    const afterSignOut = await page.locator('#guess_1 input').first().inputValue();
    expect(afterSignOut).toBe(guessedCountry);

    // Login icon should be visible (not avatar)
    await expect(page.locator('#loginIconSvg')).toBeVisible();
  });

  // Scenario 7: No reload loops
  test('auth state change does not cause reload loops', async ({ page }) => {
    const user = await createTestUser();
    await setupPage(page);

    let navigationCount = 0;
    page.on('load', () => navigationCount++);

    await signInOnPage(page, user.email);
    await page.waitForTimeout(5000);

    // Should have 0 additional page loads after sign-in
    expect(navigationCount).toBe(0);
  });

  // Scenario 8: Fresh user, no data anywhere
  test('fresh user with no data starts clean', async ({ page }) => {
    const user = await createTestUser('fresh@example.com', 'Fresh User');
    await setupPage(page);

    await signInOnPage(page, 'fresh@example.com');
    await page.waitForTimeout(2000);

    // Game should be in initial state
    await expect(page.locator('#guess-button')).toBeEnabled();

    // No guess rows should have guess cells
    for (let i = 1; i <= 5; i++) {
      const cells = await page.locator(`#guess_${i} .guess-cell`).count();
      expect(cells).toBe(0);
    }

    // Auth UI should show signed-in state — open settings and check account panel
    await page.locator('[data-bs-target="#settingsOffcanvas"]').click();
    await expect(page.locator('#accountSignedIn')).toBeVisible();
  });

  // Scenario 9: Game mode switching while signed in
  test('game mode switch syncs correct mode to Firestore', async ({ page }) => {
    const user = await createTestUser();
    await setupPage(page);

    await signInOnPage(page, user.email);
    await page.waitForTimeout(1000);

    // Make a guess in winter mode
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);
    await makeGuess(page, wrongCountries[0]);
    await page.waitForTimeout(1000);

    // Switch to summer mode (triggers reload, ?emulator persists)
    await page.locator('[data-bs-target="#settingsOffcanvas"]').click();
    await expect(page.locator('#settingsOffcanvas')).toBeVisible();
    await page.locator('#summerModeToggle').check();
    await page.waitForSelector('#guess-button');
    await page.waitForTimeout(2000);

    // Make a guess in summer mode
    const summerCorrect = await getCorrectAnswer(page);
    const summerWrong = await getWrongCountries(page, summerCorrect);
    await makeGuess(page, summerWrong[0]);
    await page.waitForTimeout(1000);

    // Both modes should have game state in Firestore
    const winterKey = getDateString() + '-winter2026';
    const summerKey = getDateString() + '-summer';

    const winterDoc = await waitForFirestoreDoc(`users/${user.uid}/gameState/${winterKey}`);
    const summerDoc = await waitForFirestoreDoc(`users/${user.uid}/gameState/${summerKey}`);

    expect(winterDoc).not.toBeNull();
    expect(summerDoc).not.toBeNull();
  });

  // Scenario 10: Guest stats don't leak into signed-in account
  test('guest stats do not leak into signed-in account', async ({ browser }) => {
    const user = await createTestUser();

    // Context A: play as guest and build up stats
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await setupPage(guestPage);

    const correctAnswer = await getCorrectAnswer(guestPage);
    await makeGuess(guestPage, correctAnswer);
    await guestPage.waitForTimeout(2000);

    // Verify guest has stats in localStorage
    const guestStats = await guestPage.evaluate(() => {
      const raw = localStorage.getItem('olympleStats-winter2026');
      return raw ? JSON.parse(raw) : null;
    });
    expect(guestStats).not.toBeNull();
    expect(guestStats.gamesPlayed).toBe(1);

    await guestContext.close();

    // Context B: sign in on a clean context
    const authContext = await browser.newContext();
    const authPage = await authContext.newPage();
    await setupPage(authPage);

    await signInOnPage(authPage, user.email);
    await authPage.waitForTimeout(2000);

    // The signed-in user should have 0 games (no Firestore data, clean localStorage)
    const authStats = await authPage.evaluate(() => {
      const raw = localStorage.getItem('olympleStats-winter2026');
      return raw ? JSON.parse(raw) : null;
    });
    expect(authStats === null || authStats.gamesPlayed === 0).toBeTruthy();

    await authContext.close();
  });
});
