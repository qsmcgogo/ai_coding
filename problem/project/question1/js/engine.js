/**
 * 俄罗斯方块 - 游戏引擎 [锁定文件，考生不可修改]
 *
 * 负责：游戏主循环、渲染、输入处理
 * 依赖：logic.js 中的函数
 */
(function () {
    'use strict';

    // ========== 常量 ==========
    const ROWS = 20;
    const COLS = 10;
    const CELL_SIZE = 30;
    const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];
    const COLORS = {
        1: '#00f0f0', // I - 青
        2: '#f0f000', // O - 黄
        3: '#a000f0', // T - 紫
        4: '#00f000', // S - 绿
        5: '#f00000', // Z - 红
        6: '#f0a000', // L - 橙
        7: '#0000f0', // J - 蓝
    };
    const COLOR_MAP = { I: 1, O: 2, T: 3, S: 4, Z: 5, L: 6, J: 7 };
    const BASE_SPEED = 800; // 1 级下落间隔（ms）
    const SPEED_FACTOR = 0.85; // 每级速度倍率
    const LINES_PER_LEVEL = 10;
    const SOFT_DROP_SPEED = 50;

    // ========== DOM ==========
    const boardCanvas = document.getElementById('board');
    const boardCtx = boardCanvas.getContext('2d');
    const nextCanvas = document.getElementById('next');
    const nextCtx = nextCanvas.getContext('2d');
    const overlay = document.getElementById('overlay');
    const overlayText = document.getElementById('overlayText');
    const scoreEl = document.getElementById('score');
    const levelEl = document.getElementById('level');
    const linesEl = document.getElementById('lines');

    // ========== 游戏状态 ==========
    let board, currentPiece, nextPiece;
    let score, level, totalLines;
    let dropInterval, dropTimer, lastTime;
    let gameState; // 'idle' | 'playing' | 'paused' | 'gameover'
    let softDrop;

    // ========== 工具函数 ==========
    function randomType() {
        return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    }

    function spawnPiece(type) {
        const shape = getPieceShape(type);
        if (!shape) return null;
        return {
            type: type,
            shape: shape,
            colorId: COLOR_MAP[type],
            row: 0,
            col: Math.floor((COLS - shape[0].length) / 2),
        };
    }

    function getDropSpeed() {
        return BASE_SPEED * Math.pow(SPEED_FACTOR, level - 1);
    }

    // ========== 渲染 ==========
    function drawCell(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
        // 高光
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 1, y + 1, size - 2, 4);
        ctx.fillRect(x + 1, y + 1, 4, size - 2);
    }

    function drawBoard() {
        boardCtx.fillStyle = '#16213e';
        boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

        // 网格线
        boardCtx.strokeStyle = 'rgba(255,255,255,0.03)';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                boardCtx.strokeRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }

        // 已固定的方块
        if (board) {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (board[r][c]) {
                        drawCell(boardCtx, c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, COLORS[board[r][c]]);
                    }
                }
            }
        }

        // 当前方块 + 投影
        if (currentPiece && gameState === 'playing') {
            // 投影（ghost）
            let ghostRow = currentPiece.row;
            while (!checkCollision(board, currentPiece.shape, ghostRow + 1, currentPiece.col)) {
                ghostRow++;
            }
            drawPieceOnBoard(currentPiece.shape, ghostRow, currentPiece.col, currentPiece.colorId, 0.2);

            // 当前方块
            drawPieceOnBoard(currentPiece.shape, currentPiece.row, currentPiece.col, currentPiece.colorId, 1);
        }
    }

    function drawPieceOnBoard(shape, row, col, colorId, alpha) {
        boardCtx.globalAlpha = alpha;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const drawR = row + r;
                    const drawC = col + c;
                    if (drawR >= 0 && drawR < ROWS && drawC >= 0 && drawC < COLS) {
                        drawCell(boardCtx, drawC * CELL_SIZE, drawR * CELL_SIZE, CELL_SIZE, COLORS[colorId]);
                    }
                }
            }
        }
        boardCtx.globalAlpha = 1;
    }

    function drawNextPiece() {
        nextCtx.fillStyle = '#1a1a2e';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

        if (!nextPiece) return;
        const shape = nextPiece.shape;
        if (!shape) return;
        const cellSize = 25;
        const offsetX = (nextCanvas.width - shape[0].length * cellSize) / 2;
        const offsetY = (nextCanvas.height - shape.length * cellSize) / 2;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    drawCell(nextCtx, offsetX + c * cellSize, offsetY + r * cellSize, cellSize, COLORS[nextPiece.colorId]);
                }
            }
        }
    }

    function updateUI() {
        scoreEl.textContent = score;
        levelEl.textContent = level;
        linesEl.textContent = totalLines;
    }

    // ========== 游戏逻辑 ==========
    function newGame() {
        board = createBoard(ROWS, COLS);
        score = 0;
        level = 1;
        totalLines = 0;
        softDrop = false;
        currentPiece = spawnPiece(randomType());
        nextPiece = spawnPiece(randomType());
        dropInterval = getDropSpeed();
        dropTimer = 0;
        lastTime = performance.now();
        gameState = 'playing';
        overlay.classList.add('hidden');
        updateUI();
        requestAnimationFrame(gameLoop);
    }

    function lockPiece() {
        board = placePiece(board, currentPiece.shape, currentPiece.row, currentPiece.col, currentPiece.colorId);

        // 消行
        const result = clearLines(board);
        board = result.board;
        const cleared = result.linesCleared;

        if (cleared > 0) {
            score += calculateScore(cleared, level);
            totalLines += cleared;
            level = Math.floor(totalLines / LINES_PER_LEVEL) + 1;
            dropInterval = getDropSpeed();
        }

        // 下一个方块
        currentPiece = nextPiece;
        nextPiece = spawnPiece(randomType());

        // 检查游戏结束
        if (checkCollision(board, currentPiece.shape, currentPiece.row, currentPiece.col)) {
            gameState = 'gameover';
            overlay.classList.remove('hidden');
            overlayText.textContent = '游戏结束\n得分: ' + score + '\n按任意键重新开始';
        }

        updateUI();
    }

    function moveDown() {
        if (!checkCollision(board, currentPiece.shape, currentPiece.row + 1, currentPiece.col)) {
            currentPiece.row++;
            return true;
        }
        return false;
    }

    function moveLeft() {
        if (!checkCollision(board, currentPiece.shape, currentPiece.row, currentPiece.col - 1)) {
            currentPiece.col--;
        }
    }

    function moveRight() {
        if (!checkCollision(board, currentPiece.shape, currentPiece.row, currentPiece.col + 1)) {
            currentPiece.col++;
        }
    }

    function rotate() {
        const newShape = rotateShape(currentPiece.shape);
        if (!newShape) return;

        // 尝试基本旋转
        if (!checkCollision(board, newShape, currentPiece.row, currentPiece.col)) {
            currentPiece.shape = newShape;
            return;
        }

        // 墙踢（wall kick）：尝试左右偏移
        const kicks = [-1, 1, -2, 2];
        for (const kick of kicks) {
            if (!checkCollision(board, newShape, currentPiece.row, currentPiece.col + kick)) {
                currentPiece.shape = newShape;
                currentPiece.col += kick;
                return;
            }
        }
    }

    function hardDrop() {
        while (!checkCollision(board, currentPiece.shape, currentPiece.row + 1, currentPiece.col)) {
            currentPiece.row++;
        }
        lockPiece();
    }

    // ========== 游戏循环 ==========
    function gameLoop(timestamp) {
        if (gameState !== 'playing') return;

        const delta = timestamp - lastTime;
        lastTime = timestamp;
        dropTimer += delta;

        const currentSpeed = softDrop ? SOFT_DROP_SPEED : dropInterval;

        if (dropTimer >= currentSpeed) {
            dropTimer = 0;
            if (!moveDown()) {
                lockPiece();
            }
        }

        drawBoard();
        drawNextPiece();
        requestAnimationFrame(gameLoop);
    }

    // ========== 输入处理 ==========
    document.addEventListener('keydown', function (e) {
        if (gameState === 'idle' || gameState === 'gameover') {
            newGame();
            return;
        }

        if (e.key === 'p' || e.key === 'P') {
            if (gameState === 'playing') {
                gameState = 'paused';
                overlay.classList.remove('hidden');
                overlayText.textContent = '暂停\n按 P 继续';
            } else if (gameState === 'paused') {
                gameState = 'playing';
                overlay.classList.add('hidden');
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
            }
            return;
        }

        if (gameState !== 'playing') return;

        switch (e.key) {
            case 'ArrowLeft':
                moveLeft();
                break;
            case 'ArrowRight':
                moveRight();
                break;
            case 'ArrowDown':
                softDrop = true;
                break;
            case 'ArrowUp':
                rotate();
                break;
            case ' ':
                hardDrop();
                break;
        }
        e.preventDefault();
    });

    document.addEventListener('keyup', function (e) {
        if (e.key === 'ArrowDown') {
            softDrop = false;
        }
    });

    // ========== 初始化 ==========
    gameState = 'idle';
    drawBoard();

})();
