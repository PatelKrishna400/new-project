// Game State
let currentLevelId = 1;
let currentLevel = null;
let playerPos = { x: 0, y: 0, dir: 'east' };
let workspace = null;
let isRunning = false;
let commands = [];
const TILE_SIZE = 50; // Base size, will scale

// Directions
const DIRS = ['north', 'east', 'south', 'west'];
const DIR_VECTORS = {
    'north': { x: 0, y: -1, rot: 270 },
    'east': { x: 1, y: 0, rot: 0 },
    'south': { x: 0, y: 1, rot: 90 },
    'west': { x: -1, y: 0, rot: 180 } // 180
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Get level from URL
    const params = new URLSearchParams(window.location.search);
    currentLevelId = parseInt(params.get('level')) || 1;

    initBlockly();
    loadLevel(currentLevelId);

    // Optimize resize
    window.addEventListener('resize', onResize, false);
    onResize();
});

function onResize() {
    // blockly resize logic would go here if needed for absolute positioning
    Blockly.svgResize(workspace);
}

// --- Blockly Setup ---
function initBlockly() {
    // Define Blocks
    Blockly.Blocks['move_forward'] = {
        init: function () {
            this.appendDummyInput().appendField("Move Forward ➡");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
        }
    };

    Blockly.Blocks['turn_left'] = {
        init: function () {
            this.appendDummyInput().appendField("Turn Left ↩");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
        }
    };

    Blockly.Blocks['turn_right'] = {
        init: function () {
            this.appendDummyInput().appendField("Turn Right ↪");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
        }
    };

    // Make sure loop block exists (standard in Blockly)

    // Generator (Simple JSON-like command list)
    Blockly.JavaScript = new Blockly.Generator('JavaScript');

    Blockly.JavaScript['move_forward'] = function (block) {
        return 'commands.push("move");\n';
    };
    Blockly.JavaScript['turn_left'] = function (block) {
        return 'commands.push("left");\n';
    };
    Blockly.JavaScript['turn_right'] = function (block) {
        return 'commands.push("right");\n';
    };
    Blockly.JavaScript['controls_repeat_ext'] = function (block) {
        // Repeat logic
        var repeats = Blockly.JavaScript.valueToCode(block, 'TIMES', Blockly.JavaScript.ORDER_ASSIGNMENT) || '0';
        var branch = Blockly.JavaScript.statementToCode(block, 'DO');
        return 'for (var i = 0; i < ' + repeats + '; i++) {\n' + branch + '}\n';
    };
    // Standard repeat block usually 'controls_repeat_ext' or 'controls_repeat'

    workspace = Blockly.inject('blockly-div', {
        toolbox: `
        <xml>
            <block type="move_forward"></block>
            <block type="turn_left"></block>
            <block type="turn_right"></block>
            <block type="controls_repeat_ext">
                <value name="TIMES">
                    <shadow type="math_number">
                        <field name="NUM">3</field>
                    </shadow>
                </value>
            </block>
        </xml>`,
        scrollbars: true,
        trashcan: true
    });
}

// --- Level Loading ---
function loadLevel(id) {
    currentLevel = LEVELS[id];
    if (!currentLevel) {
        alert("Level not found!");
        window.location.href = "index.html";
        return;
    }

    document.getElementById('level-indicator').textContent = id;
    resetPlayerState();
    renderGrid();
    workspace.clear();
}

// --- Rendering ---
function renderGrid() {
    const container = document.getElementById('grid-container');
    container.innerHTML = '';

    const size = currentLevel.gridSize;
    // Calculate cell size to fit container
    const maxSize = Math.min(container.clientWidth, container.clientHeight) - 40;
    const computedTileSize = Math.floor(maxSize / size);

    container.style.width = `${computedTileSize * size}px`;
    container.style.height = `${computedTileSize * size}px`;
    // Center it
    container.style.margin = "auto";
    container.style.position = "relative";
    container.style.top = "50%";
    container.style.transform = "translateY(-50%)";

    // Draw Cells
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const cell = document.createElement('div');
            cell.style.width = `${computedTileSize}px`;
            cell.style.height = `${computedTileSize}px`;
            cell.style.position = 'absolute';
            cell.style.left = `${x * computedTileSize}px`;
            cell.style.top = `${y * computedTileSize}px`;
            cell.style.border = '1px solid #ddd';
            cell.style.boxSizing = 'border-box';

            // Check content
            if (x === currentLevel.goal.x && y === currentLevel.goal.y) {
                cell.className = 'cell star'; // Goal
                cell.innerHTML = '⭐';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontSize = `${computedTileSize * 0.6}px`;
            }

            // Obstacles
            const isObstacle = currentLevel.obstacles.some(o => o.x === x && o.y === y);
            if (isObstacle) {
                cell.className = 'cell wall';
            }

            container.appendChild(cell);
        }
    }

    // Draw Player
    const player = document.createElement('div');
    player.id = 'player-avatar';
    player.className = 'player';
    player.innerHTML = '🤖';
    player.style.width = `${computedTileSize}px`;
    player.style.height = `${computedTileSize}px`;
    player.style.fontSize = `${computedTileSize * 0.7}px`;

    container.appendChild(player);
    updatePlayerVisuals(computedTileSize);
}

