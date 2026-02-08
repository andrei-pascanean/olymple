import { test, expect } from '@playwright/test';

// Helper: make a guess
async function makeGuess(page, country) {
  await page.fill('#searchCountries', country);
  await page.click('#guess-button');
  // Wait for flip animation to complete
  await page.waitForTimeout(2000);
}

// Helper: get today's correct answer from the game
async function getCorrectAnswer(page) {
  return await page.evaluate(() => {
    // Access the correct_country variable from the game's closure
    // We extract it by reading the toast that appears after game ends
    // Instead, replicate the puzzle selection logic
    function getDateString() {
      const now = new Date();
      return now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
    }
    function hashString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    }
    function mulberry32(seed) {
      return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function seededShuffle(arr, seed) {
      const shuffled = [...arr];
      const rng = mulberry32(seed);
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    const EPOCH = new Date('2025-01-01');
    const today = new Date();
    const daysSinceEpoch = Math.floor((today - EPOCH) / (1000 * 60 * 60 * 24));
    const gameMode = localStorage.getItem('olympleGameMode') || 'default';

    // We need medal data - fetch it synchronously via XMLHttpRequest
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/olympic-medals-v2.json', false);
    xhr.send();
    const medalData = JSON.parse(xhr.responseText);

    const CENTROID_NAME_MAP = {
      "Ivory Coast": "Côte d'Ivoire",
      "North Macedonia": "Macedonia [FYROM]",
      "Curaçao": "Netherlands Antilles",
      "Chinese Taipei": "Taiwan"
    };

    const xhr2 = new XMLHttpRequest();
    xhr2.open('GET', '/country-centroids.json', false);
    xhr2.send();
    const centroidData = JSON.parse(xhr2.responseText);

    const centroidByName = {};
    centroidData.forEach(c => { centroidByName[c.name] = true; });

    const nocs = Object.keys(medalData);
    let medalCountries = [];
    nocs.forEach(noc => {
      const medal = medalData[noc];
      const centroidName = CENTROID_NAME_MAP[medal.name] || medal.name;
      if (centroidByName[centroidName]) {
        medalCountries.push(medal.flag + ' ' + medal.name);
      }
    });

    if (gameMode === 'summer') {
      medalCountries = medalCountries.filter(k => {
        const noc = nocs.find(n => medalData[n].flag + ' ' + medalData[n].name === k);
        return noc && medalData[noc].summer.length > 0;
      });
    } else if (gameMode === 'winter') {
      medalCountries = medalCountries.filter(k => {
        const noc = nocs.find(n => medalData[n].flag + ' ' + medalData[n].name === k);
        return noc && medalData[noc].winter.length > 0;
      });
    }

    medalCountries.sort();
    const poolSize = medalCountries.length;
    const cycleNumber = Math.floor(daysSinceEpoch / poolSize);
    const dayInCycle = daysSinceEpoch % poolSize;
    const cycleSeedStr = 'cycle-' + cycleNumber + (gameMode !== 'default' ? '-' + gameMode : '');
    const cycleSeed = hashString(cycleSeedStr);
    const shuffled = seededShuffle(medalCountries, cycleSeed);
    return shuffled[dayInCycle];
  });
}

// Helper: get a wrong country (any country that isn't the correct answer)
async function getWrongCountries(page, correctAnswer) {
  return await page.evaluate((correct) => {
    const options = Array.from(document.querySelectorAll('#datalistCountries option'));
    return options
      .map(o => o.value)
      .filter(v => v !== correct)
      .slice(0, 5);
  }, correctAnswer);
}

test.describe('Page Load & UI Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('olympleHasPlayed', 'true');
    });
    await page.reload();
    await page.waitForSelector('#guess-button');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Olymple - Daily Olympic Medal Guessing Game');
  });

  test('game title is visible', async ({ page }) => {
    await expect(page.locator('#gameTitle')).toBeVisible();
    const text = await page.locator('#gameTitle').textContent();
    expect(text).toContain('Daily Olymple');
  });

  test('medal tables are present', async ({ page }) => {
    await expect(page.locator('#summerTableContainer, #winterTableContainer').first()).toBeVisible();
  });

  test('total medals display is shown', async ({ page }) => {
    const text = await page.locator('#totalMedalsDisplay').textContent();
    expect(text).toMatch(/Total: 🏅 \d+/);
  });

  test('guess input and button are present', async ({ page }) => {
    await expect(page.locator('#searchCountries')).toBeVisible();
    await expect(page.locator('#guess-button')).toBeVisible();
    await expect(page.locator('#guess-button')).toBeEnabled();
  });

  test('5 empty guess rows are present', async ({ page }) => {
    for (let i = 1; i <= 5; i++) {
      await expect(page.locator(`#guess_${i}`)).toBeVisible();
    }
  });

  test('hint container is hidden before first guess', async ({ page }) => {
    await expect(page.locator('#hintContainer')).toBeHidden();
  });

  test('datalist has country options', async ({ page }) => {
    const optionCount = await page.locator('#datalistCountries option').count();
    expect(optionCount).toBeGreaterThan(100);
  });
});

