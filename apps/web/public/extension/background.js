/**
 * New Life Tools - Background Service Worker
 * Handles extension lifecycle and messaging
 */

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('New Life Tools extension installed');

    // Set default storage values
    chrome.storage.local.set({
      nl_recent_tools: [],
      nl_install_date: Date.now()
    });

    // Open welcome page (optional - can be enabled later)
    // chrome.tabs.create({ url: 'https://www.newlifesolutions.dev/extension-welcome' });
  } else if (details.reason === 'update') {
    console.log('New Life Tools extension updated to', chrome.runtime.getManifest().version);
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_RECENT_TOOLS':
      chrome.storage.local.get(['nl_recent_tools'], (result) => {
        sendResponse({ tools: result.nl_recent_tools || [] });
      });
      return true; // Keep channel open for async response

    case 'ADD_RECENT_TOOL':
      chrome.storage.local.get(['nl_recent_tools'], (result) => {
        const recent = result.nl_recent_tools || [];
        const filtered = recent.filter(id => id !== message.toolId);
        filtered.unshift(message.toolId);
        const trimmed = filtered.slice(0, 3);

        chrome.storage.local.set({ nl_recent_tools: trimmed }, () => {
          sendResponse({ success: true, tools: trimmed });
        });
      });
      return true;

    case 'OPEN_TOOL':
      chrome.tabs.create({
        url: `https://www.newlifesolutions.dev/tools/${message.toolId}`,
        active: true
      });
      sendResponse({ success: true });
      return false;

    case 'CHECK_PDF':
      // Check if current tab is viewing a PDF
      if (sender.tab) {
        const isPDF = sender.tab.url &&
          (sender.tab.url.toLowerCase().endsWith('.pdf') ||
           sender.tab.url.includes('pdf'));
        sendResponse({ isPDF });
      } else {
        sendResponse({ isPDF: false });
      }
      return false;

    default:
      sendResponse({ error: 'Unknown message type' });
      return false;
  }
});

// Context menu for quick access (optional enhancement)
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for PDFs
  chrome.contextMenus.create({
    id: 'nl-merge-pdf',
    title: 'Merge with PDF Merge Tool',
    contexts: ['link'],
    targetUrlPatterns: ['*://*/*.pdf', '*://*/*.PDF']
  });

  chrome.contextMenus.create({
    id: 'nl-compress-pdf',
    title: 'Compress with PDF Compress Tool',
    contexts: ['link'],
    targetUrlPatterns: ['*://*/*.pdf', '*://*/*.PDF']
  });

  // Create context menu for images
  chrome.contextMenus.create({
    id: 'nl-convert-image',
    title: 'Convert with Image Converter',
    contexts: ['image']
  });

  chrome.contextMenus.create({
    id: 'nl-compress-image',
    title: 'Compress with Image Compressor',
    contexts: ['image']
  });

  chrome.contextMenus.create({
    id: 'nl-remove-bg',
    title: 'Remove Background',
    contexts: ['image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, _tab) => {
  const toolMap = {
    'nl-merge-pdf': 'pdf-merge',
    'nl-compress-pdf': 'pdf-compress',
    'nl-convert-image': 'file-converter',
    'nl-compress-image': 'image-compress',
    'nl-remove-bg': 'background-remover'
  };

  const toolId = toolMap[info.menuItemId];
  if (toolId) {
    chrome.tabs.create({
      url: `https://www.newlifesolutions.dev/tools/${toolId}`,
      active: true
    });
  }
});

// Handle extension icon click (in case action popup fails)
chrome.action.onClicked.addListener((_tab) => {
  // This only fires if there's no popup defined
  // Since we have a popup, this is a fallback
  chrome.tabs.create({
    url: 'https://www.newlifesolutions.dev/hub'
  });
});

// Keep service worker alive periodically (optional, helps with persistence)
const KEEP_ALIVE_INTERVAL = 25 * 1000; // 25 seconds

function keepAlive() {
  chrome.runtime.getPlatformInfo(() => {});
}

setInterval(keepAlive, KEEP_ALIVE_INTERVAL);
