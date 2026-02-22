/**
 * New Life Tools - Chrome Extension Popup Script
 * Handles tool click tracking and recently used tools display
 */

// Tool metadata for recent tools display
const TOOL_META = {
  'pdf-merge': { icon: '📄', name: 'PDF Merge', class: 'pdf' },
  'pdf-split': { icon: '✂️', name: 'PDF Split', class: 'pdf' },
  'pdf-compress': { icon: '📦', name: 'Compress PDF', class: 'pdf' },
  'file-converter': { icon: '🔄', name: 'Image Convert', class: 'image' },
  'pdf-to-jpg': { icon: '📄', name: 'PDF to JPG', class: 'pdf' },
  'jpg-to-pdf': { icon: '🖼️', name: 'JPG to PDF', class: 'image' },
  'image-compress': { icon: '🖼️', name: 'Image Compress', class: 'image' },
  'background-remover': { icon: '✂️', name: 'Remove BG', class: 'ai' },
  'ocr': { icon: '📝', name: 'OCR', class: 'ai' },
  'pdf-redactor': { icon: '🔒', name: 'PDF Redact', class: 'pdf' },
  'pdf-form-filler': { icon: '✍️', name: 'Fill Forms', class: 'pdf' },
  'audio-transcription': { icon: '🎙️', name: 'Transcribe', class: 'ai' },
  'video-to-mp3': { icon: '🎵', name: 'Video to MP3', class: 'video' },
  'video-compressor': { icon: '📹', name: 'Compress Video', class: 'video' },
  'qr-generator': { icon: '📱', name: 'QR Code', class: 'utility' },
  'password-generator': { icon: '🔑', name: 'Password', class: 'utility' }
};

const BASE_URL = 'https://www.newlifesolutions.dev';
const MAX_RECENT_TOOLS = 3;
const STORAGE_KEY = 'nl_recent_tools';

/**
 * Get recently used tools from chrome.storage
 */
async function getRecentTools() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || []);
      });
    } else {
      // Fallback for testing outside extension context
      const stored = localStorage.getItem(STORAGE_KEY);
      resolve(stored ? JSON.parse(stored) : []);
    }
  });
}

/**
 * Save recently used tools to chrome.storage
 */
async function saveRecentTools(tools) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [STORAGE_KEY]: tools }, resolve);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
      resolve();
    }
  });
}

/**
 * Add a tool to recently used list
 */
async function addToRecentTools(toolId) {
  const recent = await getRecentTools();

  // Remove if already exists (will be re-added at front)
  const filtered = recent.filter(id => id !== toolId);

  // Add to front
  filtered.unshift(toolId);

  // Keep only MAX_RECENT_TOOLS
  const trimmed = filtered.slice(0, MAX_RECENT_TOOLS);

  await saveRecentTools(trimmed);
}

/**
 * Create a tool button element
 */
function createToolButton(toolId) {
  const meta = TOOL_META[toolId];
  if (!meta) return null;

  const link = document.createElement('a');
  link.href = `${BASE_URL}/tools/${toolId}`;
  link.className = 'tool-btn';
  link.dataset.tool = toolId;
  link.target = '_blank';
  link.rel = 'noopener';

  const icon = document.createElement('span');
  icon.className = `tool-icon ${meta.class}`;
  icon.textContent = meta.icon;

  const name = document.createElement('span');
  name.className = 'tool-name';
  name.textContent = meta.name;

  link.appendChild(icon);
  link.appendChild(name);

  return link;
}

/**
 * Render recently used tools section
 */
async function renderRecentTools() {
  const recentTools = await getRecentTools();
  const section = document.getElementById('recentSection');
  const container = document.getElementById('recentTools');

  if (recentTools.length === 0) {
    section.style.display = 'none';
    return;
  }

  // Clear existing
  container.innerHTML = '';

  // Add recent tool buttons
  recentTools.forEach((toolId) => {
    const btn = createToolButton(toolId);
    if (btn) {
      container.appendChild(btn);
    }
  });

  section.style.display = 'flex';
}

/**
 * Handle tool button clicks
 */
function handleToolClick(event) {
  const toolBtn = event.target.closest('.tool-btn');
  if (!toolBtn) return;

  const toolId = toolBtn.dataset.tool;
  if (toolId) {
    addToRecentTools(toolId);
  }
}

/**
 * Initialize popup
 */
async function init() {
  // Render recent tools
  await renderRecentTools();

  // Add click listeners for tracking
  document.addEventListener('click', handleToolClick);

  // Log extension opened (for analytics in future)
  console.log('New Life Tools popup opened');
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
