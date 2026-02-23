"""
New Life Solutions - CrewAI Tasks
=================================
Task definitions for the feature development workflow.
"""

from crewai import Task
from .agents import create_feature_scout, create_code_generator, create_quality_reviewer


def create_analysis_task(feature_request: str) -> Task:
    """Task to analyze the codebase and plan the feature implementation."""
    return Task(
        description=f"""Analyze the New Life Solutions codebase to understand how to implement:

        FEATURE REQUEST: {feature_request}

        Your analysis should include:
        1. Review existing similar tools in apps/web/src/components/tools/
        2. Check the tool registry in apps/web/src/lib/tools.ts
        3. Identify which libraries/patterns to use
        4. List files that need to be created or modified
        5. Note any security or accessibility considerations

        IMPORTANT DIRECTORIES:
        - apps/web/src/pages/tools/*.astro - Tool pages
        - apps/web/src/components/tools/*.tsx - React tool components
        - apps/web/src/lib/tools.ts - Tool registry (source of truth)
        - apps/web/src/lib/security.ts - File validation utilities
        """,
        expected_output="""A detailed implementation plan including:
        - List of files to create/modify
        - Key patterns to follow (reference existing files)
        - Libraries to use
        - Security considerations
        - Accessibility requirements
        - Estimated complexity (simple/medium/complex)""",
        agent=create_feature_scout(),
    )


def create_implementation_task(feature_request: str, analysis_output: str) -> Task:
    """Task to generate the code for the feature."""
    return Task(
        description=f"""Implement the following feature based on the analysis:

        FEATURE REQUEST: {feature_request}

        ANALYSIS:
        {analysis_output}

        Generate complete, production-ready code including:
        1. React component (.tsx) with proper TypeScript types
        2. Astro page (.astro) with Layout, SEO components
        3. Tool registry entry for lib/tools.ts
        4. Any utility functions needed

        REQUIREMENTS:
        - Use security.ts for all file operations
        - Include WCAG 2.1 AA accessibility (labels, contrast, focus)
        - Add JSON-LD schema markup
        - Follow existing component patterns exactly
        - Include error handling with user-friendly messages
        """,
        expected_output="""Complete code files ready to be saved:
        - Full React component code
        - Full Astro page code
        - Tool registry entry
        - Any additional utilities""",
        agent=create_code_generator(),
    )


def create_review_task(implementation_output: str) -> Task:
    """Task to review the generated code."""
    return Task(
        description=f"""Review the following generated code for quality:

        CODE TO REVIEW:
        {implementation_output}

        Check for:
        1. Security issues (XSS, file validation, sanitization)
        2. Accessibility violations (missing labels, contrast, keyboard nav)
        3. TypeScript errors or weak typing
        4. Missing error handling
        5. Inconsistencies with project patterns
        6. Performance concerns

        Be specific and actionable in your feedback.
        """,
        expected_output="""Code review report with:
        - PASS/FAIL status
        - List of issues found (severity: critical/major/minor)
        - Specific line-by-line fixes required
        - Approval status (approved/needs-changes)""",
        agent=create_quality_reviewer(),
    )
