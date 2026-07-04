# Apex Scores - Professional Multi-Sport Scorekeeper & Voice Assistant

Apex Scores is a professional, feature-rich manual scorekeeping web application designed for both desktop (PC) and mobile screens. It comes equipped with sports-specific rule systems and real-time voice announcements utilizing the browser's Web Speech API.

## 🏆 Key Features

- **Obsidian Dark Theme**: A premium glassmorphic dashboard styled with distinctive neon glow accents for each sport.
- **Manual Score Inputs**: Clean, click-friendly digit blocks and side buttons with tactile animations.
- **Voice Announcements**: Automatic verbal score readouts (e.g. *"Goal for Team A!"*, *"21, 19 - Game Point!"*, *"Four runs! Score is now..."*) with volume, speed, pitch, and voice settings.
- **Full Undo History**: Revert accidental points or adjustments with the click of a button.
- **Mobile-Responsive**: Designed with a layout structure that seamlessly adjusts from PC monitors to mobile screens for convenient field scorekeeping.

---

## ⚽ Supported Sports & Rules

### 1. Football (Soccer)
- **Clock**: Count-up stopwatch with period toggles (1st Half, 2nd Half, Extra Time, Penalties).
- **Match Timeline**: Detailed event logs with timestamps.
- **Extended stats**: Tracking for yellow cards, red cards, corners, fouls, and offsides.

### 2. Cricket
- **Scorecard**: Complete tracker for runs, wickets, and overs.
- **Ball-by-Ball Live Log**: Custom visualization of the current over (e.g. dot balls, boundaries, wickets, extras).
- **Target Calculator**: Dynamic chase calculator displaying remaining balls, required runs, and required run rates.
- **Dismissals**: Modal pop-up to log wickets by type (Bowled, Caught, LBW, Run Out, Stumped, etc.).

### 3. Basketball
- **Game Clock**: Standard 10-minute quarter countdown timer with customized buzzer sound effects.
- **Shot Clock**: 24-second and 14-second offensive reset controls.
- **Additional Stats**: Team fouls (with warning alerts) and remaining timeouts indicators.
- **Possession**: Toggleable visual possession arrow.

### 4. Volleyball
- **Rally Scoring**: Point toggles with set target limits (25 points for normal sets, 15 points for deciding set).
- **Win by 2**: Implements automated tie-break rules.
- **Sets Tracker**: Visual badges logging previous set scorecards.
- **Service Alert**: Automatic and manual server tracking.

### 5. Badminton
- **Ref Score Calling**: Spoken announcements speak the *server's score first* (standard badminton referee style).
- **Court Visualizer**: Dynamic layout displaying which court grid (Left or Right) the server and receiver must stand in based on even/odd points rules.
- **Match Format**: Set limits up to 21 points with a hard cap at 30 points.

---

## 🚀 How to Run Locally

Since this application is written entirely in Vanilla HTML, CSS, and Javascript, there are no mandatory build steps:

### Option 1: Quick Open (No Server)
Simply double-click the [index.html](file:///C:/Users/ajmal/.gemini/antigravity/scratch/score-keeper/index.html) file to open it directly in any modern web browser.

### Option 2: Dev Local Server (Recommended for Speech Voices)
For full browser compatibility and system voice integrations, you can run a local HTTP server:
1. Ensure [Node.js](https://nodejs.org) is installed.
2. Open your terminal in the `score-keeper` directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open the URL `http://localhost:3000` in your browser.

> [!NOTE]
> Modern web browsers restrict audio/speech playback until you interact with the screen. Click anywhere on the landing dashboard to unmute the Voice Assistant.
