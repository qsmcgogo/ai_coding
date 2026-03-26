/**
 * 俄罗斯方块 - 自动化测试 [锁定文件，考生不可修改]
 *
 * 运行: node tests/test.js
 * 输出: JSON 格式测试结果
 */

const {
    createBoard,
    getPieceShape,
    checkCollision,
    placePiece,
    clearLines,
    calculateScore,
    rotateShape,
} = require('../js/logic.js');

const results = [];

function test(name, fn) {
    try {
        fn();
        results.push({ name, passed: true });
    } catch (e) {
        results.push({ name, passed: false, message: e.message });
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || '断言失败');
}

function assertDeepEqual(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) {
        throw new Error((msg || '不相等') + `\n  期望: ${b}\n  实际: ${a}`);
    }
}

// ========== createBoard ==========

test('createBoard: 创建 20x10 棋盘', () => {
    const board = createBoard(20, 10);
    assert(Array.isArray(board), '应返回数组');
    assert(board.length === 20, '应有 20 行');
    assert(board[0].length === 10, '应有 10 列');
    assert(board[0][0] === 0, '初始值应为 0');
    assert(board[19][9] === 0, '初始值应为 0');
});

test('createBoard: 创建 4x4 棋盘', () => {
    const board = createBoard(4, 4);
    assert(board.length === 4, '应有 4 行');
    assert(board[0].length === 4, '应有 4 列');
});

test('createBoard: 各行独立（修改一行不影响其他行）', () => {
    const board = createBoard(3, 3);
    board[0][0] = 1;
    assert(board[1][0] === 0, '修改第 0 行不应影响第 1 行');
});

// ========== getPieceShape ==========

test('getPieceShape: I 型方块', () => {
    const shape = getPieceShape('I');
    assert(Array.isArray(shape), '应返回数组');
    // I 型应该是 1x4 或 4x1
    const cells = shape.flat().filter(v => v === 1).length;
    assert(cells === 4, 'I 型应有 4 个格子');
});

test('getPieceShape: O 型方块', () => {
    const shape = getPieceShape('O');
    assertDeepEqual(shape, [[1, 1], [1, 1]], 'O 型应为 2x2');
});

test('getPieceShape: T 型方块', () => {
    const shape = getPieceShape('T');
    const cells = shape.flat().filter(v => v === 1).length;
    assert(cells === 4, 'T 型应有 4 个格子');
});

test('getPieceShape: 所有 7 种方块都有效', () => {
    const types = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];
    types.forEach(type => {
        const shape = getPieceShape(type);
        assert(Array.isArray(shape), `${type} 型应返回数组`);
        const cells = shape.flat().filter(v => v === 1).length;
        assert(cells === 4, `${type} 型应有 4 个格子`);
    });
});

// ========== checkCollision ==========

test('checkCollision: 空棋盘无碰撞', () => {
    const board = createBoard(20, 10);
    const shape = [[1, 1], [1, 1]];
    assert(!checkCollision(board, shape, 0, 4), '空棋盘中间位置不应碰撞');
});

test('checkCollision: 超出左边界', () => {
    const board = createBoard(20, 10);
    const shape = [[1, 1], [1, 1]];
    assert(checkCollision(board, shape, 0, -1), '超出左边界应碰撞');
});

test('checkCollision: 超出右边界', () => {
    const board = createBoard(20, 10);
    const shape = [[1, 1], [1, 1]];
    assert(checkCollision(board, shape, 0, 9), '超出右边界应碰撞');
});

test('checkCollision: 超出下边界', () => {
    const board = createBoard(20, 10);
    const shape = [[1, 1], [1, 1]];
    assert(checkCollision(board, shape, 19, 4), '超出下边界应碰撞');
});

test('checkCollision: 与已有方块碰撞', () => {
    const board = createBoard(20, 10);
    board[5][4] = 1;
    const shape = [[1, 1], [1, 1]];
    assert(checkCollision(board, shape, 4, 4), '与已有方块重叠应碰撞');
});

test('checkCollision: 紧邻不碰撞', () => {
    const board = createBoard(20, 10);
    board[5][4] = 1;
    const shape = [[1, 1], [1, 1]];
    assert(!checkCollision(board, shape, 3, 4), '紧邻上方不应碰撞');
});

// ========== placePiece ==========

test('placePiece: 放置方块', () => {
    const board = createBoard(20, 10);
    const shape = [[1, 1], [1, 1]];
    const newBoard = placePiece(board, shape, 18, 4, 2);
    assert(newBoard[18][4] === 2, '(18,4) 应为 2');
    assert(newBoard[18][5] === 2, '(18,5) 应为 2');
    assert(newBoard[19][4] === 2, '(19,4) 应为 2');
    assert(newBoard[19][5] === 2, '(19,5) 应为 2');
});

