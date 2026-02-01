# T0 - WORKER: ANÁLISIS HERRAMIENTAS DOCUMENTOS

## Misión
Revisar las 12 herramientas de DOCUMENTOS y subdividirlas en 3 subcategorías lógicas.

## Herramientas a Analizar (12)
1. pdf-merge
2. pdf-compress
3. pdf-split
4. pdf-redactor
5. pdf-form-filler
6. ocr
7. document-scanner
8. pdf-to-word
9. resume-builder
10. pdf-organize
11. jpg-to-pdf
12. pdf-to-jpg

## Tareas
1. Leer cada componente en `apps/web/src/components/tools/`
2. Verificar validación de archivos (security.ts)
3. Identificar dependencias pesadas
4. **SUBDIVIDIR en 3 subcategorías**:
   - PDF Manipulation (merge, split, compress, organize)
   - PDF Conversion (to-word, to-jpg, jpg-to-pdf)
   - Document AI/Scan (ocr, scanner, redactor, form-filler, resume-builder)

## Output Esperado
Reporte ASCII con:
- Subcategorías definidas
- Estado de cada herramienta
- Problemas de seguridad encontrados
- Recomendaciones

## Archivos de Salida
- `.workertasks/t0_reporte.txt`
- `.workertasks/t0_estado.json`
