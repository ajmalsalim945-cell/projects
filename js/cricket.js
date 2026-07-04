/**
 * MULTI-SPORT SCORE KEEPER - CRICKET MODULE
 */

class CricketGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.runs = 0;
    this.wickets = 0;
    this.overs = 0; // Total completed overs
    this.balls = 0; // Balls bowled in the current over (0-5)
    this.teamNames = { a: 'Team A', b: 'Team B' };
    this.battingTeam = 'a'; // 'a' or 'b'
    this.innings = 1; // 1st or 2nd innings
    this.target = null; // Target runs to win in 2nd innings
    
    // Configurations
    this.matchOvers = 20; // Default T20 (5, 10, 20, 50 overs)
    this.maxWickets = 10; // Default 10 wickets
    
    this.freeHit = false; // Free hit active flag
    this.currentOverBalls = []; // Array of strings (e.g. ['1', '4', 'Wd', 'W'])
    this.history = []; // State history for undo
    this.logs = []; // Timeline logs
  }

  saveState() {
    const state = {
      runs: this.runs,
      wickets: this.wickets,
      overs: this.overs,
      balls: this.balls,
      battingTeam: this.battingTeam,
      innings: this.innings,
      target: this.target,
      matchOvers: this.matchOvers,
      maxWickets: this.maxWickets,
      freeHit: this.freeHit,
      currentOverBalls: [...this.currentOverBalls],
      logs: [...this.logs]
    };
    this.history.push(state);
    if (this.history.length > 50) this.history.shift();
  }

  undo() {
    if (this.history.length === 0) return false;
    const previousState = this.history.pop();
    this.runs = previousState.runs;
    this.wickets = previousState.wickets;
    this.overs = previousState.overs;
    this.balls = previousState.balls;
    this.battingTeam = previousState.battingTeam;
    this.innings = previousState.innings;
    this.target = previousState.target;
    this.matchOvers = previousState.matchOvers;
    this.maxWickets = previousState.maxWickets;
    this.freeHit = previousState.freeHit;
    this.currentOverBalls = previousState.currentOverBalls;
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
  addRuns(amount, isBoundary = false) {
    this.saveState();
    this.runs += amount;
    this.balls++;
    
    const displayVal = isBoundary ? (amount === 4 ? '4' : '6') : amount.toString();
    this.currentOverBalls.push(displayVal);
    
    // Consume Free Hit
    this.freeHit = false;

    this.updateUI();
    this.triggerDigitPop('crick-runs');
    
    // Voice Feedback (Only on score changes)
    let speakText = "";
    if (isBoundary) {
      speakText = `${amount === 4 ? 'Four runs!' : 'Six runs!'}`;
    } else {
      speakText = `${amount} run${amount === 1 ? '' : 's'}.`;
    }
    window.speechEngine.speak(speakText);
    
    this.checkOverEnd();
    this.checkInningsStatus();
  }

  addDotBall() {
    this.saveState();
    this.balls++;
    this.currentOverBalls.push('0');
    
    // Consume Free Hit
    this.freeHit = false;

    this.updateUI();
    
    this.checkOverEnd();
    this.checkInningsStatus();
  }

  addWicket(dismissalType = 'Out') {
    this.saveState();
    
    if (this.freeHit && dismissalType !== 'Run Out') {
      alert("It's a Free Hit! Batsman cannot be dismissed by this method.");
      return;
    }

    this.wickets = Math.min(this.maxWickets, this.wickets + 1);
    this.balls++;
    this.currentOverBalls.push('W');
    this.freeHit = false; // Consume free hit

    this.updateUI();
    this.triggerDigitPop('crick-wickets');
    
    let speakText = `Out! Wicket falls.`;
    window.speechEngine.speak(speakText);
    
    this.logEvent(`Wicket (${dismissalType}) - ${this.runs}/${this.wickets}`, 'wicket');

    this.checkOverEnd();
    this.checkInningsStatus();
  }

  addExtra(type) {
    this.saveState();

    if (type === 'Wd') {
      this.runs += 1;
      this.currentOverBalls.push('Wd');
      this.updateUI();
      this.triggerDigitPop('crick-runs');
      window.speechEngine.speak("Wide ball.");
    } else if (type === 'Nb') {
      this.runs += 1;
      this.freeHit = true; // Set Free Hit
      this.currentOverBalls.push('Nb');
      this.updateUI();
      this.triggerDigitPop('crick-runs');
      window.speechEngine.speak("No ball, Free Hit!");
    } else {
      const promptRuns = prompt('Enter runs scored on Bye/Leg Bye (default 1):', '1');
      const extraRuns = parseInt(promptRuns) || 1;
      this.runs += extraRuns;
      this.balls++; // Legal ball
      this.currentOverBalls.push(`${extraRuns}${type}`);
      this.freeHit = false; // Consume free hit
      this.updateUI();
      this.triggerDigitPop('crick-runs');
      window.speechEngine.speak(`${extraRuns} extra runs.`);
      this.checkOverEnd();
    }
    this.checkInningsStatus();
  }

  checkOverEnd() {
    if (this.balls >= 6) {
      this.overs++;
      this.balls = 0;
      
      const speechText = "Over complete.";
      
      setTimeout(() => {
        window.speechEngine.speak(speechText);
      }, 1500); 
      
      this.logEvent(`Over Completed: ${this.overs} - Score: ${this.runs}/${this.wickets}`);
      this.currentOverBalls = [];
      this.updateUI();
    }
  }

  checkInningsStatus() {
    if (this.wickets >= this.maxWickets || this.overs >= this.matchOvers) {
      this.endInnings();
    } else if (this.innings === 2 && this.target !== null && this.runs >= this.target) {
      this.announceWinner();
    }
  }

  endInnings() {
    const battingName = this.teamNames[this.battingTeam];
    if (this.innings === 1) {
      this.target = this.runs + 1;
      const announcement = `Innings completed. ${battingName} scored ${this.runs} runs. Target for ${this.teamNames[this.battingTeam === 'a' ? 'b' : 'a']} is ${this.target} runs.`;
      
      window.speechEngine.speak(announcement);
      alert(announcement);
      this.logEvent(`Innings End: ${battingName} ${this.runs}/${this.wickets} (Target: ${this.target})`);
      
      // Auto-switch to second innings
      this.innings = 2;
      this.battingTeam = this.battingTeam === 'a' ? 'b' : 'a';
      this.runs = 0;
      this.wickets = 0;
      this.overs = 0;
      this.balls = 0;
      this.freeHit = false;
      this.currentOverBalls = [];
      this.updateUI();
    } else {
      this.announceWinner();
    }
  }

  announceWinner() {
    const battingName = this.teamNames[this.battingTeam];
    const bowlingName = this.teamNames[this.battingTeam === 'a' ? 'b' : 'a'];
    let winnerAnnouncement = "";

    if (this.runs >= this.target) {
      const wicketsLeft = this.maxWickets - this.wickets;
      winnerAnnouncement = `${battingName} won the match by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}!`;
    } else {
      const runsMargin = this.target - 1 - this.runs;
      winnerAnnouncement = `${bowlingName} won the match by ${runsMargin} run${runsMargin > 1 ? 's' : ''}!`;
    }

    window.triggerConfetti();
    window.speechEngine.speak(winnerAnnouncement);
    alert(winnerAnnouncement);
    this.logEvent(`Match End - ${winnerAnnouncement}`, 'goal');
  }

  switchInnings() {
    this.saveState();
    this.battingTeam = this.battingTeam === 'a' ? 'b' : 'a';
    this.innings = this.innings === 1 ? 2 : 1;
    if (this.innings === 1) {
      this.target = null;
    } else {
      const targetStr = prompt('Enter Target Score (optional):', this.target || '');
      this.target = targetStr ? parseInt(targetStr) : null;
    }
    
    this.runs = 0;
    this.wickets = 0;
    this.overs = 0;
    this.balls = 0;
    this.freeHit = false;
    this.currentOverBalls = [];
    
    this.logEvent(`Switched: ${this.teamNames[this.battingTeam]} batting (Innings ${this.innings})`);
    this.updateUI();
  }

  updateOversLimit(val) {
    this.saveState();
    this.matchOvers = parseInt(val) || 20;
    this.logEvent(`Overs limit set to ${this.matchOvers}`);
    this.updateUI();
  }

  updateWicketsLimit(val) {
    this.saveState();
    this.maxWickets = parseInt(val) || 10;
    this.logEvent(`Wickets limit set to ${this.maxWickets}`);
    this.updateUI();
  }

  logEvent(action, type = 'normal') {
    const formattedOver = `${this.overs}.${this.balls}`;
    const elapsed = `Over ${formattedOver}`;
    this.logs.unshift({
      time: elapsed,
      text: action,
      type: type
    });
    if (this.logs.length > 30) this.logs.pop();
    this.updateLogsDisplay();
    if (window.appController) {
      window.appController.addGlobalLog('cricket', elapsed, action, type);
    }
  }

  // --- Run Rate Calculations ---
  getRunRate() {
    const totalBalls = (this.overs * 6) + this.balls;
    if (totalBalls === 0) return '0.00';
    return ((this.runs / totalBalls) * 6).toFixed(2);
  }

  getRequiredRunRate() {
    if (this.target === null || this.innings !== 2) return null;
    const totalBalls = (this.matchOvers * 6);
    const ballsBowled = (this.overs * 6) + this.balls;
    const ballsRemaining = Math.max(0, totalBalls - ballsBowled);
    
    if (this.runs >= this.target) return '0.00';
    if (ballsRemaining === 0) return '∞';

    const runsNeeded = this.target - this.runs;
    return ((runsNeeded / ballsRemaining) * 6).toFixed(2);
  }

  // --- UI Updates ---
  updateUI() {
    // Run-Wickets Display
    document.getElementById('crick-runs').textContent = this.runs;
    document.getElementById('crick-wickets').textContent = this.wickets;
    document.getElementById('crick-max-wickets').textContent = this.maxWickets;

    // Overs Display
    document.getElementById('crick-overs').textContent = `${this.overs}.${this.balls}`;

    // Batting Team Label
    const battingLabel = this.teamNames[this.battingTeam];
    document.getElementById('crick-batting-team').textContent = battingLabel;
    
    // Names
    document.getElementById('crick-name-a').value = this.teamNames.a;
    document.getElementById('crick-name-b').value = this.teamNames.b;

    // Innings Toggle Label
    document.getElementById('crick-innings').textContent = `Innings ${this.innings}`;

    // Run rate
    document.getElementById('crick-rr').textContent = this.getRunRate();

    // Overs/Wickets config values
    const oversSelect = document.getElementById('crick-config-overs');
    if (oversSelect) oversSelect.value = this.matchOvers;
    const wicketsSelect = document.getElementById('crick-config-wickets');
    if (wicketsSelect) wicketsSelect.value = this.maxWickets;

    // Free Hit Banner Display
    const freeHitBanner = document.getElementById('crick-freehit-banner');
    if (freeHitBanner) {
      if (this.freeHit) {
        freeHitBanner.style.display = 'block';
        freeHitBanner.classList.add('pulse');
      } else {
        freeHitBanner.style.display = 'none';
        freeHitBanner.classList.remove('pulse');
      }
    }

    // Target Info Bar
    const targetBar = document.getElementById('crick-target-bar');
    if (this.innings === 2 && this.target !== null) {
      const runsNeeded = this.target - this.runs;
      const currentBalls = (this.overs * 6) + this.balls;
      const limit = this.matchOvers * 6;
      const ballsRemaining = Math.max(0, limit - currentBalls);
      
      targetBar.style.display = 'flex';
      targetBar.innerHTML = `
        <span>Target: <strong>${this.target}</strong></span>
        <span>Need <strong>${runsNeeded}</strong> off <strong>${ballsRemaining}</strong> balls</span>
        <span>Req RR: <strong>${this.getRequiredRunRate()}</strong></span>
      `;
    } else {
      targetBar.style.display = 'none';
    }

    this.updateBallsDisplay();
    this.updateLogsDisplay();
  }

  updateBallsDisplay() {
    const list = document.getElementById('crick-balls-list');
    if (!list) return;

    list.innerHTML = '';
    
    if (this.currentOverBalls.length === 0) {
      list.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Waiting for first ball...</span>';
      return;
    }

    this.currentOverBalls.forEach(ball => {
      const el = document.createElement('div');
      el.className = 'ball-circle';
      el.textContent = ball;
      
      if (ball === '4') el.classList.add('four');
      else if (ball === '6') el.classList.add('six');
      else if (ball === 'W') el.classList.add('wicket');
      else if (ball.includes('Wd') || ball.includes('Nb') || ball.includes('Lb') || ball.includes('B')) {
        el.classList.add('extra');
      }
      
      list.appendChild(el);
    });
  }

  updateLogsDisplay() {
    const container = document.getElementById('crick-logs');
    if (!container) return;

    container.innerHTML = '';
    this.logs.forEach(log => {
      const el = document.createElement('div');
      el.className = `log-item cricket ${log.type === 'wicket' ? 'pulse' : ''}`;
      el.innerHTML = `
        <span>${log.text}</span>
        <span class="time-tag">${log.time}</span>
      `;
      container.appendChild(el);
    });
  }

  bindEvents() {
    // Scoring buttons
    document.getElementById('crick-btn-0').onclick = () => this.addDotBall();
    document.getElementById('crick-btn-1').onclick = () => this.addRuns(1);
    document.getElementById('crick-btn-2').onclick = () => this.addRuns(2);
    document.getElementById('crick-btn-3').onclick = () => this.addRuns(3);
    document.getElementById('crick-btn-4').onclick = () => this.addRuns(4, true);
    document.getElementById('crick-btn-6').onclick = () => this.addRuns(6, true);
    
    // Extras
    document.getElementById('crick-btn-wd').onclick = () => this.addExtra('Wd');
    document.getElementById('crick-btn-nb').onclick = () => this.addExtra('Nb');
    document.getElementById('crick-btn-lb').onclick = () => this.addExtra('Lb');
    document.getElementById('crick-btn-b').onclick = () => this.addExtra('B');

    // Dismissal flow
    const outBtn = document.getElementById('crick-btn-out');
    const backdrop = document.getElementById('crick-wicket-modal-backdrop');
    
    outBtn.onclick = () => {
      backdrop.classList.add('active');
    };

    // Close modal on outside click
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.classList.remove('active');
    };

    // Dismissal selector buttons inside modal
    const wicketTypes = ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket', 'Others'];
    const wicketGrid = document.getElementById('crick-wicket-types-grid');
    if (wicketGrid) {
      wicketGrid.innerHTML = '';
      wicketTypes.forEach(type => {
        const btn = document.createElement('button');
        btn.className = 'crick-btn';
        btn.textContent = type;
        btn.onclick = () => {
          this.addWicket(type);
          backdrop.classList.remove('active');
        };
        wicketGrid.appendChild(btn);
      });
    }

    // Config controls
    const oversSelect = document.getElementById('crick-config-overs');
    if (oversSelect) {
      oversSelect.onchange = (e) => this.updateOversLimit(e.target.value);
    }
    const wicketsSelect = document.getElementById('crick-config-wickets');
    if (wicketsSelect) {
      wicketsSelect.onchange = (e) => this.updateWicketsLimit(e.target.value);
    }

    // Settings / Team names
    document.getElementById('crick-name-a').onchange = (e) => {
      this.teamNames.a = e.target.value || 'Team A';
      this.updateUI();
    };
    document.getElementById('crick-name-b').onchange = (e) => {
      this.teamNames.b = e.target.value || 'Team B';
      this.updateUI();
    };

    document.getElementById('crick-innings').onclick = () => this.switchInnings();

    // Global actions
    document.getElementById('crick-reset').onclick = () => {
      if (confirm('Reset Cricket match?')) {
        this.reset();
        this.updateUI();
      }
    };
    document.getElementById('crick-undo').onclick = () => this.undo();
  }

  deactivate() {
    this.updateUI();
  }
}

window.CricketGame = CricketGame;
