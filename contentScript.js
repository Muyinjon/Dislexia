// contentScript.js

console.log("Dislexia content script loaded.");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message);

  if (message.action === "readAloud") {
    readAloud(message.text);
    sendResponse({ status: "success" });
  } else if (message.action === "readSelectedText") {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      readAloud(selectedText);
      sendResponse({ status: "success" });
    } else {
      sendResponse({ error: "Please select text on the page to read." });
    }
  } else if (message.action === "startSTT") {
    startSTT();
    sendResponse({ status: "success" });
  } else if (message.action === "stopTTS") {
    stopReadingAloud();
    sendResponse({ status: "success" });
  }
  return true;
});

// Function to read aloud the text
function readAloud(selectedText) {
  // Cancel any ongoing speech
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }

  chrome.storage.sync.get(
    [
      "rate",
      "pitch",
      "volume",
      "voiceURI",
      "highlightColor",
      "highlightOpacity",
      "enableHighlight",
    ],
    (data) => {
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

      // Show notification when speaking starts
      chrome.runtime.sendMessage({ type: "tts-start" });

      // Remove any existing highlights
      clearExistingHighlights();

      // Highlight the selected text if enabled
      if (data.enableHighlight !== false) {
        const color = data.highlightColor || "#FFFF00";
        const opacity =
          data.highlightOpacity !== undefined ? data.highlightOpacity : 1;
        highlightSelection(color, opacity);
      }

      // Remove highlight when speaking ends
      utterance.onend = () => {
        clearExistingHighlights();
        // Show notification when speaking ends
        chrome.runtime.sendMessage({ type: "tts-end" });
      };

      speechSynthesis.speak(utterance);
    }
  );
}

// Function to stop any ongoing speech
function stopReadingAloud() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    // Notify that TTS has ended
    chrome.runtime.sendMessage({ type: "tts-end" });
  }
}

// Function to highlight the selected text
function highlightSelection(color, opacity) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);

  // Clone the range to avoid modifying the original selection
  const newRange = range.cloneRange();

  // Create a document fragment to hold the extracted contents
  const fragment = newRange.extractContents();

  // Create a span to wrap the fragment
  const wrapper = document.createElement("span");
  wrapper.className = "dislexia-highlight";
  wrapper.style.backgroundColor = hexToRGBA(color, opacity);

  // Append the fragment to the wrapper
  wrapper.appendChild(fragment);

  // Insert the wrapper back into the DOM at the original position
  newRange.insertNode(wrapper);

  // Optionally, clear and restore the selection
  selection.removeAllRanges();
  selection.addRange(newRange);
}

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
function clearExistingHighlights() {
  const highlights = document.querySelectorAll(".dislexia-highlight");
  highlights.forEach((wrapper) => {
    const parent = wrapper.parentNode;
    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }
    parent.removeChild(wrapper);
    parent.normalize();
  });
}

// STT Functionality
let recognition;
let sttActive = false;
let finalTranscript = ""; // Stores the final recognized transcript
let lastResultIndex = 0; // Keep track of the last processed result index

function startSTT() {
  console.log("startSTT() called");

  if (sttActive) {
    console.log("STT is already active. Stopping STT.");
    stopSTT();
    return;
  }

  // Get the active element (should be an input or textarea)
  const activeElement = document.activeElement;
  console.log("Active element:", activeElement);

  if (
    !activeElement.isContentEditable &&
    !["INPUT", "TEXTAREA"].includes(activeElement.tagName)
  ) {
    alert("Please focus on a text input field or editable element.");
    return;
  }

  // Get settings from storage
  chrome.storage.sync.get(["sttLanguage", "continuousSTT"], (data) => {
    const language = data.sttLanguage || "en-US";
    const continuous = data.continuousSTT !== false;
    console.log("STT Language:", language, "Continuous:", continuous);

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

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
      chrome.runtime.sendMessage({ type: "stt-active" });
    };

    recognition.onresult = (event) => {
      console.log("Speech recognition result:", event.results);
      let interimTranscript = "";

      for (let i = lastResultIndex; i < event.results.length; ++i) {
        let transcript = event.results[i][0].transcript.trim();

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
          lastResultIndex = i + 1; // Update the last result index to avoid reprocessing
        } else {
          interimTranscript += transcript + " ";
        }
      }

      console.log("Transcribed text:", finalTranscript + interimTranscript);

      // Insert the transcribed text into the active element
      if (document.activeElement === activeElement) {
        if (
          activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA"
        ) {
          activeElement.value = finalTranscript + interimTranscript;
        } else if (activeElement.isContentEditable) {
          activeElement.innerHTML = finalTranscript + interimTranscript;
        }
      } else {
        alert(
          "The focus has changed. Please activate STT again in the desired input field."
        );
        stopSTT();
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "denied") {
        alert(
          "Microphone access was denied. Please allow microphone access to use speech recognition."
        );
      } else {
        alert("An error occurred during speech recognition: " + event.error);
      }
      stopSTT();
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      sttActive = false;
      lastResultIndex = 0; // Reset lastResultIndex for the next session
      chrome.runtime.sendMessage({ type: "stt-inactive" });
    };

    recognition.start();
    console.log("Speech recognition started with language:", language);
  });
}

function stopSTT() {
  if (recognition && sttActive) {
    recognition.stop();
    sttActive = false;
    chrome.runtime.sendMessage({ type: "stt-inactive" });
  }
}

// Add an event listener to capture the focused element when the STT button is clicked
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startSTT") {
    startSTT();
    sendResponse({ status: "success" });
  } else if (message.action === "stopSTT") {
    stopSTT();
    sendResponse({ status: "success" });
  }
});