test('placePiece: 不修改原棋盘', () => {
    const board = createBoard(20, 10);
    placePiece(board, [[1, 1], [1, 1]], 18, 4, 2);
    assert(board[18][4] === 0, '原棋盘不应被修改');
});

// ========== clearLines ==========

test('clearLines: 消除一行', () => {
    const board = createBoard(4, 4);
    // 填满最后一行
    board[3] = [1, 1, 1, 1];
    const result = clearLines(board);
    assert(result.linesCleared === 1, '应消除 1 行');
    assert(result.board[3].every(v => v === 0), '最后一行应变空');
});

test('clearLines: 消除两行', () => {
    const board = createBoard(4, 4);
    board[2] = [1, 1, 1, 1];
    board[3] = [2, 2, 2, 2];
    const result = clearLines(board);
    assert(result.linesCleared === 2, '应消除 2 行');
    assert(result.board[3].every(v => v === 0), '最后一行应变空');
    assert(result.board[2].every(v => v === 0), '倒数第二行应变空');
});

test('clearLines: 不满行不消除', () => {
    const board = createBoard(4, 4);
    board[3] = [1, 0, 1, 1];
    const result = clearLines(board);
    assert(result.linesCleared === 0, '不满行不应消除');
});

test('clearLines: 消除后上方内容下移', () => {
    const board = createBoard(4, 4);
    board[1] = [0, 3, 0, 0]; // 上方有内容
    board[2] = [1, 1, 1, 1]; // 满行
    board[3] = [0, 5, 5, 0]; // 不满行
    const result = clearLines(board);
    assert(result.linesCleared === 1, '应消除 1 行');
    assert(result.board[2][1] === 3, '上方内容应下移一行');
    assert(result.board[3][1] === 5, '下方不满行不受影响');
});

test('clearLines: 不修改原棋盘', () => {
    const board = createBoard(4, 4);
    board[3] = [1, 1, 1, 1];
    clearLines(board);
    assert(board[3][0] === 1, '原棋盘不应被修改');
});

// ========== calculateScore ==========

test('calculateScore: 消 1 行 level 1', () => {
    assert(calculateScore(1, 1) === 100, '1 行 × level 1 = 100');
});

test('calculateScore: 消 2 行 level 1', () => {
    assert(calculateScore(2, 1) === 300, '2 行 × level 1 = 300');
});

test('calculateScore: 消 3 行 level 1', () => {
    assert(calculateScore(3, 1) === 500, '3 行 × level 1 = 500');
});

test('calculateScore: 消 4 行 level 1 (Tetris)', () => {
    assert(calculateScore(4, 1) === 800, '4 行 × level 1 = 800');
});

test('calculateScore: 消 2 行 level 3', () => {
    assert(calculateScore(2, 3) === 900, '2 行 × level 3 = 900');
});

test('calculateScore: 消 0 行', () => {
    assert(calculateScore(0, 5) === 0, '0 行 = 0 分');
});

// ========== rotateShape ==========

test('rotateShape: T 型旋转', () => {
    const shape = [[1, 1, 1], [0, 1, 0]];
    const rotated = rotateShape(shape);
    assert(rotated.length === 3, '旋转后应有 3 行');
    assert(rotated[0].length === 2, '旋转后应有 2 列');
    assertDeepEqual(rotated, [[0, 1], [1, 1], [0, 1]], 'T 型顺时针旋转');
});

test('rotateShape: I 型旋转', () => {
    const shape = [[1, 1, 1, 1]];
    const rotated = rotateShape(shape);
    assert(rotated.length === 4, '旋转后应有 4 行');
    assert(rotated[0].length === 1, '旋转后应有 1 列');
});

test('rotateShape: O 型旋转不变', () => {
    const shape = [[1, 1], [1, 1]];
    const rotated = rotateShape(shape);
    assertDeepEqual(rotated, [[1, 1], [1, 1]], 'O 型旋转后不变');
});

test('rotateShape: 旋转 4 次回到原形', () => {
    const shape = [[1, 1, 1], [0, 1, 0]];
    let s = shape;
    for (let i = 0; i < 4; i++) s = rotateShape(s);
    assertDeepEqual(s, shape, '旋转 4 次应回到原形');
});

// ========== 输出结果 ==========

const total = results.length;
const passed = results.filter(r => r.passed).length;
const scorePerTest = 80 / total;
const score = Math.round(passed * scorePerTest);

console.log(JSON.stringify({
    results,
    total,
    passed,
    score,
}));
