// contentScript.js

console.log("Dislexia content script loaded.");
let lastFocusedElement = null;
let overlayInjected = false;

// Single consolidated listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "enableOverlay":
      if (!overlayInjected) injectOverlay();
      break;
    case "disableOverlay":
      removeOverlay();
      break;
    case "readAloud":
      readAloud(message.text);
      sendResponse({ status: "success" });
      break;
    case "startSTT":
      startSTT();
      sendResponse({ status: "success" });
      break;
    case "stopTTS":
      stopReadingAloud();
      sendResponse({ status: "success" });
      break;
    case "stopSTT":
      stopSTT();
      sendResponse({ status: "success" });
      break;
    default:
      break;
  }
  return true; // in case any async responses
});
// Event listener to capture focus on editable elements
document.addEventListener(
  "focusin",
  (event) => {
    const target = event.target;
    if (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName)) {
      lastFocusedElement = target;
      console.log("Last focused element updated:", lastFocusedElement);
    }
  },
  true // Use the capture phase
);

// Function to read aloud the text
function readAloud(selectedText) {
  // Cancel any ongoing speech
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  ttsPaused = false;
  if (document.getElementById("pauseTTS")) {
    document.getElementById("pauseTTS").textContent = "Pause TTS";
  }
  if (document.getElementById("ttsControls")) {
    document.getElementById("ttsControls").style.display = "block";
  }

  // Get the selected element
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const selectedElement = range.startContainer.parentElement;

  // Instantiate the Highlighter class
  const highlighter = new Highlighter();

  // Set the path to the selected element
  highlighter.setPath(selectedElement);

  // Start the highlighter with the selected text
  highlighter.startHighlightReader(selectedText);

  chrome.storage.sync.get(["rate", "pitch", "volume", "voiceURI", "highlightColor", "highlightOpacity", "enableHighlight"], (data) => {
    const utterance = new SpeechSynthesisUtterance(selectedText);

    // Use stored settings or defaults
    utterance.rate = parseFloat(data.rate) || 1;
    utterance.pitch = parseFloat(data.pitch) || 1;
    utterance.volume = parseFloat(data.volume) || 1;

    // Set voice if specified
    if (data.voiceURI) {
      const voices = speechSynthesis.getVoices();
      const voice = voices.find((v) => v.voiceURI === data.voiceURI);
      if (voice) {
        utterance.voice = voice;
      }
    }
    // Set up event handlers for the utterance
    utterance.onstart = () => {
      console.log("TTS started");
      // Update buttons if needed
    };

    // Show notification when speaking starts
    chrome.runtime.sendMessage({ type: "tts-start" });

    // Remove any existing highlights
    clearExistingHighlights();

    // Highlight the selected text if enabled
    if (data.enableHighlight !== false) {
      const color = data.highlightColor || "#FFFF00";
      const opacity = data.highlightOpacity !== undefined ? data.highlightOpacity : 1;
      highlightSelection(color, opacity);
    }

    // Remove highlight when speaking ends
    utterance.onend = () => {
      ttsPaused = false;
      if (document.getElementById("pauseTTS")) {
        document.getElementById("pauseTTS").textContent = "Pause TTS";
      }
      if (document.getElementById("ttsControls")) {
        document.getElementById("ttsControls").style.display = "none";
      }

      clearExistingHighlights();
      // Show notification when speaking ends
      chrome.runtime.sendMessage({ type: "tts-end" });
    };

    speechSynthesis.speak(utterance);
  });
}

let ttsPaused = false; // Flag to track TTS pause state

function pauseResumeTTS() {
  if (speechSynthesis.speaking) {
    if (ttsPaused) {
      speechSynthesis.resume();
      ttsPaused = false;
      document.getElementById("pauseTTS").textContent = "Pause TTS";
      console.log("TTS resumed");
    } else {
      speechSynthesis.pause();
      ttsPaused = true;
      document.getElementById("pauseTTS").textContent = "Resume TTS";
      console.log("TTS paused");
    }
  } else {
    console.log("No TTS is currently speaking");
  }
}

function stopTTS() {
  if (speechSynthesis.speaking || ttsPaused) {
    speechSynthesis.cancel();
    ttsPaused = false;
    document.getElementById("pauseTTS").textContent = "Pause TTS";
    console.log("TTS stopped");
  } else {
    console.log("No TTS is currently speaking or paused");
  }
}

