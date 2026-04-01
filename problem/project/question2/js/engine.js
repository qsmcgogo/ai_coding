/**
 * 贪吃蛇 - 游戏引擎 [可编辑 - 请修复其中的 Bug]
 *
 * 负责：游戏主循环、渲染、输入处理
 * 依赖：logic.js 中的函数
 *
 * 注意：本文件中存在若干逻辑 Bug，请找到并修复它们。
 */

// ========== 常量 ==========
var ROWS = 20;
var COLS = 20;
var CELL_SIZE = 25;
var BASE_INTERVAL = 300;
var SPEED_STEP = 30;
var SCORE_PER_LEVEL = 50;

// ========== 游戏状态 ==========
var state, level, tickTimer, gameState;
var pendingDirection = null;

// ========== 速度与等级计算 ==========
function getTickInterval() {
    return BASE_INTERVAL - level * SPEED_STEP;
}

function calculateLevel(score) {
    return Math.ceil(score / SCORE_PER_LEVEL) + 1;
}

// ========== 游戏流程 ==========
function newGame() {
    state = createInitialState(ROWS, COLS);
    state.food = generateFood(state.snake, ROWS, COLS);
    level = 1;
    gameState = 'playing';
    pendingDirection = null;
    scheduleTick();

    if (typeof document !== 'undefined') {
        document.getElementById('overlay').classList.add('hidden');
        drawGame();
        updateUI();
    }
}

function scheduleTick() {
    clearTimeout(tickTimer);
    var interval = getTickInterval();
    tickTimer = setTimeout(gameTick, interval);
}

function gameTick() {
    if (!state || state.gameOver || gameState !== 'playing') return;

    var nextHead = getNextHeadPosition(state.snake[0], state.direction);
    var ateFood = nextHead.row === state.food.row && nextHead.col === state.food.col;

    // 先移动蛇
    state.snake = moveSnake(state.snake, nextHead, ateFood);

    // 再检测碰撞
    if (checkCollision(nextHead, state.snake, ROWS, COLS)) {
        state.gameOver = true;
        gameState = 'gameover';
        if (typeof document !== 'undefined') {
            showOverlay('游戏结束\n得分: ' + state.score + '\n按任意键重新开始');
            drawGame();
        }
        return;
    }

    if (ateFood) {
        state.score = calculateScore(state.score, state.snake.length);
        state.food = generateFood(state.snake, ROWS, COLS);
        level = calculateLevel(state.score);
    }

    if (typeof document !== 'undefined') {
        drawGame();
        updateUI();
    }
    scheduleTick();
}

// ========== 浏览器环境：渲染与输入 ==========
if (typeof document !== 'undefined') {
    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var overlay = document.getElementById('overlay');
    var overlayText = document.getElementById('overlayText');
    var scoreEl = document.getElementById('score');
    var levelEl = document.getElementById('level');
    var lengthEl = document.getElementById('length');

    function drawGame() {
        // 背景
        ctx.fillStyle = '#16213e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 网格线
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                ctx.strokeRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }

        if (!state) return;

        // 食物
        if (state.food) {
            ctx.fillStyle = '#F44336';
            ctx.beginPath();
            ctx.arc(
                state.food.col * CELL_SIZE + CELL_SIZE / 2,
                state.food.row * CELL_SIZE + CELL_SIZE / 2,
                CELL_SIZE / 2 - 2, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // 蛇身
        for (var i = 0; i < state.snake.length; i++) {
            var seg = state.snake[i];
            ctx.fillStyle = i === 0 ? '#388E3C' : '#4CAF50';
            ctx.fillRect(
                seg.col * CELL_SIZE + 1,
                seg.row * CELL_SIZE + 1,
                CELL_SIZE - 2,
                CELL_SIZE - 2
            );
        }
    }

    function updateUI() {
        scoreEl.textContent = state.score;
        levelEl.textContent = level;
        lengthEl.textContent = state.snake.length;
    }

    function showOverlay(text) {
        overlay.classList.remove('hidden');
        overlayText.textContent = text;
    }

    function togglePause() {
        if (gameState === 'playing') {
            gameState = 'paused';
            clearTimeout(tickTimer);
            showOverlay('暂停\n按 P 继续');
        } else if (gameState === 'paused') {
            gameState = 'playing';
            overlay.classList.add('hidden');
            scheduleTick();
        }
    }

    // 输入处理
    document.addEventListener('keydown', function (e) {
        if (gameState === 'idle' || gameState === 'gameover') {
            newGame();
            return;
        }

        if (e.key === 'p' || e.key === 'P') {
            togglePause();
            return;
        }

        if (gameState !== 'playing') return;

        var dirMap = {
            ArrowUp: 'UP',
            ArrowDown: 'DOWN',
            ArrowLeft: 'LEFT',
            ArrowRight: 'RIGHT'
        };
        var newDir = dirMap[e.key];
        if (newDir) {
            state.direction = changeDirection(state.direction, newDir);
            e.preventDefault();
        }
    });

    // 初始化
    gameState = 'idle';
    drawGame();
}

// ========== 导出（供测试用）==========
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getTickInterval: getTickInterval,
        calculateLevel: calculateLevel,
        ROWS: ROWS,
        COLS: COLS,
        BASE_INTERVAL: BASE_INTERVAL,
        SPEED_STEP: SPEED_STEP,
        SCORE_PER_LEVEL: SCORE_PER_LEVEL
    };
}
