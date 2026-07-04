/**
 * APEX SCOREKEEPER - VOICE ASSISTANT ENGINE (REBUILT FROM SCRATCH)
 * Modular, production-grade hands-free voice control system.
 */

// ==========================================
// 1. DEBUG LOGGER COMPONENT
// ==========================================
class DebugLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
  }

  log(text, type = 'system') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { timestamp, text, type };
    this.logs.push(entry);

    // Limit memory usage
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.renderLog(entry);
    console.log(`[${type.toUpperCase()}] ${text}`);
  }

  renderLog(entry) {
    const container = document.getElementById('debug-log-entries');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `debug-entry ${entry.type}-msg`;
    div.textContent = `[${entry.timestamp}] ${entry.text}`;
    container.appendChild(div);

    // Auto scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  clear() {
    this.logs = [];
    const container = document.getElementById('debug-log-entries');
    if (container) {
      container.innerHTML = '<div class="debug-entry system-msg">[System] Live Debug Console cleared.</div>';
    }
  }
}

const debugLogger = new DebugLogger();

// ==========================================
// 2. SPEECH SYNTHESIS ENGINE (TTS)
// ==========================================
class SpeechEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.muted = false;
    this.volume = 1.0;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.selectedVoice = null;
    this.voices = [];

    this.initVoices();
    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.initVoices();
    }
  }

  initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    this.updateVoicesDropdown();
  }

  updateVoicesDropdown() {
    const dropdown = document.getElementById('voice-select');
    if (!dropdown) return;

    dropdown.innerHTML = '';
    
    // Filter voices to English and Malayalam
    const filteredVoices = this.voices.filter(v => v.lang.startsWith('en') || v.lang.startsWith('ml'));
    const voicesToList = filteredVoices.length > 0 ? filteredVoices : this.voices;

    voicesToList.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      
      if (voice.name.includes('Google US English') || voice.name.includes('Google UK English Female') || (index === 0 && !this.selectedVoice)) {
        option.selected = true;
        this.selectedVoice = voice;
      }
      dropdown.appendChild(option);
    });

    dropdown.onchange = (e) => {
      this.selectedVoice = this.voices.find(v => v.name === e.target.value);
      debugLogger.log(`Synthesis voice changed to: ${this.selectedVoice.name}`, 'system');
    };
  }

  speak(text, force = false) {
    if (!this.synth) return;
    if (this.muted && !force) return;

    // Stop currently active speaking
    this.synth.cancel();

    if (!text) return;

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

  toggleMute() {
    this.muted = !this.muted;
    debugLogger.log(`Announcer state: ${this.muted ? 'Muted' : 'Unmuted'}`, 'system');
    return this.muted;
  }

  updateSettings(volume, rate, pitch) {
    this.volume = parseFloat(volume);
    this.rate = parseFloat(rate);
    this.pitch = parseFloat(pitch);
    debugLogger.log(`Announcer settings updated: Vol=${this.volume}, Rate=${this.rate}, Pitch=${this.pitch}`, 'system');
  }

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

    // Volleyball / Badminton / General
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
    ml = ml.replace(/ to /gi, " - ");

    return ml;
  }
}

window.speechEngine = new SpeechEngine();