// Function to stop any ongoing speech
function stopReadingAloud() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    // Notify that TTS has ended
    chrome.runtime.sendMessage({ type: "tts-end" });
  }
}

// highlight class

class Highlighter {
  readPath;
  pathHTML;
  wordArr = new Array();
  currIndex;
  #path;
  voice = 0;
  pitch = 1;
  going = false;
  volume = 1;
  color = "#add8e6";
  rate = 1;

  setPath(element) {
    this.#path = element;
  }

  constructor() {
    document.addEventListener("contextmenu", (e) => {
      this.#path = e.target;
    });
  }

  cleanString(string) {
    let pattern = new RegExp("\x20|\x0A");
    let before = "";
    while (string != before) {
      before = string;
      string = string.replace(pattern, "");
    }
    return string;
  }

  startHighlightReader(text) {
    let i;
    let cleanText = this.cleanString(text);
    if (!this.#path) {
      console.error("not path visible");
      return;
    }
    let prev;
    do {
      i = this.cleanString(this.#path.innerText).includes(cleanText);
      prev = this.#path;
      this.#path = this.#path.parentElement;
    } while (!i && (!this.#path || this.#path.nodeName != "HTML"));
    if (!this.#path || this.#path.nodeName == "HTML") {
      console.error("couldn't find element");
      return;
    }
    this.readPath = prev;
    this.pathHTML = this.readPath.innerHTML;
    // let ind = pathHTML.indexOf(cleanText.substr(0, 10)) - 10;
    // let end = pathHTML.indexOf(clean.substr(-10)) + 10;
    // if(ind < 0 || end < 0){
    //     console.error(`start: ${ind}, end: ${end}, less than zero error`);
    //     return;
    // }
    let [start, end] = this.testInclude(cleanText);

    /** */
    this.wordArr = this.itterate(start, end);

    this.currIndex = 0;
    this.read(text);
  }

  testInclude(text) {
    if (text == null || text == undefined) {
      return [null, null];
    }
    let end = 0;
    let start = 0;
    let index = 0;
    let len = text.length * 10;
    let notFoundStart = true;

    //finds start point
    let tracker = 0;
    let second = 0;
    while (notFoundStart && tracker < 1000000) {
      index = 0;
      start = this.pathHTML.indexOf(text[0], start + 1);
      if (start == null || start == undefined) {
        return [null, null];
      }
      end = start;
      second = 0;
      //finds end point
      while (notFoundStart && second < len) {
        second++;
        if (this.pathHTML[end] == " " || this.pathHTML[end] == "\n") {
          end++;
        } else if (this.pathHTML[end] == "<") {
          end = this.pathHTML.indexOf(">", end) + 1;
        } else if (this.pathHTML[end] == "&") {
          end = this.pathHTML.indexOf(" ", end);
          index++;
        } else {
          if (this.pathHTML[end] == text[index]) {
            end++;
            index++;
            if (index == text.length) {
              notFoundStart = false;
            }
          } else {
            break;
          }
        }
      }
      tracker++;
    }
    if (tracker == 1000000) {
      console.log("could not find - canceling highlight.");
    }
    return [start, end];
  }

  read(text) {
    this.going = true;
    let utter = new SpeechSynthesisUtterance(text);

    // Fetch user settings
    chrome.storage.sync.get(["rate", "pitch", "volume", "voiceURI", "highlightColor"], (data) => {
      utter.rate = parseFloat(data.rate) || 1;
      utter.pitch = parseFloat(data.pitch) || 1;
      utter.volume = parseFloat(data.volume) || 1;

      if (data.voiceURI) {
        const voices = speechSynthesis.getVoices();
        const voice = voices.find((v) => v.voiceURI === data.voiceURI);
        if (voice) {
          utter.voice = voice;
        }
      }

      // Set highlight color
      this.color = data.highlightColor || "#add8e6"; // Default color if not set

      // Set up event handlers
      utter.onboundary = (e) => {
        if (e.name === "word") {
          this.changeWord(text.substring(e.charIndex, e.charIndex + e.charLength));
        }
      };

      utter.onend = () => {
        this.readPath.innerHTML = this.pathHTML;
        this.currIndex = 0;
        this.going = false;
      };

      utter.onerror = console.error;

      // Start speaking
      speechSynthesis.speak(utter);
    });
  }

  end() {
    if (this.pathHTML != null && this.going) {
      while (speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      this.readPath.innerHTML = this.pathHTML;
      this.currIndex = 0;
      this.going = false;
    }
  }

  itterate(start, end) {
    let arr = new Array();
    arr.push(start);
    //while not at end
    while (start < end) {
      // has a space or and end character
      if (this.pathHTML[start] == " " || this.pathHTML[start] == "\n") {
        start++;
        continue;

        // has a html tag
      } else if (this.pathHTML[start] == "<") {
        let ind = this.pathHTML.indexOf(">", start);
        start = ind + 1;
        arr.push(ind + 1);
      }
      // else either space or char is next
      else {
        //check the location of the next space
        let ind2 = this.pathHTML.indexOf(" ", start);
        let bracket = this.pathHTML.indexOf("<", start);

        // if bracket is first and not the end of the string
        if ((ind2 > bracket || ind2 == -1) && bracket != -1) {
          // push on the bracket
          arr.push(bracket);
          // push on the ending bracket
          arr.push(this.pathHTML.indexOf(">", bracket) + 1);
          // put start to the end of the html tag
          start = this.pathHTML.indexOf(">", bracket) + 1;
          // if its the end of the string
        } else if (ind2 == -1 && bracket == -1) {
          arr.push(this.pathHTML.length - 1);
          start = end;
          // else no other conditins just push and continue.
        } else {
          arr.push(ind2 + 1);
          start = ind2 + 1;
        }
      }
    }
    return arr;
  }

  changeWord(str) {
    let is_word = new RegExp("[a-zA-Z0-9]");
    if (this.readPath != null && this.currIndex != -1) {
      while (
        (this.pathHTML.substring(this.wordArr[this.currIndex], this.wordArr[this.currIndex + 1]).includes("<") ||
          !is_word.test(this.pathHTML.substring(this.wordArr[this.currIndex], this.wordArr[this.currIndex + 1]))) &&
        this.currIndex < this.wordArr.length
      ) {
        this.currIndex++;
      }
      if (this.pathHTML.substring(this.wordArr[this.currIndex], this.wordArr[this.currIndex + 1]).indexOf(str) != -1 && this.currIndex < this.wordArr.length) {
        let cancel_space = this.pathHTML[this.wordArr[this.currIndex + 1] - 1] == " " ? 1 : 0;
        this.readPath.innerHTML = `${this.pathHTML.slice(0, this.wordArr[this.currIndex])}<c style="background: ${this.color};">${this.pathHTML.slice(
          this.wordArr[this.currIndex],
          this.wordArr[this.currIndex + 1] - cancel_space
        )}</c>${this.pathHTML.slice(this.wordArr[this.currIndex + 1] - cancel_space)}`;
        this.currIndex++;
      }
    }
  }
}

// Function to highlight the selected text
// function highlightSelection(color, opacity) {
//   const selection = window.getSelection();
//   if (!selection.rangeCount) return;
//   const range = selection.getRangeAt(0);

//   // Clone the range to avoid modifying the original selection
//   const newRange = range.cloneRange();

//   // Create a document fragment to hold the extracted contents
//   const fragment = newRange.extractContents();

//   // Create a span to wrap the fragment
//   const wrapper = document.createElement("span");
//   wrapper.className = "dislexia-highlight";
//   wrapper.style.backgroundColor = hexToRGBA(color, opacity);

//   // Append the fragment to the wrapper
//   wrapper.appendChild(fragment);

//   // Insert the wrapper back into the DOM at the original position
//   newRange.insertNode(wrapper);

//   // Optionally, clear and restore the selection
//   selection.removeAllRanges();
//   selection.addRange(newRange);
// }

// Function to convert hex color to RGBA with opacity
function hexToRGBA(hex, opacity) {
  // Remove the hash if present
  hex = hex.replace("#", "");

  // Parse r, g, b values
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    // Invalid hex color
    return `rgba(255, 255, 0, ${opacity})`; // Default to yellow
  }

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Function to clear existing highlights
// function clearExistingHighlights() {
//   const highlights = document.querySelectorAll(".dislexia-highlight");
//   highlights.forEach((wrapper) => {
//     const parent = wrapper.parentNode;
//     while (wrapper.firstChild) {
//       parent.insertBefore(wrapper.firstChild, wrapper);
//     }
//     parent.removeChild(wrapper);
//     parent.normalize();
//   });
// }

// Global variables

let recognition;
let sttActive = false;
let finalTranscript = ""; // Stores the final recognized transcript
let lastResultIndex = 0; // Keep track of the last processed result index
let userStopped = false; // Indicates whether STT was stopped by the user

// STT Functionality
function startSTT() {
  console.log("startSTT() called");

  if (sttActive) {
    console.log("STT is already active. Stopping STT.");
    stopSTT();
    return;
  }

  // Use the last focused editable element
  const activeElement = lastFocusedElement;
  console.log("Active element:", activeElement);

  if (!activeElement || (!activeElement.isContentEditable && !["INPUT", "TEXTAREA"].includes(activeElement.tagName))) {
    alert("Please focus on a text input field or editable element before starting STT.");
    return;
  }

  // Get the current content of the active element and set it as finalTranscript
  if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
    finalTranscript = activeElement.value;
  } else if (activeElement.isContentEditable) {
    finalTranscript = activeElement.innerText || activeElement.textContent;
  } else {
    finalTranscript = ""; // Default to empty string if none of the above
  }
  // Reset lastResultIndex for the new session
  finalTranscript = activeElement.value || activeElement.innerText || "";
  lastResultIndex = 0;
  userStopped = false; // Reset userStopped flag

  chrome.storage.sync.get("enableOverlay", (data) => {
    const enableOverlay = data.enableOverlay === true;

    if (enableOverlay) {
      if (!overlayInjected) {
        injectOverlay();
      }
    } else {
      console.log("Overlay is disabled. Not injecting overlay during STT.");
    }
  });

  // Proceed with initializing speech recognition...

  // Get settings from storage
  chrome.storage.sync.get(["sttLanguage", "continuousSTT"], (data) => {
    const language = data.sttLanguage || "en-US";
    const continuous = data.continuousSTT !== false;
    console.log("STT Language:", language, "Continuous:", continuous);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      console.error("SpeechRecognition API not supported.");
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = continuous;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      sttActive = true;
      chrome.runtime.sendMessage({ action: "stt-active" });
    };

    recognition.onresult = (event) => {
      if (!sttActive) {
        // STT has been stopped, ignore any further results
        console.log("STT is not active, ignoring recognition result.");
        return;
      }
      console.log("Speech recognition result:", event.results);
      let interimTranscript = "";

      for (let i = lastResultIndex; i < event.results.length; ++i) {
        let transcript = event.results[i][0].transcript.trim();

        // Process transcript (e.g., punctuation replacement)
        // Replace spoken punctuation phrases with actual punctuation symbols
        transcript = transcript;
        transcript = transcript
          .replace(/\bcomma\b/gi, ",")
          .replace(/\bperiod\b/gi, ".")
          .replace(/\bdot\b/gi, ".")
          .replace(/\bdots\b/gi, "...")
          .replace(/\bquestion mark\b/gi, "?")
          .replace(/\bexclamation mark\b/gi, "!")
          .replace(/\bsemicolon\b/gi, ";")
          .replace(/\bcolon\b/gi, ":")
          .replace(/\bopen parenthesis\b/gi, "(")
          .replace(/\bclose parenthesis\b/gi, ")")
          .replace(/\bdash\b/gi, "-")
          .replace(/\bhyphen\b/gi, "-")
          .replace(/\bquote\b/gi, '"')
          .replace(/\bsingle quote\b/gi, "'")
          .replace(/\bdouble quote\b/gi, '"')
          .replace(/\bopen bracket\b/gi, "[")
          .replace(/\bclose bracket\b/gi, "]")
          .replace(/\bopen brace\b/gi, "{")
          .replace(/\bclose brace\b/gi, "}")
          .replace(/\bellipsis\b/gi, "...")
          .replace(/\bforward slash\b/gi, "/")
          .replace(/\bbackslash\b/gi, "\\")
          .replace(/\bgreater than\b/gi, ">")
          .replace(/\bless than\b/gi, "<")
          .replace(/\bampersand\b/gi, "&")
          .replace(/\bat sign\b/gi, "@")
          .replace(/\bdollar sign\b/gi, "$")
          .replace(/\bpercent sign\b/gi, "%")
          .replace(/\bnumber sign\b/gi, "#")
          .replace(/\bstar\b/gi, "*")
          .replace(/\bplus sign\b/gi, "+")
          .replace(/\bminus sign\b/gi, "-")
          .replace(/\bequal sign\b/gi, "=")
          .replace(/\bunderscore\b/gi, "_")
          .replace(/\bvertical bar\b/gi, "|")
          .replace(/\bcaret\b/gi, "^")
          .replace(/\btilda\b/gi, "~")
          .replace(/\bgrave accent\b/gi, "`");

        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
          lastResultIndex = i + 1; // Update to the next result
        } else {
          interimTranscript += transcript + " ";
        }
      }

      console.log("Transcribed text:", finalTranscript + interimTranscript);

      // Insert the transcribed text into the stored active element
      if (sttActive) {
        if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
          activeElement.value = finalTranscript + interimTranscript;
        } else if (activeElement.isContentEditable) {
          activeElement.innerHTML = finalTranscript + interimTranscript;
        }
      } else {
        alert("STT has been stopped. Please activate STT again in the desired input field.");
        stopSTT();
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "denied") {
        alert("Microphone access was denied. Please allow microphone access to use speech recognition.");
      } else {
        alert("An error occurred during speech recognition: " + event.error);
      }
      stopSTT();
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      if (!userStopped && sttActive && recognition.continuous) {
        // If continuous STT is enabled and STT is still active, restart recognition
        recognition.start();
        console.log("Speech recognition restarted");
      } else {
        // STT has been stopped by the user
        recognition = null; // Clear the recognition object
        sttActive = false;
        chrome.runtime.sendMessage({ action: "stt-inactive" });
        console.log("Speech recognition fully stopped");
      }
    };

    recognition.start();
    console.log("Speech recognition started with language:", language);
  });
}

