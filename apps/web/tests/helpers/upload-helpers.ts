import { Page } from '@playwright/test';

/**
 * Helper para subir múltiples archivos PDF a PDF Merge
 * Necesario para que los tests encuentren el botón "Merge PDFs"
 */
export async function uploadMultiplePDFs(page: Page, fileCount: number = 2) {
  // Crear PDFs simples de prueba
  const createPdfContent = (id: number) => {
    return [
      '%PDF-1.4',
      `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`,
      `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`,
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj`,
      'trailer\n<< /Root 1 0 R >>\n%%EOF'
    ].join('\n');
  };

  // Subir archivos
  await page.evaluate((count) => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (!input) {
      throw new Error('Input file no encontrado');
    }

    const dataTransfer = new DataTransfer();

    for (let i = 1; i <= count; i++) {
      const pdfContent = [
        '%PDF-1.4',
        `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`,
        `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`,
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj`,
        'trailer\n<< /Root 1 0 R >>\n%%EOF'
      ].join('\n');

      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const file = new File([blob], `test${i}.pdf`, { type: 'application/pdf' });
      dataTransfer.items.add(file);
    }

    input.files = dataTransfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, fileCount);

  // Esperar a que se procesen
  await page.waitForTimeout(1000);
}

/**
 * Helper para esperar que el botón de merge esté disponible
 */
export async function waitForMergeButton(page: Page) {
  const mergeButton = page.locator('button', { hasText: /merge.*pdfs/i });
  await mergeButton.waitFor({ state: 'visible', timeout: 5000 });
  return mergeButton;
}

/**
 * Flujo completo: Upload + Merge + Verificar descarga
 */
export async function testPdfMergeFlow(page: Page, expect: any) {
  // 1. Subir archivos
  await uploadMultiplePDFs(page, 2);

  // 2. Esperar botón
  const mergeButton = await waitForMergeButton(page);

  // 3. Preparar descarga
  const downloadPromise = page.waitForEvent('download');

  // 4. Click merge
  await mergeButton.click();

  // 5. Esperar descarga
  const download = await downloadPromise;

  // 6. Verificar que la descarga existe
  expect(download).toBeTruthy();

  return download;
}
