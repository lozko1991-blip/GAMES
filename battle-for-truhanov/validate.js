const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1. Read index.html and extract script tags
const htmlPath = path.join(__dirname, 'index.html');
if (!fs.existsSync(htmlPath)) {
    console.error("Error: index.html not found!");
    process.exit(1);
}
const html = fs.readFileSync(htmlPath, 'utf8');

// Regex to find src attributes in script tags: <script src="./somefile.js"></script>
const scriptRegex = /<script\s+[^>]*src=["']\.\/([^"']+)["'][^>]*>/g;
const scripts = [];
let match;
while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1]);
}

if (scripts.length === 0) {
    console.error("Error: No script tags found in index.html!");
    process.exit(1);
}

console.log("Detected script loading order from index.html:", scripts);

// 2. Mock browser globals
global.window = global;
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: (id) => {
        return {
            getContext: () => ({
                setTransform: () => {},
                clearRect: () => {},
                save: () => {},
                restore: () => {},
                translate: () => {},
                drawImage: () => {},
                fillRect: () => {},
                strokeText: () => {},
                fillText: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                createRadialGradient: () => ({ addColorStop: () => {} }),
                createLinearGradient: () => ({ addColorStop: () => {} }),
                stroke: () => {},
                ellipse: () => {},
                moveTo: () => {},
                lineTo: () => {},
                quadraticCurveTo: () => {},
            }),
            addEventListener: () => {},
            removeEventListener: () => {},
            style: {},
            classList: { add: () => {}, remove: () => {} },
            querySelectorAll: () => [],
            value: '0',
            innerText: ''
        };
    },
    querySelectorAll: () => [],
    visibilityState: 'visible'
};
global.Image = class {
    constructor() {
        setTimeout(() => { if (this.onload) this.onload(); }, 1);
    }
};
global.AudioContext = class {
    constructor() { this.state = 'suspended'; }
};
global.webkitAudioContext = global.AudioContext;
global.navigator = { vibrate: () => {} };
global.Peer = class {
    constructor() {
        this.on = () => {};
    }
};

// 3. Load and evaluate scripts
scripts.forEach(script => {
    const scriptPath = path.join(__dirname, script);
    if (!fs.existsSync(scriptPath)) {
        console.error(`Error: Script file not found: ${script}`);
        process.exit(1);
    }
    console.log(`Evaluating ${script}...`);
    const code = fs.readFileSync(scriptPath, 'utf8');
    try {
        vm.runInThisContext(code, { filename: script });
        console.log(`Successfully evaluated ${script}.`);
    } catch (e) {
        console.error(`CRITICAL ERROR while evaluating ${script}:`, e);
        process.exit(1);
    }
});

console.log("\n=======================================================");
console.log("SUCCESS: All scripts loaded in the correct order!");
console.log("No syntax or immediate load-time ReferenceErrors found.");
console.log("=======================================================");
