# Battle for Truhanov - AI Developer Guidelines

## 1. Workspace Context
This project is a modular vanilla HTML5 Canvas fighting game, "Battle for Truhanov" (Труханів Острів: Шлях Бійця). It runs purely on client-side vanilla JavaScript without build systems (like Vite or Webpack), relying on global scope bindings via sequential `<script>` inclusion in `index.html`.

---

## 2. Mandatory AI Pre-Flight Verification Protocol
To ensure SaaS-grade reliability and zero-downtime client deployments, you **MUST** follow this verification flow for every task:
1. **Modify Code**: Apply your code modifications to the JS/HTML/CSS files.
2. **Execute Validation**: Run the automated validator using:
   ```bash
   node validate.js
   ```
3. **Verify Output**: Confirm that the validator outputs `SUCCESS: All scripts loaded in the correct order!` and exits with code `0`.
4. **Zero-Error Tolerance**: Never end your turn or commit changes if the validator fails or if there are console errors. Fix the ReferenceErrors or SyntaxErrors immediately.
5. **Log Modifications**: Document every structural or logical change in [AI_CHANGELOG.md](file:///g:/ANTIGRAVITY/ГРА ТРУХАНОВ/Battle_for_TRUHANOV/AI_CHANGELOG.md) under the appropriate date.

---

## 3. Architecture & Scoping Rules
1. **Strict Dependency Order**: Scripts are loaded sequentially in the DOM. Global objects (`state`, `CTX`, `CANVAS`, `AudioSys`, `AI_ENGINE`) are declared in early files and used in later files. 
   - Never use ES6 `import` or `export` statements.
   - Do not instantiate or call functions in intermediate modules at the top level (this throws `ReferenceErrors` on page load).
2. **Delayed Instantiation**:
   - Declare global variables as `let` in early scripts (e.g., `let AI_ENGINE;` in `config.js`).
   - Instantiate them in the script where their class/construct is defined (e.g., `AI_ENGINE = new AIController();` at the end of `ai.js`).
   - Place general initialization calls (like `initMobileControls()` and `drawScene(0)`) strictly at the end of `main.js`.
3. **Audio Safety**:
   - Audio event listeners (like `touchstart` or `click` triggers for `resumeAudio`) must remain in `audio.js` where `AudioSys` is defined.

---

## 4. Code Quality & SaaS Best Practices
1. **Performance**: Keep the frame rate stable. Minimize GC overhead by reusing particle instances and recycling objects.
2. **Responsive Layouts**: Ensure the `#game-wrapper` scales correctly on all device widths and heights. Mobile controls must be bindable via pointer events and touch events.
3. **No Placeholders**: Never write placeholder logic. Ensure all characters, hitboxes, and audio cues are fully functional.
4. **Backward Compatibility**: Preserve existing combat logic, frame count timings, and game loop structure unless explicitly instructed otherwise.

