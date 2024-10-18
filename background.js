// background.js

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "read-aloud",
    title: "Read This Aloud",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "speak-to-text",
    title: "Speak to Text",
    contexts: ["editable"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "read-aloud" && info.selectionText) {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "readAloud", text: info.selectionText },
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
                chrome.tabs.sendMessage(tab.id, {
                  action: "readAloud",
                  text: info.selectionText,
                });
              }
            }
          );
        }
      }
    );
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "speak-to-text") {
    // Start STT and insert text into the active element
    chrome.tabs.sendMessage(tab.id, { action: "startSTT" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      }
    });
  }
  // Other context menu actions...
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "tts-start") {
    chrome.notifications.create("tts-start", {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Reading Aloud",
      message: "Started reading the selected text.",
    });
  } else if (message.type === "tts-end") {
    chrome.notifications.create("tts-end", {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Reading Completed",
      message: "Finished reading the selected text.",
    });
  }
});

// Handle messages for STT active/inactive
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "stt-active") {
    // Change the extension badge and icon to indicate STT is active
    chrome.action.setBadgeText({ text: "STT" });
    chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
    // Optional: Change the icon
    chrome.action.setIcon({ path: "icons/icon-stt-active.png" });
  } else if (message.type === "stt-inactive") {
    // Reset the badge and icon
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setIcon({ path: "icons/icon48.png" });
  }
  // Other message handlers...
});