test.describe('Guess Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('olympleHasPlayed', 'true');
    });
    await page.reload();
    await page.waitForSelector('#guess-button');
  });

  test('valid guess renders a row with 4 cells', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);

    const cells = page.locator('#guess_1 .guess-cell');
    await expect(cells).toHaveCount(4);
  });

  test('guess row shows country, distance, direction, and accuracy', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);

    const inputs = page.locator('#guess_1 input');
    await expect(inputs).toHaveCount(4);

    // Country cell should contain the guessed country name
    const countryValue = await inputs.nth(0).inputValue();
    expect(countryValue).toBeTruthy();

    // Distance cell should end with 'km'
    const distValue = await inputs.nth(1).inputValue();
    expect(distValue).toMatch(/\d+km/);

    // Direction cell should be an arrow emoji or celebration
    const dirValue = await inputs.nth(2).inputValue();
    expect(dirValue).toBeTruthy();

    // Accuracy cell should end with '%'
    const accValue = await inputs.nth(3).inputValue();
    expect(accValue).toMatch(/\d+%/);
  });

  test('invalid country shows error toast', async ({ page }) => {
    await page.fill('#searchCountries', 'NotARealCountry');
    await page.click('#guess-button');

    await expect(page.locator('#liveErrorToast')).toBeVisible();
    const toastText = await page.locator('#liveErrorToast .toast-body').textContent();
    expect(toastText).toContain('Please select a valid country from the list');
  });

  test('duplicate guess shows error toast', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);
    await page.fill('#searchCountries', wrongCountries[0]);
    await page.click('#guess-button');

    await expect(page.locator('#liveErrorToast')).toBeVisible();
    const toastText = await page.locator('#liveErrorToast .toast-body').textContent();
    expect(toastText).toContain('You already guessed that country');
  });

  test('input clears after each guess', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);

    const inputValue = await page.locator('#searchCountries').inputValue();
    expect(inputValue).toBe('');
  });

  test('guess button disabled after 5 guesses', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    for (let i = 0; i < 5; i++) {
      await makeGuess(page, wrongCountries[i]);
    }

    await expect(page.locator('#guess-button')).toBeDisabled();
  });
});

