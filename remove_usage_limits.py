#!/usr/bin/env python3
"""
Elimina los límites de uso (useToolUsage, UpgradePrompt) de todas las herramientas
"""
import re
from pathlib import Path

def remove_usage_limits_from_file(filepath):
    """Elimina useToolUsage y UpgradePrompt de un archivo"""
    content = filepath.read_text(encoding='utf-8')
    original = content
    changes = []

    # 1. Eliminar import de useToolUsage y UpgradePrompt
    # Busca: import UpgradePrompt, { UsageIndicator, useToolUsage } from '../ui/UpgradePrompt';
    # O: import { UsageIndicator, useToolUsage, UpgradePrompt } from '../ui/UpgradePrompt';
    import_pattern = r"import\s+\{?[^}]*useToolUsage[^}]*\}?\s+from\s+['\"]\.\./ui/UpgradePrompt['\"];?\n?"
    if re.search(import_pattern, content):
        content = re.sub(import_pattern, '', content)
        changes.append("Eliminado import de useToolUsage/UpgradePrompt")

    # También busca import separado
    import_pattern2 = r"import\s+UpgradePrompt,\s*\{\s*UsageIndicator,\s*useToolUsage\s*\}\s+from\s+['\"]\.\./ui/UpgradePrompt['\"];?\n?"
    if re.search(import_pattern2, content):
        content = re.sub(import_pattern2, '', content)
        changes.append("Eliminado import de UpgradePrompt")

    # 2. Eliminar declaración de useToolUsage
    # Busca: const { canUse, showPrompt, checkUsage, recordUsage, dismissPrompt } = useToolUsage('tool-id');
    usetoolusage_pattern = r"const\s*\{\s*canUse[^}]*\}\s*=\s*useToolUsage\([^)]+\);?\n?"
    if re.search(usetoolusage_pattern, content):
        content = re.sub(usetoolusage_pattern, '', content)
        changes.append("Eliminado useToolUsage hook")

    # 3. Eliminar componente UpgradePrompt del JSX
    # Busca: {showPrompt && (<UpgradePrompt ... />)}
    upgrade_prompt_pattern = r"\{showPrompt\s*&&\s*<UpgradePrompt[^/]*/?>\s*\}\n?"
    if re.search(upgrade_prompt_pattern, content):
        content = re.sub(upgrade_prompt_pattern, '', content)
        changes.append("Eliminado componente UpgradePrompt")

    # Busca: {showPrompt && (<UpgradePrompt ... />)}
    upgrade_prompt_pattern2 = r"\{showPrompt\s*&&\s*\(\s*<UpgradePrompt[^/]*/?>\s*\)\}\n?"
    if re.search(upgrade_prompt_pattern2, content):
        content = re.sub(upgrade_prompt_pattern2, '', content)
        changes.append("Eliminado componente UpgradePrompt (con parentesis)")

    # Busca: {showPrompt && (
    #   <UpgradePrompt ... />
    # )}
    upgrade_prompt_pattern3 = r"\{showPrompt\s*&&\s*\(\s*<UpgradePrompt[\s\S]*?/>\s*\)\}\n?"
    if re.search(upgrade_prompt_pattern3, content):
        content = re.sub(upgrade_prompt_pattern3, '', content)
        changes.append("Eliminado componente UpgradePrompt (multiline)")

    # Busca formato con onDismiss: {showPrompt && <UpgradePrompt toolId="..." toolName="..." onDismiss={dismissPrompt} />}
    upgrade_prompt_pattern4 = r"\{showPrompt\s*&&\s*<UpgradePrompt\s+toolId=\{?[^}]+\}?\s+toolName=\{?[^}]+\}?\s+onDismiss=\{?[^}]+\}?\s*/>\s*\}\n?"
    if re.search(upgrade_prompt_pattern4, content):
        content = re.sub(upgrade_prompt_pattern4, '', content)
        changes.append("Eliminado componente UpgradePrompt (con onDismiss)")

    # Busca formato con parentesis y onDismiss
    upgrade_prompt_pattern5 = r"\{showPrompt\s*&&\s*\(\s*<UpgradePrompt\s+toolId=\{?[^}]+\}?\s+toolName=\{?[^}]+\}?\s+onDismiss=\{?[^}]+\}?\s*/>\s*\)\s*\}\n?"
    if re.search(upgrade_prompt_pattern5, content):
        content = re.sub(upgrade_prompt_pattern5, '', content)
        changes.append("Eliminado componente UpgradePrompt (parentesis + onDismiss)")

    # 4. Eliminar UsageIndicator
    # Busca: <UsageIndicator toolId="..." />
    usage_indicator_pattern = r"<UsageIndicator\s+toolId=\{?[^}]+\}?\s*/>\n?"
    if re.search(usage_indicator_pattern, content):
        content = re.sub(usage_indicator_pattern, '', content)
        changes.append("Eliminado UsageIndicator")

    # También busca sin toolId explícito
    usage_indicator_pattern2 = r"<UsageIndicator\s*/>\n?"
    if re.search(usage_indicator_pattern2, content):
        content = re.sub(usage_indicator_pattern2, '', content)
        changes.append("Eliminado UsageIndicator (simple)")

    # 5. Eliminar llamadas a checkUsage()
    # Busca: if (!checkUsage()) { return; }
    checkusage_pattern = r"if\s*\(\s*!\s*checkUsage\(\)\s*\)\s*\{\s*return;?\s*\}\n?"
    if re.search(checkusage_pattern, content):
        content = re.sub(checkusage_pattern, '', content)
        changes.append("Eliminado checkUsage()")

    # 6. Eliminar llamadas a recordUsage()
    # Busca: recordUsage();
    recordusage_pattern = r"recordUsage\(\);?\n?"
    if re.search(recordusage_pattern, content):
        content = re.sub(recordusage_pattern, '', content)
        changes.append("Eliminado recordUsage()")

    # 7. Eliminar dismissPrompt de handlers
    # Busca onClick={dismissPrompt} o similar
    dismiss_pattern = r"onClick=\{dismissPrompt\}"
    if re.search(dismiss_pattern, content):
        content = re.sub(dismiss_pattern, '', content)
        changes.append("Eliminado dismissPrompt")

    # 8. Eliminar UpgradePrompt directo (sin showPrompt) - casos donde ya se eliminó la condición
    # Busca: <UpgradePrompt toolId="..." toolName="..." onDismiss={...} />
    upgrade_prompt_pattern6 = r"\s*<UpgradePrompt\s+toolId=\{?[^}]+\}?\s+toolName=\{?[^}]+\}?\s+onDismiss=\{?[^}]+\}?\s*/>\n?"
    if re.search(upgrade_prompt_pattern6, content):
        content = re.sub(upgrade_prompt_pattern6, '\n', content)
        changes.append("Eliminado UpgradePrompt directo")

    # Busca multiline con saltos de linea
    upgrade_prompt_pattern7 = r"\s*<UpgradePrompt[\s\S]*?onDismiss=\{[^}]+\}[\s\S]*?/>\n?"
    if re.search(upgrade_prompt_pattern7, content):
        content = re.sub(upgrade_prompt_pattern7, '', content)
        changes.append("Eliminado UpgradePrompt (multiline)")

    # 9. Limpiar import vacíos (líneas con solo espacios)
    content = re.sub(r'\n\n+', '\n\n', content)

    if content != original:
        filepath.write_text(content, encoding='utf-8')
        return changes
    return None

def main():
    tools_dir = Path("apps/web/src/components/tools")
    files = list(tools_dir.glob("*.tsx"))

    print(f"Procesando {len(files)} archivos...\n")

    modified = 0
    for filepath in files:
        changes = remove_usage_limits_from_file(filepath)
        if changes:
            print(f"[OK] {filepath.name}")
            for change in changes:
                print(f"  - {change}")
            modified += 1

    print(f"\n{modified} archivos modificados")

if __name__ == "__main__":
    main()
