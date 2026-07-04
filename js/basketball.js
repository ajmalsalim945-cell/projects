/**
 * MULTI-SPORT SCORE KEEPER - BASKETBALL MODULE
 */

class BasketballGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.scores = { home: 0, away: 0 };
    this.teamNames = { home: 'Home', away: 'Away' };
    
    // Configurations
    this.quarterLength = 10; // Default FIBA is 10 minutes (options: 8, 10, 12)
    this.foulsLimit = 5; // Penalty limit (options: 4, 5)
    
    this.stats = {
      home: { fouls: 0, timeouts: 7 },
      away: { fouls: 0, timeouts: 7 }
    };
    
    // Timer states
    this.gameClock = {
      seconds: 600, // 10 minutes default (10 * 60)
      intervalId: null,
      running: false
    };
    this.shotClock = {
      seconds: 24,
      intervalId: null,
      running: false
    };
    
    this.quarter = '1st Q'; // '1st Q', '2nd Q', '3rd Q', '4th Q', 'OT'
    this.possession = 'home'; // 'home' or 'away' or null
    
    this.history = [];
    this.logs = [];
  }

  saveState() {
    const state = {
      scores: { ...this.scores },
      stats: JSON.parse(JSON.stringify(this.stats)),
      gameClock: { ...this.gameClock, intervalId: null },
      shotClock: { ...this.shotClock, intervalId: null },
      quarterLength: this.quarterLength,
      foulsLimit: this.foulsLimit,
      quarter: this.quarter,
      possession: this.possession,
      logs: [...this.logs]
    };
    this.history.push(state);
    if (this.history.length > 50) this.history.shift();
  }

  undo() {
    if (this.history.length === 0) return false;
    const previousState = this.history.pop();
    this.scores = previousState.scores;
    this.stats = previousState.stats;
    this.quarterLength = previousState.quarterLength;
    this.foulsLimit = previousState.foulsLimit;
    this.quarter = previousState.quarter;
    this.possession = previousState.possession;
    this.logs = previousState.logs;

    // Restore seconds
    this.gameClock.seconds = previousState.gameClock.seconds;
    this.shotClock.seconds = previousState.shotClock.seconds;

    this.updateUI();
    return true;
  }

  triggerDigitPop(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.remove('pop-active');
    void el.offsetWidth; // Trigger reflow
    el.classList.add('pop-active');
  }

  // --- Score Mutations ---
  adjustScore(team, val) {
    this.saveState();
    this.scores[team] = Math.max(0, this.scores[team] + val);
    
    const teamName = this.teamNames[team];
    this.updateUI();

    if (val > 0) {
      this.triggerDigitPop(team === 'home' ? 'bball-score-home' : 'bball-score-away');

      let speechMsg = "";
      if (val === 1) speechMsg = `Free throw good for ${teamName}.`;
      else if (val === 2) speechMsg = `Two points for ${teamName}.`;
      else if (val === 3) speechMsg = `Three pointer for ${teamName}!`;

      window.speechEngine.speak(speechMsg);
      this.logEvent(`${val}pt Basket - ${teamName}`);
    }
  }

  // --- Stats Adjustment ---
  adjustStat(team, stat, val) {
    this.saveState();
    if (stat === 'timeouts') {
      this.stats[team].timeouts = Math.max(0, Math.min(7, this.stats[team].timeouts + val));
      this.logEvent(`Timeout - ${this.teamNames[team]}`);
      
      if (val > 0) {
        window.speechEngine.speak(`Timeout called by ${this.teamNames[team]}.`);
      }
    } else if (stat === 'fouls') {
      this.stats[team].fouls = Math.max(0, this.stats[team].fouls + val);
      this.logEvent(`Foul - ${this.teamNames[team]}`);
      
      if (val > 0) {
        let msg = `Foul on ${this.teamNames[team]}.`;
        if (this.stats[team].fouls >= this.foulsLimit) {
          msg += ` Warning, ${this.teamNames[team]} is now in bonus!`;
        }
        window.speechEngine.speak(msg);
      }
    }
    this.updateUI();
  }

  // --- Clocks management ---
  toggleClock() {
    if (this.gameClock.running) {
      this.pauseAllClocks();
    } else {
      this.startAllClocks();
    }
    this.updateUI();
  }

  startAllClocks() {
    this.gameClock.running = true;
    this.gameClock.intervalId = setInterval(() => {
      if (this.gameClock.seconds > 0) {
        this.gameClock.seconds--;
        this.updateGameClockDisplay();
      } else {
        this.handleQuarterEnd();
      }
    }, 1000);

    // Shot clock runs alongside the game clock
    this.shotClock.running = true;
    this.shotClock.intervalId = setInterval(() => {
      if (this.shotClock.seconds > 0) {
        this.shotClock.seconds--;
        this.updateShotClockDisplay();
      } else {
        this.handleShotClockViolation();
      }
    }, 1000);
  }

  pauseAllClocks() {
    clearInterval(this.gameClock.intervalId);
    clearInterval(this.shotClock.intervalId);
    this.gameClock.running = false;
    this.shotClock.running = false;
  }

  resetShotClock(seconds = 24) {
    this.saveState();
    this.shotClock.seconds = seconds;
    
    // Remove warning visual styles
    const el = document.getElementById('bball-shot-clock');
    if (el) el.classList.remove('violating');

    this.updateShotClockDisplay();
  }

  handleQuarterEnd() {
    this.pauseAllClocks();
    this.playBuzzerSound(1.5);
    
    const hScore = this.scores.home;
    const aScore = this.scores.away;
    let quarterText = `End of ${this.quarter}. `;
    if (hScore === aScore) {
      quarterText += `Score tied at ${hScore} all.`;
    } else if (hScore > aScore) {
      quarterText += `${this.teamNames.home} leads ${hScore} to ${aScore}.`;
    } else {
      quarterText += `${this.teamNames.away} leads ${aScore} to ${hScore}.`;
    }
    
    // Check if match actually ends (End of 4th quarter or OT with non-draw score)
    const isGameEnd = (this.quarter === '4th Q' || this.quarter === 'OT') && (hScore !== aScore);
    if (isGameEnd) {
      window.triggerConfetti();
    }

    window.speechEngine.speak(quarterText);
    alert(quarterText);
    this.logEvent(`End of ${this.quarter}`);
    this.updateUI();
  }

  handleShotClockViolation() {
    this.pauseAllClocks();
    this.playBuzzerSound(0.8);
    
    this.logEvent("Shot clock violation!");
    window.speechEngine.speak("Shot clock violation!");
    
    const el = document.getElementById('bball-shot-clock');
    if (el) el.classList.add('violating');
    
    this.updateUI();
  }

  cycleQuarter() {
    this.saveState();
    const quarters = ['1st Q', '2nd Q', '3rd Q', '4th Q', 'OT'];
    let idx = quarters.indexOf(this.quarter);
    idx = (idx + 1) % quarters.length;
    this.quarter = quarters[idx];
    
    const qMinutes = this.quarter === 'OT' ? 5 : this.quarterLength;
    this.gameClock.seconds = qMinutes * 60;
    this.shotClock.seconds = 24;

    this.stats.home.fouls = 0;
    this.stats.away.fouls = 0;

    this.logEvent(`Period: ${this.quarter}`);
    window.speechEngine.speak(`Started ${this.quarter}.`);
    this.updateUI();
  }

  togglePossession() {
    this.saveState();
    this.possession = this.possession === 'home' ? 'away' : 'home';
    const teamName = this.possession === 'home' ? this.teamNames.home : this.teamNames.away;
    window.speechEngine.speak(`Possession ${teamName}.`);
    this.updateUI();
  }

  updateQuarterLength(val) {
    this.saveState();
    this.quarterLength = parseInt(val) || 10;
    if (!this.gameClock.running) {
      const qMinutes = this.quarter === 'OT' ? 5 : this.quarterLength;
      this.gameClock.seconds = qMinutes * 60;
    }
    this.logEvent(`Quarter length configured to ${this.quarterLength}m`);
    this.updateUI();
  }

  updateFoulsLimit(val) {
    this.saveState();
    this.foulsLimit = parseInt(val) || 5;
    this.logEvent(`Fouls limit set to ${this.foulsLimit}`);
    this.updateUI();
  }

  logEvent(action, type = 'normal') {
    const elapsed = this.getFormattedClockTime(this.gameClock.seconds);
    const timeStr = `${this.quarter} - ${elapsed}`;
    this.logs.unshift({
      time: timeStr,
      text: action,
      type: type
    });
    if (this.logs.length > 30) this.logs.pop();
    this.updateLogsDisplay();
    if (window.appController) {
      window.appController.addGlobalLog('basketball', timeStr, action, type);
    }
  }

  // --- Synthesize Buzzer Beep using Web Audio API ---
  playBuzzerSound(duration = 1.0) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(140, ctx.currentTime); 
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(143, ctx.currentTime); 

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + duration);
      osc2.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Buzzer synth failed", e);
    }
  }

  getFormattedClockTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  setClockManual() {
    const timePrompt = prompt("Enter clock time (MM:SS):", this.getFormattedClockTime(this.gameClock.seconds));
    if (!timePrompt) return;
    const parts = timePrompt.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      this.saveState();
      this.gameClock.seconds = (mins * 60) + secs;
      this.updateGameClockDisplay();
    }
  }

  // --- UI Binding ---
  updateUI() {
    // Scores
    document.getElementById('bball-score-home').textContent = this.scores.home;
    document.getElementById('bball-score-away').textContent = this.scores.away;

    // Names
    document.getElementById('bball-name-home').value = this.teamNames.home;
    document.getElementById('bball-name-away').value = this.teamNames.away;

    // Stats Home & Penalty Bonus Check
    const hFouls = this.stats.home.fouls;
    document.getElementById('bball-fouls-home').textContent = hFouls;
    document.getElementById('bball-timeouts-home').textContent = this.stats.home.timeouts;
    
    const bonusHome = document.getElementById('bball-bonus-home');
    if (bonusHome) {
      if (hFouls >= this.foulsLimit) {
        bonusHome.style.display = 'inline-block';
        bonusHome.classList.add('pulse');
      } else {
        bonusHome.style.display = 'none';
        bonusHome.classList.remove('pulse');
      }
    }

    // Stats Away & Penalty Bonus Check
    const aFouls = this.stats.away.fouls;
    document.getElementById('bball-fouls-away').textContent = aFouls;
    document.getElementById('bball-timeouts-away').textContent = this.stats.away.timeouts;
    
    const bonusAway = document.getElementById('bball-bonus-away');
    if (bonusAway) {
      if (aFouls >= this.foulsLimit) {
        bonusAway.style.display = 'inline-block';
        bonusAway.classList.add('pulse');
      } else {
        bonusAway.style.display = 'none';
        bonusAway.classList.remove('pulse');
      }
    }

    // Config select values
    const clockSelect = document.getElementById('bball-config-time');
    if (clockSelect) clockSelect.value = this.quarterLength;
    const foulsSelect = document.getElementById('bball-config-fouls');
    if (foulsSelect) foulsSelect.value = this.foulsLimit;

    // Quarter & Possession
    document.getElementById('bball-quarter').textContent = this.quarter;
    
    // Possession Arrows
    const arrowHome = document.getElementById('bball-arrow-home');
    const arrowAway = document.getElementById('bball-arrow-away');
    
    arrowHome.classList.remove('active');
    arrowAway.classList.remove('active');
    if (this.possession === 'home') arrowHome.classList.add('active');
    else if (this.possession === 'away') arrowAway.classList.add('active');

    // Controls active states
    const clockBtn = document.getElementById('bball-clock-toggle');
    if (clockBtn) {
      if (this.gameClock.running) {
        clockBtn.textContent = 'Pause Clock';
        clockBtn.classList.add('active');
      } else {
        clockBtn.textContent = 'Start Clock';
        clockBtn.classList.remove('active');
      }
    }

    this.updateGameClockDisplay();
    this.updateShotClockDisplay();
    this.updateLogsDisplay();
  }

  updateGameClockDisplay() {
    const clock = document.getElementById('bball-clock');
    if (clock) clock.textContent = this.getFormattedClockTime(this.gameClock.seconds);
  }

  updateShotClockDisplay() {
    const sc = document.getElementById('bball-shot-clock');
    if (sc) sc.textContent = this.shotClock.seconds;
  }

  updateLogsDisplay() {
    const container = document.getElementById('bball-logs');
    if (!container) return;

    container.innerHTML = '';
    this.logs.forEach(log => {
      const el = document.createElement('div');
      el.className = 'log-item basketball';
      el.innerHTML = `
        <span>${log.text}</span>
        <span class="time-tag">${log.time}</span>
      `;
      container.appendChild(el);
    });
  }

  bindEvents() {
    // Scoring Box Digit click (+2)
    document.getElementById('bball-score-home').onclick = () => this.adjustScore('home', 2);
    document.getElementById('bball-score-away').onclick = () => this.adjustScore('away', 2);

    // Precise Home scoring
    document.getElementById('bball-home-free').onclick = () => this.adjustScore('home', 1);
    document.getElementById('bball-home-2pt').onclick = () => this.adjustScore('home', 2);
    document.getElementById('bball-home-3pt').onclick = () => this.adjustScore('home', 3);
    document.getElementById('bball-home-dec').onclick = () => this.adjustScore('home', -1);

    // Precise Away scoring
    document.getElementById('bball-away-free').onclick = () => this.adjustScore('away', 1);
    document.getElementById('bball-away-2pt').onclick = () => this.adjustScore('away', 2);
    document.getElementById('bball-away-3pt').onclick = () => this.adjustScore('away', 3);
    document.getElementById('bball-away-dec').onclick = () => this.adjustScore('away', -1);

    // Names
    document.getElementById('bball-name-home').onchange = (e) => this.teamNames.home = e.target.value || 'Home';
    document.getElementById('bball-name-away').onchange = (e) => this.teamNames.away = e.target.value || 'Away';

    // Clock and Shot Clock Resets
    document.getElementById('bball-clock-toggle').onclick = () => this.toggleClock();
    document.getElementById('bball-clock').onclick = () => this.setClockManual();
    document.getElementById('bball-quarter').onclick = () => this.cycleQuarter();
    
    document.getElementById('bball-reset-24').onclick = () => this.resetShotClock(24);
    document.getElementById('bball-reset-14').onclick = () => this.resetShotClock(14);
    
    // Config controls
    const timeSelect = document.getElementById('bball-config-time');
    if (timeSelect) {
      timeSelect.onchange = (e) => this.updateQuarterLength(e.target.value);
    }
    const foulsSelect = document.getElementById('bball-config-fouls');
    if (foulsSelect) {
      foulsSelect.onchange = (e) => this.updateFoulsLimit(e.target.value);
    }

    // Possession Arrows
    document.getElementById('bball-possession').onclick = () => this.togglePossession();

    // Stats controllers Home
    document.getElementById('bball-fouls-home-inc').onclick = () => this.adjustStat('home', 'fouls', 1);
    document.getElementById('bball-fouls-home-dec').onclick = () => this.adjustStat('home', 'fouls', -1);
    document.getElementById('bball-timeouts-home-inc').onclick = () => this.adjustStat('home', 'timeouts', 1);
    document.getElementById('bball-timeouts-home-dec').onclick = () => this.adjustStat('home', 'timeouts', -1);

    // Stats controllers Away
    document.getElementById('bball-fouls-away-inc').onclick = () => this.adjustStat('away', 'fouls', 1);
    document.getElementById('bball-fouls-away-dec').onclick = () => this.adjustStat('away', 'fouls', -1);
    document.getElementById('bball-timeouts-away-inc').onclick = () => this.adjustStat('away', 'timeouts', 1);
    document.getElementById('bball-timeouts-away-dec').onclick = () => this.adjustStat('away', 'timeouts', -1);

    // Global
    document.getElementById('bball-reset').onclick = () => {
      if (confirm('Reset Basketball scoreboard?')) {
        this.pauseAllClocks();
        this.reset();
        this.updateUI();
      }
    };
    document.getElementById('bball-undo').onclick = () => this.undo();
  }

  deactivate() {
    this.pauseAllClocks();
    this.updateUI();
  }
}

window.BasketballGame = BasketballGame;