// ==========================================
// 3. INTELLIGENT NATURAL LANGUAGE COMMAND PARSER
// ==========================================
class CommandParser {
  constructor() {
    this.minConfidence = 0.51;
    this.commandsMap = {
      global: {
        undo: {
          en: ["undo", "cancel last", "undo last", "cancel last action", "revert", "go back", "reverse action"],
          ml: ["അൺഡൂ", "മാറ്റൂ", "ഒഴിവാക്കൂ", "തിരുത്തൂ", "അവസാനത്തെ മാറ്റുക", "തിരികെ പോവുക", "അൺഡൂ ചെയ്യുക"]
        },
        reset: {
          en: ["reset", "reset scoreboard", "reset scorecard", "reset game", "restart scoreboard", "clear scoreboard"],
          ml: ["റീസെറ്റ്", "റീസ്റ്റാർട്ട്", "സ്കോർബോർഡ് റീസെറ്റ്", "സ്കോർ മാറ്റുക"]
        }
      },
      football: {
        goal: {
          en: ["goal", "score", "point", "plus one", "add score", "goal for", "goal team", "add point", "scored a goal", "goal scored", "plus 1", "add 1", "add goal", "add goals"],
          ml: ["ഗോൾ", "പോയിന്റ്", "സ്കോർ", "കൂട്ടുക", "ഒന്ന് കൂട്ടുക", "ഗോൾ അടിച്ചു", "ഒരു ഗോൾ"]
        },
        deduct: {
          en: ["subtract", "deduct", "remove", "minus", "minus one", "decrease score", "remove goal", "minus 1", "minus goal", "reduce score", "subtract one", "subtract 1"],
          ml: ["കുറയ്ക്കുക", "കുറയ്ക്കൂ", "മൈനസ്", "ഒന്ന് കുറയ്ക്കുക", "പോയിന്റ് കുറയ്ക്കുക"]
        },
        yellow: {
          en: ["yellow card", "yellow", "yellowcard", "give yellow", "show yellow"],
          ml: ["മഞ്ഞ കാർഡ്", "മഞ്ഞ", "യെല്ലോ കാർഡ്", "യെല്ലോ"]
        },
        red: {
          en: ["red card", "red", "redcard", "give red", "show red", "send off"],
          ml: ["ചുവപ്പ് കാർഡ്", "ചുവപ്പ്", "റെഡ് കാർഡ്", "റെഡ്"]
        },
        corners: {
          en: ["corner kick", "corner", "cornerkick", "take corner"],
          ml: ["കോർണർ", "കോർണർ കിക്ക്"]
        },
        fouls: {
          en: ["foul", "foul play", "commit foul", "foul committed"],
          ml: ["ഫൗൾ", "ഫൗൾ ചെയ്തോ"]
        },
        offsides: {
          en: ["offside", "offsides", "off side", "call offside"],
          ml: ["ഓഫ്സൈഡ്", "ഓഫ് സൈഡ്"]
        }
      },
      basketball: {
        point3: {
          en: ["three pointer", "three points", "3 pointer", "3 points", "three", "3", "triple", "plus three", "+3", "three pointer for", "outside paint", "scored three"],
          ml: ["മൂന്ന് പോയിന്റ്", "മൂന്ന്", "ത്രീ പോയിന്റർ", "ത്രീ പോയിന്റ്", "ത്രീ"]
        },
        point2: {
          en: ["two points", "2 points", "basket", "double", "two", "2", "plus two", "+2", "two points for", "layup", "dunk", "jump shot", "score", "add score", "point", "add point"],
          ml: ["രണ്ട് പോയിന്റ്", "രണ്ട്", "ഡബിൾ", "ബാസ്കറ്റ്", "ടു പോയിന്റ്"]
        },
        point1: {
          en: ["free throw", "one point", "1 point", "one", "1", "plus one", "+1", "free throw for", "one point for", "penalty shot"],
          ml: ["ഫ്രീ ത്രോ", "ഒരു പോയിന്റ്", "ഒന്ന്", "വൺ പോയിന്റ്", "വൺ"]
        },
        deduct: {
          en: ["subtract", "deduct", "remove", "minus", "minus one", "minus 1", "decrease score", "reduce score", "subtract one", "subtract 1"],
          ml: ["കുറയ്ക്കുക", "കുറയ്ക്കൂ", "മൈനസ്", "ഒന്ന് കുറയ്ക്കുക"]
        },
        fouls: {
          en: ["foul", "team foul", "personal foul", "foul committed", "give foul"],
          ml: ["ഫൗൾ", "ഫൗളുകൾ"]
        },
        timeouts: {
          en: ["timeout", "time out", "call timeout", "request timeout"],
          ml: ["ടൈം ഔട്ട്", "ടൈംഔട്ട്", "ടൈം ഔട്ടുകൾ"]
        },
        possession: {
          en: ["possession", "possession arrow", "possession change", "change possession", "ball possession", "switch possession", "flip arrow"],
          ml: ["പന്ത്", "പൊസഷൻ", "ബോളുകൾ", "ബോൾ", "മാറ്റുക", "പൊസഷൻ മാറ്റുക", "പൊസഷൻ മാറ്റൂ", "ബോൾ മാറ്റുക"]
        },
        reset24: {
          en: ["reset shot clock", "shot clock", "reset shot clock 24", "24 seconds", "shot clock 24", "twenty four seconds", "twenty four"],
          ml: ["ഷോട്ട് ക്ലോക്ക്", "ഇരുപത്തിനാല്", "ഷോട്ട് ക്ലോക്ക് റീസെറ്റ്", "ഇരുപത്തിനാല് സെക്കൻഡ്"]
        },
        reset14: {
          en: ["reset shot clock 14", "shot clock 14", "14 seconds", "shot clock fourteen", "fourteen seconds", "fourteen"],
          ml: ["പതിനാല്", "പതിനാല് സെക്കൻഡ്", "ഫ്രണ്ട് കോർട്ട് റീസെറ്റ്"]
        }
      },
      volleyball: {
        point: {
          en: ["point", "points", "score", "add", "plus one", "one point", "1 point", "+1", "add point", "point for", "score point"],
          ml: ["പോയിന്റ്", "സ്കോർ", "കൂട്ടുക", "ഒരു പോയിന്റ്", "ഒന്ന് കൂട്ടുക"]
        },
        deduct: {
          en: ["subtract", "deduct", "remove", "minus", "minus one", "minus 1", "decrease score", "reduce score", "deduct point", "subtract point"],
          ml: ["കുറയ്ക്കുക", "കുറയ്ക്കൂ", "മൈനസ്", "ഒന്ന് കുറയ്ക്കുക"]
        }
      },
      badminton: {
        point: {
          en: ["point", "points", "score", "add", "plus one", "one point", "1 point", "+1", "add point", "point for", "score point"],
          ml: ["പോയിന്റ്", "സ്കോർ", "കൂട്ടുക", "ഒരു പോയിന്റ്", "ഒന്ന് കൂട്ടുക"]
        },
        deduct: {
          en: ["subtract", "deduct", "remove", "minus", "minus one", "minus 1", "decrease score", "reduce score", "deduct point", "subtract point"],
          ml: ["കുറയ്ക്കുക", "കുറയ്ക്കൂ", "മൈനസ്", "ഒന്ന് കുറയ്ക്കുക"]
        }
      },
      cricket: {
        dot: {
          en: ["dot ball", "dot", "zero", "no run", "dotball", "zero runs", "0 runs", "no runs scored"],
          ml: ["ഡോട്ട്", "പൂജ്യം", "റണ്ണില്ല", "ഡോട്ട് ബോൾ", "റണ്ണുകൾ ഇല്ല"]
        },
        run1: {
          en: ["one run", "1 run", "single", "run one", "one", "1", "single run scored", "single taken"],
          ml: ["ഒരു റൺ", "ഒന്ന്", "വൺ റൺ", "സിംഗിൾ", "ഒരു റൺസ്"]
        },
        run2: {
          en: ["two runs", "2 runs", "double", "run two", "two", "2", "double runs scored", "two runs scored"],
          ml: ["രണ്ട് റൺസ്", "രണ്ട്", "ടു റൺസ്", "ഡബിൾ", "രണ്ട് റൺ"]
        },
        run3: {
          en: ["three runs", "3 runs", "triple", "run three", "three", "3", "three runs scored"],
          ml: ["മൂന്ന് റൺസ്", "മൂന്ന്", "ത്രീ റൺസ്", "മൂന്ന് റൺ"]
        },
        run4: {
          en: ["four runs", "four", "4 runs", "boundary", "boundry", "4", "four runs scored", "hit a four", "boundary four"],
          ml: ["നാല്", "ഫോർ", "ബൗണ്ടറി", "ഫോർ റൺസ്", "നാല് റൺസ്", "നാല് അടിച്ചു"]
        },
        run6: {
          en: ["six runs", "six", "6 runs", "sixer", "6", "six runs scored", "hit a six", "maximum"],
          ml: ["ആറ്", "സിക്സ്", "സിക്സർ", "സിക്സ് റൺസ്", "ആറ് റൺസ്", "ആറ് അടിച്ചു"]
        },
        wicket: {
          en: ["wicket", "out", "dismissed", "caught", "bowled", "stumped", "run out", "lbw", "wicket falls", "batter out"],
          ml: ["വിക്കറ്റ്", "ഔട്ട്", "ക്യാച്ച്", "ബൗൾഡ്", "റൺ ഔട്ട്", "എൽ ബി ഡബ്ല്യു", "സ്റ്റമ്പ്ഡ്"]
        },
        wide: {
          en: ["wide", "wide ball", "wide ball extra", "plus wide", "run wide"],
          ml: ["വൈഡ്", "വൈഡ് ബോൾ"]
        },
        noball: {
          en: ["no ball", "noball", "no ball extra", "plus no ball", "free hit ball"],
          ml: ["നോ ബോൾ", "നോബോൾ"]
        }
      }
    };
  }