test.describe('Correct Guess', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('olympleHasPlayed', 'true');
    });
    await page.reload();
    await page.waitForSelector('#guess-button');
  });

  test('correct guess shows 0km, celebration emoji, and 100%', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    await makeGuess(page, correctAnswer);

    const inputs = page.locator('#guess_1 input');
    const distValue = await inputs.nth(1).inputValue();
    expect(distValue).toBe('0km');

    const dirValue = await inputs.nth(2).inputValue();
    expect(dirValue).toBe('🎉');

    const accValue = await inputs.nth(3).inputValue();
    expect(accValue).toBe('100%');
  });

  test('correct guess row is highlighted gold', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    await makeGuess(page, correctAnswer);

    const firstInput = page.locator('#guess_1 input').first();
    const bgColor = await firstInput.evaluate(el => el.style.backgroundColor);
    expect(bgColor).toContain('rgb(255, 215, 0)');
  });

  test('correct guess shows end game modal with congratulations', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    await makeGuess(page, correctAnswer);

    await expect(page.locator('#endGameModal')).toBeVisible();
    const modalText = await page.locator('#endGameModal .modal-body').textContent();
    expect(modalText).toContain('Congratulations');
  });

  test('share button appears after winning', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    await makeGuess(page, correctAnswer);

    await expect(page.locator('#globalShareButton')).toBeVisible();
  });

  test('confetti button appears after winning', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    await makeGuess(page, correctAnswer);

    await expect(page.locator('button:has-text("Confetti")')).toBeVisible();
  });
});

test.describe('Loss Condition', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('olympleHasPlayed', 'true');
    });
    await page.reload();
    await page.waitForSelector('#guess-button');
  });

  test('5 wrong guesses shows loss modal', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    for (let i = 0; i < 5; i++) {
      await makeGuess(page, wrongCountries[i]);
    }

    await expect(page.locator('#endGameModal')).toBeVisible();
    const modalText = await page.locator('#endGameModal .modal-body').textContent();
    expect(modalText).toContain('Better luck next time');
  });

  test('correct answer toast shows after loss', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    for (let i = 0; i < 5; i++) {
      await makeGuess(page, wrongCountries[i]);
    }

    await expect(page.locator('#liveCorrectAnswerToast')).toBeVisible();
    const toastText = await page.locator('#liveCorrectAnswerToastMessage').textContent();
    expect(toastText).toContain('The correct answer was');
  });

  test('guess button disabled after loss', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    for (let i = 0; i < 5; i++) {
      await makeGuess(page, wrongCountries[i]);
    }

    await expect(page.locator('#guess-button')).toBeDisabled();
  });
});

test.describe('Hint System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('olympleHasPlayed', 'true');
    });
    await page.reload();
    await page.waitForSelector('#guess-button');
  });

  test('hints appear after first guess', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await expect(page.locator('#hintContainer')).toBeHidden();
    await makeGuess(page, wrongCountries[0]);
    await expect(page.locator('#hintContainer')).toBeVisible();
  });

  test('first hint unlocked after guess 1, others locked', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);

    await expect(page.locator('#hint-continent.hint-unlocked')).toBeVisible();
    await expect(page.locator('#hint-first-letter.hint-locked')).toBeVisible();
    await expect(page.locator('#hint-flag.hint-locked')).toBeVisible();
  });

  test('second hint unlocked after guess 2', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);
    await makeGuess(page, wrongCountries[1]);

    await expect(page.locator('#hint-first-letter.hint-unlocked, #hint-first-letter.hint-revealed')).toBeVisible();
  });

  test('third hint unlocked after guess 3', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);
    await makeGuess(page, wrongCountries[1]);
    await makeGuess(page, wrongCountries[2]);

    await expect(page.locator('#hint-flag.hint-unlocked, #hint-flag.hint-revealed')).toBeVisible();
  });

  test('clicking unlocked hint reveals its value', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);

    const hintCard = page.locator('#hint-continent.hint-unlocked');
    await hintCard.click();

    await expect(page.locator('#hint-continent.hint-revealed')).toBeVisible();
    await expect(page.locator('#hint-continent .hint-value')).toBeVisible();
  });

  test('clicking locked hint does nothing', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);

    // hint-flag is locked after 1 guess
    const lockedHint = page.locator('#hint-flag.hint-locked');
    await lockedHint.click({ force: true });

    // Should still be locked
    await expect(page.locator('#hint-flag.hint-locked')).toBeVisible();
  });

  test('revealed hints persist after page reload', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);
    await page.locator('#hint-continent.hint-unlocked').click();
    await expect(page.locator('#hint-continent.hint-revealed')).toBeVisible();

    await page.reload();
    await page.waitForSelector('#guess-button');

    await expect(page.locator('#hint-continent.hint-revealed')).toBeVisible();
  });
});

