/**
 * MULTI-SPORT SCORE KEEPER - SPEECH ENGINE
 * Manages text-to-speech feedback using the browser's Web Speech API.
 */

class SpeechEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.muted = false;
    this.volume = 1.0;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.selectedVoice = null;
    this.voices = [];

    // Initialize voices
    this.initVoices();
    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.initVoices();
    }
  }

  /**
   * Loads available system voices and triggers dropdown update if element exists.
   */
  initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    this.updateVoicesDropdown();
  }

  /**
   * Populates the HTML dropdown with system voices.
   */
  updateVoicesDropdown() {
    const dropdown = document.getElementById('voice-select');
    if (!dropdown) return;

    dropdown.innerHTML = '';
    
    // Filter voices to English and Malayalam by default if available, or list all
    const filteredVoices = this.voices.filter(v => v.lang.startsWith('en') || v.lang.startsWith('ml'));
    const voicesToList = filteredVoices.length > 0 ? filteredVoices : this.voices;

    voicesToList.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      
      // Default selection (prefer Google US English or standard English)
      if (voice.name.includes('Google US English') || voice.name.includes('Google UK English Female') || (index === 0 && !this.selectedVoice)) {
        option.selected = true;
        this.selectedVoice = voice;
      }
      
      dropdown.appendChild(option);
    });

    // Handle voice change
    dropdown.onchange = (e) => {
      this.selectedVoice = this.voices.find(v => v.name === e.target.value);
    };
  }

  /**
   * Speaks the provided text after canceling any active speeches.
   * @param {string} text - Message to be spoken.
   * @param {boolean} force - Speak even if muted (useful for settings check).
   */
  speak(text, force = false) {
    if (!this.synth) return;
    if (this.muted && !force) return;

    // Interrupt current speaking
    this.synth.cancel();

    if (!text) return;

    // Translate to Malayalam if a Malayalam voice is active
    if (this.selectedVoice && this.selectedVoice.lang.startsWith('ml')) {
      text = this.translateToMalayalam(text);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = this.volume;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    this.synth.speak(utterance);
  }

  /**
   * Toggles the mute state.
   * @returns {boolean} New muted state.
   */
  toggleMute() {
    this.muted = !this.muted;
    const muteBtn = document.getElementById('global-mute-btn');
    const panelMuteBtn = document.getElementById('panel-mute-btn');
    
    // Update mute icons/classes
    [muteBtn, panelMuteBtn].forEach(btn => {
      if (btn) {
        if (this.muted) {
          btn.classList.add('muted');
          btn.setAttribute('title', 'Unmute Voice');
        } else {
          btn.classList.remove('muted');
          btn.setAttribute('title', 'Mute Voice');
        }
      }
    });

    return this.muted;
  }

  /**
   * Updates speech parameters.
   */
  updateSettings(volume, rate, pitch) {
    this.volume = parseFloat(volume);
    this.rate = parseFloat(rate);
    this.pitch = parseFloat(pitch);
  }

  /**
   * Simple regex-based translation tool to convert standard scorekeeper announcements 
   * from English to natural Malayalam phonetics.
   */
  translateToMalayalam(text) {
    let ml = text;

    // Football
    ml = ml.replace(/Goal for (.*?)[!.]/gi, "$1 യ്ക്ക് ഗോൾ!");
    ml = ml.replace(/Scores are level at (.*?) all/gi, "ഇരു ടീമും $1 വീതം നേടി തുല്യ നിലയിലാണ്");
    ml = ml.replace(/(.*?) lead (\d+) to (\d+)/gi, "$1 മുന്നിലാണ്, സ്കോർ $2 - $3");
    ml = ml.replace(/(.*?) trail (\d+) to (\d+)/gi, "$1 പിന്നിലാണ്, സ്കോർ $2 - $3");
    ml = ml.replace(/Yellow card for (.*?)\./gi, "$1 യ്ക്ക് മഞ്ഞ കാർഡ്.");
    ml = ml.replace(/Red card for (.*?)\!/gi, "$1 യ്ക്ക് ചുവപ്പ് കാർഡ്!");
    ml = ml.replace(/Corner kick for (.*?)\./gi, "$1 യ്ക്ക് കോർണർ കിക്ക്.");
    ml = ml.replace(/Foul on (.*?)\./gi, "$1 ചെയ്ത ഫൗൾ.");
    ml = ml.replace(/Offside called on (.*?)\./gi, "$1 യുടെ ഓഫ്സൈഡ്.");

    // Cricket
    ml = ml.replace(/(\d+) run(s?)\./gi, "$1 റൺസ്.");
    ml = ml.replace(/Four runs!/gi, "ഫോർ റൺസ്!");
    ml = ml.replace(/Six runs!/gi, "സിക്സ് റൺസ്!");
    ml = ml.replace(/Wide ball\./gi, "വൈഡ് ബോൾ.");
    ml = ml.replace(/No ball, Free Hit!/gi, "നോ ബോൾ, ഫ്രീ ഹിറ്റ്!");
    ml = ml.replace(/Out! Wicket falls\./gi, "ഔട്ട്! വിക്കറ്റ് പോയി.");
    ml = ml.replace(/Over complete\./gi, "ഓവർ കഴിഞ്ഞു.");
    ml = ml.replace(/Over complete\. Score: (\d+) for (\d+) after (\d+) overs\./gi, "ഓവർ കഴിഞ്ഞു. സ്കോർ: $3 ഓവറിൽ $1 ന് $2 വിക്കറ്റ്.");
    ml = ml.replace(/Innings completed\./gi, "ഇന്നിങ്സ് കഴിഞ്ഞു.");
    ml = ml.replace(/Target for (.*?) is (\d+) runs\./gi, "$1 ന്റെ ലക്ഷ്യം $2 റൺസ് ആണ്.");
    ml = ml.replace(/(.*?) won the match by (.*?) wicket(s?)\!/gi, "$1 $2 വിക്കറ്റിന് മത്സരം ജയിച്ചു!");
    ml = ml.replace(/(.*?) won the match by (.*?) run(s?)\!/gi, "$1 $2 റൺസിന് മത്സരം ജയിച്ചു!");

    // Basketball
    ml = ml.replace(/Free throw good for (.*?)\./gi, "$1 ന്റെ ഫ്രീ ത്രോ വിജയിച്ചു.");
    ml = ml.replace(/Two points for (.*?)\./gi, "$1 യ്ക്ക് രണ്ട് പോയിന്റ്.");
    ml = ml.replace(/Three pointer for (.*?)\!/gi, "$1 യ്ക്ക് ത്രീ പോയിന്റർ!");
    ml = ml.replace(/Timeout called by (.*?)\./gi, "$1 ടൈം ഔട്ട് എടുത്തിരിക്കുന്നു.");
    ml = ml.replace(/Warning, (.*?) is now in bonus\!/gi, "മുന്നറിയിപ്പ്, $1 ബോണസ് ഘട്ടത്തിലാണ്!");
    ml = ml.replace(/Shot clock violation\!/gi, "ഷോട്ട് ക്ലോക്ക് നിയമലംഘനം!");
    ml = ml.replace(/Started (.*?)\./gi, "$1 ആരംഭിച്ചിരിക്കുന്നു.");
    ml = ml.replace(/Possession (.*?)\./gi, "പന്ത് കൈവശം വെച്ചിരിക്കുന്നത് $1 ആണ്.");
    ml = ml.replace(/End of (.*?)\./gi, "$1 കഴിഞ്ഞു.");

    // Volleyball / Badminton / General point
    ml = ml.replace(/Point (.*?)\./gi, "$1 യ്ക്ക് പോയിന്റ്.");
    ml = ml.replace(/Service over\./gi, "സർവീസ് മാറി.");
    ml = ml.replace(/Match point (.*?)\!/gi, "മാച്ച് പോയിന്റ് $1!");
    ml = ml.replace(/Set point (.*?)\!/gi, "സെറ്റ് പോയിന്റ് $1!");
    ml = ml.replace(/Game point (.*?)\!/gi, "ഗെയിം പോയിന്റ് $1!");
    ml = ml.replace(/Switch court sides\!/gi, "കോർട്ട് സൈഡ് മാറ്റുക!");
    ml = ml.replace(/Game interval. Take a sixty second break./gi, "ഗെയിം ഇടവേള. അറുപത് സെക്കൻഡ് വിശ്രമിക്കുക.");
    ml = ml.replace(/Switched to (.*?) court rules\./gi, "$1 കോർട്ട് റൂളുകളിലേക്ക് മാറ്റി.");
    ml = ml.replace(/singles/gi, "സിംഗിൾസ്");
    ml = ml.replace(/doubles/gi, "ഡബിൾസ്");
    ml = ml.replace(/(.*?) wins set (\d+), (\d+) to (\d+)\!/gi, "$2 ആം സെറ്റ് $3 - $4 സ്കോറിന് $1 ജയിച്ചു.");
    ml = ml.replace(/(.*?) wins game (\d+), (\d+) to (\d+)\!/gi, "$2 ആം ഗെയിം $3 - $4 സ്കോറിന് $1 ജയിച്ചു.");

    // Cleanup connectors
    ml = ml.replace(/ to /gi, " - ");

    return ml;
  }
}