  // Preprocesses, normalizes, and cleans up transcripts
  preprocess(transcript) {
    let text = transcript.toLowerCase();
    text = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    text = text.replace(/\s+/g, " ").trim();
    
    // Background noise filtering: ignore typical startup filler words if isolated
    const startupFillers = ["ok", "please", "can you", "hey", "hello", "now", "score", "assistant"];
    startupFillers.forEach(filler => {
      if (text.startsWith(filler + " ") && text.length > (filler.length + 2)) {
        text = text.slice(filler.length + 1).trim();
      }
    });

    return text;
  }

  // Calculate similarity using Dice's Coefficient
  calculateDiceCoefficient(str1, str2) {
    const s1 = str1.replace(/\s+/g, "");
    const s2 = str2.replace(/\s+/g, "");
    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0.0;

    const bigrams1 = new Map();
    for (let i = 0; i < s1.length - 1; i++) {
      const gram = s1.substr(i, 2);
      bigrams1.set(gram, (bigrams1.get(gram) || 0) + 1);
    }

    let intersection = 0;
    for (let i = 0; i < s2.length - 1; i++) {
      const gram = s2.substr(i, 2);
      const count = bigrams1.get(gram) || 0;
      if (count > 0) {
        bigrams1.set(gram, count - 1);
        intersection++;
      }
    }

    return (2.0 * intersection) / (s1.length + s2.length - 2);
  }

  // Calculate token overlap intersection ratio
  calculateTokenOverlap(transcript, template) {
    const tTokens = transcript.split(/\s+/);
    const tempTokens = template.split(/\s+/);
    
    const intersection = tempTokens.filter(tok => tTokens.includes(tok));
    return intersection.length / tempTokens.length;
  }

  // Calculate overlap of matched tokens relative to the transcript length
  calculateTranscriptOverlap(transcript, template) {
    const tTokens = transcript.split(/\s+/);
    const tempTokens = template.split(/\s+/);
    const intersection = tempTokens.filter(tok => tTokens.includes(tok));
    return intersection.length / tTokens.length;
  }

