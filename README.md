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
- [x] When typing a country out fully, the country from the drop-down should auto-fill into the search bar

## Completed features

- [x] Pop-up when completing all 5 guesses
- [x] Share button with copy to clipboard
- [x] Share button at bottom of guesses
- [x] Centered app name and subtitle

## Production readiness

### Data & game logic

- [x] Build a complete static JSON dataset of Olympic medal counts per country per sport (summer + winter)
- [x] Implement a date-based seed to deterministically pick a daily country (e.g. hash the current date, mod by number of countries) so every player gets the same puzzle each day without needing a backend
- [x] Expand country pool from the current 11 hardcoded countries to all Olympic-participating nations
- [x] Wire up the existing `country-flags.json` and `country-centroids.json` files which are currently unused

### Code quality

- [x] Move from inline `onclick` handlers to `addEventListener`
- [x] Audit `const` vs `let` usage throughout
- [x] Add input sanitization and basic error handling

### UX polish

- [x] Make the correct guess show up in gold
- [x] Add "How to Play" instructions modal
- [x] Add reveal animation when showing guess performance
- [x] Persist game state in localStorage so refreshing doesn't reset progress

### Accessibility & compatibility

- [x] Test and fix cross-browser compatibility (Safari, Firefox, Chrome)

## Feature ideas

### Gameplay
- [ ] Add the option of guessing countries that no longer exist (e.g. Soviet Union, Yugoslavia)
- [ ] Show interesting Olympic facts about the daily country after the game ends
- [ ] Add a streak counter for consecutive days played
- [ ] Add difficulty game modes, e.g. Hard mode: hide gold/silver/bronze breakdown
- [x] Confetti on all wins
- [ ] Random guess for if the user doesn't know where to start

### Social & engagement
- [ ] Add ability to track games by logging in
- [ ] Leaderboard showing average guesses to solve
- [ ] Multiplayer mode: race a friend to guess first

### Must-have features before go-live
- [x] Update shareable results to include hints used
- [x] Hints to make the game easier
- [x] Unit tests
- [x] Show the how to play pop-up by default
- [x] Open Graph meta tags — title, description, and preview image for social sharing
- [x] Dark mode — auto-detect via `prefers-color-scheme`, optional manual toggle in settings. Maybe try 32/44/71 RGB here?
- [x] Winter Olympics mode by default — set winter mode for first-time visitors with a dismissible banner, returning players keep their preference
- [ ] Persistent stats & streaks — win rate, guess distribution, current/max streak in localStorage

### Nice to have features
- [x] Link to the wiki pages for x country at the olympics
- [x] Web Share API — use `navigator.share()` on mobile, fall back to clipboard on desktop
- [x] Link to my profile
- [ ] Show a countdown timer to the next daily puzzle after completing today's game
- [ ] Add a themed background

## Roadmap

### Core Game Enhancements
- [ ] Persistent stats & streaks — win rate, guess distribution histogram, current/max streak in localStorage
- [ ] Hard mode — hide gold/silver/bronze breakdown, show only total medals per sport
- [ ] Easy mode — only countries with 50+ total medals
- [ ] Historical nations (Soviet Union, Yugoslavia, East/West Germany, etc.)
- [ ] Olympic fun facts shown about the daily country after game ends

### Website & Engagement
- [ ] Landing page with game selector (Olymple + future games)
- [ ] User accounts with login (Google/Apple) to sync stats across devices
- [ ] Global leaderboard — average guesses to solve, streaks
- [ ] Daily/weekly challenges with themed constraints (e.g. "only Asian countries this week")
- [ ] Achievement badges (first win, 7-day streak, guessed in 1, completed all modes)
- [ ] Blog/changelog page showing new features and daily fun facts
- [ ] Social sharing previews with personalized result images (OG image with your score)
- [ ] Notification system (browser push) for daily puzzle reminders
- [ ] Multiplayer mode — real-time race against a friend with shared link
- [ ] "Olymple of the Day" social media auto-posting bot

### Companion Pages
- [ ] **Olympic Medal Explorer** — interactive searchable/sortable table of all medal data, filter by country/sport/year
- [ ] **Country Comparison Tool** — select 2-3 countries and see head-to-head medal stats with charts
- [ ] **Olympic Map** — world map visualization colored by medal counts, clickable countries
- [ ] **"Did You Know?"** — daily rotating Olympic trivia/facts page
- [ ] **Milano Cortina 2026 Hub** — schedule, participating countries, medal predictions, countdown

### Monetization Approaches
- [ ] **Ko-fi / Buy Me a Coffee** — simple donation button, zero friction to set up
- [ ] **Tasteful display ads** — single banner ad below the game area (Google AdSense or Carbon Ads)
- [ ] **Premium "Pro" mode** — $2/month for unlimited hints, ad-free, exclusive hard modes, stat exports, custom themes
- [ ] **Sponsored daily puzzles** — partner with Olympic committees / sports brands for specific days
- [ ] **Merch store** — Olymple-branded t-shirts, mugs, stickers via print-on-demand (Printful/Shopify)
- [ ] **Affiliate links** — link to Olympic documentaries, books, or streaming events
- [ ] **API/widget licensing** — license the game as an embeddable widget for sports news sites
- [ ] **Browser extension** — daily Olymple puzzle in a new-tab extension with optional premium features
- [ ] **Seasonal event packs** — paid themed puzzle packs around major events (Summer Games, Winter Games)
- [ ] **Newsletter with sponsors** — weekly Olympic trivia newsletter with sponsor spots, driving traffic back to the game