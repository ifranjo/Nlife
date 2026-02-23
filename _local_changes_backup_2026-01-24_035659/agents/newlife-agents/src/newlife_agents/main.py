#!/usr/bin/env python3
"""
New Life Agents - CLI Entry Point
==================================

Run the feature development crew from the command line.

Usage:
    uv run python -m newlife_agents.main "Add a QR code generator tool"
    uv run python -m newlife_agents.main --analyze-only "Add OCR support"
"""

import argparse
import json
from pathlib import Path
from datetime import datetime

from .crew import FeatureDevelopmentCrew, run_quick_analysis


def save_output(result: dict, output_dir: Path) -> Path:
    """Save the crew output to a JSON file."""
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    feature_slug = result["feature_request"][:30].replace(" ", "_").lower()
    filename = f"{timestamp}_{feature_slug}.json"

    output_path = output_dir / filename
    output_path.write_text(json.dumps(result, indent=2))

    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="New Life Agents - Automated Feature Development",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Full workflow:
    uv run python -m newlife_agents.main "Add a QR code generator tool"

  Analysis only (faster):
    uv run python -m newlife_agents.main --analyze-only "Add image watermarking"

  Quiet mode (less output):
    uv run python -m newlife_agents.main --quiet "Add PDF encryption"
        """,
    )

    parser.add_argument(
        "feature",
        type=str,
        help="Description of the feature to implement",
    )

    parser.add_argument(
        "--analyze-only",
        action="store_true",
        help="Only run the analysis phase (faster)",
    )

    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Reduce output verbosity",
    )

    parser.add_argument(
        "--output-dir",
        type=str,
        default="./outputs",
        help="Directory to save results (default: ./outputs)",
    )

    args = parser.parse_args()

    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   NEW LIFE AGENTS                                         ║
    ║   Automated Feature Development System                    ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

    try:
        if args.analyze_only:
            print(f"[MODE] Analysis Only")
            print(f"[FEATURE] {args.feature}\n")

            result = run_quick_analysis(args.feature)
            print("\n" + "=" * 60)
            print("ANALYSIS RESULT")
            print("=" * 60)
            print(result)

        else:
            print(f"[MODE] Full Development Workflow")
            print(f"[FEATURE] {args.feature}\n")

            crew = FeatureDevelopmentCrew(verbose=not args.quiet)
            result = crew.run(args.feature)

            # Save output
            output_path = save_output(result, Path(args.output_dir))
            print(f"\n[SAVED] Results saved to: {output_path}")

            # Print summary
            print("\n" + "=" * 60)
            print("WORKFLOW COMPLETE")
            print("=" * 60)
            print(f"Feature: {result['feature_request']}")
            print(f"Output: {output_path}")
            print("\nReview the generated code in the output file.")

    except KeyboardInterrupt:
        print("\n\n[CANCELLED] Operation cancelled by user.")
        return 1

    except Exception as e:
        print(f"\n[ERROR] {e}")
        raise

    return 0


if __name__ == "__main__":
    exit(main())
