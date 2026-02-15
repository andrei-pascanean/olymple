# Olymple Testing Guide

## Automated Test Suite

Paste the following into the browser console to run all automated tests. Tests 2-4 require being signed in with Google.

```js
(async function runAllTests() {
    console.clear();
    console.log('==============================');
    console.log('  OLYMPLE TEST SUITE');
    console.log('==============================\n');

    let totalPassed = 0, totalFailed = 0;
    function assert(condition, name) {
        if (condition) { totalPassed++; console.log('PASS:', name); }
        else { totalFailed++; console.error('FAIL:', name); }
    }

    // === Test 1: Stats Logic (no Firebase needed) ===
    console.log('\n--- Stats Logic Tests ---');

    localStorage.removeItem('olympleStats-_t1');
    const s1 = updateStats('_t1', true, 3, '2026-01-10');
    assert(s1.gamesPlayed === 1, 'Win: gamesPlayed');
    assert(s1.gamesWon === 1, 'Win: gamesWon');
    assert(s1.guessDistribution[3] === 1, 'Win: distribution[3]');
    assert(s1.currentStreak === 1, 'Win: streak 1');

    const s2 = updateStats('_t1', true, 2, '2026-01-11');
    assert(s2.currentStreak === 2, 'Consecutive: streak 2');
    assert(s2.maxStreak === 2, 'Consecutive: maxStreak 2');

    const s3 = updateStats('_t1', false, 5, '2026-01-12');
    assert(s3.currentStreak === 0, 'Loss: streak 0');
    assert(s3.maxStreak === 2, 'Loss: maxStreak preserved');
    assert(s3.guessDistribution['X'] === 1, 'Loss: X incremented');

    const s4 = updateStats('_t1', true, 1, '2026-01-13');
    assert(s4.currentStreak === 1, 'Win after loss: streak 1');

    const s5 = updateStats('_t1', true, 4, '2026-01-20');
    assert(s5.currentStreak === 1, 'Gap: streak resets');

    const s6 = updateStats('_t1', true, 1, '2026-01-20');
    assert(s6.gamesPlayed === s5.gamesPlayed, 'No double recording');

    localStorage.removeItem('olympleStats-_t2');
    updateStats('_t2', true, 2, '2026-01-10');
    recordGameStarted('_t2', '2026-01-11');
    const s7 = updateStats('_t2', true, 3, '2026-01-12');
    assert(s7.currentStreak === 2, 'Started game preserves streak');

    assert(getWinPercentage({ gamesPlayed: 0 }) === 0, 'WinPct: 0 games');
    assert(getWinPercentage({ gamesPlayed: 10, gamesWon: 7 }) === 70, 'WinPct: 70%');
    assert(getWinPercentage({ gamesPlayed: 3, gamesWon: 1 }) === 33, 'WinPct: 33%');

    assert(getYesterdayStr('2026-01-01') === '2025-12-31', 'Yesterday: year boundary');
    assert(getYesterdayStr('2026-03-01') === '2026-02-28', 'Yesterday: month boundary');
    assert(getYesterdayStr('2026-02-15') === '2026-02-14', 'Yesterday: normal day');

    localStorage.removeItem('olympleStats-_t1');
    localStorage.removeItem('olympleStats-_t2');

    // === Test 2: Auth UI State ===
    console.log('\n--- Auth UI Tests ---');

    const user = fbAuth.currentUser;
    const loginIcon = document.getElementById('loginIconSvg');
    const loginAvatar = document.getElementById('loginAvatarImg');
    const signedOutSection = document.getElementById('accountSignedOut');
    const signedInSection = document.getElementById('accountSignedIn');

    if (user) {
        assert(loginIcon.style.display === 'none', 'Signed in: SVG icon hidden');
        assert(loginAvatar.style.display !== 'none', 'Signed in: avatar shown');
        assert(signedOutSection.style.display === 'none', 'Signed in: sign-out section hidden');
        assert(signedInSection.style.display === '', 'Signed in: sign-in section shown');
        assert(document.getElementById('accountName').textContent === user.displayName, 'Signed in: name matches');
        assert(document.getElementById('accountEmail').textContent === user.email, 'Signed in: email matches');
    } else {
        assert(loginIcon.style.display !== 'none', 'Signed out: SVG icon shown');
        assert(loginAvatar.style.display === 'none', 'Signed out: avatar hidden');
        assert(signedOutSection.style.display !== 'none', 'Signed out: sign-in button shown');
        assert(signedInSection.style.display === 'none', 'Signed out: profile hidden');
    }

    // === Test 3: Firestore Game State Sync (requires sign-in) ===
    if (user) {
        console.log('\n--- Firestore Game State Sync Tests ---');
        const uid = user.uid;

        const testKey = '2099-01-01-_test';
        const testState = {
            guesses: 3,
            performances: ['🟩🟩🟩🟩🟩'],
            guessedCountries: ['🇫🇷 France'],
            guessResults: [{ country: '🇫🇷 France', distance: 0, direction: '🎉', proximity: 100, isCorrect: true }],
            completed: true,
            won: true,
            hintsRevealed: [false, false, false]
        };
        await fbDb.collection('users').doc(uid).collection('gameState').doc(testKey).set(testState);
        assert(true, 'Write game state to Firestore');

        const loaded = await loadGameStateFromFirestore(testKey);
        assert(loaded !== null, 'Read game state from Firestore');
        assert(loaded.guesses === 3, 'Game state guesses match');
        assert(loaded.completed === true, 'Game state completed match');
        assert(loaded.won === true, 'Game state won match');
        assert(loaded.guessedCountries[0] === '🇫🇷 France', 'Game state countries match');

        const missing = await loadGameStateFromFirestore('9999-99-99-nonexistent');
        assert(missing === null, 'Missing game state returns null');

        const todayKey = getDateString() + '-' + getGameMode();
        const todayState = await loadGameStateFromFirestore(todayKey);
        if (todayState) {
            assert(typeof todayState.guesses === 'number', 'Today game state has guesses');
            assert(Array.isArray(todayState.guessResults), 'Today game state has guessResults');
        } else {
            console.log('SKIP: No today game state in Firestore yet');
        }

        await fbDb.collection('users').doc(uid).collection('gameState').doc(testKey).delete();
        assert(true, 'Cleanup test game state');
    } else {
        console.log('\nSKIP: Firestore game state tests (not signed in)');
    }

    // === Test 4: Stats Sync & Merge (requires sign-in) ===
    if (user) {
        console.log('\n--- Stats Sync & Merge Tests ---');
        const uid = user.uid;
        const testMode = '_synctest';

        const testStats = defaultStats();
        testStats.gamesPlayed = 5;
        testStats.gamesWon = 3;
        testStats.currentStreak = 2;
        testStats.maxStreak = 3;
        testStats.guessDistribution[2] = 2;
        testStats.guessDistribution[3] = 1;
        testStats.lastPlayedDate = '2026-02-15';
        testStats.lastPlayResult = 'win';

        await fbDb.collection('users').doc(uid).collection('stats').doc(testMode).set(testStats);
        const doc = await fbDb.collection('users').doc(uid).collection('stats').doc(testMode).get();
        assert(doc.exists, 'Stats written to Firestore');
        assert(doc.data().gamesPlayed === 5, 'Stats data correct in Firestore');

        const local = defaultStats();
        local.gamesPlayed = 3; local.gamesWon = 2; local.maxStreak = 2;
        local.currentStreak = 1; local.guessDistribution[1] = 1;
        local.lastPlayedDate = '2026-02-15'; local.lastPlayResult = 'win';

        const remote = defaultStats();
        remote.gamesPlayed = 7; remote.gamesWon = 5; remote.maxStreak = 4;
        remote.currentStreak = 3; remote.guessDistribution[1] = 2; remote.guessDistribution[3] = 3;
        remote.lastPlayedDate = '2026-02-14'; remote.lastPlayResult = 'win';

        const merged = mergeStats(local, remote);
        assert(merged.gamesPlayed === 7, 'Merge: max gamesPlayed');
        assert(merged.gamesWon === 5, 'Merge: max gamesWon');
        assert(merged.maxStreak === 4, 'Merge: max maxStreak');
        assert(merged.currentStreak === 1, 'Merge: newer date wins for currentStreak');
        assert(merged.lastPlayedDate === '2026-02-15', 'Merge: newer lastPlayedDate');
        assert(merged.guessDistribution[1] === 2, 'Merge: max distribution[1]');
        assert(merged.guessDistribution[3] === 3, 'Merge: max distribution[3]');

        const m2 = mergeStats(local, null);
        assert(m2.gamesPlayed === 3, 'Merge null remote: returns local');

        const m3 = mergeStats(defaultStats(), remote);
        assert(m3.gamesPlayed === 7, 'Merge empty local: returns remote');

        const m4 = mergeStats(defaultStats(), defaultStats());
        assert(m4.gamesPlayed === 0, 'Merge both empty: returns empty');

        saveStatsLocal(testMode, testStats);
        const fromLocal = localStorage.getItem('olympleStats-' + testMode);
        assert(fromLocal !== null, 'saveStatsLocal writes to localStorage');
        assert(JSON.parse(fromLocal).gamesPlayed === 5, 'localStorage data correct');

        localStorage.removeItem('olympleStats-' + testMode);
        await fbDb.collection('users').doc(uid).collection('stats').doc(testMode).delete();
        assert(true, 'Cleanup test stats');
    } else {
        console.log('\nSKIP: Stats sync tests (not signed in)');
    }

    // === Summary ===
    console.log('\n==============================');
    console.log(`  TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
    console.log('==============================');
})();
```

---

## Clearing Test Data

### Clear localStorage (browser console)
```js
localStorage.clear();
location.reload();
```

### Clear Firestore data (browser console, must be signed in)
```js
(async function() {
    const uid = fbAuth.currentUser.uid;
    const modes = ['default', 'summer', 'winter2026'];

    for (const mode of modes) {
        await fbDb.collection('users').doc(uid).collection('stats').doc(mode).delete();
    }

    const today = getDateString();
    for (const mode of modes) {
        await fbDb.collection('users').doc(uid).collection('gameState').doc(today + '-' + mode).delete();
    }

    console.log('Firestore data cleared for', uid);
})();
```

### Clear both (browser console, must be signed in)
```js
(async function() {
    const uid = fbAuth.currentUser.uid;
    const modes = ['default', 'summer', 'winter2026'];

    for (const mode of modes) {
        await fbDb.collection('users').doc(uid).collection('stats').doc(mode).delete();
    }

    const today = getDateString();
    for (const mode of modes) {
        await fbDb.collection('users').doc(uid).collection('gameState').doc(today + '-' + mode).delete();
    }

    localStorage.clear();
    console.log('All data cleared for', uid);
    location.reload();
})();
```

### Clear via Firebase console
Go to https://console.firebase.google.com → your project → Firestore Database → navigate to `users/{your-uid}` and delete the `stats` and `gameState` subcollections.

---

## Manual Test Scenarios

Before each scenario, clear both localStorage and Firestore using the scripts above.

### Scenario 1: Guest plays, then signs in (Rule 1)
1. Open the game (not signed in)
2. Play the game — make 2-3 guesses
3. Open the stats modal and note the stats
4. Sign in with Google
5. **Expected**: Game state unchanged on screen, stats unchanged
6. Check Firestore console — stats and game state should now exist under your UID
7. Reload the page
8. **Expected**: Game state and stats persist

### Scenario 2: Sign in first, then play (Rule 2)
1. Open the game
2. Sign in with Google immediately (before playing)
3. Play the game — make guesses
4. **Expected**: Each guess appears normally
5. Check Firestore console after each guess — game state should update
6. Complete the game
7. **Expected**: Stats update in both localStorage and Firestore

### Scenario 3: Pull game state from another device (Rule 3)
1. Play and complete a game while signed in (e.g. guess correctly in 3 tries)
2. Open an incognito window
3. Sign in with Google
4. **Expected**: Your completed game from step 1 appears (3 guesses shown, end-game popup)
5. Reload the incognito tab
6. **Expected**: Game state persists after reload

### Scenario 4: Firebase wins over local (Rule 3 priority)
1. Play and complete a game while signed in (e.g. guess correctly in 2 tries)
2. Open an incognito window
3. Play the game as a guest — make 1 guess (don't complete)
4. Sign in with Google
5. **Expected**: Your local 1-guess game is replaced by the completed 2-guess game from Firebase
6. **Expected**: No leftover guess rows from the local game

### Scenario 5: Stats display correctly after sync
1. Play several games over multiple days while signed in (or seed stats via console)
2. Open an incognito window and sign in
3. Open the stats modal
4. **Expected**: Games played, win %, streaks, and guess distribution all match the original

### Scenario 6: Sign out preserves local play
1. Sign in and play a game
2. Sign out via settings
3. **Expected**: Game state stays on screen (still in localStorage)
4. Reload the page
5. **Expected**: Game state persists from localStorage
6. Stats modal still works (shows localStorage stats)

### Scenario 7: No reload loops
1. Open the game
2. Sign in with Google
3. **Expected**: No page flickering or infinite reloads
4. Reload manually 3-4 times
5. **Expected**: Page loads cleanly each time, game state persists

### Scenario 8: Fresh user, no data anywhere
1. Clear both localStorage and Firestore
2. Open the game and sign in
3. **Expected**: Fresh game, empty stats (0 games played), no errors in console
4. Play and complete the game
5. **Expected**: Stats show 1 game played, Firestore has the data

### Scenario 9: Game mode switching while signed in
1. Sign in and play a game in winter mode
2. Switch to summer mode via settings
3. Play a game in summer mode
4. Check Firestore — both `winter2026` and `summer` should have separate stats and game states
5. Switch back to winter mode
6. **Expected**: Winter game state is restored

### Scenario 10: Incognito guest stats don't leak into signed-in stats
1. While signed in on a normal tab, note your stats (e.g. 5 games played)
2. Open incognito, play a game as guest (don't sign in)
3. Open another incognito tab, sign in
4. **Expected**: Stats show 5 games played (from Firestore), NOT 6
5. The guest game from step 2 should not affect your signed-in stats
