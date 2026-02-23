
from playwright.sync_api import sync_playwright
import sys

def test_tool(page, url, tool_name):
    """Prueba una herramienta y reporta errores"""
    print(f"\nProbando: {tool_name}")
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
    print("\n" + "="*60)
    print("RESULTADOS DE PRUEBAS")
    print("="*60)
    for tool, data in results.items():
        status = "[PASS]" if data['success'] else "[FAIL]"
        print(f"{status}: {tool}")
        if data['logs']:
            for log in data['logs'][:3]:  # Mostrar primeros 3 logs
                print(f"  - {log}")

    sys.exit(0 if all(r['success'] for r in results.values()) else 1)