  // Get active team names for text cleanup
  getActiveTeamNames(activeSport) {
    const names = [];
    const ids = [
      'fb-name-a', 'fb-name-b', 'crick-name-a', 'crick-name-b',
      'bball-name-home', 'bball-name-away', 'vb-name-a', 'vb-name-b',
      'bm-name-a', 'bm-name-b'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value) {
        names.push(el.value.toLowerCase().trim());
      }
    });

    const transliterations = {
      'arsenal': ['ആഴ്സണൽ', 'ആഴ്സണലിന്', 'ആർസണൽ'],
      'chelsea': ['ചെൽസി', 'ചെൽസിക്ക്'],
      'india': ['ഇന്ത്യ', 'ഇന്ത്യയ്ക്ക്'],
      'australia': ['ഓസ്ട്രേലിയ', 'ഓസ്ട്രേലിയയ്ക്ക്'],
      'lakers': ['ലേക്കേഴ്സ്', 'ലേക്കേഴ്സിന്'],
      'celtics': ['സെൽറ്റിക്സ്', 'സെൽറ്റിക്സിന്'],
      'brazil': ['ബ്രസീൽ', 'ബ്രസീലിന്'],
      'italy': ['ഇറ്റലി', 'ഇറ്റലിക്ക്'],
      'lin dan': ['ലിൻ ഡാൻ', 'ലിൻ ഡാന്'],
      'lee chong wei': ['ലീ ചോങ് വെയ്', 'ലീ ചോങ് വെയ്ക്ക്']
    };

    names.forEach(name => {
      if (transliterations[name]) {
        names.push(...transliterations[name]);
      }
    });

    return names;
  }

  // Parses normalized text and yields canonical actions and side designations
  parseCommand(rawTranscript, activeSport, lang = 'en-US') {
    const cleaned = this.preprocess(rawTranscript);
    debugLogger.log(`Parsing cleaned transcript: "${cleaned}"`, 'system');

    // Check if the command indicates subtraction
    const isSubtraction = ["deduct", "subtract", "minus", "remove", "decrease", "reduce", "കുറയ്ക്കുക", "കുറയ്ക്കൂ", "മൈനസ്"].some(kw => cleaned.includes(kw));

    // Resolve target side (Team A/B/Home/Away)
    const side = this.resolveSide(cleaned, activeSport);

    // Clean active team names and prepositions to isolate core action words for noise filtering
    let cleanedNoTeamAndPreps = cleaned;
    const teamNames = this.getActiveTeamNames(activeSport);
    teamNames.forEach(name => {
      if (name && name.length > 2) {
        cleanedNoTeamAndPreps = cleanedNoTeamAndPreps.replace(name.toLowerCase(), "");
      }
    });
    
    // Remove common prepositions/fillers to allow direct matches (exclude 'score' as it is a common scoring verb)
    const fillers = ["for", "to", "by", "from", "of", "team", "player", "side", "കിക്ക്", "കാർഡ്", "പോയിന്റ്", "റൺസ്", "റൺ", "അടിച്ചു", "കൂട്ടുക", "കുറയ്ക്കുക"];
    fillers.forEach(filler => {
      cleanedNoTeamAndPreps = cleanedNoTeamAndPreps.replace(new RegExp(`\\b${filler}\\b`, 'g'), "");
    });
    cleanedNoTeamAndPreps = cleanedNoTeamAndPreps.replace(/\s+/g, " ").trim();

    // Retrieve active sport templates
    const sportTemplates = this.commandsMap[activeSport];
    const globalTemplates = this.commandsMap.global;

    let bestAction = null;
    let maxConfidence = 0;

    // Helper to evaluate templates
    const evaluateTemplates = (templates) => {
      for (const [action, langTemplates] of Object.entries(templates)) {
        // If subtraction command, skip addition-only actions
        if (isSubtraction && ['goal', 'point', 'point3', 'point2', 'point1', 'run1', 'run2', 'run3', 'run4', 'run6', 'dot', 'wide', 'noball', 'wicket'].includes(action)) {
          continue;
        }
        // If addition command, skip deduction actions
        if (!isSubtraction && action === 'deduct') {
          continue;
        }

        const phrases = [...(langTemplates.en || []), ...(langTemplates.ml || [])];
        phrases.forEach(phrase => {
          const overlap = this.calculateTokenOverlap(cleaned, phrase);
          const transcriptOverlap = this.calculateTranscriptOverlap(cleanedNoTeamAndPreps || cleaned, phrase);
          const diceSim = this.calculateDiceCoefficient(cleaned, phrase);
          
          // Combine scores to filter noise (recommends high overlap and low noise)
          const weight = Math.max(overlap * transcriptOverlap, diceSim);
          
          if (weight > maxConfidence) {
            maxConfidence = weight;
            bestAction = action;
          }
        });
      }
    };

    // 1. Check Global Commands
    evaluateTemplates(globalTemplates);
    let isGlobal = maxConfidence >= 0.7;

    // 2. Check Sport-specific Commands if not global or global confidence is low
    if (!isGlobal && sportTemplates) {
      evaluateTemplates(sportTemplates);
    }

    debugLogger.log(`Parsed command match candidate: "${bestAction}" with confidence: ${maxConfidence.toFixed(2)}`, 'system');

    // Rejection of ambiguous / low-confidence commands
    if (maxConfidence < this.minConfidence) {
      debugLogger.log(`Command rejected: confidence below ${this.minConfidence} (Max: ${maxConfidence.toFixed(2)})`, 'error');
      return { action: null, side: null, confidence: maxConfidence };
    }

    return { action: bestAction, side, confidence: maxConfidence, isGlobal: isGlobal && maxConfidence >= 0.7 };
  }

  // Resolve team side dynamically matching custom names or default markers
  resolveSide(text, activeSport) {
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

    if (activeSport === 'football' && fbNameA && fbNameB) {
      nameA = fbNameA.value;
      nameB = fbNameB.value;
    } else if (activeSport === 'cricket' && crickNameA && crickNameB) {
      nameA = crickNameA.value;
      nameB = crickNameB.value;
    } else if (activeSport === 'basketball' && bballNameHome && bballNameAway) {
      nameA = bballNameHome.value;
      nameB = bballNameAway.value;
    } else if (activeSport === 'volleyball' && vbNameA && vbNameB) {
      nameA = vbNameA.value;
      nameB = vbNameB.value;
    } else if (activeSport === 'badminton' && bmNameA && bmNameB) {
      nameA = bmNameA.value;
      nameB = bmNameB.value;
    }

    const cleanA = nameA.toLowerCase().trim();
    const cleanB = nameB.toLowerCase().trim();

    const transliterations = {
      'arsenal': ['ആഴ്സണൽ', 'ആഴ്സണലിന്', 'ആർസണൽ'],
      'chelsea': ['ചെൽസി', 'ചെൽസിക്ക്'],
      'india': ['ഇന്ത്യ', 'ഇന്ത്യയ്ക്ക്'],
      'australia': ['ഓസ്ട്രേലിയ', 'ഓസ്ട്രേലിയയ്ക്ക്'],
      'lakers': ['ലേക്കേഴ്സ്', 'ലേക്കേഴ്സിന്'],
      'celtics': ['സെൽറ്റിക്സ്', 'സെൽറ്റിക്സിന്'],
      'brazil': ['ബ്രസീൽ', 'ബ്രസീലിന്'],
      'italy': ['ഇറ്റലി', 'ഇറ്റലിക്ക്'],
      'lin dan': ['ലിൻ ഡാൻ', 'ലിൻ ഡാന്'],
      'lee chong wei': ['ലീ ചോങ് വെയ്', 'ലീ ചോങ് വെയ്ക്ക്']
    };

    const indicatorsA = [
      'team a', 'player a', 'home', 'side a', 'team 1', 'team one', 'player 1', 'player one',
      'first team', 'first player', 'left team', 'left side',
      'ടീം എ', 'പ്ലെയർ എ', 'ഹോം', 'സൈഡ് എ', 'ടീം ഒന്ന്', 'ആദ്യത്തെ ടീം', 'ആദ്യത്തെ പ്ലെയർ', 'ഇടത് ടീം', 'ഇടത് വശം'
    ];
    if (cleanA && !['team a', 'player a', 'home', 'side a', 'team 1', 'team b', 'player b', 'away', 'side b', 'team 2'].includes(cleanA)) {
      indicatorsA.push(cleanA);
      if (transliterations[cleanA]) {
        indicatorsA.push(...transliterations[cleanA]);
      }
    }

    const indicatorsB = [
      'team b', 'player b', 'away', 'side b', 'team 2', 'team two', 'player 2', 'player two',
      'second team', 'second player', 'right team', 'right side',
      'ടീം ബി', 'പ്ലെയർ ബി', 'എവേ', 'സൈഡ് ബി', 'ടീം രണ്ട്', 'രണ്ടാമത്തെ ടീം', 'രണ്ടാമത്തെ പ്ലെയർ', 'വലത് ടീം', 'വലത് വശം'
    ];
    if (cleanB && !['team a', 'player a', 'home', 'side a', 'team 1', 'team b', 'player b', 'away', 'side b', 'team 2'].includes(cleanB)) {
      indicatorsB.push(cleanB);
      if (transliterations[cleanB]) {
        indicatorsB.push(...transliterations[cleanB]);
      }
    }

    // Evaluate side matching
    let matchesA = indicatorsA.some(ind => ind && text.includes(ind));
    let matchesB = indicatorsB.some(ind => ind && text.includes(ind));

    // Fallbacks to check single words inside custom names
    if (!matchesA && !matchesB) {
      const wordsA = cleanA.split(/\s+/).filter(w => w.length > 2);
      const wordsB = cleanB.split(/\s+/).filter(w => w.length > 2);
      matchesA = wordsA.some(word => text.includes(word));
      matchesB = wordsB.some(word => text.includes(word));
    }

    if (matchesA && !matchesB) return 'a';
    if (matchesB && !matchesA) return 'b';
    return null;
  }
}

