# Test Coverage Report

Generated: 2026-02-15 15:40

## Summary

| Metric | Count |
|--------|-------|
| Total tests | 47 |
| Passed | 47 |
| Failed | 0 |
| Pass rate | 100% |

Total duration: 172.4s

## auth-sync.spec.js (10/10)

### Firebase Auth & Sync

| # | Test | Status | Duration |
|---|------|--------|----------|
| 1 | local game state and stats push to Firestore on sign-in | PASS | 8.1s |
| 2 | each guess syncs to Firestore when signed in | PASS | 4.6s |
| 3 | completed game from another device appears in new context | PASS | 9.1s |
| 4 | remote game state overwrites local with no leftover rows | PASS | 7.7s |
| 5 | stats display correctly after sync from Firestore | PASS | 3.2s |
| 6 | sign out preserves local game state | PASS | 4.6s |
| 7 | auth state change does not cause reload loops | PASS | 5.6s |
| 8 | fresh user with no data starts clean | PASS | 2.6s |
| 9 | game mode switch syncs correct mode to Firestore | PASS | 10.2s |
| 10 | guest stats do not leak into signed-in account | PASS | 7.1s |

## game.spec.js (37/37)

### Page Load & UI Elements

| # | Test | Status | Duration |
|---|------|--------|----------|
| 1 | page loads with correct title | PASS | 0.8s |
| 2 | game title is visible | PASS | 0.5s |
| 3 | medal tables are present | PASS | 0.8s |
| 4 | total medals display is shown | PASS | 0.5s |
| 5 | guess input and button are present | PASS | 0.5s |
| 6 | 5 empty guess rows are present | PASS | 0.5s |
| 7 | hint container is hidden before first guess | PASS | 0.5s |
| 8 | autocomplete shows country suggestions | PASS | 1.0s |

### Guess Flow

| # | Test | Status | Duration |
|---|------|--------|----------|
| 1 | valid guess renders a row with 4 cells | PASS | 2.6s |
| 2 | guess row shows country, distance, direction, and accuracy | PASS | 2.5s |
| 3 | invalid country shows error toast | PASS | 0.6s |
| 4 | duplicate guess shows error toast | PASS | 2.6s |
| 5 | input clears after each guess | PASS | 2.5s |
| 6 | guess button disabled after 5 guesses | PASS | 10.7s |

### Correct Guess

| # | Test | Status | Duration |
|---|------|--------|----------|
| 1 | correct guess shows 0km, celebration emoji, and 100% | PASS | 2.5s |
| 2 | correct guess row is highlighted gold | PASS | 2.6s |
| 3 | correct guess shows end game modal with congratulations | PASS | 2.7s |
| 4 | share button appears after winning | PASS | 2.6s |
| 5 | confetti button appears after winning | PASS | 2.6s |

### Loss Condition

| # | Test | Status | Duration |
|---|------|--------|----------|
| 1 | 5 wrong guesses shows loss modal | PASS | 10.7s |
| 2 | correct answer toast shows after loss | PASS | 10.7s |
| 3 | guess button disabled after loss | PASS | 10.7s |

### Hint System

| # | Test | Status | Duration |
|---|------|--------|----------|
| 1 | hints appear after first guess | PASS | 2.6s |
| 2 | first hint unlocked after guess 1, others locked | PASS | 2.6s |
| 3 | second hint unlocked after guess 2 | PASS | 4.6s |
| 4 | third hint unlocked after guess 3 | PASS | 6.6s |
| 5 | clicking unlocked hint reveals its value | PASS | 2.7s |
| 6 | clicking locked hint does nothing | PASS | 2.5s |
| 7 | revealed hints persist after page reload | PASS | 2.6s |

### Game State Persistence

| # | Test | Status | Duration |
|---|------|--------|----------|
| 1 | guesses survive page reload | PASS | 2.6s |
| 2 | completed game state survives reload | PASS | 3.1s |

### How To Play Modal

| # | Test | Status | Duration |
|---|------|--------|----------|
| 1 | shows on first visit | PASS | 0.8s |
| 2 | does not show on subsequent visits | PASS | 0.5s |
| 3 | can be opened via info icon | PASS | 0.9s |

### Game Mode Switching

| # | Test | Status | Duration |
|---|------|--------|----------|
| 1 | summer mode toggle updates game mode | PASS | 1.0s |
| 2 | winter mode toggle updates game mode | PASS | 1.4s |

### Share Functionality

| # | Test | Status | Duration |
|---|------|--------|----------|
| 1 | share button copies correct format to clipboard | PASS | 3.7s |

## Feature Coverage

| Feature Area | Covered By |
|-------------|------------|
| Page load & UI rendering | game.spec.js - Page Load & UI Elements |
| Country guessing flow | game.spec.js - Guess Flow |
| Correct guess handling | game.spec.js - Correct Guess |
| Loss condition handling | game.spec.js - Loss Condition |
| Hint system (unlock/reveal/persist) | game.spec.js - Hint System |
| Game state persistence (localStorage) | game.spec.js - Game State Persistence |
| How To Play modal | game.spec.js - How To Play Modal |
| Game mode switching (summer/winter) | game.spec.js - Game Mode Switching |
| Share functionality | game.spec.js - Share Functionality |
| Guest-to-signed-in sync | auth-sync.spec.js - Scenarios 1-2 |
| Cross-device sync | auth-sync.spec.js - Scenario 3 |
| Remote overwrite of local state | auth-sync.spec.js - Scenario 4 |
| Stats sync from Firestore | auth-sync.spec.js - Scenario 5 |
| Sign-out state preservation | auth-sync.spec.js - Scenario 6 |
| No reload loops on auth | auth-sync.spec.js - Scenario 7 |
| Fresh user clean state | auth-sync.spec.js - Scenario 8 |
| Game mode switch sync | auth-sync.spec.js - Scenario 9 |
| Guest stats isolation | auth-sync.spec.js - Scenario 10 |

## Not Covered

- Google OAuth sign-in flow (cannot be automated; Google blocks bot sign-ins)
- Offline/network failure scenarios
- Concurrent multi-device editing (race conditions)
- Timezone edge cases (date rollover)
- Mobile-specific interactions (touch, responsive layout)
