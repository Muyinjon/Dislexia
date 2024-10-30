// background.js

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items
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

// Combine all context menu click handling into one listener
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "read-aloud" && info.selectionText) {
    // Handle "Read This Aloud" action
    chrome.tabs.sendMessage(
      tab.id,
      { action: "readAloud", text: info.selectionText },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error:", JSON.stringify(chrome.runtime.lastError));
          // Inject content script if not present
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              files: ["contentScript.js"],
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Failed to inject content script:",
                  JSON.stringify(chrome.runtime.lastError)
                );
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
  } else if (info.menuItemId === "speak-to-text") {
    // Handle "Speak to Text" action
    chrome.tabs.sendMessage(tab.id, { action: "startSTT" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error:", JSON.stringify(chrome.runtime.lastError));
        // Inject content script if not present
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            files: ["contentScript.js"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Failed to inject content script:",
                JSON.stringify(chrome.runtime.lastError)
              );
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
              chrome.tabs.sendMessage(tab.id, { action: "startSTT" });
            }
          }
        );
      }
    });
  }
  // Handle other context menu actions if any
});

// Combine all message handling into one listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "tts-start":
      chrome.notifications.create("tts-start", {
        type: "basic",
        iconUrl: "icons/icon32.png",
        title: "Reading Aloud",
        message: "Started reading the selected text.",
      });
      break;
    case "tts-end":
      chrome.notifications.create("tts-end", {
        type: "basic",
        iconUrl: "icons/icon32.png",
        title: "Reading Completed",
        message: "Finished reading the selected text.",
      });
      break;
    case "stt-active":
      chrome.action.setIcon({ path: "icons/icon-stt-active.png" });
      break;
    case "stt-inactive":
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setIcon({ path: "icons/icon32.png" });
      break;
    case "stopTTS":
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        chrome.tabs.sendMessage(tab.id, { action: "stopTTS" });
      });
      break;
    case "stopSTT":
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        chrome.tabs.sendMessage(tab.id, { action: "stopSTT" });
      });
      break;
    // Add more cases as needed
  }
});
