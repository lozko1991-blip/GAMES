# AI Modification Changelog

This log is strictly maintained by AI assistants. It serves as a reliable project history to ensure perfect continuity, bug tracking, and seamless handoffs between different AI sessions. 
**Rule:** Every single structural or logical change MUST be documented here.

## [2026-06-18]
- **Structural Bugfix (ReferenceError)**: Removed `initMobileControls()` and `drawScene(0)` from `config.js` and moved them to the end of `main.js`. This prevents `ReferenceError` during page load, as these functions depend on `input.js` and `render.js` which load later.
- **Structural Bugfix (ReferenceError)**: Resolved `resumeAudio is not defined` and `AIController is not defined` ReferenceErrors by removing immediate/load-time event listeners and instantiation from `config.js`. Moved the `touchstart` and `visibilitychange` listeners to `audio.js` where `resumeAudio` and `AudioSys` are defined. Delayed instantiation of `AI_ENGINE` by declaring it as a global `let` in `config.js` and initializing it at the end of `ai.js` (after the `AIController` class is declared).
- **Syntax Hotfix**: Fixed missing and extra closing braces `}` in `input.js` and `config.js` caused by the initial monolithic `game.js` Python split script.
- **AI Workspace Setup**: Created `.agents/AGENTS.md` containing core project rules to prevent AI hallucinations, and created this `AI_CHANGELOG.md` to establish a strict modification history.
- **Architectural Reference**: An `instruction.md` file was previously created to document the overall file map and module responsibilities.

