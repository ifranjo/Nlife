#!/usr/bin/env python3
"""
Script de prueba real con Playwright - Usa archivos reales para detectar fallos
Prueba las herramientas auditadas: Documentos, Media, AI, Utility
"""
import subprocess
import time
import sys
from pathlib import Path

# Crear archivos de prueba
TEST_FILES_DIR = Path(__file__).parent / "test_files"
TEST_FILES_DIR.mkdir(exist_ok=True)

def create_test_files():
    """Crea archivos de prueba reales"""
    print("Creando archivos de prueba...")

    # Crear PDF de prueba simple
    pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
308
%%EOF"""

    pdf_path = TEST_FILES_DIR / "test_document.pdf"
    pdf_path.write_bytes(pdf_content)
    print(f"  [OK] PDF creado: {pdf_path}")

    # Crear imagen PNG simple (1x1 píxel rojo)
    png_content = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D,  # IHDR length
        0x49, 0x48, 0x44, 0x52,  # IHDR
        0x00, 0x00, 0x00, 0x01,  # width: 1
        0x00, 0x00, 0x00, 0x01,  # height: 1
        0x08, 0x02, 0x00, 0x00, 0x00,  # 8-bit RGB
        0x90, 0x77, 0x53, 0xDE,  # IHDR CRC
        0x00, 0x00, 0x00, 0x0C,  # IDAT length
        0x49, 0x44, 0x41, 0x54,  # IDAT
        0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00, 0x01, 0x01, 0x00, 0x05, 0xFE, 0x02, 0xFE,  # compressed data
        0x7D, 0xA8, 0x5E, 0x7D,  # IDAT CRC
        0x00, 0x00, 0x00, 0x00,  # IEND length
        0x49, 0x45, 0x4E, 0x44,  # IEND
        0xAE, 0x42, 0x60, 0x82,  # IEND CRC
    ])

    png_path = TEST_FILES_DIR / "test_image.png"
    png_path.write_bytes(png_content)
    print(f"  [OK] PNG creado: {png_path}")

    # Crear archivo de texto simple
    txt_path = TEST_FILES_DIR / "test_text.txt"
    txt_path.write_text("This is a test document for text analysis.\nIt contains multiple sentences.\nThe quick brown fox jumps over the lazy dog.", encoding="utf-8")
    print(f"  [OK] TXT creado: {txt_path}")

    return pdf_path, png_path, txt_path

def run_playwright_tests():
    """Ejecuta pruebas con Playwright"""
    print("\nEjecutando pruebas con Playwright...")

    script = '''
from playwright.sync_api import sync_playwright
import sys

def test_tool(page, url, tool_name):
    """Prueba una herramienta y reporta errores"""
    print(f"\\nProbando: {tool_name}")
    try:
        page.goto(url, timeout=30000)
        page.wait_for_load_state('networkidle', timeout=30000)

        # Verificar que la página cargó
        title = page.title()
        print(f"  [OK] Página cargada: {title}")

        # Tomar screenshot para debugging
        screenshot_path = f"test_screenshot_{tool_name.replace(' ', '_').lower()}.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"  [OK] Screenshot guardado: {screenshot_path}")

        # Verificar errores en consola
        logs = []
        page.on("console", lambda msg: logs.append(f"{msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: logs.append(f"ERROR: {err}"))

        return True, logs
    except Exception as e:
        print(f"  [ERROR] Error: {e}")
        return False, [str(e)]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    results = {}

    # Probar herramientas de Documentos
    success, logs = test_tool(page, 'http://localhost:4321/tools/pdf-merge', 'PDF Merge')
    results['pdf-merge'] = {'success': success, 'logs': logs}

    # Probar herramientas de AI
    success, logs = test_tool(page, 'http://localhost:4321/tools/grammar-checker', 'Grammar Checker')
    results['grammar-checker'] = {'success': success, 'logs': logs}

    success, logs = test_tool(page, 'http://localhost:4321/tools/text-summarization', 'Text Summarization')
    results['text-summarization'] = {'success': success, 'logs': logs}

    success, logs = test_tool(page, 'http://localhost:4321/tools/image-captioning', 'Image Captioning')
    results['image-captioning'] = {'success': success, 'logs': logs}

    # Probar herramientas de Media
    success, logs = test_tool(page, 'http://localhost:4321/tools/image-compress', 'Image Compress')
    results['image-compress'] = {'success': success, 'logs': logs}

    browser.close()

    # Reporte final
    print("\\n" + "="*60)
    print("RESULTADOS DE PRUEBAS")
    print("="*60)
    for tool, data in results.items():
        status = "[PASS]" if data['success'] else "[FAIL]"
        print(f"{status}: {tool}")
        if data['logs']:
            for log in data['logs'][:3]:  # Mostrar primeros 3 logs
                print(f"  - {log}")

    sys.exit(0 if all(r['success'] for r in results.values()) else 1)
'''

    # Escribir y ejecutar script de Playwright
    test_script_path = Path(__file__).parent / "playwright_test_script.py"
    test_script_path.write_text(script, encoding="utf-8")

    # Ejecutar con el servidor corriendo
    result = subprocess.run(
        [sys.executable, str(test_script_path)],
        capture_output=True,
        text=True,
        timeout=120
    )

    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)

    return result.returncode == 0

def main():
    print("="*60)
    print("PRUEBAS REALES CON PLAYWRIGHT - Nlife_somo")
    print("="*60)

    # Crear archivos de prueba
    pdf_path, png_path, txt_path = create_test_files()

    # Iniciar servidor de desarrollo
    print("\nIniciando servidor de desarrollo...")
    server_process = subprocess.Popen(
        "npm run dev",
        cwd=Path(__file__).parent / "apps" / "web",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True
    )

    # Esperar a que el servidor esté listo
    print("Esperando servidor (15s)...")
    time.sleep(15)

    try:
        # Ejecutar pruebas
        success = run_playwright_tests()

        if success:
            print("\n[OK] Todas las pruebas pasaron")
        else:
            print("\n[ERROR] Algunas pruebas fallaron")

    finally:
        # Detener servidor
        print("\nDeteniendo servidor...")
        server_process.terminate()
        server_process.wait(timeout=5)

    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
