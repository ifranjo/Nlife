/**
 * Clipboard utility with fallback for older browsers and non-HTTPS contexts.
 * The modern Clipboard API requires a secure context (HTTPS) and user interaction.
 * This utility provides a fallback using the legacy execCommand approach.
 */

/**
 * Copy text to clipboard with fallback for older browsers / non-HTTPS contexts.
 *
 * @param text - The text to copy to clipboard
 * @returns Promise that resolves to true if successful, false otherwise
 *
 * @example
 * ```typescript
 * const success = await copyToClipboard('Hello, World!');
 * if (success) {
 *   console.log('Copied!');
 * } else {
 *   console.error('Failed to copy');
 * }
 * ```
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first (requires secure context)
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback method
    }
  }

  // Fallback for older browsers or non-HTTPS contexts
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;

    // Prevent scrolling to bottom of page on iOS
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.opacity = '0';

    // Prevent zoom on iOS
    textarea.style.fontSize = '16px';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    // For iOS Safari
    textarea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    return success;
  } catch {
    return false;
  }
}
