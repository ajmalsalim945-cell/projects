/**
 * MULTI-SPORT SCORE KEEPER - FOOTBALL MODULE
 */

class FootballGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.scores = { a: 0, b: 0 };
    this.teamNames = { a: 'Team A', b: 'Team B' };
    this.stats = {
      a: { yellow: 0, red: 0, fouls: 0, corners: 0, offsides: 0 },
      b: { yellow: 0, red: 0, fouls: 0, corners: 0, offsides: 0 }
    };
    this.timer = {
      seconds: 0,
      intervalId: null,
      running: false
    };
    this.period = '1st Half'; // '1st Half', '2nd Half', 'Extra Time', 'Penalties'
    this.halfLength = 45; // Configurable: 5, 10, 20, 40, 45 minutes
    
    // Penalty shootout tracker
    this.shootout = {
      a: Array(5).fill(null), // Array of: null, 'scored', 'missed'
      b: Array(5).fill(null)
    };
    
    this.history = []; // Array of states for undo
    this.logs = []; // Timeline logs
  }

  saveState() {
    const state = {
      scores: { ...this.scores },
      stats: JSON.parse(JSON.stringify(this.stats)),
      timer: { ...this.timer, intervalId: null }, 
      period: this.period,
      halfLength: this.halfLength,
      shootout: {
        a: [...this.shootout.a],
        b: [...this.shootout.b]
      },
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
    this.period = previousState.period;
    this.halfLength = previousState.halfLength;
    this.shootout = previousState.shootout;
    this.logs = previousState.logs;
    
    // Restore seconds
    this.timer.seconds = previousState.timer.seconds;
    
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

  // --- Scoring & Stats Mutators ---
  adjustScore(team, val) {
    this.saveState();
    this.scores[team] = Math.max(0, this.scores[team] + val);
    
    const teamName = this.teamNames[team];
    this.updateUI();

    if (val > 0) {
      this.triggerDigitPop(team === 'a' ? 'fb-score-a' : 'fb-score-b');

      let announcement = `Goal for ${teamName}!`;
      window.speechEngine.speak(announcement);
      this.logEvent(`Goal - ${teamName}`, 'goal');
    }
  }

  adjustStat(team, stat, val) {
    this.saveState();
    this.stats[team][stat] = Math.max(0, this.stats[team][stat] + val);
    this.updateUI();

    const teamName = this.teamNames[team];
    if (val > 0) {
      this.logEvent(`${stat.toUpperCase()} - ${teamName}`);
      
      let announcement = "";
      if (stat === 'yellow') announcement = `Yellow card for ${teamName}.`;
      else if (stat === 'red') announcement = `Red card for ${teamName}!`;
      else if (stat === 'corners') announcement = `Corner kick for ${teamName}.`;
      else if (stat === 'fouls') announcement = `Foul on ${teamName}.`;
      else if (stat === 'offsides') announcement = `Offside called on ${teamName}.`;
      
      if (announcement) {
        window.speechEngine.speak(announcement);
      }
    }
  }

  // --- Clock Control ---
  toggleClock() {
    if (this.timer.running) {
      clearInterval(this.timer.intervalId);
      this.timer.running = false;
    } else {
      this.timer.running = true;
      this.timer.intervalId = setInterval(() => {
        this.timer.seconds++;
        this.updateClockDisplay();
        this.checkHalfTimeBoundary();
      }, 1000);
    }
    this.updateUI();
  }

  checkHalfTimeBoundary() {
    const halfSeconds = this.halfLength * 60;
    let limitReached = false;
    let announcementText = "";
    let isFullTime = false;

    if (this.period === '1st Half' && this.timer.seconds >= halfSeconds) {
      limitReached = true;
      announcementText = `Half time! Score is ${this.teamNames.a} ${this.scores.a}, ${this.teamNames.b} ${this.scores.b}.`;
    } else if (this.period === '2nd Half' && this.timer.seconds >= halfSeconds * 2) {
      limitReached = true;
      isFullTime = true;
      announcementText = `Full time! Final score is ${this.teamNames.a} ${this.scores.a}, ${this.teamNames.b} ${this.scores.b}.`;
    } else if (this.period === 'Extra Time' && this.timer.seconds >= (halfSeconds * 2) + 1800) {
      limitReached = true;
      isFullTime = true;
      announcementText = `End of extra time. Score is ${this.teamNames.a} ${this.scores.a}, ${this.teamNames.b} ${this.scores.b}.`;
    }

    if (limitReached) {
      clearInterval(this.timer.intervalId);
      this.timer.running = false;
      this.playWhistleSound();
      
      if (isFullTime && this.scores.a !== this.scores.b) {
        window.triggerConfetti();
      }

      setTimeout(() => {
        window.speechEngine.speak(announcementText);
        alert(announcementText);
      }, 1000);
      
      this.logEvent(`Period End - ${this.period}`);
      this.updateUI();
    }
  }

  playWhistleSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playBlast = (time, duration) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.exponentialRampToValueAtTime(1000, time + duration);
        
        gainNode.gain.setValueAtTime(0.01, time);
        gainNode.gain.exponentialRampToValueAtTime(0.2, time + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
      };

      const now = ctx.currentTime;
      playBlast(now, 0.2);
      playBlast(now + 0.3, 0.2);
      playBlast(now + 0.6, 0.5);
    } catch (e) {
      console.warn("Whistle synth failed", e);
    }
  }

  cyclePeriod() {
    this.saveState();
    const periods = ['1st Half', '2nd Half', 'Extra Time', 'Penalties'];
    let idx = periods.indexOf(this.period);
    idx = (idx + 1) % periods.length;
    this.period = periods[idx];
    
    // Automatically set clock starting times standard for soccer
    if (this.period === '1st Half') this.timer.seconds = 0;
    else if (this.period === '2nd Half') this.timer.seconds = this.halfLength * 60;
    else if (this.period === 'Extra Time') this.timer.seconds = this.halfLength * 120;
    else if (this.period === 'Penalties') {
      clearInterval(this.timer.intervalId);
      this.timer.running = false;
    }

    this.logEvent(`Period: ${this.period}`);
    this.updateUI();
  }

  // --- Penalty Shootout Helpers ---
  togglePenaltyShootout(team, idx) {
    this.saveState();
    const currentVal = this.shootout[team][idx];
    let newVal = null;
    if (currentVal === null) newVal = 'scored';
    else if (currentVal === 'scored') newVal = 'missed';
    else newVal = null;

    this.shootout[team][idx] = newVal;
    this.updateUI();

    // Announce shootout status if scored
    const teamName = this.teamNames[team];
    let announceMsg = "";
    if (newVal === 'scored') {
      announceMsg = `${teamName} scores penalty round ${idx + 1}!`;
      window.speechEngine.speak(announceMsg);
    } else if (newVal === 'missed') {
      announceMsg = `${teamName} misses penalty round ${idx + 1}.`;
      window.speechEngine.speak(announceMsg);
    }
    
    this.checkShootoutWinner();
  }

  checkShootoutWinner() {
    const aScores = this.shootout.a.filter(v => v === 'scored').length;
    const bScores = this.shootout.b.filter(v => v === 'scored').length;
    
    const aTaken = this.shootout.a.filter(v => v !== null).length;
    const bTaken = this.shootout.b.filter(v => v !== null).length;

    // Check if one team has won
    if (aTaken >= 5 && bTaken >= 5 && aTaken === bTaken) {
      if (aScores !== bScores) {
        window.triggerConfetti();
        const winner = aScores > bScores ? this.teamNames.a : this.teamNames.b;
        const announcement = `Match over! ${winner} wins the penalty shootout ${aScores} to ${bScores}!`;
        setTimeout(() => {
          window.speechEngine.speak(announcement);
          alert(announcement);
        }, 1200);
      }
    }
  }

  updateHalfLength(val) {
    this.saveState();
    this.halfLength = parseInt(val) || 45;
    this.logEvent(`Half length set to ${this.halfLength}m`);
    this.updateUI();
  }

  logEvent(action, type = 'normal') {
    const elapsed = this.getFormattedTime();
    this.logs.unshift({
      time: elapsed,
      text: action,
      type: type
    });
    // Keep logs within reasonable size
    if (this.logs.length > 30) this.logs.pop();
    this.updateLogsDisplay();
    if (window.appController) {
      window.appController.addGlobalLog('football', elapsed, action, type);
    }
  }

  // --- Time Formatter ---
  getFormattedTime() {
    const mins = Math.floor(this.timer.seconds / 60);
    const secs = this.timer.seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // --- UI Binding ---
  updateUI() {
    // Scores
    document.getElementById('fb-score-a').textContent = this.scores.a;
    document.getElementById('fb-score-b').textContent = this.scores.b;

    // Names
    document.getElementById('fb-name-a').value = this.teamNames.a;
    document.getElementById('fb-name-b').value = this.teamNames.b;

    // Period
    document.getElementById('fb-period').textContent = this.period;

    // Half Length config selector value
    const select = document.getElementById('fb-config-half');
    if (select) select.value = this.halfLength;

    // Stats A
    document.getElementById('fb-yellow-a').textContent = this.stats.a.yellow;
    document.getElementById('fb-red-a').textContent = this.stats.a.red;
    document.getElementById('fb-fouls-a').textContent = this.stats.a.fouls;
    document.getElementById('fb-corners-a').textContent = this.stats.a.corners;
    document.getElementById('fb-offsides-a').textContent = this.stats.a.offsides;

    // Stats B
    document.getElementById('fb-yellow-b').textContent = this.stats.b.yellow;
    document.getElementById('fb-red-b').textContent = this.stats.b.red;
    document.getElementById('fb-fouls-b').textContent = this.stats.b.fouls;
    document.getElementById('fb-corners-b').textContent = this.stats.b.corners;
    document.getElementById('fb-offsides-b').textContent = this.stats.b.offsides;

    // Clock Buttons
    const clockBtn = document.getElementById('fb-clock-toggle');
    if (clockBtn) {
      if (this.timer.running) {
        clockBtn.textContent = 'Pause Clock';
        clockBtn.classList.add('active');
      } else {
        clockBtn.textContent = 'Start Clock';
        clockBtn.classList.remove('active');
      }
    }

    // Render penalty shootout details if active
    const penaltySection = document.getElementById('fb-shootout-panel');
    if (penaltySection) {
      if (this.period === 'Penalties') {
        penaltySection.style.display = 'block';
        this.renderShootoutGrid();
      } else {
        penaltySection.style.display = 'none';
      }
    }

    this.updateClockDisplay();
    this.updateLogsDisplay();
  }

  renderShootoutGrid() {
    const renderRow = (team, containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      this.shootout[team].forEach((val, idx) => {
        const item = document.createElement('div');
        item.className = `shootout-dot ${val || 'empty'}`;
        item.textContent = val === 'scored' ? '✅' : (val === 'missed' ? '❌' : `${idx + 1}`);
        item.onclick = () => this.togglePenaltyShootout(team, idx);
        container.appendChild(item);
      });
    };

    renderRow('a', 'fb-shootout-a');
    renderRow('b', 'fb-shootout-b');
  }

  updateClockDisplay() {
    const el = document.getElementById('fb-clock');
    if (el) el.textContent = this.getFormattedTime();
  }

  updateLogsDisplay() {
    const container = document.getElementById('fb-logs');
    if (!container) return;
    
    container.innerHTML = '';
    this.logs.forEach(log => {
      const el = document.createElement('div');
      el.className = `log-item football ${log.type === 'goal' ? 'pulse' : ''}`;
      el.innerHTML = `
        <span>${log.text}</span>
        <span class="time-tag">${log.time}</span>
      `;
      container.appendChild(el);
    });
  }

  bindEvents() {
    // Score updates
    document.getElementById('fb-score-a').onclick = () => this.adjustScore('a', 1);
    document.getElementById('fb-score-b').onclick = () => this.adjustScore('b', 1);
    
    document.getElementById('fb-score-a-inc').onclick = () => this.adjustScore('a', 1);
    document.getElementById('fb-score-a-dec').onclick = () => this.adjustScore('a', -1);
    document.getElementById('fb-score-b-inc').onclick = () => this.adjustScore('b', 1);
    document.getElementById('fb-score-b-dec').onclick = () => this.adjustScore('b', -1);

    // Names
    document.getElementById('fb-name-a').onchange = (e) => this.teamNames.a = e.target.value || 'Team A';
    document.getElementById('fb-name-b').onchange = (e) => this.teamNames.b = e.target.value || 'Team B';

    // Clock & Period
    document.getElementById('fb-clock-toggle').onclick = () => this.toggleClock();
    document.getElementById('fb-period').onclick = () => this.cyclePeriod();

    // Half length select
    const halfSelect = document.getElementById('fb-config-half');
    if (halfSelect) {
      halfSelect.onchange = (e) => this.updateHalfLength(e.target.value);
    }
    
    // Stats controls A
    document.getElementById('fb-yellow-a-inc').onclick = () => this.adjustStat('a', 'yellow', 1);
    document.getElementById('fb-yellow-a-dec').onclick = () => this.adjustStat('a', 'yellow', -1);
    document.getElementById('fb-red-a-inc').onclick = () => this.adjustStat('a', 'red', 1);
    document.getElementById('fb-red-a-dec').onclick = () => this.adjustStat('a', 'red', -1);
    document.getElementById('fb-fouls-a-inc').onclick = () => this.adjustStat('a', 'fouls', 1);
    document.getElementById('fb-fouls-a-dec').onclick = () => this.adjustStat('a', 'fouls', -1);
    document.getElementById('fb-corners-a-inc').onclick = () => this.adjustStat('a', 'corners', 1);
    document.getElementById('fb-corners-a-dec').onclick = () => this.adjustStat('a', 'corners', -1);
    document.getElementById('fb-offsides-a-inc').onclick = () => this.adjustStat('a', 'offsides', 1);
    document.getElementById('fb-offsides-a-dec').onclick = () => this.adjustStat('a', 'offsides', -1);

    // Stats controls B
    document.getElementById('fb-yellow-b-inc').onclick = () => this.adjustStat('b', 'yellow', 1);
    document.getElementById('fb-yellow-b-dec').onclick = () => this.adjustStat('b', 'yellow', -1);
    document.getElementById('fb-red-b-inc').onclick = () => this.adjustStat('b', 'red', 1);
    document.getElementById('fb-red-b-dec').onclick = () => this.adjustStat('b', 'red', -1);
    document.getElementById('fb-fouls-b-inc').onclick = () => this.adjustStat('b', 'fouls', 1);
    document.getElementById('fb-fouls-b-dec').onclick = () => this.adjustStat('b', 'fouls', -1);
    document.getElementById('fb-corners-b-inc').onclick = () => this.adjustStat('b', 'corners', 1);
    document.getElementById('fb-corners-b-dec').onclick = () => this.adjustStat('b', 'corners', -1);
    document.getElementById('fb-offsides-b-inc').onclick = () => this.adjustStat('b', 'offsides', 1);
    document.getElementById('fb-offsides-b-dec').onclick = () => this.adjustStat('b', 'offsides', -1);

    // Global reset/undo for this tab
    document.getElementById('fb-reset').onclick = () => {
      if (confirm('Reset Football match?')) {
        clearInterval(this.timer.intervalId);
        this.reset();
        this.updateUI();
      }
    };
    document.getElementById('fb-undo').onclick = () => this.undo();
  }

  deactivate() {
    clearInterval(this.timer.intervalId);
    this.timer.running = false;
    this.updateUI();
  }
}

window.FootballGame = FootballGame;
