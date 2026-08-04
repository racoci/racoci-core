# Tech Stack Definition

## Backend Micro-Kernel
- **Language:** Rust (configured for `no_std` compilation)
- **Memory Layout:** Contiguous arena with relative `u32` indices
- **Deduplication Key:** 256-bit cryptographically secure BLAKE3 flyweight hashes
- **Synchronization:** Wait-free SPMC Ring Buffer Concurrency Bus (`DeltaEvent` propagation)
- **Wasm Runtime:** Compiled to a lightweight WebAssembly module (~15 KB)

## Frontend Visual Workspace
- **Framework:** Svelte 5 (with native runes: `$state`, `$derived`, `$effect`)
- **Compilation:** Vite + TypeScript (fully strict checking)
- **Rendering:** HTML5 2D Canvas with custom physics (radial transparency, membrane repulsion)
- **Styling:** CSS variables, cybernetic/futuristic styling theme
