# Holds / RACOCI Workflow Rules

## 🚨 Automated Testing Mandate
- No feature or refactor is complete without corresponding automated test coverage.
- Tests are divided into unit tests and headless integration/E2E tests.
- All test suites must pass successfully with zero warnings/errors before any task is considered finished.

## Spec-Driven Development (SDD) Steps
1. **Plan & Spec Phase:** Write explicit specification (`spec.md`) and implementation roadmap (`plan.md`) describing the architecture, types, and automated testing criteria.
2. **Implementation Gate:** Run pre-validation check and recursive risk analysis.
3. **Coding Phase:** Build the feature in modular, clean increments with small functions (cyclomatic complexity < 5, under 30 lines).
4. **Validation Phase:** Execute lint checks (`svelte-check` and typescript validation) and run the automated test suite.
5. **Phase Checkpoint:** Inspect visual presentation and verify performance metrics.
