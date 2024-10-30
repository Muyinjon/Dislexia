// contentScript.js

console.log("Dislexia content script loaded.");
let lastFocusedElement = null;

// Single consolidated listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "readAloud") {
    // Handle readAloud
    readAloud(message.text);
    sendResponse({ status: "success" });
  } else if (message.action === "startSTT") {
    // Handle startSTT
    startSTT();
    sendResponse({ status: "success" });
  } else if (message.action === "stopTTS") {
    // Handle stopTTS
    stopReadingAloud();
    sendResponse({ status: "success" });
  } else if (message.action === "stopSTT") {
    // Handle stopSTT
    stopSTT();
    sendResponse({ status: "success" });
  }
  // Add other actions as needed
  return true; // Indicates that you will send a response asynchronously (if needed)
});
// Event listener to capture focus on editable elements
document.addEventListener(
  "focusin",
  (event) => {
    const target = event.target;
    if (
      target.isContentEditable ||
      ["INPUT", "TEXTAREA"].includes(target.tagName)
    ) {
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

  // Use the last focused editable element
  const activeElement = lastFocusedElement;
  console.log("Active element:", activeElement);

  if (
    !activeElement ||
    (!activeElement.isContentEditable &&
      !["INPUT", "TEXTAREA"].includes(activeElement.tagName))
  ) {
    alert(
      "Please focus on a text input field or editable element before starting STT."
    );
    return;
  }

  // Proceed with initializing speech recognition...

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
      chrome.runtime.sendMessage({ action: "stt-active" });
    };

    recognition.onresult = (event) => {
      console.log("Speech recognition result:", event.results);
      let interimTranscript = "";

      for (let i = lastResultIndex; i < event.results.length; ++i) {
        let transcript = event.results[i][0].transcript.trim();

        // Process transcript (e.g., punctuation replacement)

        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
          lastResultIndex = i + 1; // Update the last result index to avoid reprocessing
        } else {
          interimTranscript += transcript + " ";
        }
      }

      console.log("Transcribed text:", finalTranscript + interimTranscript);

      // Insert the transcribed text into the stored active element
      if (sttActive) {
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
          "STT has been stopped. Please activate STT again in the desired input field."
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
      chrome.runtime.sendMessage({ action: "stt-inactive" });
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

// Inject overlay for STT/TTS controls
function injectOverlay() {
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

      // Now that the overlay is in the DOM, add event listeners
      document
        .getElementById("startRecording")
        .addEventListener("click", (event) => {
          event.preventDefault(); // Prevent default action
          startSTT();
        });

      document
        .getElementById("stopRecording")
        .addEventListener("click", (event) => {
          event.preventDefault();
          stopSTT();
        });

      document
        .getElementById("pauseRecording")
        .addEventListener("click", (event) => {
          event.preventDefault();
          pauseSTT();
        });
    });
}

// Run the injection function when content script is loaded
injectOverlay();
