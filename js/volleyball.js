/**
 * MULTI-SPORT SCORE KEEPER - VOLLEYBALL MODULE
 */

class VolleyballGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.scores = { a: 0, b: 0 };
    this.teamNames = { a: 'Team A', b: 'Team B' };
    this.setsWon = { a: 0, b: 0 };
    this.setScores = []; // Array of arrays: [[25, 23], [18, 25]]
    
    // Configurations
    this.setLimit = 25; // Target score for normal sets (options: 15, 21, 25)
    this.deciderLimit = 15; // Target score for deciding set (options: 11, 15, 21)
    
    this.currentSet = 1;
    this.maxSets = 5; // Best of 5
    this.server = 'a'; // 'a' or 'b'
    
    this.sideSwitchedInDecidingSet = false;
    this.showSideSwitchWarning = false;
    this.history = [];
    this.logs = [];
  }

  saveState() {
    const state = {
      scores: { ...this.scores },
      setsWon: { ...this.setsWon },
      setScores: JSON.parse(JSON.stringify(this.setScores)),
      setLimit: this.setLimit,
      deciderLimit: this.deciderLimit,
      currentSet: this.currentSet,
      maxSets: this.maxSets,
      server: this.server,
      sideSwitchedInDecidingSet: this.sideSwitchedInDecidingSet,
      showSideSwitchWarning: this.showSideSwitchWarning,
      logs: [...this.logs]
    };
    this.history.push(state);
    if (this.history.length > 50) this.history.shift();
  }

  undo() {
    if (this.history.length === 0) return false;
    const previousState = this.history.pop();
    this.scores = previousState.scores;
    this.setsWon = previousState.setsWon;
    this.setScores = previousState.setScores;
    this.setLimit = previousState.setLimit;
    this.deciderLimit = previousState.deciderLimit;
    this.currentSet = previousState.currentSet;
    this.maxSets = previousState.maxSets;
    this.server = previousState.server;
    this.sideSwitchedInDecidingSet = previousState.sideSwitchedInDecidingSet;
    this.showSideSwitchWarning = previousState.showSideSwitchWarning;
    this.logs = previousState.logs;

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
    
    if (val < 0) {
      this.scores[team] = Math.max(0, this.scores[team] + val);
      this.updateUI();
      return;
    }

    this.scores[team]++;
    const oppositeTeam = team === 'a' ? 'b' : 'a';
    
    // Check service switch
    let serviceOver = false;
    if (this.server !== team) {
      this.server = team;
      serviceOver = true;
    }

    // Check Deciding Set 8-Point Side Switch
    const isDecidingSet = this.currentSet === this.maxSets;
    if (isDecidingSet && !this.sideSwitchedInDecidingSet) {
      const switchTriggerPoints = Math.ceil(this.getSetTargetScore() / 2); // Typically 8 if target is 15
      if (this.scores[team] >= switchTriggerPoints) {
        this.sideSwitchedInDecidingSet = true;
        this.showSideSwitchWarning = true;
        this.playWhistleSound();
        window.speechEngine.speak("Switch court sides!");
      }
    }

    this.updateUI();
    this.triggerDigitPop(team === 'a' ? 'vb-score-a' : 'vb-score-b');

    // Voice Feedback Logic (Score announcement)
    const teamName = this.teamNames[team];
    const oppName = this.teamNames[oppositeTeam];
    const tScore = this.scores[team];
    const oScore = this.scores[oppositeTeam];
    
    let speechMsg = `Point ${teamName}. `;
    if (serviceOver) {
      speechMsg += `Service over. `;
    }

    // Check Set or Match point warnings
    const target = this.getSetTargetScore();
    if (tScore >= target - 1 && tScore > oScore) {
      const setsNeeded = Math.ceil(this.maxSets / 2);
      if (this.setsWon[team] === setsNeeded - 1) {
        speechMsg += ` Match point ${teamName}!`;
      } else {
        speechMsg += ` Set point ${teamName}!`;
      }
    }

    window.speechEngine.speak(speechMsg);
    this.logEvent(`Point - ${teamName}`);

    // Check Set Win
    if (tScore >= target && (tScore - oScore) >= 2) {
      this.winSet(team);
    }
  }

  getSetTargetScore() {
    // Deciding set
    if (this.currentSet === this.maxSets) {
      return this.deciderLimit;
    }
    return this.setLimit;
  }

  winSet(team) {
    this.setsWon[team]++;
    
    // Save set score record
    this.setScores.push([this.scores.a, this.scores.b]);

    const announcement = `${this.teamNames[team]} wins set ${this.currentSet}, ${this.scores.a} to ${this.scores.b}!`;
    window.speechEngine.speak(announcement);
    this.logEvent(`Set ${this.currentSet} won by ${this.teamNames[team]} (${this.scores.a}-${this.scores.b})`);
    
    alert(announcement);

    // Check Match Win
    const setsToWin = Math.ceil(this.maxSets / 2);
    if (this.setsWon[team] >= setsToWin) {
      window.triggerConfetti();
      const matchAnnouncement = `Match complete! ${this.teamNames[team]} wins the match, ${this.setsWon.a} sets to ${this.setsWon.b}!`;
      setTimeout(() => {
        window.speechEngine.speak(matchAnnouncement);
        alert(matchAnnouncement);
      }, 2000);
      this.logEvent(`Match Completed! ${this.teamNames[team]} wins!`, 'goal');
    } else {
      // Prompt sides switch
      this.showSideSwitchWarning = true;
      this.playWhistleSound();
      window.speechEngine.speak("Switch court sides!");

      // Setup next set
      this.currentSet++;
      this.scores.a = 0;
      this.scores.b = 0;
      this.server = team; // Winner of last rally starts serving
      this.sideSwitchedInDecidingSet = false;
    }

    this.updateUI();
  }

  playWhistleSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch(e) {}
  }

  changeMaxSets(num) {
    this.saveState();
    this.maxSets = num;
    this.updateUI();
  }

  updateSetLimit(val) {
    this.saveState();
    this.setLimit = parseInt(val) || 25;
    this.logEvent(`Set limit set to ${this.setLimit} points`);
    this.updateUI();
  }

  updateDeciderLimit(val) {
    this.saveState();
    this.deciderLimit = parseInt(val) || 15;
    this.logEvent(`Deciding set limit set to ${this.deciderLimit} points`);
    this.updateUI();
  }

  setServer(team) {
    this.saveState();
    this.server = team;
    this.updateUI();
  }

  dismissSideSwitch() {
    this.showSideSwitchWarning = false;
    this.updateUI();
  }

  logEvent(action, type = 'normal') {
    const scoreState = `${this.scores.a}-${this.scores.b}`;
    const timeStr = `Set ${this.currentSet} (${scoreState})`;
    this.logs.unshift({
      time: timeStr,
      text: action,
      type: type
    });
    if (this.logs.length > 30) this.logs.pop();
    this.updateLogsDisplay();
    if (window.appController) {
      window.appController.addGlobalLog('volleyball', timeStr, action, type);
    }
  }

  // --- UI Update ---
  updateUI() {
    // Scores
    document.getElementById('vb-score-a').textContent = this.scores.a;
    document.getElementById('vb-score-b').textContent = this.scores.b;

    // Names
    document.getElementById('vb-name-a').value = this.teamNames.a;
    document.getElementById('vb-name-b').value = this.teamNames.b;

    // Sets count displays
    document.getElementById('vb-sets-a').textContent = this.setsWon.a;
    document.getElementById('vb-sets-b').textContent = this.setsWon.b;

    // Config select values
    const limitSelect = document.getElementById('vb-config-limit');
    if (limitSelect) limitSelect.value = this.setLimit;
    const deciderSelect = document.getElementById('vb-config-decider');
    if (deciderSelect) deciderSelect.value = this.deciderLimit;

    // Set format selectors active states
    const format3Btn = document.getElementById('vb-format-3');
    const format5Btn = document.getElementById('vb-format-5');
    if (format3Btn && format5Btn) {
      if (this.maxSets === 3) {
        format3Btn.classList.add('active');
        format5Btn.classList.remove('active');
      } else {
        format3Btn.classList.remove('active');
        format5Btn.classList.add('active');
      }
    }

    // Deciding Set Switch Sides Warning Banner
    const switchBanner = document.getElementById('vb-switch-sides-banner');
    if (switchBanner) {
      if (this.showSideSwitchWarning) {
        switchBanner.style.display = 'block';
      } else {
        switchBanner.style.display = 'none';
      }
    }

    // Set tracker badges list
    const badgesContainer = document.getElementById('vb-sets-trackers');
    if (badgesContainer) {
      badgesContainer.innerHTML = '';
      
      const totalSetsNeeded = this.maxSets;
      for (let i = 1; i <= totalSetsNeeded; i++) {
        const badge = document.createElement('div');
        badge.className = 'set-badge';
        
        if (i === this.currentSet) {
          badge.classList.add('active');
          badge.textContent = `Set ${i}`;
        } else if (i < this.currentSet) {
          const score = this.setScores[i - 1];
          if (score) {
            badge.textContent = `S${i}: ${score[0]}-${score[1]}`;
            if (score[0] > score[1]) badge.classList.add('won-a');
            else badge.classList.add('won-b');
          }
        } else {
          badge.textContent = `Set ${i}`;
        }
        badgesContainer.appendChild(badge);
      }
    }

    // Serving indicators
    const serverA = document.getElementById('vb-server-a');
    const serverB = document.getElementById('vb-server-b');
    
    serverA.classList.remove('active');
    serverB.classList.remove('active');
    if (this.server === 'a') serverA.classList.add('active');
    else if (this.server === 'b') serverB.classList.add('active');

    this.updateLogsDisplay();
  }

  updateLogsDisplay() {
    const container = document.getElementById('vb-logs');
    if (!container) return;

    container.innerHTML = '';
    this.logs.forEach(log => {
      const el = document.createElement('div');
      el.className = 'log-item volleyball';
      el.innerHTML = `
        <span>${log.text}</span>
        <span class="time-tag">${log.time}</span>
      `;
      container.appendChild(el);
    });
  }

  bindEvents() {
    // Point scoring
    document.getElementById('vb-score-a').onclick = () => this.adjustScore('a', 1);
    document.getElementById('vb-score-b').onclick = () => this.adjustScore('b', 1);

    document.getElementById('vb-score-a-inc').onclick = () => this.adjustScore('a', 1);
    document.getElementById('vb-score-a-dec').onclick = () => this.adjustScore('a', -1);
    document.getElementById('vb-score-b-inc').onclick = () => this.adjustScore('b', 1);
    document.getElementById('vb-score-b-dec').onclick = () => this.adjustScore('b', -1);

    // Names
    document.getElementById('vb-name-a').onchange = (e) => {
      this.teamNames.a = e.target.value || 'Team A';
      this.updateUI();
    };
    document.getElementById('vb-name-b').onchange = (e) => {
      this.teamNames.b = e.target.value || 'Team B';
      this.updateUI();
    };

    // Server selectors
    document.getElementById('vb-server-a').onclick = () => this.setServer('a');
    document.getElementById('vb-server-b').onclick = () => this.setServer('b');

    // Match format buttons
    document.getElementById('vb-format-3').onclick = () => this.changeMaxSets(3);
    document.getElementById('vb-format-5').onclick = () => this.changeMaxSets(5);

    // Config selects
    const limitSelect = document.getElementById('vb-config-limit');
    if (limitSelect) {
      limitSelect.onchange = (e) => this.updateSetLimit(e.target.value);
    }
    const deciderSelect = document.getElementById('vb-config-decider');
    if (deciderSelect) {
      deciderSelect.onchange = (e) => this.updateDeciderLimit(e.target.value);
    }

    // Sides switch banner close
    const switchBanner = document.getElementById('vb-switch-sides-banner');
    if (switchBanner) {
      switchBanner.onclick = () => this.dismissSideSwitch();
    }

    // Reset and Undo
    document.getElementById('vb-reset').onclick = () => {
      if (confirm('Reset Volleyball scoreboard?')) {
        this.reset();
        this.updateUI();
      }
    };
    document.getElementById('vb-undo').onclick = () => this.undo();
  }

  deactivate() {
    this.updateUI();
  }
}

window.VolleyballGame = VolleyballGame;
