/**
 * MULTI-SPORT SCORE KEEPER - BADMINTON MODULE
 */

class BadmintonGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.scores = { a: 0, b: 0 };
    this.playerNames = { a: 'Player A', b: 'Player B' };
    this.gamesWon = { a: 0, b: 0 };
    this.gameScores = []; // Array of arrays: [[21, 19], [15, 21]]
    
    // Configurations
    this.gameType = 'singles'; // 'singles' or 'doubles'
    this.gameLimit = 21; // Default 21 points (options: 11, 15, 21)
    
    this.currentGame = 1;
    this.server = 'a'; // 'a' or 'b'
    
    this.intervalTriggered = false;
    this.showIntervalWarning = false;
    this.history = [];
    this.logs = [];
  }

  saveState() {
    const state = {
      scores: { ...this.scores },
      gamesWon: { ...this.gamesWon },
      gameScores: JSON.parse(JSON.stringify(this.gameScores)),
      gameType: this.gameType,
      gameLimit: this.gameLimit,
      currentGame: this.currentGame,
      server: this.server,
      intervalTriggered: this.intervalTriggered,
      showIntervalWarning: this.showIntervalWarning,
      logs: [...this.logs]
    };
    this.history.push(state);
    if (this.history.length > 50) this.history.shift();
  }

  undo() {
    if (this.history.length === 0) return false;
    const previousState = this.history.pop();
    this.scores = previousState.scores;
    this.gamesWon = previousState.gamesWon;
    this.gameScores = previousState.gameScores;
    this.gameType = previousState.gameType;
    this.gameLimit = previousState.gameLimit;
    this.currentGame = previousState.currentGame;
    this.server = previousState.server;
    this.intervalTriggered = previousState.intervalTriggered;
    this.showIntervalWarning = previousState.showIntervalWarning;
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
  adjustScore(player, val) {
    this.saveState();

    if (val < 0) {
      this.scores[player] = Math.max(0, this.scores[player] + val);
      this.updateUI();
      return;
    }

    this.scores[player]++;
    const otherPlayer = player === 'a' ? 'b' : 'a';
    
    let serviceOver = false;
    if (this.server !== player) {
      this.server = player;
      serviceOver = true;
    }

    // Check 11-point Interval
    if (!this.intervalTriggered) {
      if (this.scores.a === 11 || this.scores.b === 11) {
        this.intervalTriggered = true;
        this.showIntervalWarning = true;
        this.playIntervalBeep();
        window.speechEngine.speak("Game interval. Take a sixty second break.");
      }
    }

    this.updateUI();
    this.triggerDigitPop(player === 'a' ? 'bm-score-a' : 'bm-score-b');

    // Voice Feedback (Stating point addition and service changes)
    const playerName = this.playerNames[player];
    const serverScore = this.scores[this.server];
    const receiverScore = this.scores[otherPlayer];

    let speechMsg = `Point ${playerName}. `;
    if (serviceOver) {
      speechMsg += `Service over. `;
    }

    // Check game point warning
    const target = this.gameLimit;
    if (serverScore >= target - 1 && serverScore > receiverScore) {
      if (this.gamesWon[this.server] === 1) {
        speechMsg += " Match point!";
      } else {
        speechMsg += " Game point!";
      }
    }

    window.speechEngine.speak(speechMsg);
    this.logEvent(`Point - ${this.playerNames[player]}`);

    // Check Game Win
    if (serverScore >= target && (serverScore - receiverScore) >= 2) {
      this.winGame(this.server);
    } else if (serverScore === 30) {
      // Golden Point Rule: First to 30 wins
      this.winGame(this.server);
    }
  }

  winGame(player) {
    const opponent = player === 'a' ? 'b' : 'a';
    this.gamesWon[player]++;
    
    this.gameScores.push([this.scores.a, this.scores.b]);

    const winnerName = this.playerNames[player];
    const gameWinMsg = `${winnerName} wins game ${this.currentGame}, ${this.scores.a} to ${this.scores.b}!`;
    
    window.speechEngine.speak(gameWinMsg);
    this.logEvent(`Game ${this.currentGame} won by ${winnerName} (${this.scores.a}-${this.scores.b})`);
    
    alert(gameWinMsg);

    // Best of 3 games
    if (this.gamesWon[player] >= 2) {
      window.triggerConfetti();
      const matchWinMsg = `Match complete! ${winnerName} wins the match!`;
      setTimeout(() => {
        window.speechEngine.speak(matchWinMsg);
        alert(matchWinMsg);
      }, 2000);
      this.logEvent(`Match Completed! ${winnerName} wins!`, 'goal');
    } else {
      // Advance to next game
      this.currentGame++;
      this.scores.a = 0;
      this.scores.b = 0;
      this.server = player;
      this.intervalTriggered = false;
      this.showIntervalWarning = false;
    }

    this.updateUI();
  }

  playIntervalBeep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  }

  changeGameType(type) {
    this.saveState();
    this.gameType = type; // 'singles' or 'doubles'
    this.logEvent(`Game type set to ${type}`);
    window.speechEngine.speak(`Switched to ${type} court rules.`);
    this.updateUI();
  }

  updateGameLimit(val) {
    this.saveState();
    this.gameLimit = parseInt(val) || 21;
    this.logEvent(`Game limit set to ${this.gameLimit} points`);
    this.updateUI();
  }

  setServer(player) {
    this.saveState();
    this.server = player;
    this.updateUI();
  }

  dismissInterval() {
    this.showIntervalWarning = false;
    this.updateUI();
  }

  logEvent(action, type = 'normal') {
    const scoreState = `${this.scores.a}-${this.scores.b}`;
    const timeStr = `Game ${this.currentGame} (${scoreState})`;
    this.logs.unshift({
      time: timeStr,
      text: action,
      type: type
    });
    if (this.logs.length > 30) this.logs.pop();
    this.updateLogsDisplay();
    if (window.appController) {
      window.appController.addGlobalLog('badminton', timeStr, action, type);
    }
  }

  // --- UI Update ---
  updateUI() {
    // Scores
    document.getElementById('bm-score-a').textContent = this.scores.a;
    document.getElementById('bm-score-b').textContent = this.scores.b;

    // Names
    document.getElementById('bm-name-a').value = this.playerNames.a;
    document.getElementById('bm-name-b').value = this.playerNames.b;

    // Games Count display
    document.getElementById('bm-games-a').textContent = this.gamesWon.a;
    document.getElementById('bm-games-b').textContent = this.gamesWon.b;

    // Config select values
    const limitSelect = document.getElementById('bm-config-limit');
    if (limitSelect) limitSelect.value = this.gameLimit;

    // Game type toggle active states
    const singlesBtn = document.getElementById('bm-type-singles');
    const doublesBtn = document.getElementById('bm-type-doubles');
    if (singlesBtn && doublesBtn) {
      if (this.gameType === 'singles') {
        singlesBtn.classList.add('active');
        doublesBtn.classList.remove('active');
      } else {
        singlesBtn.classList.remove('active');
        doublesBtn.classList.add('active');
      }
    }

    // Interval break warning banner
    const intervalBanner = document.getElementById('bm-interval-banner');
    if (intervalBanner) {
      if (this.showIntervalWarning) {
        intervalBanner.style.display = 'block';
      } else {
        intervalBanner.style.display = 'none';
      }
    }

    // Active server display
    const labelA = document.getElementById('bm-server-label-a');
    const labelB = document.getElementById('bm-server-label-b');
    if (labelA && labelB) {
      labelA.textContent = this.server === 'a' ? '🏸 Serving' : 'Receiving';
      labelB.textContent = this.server === 'b' ? '🏸 Serving' : 'Receiving';
      
      labelA.className = this.server === 'a' ? 'vball-server-indicator active' : 'vball-server-indicator';
      labelB.className = this.server === 'b' ? 'vball-server-indicator active' : 'vball-server-indicator';
    }

    // Set tracker text
    const trackerText = document.getElementById('bm-games-tracker');
    if (trackerText) {
      let trackerHtml = `Game ${this.currentGame} | `;
      if (this.gameScores.length > 0) {
        trackerHtml += this.gameScores.map((score, idx) => `G${idx+1}: ${score[0]}-${score[1]}`).join(', ');
      } else {
        trackerHtml += "No games completed yet";
      }
      trackerText.innerHTML = trackerHtml;
    }

    this.updateCourtVisualizer();
    this.updateLogsDisplay();
  }

  updateCourtVisualizer() {
    const courtElements = {
      aRight: document.getElementById('court-a-right'),
      aLeft: document.getElementById('court-a-left'),
      bRight: document.getElementById('court-b-right'),
      bLeft: document.getElementById('court-b-left')
    };

    if (!courtElements.aRight) return;

    // Clean classes
    Object.values(courtElements).forEach(el => {
      el.className = 'badmin-box-quad';
      if (el.id.includes('left')) el.textContent = this.gameType === 'singles' ? 'Left (Odd)' : 'Left Alley (Odd)';
      else el.textContent = this.gameType === 'singles' ? 'Right (Even)' : 'Right Alley (Even)';
    });

    const isEven = this.scores[this.server] % 2 === 0;

    if (this.server === 'a') {
      if (isEven) {
        courtElements.aRight.classList.add('serving-court');
        courtElements.bRight.classList.add('receiver-court');
      } else {
        courtElements.aLeft.classList.add('serving-court');
        courtElements.bLeft.classList.add('receiver-court');
      }
    } else {
      if (isEven) {
        courtElements.bRight.classList.add('serving-court');
        courtElements.aRight.classList.add('receiver-court');
      } else {
        courtElements.bLeft.classList.add('serving-court');
        courtElements.aLeft.classList.add('receiver-court');
      }
    }
  }

  updateLogsDisplay() {
    const container = document.getElementById('bm-logs');
    if (!container) return;

    container.innerHTML = '';
    this.logs.forEach(log => {
      const el = document.createElement('div');
      el.className = 'log-item badminton';
      el.innerHTML = `
        <span>${log.text}</span>
        <span class="time-tag">${log.time}</span>
      `;
      container.appendChild(el);
    });
  }

  bindEvents() {
    // Scoring
    document.getElementById('bm-score-a').onclick = () => this.adjustScore('a', 1);
    document.getElementById('bm-score-b').onclick = () => this.adjustScore('b', 1);

    document.getElementById('bm-score-a-inc').onclick = () => this.adjustScore('a', 1);
    document.getElementById('bm-score-a-dec').onclick = () => this.adjustScore('a', -1);
    document.getElementById('bm-score-b-inc').onclick = () => this.adjustScore('b', 1);
    document.getElementById('bm-score-b-dec').onclick = () => this.adjustScore('b', -1);

    // Names
    document.getElementById('bm-name-a').onchange = (e) => {
      this.playerNames.a = e.target.value || 'Player A';
      this.updateUI();
    };
    document.getElementById('bm-name-b').onchange = (e) => {
      this.playerNames.b = e.target.value || 'Player B';
      this.updateUI();
    };

    // Game type buttons
    document.getElementById('bm-type-singles').onclick = () => this.changeGameType('singles');
    document.getElementById('bm-type-doubles').onclick = () => this.changeGameType('doubles');

    // Limit select
    const limitSelect = document.getElementById('bm-config-limit');
    if (limitSelect) {
      limitSelect.onchange = (e) => this.updateGameLimit(e.target.value);
    }

    // Interval banner click close
    const intervalBanner = document.getElementById('bm-interval-banner');
    if (intervalBanner) {
      intervalBanner.onclick = () => this.dismissInterval();
    }

    // Manual server select
    document.getElementById('bm-server-label-a').onclick = () => this.setServer('a');
    document.getElementById('bm-server-label-b').onclick = () => this.setServer('b');

    // Reset and Undo
    document.getElementById('bm-reset').onclick = () => {
      if (confirm('Reset Badminton scoreboard?')) {
        this.reset();
        this.updateUI();
      }
    };
    document.getElementById('bm-undo').onclick = () => this.undo();
  }

  deactivate() {
    this.updateUI();
  }
}

window.BadmintonGame = BadmintonGame;
