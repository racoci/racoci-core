# Holds / RACOCI Project Guidelines

This file outlines the foundational development practices, engineering workflows, and quality standards for the Holds substrate repository.

## 🚨 Strict Mandate on Automated Testing
* **Absolute Definition of Done:** **No task or feature implementation is considered concluded without automated tests of all kinds.**
* **Test Classifications Required:**
  - **Unit Tests:** Must cover all low-level primitives, edge cases, and boundary validations (e.g. DPO rewrite checks, identity hashing stable sorts).
  - **End-to-End (E2E) Tests:** Must verify the entire flow, including multi-tier transitions, interning pool state convergence, and causal residue validation under simulated operations.
* **Failing Tests Block Commits:** Every automated test suite must compile and pass cleanly with zero warnings or errors prior to any staging or commit action.

## 🛠️ Code Quality & Formatting
* **Rust Formatting:** Code formatting must comply strictly with the project standard (`cargo fmt`).
* **Lints:** Lints must be checked via `cargo clippy` and resolved cleanly.
* **Abstractions:** Prefer explicit, data-oriented design patterns (flat contiguous arenas with relative `u32` indexing) over pointer chasing or excessive abstract wrapping.
