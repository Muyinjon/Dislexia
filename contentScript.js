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
  chrome.storage.sync.get(["rate", "pitch", "volume", "voiceURI"], (data) => {
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

    // Highlight the selected text
    highlightSelection();

    // Remove highlight when speaking ends
    utterance.onend = () => {
      clearExistingHighlights();
      // Show notification when speaking ends
      chrome.runtime.sendMessage({ type: "tts-end" });
    };

    speechSynthesis.speak(utterance);
  });
}

// Function to highlight the selected text
function highlightSelection() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0).cloneRange();

  // Adjust the start and end of the range to avoid splitting text nodes
  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    const startOffset = range.startOffset;
    const startContainer = range.startContainer;
    if (startOffset > 0 && startOffset < startContainer.length) {
      const newNode = startContainer.splitText(startOffset);
      range.setStart(newNode, 0);
    }
  }
  if (range.endContainer.nodeType === Node.TEXT_NODE) {
    const endOffset = range.endOffset;
    const endContainer = range.endContainer;
    if (endOffset > 0 && endOffset < endContainer.length) {
      endContainer.splitText(endOffset);
    }
  }

  // Create a TreeWalker to iterate over all text nodes in the range
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        return range.intersectsNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    }
  );

  let node;
  while ((node = walker.nextNode())) {
    const span = document.createElement("span");
    span.className = "dislexia-highlight";
    span.style.backgroundColor = "yellow";
    node.parentNode.replaceChild(span, node);
    span.appendChild(node);
  }
}

// Function to clear existing highlights
function clearExistingHighlights() {
  const highlights = document.querySelectorAll(".dislexia-highlight");
  highlights.forEach((span) => {
    const parent = span.parentNode;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
    parent.normalize(); // Merge adjacent text nodes
  });
}