test.describe('Game State Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('olympleHasPlayed', 'true');
    });
    await page.reload();
    await page.waitForSelector('#guess-button');
  });

  test('guesses survive page reload', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    const wrongCountries = await getWrongCountries(page, correctAnswer);

    await makeGuess(page, wrongCountries[0]);
    const firstGuessCountry = await page.locator('#guess_1 input').first().inputValue();

    await page.reload();
    await page.waitForSelector('#guess-button');

    const restoredCountry = await page.locator('#guess_1 input').first().inputValue();
    expect(restoredCountry).toBe(firstGuessCountry);
  });

  test('completed game state survives reload', async ({ page }) => {
    const correctAnswer = await getCorrectAnswer(page);
    await makeGuess(page, correctAnswer);

    // Close the modal
    await page.locator('#endGameModal .btn-close').click();
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForSelector('#guess-button');

    await expect(page.locator('#guess-button')).toBeDisabled();
    await expect(page.locator('#globalShareButton')).toBeVisible();
  });
});

test.describe('How To Play Modal', () => {
  test('shows on first visit', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#guess-button');

    await expect(page.locator('#howToPlayModal')).toBeVisible();
    await expect(page.locator('#howToPlayModalLabel')).toContainText('How to Play');
  });

  test('does not show on subsequent visits', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('olympleHasPlayed', 'true');
    });
    await page.reload();
    await page.waitForSelector('#guess-button');

    await expect(page.locator('#howToPlayModal')).toBeHidden();
  });

  test('can be opened via info icon', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('olympleHasPlayed', 'true');
    });
    await page.reload();
    await page.waitForSelector('#guess-button');

    // Click the info icon (SVG with data-bs-target="#howToPlayModal")
    await page.locator('[data-bs-target="#howToPlayModal"]').click();

    await expect(page.locator('#howToPlayModal')).toBeVisible();
  });
});

test.describe('Game Mode Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('olympleHasPlayed', 'true');
    });
    await page.reload();
    await page.waitForSelector('#guess-button');
  });

  test('summer mode toggle updates game mode', async ({ page }) => {
    // Open settings
    await page.locator('[data-bs-target="#settingsOffcanvas"]').click();
    await expect(page.locator('#settingsOffcanvas')).toBeVisible();

    // Toggle summer mode - this triggers a page reload
    await page.locator('#summerModeToggle').check();
    await page.waitForSelector('#guess-button');

    const mode = await page.evaluate(() => localStorage.getItem('olympleGameMode'));
    expect(mode).toBe('summer');

    const titleText = await page.locator('#gameTitle').textContent();
    expect(titleText).toContain('☀️');
  });

  test('winter mode toggle updates game mode', async ({ page }) => {
    await page.locator('[data-bs-target="#settingsOffcanvas"]').click();
    await expect(page.locator('#settingsOffcanvas')).toBeVisible();

    await page.locator('#winterModeToggle').check();
    await page.waitForSelector('#guess-button');

    const mode = await page.evaluate(() => localStorage.getItem('olympleGameMode'));
    expect(mode).toBe('winter');

    const titleText = await page.locator('#gameTitle').textContent();
    expect(titleText).toContain('❄️');
  });
});

test.describe('Share Functionality', () => {
  test('share button copies correct format to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('olympleHasPlayed', 'true');
    });
    await page.reload();
    await page.waitForSelector('#guess-button');

    const correctAnswer = await getCorrectAnswer(page);
    await makeGuess(page, correctAnswer);

    // Click share button in the page (not modal)
    await page.locator('#endGameModal .btn-close').click();
    await page.waitForTimeout(500);
    await page.locator('#globalShareButton').click();
    await page.waitForTimeout(500);

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('#DailyOlymple');
    expect(clipboardText).toContain('1/5');
    expect(clipboardText).toContain('https://olymple.vercel.app');
    expect(clipboardText).toContain('🟩🟩🟩🟩🟩');
  });
});
