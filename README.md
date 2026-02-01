# Olymple

A daily Olympic medal guessing game. Players are shown medal counts across summer and winter sports and have 5 guesses to identify the country. After each guess, the game reveals distance, direction, and proximity to the correct answer.

## Bugs

- [x] Pop-up displays only the performance of last 5 guesses
- [x] No pop-up displayed after guessing the correct country
- [x] Pop-up of clipboard copy is annoying
- [x] User can guess an empty country after having guessed a country already
- [x] Clicking on guess without filling in a country blocks the whole app
- [x] User does not know the correct answer in case they fail to guess it
- [x] List of countries in dropdown is buggy
- [x] Default view is too zoomed in on PC and too zoomed out on mobile
- [x] I should be able to select any country on earth, even those with no medals
- [x] I should be able to press enter after typing in the country to guess

## Completed features

- [x] Pop-up when completing all 5 guesses
- [x] Share button with copy to clipboard
- [x] Share button at bottom of guesses
- [x] Centered app name and subtitle

## Production readiness

### Data & game logic

- [ ] Build a complete static JSON dataset of Olympic medal counts per country per sport (summer + winter)
- [ ] Implement a date-based seed to deterministically pick a daily country (e.g. hash the current date, mod by number of countries) so every player gets the same puzzle each day without needing a backend
- [ ] Expand country pool from the current 11 hardcoded countries to all Olympic-participating nations
- [ ] Wire up the existing `country-flags.json` and `country-centroids.json` files which are currently unused

### Code quality

- [ ] Separate JS and CSS into external files
- [ ] Move from inline `onclick` handlers to `addEventListener`
- [ ] Audit `const` vs `let` usage throughout
- [ ] Add input sanitization and basic error handling

### UX polish

- [ ] Make the correct guess show up in gold
- [ ] Add "How to Play" instructions modal
- [ ] Add a themed background
- [ ] Add reveal animation when showing guess performance
- [ ] Persist game state in localStorage so refreshing doesn't reset progress
- [ ] Show a countdown timer to the next daily puzzle after completing today's game

### Accessibility & compatibility

- [ ] Add proper meta tags (Open Graph, description) for link previews when sharing
- [ ] Test and fix cross-browser compatibility (Safari, Firefox, Chrome)
- [ ] Ensure full keyboard navigation support

## Feature ideas

### Gameplay
- [ ] Use proportional all-time medal count to prevent guessing based on total medal bar size
- [ ] Showcase 4th-place finishes for countries with no medals
- [ ] Add the option of guessing countries that no longer exist (e.g. Soviet Union, Yugoslavia)
- [ ] Show interesting Olympic facts about the daily country after the game ends
- [ ] Add a streak counter for consecutive days played
- [ ] Hard mode: show fewer sports or hide gold/silver/bronze breakdown
- [ ] Hint system: reveal the continent or first letter after N wrong guesses
- [ ] Add a “Why This Country?” Reveal at the End with an interesting fact about it's olympic performance
- [ ] Animate each guess sliding in (micro-reward)
- [ ] Add a guess counter
- [ ] Add difficulty game modes
- [ ] Hover tooltips explaining % accuracy
- [ ] Confetti only on first-try win

### Social & engagement
- [ ] Add ability to track games by logging in
- [ ] Leaderboard showing average guesses to solve
- [ ] Multiplayer mode: race a friend to guess first