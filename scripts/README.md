# Testing Framework Scripts

This directory contains automation scripts for the New Life Solutions testing framework.

## Scripts

### `create-new-tool.js`
Scaffolds a new tool with all required files and test templates.

```bash
node create-new-tool.js "Tool Name" tool-id [category]

# Example:
node create-new-tool.js "PDF Compress" pdf-compress document
```

Categories: `document`, `media`, `ai`, `utility`, `games`

Creates:
- React component template
- Astro page template
- Functional, accessibility, and visual test files
- Thumbnail placeholder

### `validate-new-tool.js`
Validates a new tool meets all quality standards.

```bash
node validate-new-tool.js tool-id [options]

Options:
  --skip-tests    Skip test execution (faster)
  --verbose       Show detailed output

# Example:
node validate-new-tool.js pdf-compress --verbose
```

Validates:
- Tool registration in tools.ts
- Required files exist
- Code quality standards
- All tests pass
- Accessibility compliance
- SEO requirements

### `quality-gates.json`
Configuration file defining all quality gates and requirements for new tools.

## Usage

### Creating a New Tool

1. Run the scaffolding script:
   ```bash
   npm run create-tool "Tool Name" tool-id category
   ```

2. Add the tool to `apps/web/src/lib/tools.ts` (script will provide template)

3. Implement your tool logic in the generated component

4. Run validation:
   ```bash
   npm run validate-tool tool-id
   ```

5. Fix any issues and re-run validation until all checks pass

### Running Tests

```bash
# Run all tests
npm run test:all

# Run only accessibility tests
npm run test:accessibility

# Run only visual tests
npm run test:visual

# Run only functional tests
npm run test:functional
```

## Quality Gates

Each tool must pass through these quality gates:

1. **Tool Registration** - Proper configuration in tools.ts
2. **Component Implementation** - Security, error handling, UX
3. **Accessibility** - WCAG 2.1 AA compliance
4. **Testing** - Comprehensive test coverage
5. **SEO & Performance** - Optimization standards

See `quality-gates.json` for detailed requirements.

## Example Workflow

```bash
# 1. Create tool
npm run create-tool "Image Converter" image-converter media

# 2. Implement logic (edit generated files)
# ... implementation time ...

# 3. Validate tool
npm run validate-tool image-converter

# 4. Run specific tests during development
cd apps/web
npx playwright test tests/image-converter.spec.ts --ui

# 5. All tests pass? Create PR!
```

## Troubleshooting

### Script fails with permission error
```bash
chmod +x scripts/*.js
```

### Tests fail on Windows
Use PowerShell or WSL for best compatibility.

### Validation shows missing files
Ensure you're running commands from the project root directory.

### Visual tests keep failing
- Check if changes are intentional
- Update snapshots: `npx playwright test --update-snapshots`
- Verify viewport settings match CI environment

## Performance Metrics

- Tool creation: ~2 minutes
- Validation: ~1-5 minutes (depending on tests)
- Test execution: ~30 seconds per tool
- Manual implementation: ~10-30 minutes

**Total time per tool: ~15 minutes** (vs 60+ minutes without automation)

## Contributing

To add new quality gates or improve automation:

1. Edit `quality-gates.json` for new requirements
2. Update test templates in `create-new-tool.js`
3. Modify validation logic in `validate-new-tool.js`
4. Test with a new tool creation
5. Update documentation

---

For detailed examples, see `docs/EXAMPLE_PDF_ORGANIZER.md` and `docs/TESTING_FRAMEWORK.md`.