const commandParser = new CommandParser();

// ==========================================
// 4. SPORT ACTION COMMAND HANDLERS
// ==========================================
class SportCommandHandlers {
  execute(action, side, activeSport, game) {
    if (!game) {
      debugLogger.log("Execution failed: game instance not found", "error");
      return false;
    }

    debugLogger.log(`Executing validated action: "${action}" for side: "${side}" on sport: "${activeSport}"`, "success");

    // Global Command triggers
    if (action === 'undo') {
      if (game.undo()) {
        window.speechEngine.speak("Action Undone");
        return true;
      }
      return false;
    }
    if (action === 'reset') {
      const resetBtn = document.getElementById(`${activeSport === 'basketball' ? 'bball' : activeSport === 'volleyball' ? 'vb' : activeSport === 'badminton' ? 'bm' : activeSport === 'football' ? 'fb' : 'crick'}-reset`);
      if (resetBtn) {
        resetBtn.click();
        window.speechEngine.speak("Scoreboard Reset");
        return true;
      }
      return false;
    }

    // --- Sport specific handler execution ---
    
    // A. FOOTBALL
    if (activeSport === 'football') {
      if (!side) {
        debugLogger.log("Football execution rejected: Side target missing in command context", "error");
        return false;
      }

      if (action === 'goal') {
        game.adjustScore(side, 1);
        return true;
      }
      if (action === 'deduct') {
        game.adjustScore(side, -1);
        return true;
      }
      if (['yellow', 'red', 'corners', 'fouls', 'offsides'].includes(action)) {
        game.adjustStat(side, action, 1);
        return true;
      }
    }

    // B. BASKETBALL
    if (activeSport === 'basketball') {
      const bballSide = side === 'a' ? 'home' : side === 'b' ? 'away' : null;

      if (action === 'possession') {
        game.togglePossession();
        return true;
      }
      if (action === 'reset24') {
        game.resetShotClock(24);
        return true;
      }
      if (action === 'reset14') {
        game.resetShotClock(14);
        return true;
      }

      if (!bballSide) {
        debugLogger.log("Basketball execution rejected: Side target missing in command context", "error");
        return false;
      }

      if (action === 'point3') {
        game.adjustScore(bballSide, 3);
        return true;
      }
      if (action === 'point2') {
        game.adjustScore(bballSide, 2);
        return true;
      }
      if (action === 'point1') {
        game.adjustScore(bballSide, 1);
        return true;
      }
      if (action === 'deduct') {
        game.adjustScore(bballSide, -1);
        return true;
      }
      if (action === 'fouls') {
        game.adjustStat(bballSide, 'fouls', 1);
        return true;
      }
      if (action === 'timeouts') {
        game.adjustStat(bballSide, 'timeouts', 1);
        return true;
      }
    }

    // C. VOLLEYBALL
    if (activeSport === 'volleyball') {
      if (!side) {
        debugLogger.log("Volleyball execution rejected: Side target missing in command context", "error");
        return false;
      }

      if (action === 'point') {
        game.adjustScore(side, 1);
        return true;
      }
      if (action === 'deduct') {
        game.adjustScore(side, -1);
        return true;
      }
    }

    // D. BADMINTON
    if (activeSport === 'badminton') {
      if (!side) {
        debugLogger.log("Badminton execution rejected: Side target missing in command context", "error");
        return false;
      }

      if (action === 'point') {
        game.adjustScore(side, 1);
        return true;
      }
      if (action === 'deduct') {
        game.adjustScore(side, -1);
        return true;
      }
    }

    // E. CRICKET
    if (activeSport === 'cricket') {
      if (action === 'dot') {
        game.addDotBall();
        return true;
      }
      if (action === 'run1') {
        game.addRuns(1, false);
        return true;
      }
      if (action === 'run2') {
        game.addRuns(2, false);
        return true;
      }
      if (action === 'run3') {
        game.addRuns(3, false);
        return true;
      }
      if (action === 'run4') {
        game.addRuns(4, true);
        return true;
      }
      if (action === 'run6') {
        game.addRuns(6, true);
        return true;
      }
      if (action === 'wicket') {
        game.addWicket('Out');
        return true;
      }
      if (action === 'wide') {
        game.addExtra('Wd');
        return true;
      }
      if (action === 'noball') {
        game.addExtra('Nb');
        return true;
      }
    }

    debugLogger.log(`Action "${action}" is not implemented for active sport: "${activeSport}"`, "error");
    return false;
  }
}

