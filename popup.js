// popup.js

// Initialize variables
let recognizing = false;
let recognition;

// Load settings when the popup is opened
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();

  // Event listeners
  document
    .getElementById("read-text-btn")
    .addEventListener("click", readSelectedText);
  document
    .getElementById("start-stt-btn")
    .addEventListener("click", toggleRecognition);

  // Save settings when they change
  document.getElementById("rate").addEventListener("input", saveSettings);
  document.getElementById("pitch").addEventListener("input", saveSettings);
  document.getElementById("volume").addEventListener("input", saveSettings);
  document.getElementById("voice").addEventListener("change", saveSettings);
  document
    .getElementById("highlight-color")
    .addEventListener("input", saveSettings);
  document
    .getElementById("highlight-opacity")
    .addEventListener("input", saveSettings);
  document
    .getElementById("enable-highlight")
    .addEventListener("change", saveSettings);

  populateVoiceList();

  // Event listeners for STT settings
  document
    .getElementById("stt-language")
    .addEventListener("change", saveSettings);
  document
    .getElementById("continuous-stt")
    .addEventListener("change", saveSettings);

  // Populate the language list
  populateLanguageList();

  // Load settings
  loadSettings();
});

// Load settings from chrome.storage
function loadSettings() {
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
      document.getElementById("rate").value = data.rate || 1;
      document.getElementById("pitch").value = data.pitch || 1;
      document.getElementById("volume").value = data.volume || 1;
      document.getElementById("highlight-color").value =
        data.highlightColor || "#FFFF00";
      document.getElementById("highlight-opacity").value =
        data.highlightOpacity !== undefined ? data.highlightOpacity : 1;
      document.getElementById("enable-highlight").checked =
        data.enableHighlight !== false; // Default to true
      if (data.voiceURI) {
        document.getElementById("voice").value = data.voiceURI;
      }
      document.getElementById("stt-language").value =
        data.sttLanguage || "en-US";
      document.getElementById("continuous-stt").checked =
        data.continuousSTT !== false; // Default to true
    }
  );
}

// Save settings to chrome.storage
function saveSettings() {
  const rate = document.getElementById("rate").value;
  const pitch = document.getElementById("pitch").value;
  const volume = document.getElementById("volume").value;
  const voiceURI = document.getElementById("voice").value;
  const highlightColor = document.getElementById("highlight-color").value;
  const highlightOpacity = document.getElementById("highlight-opacity").value;
  const enableHighlight = document.getElementById("enable-highlight").checked;
  const sttLanguage = document.getElementById("stt-language").value;
  const continuousSTT = document.getElementById("continuous-stt").checked;

  chrome.storage.sync.set({
    rate,
    pitch,
    volume,
    voiceURI,
    highlightColor,
    highlightOpacity,
    enableHighlight,
    sttLanguage,
    continuousSTT,
  });
}

// Populate voice list
function populateVoiceList() {
  const voiceSelect = document.getElementById("voice");
  voiceSelect.innerHTML = "";

  let voices = speechSynthesis.getVoices();

  if (!voices.length) {
    speechSynthesis.addEventListener("voiceschanged", () => {
      voices = speechSynthesis.getVoices();
      populateVoiceOptions(voices);
    });
  } else {
    populateVoiceOptions(voices);
  }
}

function populateVoiceOptions(voices) {
  const voiceSelect = document.getElementById("voice");
  voices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.voiceURI;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });
}
// Populate language list for STT
function populateLanguageList() {
  const languages = [
    { code: "en-US", name: "English (United States)" },
    { code: "en-GB", name: "English (United Kingdom)" },
    { code: "es-ES", name: "Spanish (Spain)" },
    { code: "fr-FR", name: "French (France)" },
    { code: "de-DE", name: "German (Germany)" },
    // Add more languages as needed
  ];
  const languageSelect = document.getElementById("stt-language");
  languages.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang.code;
    option.textContent = lang.name;
    languageSelect.appendChild(option);
  });
}

// Read selected text on the page
function readSelectedText() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    // Send a message to the content script to read the selected text
    chrome.tabs.sendMessage(
      tab.id,
      { action: "readSelectedText" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          // Inject content script
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              files: ["contentScript.js"],
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                // Notify the user
                chrome.notifications.create({
                  type: "basic",
                  iconUrl: "icons/icon48.png",
                  title: "Dislexia Extension",
                  message:
                    "Failed to inject content script. Please refresh the page and try again.",
                });
              } else {
                // Retry sending the message
                chrome.tabs.sendMessage(
                  tab.id,
                  { action: "readSelectedText" },
                  (response) => {
                    if (response && response.error) {
                      alert(response.error);
                    }
                  }
                );
              }
            }
          );
        } else if (response && response.error) {
          alert(response.error);
        }
      }
    );
  });
}

// Toggle speech recognition
function toggleRecognition() {
  if (!recognizing) {
    startRecognition();
  } else {
    stopRecognition();
  }
}

function startRecognition() {
  recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  recognition.lang = "en-US"; // Set language
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    recognizing = true;
    document.getElementById("start-stt-btn").textContent =
      "Stop Speech Recognition (STT)";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("result").textContent += transcript + " ";
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    if (event.error === "not-allowed" || event.error === "denied") {
      alert(
        "Microphone access was denied. Please allow microphone access to use speech recognition."
      );
    } else {
      alert("An error occurred during speech recognition: " + event.error);
    }
  };

  recognition.onend = () => {
    recognizing = false;
    document.getElementById("start-stt-btn").textContent =
      "Start Speech Recognition (STT)";
  };

  recognition.start();
}

function stopRecognition() {
  recognition.stop();
  recognizing = false;
  document.getElementById("start-stt-btn").textContent =
    "Start Speech Recognition (STT)";
}
