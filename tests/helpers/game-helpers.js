/**
 * Make a guess and wait for the flip animation.
 */
async function makeGuess(page, country) {
  await page.fill('#searchCountries', country);
  await page.click('#guess-button');
  await page.waitForTimeout(2000);
}

/**
 * Get today's correct answer by replicating the puzzle selection logic.
 * Also exposes medalCountries on the window for other helpers.
 */
async function getCorrectAnswer(page) {
  return await page.evaluate(() => {
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
    const gameMode = localStorage.getItem('olympleGameMode') || 'winter2026';

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

    // Also load 2026 participating countries if in winter2026 mode
    let noc2026Names = new Set();
    if (gameMode === 'winter2026') {
      const xhr3 = new XMLHttpRequest();
      xhr3.open('GET', '/2026_participating_countries.json', false);
      xhr3.send();
      const participatingData = JSON.parse(xhr3.responseText);
      participatingData['2026_Winter_Olympics_NOCs'].forEach(c => {
        let name = c.noc;
        if (name === 'Individual Neutral Athletes') return;
        if (name === 'Italy (host)') name = 'Italy';
        if (name === 'Great Britain') name = 'United Kingdom';
        noc2026Names.add(name);
      });
    }

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
    } else if (gameMode === 'winter2026') {
      medalCountries = medalCountries.filter(k => {
        const noc = nocs.find(n => medalData[n].flag + ' ' + medalData[n].name === k);
        return noc && noc2026Names.has(medalData[noc].name) && medalData[noc].winter.length > 0;
      });
    }

    medalCountries.sort();
    const poolSize = medalCountries.length;
    const cycleNumber = Math.floor(daysSinceEpoch / poolSize);
    const dayInCycle = daysSinceEpoch % poolSize;
    const modeSuffix = gameMode !== 'default' ? '-' + gameMode : '';
    const cycleSeedStr = 'cycle-' + cycleNumber + modeSuffix;
    const cycleSeed = hashString(cycleSeedStr);
    const shuffled = seededShuffle(medalCountries, cycleSeed);

    // Expose medal countries for getWrongCountries
    window.__testMedalCountries = medalCountries;

    return shuffled[dayInCycle];
  });
}

/**
 * Get wrong countries for testing.
 * Must be called AFTER getCorrectAnswer (which populates window.__testMedalCountries).
 */
async function getWrongCountries(page, correctAnswer) {
  return await page.evaluate((correct) => {
    const countries = window.__testMedalCountries || [];
    return countries
      .filter(v => v !== correct)
      .slice(0, 5);
  }, correctAnswer);
}

/**
 * Get today's date string matching the app's format.
 */
function getDateString() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
}

export { makeGuess, getCorrectAnswer, getWrongCountries, getDateString };