const sportCommandHandlers = new SportCommandHandlers();

// ==========================================
// 5. SPEECH RECOGNITION MANAGER (LIFECYCLE)
// ==========================================
class SpeechRecognitionManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.lang = 'en-US';
    this.activeSport = 'home';
    this.autoRestart = true;
    this.consecutiveRestartCount = 0;
    this.maxRestarts = 10;
    this.restartTimeout = null;

    this.initRecognition();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      debugLogger.log("Speech Recognition API is not supported in this browser.", "error");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.lang;

    // Bind Event Listeners
    this.recognition.onstart = () => {
      this.isListening = true;
      this.consecutiveRestartCount = 0;
      window.voiceAssistantUIManager.updateMicUI(true);
      window.voiceAssistantUIManager.showToast("Voice Assistant Listening");
      debugLogger.log("Speech recognition started successfully", "system");
      window.voiceAssistantUIManager.updateDebugStatus('mic', 'Online', 'status-active');
    };

    this.recognition.onerror = (event) => {
      debugLogger.log(`Speech recognition error: ${event.error}`, "error");

      switch (event.error) {
        case 'not-allowed':
          window.voiceAssistantUIManager.showToast("Microphone access denied");
          this.isListening = false;
          this.autoRestart = false;
          window.voiceAssistantUIManager.updateMicUI(false);
          window.voiceAssistantUIManager.updateDebugStatus('mic', 'Denied', 'status-inactive');
          break;
        case 'no-speech':
          debugLogger.log("No speech detected - silent interval", "system");
          break;
        case 'aborted':
          debugLogger.log("Speech capture aborted", "system");
          break;
        case 'network':
          window.voiceAssistantUIManager.showToast("Speech recognition network error");
          break;
        case 'service-not-allowed':
          debugLogger.log("Speech service not allowed by browser", "error");
          break;
        default:
          debugLogger.log(`Unhandled recognition error code: ${event.error}`, "error");
      }
    };

    this.recognition.onend = () => {
      debugLogger.log("Speech recognition closed", "system");
      window.voiceAssistantUIManager.updateDebugStatus('mic', 'Offline', 'status-inactive');

      if (this.isListening && this.autoRestart) {
        this.consecutiveRestartCount++;
        if (this.consecutiveRestartCount < this.maxRestarts) {
          const delay = Math.min(1000 * this.consecutiveRestartCount, 5000);
          debugLogger.log(`Auto-restarting in ${delay}ms... (Attempt ${this.consecutiveRestartCount}/${this.maxRestarts})`, "system");
          
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isListening) {
              try {
                this.recognition.start();
              } catch (err) {
                debugLogger.log(`Failed to restart recognition instance: ${err.message}`, "error");
              }
            }
          }, delay);
        } else {
          debugLogger.log("Maximum auto-restarts reached. Stopping engine.", "error");
          this.isListening = false;
          window.voiceAssistantUIManager.updateMicUI(false);
        }
      } else {
        window.voiceAssistantUIManager.updateMicUI(false);
      }
    };

    this.recognition.onresult = (event) => {
      const resultsLength = event.results.length;
      const result = event.results[resultsLength - 1];
      if (!result) return;

      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      debugLogger.log(`Speech recognized: "${transcript}" (Confidence: ${confidence.toFixed(2)})`, "command");
      this.processRawSpeech(transcript, confidence);
    };
  }

  processRawSpeech(transcript, confidence) {
    if (!window.appController) return;
    this.activeSport = window.appController.currentView;

    // Validate overall transcript confidence
    if (confidence < 0.3) {
      debugLogger.log(`Low capturing confidence rejected (${confidence.toFixed(2)})`, 'error');
      window.voiceAssistantUIManager.showToast("Command not understood (low confidence)");
      return;
    }

    // Parse command
    const parsed = commandParser.parseCommand(transcript, this.activeSport, this.lang);
    
    // Log parsed command info to debug console
    if (parsed.action) {
      debugLogger.log(`Parsed command successfully: Action="${parsed.action}", Side="${parsed.side}" (Fuzzy Confidence: ${parsed.confidence.toFixed(2)})`, 'success');
      
      const game = window.appController.games[this.activeSport];
      
      // Execute the parsed command
      const success = sportCommandHandlers.execute(parsed.action, parsed.side, this.activeSport, game);
      if (success) {
        window.voiceAssistantUIManager.showToast(`Voice Executed: ${parsed.action.toUpperCase()}`);
      } else {
        window.voiceAssistantUIManager.showToast("Command parsed but failed to execute");
      }
    } else {
      window.voiceAssistantUIManager.showToast("Speech recognized but no command matched");
    }
  }

  toggleListening() {
    if (!this.recognition) {
      window.voiceAssistantUIManager.showToast("Speech Recognition not supported in this browser");
      return;
    }

    if (this.isListening) {
      debugLogger.log("Stopping voice assistant manually", "system");
      this.isListening = false;
      this.autoRestart = false;
      this.recognition.stop();
      window.voiceAssistantUIManager.updateMicUI(false);
      window.voiceAssistantUIManager.showToast("Voice Assistant Stopped");
    } else {
      debugLogger.log("Starting voice assistant manually", "system");
      this.isListening = true;
      this.autoRestart = true;
      this.recognition.lang = this.lang;
      try {
        this.recognition.start();
      } catch (err) {
        debugLogger.log(`Error starting recognition instance: ${err.message}`, "error");
        this.isListening = false;
        window.voiceAssistantUIManager.updateMicUI(false);
      }
    }
  }

  setLanguage(newLang) {
    this.lang = newLang;
    debugLogger.log(`Voice recognition language updated to: ${this.lang}`, "system");
    window.voiceAssistantUIManager.updateDebugStatus('lang', this.lang);
    
    if (this.recognition) {
      this.recognition.lang = this.lang;
      if (this.isListening) {
        // Restart to apply lang changes
        this.recognition.stop();
      }
    }
  }
}

