/**
 * 俄罗斯方块 - 游戏逻辑（考生实现文件）
 *
 * 请实现以下所有函数。
 * 不要修改函数签名，引擎会通过这些接口调用你的实现。
 */

/**
 * 创建空棋盘
 * @param {number} rows - 行数（默认 20）
 * @param {number} cols - 列数（默认 10）
 * @returns {number[][]} rows x cols 的二维数组，每个元素为 0（表示空）
 */
function createBoard(rows, cols) {
    // TODO: 实现
}

/**
 * 获取方块形状
 *
 * 7 种标准俄罗斯方块：
 *   I: 长条     O: 方块     T: T型
 *   S: S型      Z: Z型      L: L型      J: J型
 *
 * 用二维数组表示，1 表示有方块，0 表示空。示例：
 *   T 型 = [[1,1,1],
 *           [0,1,0]]
 *
 * @param {string} type - 方块类型，取值: 'I','O','T','S','Z','L','J'
 * @returns {number[][]} 方块形状矩阵
 */
function getPieceShape(type) {
    // TODO: 实现
}

/**
 * 碰撞检测
 *
 * 检查将 shape 放置在棋盘 (row, col) 位置是否会发生碰撞。
 * 碰撞条件：shape 中值为 1 的格子对应的棋盘位置越界或已被占用。
 *
 * @param {number[][]} board - 棋盘
 * @param {number[][]} shape - 方块形状
 * @param {number} row - 方块左上角所在行（可为负数，表示方块部分在棋盘上方）
 * @param {number} col - 方块左上角所在列
 * @returns {boolean} true 表示发生碰撞
 */
function checkCollision(board, shape, row, col) {
    // TODO: 实现
}

/**
 * 将方块固定到棋盘
 *
 * 在 shape 中值为 1 的位置，将 colorId 写入棋盘对应位置。
 * 返回一个新的棋盘（不修改原棋盘）。
 *
 * @param {number[][]} board - 棋盘
 * @param {number[][]} shape - 方块形状
 * @param {number} row - 方块左上角所在行
 * @param {number} col - 方块左上角所在列
 * @param {number} colorId - 颜色编号（1-7）
 * @returns {number[][]} 放置方块后的新棋盘
 */
function placePiece(board, shape, row, col, colorId) {
    // TODO: 实现
}

/**
 * 消除满行
 *
 * 检查棋盘中所有行，将被完全填满的行移除，
 * 在棋盘顶部补充等量的空行。
 *
 * @param {number[][]} board - 棋盘
 * @returns {{ board: number[][], linesCleared: number }}
 *   board: 消除后的新棋盘
 *   linesCleared: 被消除的行数
 */
function clearLines(board) {
    // TODO: 实现
}

/**
 * 计算得分
 *
 * 计分规则（经典 NES 俄罗斯方块）：
 *   1 行: 100 × level
 *   2 行: 300 × level
 *   3 行: 500 × level
 *   4 行: 800 × level（Tetris！）
 *   0 行: 0 分
 *
 * @param {number} linesCleared - 本次消除行数（0-4）
 * @param {number} level - 当前等级（从 1 开始）
 * @returns {number} 本次获得的分数
 */
function calculateScore(linesCleared, level) {
    // TODO: 实现
}

/**
 * 顺时针旋转方块 90 度
 *
 * 例：
 *   输入: [[1,1,1],    输出: [[0,1],
 *          [0,1,0]]           [1,1],
 *                             [0,1]]
 *
 * @param {number[][]} shape - 方块形状
 * @returns {number[][]} 旋转后的新形状
 */
function rotateShape(shape) {
    // TODO: 实现
}

// 导出（兼容浏览器和 Node.js）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createBoard,
        getPieceShape,
        checkCollision,
        placePiece,
        clearLines,
        calculateScore,
        rotateShape
    };
}