function updatePlayerVisuals(tileSize) {
    const player = document.getElementById('player-avatar');
    if (!player) return;

    // Position
    player.style.left = `${playerPos.x * tileSize}px`;
    player.style.top = `${playerPos.y * tileSize}px`;

    // Rotation
    const rot = DIR_VECTORS[playerPos.dir].rot;
    player.style.transform = `rotate(${rot}deg)`;
}

// --- Game Logic ---

function resetPlayerState() {
    if (!currentLevel) return;
    playerPos = { ...currentLevel.startProps };
    // Re-render position immediately
    const container = document.getElementById('grid-container');
    if (container.firstChild) { // If grid exists
        const size = currentLevel.gridSize;
        const maxSize = Math.min(container.parentElement.clientWidth, container.parentElement.clientHeight) - 40;
        const computedTileSize = Math.floor(maxSize / size);
        updatePlayerVisuals(computedTileSize);
    }
}

function resetLevel() {
    isRunning = false;
    resetPlayerState();
    closeModal();
}

function runCode() {
    if (isRunning) return;
    isRunning = true;

    // Generate code
    commands = [];
    // Standard blockly generator
    try {
        const code = Blockly.JavaScript.workspaceToCode(workspace);
        eval(code); // Evaluates commands.push(...)
        executeCommands();
    } catch (e) {
        console.error(e);
        isRunning = false;
        alert("Error in code!");
    }
}

async function executeCommands() {
    const container = document.getElementById('grid-container');
    const size = currentLevel.gridSize;
    const maxSize = Math.min(container.parentElement.clientWidth, container.parentElement.clientHeight) - 40;
    const computedTileSize = Math.floor(maxSize / size);

    for (const cmd of commands) {
        if (!isRunning) break;

        await new Promise(r => setTimeout(r, 600)); // Animation delay

        if (cmd === 'left') {
            const idx = DIRS.indexOf(playerPos.dir);
            playerPos.dir = DIRS[(idx + 3) % 4]; // -1 equivalent
        } else if (cmd === 'right') {
            const idx = DIRS.indexOf(playerPos.dir);
            playerPos.dir = DIRS[(idx + 1) % 4];
        } else if (cmd === 'move') {
            const vec = DIR_VECTORS[playerPos.dir];
            const nextX = playerPos.x + vec.x;
            const nextY = playerPos.y + vec.y;

            // Check Bounds
            if (nextX < 0 || nextX >= currentLevel.gridSize || nextY < 0 || nextY >= currentLevel.gridSize) {
                failLevel("You hit the edge of the world!");
                return;
            }

            // Check Obstacles
            const isObs = currentLevel.obstacles.some(o => o.x === nextX && o.y === nextY);
            if (isObs) {
                failLevel("Bonk! You hit a wall.");
                return;
            }

            playerPos.x = nextX;
            playerPos.y = nextY;
        }

        updatePlayerVisuals(computedTileSize);
    }

    checkWin();
    isRunning = false;
}

function checkWin() {
    if (playerPos.x === currentLevel.goal.x && playerPos.y === currentLevel.goal.y) {
        // Success
        const blocks = workspace.getAllBlocks(false).length;
        document.getElementById('blocks-used').textContent = blocks;
        document.getElementById('success-modal').style.display = 'flex';

        // Save progress
        saveProgress(currentLevelId, 3, blocks);
    } else {
        failLevel("You didn't reach the goal yet.");
    }
}

function failLevel(msg) {
    isRunning = false;
    document.getElementById('fail-message').textContent = msg;
    document.getElementById('fail-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('success-modal').style.display = 'none';
    document.getElementById('fail-modal').style.display = 'none';
}

function nextLevel() {
    window.location.href = `game.html?level=${currentLevelId + 1}`;
}

async function saveProgress(levelId, stars, blocks) {
    const data = { levelId, stars, blocksUsed: blocks };

    try {
        const res = await fetch('/api/progress/guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("API not ok");
    } catch (e) {
        console.warn("Backend save failed, using localStorage", e);
        // Fallback to LocalStorage
        let user = { stars: 0, levelsCompleted: {}, badges: [] };
        try {
            user = JSON.parse(localStorage.getItem('codequest_user') || '{"stars":0, "levelsCompleted":{}, "badges":[]}');
        } catch (err) {
            console.error(err);
        }

        // Logic duplicated from server.js for client-side offline support
        if (!user.levelsCompleted[levelId] || user.levelsCompleted[levelId].stars < stars) {
            const oldStars = user.levelsCompleted[levelId] ? user.levelsCompleted[levelId].stars : 0;
            user.stars += (stars - oldStars);
            user.levelsCompleted[levelId] = { stars, blocksUsed: blocks };
        }

        // Simple Badge Logic (Client Side)
        if (user.stars >= 30 && !user.badges.includes('Star Collector')) {
            user.badges.push('Star Collector');
        }
        if (Object.keys(user.levelsCompleted).length >= 5 && !user.badges.includes('High Five')) {
            user.badges.push('High Five');
        }

        localStorage.setItem('codequest_user', JSON.stringify(user));
    }
}