// ==========================================
// 6. VOICE ASSISTANT UI MANAGER
// ==========================================
class VoiceAssistantUIManager {
  constructor() {
    this.toastTimeout = null;
    this.bindEvents();
  }

  bindEvents() {
    // 1. Microphone Buttons
    const micBtn = document.getElementById('global-mic-btn');
    if (micBtn) {
      micBtn.onclick = (e) => {
        e.stopPropagation();
        window.voiceRecognition.toggleListening();
      };
    }

    // 2. Settings Gear and Dropdown Toggle
    const settingsBtn = document.getElementById('header-settings-btn');
    const dropdown = document.getElementById('voice-settings-dropdown');
    if (settingsBtn && dropdown) {
      settingsBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
        // Close debug panel if settings opens
        const debugPanel = document.getElementById('voice-debug-panel');
        if (debugPanel) debugPanel.classList.remove('active');
      };
      
      document.addEventListener('click', (e) => {
        if (dropdown.classList.contains('active') && !dropdown.contains(e.target) && e.target !== settingsBtn) {
          dropdown.classList.remove('active');
        }
      });
    }

    // 3. Debug Button and Panel Controls
    const debugBtn = document.getElementById('header-debug-btn');
    const debugPanel = document.getElementById('voice-debug-panel');
    const debugClose = document.getElementById('debug-panel-close');
    const debugClear = document.getElementById('debug-panel-clear');

