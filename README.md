# Dislexia Chrome Extension

A Chrome extension designed to assist users with dyslexia by providing Text-to-Speech (TTS) and Speech-to-Text (STT) functionalities. The extension allows users to have selected text read aloud with customizable settings and to transcribe spoken words into text input fields.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Text-to-Speech (TTS)](#text-to-speech-tts)
  - [Speech-to-Text (STT)](#speech-to-text-stt)
- [Extension Structure](#extension-structure)
  - [manifest.json](#manifestjson)
  - [popup.html](#popuphtml)
  - [popup.js](#popupjs)
  - [background.js](#backgroundjs)
  - [contentScript.js](#contentscriptjs)
  - [styles.css](#stylescss)
  - [Icons](#icons)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
  - [Debugging Steps](#debugging-steps)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Text-to-Speech (TTS):**
  - Reads selected text aloud.
  - Customizable voice settings (rate, pitch, volume).
  - Voice selection from available system voices.
  - Option to highlight text being read with customizable color and opacity.

- **Speech-to-Text (STT):**
  - Transcribes spoken words into focused text input fields.
  - Language selection for speech recognition.
  - Option for continuous dictation.

- **Context Menu Integration:**
  - Right-click options to quickly access TTS and STT functionalities.

- **Visual Indicators:**
  - Extension badge and icon change to indicate when STT is active.

---

## Installation

1. **Download or Clone the Extension:**
   - Download the extension files or clone the repository to your local machine.

2. **Load the Extension in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** by toggling the switch in the top right corner.
   - Click **Load unpacked** and select the extension's directory.

3. **Permissions Prompt:**
   - Upon loading, Chrome may prompt you to grant permissions required by the extension. Accept to proceed.

---

## Usage

### Text-to-Speech (TTS)

1. **Select Text:**
   - Highlight the text you want to be read aloud on any webpage.

2. **Use Context Menu:**
   - Right-click the selected text.
   - Choose **"Read This Aloud"** from the context menu.

   **OR**

   - **Open the Extension Popup:**
     - Click the extension icon in the Chrome toolbar.
     - Adjust TTS settings as desired.
     - Click **"Read Text (TTS)"**.

3. **Customization:**
   - In the extension popup, you can customize:
     - **Rate:** Speed of speech.
     - **Pitch:** Tone of speech.
     - **Volume:** Loudness.
     - **Voice:** Choose from available system voices.
     - **Highlighting:** Enable or disable text highlighting, and set color and opacity.

4. **Notifications:**
   - You will receive notifications indicating when reading starts and ends.

### Speech-to-Text (STT)

1. **Focus on a Text Input Field:**
   - Click inside a text box or textarea where you want the transcribed text to appear.

2. **Use Context Menu:**
   - Right-click within the focused text field.
   - Choose **"Speak to Text"** from the context menu.

   **OR**

   - **Open the Extension Popup:**
     - Click the extension icon in the Chrome toolbar.
     - Adjust STT settings as desired.
     - Click **"Start Speech Recognition (STT)"**.

3. **Begin Speaking:**
   - Speak into your microphone.
   - The extension will transcribe your speech into the text field.

4. **Customization:**
   - In the extension popup, you can customize:
     - **Language:** Select the language for speech recognition.
     - **Continuous Dictation:** Enable or disable continuous listening.

5. **Visual Indicators:**
   - The extension icon and badge will change to indicate when STT is active.

6. **Stopping STT:**
   - To stop STT, click the extension icon and select **"Stop Speech Recognition (STT)"**.

---

## Extension Structure

The extension consists of several files, each responsible for different functionalities.

### manifest.json

Defines the extension's metadata, permissions, and file inclusions.

**Key Entries:**

- **permissions:**
  - `"activeTab"`: Access to the currently active tab.
  - `"tts"`: Use the Text-to-Speech API.
  - `"scripting"`: Inject scripts into webpages.
  - `"contextMenus"`: Add items to the context menu.
  - `"notifications"`: Display notifications.
  - `"storage"`: Store and retrieve settings.
- **background:** Specifies the background script (`background.js`).
- **content_scripts:** Specifies the content script (`contentScript.js`).

### popup.html

The HTML file for the extension's popup window, containing controls for TTS and STT settings.

**Contains:**

- Sliders for rate, pitch, volume.
- Dropdowns for voice selection and language.
- Checkboxes for enabling highlighting and continuous dictation.
- Buttons to start TTS and STT.

### popup.js

Handles the logic for the popup interface.

**Responsibilities:**

- Loading and saving settings using `chrome.storage.sync`.
- Populating voice and language options.
- Attaching event listeners to controls.
- Sending messages to the content script to initiate TTS or STT.

### background.js

The background script that runs continuously.

**Responsibilities:**

- Creating context menu items.
- Handling context menu clicks and sending messages to the content script.
- Managing extension badge and icon changes.
- Displaying notifications for TTS and STT events.

### contentScript.js

Injected into webpages to interact with the DOM and handle TTS and STT functionalities.

**Responsibilities:**

- Responding to messages from the popup and background scripts.
- Implementing the `readAloud` function for TTS.
- Implementing the `startSTT` function for STT.
- Handling text highlighting during TTS.
- Managing speech recognition events and inserting transcribed text.

### styles.css

Contains styles for the popup interface and any in-page elements added by the extension.

**Includes:**

- Styling for buttons, sliders, checkboxes, and other controls.
- Classes for highlighted text.

### Icons

Located in the `icons` folder.

**Files:**

- `icon16.png`: Extension icon for toolbar (16x16 pixels).
- `icon48.png`: Default extension icon (48x48 pixels).
- `icon128.png`: Extension icon for store listing (128x128 pixels).
- `icon-stt-active.png`: Icon displayed when STT is active.

---

## Troubleshooting

### Common Issues

1. **Extension Not Working After Installation:**
   - **Solution:** Ensure all files are correctly placed and the extension is loaded via `chrome://extensions/`.

2. **TTS Not Speaking:**
   - **Solution:** Check if the volume is turned up and the correct voice is selected. Ensure the selected voice is available on your system.

3. **STT Not Transcribing:**
   - **Solution:** Ensure microphone permissions are granted. Check if the browser supports the Speech Recognition API.

4. **Settings Not Saving:**
   - **Solution:** Verify that `"storage"` permission is included in `manifest.json`. Check for errors in the console when saving settings.

5. **Context Menu Items Not Appearing:**
   - **Solution:** Reload the extension and refresh the webpage. Ensure `"contextMenus"` permission is included.

### Debugging Steps

1. **Check Console for Errors:**
   - Open developer tools (`F12` or `Ctrl+Shift+I`) on the webpage or extension popup.
   - Look for errors or warnings in the **Console** tab.

2. **Verify Permissions:**
   - Ensure all necessary permissions are declared in `manifest.json`.

3. **Reload the Extension:**
   - Go to `chrome://extensions/` and click **Reload** under your extension.

4. **Test on Different Websites:**
   - Some sites may block content scripts. Try the extension on another site.

5. **Microphone and Speaker Permissions:**
   - Check browser settings to ensure the site and extension have access to the microphone and speakers.

6. **Check for Conflicting Extensions:**
   - Disable other extensions that might interfere with TTS or STT functionalities.

---

## Contributing

Contributions are welcome! If you'd like to improve this extension or report issues:

1. **Fork the Repository:**
   - Create your own fork of the project.

2. **Make Changes:**
   - Implement your changes or fixes.

3. **Test Thoroughly:**
   - Ensure all features work as expected and there are no new bugs.

4. **Submit a Pull Request:**
   - Provide a clear description of your changes and why they're beneficial.

---

## License

This project is licensed under the MIT License. You are free to use, modify, and distribute this extension as per the terms of the license.

---

# Appendix: File Locations and Descriptions

## manifest.json

**Location:** Root directory.

Defines the extension's configuration, permissions, and scripts.

## popup.html

**Location:** Root directory.

The HTML file for the extension's popup interface.

## popup.js

**Location:** Root directory.

JavaScript for handling the popup's functionality and user interactions.

## background.js

**Location:** Root directory.

Handles background processes, context menus, and event listeners.

## contentScript.js

**Location:** Root directory.

Injected into web pages to perform TTS and STT operations.

## styles.css

**Location:** Root directory.

CSS styles for the popup and in-page elements.

## icons/

**Location:** `icons` directory within the root.

Contains all icon images used by the extension.

---

# Troubleshooting Detailed Steps

## If Something Is Broken

### 1. TTS Is Not Working

- **Check for Console Errors:**
  - Open the developer console on the webpage.
  - Look for errors related to `speechSynthesis` or `TTS`.

- **Verify Voice Availability:**
  - Ensure the selected voice is installed on your system.
  - Try selecting a different voice in the extension popup.

- **Check Volume Settings:**
  - Ensure the volume slider is not set to zero.
  - Verify your system's audio output is functioning.

- **Test with Simplified TTS Code:**
  - Modify `contentScript.js` to use a basic TTS function to isolate issues.

### 2. STT Is Not Working

- **Check Microphone Permissions:**
  - Ensure the browser has permission to access the microphone.
  - You may need to grant permissions in the browser settings.

- **Verify Browser Compatibility:**
  - The Speech Recognition API is primarily supported in Chrome.
  - Ensure you are using a compatible browser.

- **Check Language Settings:**
  - Ensure the correct language is selected in the extension popup.
  - Try using a language that you are certain is supported.

- **Monitor Console for Errors:**
  - Look for errors related to `SpeechRecognition` or `STT`.

### 3. Settings Are Not Saving

- **Check `manifest.json` for Permissions:**
  - Ensure `"storage"` is included in the permissions array.

- **Verify Event Listeners:**
  - Make sure that event listeners for settings controls are correctly set up to call `saveSettings`.

- **Inspect `saveSettings` and `loadSettings` Functions:**
  - Add `console.log()` statements to confirm they are being called.
  - Ensure settings are correctly saved and retrieved from `chrome.storage.sync`.

- **Test with `chrome.storage.local`:**
  - If issues persist, switch from `chrome.storage.sync` to `chrome.storage.local` to test.

### 4. Context Menu Items Missing

- **Reload the Extension:**
  - Sometimes context menus require a reload to appear.

- **Check Permissions:**
  - Ensure `"contextMenus"` is included in `manifest.json`.

- **Inspect `background.js`:**
  - Verify that context menu items are created in the `chrome.runtime.onInstalled` event.

### 5. Extension Icon Not Updating During STT

- **Check Icon File Paths:**
  - Ensure that `icon-stt-active.png` exists in the `icons` directory.

- **Verify `background.js` Message Handling:**
  - Ensure that messages for `stt-active` and `stt-inactive` are correctly updating the icon.

---

## Contact for Support

If you continue to experience issues or have questions:

- **Email:** ceoturobov@gmail.com
- **Issue Tracker:** [GitHub Issues](https://github.com/yourusername/dislexia-extension/issues)

---

**Note:** This extension relies on browser APIs that may have limitations or behave differently across browsers and operating systems. Always ensure your browser is up to date for the best experience.

---

# End of README

This README provides a comprehensive guide to using and troubleshooting the Dislexia Chrome Extension. By following the instructions and utilizing the troubleshooting steps, users should be able to effectively use the extension and resolve common issues.

If you need further assistance or have suggestions for improvement, please reach out through the provided contact channels.
