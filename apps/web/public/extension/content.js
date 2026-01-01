/**
 * New Life Tools - Content Script
 * Detects PDFs in browser and shows floating action button
 */

(function() {
  'use strict';

  const BASE_URL = 'https://www.newlifesolutions.dev';
  const BUTTON_ID = 'nl-tools-fab';
  const MENU_ID = 'nl-tools-menu';

  // Check if we're viewing a PDF
  function isPDFPage() {
    // Check URL extension
    const url = window.location.href.toLowerCase();
    if (url.endsWith('.pdf')) return true;

    // Check for PDF viewer embed
    const embed = document.querySelector('embed[type="application/pdf"]');
    if (embed) return true;

    // Check for PDF.js viewer
    const pdfViewer = document.getElementById('viewer') || document.querySelector('.pdfViewer');
    if (pdfViewer) return true;

    // Check content type
    const contentType = document.contentType;
    if (contentType === 'application/pdf') return true;

    return false;
  }

  // Create the floating action button
  function createFAB() {
    // Don't create if already exists
    if (document.getElementById(BUTTON_ID)) return;

    const fab = document.createElement('div');
    fab.id = BUTTON_ID;
    fab.innerHTML = `
      <div class="nl-fab-button" title="New Life PDF Tools">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <line x1="10" y1="9" x2="8" y2="9"></line>
        </svg>
      </div>
    `;

    document.body.appendChild(fab);

    // Add click handler
    fab.querySelector('.nl-fab-button').addEventListener('click', toggleMenu);

    // Create menu
    createMenu();
  }

  // Create the tools menu
  function createMenu() {
    if (document.getElementById(MENU_ID)) return;

    const menu = document.createElement('div');
    menu.id = MENU_ID;
    menu.innerHTML = `
      <div class="nl-menu-header">
        <span class="nl-menu-title">PDF Tools</span>
        <span class="nl-menu-subtitle">newlifesolutions.dev</span>
      </div>
      <div class="nl-menu-items">
        <a href="${BASE_URL}/tools/pdf-merge" target="_blank" rel="noopener" class="nl-menu-item">
          <span class="nl-menu-icon">📄</span>
          <span>Merge PDFs</span>
        </a>
        <a href="${BASE_URL}/tools/pdf-split" target="_blank" rel="noopener" class="nl-menu-item">
          <span class="nl-menu-icon">✂️</span>
          <span>Split PDF</span>
        </a>
        <a href="${BASE_URL}/tools/pdf-compress" target="_blank" rel="noopener" class="nl-menu-item">
          <span class="nl-menu-icon">📦</span>
          <span>Compress PDF</span>
        </a>
        <a href="${BASE_URL}/tools/pdf-to-jpg" target="_blank" rel="noopener" class="nl-menu-item">
          <span class="nl-menu-icon">🖼️</span>
          <span>PDF to Images</span>
        </a>
        <a href="${BASE_URL}/tools/pdf-organize" target="_blank" rel="noopener" class="nl-menu-item">
          <span class="nl-menu-icon">📑</span>
          <span>Organize Pages</span>
        </a>
        <a href="${BASE_URL}/tools/pdf-redactor" target="_blank" rel="noopener" class="nl-menu-item">
          <span class="nl-menu-icon">🔒</span>
          <span>Redact PDF</span>
        </a>
      </div>
      <div class="nl-menu-footer">
        <a href="${BASE_URL}/hub" target="_blank" rel="noopener">View all tools →</a>
      </div>
    `;

    document.body.appendChild(menu);

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest(`#${BUTTON_ID}`) && !e.target.closest(`#${MENU_ID}`)) {
        closeMenu();
      }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // Toggle menu visibility
  function toggleMenu() {
    const menu = document.getElementById(MENU_ID);
    if (menu) {
      menu.classList.toggle('nl-menu-open');
    }
  }

  // Close menu
  function closeMenu() {
    const menu = document.getElementById(MENU_ID);
    if (menu) {
      menu.classList.remove('nl-menu-open');
    }
  }

  // Initialize
  function init() {
    if (isPDFPage()) {
      // Small delay to ensure page is fully loaded
      setTimeout(createFAB, 500);
    }
  }

  // Run when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also check after a delay (for dynamically loaded PDFs)
  setTimeout(() => {
    if (isPDFPage() && !document.getElementById(BUTTON_ID)) {
      createFAB();
    }
  }, 2000);
})();