// Create a single global instance of SpeechEngine
window.speechEngine = new SpeechEngine();

/**
 * VOICE RECOGNITION MANAGER
 * Integrates Web Speech Recognition API to allow hands-free scoring commands.
 */
class VoiceRecognitionManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.toastTimeout = null;
    this.lang = 'en-US';
    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech Recognition API is not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = this.lang;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateMicUI();
      this.showToast("Voice Control Active");
    };

    this.recognition.onerror = (e) => {
      console.error("Speech recognition error:", e);
      if (e.error === 'not-allowed') {
        this.showToast("Microphone access denied");
        this.isListening = false;
        this.updateMicUI();
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if we want to continue listening (hands-free scoring mode)
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (err) {
          console.error("Failed to restart speech recognition:", err);
        }
      } else {
        this.updateMicUI();
      }
    };

    this.recognition.onresult = (event) => {
      const resultsLength = event.results.length;
      const transcript = event.results[resultsLength - 1][0].transcript.trim().toLowerCase();
      console.log("Speech recognized:", transcript);
      this.handleVoiceCommand(transcript);
    };
  }

  bindLangSettings() {
    const langSelect = document.getElementById('recognition-lang-select');
    if (langSelect) {
      this.lang = langSelect.value;
      if (this.recognition) {
        this.recognition.lang = this.lang;
      }

      langSelect.onchange = (e) => {
        this.lang = e.target.value;
        if (this.recognition) {
          this.recognition.lang = this.lang;
          if (this.isListening) {
            // Restart to apply new language
            this.recognition.stop();
          }
        }
        this.showToast(`Language set to ${this.lang === 'ml-IN' ? 'Malayalam' : 'English'}`);
      };
    }
  }

  toggleListening() {
    if (!this.recognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Safari or Edge.");
      return;
    }

    if (this.isListening) {
      this.isListening = false;
      this.recognition.stop();
      this.showToast("Voice Control Off");
    } else {
      this.isListening = true;
      this.recognition.start();
    }
  }

  updateMicUI() {
    const micBtn = document.getElementById('global-mic-btn');
    if (!micBtn) return;
    if (this.isListening) {
      micBtn.classList.add('listening');
      micBtn.setAttribute('title', 'Stop Voice Control');
    } else {
      micBtn.classList.remove('listening');
      micBtn.setAttribute('title', 'Start Voice Control');
    }
  }

  showToast(text) {
    const toast = document.getElementById('voice-toast');
    if (!toast) return;
    toast.innerHTML = `<span class="mic-indicator-dot"></span><span>${text}</span>`;
    toast.classList.add('active');
    
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('active');
    }, 3000);
  }

  handleVoiceCommand(transcript) {
    if (!window.appController) return;
    const currentSport = window.appController.currentView;

    // 1. Navigation Commands (Global)
    if (currentSport === 'home') {
      if (transcript.includes('open') || transcript.includes('go to') || transcript.includes('select') || transcript.includes('തുറക്കുക') || transcript.includes('തുറക്കൂ')) {
        const sports = ['football', 'cricket', 'basketball', 'volleyball', 'badminton'];
        // Malayalam mappings for routing
        const mlSports = {
          'football': 'ഫുട്ബോൾ',
          'cricket': 'ക്രിക്കറ്റ്',
          'basketball': 'ബാസ്കറ്റ്ബോൾ',
          'volleyball': 'വോളിബോൾ',
          'badminton': 'ബാഡ്മിന്റൺ'
        };

        for (const sport of sports) {
          const mlName = mlSports[sport];
          if (transcript.includes(sport) || transcript.includes(mlName)) {
            window.appController.routeTo(sport);
            this.showToast(`Opened ${sport.charAt(0).toUpperCase() + sport.slice(1)}`);
            window.speechEngine.speak(`Opening ${sport}`);
            return;
          }
        }
      }
      return;
    }

    // 2. Active Game Commands
    const game = window.appController.games[currentSport];
    if (!game) return;

    // Dynamic Team / Player Name Alias Retrieval
    let nameA = 'team a';
    let nameB = 'team b';

    const fbNameA = document.getElementById('fb-name-a');
    const fbNameB = document.getElementById('fb-name-b');
    const crickNameA = document.getElementById('crick-name-a');
    const crickNameB = document.getElementById('crick-name-b');
    const bballNameHome = document.getElementById('bball-name-home');
    const bballNameAway = document.getElementById('bball-name-away');
    const vbNameA = document.getElementById('vb-name-a');
    const vbNameB = document.getElementById('vb-name-b');
    const bmNameA = document.getElementById('bm-name-a');
    const bmNameB = document.getElementById('bm-name-b');

    if (currentSport === 'football' && fbNameA && fbNameB) {
      nameA = fbNameA.value;
      nameB = fbNameB.value;
    } else if (currentSport === 'cricket' && crickNameA && crickNameB) {
      nameA = crickNameA.value;
      nameB = crickNameB.value;
    } else if (currentSport === 'basketball' && bballNameHome && bballNameAway) {
      nameA = bballNameHome.value;
      nameB = bballNameAway.value;
    } else if (currentSport === 'volleyball' && vbNameA && vbNameB) {
      nameA = vbNameA.value;
      nameB = vbNameB.value;
    } else if (currentSport === 'badminton' && bmNameA && bmNameB) {
      nameA = bmNameA.value;
      nameB = bmNameB.value;
    }

    const cleanNameA = nameA.toLowerCase().trim();
    const cleanNameB = nameB.toLowerCase().trim();

    // English & Malayalam aliases for side selection
    const aliasesA = ['team a', 'player a', 'home', 'side a', cleanNameA, 'ടീം എ', 'പ്ലെയർ എ', 'ഹോം', 'സൈഡ് എ'];
    const aliasesB = ['team b', 'player b', 'away', 'side b', cleanNameB, 'ടീം ബി', 'പ്ലെയർ ബി', 'എവേ', 'സൈഡ് ബി'];

    const matchesSideA = aliasesA.some(alias => alias && transcript.includes(alias));
    const matchesSideB = aliasesB.some(alias => alias && transcript.includes(alias));

    // Global Scorekeeper commands inside a view
    if (transcript === 'undo' || transcript === 'cancel last' || transcript.includes('undo last') || transcript.includes('അൺഡൂ') || transcript.includes('മാറ്റൂ') || transcript.includes('ഒഴിവാക്കൂ')) {
      if (game.undo()) {
        this.showToast("Action Undone");
        window.speechEngine.speak("Undone");
      }
      return;
    }

    if (transcript === 'reset scoreboard' || transcript === 'reset game' || transcript === 'reset scorecard' || transcript.includes('റീസെറ്റ്')) {
      const resetBtn = document.getElementById(`${currentSport === 'basketball' ? 'bball' : currentSport === 'volleyball' ? 'vb' : currentSport === 'badminton' ? 'bm' : currentSport === 'football' ? 'fb' : 'crick'}-reset`);
      if (resetBtn) {
        resetBtn.click();
        this.showToast("Scoreboard Reset");
      }
      return;
    }

    // --- SPORT SPECIFIC COMMANDS (ENGLISH & MALAYALAM PARALLEL MATCHING) ---

    // A. FOOTBALL (SOCCER)
    if (currentSport === 'football') {
      const isGoal = transcript.includes('goal') || transcript.includes('point') || transcript.includes('score') || transcript.includes('add') || transcript.includes('ഗോൾ') || transcript.includes('പോയിന്റ്') || transcript.includes('സ്കോർ');
      const isDeduct = transcript.includes('subtract') || transcript.includes('deduct') || transcript.includes('remove') || transcript.includes('minus') || transcript.includes('കുറയ്ക്കുക') || transcript.includes('കുറയ്ക്കൂ') || transcript.includes('മൈനസ്');

      if (isGoal) {
        if (matchesSideA) {
          game.adjustScore('a', 1);
          this.showToast(`Goal ${nameA}!`);
          return;
        } else if (matchesSideB) {
          game.adjustScore('b', 1);
          this.showToast(`Goal ${nameB}!`);
          return;
        }
      } else if (isDeduct) {
        if (matchesSideA) {
          game.adjustScore('a', -1);
          this.showToast(`Subtracted ${nameA}`);
          return;
        } else if (matchesSideB) {
          game.adjustScore('b', -1);
          this.showToast(`Subtracted ${nameB}`);
          return;
        }
      }

      // Timer control by voice
      if (transcript.includes('start clock') || transcript.includes('start timer') || transcript.includes('resume') || transcript.includes('തുടങ്ങുക') || transcript.includes('തുടങ്ങൂ')) {
        if (!game.timer.running) {
          game.toggleClock();
          this.showToast("Clock Started");
        }
        return;
      }
      if (transcript.includes('stop clock') || transcript.includes('pause clock') || transcript.includes('stop timer') || transcript.includes('pause timer') || transcript.includes('നിർത്തുക') || transcript.includes('നിർത്തൂ') || transcript.includes('പോസ്')) {
        if (game.timer.running) {
          game.toggleClock();
          this.showToast("Clock Paused");
        }
        return;
      }
    }

    // B. BASKETBALL
    if (currentSport === 'basketball') {
      const isDeduct = transcript.includes('subtract') || transcript.includes('deduct') || transcript.includes('remove') || transcript.includes('minus') || transcript.includes('കുറയ്ക്കുക') || transcript.includes('കുറയ്ക്കൂ') || transcript.includes('മൈനസ്');
      if (isDeduct) {
        if (matchesSideA) {
          game.adjustScore('home', -1);
          this.showToast(`Subtracted ${nameA}`);
          return;
        } else if (matchesSideB) {
          game.adjustScore('away', -1);
          this.showToast(`Subtracted ${nameB}`);
          return;
        }
      }

      let pts = 0;
      if (transcript.includes('three pointer') || transcript.includes('three points') || transcript.includes('3 pointer') || transcript.includes('3 points') || transcript.includes('three') || transcript.includes('മൂന്ന് പോയിന്റ്') || transcript.includes('മൂന്ന്')) {
        pts = 3;
      } else if (transcript.includes('two points') || transcript.includes('2 points') || transcript.includes('basket') || transcript.includes('double') || transcript.includes('two') || transcript.includes('point') || transcript.includes('points') || transcript.includes('score') || transcript.includes('രണ്ട് പോയിന്റ്') || transcript.includes('രണ്ട്') || transcript.includes('പോയിന്റ്') || transcript.includes('സ്കോർ')) {
        pts = 2;
      } else if (transcript.includes('free throw') || transcript.includes('one point') || transcript.includes('1 point') || transcript.includes('one') || transcript.includes('ഫ്രീ ത്രോ') || transcript.includes('ഒരു പോയിന്റ്') || transcript.includes('ഒന്ന്')) {
        pts = 1;
      }

      if (pts > 0) {
        if (matchesSideA) {
          game.adjustScore('home', pts);
          this.showToast(`+${pts} Points ${nameA}!`);
          return;
        } else if (matchesSideB) {
          game.adjustScore('away', pts);
          this.showToast(`+${pts} Points ${nameB}!`);
          return;
        }
      }

      // Timer control by voice
      if (transcript.includes('start clock') || transcript.includes('start timer') || transcript.includes('resume') || transcript.includes('തുടങ്ങുക') || transcript.includes('തുടങ്ങൂ')) {
        if (!game.gameClock.running) {
          game.toggleClock();
          this.showToast("Clock Started");
        }
        return;
      }
      if (transcript.includes('stop clock') || transcript.includes('pause clock') || transcript.includes('stop timer') || transcript.includes('pause timer') || transcript.includes('നിർത്തുക') || transcript.includes('നിർത്തൂ') || transcript.includes('പോസ്')) {
        if (game.gameClock.running) {
          game.toggleClock();
          this.showToast("Clock Paused");
        }
        return;
      }
    }

    // C. VOLLEYBALL
    if (currentSport === 'volleyball') {
      const isPoint = transcript.includes('point') || transcript.includes('points') || transcript.includes('score') || transcript.includes('add') || transcript.includes('പോയിന്റ്') || transcript.includes('സ്കോർ');
      const isDeduct = transcript.includes('subtract') || transcript.includes('deduct') || transcript.includes('remove') || transcript.includes('minus') || transcript.includes('കുറയ്ക്കുക') || transcript.includes('കുറയ്ക്കൂ') || transcript.includes('മൈനസ്');

      if (isPoint) {
        if (matchesSideA) {
          game.adjustScore('a', 1);
          this.showToast(`Point ${nameA}!`);
          return;
        } else if (matchesSideB) {
          game.adjustScore('b', 1);
          this.showToast(`Point ${nameB}!`);
          return;
        }
      } else if (isDeduct) {
        if (matchesSideA) {
          game.adjustScore('a', -1);
          this.showToast(`Subtracted ${nameA}`);
          return;
        } else if (matchesSideB) {
          game.adjustScore('b', -1);
          this.showToast(`Subtracted ${nameB}`);
          return;
        }
      }
    }

    // D. BADMINTON
    if (currentSport === 'badminton') {
      const isPoint = transcript.includes('point') || transcript.includes('points') || transcript.includes('score') || transcript.includes('add') || transcript.includes('പോയിന്റ്') || transcript.includes('സ്കോർ');
      const isDeduct = transcript.includes('subtract') || transcript.includes('deduct') || transcript.includes('remove') || transcript.includes('minus') || transcript.includes('കുറയ്ക്കുക') || transcript.includes('കുറയ്ക്കൂ') || transcript.includes('മൈനസ്');

      if (isPoint) {
        if (matchesSideA) {
          game.adjustScore('a', 1);
          this.showToast(`Point ${nameA}!`);
          return;
        } else if (matchesSideB) {
          game.adjustScore('b', 1);
          this.showToast(`Point ${nameB}!`);
          return;
        }
      } else if (isDeduct) {
        if (matchesSideA) {
          game.adjustScore('a', -1);
          this.showToast(`Subtracted ${nameA}`);
          return;
        } else if (matchesSideB) {
          game.adjustScore('b', -1);
          this.showToast(`Subtracted ${nameB}`);
          return;
        }
      }
    }

    // E. CRICKET
    if (currentSport === 'cricket') {
      // Runs
      if (transcript.includes('dot ball') || transcript.includes('dot') || transcript.includes('zero') || transcript.includes('no run') || transcript.includes('dotball') || transcript.includes('ഡോട്ട്') || transcript.includes('പൂജ്യം')) {
        game.addDotBall();
        this.showToast("Dot Ball");
        return;
      }
      if (transcript.includes('one run') || transcript.includes('1 run') || transcript.includes('single') || transcript.includes('run one') || transcript.includes('one') || transcript.includes('ഒരു റൺ') || transcript.includes('ഒന്ന്')) {
        game.addRuns(1, false);
        this.showToast("1 Run");
        return;
      }
      if (transcript.includes('two runs') || transcript.includes('2 runs') || transcript.includes('double') || transcript.includes('run two') || transcript.includes('two') || transcript.includes('രണ്ട് റൺസ്') || transcript.includes('രണ്ട്')) {
        game.addRuns(2, false);
        this.showToast("2 Runs");
        return;
      }
      if (transcript.includes('three runs') || transcript.includes('3 runs') || transcript.includes('triple') || transcript.includes('run three') || transcript.includes('three') || transcript.includes('മൂന്ന് റൺസ്') || transcript.includes('മൂന്ന്')) {
        game.addRuns(3, false);
        this.showToast("3 Runs");
        return;
      }
      if (transcript.includes('four runs') || transcript.includes('four') || transcript.includes('4 runs') || transcript.includes('boundary') || transcript.includes('boundry') || transcript.includes('നാല്') || transcript.includes('ഫോർ')) {
        game.addRuns(4, true);
        this.showToast("FOUR!");
        return;
      }
      if (transcript.includes('six runs') || transcript.includes('six') || transcript.includes('6 runs') || transcript.includes('sixer') || transcript.includes('ആറ്') || transcript.includes('സിക്സ്')) {
        game.addRuns(6, true);
        this.showToast("SIX!");
        return;
      }

      // Wickets
      if (transcript.includes('wicket') || transcript.includes('out') || transcript.includes('dismissed') || transcript.includes('caught') || transcript.includes('bowled') || transcript.includes('വിക്കറ്റ്') || transcript.includes('ഔട്ട്')) {
        game.addWicket('Out');
        this.showToast("WICKET!");
        return;
      }

      // Extras
      if (transcript.includes('wide') || transcript.includes('wide ball') || transcript.includes('വൈഡ്')) {
        game.addExtra('Wd');
        this.showToast("Wide Ball");
        return;
      }
      if (transcript.includes('no ball') || transcript.includes('noball') || transcript.includes('നോ ബോൾ')) {
        game.addExtra('Nb');
        this.showToast("No Ball");
        return;
      }
    }
  }
}

// Create a single global instance of VoiceRecognitionManager
window.voiceRecognition = new VoiceRecognitionManager();