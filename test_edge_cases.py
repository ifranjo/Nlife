#!/usr/bin/env python3
"""
Pruebas de casos límite y errores - Intenta romper las herramientas
"""
import subprocess
import time
import sys
from pathlib import Path

def test_xss_in_grammar_checker(page):
    """Prueba si Grammar Checker escapa HTML malicioso"""
    print("\n[TEST] Grammar Checker - Prueba XSS...")

    try:
        page.goto('http://localhost:4321/tools/grammar-checker', timeout=30000)
        page.wait_for_load_state('networkidle', timeout=30000)

        textarea = page.locator('textarea').first
        if textarea.count() == 0:
            return False

        # Intentar inyección XSS
        xss_text = "<script>alert('XSS')</script> This is a test."
        textarea.fill(xss_text)
        print(f"  [INFO] Texto con HTML ingresado")

        # Click en verificar
        button = page.locator('button:has-text("Check")').first
        if button.count() > 0 and button.is_enabled():
            button.click()
            time.sleep(5)

            # Verificar que el script no se ejecutó
            page.screenshot(path='test_xss_grammar.png', full_page=True)

            # Buscar el texto en la página - debe estar escapado
            content = page.content()
            if '<script>alert(\'XSS\')</script>' in content:
                print("  [ERROR] XSS DETECTADO - El script no fue escapado!")
                return False
            else:
                print("  [OK] HTML escapado correctamente")
                return True

        return True
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def test_large_file_handling(page):
    """Prueba manejo de archivos grandes"""
    print("\n[TEST] Image Compress - Archivo muy grande...")

    try:
        page.goto('http://localhost:4321/tools/image-compress', timeout=30000)
        page.wait_for_load_state('networkidle', timeout=30000)

        # Crear archivo PNG "grande" (simulado)
        large_file = Path(__file__).parent / "test_files" / "large_image.png"
        # Crear un archivo de ~5MB con datos aleatorios
        large_file.write_bytes(b'\x89PNG\r\n\x1a\n' + b'\x00' * (5 * 1024 * 1024))

        file_input = page.locator('input[type="file"]').first
        file_input.set_input_files(str(large_file))

        time.sleep(3)

        # Verificar si hay mensaje de error
        error_msg = page.locator('text=/error|Error|too large|size/i').first
        if error_msg.count() > 0:
            print(f"  [OK] Manejo de error: {error_msg.text_content()[:100]}")
        else:
            print("  [INFO] No se mostró error de tamaño")

        page.screenshot(path='test_large_file.png', full_page=True)

        # Limpiar
        large_file.unlink()
        return True

    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def test_special_characters(page):
    """Prueba caracteres especiales"""
    print("\n[TEST] Text Summarization - Caracteres especiales...")

    try:
        page.goto('http://localhost:4321/tools/text-summarization', timeout=30000)
        page.wait_for_load_state('networkidle', timeout=30000)

        textarea = page.locator('textarea').first
        if textarea.count() == 0:
            return False

        # Texto con caracteres especiales
        special_text = """
        Special chars: < > & " '
        Unicode: ñ á é í ó ú 中文 🎉
        SQL injection: '; DROP TABLE users; --
        Path traversal: ../../../etc/passwd
        """
        textarea.fill(special_text)
        print("  [OK] Caracteres especiales ingresados")

        button = page.locator('button:has-text("Summarize")').first
        if button.count() > 0 and button.is_enabled():
            button.click()
            time.sleep(8)
            page.screenshot(path='test_special_chars.png', full_page=True)
            print("  [OK] Screenshot guardado")

        return True
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def test_empty_inputs(page):
    """Prueba inputs vacíos"""
    print("\n[TEST] Grammar Checker - Input vacío...")

    try:
        page.goto('http://localhost:4321/tools/grammar-checker', timeout=30000)
        page.wait_for_load_state('networkidle', timeout=30000)

        # Intentar enviar vacío
        textarea = page.locator('textarea').first
        textarea.fill("")

        button = page.locator('button:has-text("Check")').first
        if button.count() > 0:
            if button.is_enabled():
                button.click()
                time.sleep(2)
                print("  [INFO] Boton permitió click con input vacío")
            else:
                print("  [OK] Boton deshabilitado para input vacío")

        page.screenshot(path='test_empty_input.png', full_page=True)
        return True
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def test_concurrent_actions(page):
    """Prueba acciones concurrentes"""
    print("\n[TEST] PDF Merge - Múltiples archivos...")

    try:
        page.goto('http://localhost:4321/tools/pdf-merge', timeout=30000)
        page.wait_for_load_state('networkidle', timeout=30000)

        file_input = page.locator('input[type="file"]').first

        # Crear múltiples PDFs
        test_files = []
        for i in range(3):
            pdf_file = Path(__file__).parent / "test_files" / f"test_{i}.pdf"
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
>>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
174
%%EOF"""
            pdf_file.write_bytes(pdf_content)
            test_files.append(str(pdf_file))

        # Subir múltiples archivos
        file_input.set_input_files(test_files)
        print(f"  [OK] {len(test_files)} archivos subidos")

        time.sleep(3)
        page.screenshot(path='test_multiple_files.png', full_page=True)

        # Limpiar
        for f in test_files:
            Path(f).unlink()

        return True
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def main():
    print("="*60)
    print("PRUEBAS DE CASOS LIMITE Y ERRORES")
    print("="*60)

    # Iniciar servidor
    print("\nIniciando servidor...")
    server_process = subprocess.Popen(
        "npm run dev",
        cwd=Path(__file__).parent / "apps" / "web",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True
    )

    print("Esperando 20s...")
    time.sleep(20)

    try:
        from playwright.sync_api import sync_playwright

        results = {}

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Capturar errores de consola
            errors = []
            page.on("console", lambda msg: errors.append(msg) if msg.type == "error" else None)
            page.on("pageerror", lambda err: errors.append(f"PAGE ERROR: {err}"))

            # Ejecutar pruebas
            results['xss_protection'] = test_xss_in_grammar_checker(page)
            results['large_file'] = test_large_file_handling(page)
            results['special_chars'] = test_special_characters(page)
            results['empty_input'] = test_empty_inputs(page)
            results['concurrent_files'] = test_concurrent_actions(page)

            browser.close()

        # Reporte
        print("\n" + "="*60)
        print("RESULTADOS")
        print("="*60)
        for test, success in results.items():
            status = "[PASS]" if success else "[FAIL]"
            print(f"{status}: {test}")

        if errors:
            print("\n[ERRORES DE CONSOLA]")
            for err in errors[:5]:
                print(f"  {err}")

        all_passed = all(results.values())

        if all_passed:
            print("\n[OK] Todas las pruebas pasaron")
        else:
            print("\n[WARNING] Algunas pruebas fallaron")

        return 0 if all_passed else 1

    except ImportError:
        print("[ERROR] Playwright no esta instalado")
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