function stopSTT() {
  console.log("stopSTT() called");
  if (recognition && sttActive) {
    sttActive = false; // Update the flag to indicate STT is inactive
    userStopped = true; // Indicate that STT was stopped by the user
    recognition.stop(); // Stop the recognition
    chrome.runtime.sendMessage({ action: "stt-inactive" });
    console.log("Speech recognition stopped");
  } else {
    console.log("Speech recognition is not active");
  }
}

// Inject overlay for STT/TTS controls
function injectOverlay() {
  if (overlayInjected || document.getElementById("overlay")) {
    console.log("Overlay is already injected.");
    return;
  }

  // Inject CSS
  const link = document.createElement("link");
  link.href = chrome.runtime.getURL("overlay.css");
  link.rel = "stylesheet";
  document.head.appendChild(link);

  // Inject HTML
  fetch(chrome.runtime.getURL("overlay.html"))
    .then((response) => response.text())
    .then((data) => {
      const overlayElement = document.createElement("div");
      overlayElement.innerHTML = data;
      document.body.appendChild(overlayElement);

      // Add event listeners
      document.getElementById("startRecording").addEventListener("click", (event) => {
        event.preventDefault();
        startSTT();
      });

      document.getElementById("stopRecording").addEventListener("click", (event) => {
        event.preventDefault();
        stopSTT();
      });
      document.getElementById("pauseTTS").addEventListener("click", (event) => {
        event.preventDefault();
        pauseResumeTTS();
      });

      document.getElementById("stopTTS").addEventListener("click", (event) => {
        event.preventDefault();
        stopTTS();
      });

      overlayInjected = true;
    });
}

function removeOverlay() {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.remove();

  const links = document.querySelectorAll("link[href='" + chrome.runtime.getURL("overlay.css") + "']");
  links.forEach((link) => link.parentNode.removeChild(link));

  overlayInjected = false;
}

chrome.storage.sync.get("enableOverlay", (data) => {
  const enableOverlay = data.enableOverlay === true; // Default to true if not set
  if (enableOverlay) {
    injectOverlay();
  } else {
    console.log("Overlay is disabled.");
  }
});
