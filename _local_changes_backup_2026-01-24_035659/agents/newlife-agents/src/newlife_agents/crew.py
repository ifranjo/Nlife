"""
New Life Solutions - Feature Development Crew
==============================================
Orchestrates the multi-agent workflow for automated feature development.

Workflow:
1. Feature Scout analyzes codebase and plans implementation
2. Code Generator creates the feature code
3. Quality Reviewer validates the output

Usage:
    from newlife_agents.crew import FeatureDevelopmentCrew
    crew = FeatureDevelopmentCrew()
    result = crew.run("Add a QR code generator tool")
"""

from crewai import Crew, Process
from .agents import create_feature_scout, create_code_generator, create_quality_reviewer
from .tasks import create_analysis_task, create_implementation_task, create_review_task


class FeatureDevelopmentCrew:
    """Crew for automated feature development in New Life Solutions."""

    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self.scout = create_feature_scout()
        self.generator = create_code_generator()
        self.reviewer = create_quality_reviewer()

    def run(self, feature_request: str) -> dict:
        """
        Execute the full feature development workflow.

        Args:
            feature_request: Description of the feature to implement

        Returns:
            dict with analysis, implementation, and review results
        """
        print(f"\n{'='*60}")
        print(f"  NEW LIFE AGENTS - Feature Development Crew")
        print(f"{'='*60}")
        print(f"  Feature: {feature_request}")
        print(f"{'='*60}\n")

        # Phase 1: Analysis
        analysis_task = create_analysis_task(feature_request)

        analysis_crew = Crew(
            agents=[self.scout],
            tasks=[analysis_task],
            process=Process.sequential,
            verbose=self.verbose,
        )

        print("\n[PHASE 1] Feature Scout analyzing codebase...\n")
        analysis_result = analysis_crew.kickoff()

        # Phase 2: Implementation
        implementation_task = create_implementation_task(
            feature_request, str(analysis_result)
        )

        implementation_crew = Crew(
            agents=[self.generator],
            tasks=[implementation_task],
            process=Process.sequential,
            verbose=self.verbose,
        )

        print("\n[PHASE 2] Code Generator implementing feature...\n")
        implementation_result = implementation_crew.kickoff()

        # Phase 3: Review
        review_task = create_review_task(str(implementation_result))

        review_crew = Crew(
            agents=[self.reviewer],
            tasks=[review_task],
            process=Process.sequential,
            verbose=self.verbose,
        )

        print("\n[PHASE 3] Quality Reviewer validating code...\n")
        review_result = review_crew.kickoff()

        return {
            "feature_request": feature_request,
            "analysis": str(analysis_result),
            "implementation": str(implementation_result),
            "review": str(review_result),
        }


def run_quick_analysis(feature_request: str) -> str:
    """
    Run only the analysis phase (faster, for exploration).

    Args:
        feature_request: Description of the feature

    Returns:
        Analysis and implementation plan
    """
    scout = create_feature_scout()
    task = create_analysis_task(feature_request)

    crew = Crew(
        agents=[scout],
        tasks=[task],
        process=Process.sequential,
        verbose=True,
    )

    return str(crew.kickoff())
