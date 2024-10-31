// popup.js

// Initialize variables
let recognizing = false;
let recognition;
let finalTranscript = ""; // Stores the final transcript to prevent re-writing
let lastResultIndex = 0; // Keep track of the last processed result index

// Load settings when the popup is opened
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();

  // Event listeners for TTS and STT buttons
  document
    .getElementById("read-text-btn")
    .addEventListener("click", readSelectedText);
  document
    .getElementById("start-stt-btn")
    .addEventListener("click", toggleRecognition);
  document
    .getElementById("stop-tts-btn")
    .addEventListener("click", stopReadingAloud);

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
  document
    .getElementById("stt-language")
    .addEventListener("change", saveSettings);
  document
    .getElementById("continuous-stt")
    .addEventListener("change", saveSettings);
  document
    .getElementById("enable-overlay")
    .addEventListener("change", saveSettings);

  // Populate the language and voice lists
  populateVoiceList();
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
      "sttLanguage",
      "continuousSTT",
      "enableOverlay",
    ],
    (data) => {
      document.getElementById("rate").value =
        data.rate !== undefined ? data.rate : 1;
      document.getElementById("pitch").value =
        data.pitch !== undefined ? data.pitch : 1;
      document.getElementById("volume").value =
        data.volume !== undefined ? data.volume : 1;
      document.getElementById("voice").value = data.voiceURI || "";
      document.getElementById("highlight-color").value =
        data.highlightColor || "#FFFF00";
      document.getElementById("highlight-opacity").value =
        data.highlightOpacity !== undefined ? data.highlightOpacity : 1;
      document.getElementById("enable-highlight").checked =
        data.enableHighlight !== false;
      document.getElementById("stt-language").value =
        data.sttLanguage || "en-US";
      document.getElementById("continuous-stt").checked =
        data.continuousSTT !== false;
      document.getElementById("enable-overlay").checked =
        data.enableOverlay !== false; // Default to true if not set

      console.log("Settings loaded:", data);
    }
  );
}

// Listener for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "tts-start") {
    // Show the stop button when TTS starts
    document.getElementById("stop-tts-btn").style.display = "inline-block";
  } else if (message.type === "tts-end") {
    // Hide the stop button when TTS ends
    document.getElementById("stop-tts-btn").style.display = "none";
  }
});

// Add a message listener to handle stopTTS and stopSTT requests from the overlay
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "stopTTS") {
    stopReadingAloud();
  } else if (message.action === "stopSTT") {
    stopRecognition();
  }
});

// Save settings to chrome.storage
function saveSettings() {
  const rate = parseFloat(document.getElementById("rate").value);
  const pitch = parseFloat(document.getElementById("pitch").value);
  const volume = parseFloat(document.getElementById("volume").value);
  const voiceURI = document.getElementById("voice").value;
  const highlightColor = document.getElementById("highlight-color").value;
  const highlightOpacity = parseFloat(
    document.getElementById("highlight-opacity").value
  );
  const enableHighlight = document.getElementById("enable-highlight").checked;
  const sttLanguage = document.getElementById("stt-language").value;
  const continuousSTT = document.getElementById("continuous-stt").checked;
  const enableOverlay = document.getElementById("enable-overlay").checked;

  chrome.storage.sync.set(
    {
      rate,
      pitch,
      volume,
      voiceURI,
      highlightColor,
      highlightOpacity,
      enableHighlight,
      sttLanguage,
      continuousSTT,
      enableOverlay,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving settings:", chrome.runtime.lastError);
      } else {
        console.log("Settings saved");

        // Send a message to the content script to enable or disable the overlay
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (tab) {
            chrome.tabs.sendMessage(tab.id, {
              action: enableOverlay ? "enableOverlay" : "disableOverlay",
            });
          }
        });
      }
    }
  );
}

// Populate voice list
function populateVoiceList() {
  const voiceSelect = document.getElementById("voice");

  function setVoiceOptions() {
    let voices = speechSynthesis.getVoices();

    if (!voices.length) {
      // Try again after a delay
      setTimeout(setVoiceOptions, 100);
      return;
    }

    voiceSelect.innerHTML = "";

    voices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} (${voice.lang})`;
      voiceSelect.appendChild(option);
    });

    // After populating voices, set the selected voice
    chrome.storage.sync.get("voiceURI", (data) => {
      if (data.voiceURI) {
        voiceSelect.value = data.voiceURI;
      }
    });
  }

  setVoiceOptions();
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
    chrome.tabs.sendMessage(
      tab.id,
      { action: "readSelectedText" },
      (response) => {
        if (chrome.runtime.lastError) {
          // Inject content script if not present
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
                chrome.tabs.sendMessage(tab.id, {
                  action: "readSelectedText",
                });
              }
            }
          );
        } else if (response && response.error) {
          alert(response.error);
        } else {
          // Show the stop button when TTS starts
          document.getElementById("stop-tts-btn").style.display =
            "inline-block";
        }
      }
    );
  });
}

// Function to stop reading aloud
function stopReadingAloud() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    // Send a message to the content script to stop reading aloud
    chrome.tabs.sendMessage(tab.id, { action: "stopTTS" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      } else {
        // Hide the stop button once TTS stops
        document.getElementById("stop-tts-btn").style.display = "none";
      }
    });
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
  // Get the user-selected language
  chrome.storage.sync.get("sttLanguage", (data) => {
    recognition = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();

    recognition.lang = data.sttLanguage || "en-US"; // Set the language from storage
    recognition.interimResults = true; // Enable interim results for real-time feedback
    recognition.continuous = true; // Keep the recognition running continuously

    recognition.onstart = () => {
      recognizing = true;
      document.getElementById("start-stt-btn").textContent =
        "Stop Speech Recognition (STT)";
    };

    recognition.onresult = (event) => {
      let interimTranscript = ""; // Store the interim results

      // Iterate through the recognition results starting from the last processed index
      for (let i = lastResultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
          lastResultIndex = i + 1; // Update the last result index to avoid reprocessing
        } else {
          interimTranscript += event.results[i][0].transcript + " ";
        }
      }

      // Update the result display area with both final and interim transcripts
      document.getElementById("result").textContent =
        finalTranscript + interimTranscript;
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
      recognizing = false;
      document.getElementById("start-stt-btn").textContent =
        "Start Speech Recognition (STT)";
    };

    recognition.onend = () => {
      recognizing = false;
      document.getElementById("start-stt-btn").textContent =
        "Start Speech Recognition (STT)";
    };

    recognition.start();
  });
}

function stopRecognition() {
  if (recognition) {
    recognition.stop();
    recognizing = false;
    document.getElementById("start-stt-btn").textContent =
      "Start Speech Recognition (STT)";
  }
}
