// contentScript.js

console.log("Dislexia content script loaded.");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
  }
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Function to read aloud the text
function readAloud(selectedText) {
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
