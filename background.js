// background.js - Handle side panel lifecycle

// Track side panel state
let sidePanelOpen = false;

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'sidePanelOpened') {
        sidePanelOpen = true;
        chrome.storage.local.set({ windowPinned: true });
    } else if (message.action === 'sidePanelClosed') {
        sidePanelOpen = false;
        chrome.storage.local.set({ windowPinned: false });
    }
});