    if (debugBtn && debugPanel) {
      debugBtn.onclick = (e) => {
        e.stopPropagation();
        debugPanel.classList.toggle('active');
        // Close settings dropdown if debug opens
        if (dropdown) dropdown.classList.remove('active');
        
        // Sync active sport display on open
        if (window.appController) {
          this.updateDebugStatus('sport', window.appController.currentView);
        }
      };
    }

    if (debugClose && debugPanel) {
      debugClose.onclick = () => {
        debugPanel.classList.remove('active');
      };
    }

    if (debugClear) {
      debugClear.onclick = () => {
        debugLogger.clear();
      };
    }

    // 4. Mute Button bindings
    const muteToggle = () => {
      const isMuted = window.speechEngine.toggleMute();
      this.updateMuteUIState(isMuted);
    };
    const globalMuteBtn = document.getElementById('global-mute-btn');
    const panelMuteBtn = document.getElementById('panel-mute-btn');
    if (globalMuteBtn) globalMuteBtn.onclick = muteToggle;
    if (panelMuteBtn) panelMuteBtn.onclick = muteToggle;

    // 5. Volume, Speed, Pitch sliders
    const volInput = document.getElementById('voice-volume');
    const volVal = document.getElementById('voice-volume-val');
    const rateInput = document.getElementById('voice-rate');
    const rateVal = document.getElementById('voice-rate-val');
    const pitchInput = document.getElementById('voice-pitch');
    const pitchVal = document.getElementById('voice-pitch-val');

    if (volInput) {
      volInput.oninput = (e) => {
        if (volVal) volVal.textContent = e.target.value;
        window.speechEngine.updateSettings(e.target.value, rateInput.value, pitchInput.value);
      };
    }

    if (rateInput) {
      rateInput.oninput = (e) => {
        if (rateVal) rateVal.textContent = e.target.value;
        window.speechEngine.updateSettings(volInput.value, e.target.value, pitchInput.value);
      };
    }

    if (pitchInput) {
      pitchInput.oninput = (e) => {
        if (pitchVal) pitchVal.textContent = e.target.value;
        window.speechEngine.updateSettings(volInput.value, rateInput.value, e.target.value);
      };
    }

    // 6. Language Select dropdown
    const langSelect = document.getElementById('recognition-lang-select');
    if (langSelect) {
      langSelect.onchange = (e) => {
        window.voiceRecognition.setLanguage(e.target.value);
      };
    }
  }

  updateMicUI(isListening) {
    const micBtn = document.getElementById('global-mic-btn');
    if (!micBtn) return;

    if (isListening) {
      micBtn.classList.add('listening');
      micBtn.setAttribute('title', 'Stop Voice Assistant');
    } else {
      micBtn.classList.remove('listening');
      micBtn.setAttribute('title', 'Start Voice Assistant');
    }
  }

  updateMuteUIState(isMuted) {
    const globalMuteBtn = document.getElementById('global-mute-btn');
    const panelMuteBtn = document.getElementById('panel-mute-btn');

    [globalMuteBtn, panelMuteBtn].forEach(btn => {
      if (btn) {
        if (isMuted) {
          btn.classList.add('muted');
          if (btn.tagName === 'BUTTON' && btn.id === 'panel-mute-btn') {
            btn.textContent = 'Unmute Voice Assistant';
          }
          btn.setAttribute('title', 'Unmute Voice');
        } else {
          btn.classList.remove('muted');
          if (btn.tagName === 'BUTTON' && btn.id === 'panel-mute-btn') {
            btn.textContent = 'Mute Voice Assistant';
          }
          btn.setAttribute('title', 'Mute Voice');
        }
      }
    });
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

  updateDebugStatus(field, val, classToAdd = '') {
    let elId = '';
    if (field === 'mic') elId = 'debug-mic-status';
    else if (field === 'engine') elId = 'debug-engine-status';
    else if (field === 'lang') elId = 'debug-lang-status';
    else if (field === 'sport') elId = 'debug-sport-status';

    const el = document.getElementById(elId);
    if (!el) return;

    el.textContent = val;
    if (field === 'mic') {
      el.className = 'status-val';
      if (classToAdd) el.classList.add(classToAdd);
    }
  }
}

// ==========================================
// 7. INITIALIZE ENGINE INSTANCES
// ==========================================
window.voiceAssistantUIManager = new VoiceAssistantUIManager();
window.voiceRecognition = new SpeechRecognitionManager();
