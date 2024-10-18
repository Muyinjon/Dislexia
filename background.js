// background.js

// Create context menu item when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "read-aloud",
    title: "Read This Aloud",
    contexts: ["selection"],
  });
});

// Add a listener for clicks on the context menu item
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "read-aloud" && info.selectionText) {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "readAloud", text: info.selectionText },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          // Inject the content script
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              files: ["contentScript.js"],
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                // Show a notification
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

// Listen for messages from content scripts or other parts of the extension
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
