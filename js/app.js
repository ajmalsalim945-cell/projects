/**
 * MULTI-SPORT SCORE KEEPER - CORE APPLICATION COORDINATOR
 */

class AppController {
  constructor() {
    this.currentView = 'home'; // 'home', 'football', 'cricket', 'basketball', 'volleyball', 'badminton'
    this.games = {};
    this.globalLogs = []; // Unified feed of all events
    
    this.init();
  }

  init() {
    // Instantiate sport modules
    this.games = {
      football: new window.FootballGame(),
      cricket: new window.CricketGame(),
      basketball: new window.BasketballGame(),
      volleyball: new window.VolleyballGame(),
      badminton: new window.BadmintonGame()
    };

    // Bind event listeners
    this.bindNavigationEvents();
    this.bindSettingsEvents();
    this.bindThemeEvents();
    this.bindOnboardingSpeech();
    this.initConfettiHelper();
    this.bindGlobalLogsEvents();
    this.bindVideoTutorialEvents();

    // Initialize UI on startup
    this.routeTo('home');
  }

  // --- View Routing ---
  routeTo(viewName) {
    const prevView = this.currentView;
    if (prevView !== 'home' && this.games[prevView]) {
      this.games[prevView].deactivate();
    }

    this.currentView = viewName;

    const fromEl = document.getElementById(`view-${prevView}`);
    const toEl = document.getElementById(`view-${viewName}`);

    const updateBodyTheme = () => {
      // Update body theme class for sports background animations (preserving light-theme)
      const isLightTheme = document.body.classList.contains('light-theme');
      document.body.className = isLightTheme ? 'light-theme' : '';
      if (viewName !== 'home') {
        document.body.classList.add(`theme-${viewName}`);
      }
    };

    const activateGameLogic = () => {
      if (viewName !== 'home' && this.games[viewName]) {
        const game = this.games[viewName];
        game.updateUI();
        
        if (!game.eventsBound) {
          game.bindEvents();
          game.eventsBound = true;
        }
        
        document.getElementById('header-back-btn').style.display = 'flex';
      } else {
        // On dashboard - Update status badges & unified global logs
        document.getElementById('header-back-btn').style.display = 'none';
        this.updateDashboardLiveBadges();
        this.updateGlobalLogsUI();
      }
    };

    if (window.gsap && fromEl && toEl && prevView !== viewName) {
      // Fade out previous view
      gsap.to(fromEl, {
        opacity: 0,
        y: -15,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          fromEl.style.display = 'none';
          fromEl.classList.remove('active');

          // Update theme and activate game logic
          updateBodyTheme();
          activateGameLogic();

          // Prepare toEl
          toEl.style.display = 'block';
          toEl.classList.add('active');

          // Animate in toEl
          gsap.fromTo(toEl,
            { opacity: 0, y: 20, scale: 0.97 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.4,
              ease: 'back.out(1.5)',
              clearProps: 'transform,opacity',
              onComplete: () => {
                // Refresh AOS positions since view heights changed
                if (window.AOS) {
                  window.AOS.refresh();
                }
              }
            }
          );
        }
      });
    } else {
      // Fallback
      updateBodyTheme();
      activateGameLogic();

      const views = ['home', 'football', 'cricket', 'basketball', 'volleyball', 'badminton'];
      views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) {
          if (v === viewName) {
            el.style.display = 'block';
            el.classList.add('active');
            el.style.opacity = '1';
          } else {
            el.style.display = 'none';
            el.classList.remove('active');
          }
        }
      });
      if (window.AOS) {
        window.AOS.refresh();
      }
    }
  }

  updateDashboardLiveBadges() {
    const checkActive = (sport) => {
      const card = document.getElementById(`card-${sport}`);
      if (!card) return;

      const existing = card.querySelector('.card-live-badge');
      if (existing) existing.remove();

      let isLive = false;
      let label = 'LIVE';

      const game = this.games[sport];

      if (sport === 'football') {
        if (game.timer.seconds > 0 || game.scores.a > 0 || game.scores.b > 0) {
          isLive = true;
          label = `Live: ${game.scores.a}-${game.scores.b}`;
        }
      } else if (sport === 'cricket') {
        if (game.runs > 0 || game.wickets > 0 || game.overs > 0 || game.balls > 0) {
          isLive = true;
          label = `Live: ${game.runs}/${game.wickets}`;
        }
      } else if (sport === 'basketball') {
        const standardSeconds = game.quarter === 'OT' ? 300 : game.quarterLength * 60;
        if (game.scores.home > 0 || game.scores.away > 0 || game.gameClock.seconds !== standardSeconds) {
          isLive = true;
          label = `Live: ${game.scores.home}-${game.scores.away}`;
        }
      } else if (sport === 'volleyball') {
        if (game.scores.a > 0 || game.scores.b > 0 || game.setsWon.a > 0 || game.setsWon.b > 0) {
          isLive = true;
          label = `Sets: ${game.setsWon.a}-${game.setsWon.b}`;
        }
      } else if (sport === 'badminton') {
        if (game.scores.a > 0 || game.scores.b > 0 || game.gamesWon.a > 0 || game.gamesWon.b > 0) {
          isLive = true;
          label = `Games: ${game.gamesWon.a}-${game.gamesWon.b}`;
        }
      }

      if (isLive) {
        const badge = document.createElement('span');
        badge.className = 'card-live-badge';
        badge.textContent = label;
        card.appendChild(badge);
      }
    };

    ['football', 'cricket', 'basketball', 'volleyball', 'badminton'].forEach(checkActive);
  }

  // --- Global Logs (Unified Feed) ---
  addGlobalLog(sport, sportTime, text, type = 'normal') {
    this.globalLogs.unshift({
      sport: sport,
      time: sportTime,
      text: text,
      type: type,
      realTime: new Date()
    });
    
    // Limit to last 50 events
    if (this.globalLogs.length > 50) this.globalLogs.pop();
    
    // Update live UI if currently on dashboard
    if (this.currentView === 'home') {
      this.updateGlobalLogsUI();
    }
  }

  updateGlobalLogsUI() {
    const container = document.getElementById('global-logs-container');
    if (!container) return;

    if (this.globalLogs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 3rem 0; font-size: 0.9rem;">
          No match events recorded yet. Select a sport and start scoring to populate this feed!
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    
    const badges = {
      football: { 
        label: 'FOOTBALL', 
        color: 'var(--color-football)',
        svg: `<svg viewBox="0 0 24 24" style="fill: var(--color-football); width: 16px; height: 16px; flex-shrink: 0; display: inline-block; vertical-align: middle;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-3.31 0-6-2.69-6-6 0-.32.03-.64.08-.95l3.29-1.9 2.1 3.64c.18.3.52.48.88.45l4.37-.38c.36-.03.68-.24.84-.56l1.23-2.45c.42.71.69 1.48.83 2.3L16 16.5c-.38.33-.5.87-.27 1.34l1.24 2.48c-1.39.95-3.08 1.51-4.97 1.61zM4.1 11.23c.31.25.72.33 1.09.2l3.41-1.14 1.47 2.54-2.88 1.66c-.34.19-.55.56-.55.95 0 .23.07.45.2.64l.87 1.3-3-1.73c-.73-1.63-1.07-3.41-.61-5.42zm15.8 2.54c-.16.32-.48.53-.84.56l-3.37.29-.98-1.7c-.18-.3-.52-.48-.88-.45l-3.41.3c-.36.03-.68.24-.84.56l-.88 1.76-1.57-2.72c-.18-.3-.15-.68.08-.95l2.63-3.07c.23-.27.59-.38.93-.29l3.66.98c.34.09.62.33.74.66l1.6 4.39 3.07 1.09z"/></svg>`
      },
      cricket: { 
        label: 'CRICKET', 
        color: 'var(--color-cricket)',
        svg: `<svg viewBox="0 0 24 24" style="fill: var(--color-cricket); width: 16px; height: 16px; flex-shrink: 0; display: inline-block; vertical-align: middle;"><path d="M18.5 2.5c-.6-.6-1.5-.6-2.1 0l-2.1 2.1c-.2.2-.3.5-.3.8 0 .3.1.6.3.8l.7.7-9.2 9.2c-.4.4-.7.9-.8 1.5l-.5 3.5c-.1.5.1 1 .5 1.4.4.4.9.6 1.4.5l3.5-.5c.6-.1 1.1-.4 1.5-.8l9.2-9.2.7.7c.4.4 1.2.4 1.6 0l2.1-2.1c.6-.6.6-1.5 0-2.1l-4.8-4.8zm-11 15.6c-.2.2-.4.3-.7.3l-1.5.2.2-1.5c0-.3.1-.5.3-.7l8.5-8.5 1.7 1.7-8.8 8.8z"/><circle cx="7.5" cy="7.5" r="3"/></svg>`
      },
      basketball: { 
        label: 'BASKETBALL', 
        color: 'var(--color-basketball)',
        svg: `<svg viewBox="0 0 24 24" style="fill: var(--color-basketball); width: 16px; height: 16px; flex-shrink: 0; display: inline-block; vertical-align: middle;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c1.85 0 3.55.63 4.9 1.69L13.25 9.3c-.34-.41-.86-.67-1.44-.67-.58 0-1.1.26-1.44.67L6.72 5.69C8.07 4.63 9.77 4 12 4zM4.69 6.72l3.61 3.61c-.41.34-.67.86-.67 1.44 0 .09.02.18.04.27l-4.88.94c-.11-.79-.19-1.6-.19-2.4 0-1.04.22-2.02.59-2.92l1.5-1.54zm.8 6.94l4.88-.94c.1.37.3.7.57.96l-3.61 3.61-1.5-1.5c-.24-.59-.34-1.24-.34-2.13zm1.69 4.9l3.61-3.61c.34.41.86.67 1.44.67s1.1-.26 1.44-.67l3.61 3.61C15.55 19.37 13.85 20 12 20s-3.55-.63-4.9-1.69zm10.13-1.29l-3.61-3.61c.27-.26.47-.59.57-.96h4.88l-1.5 1.5c-.1.32-.2.53-.34.57zm2.19-4.81h-4.88c.02-.09.04-.18.04-.27 0-.58-.26-1.1-.67-1.44l3.61-3.61 1.5 1.5c.24.59.34 1.24.34 2.13v1.69zm-1.18-6.44l-3.61 3.61c-.34-.41-.86-.67-1.44-.67s-1.1.26-1.44.67l-3.61-3.61 1.5-1.5c.59-.24 1.24-.34 2.13-.34s1.54.1 2.13.34l1.5 1.5z"/></svg>`
      },
      volleyball: { 
        label: 'VOLLEYBALL', 
        color: 'var(--color-volleyball)',
        svg: `<svg viewBox="0 0 24 24" style="fill: var(--color-volleyball); width: 16px; height: 16px; flex-shrink: 0; display: inline-block; vertical-align: middle;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm1-11.83v2.09c1.6.38 3 1.24 4 2.45L18.8 9.3c-1.39-1.68-3.46-2.74-5.8-3.13zm-2 0c-2.34.39-4.41 1.45-5.8 3.13L6.8 11.71c1-1.21 2.4-2.07 4-2.45V6.17zM5.1 13h2.09c.14.73.43 1.41.83 2L6.2 16.82C5.5 15.69 5.1 14.4 5.1 13zm11.7 3.82l-1.82-1.82c.4-.59.69-1.27.83-2H18.9c0 1.4-.4 2.69-1.1 3.82zm-6.91-1.29l1.41-1.41v2.83l-1.41-1.42z"/></svg>`
      },
      badminton: { 
        label: 'BADMINTON', 
        color: 'var(--color-badminton)',
        svg: `<svg viewBox="0 0 24 24" style="fill: var(--color-badminton); width: 16px; height: 16px; flex-shrink: 0; display: inline-block; vertical-align: middle;"><path d="M12 2a1 1 0 0 0-.97.76l-3 12.5a1 1 0 0 0 .82 1.21c.05 0 .1 0 .15 0h6a1 1 0 0 0 .97-.76l-3-12.5A1 1 0 0 0 12 2zm-2.8 13L11.5 5h1l2.3 10h-5.6z"/><path d="M12 17.5c-1.93 0-3.5 1.12-3.5 2.5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1c0-1.38-1.57-2.5-3.5-2.5z"/></svg>`
      }
    };

    this.globalLogs.forEach(log => {
      const el = document.createElement('div');
      el.className = `log-item ${log.sport} ${log.type === 'goal' || log.type === 'wicket' ? 'pulse' : ''}`;
      
      const badgeInfo = badges[log.sport] || { label: 'LOG', color: 'var(--text-muted)', svg: '' };
      
      el.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${badgeInfo.svg}
          <span style="color: ${badgeInfo.color}; font-weight: 800; font-size: 0.7rem; letter-spacing: 0.05em; flex-shrink: 0;">${badgeInfo.label}</span>
          <span style="border-left: 1px solid var(--card-border); height: 12px; margin: 0 0.15rem; flex-shrink: 0;"></span>
          <span style="color: var(--text-primary); font-weight: 500;">${log.text}</span>
        </div>
        <span class="time-tag" style="flex-shrink: 0; margin-left: 0.75rem;">${log.time}</span>
      `;
      container.appendChild(el);
    });
  }

  bindGlobalLogsEvents() {
    const clearBtn = document.getElementById('global-logs-clear');
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (confirm('Clear the global live feed?')) {
          this.globalLogs = [];
          this.updateGlobalLogsUI();
        }
      };
    }
  }

  bindVideoTutorialEvents() {
    const modal = document.getElementById('video-tutorial-modal');
    const modalTitle = document.getElementById('video-modal-title');
    const modalIframe = document.getElementById('video-modal-iframe');
    const closeBtn = document.getElementById('video-modal-close');

    console.log("bindVideoTutorialEvents: elements checked", {
      modal: !!modal,
      modalTitle: !!modalTitle,
      modalIframe: !!modalIframe,
      closeBtn: !!closeBtn
    });

    if (!modal || !modalIframe || !closeBtn) {
      console.warn("bindVideoTutorialEvents: missing required elements, aborting setup.");
      return;
    }

    const openVideoModal = (videoId, sportName) => {
      console.log("openVideoModal triggering:", { videoId, sportName });
      // Load the YouTube embed URL with autoplay, hide related videos, etc.
      modalIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      modalTitle.textContent = `${sportName} Rules Tutorial`;
      modal.classList.add('active');

      // GSAP transition if loaded
      const container = modal.querySelector('.video-modal-container');
      if (window.gsap && container) {
        console.log("openVideoModal: running GSAP intro animation.");
        gsap.fromTo(container,
          { scale: 0.9, opacity: 0, y: 30 },
          { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
        );
      }
    };

    const closeVideoModal = () => {
      console.log("closeVideoModal triggering");
      modalIframe.src = ''; // Stops playback by resetting iframe URL
      modal.classList.remove('active');
    };

    // Bind cards in the Home view
    const tutorialCards = document.querySelectorAll('.tutorial-card');
    console.log(`bindVideoTutorialEvents: binding ${tutorialCards.length} tutorial cards.`);
    tutorialCards.forEach(card => {
      card.onclick = () => {
        const videoId = card.getAttribute('data-video-id');
        const sportName = card.getAttribute('data-sport-name');
        console.log("Tutorial card clicked:", { videoId, sportName });
        openVideoModal(videoId, sportName);
      };
    });

    // Bind sport-view help buttons
    const helpButtons = document.querySelectorAll('.tutorial-help-btn');
    console.log(`bindVideoTutorialEvents: binding ${helpButtons.length} help buttons.`);
    helpButtons.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const videoId = btn.getAttribute('data-video-id');
        const sportName = btn.getAttribute('data-sport-name');
        console.log("Help button clicked:", { videoId, sportName });
        openVideoModal(videoId, sportName);
      };
    });

    // Close button click
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeVideoModal();
    };

    // Overlay backdrop click closes modal
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeVideoModal();
      }
    };

    // Escape key press closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeVideoModal();
      }
    });
  }

  bindNavigationEvents() {
    document.getElementById('app-brand').onclick = () => this.routeTo('home');
    document.getElementById('header-back-btn').onclick = () => this.routeTo('home');

    const cards = document.querySelectorAll('.sport-card');
    cards.forEach(card => {
      card.onclick = () => {
        const sport = card.getAttribute('data-sport');
        this.routeTo(sport);
      };
    });
  }

  bindSettingsEvents() {
    const settingsBtn = document.getElementById('header-settings-btn');
    const dropdown = document.getElementById('voice-settings-dropdown');
    
    settingsBtn.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    };

    document.addEventListener('click', (e) => {
      if (dropdown.classList.contains('active') && !dropdown.contains(e.target) && e.target !== settingsBtn) {
        dropdown.classList.remove('active');
      }
    });

    const muteToggle = () => {
      const isMuted = window.speechEngine.toggleMute();
      this.updateMuteUIState(isMuted);
    };

    document.getElementById('global-mute-btn').onclick = muteToggle;
    document.getElementById('panel-mute-btn').onclick = muteToggle;

    const micBtn = document.getElementById('global-mic-btn');
    if (micBtn) {
      micBtn.onclick = () => {
        if (window.voiceRecognition) {
          window.voiceRecognition.toggleListening();
        }
      };
    }

    if (window.voiceRecognition) {
      window.voiceRecognition.bindLangSettings();
    }

    const volumeSlider = document.getElementById('voice-volume');
    const rateSlider = document.getElementById('voice-rate');
    const pitchSlider = document.getElementById('voice-pitch');

    const updateEngine = () => {
      window.speechEngine.updateSettings(
        volumeSlider.value,
        rateSlider.value,
        pitchSlider.value
      );
    };

    [volumeSlider, rateSlider, pitchSlider].forEach(slider => {
      slider.oninput = () => {
        updateEngine();
        const valSpan = document.getElementById(`${slider.id}-val`);
        if (valSpan) valSpan.textContent = slider.value;
      };
    });
  }

  updateMuteUIState(isMuted) {
    const globalIcon = document.querySelector('#global-mute-btn svg');
    const panelBtn = document.getElementById('panel-mute-btn');
    
    if (isMuted) {
      if (globalIcon) {
        globalIcon.innerHTML = `<path d="M3.9 2.23L2.23 3.9l4.5 4.5H3v7.35h4.9l4.9 4.9V15.4l5.36 5.36 1.67-1.67L3.9 2.23zM10.8 14.86L8.94 13H5v-3.35h3.94l1.86-1.86v7.07zm4.2-2.86c0-1.78-.96-3.33-2.4-4.14v2.09l2.35 2.35c.03-.1.05-.2.05-.3zm1.8 0c0 .94-.19 1.83-.52 2.65l1.6 1.6C18.57 15.69 19 14.4 19 12c0-4.32-3.03-7.93-7-8.84v2.09c2.83.87 5 3.52 5 6.75zM12 3.27L10.12 5.15 12 7.03V3.27z"/>`;
      }
      if (panelBtn) {
        panelBtn.textContent = 'Unmute Voice Assistant';
        panelBtn.classList.add('muted');
      }
    } else {
      if (globalIcon) {
        globalIcon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
      }
      if (panelBtn) {
        panelBtn.textContent = 'Mute Voice Assistant';
        panelBtn.classList.remove('muted');
      }
    }
  }

  bindThemeEvents() {
    const themeBtn = document.getElementById('header-theme-btn');
    themeBtn.onclick = () => {
      document.body.classList.toggle('light-theme');
      const icon = themeBtn.querySelector('svg');
      if (document.body.classList.contains('light-theme')) {
        icon.innerHTML = `<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41l1.06-1.06z"/>`;
      } else {
        icon.innerHTML = `<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>`;
      }
    };
  }

  initConfettiHelper() {
    window.triggerConfetti = () => {
      const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
      const count = 75;

      for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.width = (Math.random() * 8 + 6) + 'px';
        particle.style.height = (Math.random() * 12 + 6) + 'px';
        particle.style.animationDelay = (Math.random() * 0.4) + 's';
        particle.style.animationDuration = (Math.random() * 1.5 + 1.3) + 's';
        
        particle.style.opacity = Math.random() * 0.5 + 0.5;
        if (Math.random() > 0.5) {
          particle.style.borderRadius = '50%';
        }

        document.body.appendChild(particle);

        setTimeout(() => {
          particle.remove();
        }, 3000);
      }
    };
  }

  bindOnboardingSpeech() {
    const unlockSpeech = () => {
      window.speechEngine.speak(""); 
      document.removeEventListener('click', unlockSpeech);
      document.removeEventListener('touchstart', unlockSpeech);
    };
    document.addEventListener('click', unlockSpeech);
    document.addEventListener('touchstart', unlockSpeech);
  }
}

// Start app once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.appController = new AppController();

  // Initialize AOS (Animate on Scroll)
  if (window.AOS) {
    window.AOS.init({
      duration: 800,
      easing: 'ease-out-back',
      once: true
    });
  }
});
