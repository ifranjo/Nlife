#!/usr/bin/env python3
"""
Pruebas interactivas con Playwright - Interactua con las herramientas como un humano
Sube archivos, hace clic, espera resultados
"""
import subprocess
import time
import sys
from pathlib import Path

def test_image_compress_with_file(page):
    """Prueba Image Compress subiendo un archivo real"""
    print("\n[TEST] Image Compress - Subiendo archivo...")

    try:
        page.goto('http://localhost:4321/tools/image-compress', timeout=30000)
        page.wait_for_load_state('networkidle', timeout=30000)

        # Buscar el input de archivo
        file_input = page.locator('input[type="file"]').first

        if file_input.count() == 0:
            print("  [ERROR] No se encontro input de archivo")
            return False

        # Subir archivo
        test_file = Path(__file__).parent / "test_files" / "test_image.png"
        file_input.set_input_files(str(test_file))
        print(f"  [OK] Archivo seleccionado: {test_file}")

        # Esperar procesamiento
        time.sleep(3)

        # Tomar screenshot
        page.screenshot(path='test_image_compress_result.png', full_page=True)
        print("  [OK] Screenshot guardado")

        # Verificar si hay errores en la pagina
        error_elements = page.locator('.text-red-400, .bg-red-500, [class*="error"]').all()
        if error_elements:
            print(f"  [ADVERTENCIA] Se encontraron {len(error_elements)} elementos de error")
            for elem in error_elements[:3]:
                text = elem.text_content()
                if text:
                    print(f"    - {text[:100]}")

        return True
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def test_grammar_checker_with_text(page):
    """Prueba Grammar Checker con texto real"""
    print("\n[TEST] Grammar Checker - Analizando texto...")

    try:
        page.goto('http://localhost:4321/tools/grammar-checker', timeout=30000)
        page.wait_for_load_state('networkidle', timeout=30000)

        # Encontrar textarea
        textarea = page.locator('textarea').first
        if textarea.count() == 0:
            print("  [ERROR] No se encontro textarea")
            return False

        # Escribir texto con errores
        test_text = "Their going to the store. I seen that movie."
        textarea.fill(test_text)
        print(f"  [OK] Texto ingresado: {test_text[:50]}...")

        # Hacer clic en el boton de verificar
        button = page.locator('button:has-text("Check")').first
        if button.count() == 0:
            button = page.locator('button:has-text("Grammar")').first

        if button.count() > 0:
            button.click()
            print("  [OK] Boton clickeado")

            # Esperar resultado
            time.sleep(5)

            # Verificar resultado
            page.screenshot(path='test_grammar_result.png', full_page=True)
            print("  [OK] Screenshot guardado")

            # Buscar resultados
            results = page.locator('[class*="correction"], [class*="result"], .text-green-400, .text-cyan-400').all()
            print(f"  [INFO] {len(results)} elementos de resultado encontrados")
        else:
            print("  [ADVERTENCIA] No se encontro boton de verificar")

        return True
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def test_pdf_merge_with_files(page):
    """Prueba PDF Merge subiendo archivos"""
    print("\n[TEST] PDF Merge - Subiendo PDFs...")

    try:
        page.goto('http://localhost:4321/tools/pdf-merge', timeout=30000)
        page.wait_for_load_state('networkidle', timeout=30000)

        # Buscar input de archivo
        file_input = page.locator('input[type="file"]').first

        if file_input.count() == 0:
            print("  [ERROR] No se encontro input de archivo")
            return False

        # Subir PDF
        test_file = Path(__file__).parent / "test_files" / "test_document.pdf"
        file_input.set_input_files(str(test_file))
        print(f"  [OK] PDF seleccionado: {test_file}")

        time.sleep(2)

        page.screenshot(path='test_pdf_merge_result.png', full_page=True)
        print("  [OK] Screenshot guardado")

        return True
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def test_text_summarization(page):
    """Prueba Text Summarization"""
    print("\n[TEST] Text Summarization - Resumiendo texto...")

    try:
        page.goto('http://localhost:4321/tools/text-summarization', timeout=30000)
        page.wait_for_load_state('networkidle', timeout=30000)

        # Encontrar textarea
        textarea = page.locator('textarea').first
        if textarea.count() == 0:
            print("  [ERROR] No se encontro textarea")
            return False

        # Escribir texto largo
        test_text = """
        Artificial intelligence has transformed how we interact with technology in our daily lives.
        From voice assistants that help us set reminders and play music, to recommendation systems
        that suggest what to watch or buy, AI is everywhere. Machine learning algorithms analyze
        vast amounts of data to identify patterns and make predictions. Natural language processing
        enables computers to understand and generate human language. Computer vision allows machines
        to interpret images and videos. These technologies are being applied in healthcare for disease
        diagnosis, in finance for fraud detection, in transportation for autonomous vehicles, and in
        countless other industries. As AI continues to advance, it raises important questions about
        privacy, job displacement, and the need for ethical guidelines.
        """
        textarea.fill(test_text)
        print(f"  [OK] Texto ingresado ({len(test_text)} chars)")

        # Hacer clic en el boton
        button = page.locator('button:has-text("Summarize")').first
        if button.count() > 0 and button.is_enabled():
            button.click()
            print("  [OK] Boton clickeado")

            # Esperar carga del modelo y procesamiento
            time.sleep(10)

            page.screenshot(path='test_summarization_result.png', full_page=True)
            print("  [OK] Screenshot guardado")
        else:
            print("  [INFO] Boton no disponible (posiblemente requiere carga de modelo)")

        return True
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def main():
    print("="*60)
    print("PRUEBAS INTERACTIVAS CON PLAYWRIGHT")
    print("="*60)

    # Verificar que existan archivos de prueba
    test_files_dir = Path(__file__).parent / "test_files"
    if not test_files_dir.exists():
        print("\n[ERROR] No se encontraron archivos de prueba")
        print("Ejecuta primero: python test_real_files.py")
        return 1

    # Iniciar servidor
    print("\nIniciando servidor...")
    server_process = subprocess.Popen(
        "npm run dev",
        cwd=Path(__file__).parent / "apps" / "web",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True
    )

    print("Esperando 20s para que el servidor este listo...")
    time.sleep(20)

    try:
        # Importar playwright
        from playwright.sync_api import sync_playwright

        results = {}

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Capturar logs de consola
            logs = []
            page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
            page.on("pageerror", lambda err: logs.append(f"[PAGE ERROR] {err}"))

            # Ejecutar pruebas
            results['image-compress'] = test_image_compress_with_file(page)
            results['grammar-checker'] = test_grammar_checker_with_text(page)
            results['pdf-merge'] = test_pdf_merge_with_files(page)
            results['text-summarization'] = test_text_summarization(page)

            browser.close()

        # Reporte
        print("\n" + "="*60)
        print("RESULTADOS")
        print("="*60)
        for tool, success in results.items():
            status = "[PASS]" if success else "[FAIL]"
            print(f"{status}: {tool}")

        # Mostrar logs de error
        error_logs = [l for l in logs if '[error]' in l.lower() or '[page error]' in l.lower()]
        if error_logs:
            print("\n[LOGS DE ERROR]")
            for log in error_logs[:10]:
                print(f"  {log[:150]}")

        all_passed = all(results.values())

        if all_passed:
            print("\n[OK] Todas las pruebas pasaron")
        else:
            print("\n[WARNING] Algunas pruebas fallaron")

        return 0 if all_passed else 1

    except ImportError:
        print("[ERROR] Playwright no esta instalado")
        print("Instalalo con: pip install playwright")
        print("Y luego: playwright install chromium")
        return 1
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        print("\nDeteniendo servidor...")
        server_process.terminate()
        server_process.wait(timeout=5)

if __name__ == "__main__":
    sys.exit(main())
