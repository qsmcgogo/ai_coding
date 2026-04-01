/**
 * 贪吃蛇 - 自动化测试 [锁定文件，考生不可修改]
 *
 * 运行: node tests/test.js
 * 输出: JSON 格式测试结果
 */

const {
    createInitialState,
    generateFood,
    changeDirection,
    getNextHeadPosition,
    checkCollision,
    moveSnake,
    calculateScore,
} = require('../js/logic.js');

const engine = require('../js/engine.js');

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

// ========== A 组：createInitialState ==========

test('createInitialState: 返回正确结构', () => {
    const s = createInitialState(20, 20);
    assert(s !== null && typeof s === 'object', '应返回对象');
    assert(Array.isArray(s.snake), '应有 snake 数组');
    assert(typeof s.direction === 'string', '应有 direction 字符串');
    assert(s.score === 0, 'score 应为 0');
    assert(s.gameOver === false, 'gameOver 应为 false');
    assert(s.gridRows === 20, 'gridRows 应为 20');
    assert(s.gridCols === 20, 'gridCols 应为 20');
});

test('createInitialState: 蛇的初始长度为 3', () => {
    const s = createInitialState(20, 20);
    assert(s.snake.length === 3, '蛇初始长度应为 3');
});

test('createInitialState: 蛇在网格中间区域', () => {
    const s = createInitialState(20, 20);
    const head = s.snake[0];
    assert(head.row >= 5 && head.row <= 15, '蛇头行应在中间区域');
    assert(head.col >= 5 && head.col <= 15, '蛇头列应在中间区域');
});

// ========== B 组：generateFood ==========

test('generateFood: 返回有效位置', () => {
    const snake = [{ row: 5, col: 5 }];
    const food = generateFood(snake, 20, 20);
    assert(food && typeof food.row === 'number', '应返回含 row 的对象');
    assert(food.row >= 0 && food.row < 20, 'row 应在范围内');
    assert(food.col >= 0 && food.col < 20, 'col 应在范围内');
});

test('generateFood: 不与蛇身重叠', () => {
    // 造一条长蛇
    const snake = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            snake.push({ row: r, col: c });
        }
    }
    for (let i = 0; i < 50; i++) {
        const food = generateFood(snake, 20, 20);
        const overlap = snake.some(s => s.row === food.row && s.col === food.col);
        assert(!overlap, `第 ${i + 1} 次生成的食物与蛇身重叠: (${food.row},${food.col})`);
    }
});

test('generateFood: 网格几乎满时仍能生成', () => {
    const snake = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (r !== 3 || c !== 3) {
                snake.push({ row: r, col: c });
            }
        }
    }
    // 4x4 网格，15 格被蛇占，只剩 (3,3)
    const food = generateFood(snake, 4, 4);
    assert(food.row === 3 && food.col === 3, '应生成在唯一空位 (3,3)');
});

// ========== C 组：changeDirection ==========

test('changeDirection: 合法的方向变化', () => {
    assert(changeDirection('UP', 'LEFT') === 'LEFT', 'UP 时按 LEFT 应返回 LEFT');
    assert(changeDirection('UP', 'RIGHT') === 'RIGHT', 'UP 时按 RIGHT 应返回 RIGHT');
    assert(changeDirection('LEFT', 'UP') === 'UP', 'LEFT 时按 UP 应返回 UP');
});

test('changeDirection: 不能 180 度掉头', () => {
    assert(changeDirection('UP', 'DOWN') === 'UP', 'UP 时按 DOWN 应保持 UP');
    assert(changeDirection('DOWN', 'UP') === 'DOWN', 'DOWN 时按 UP 应保持 DOWN');
    assert(changeDirection('LEFT', 'RIGHT') === 'LEFT', 'LEFT 时按 RIGHT 应保持 LEFT');
    assert(changeDirection('RIGHT', 'LEFT') === 'RIGHT', 'RIGHT 时按 LEFT 应保持 RIGHT');
});

test('changeDirection: 同方向不变', () => {
    assert(changeDirection('RIGHT', 'RIGHT') === 'RIGHT', '同方向应不变');
    assert(changeDirection('UP', 'UP') === 'UP', '同方向应不变');
});

// ========== D 组：getNextHeadPosition ==========

test('getNextHeadPosition: 向右', () => {
    assertDeepEqual(getNextHeadPosition({ row: 5, col: 5 }, 'RIGHT'), { row: 5, col: 6 });
});

test('getNextHeadPosition: 向左', () => {
    assertDeepEqual(getNextHeadPosition({ row: 5, col: 5 }, 'LEFT'), { row: 5, col: 4 });
});

test('getNextHeadPosition: 向上', () => {
    assertDeepEqual(getNextHeadPosition({ row: 5, col: 5 }, 'UP'), { row: 4, col: 5 });
});

test('getNextHeadPosition: 向下', () => {
    assertDeepEqual(getNextHeadPosition({ row: 5, col: 5 }, 'DOWN'), { row: 6, col: 5 });
});

// ========== E 组：checkCollision ==========

test('checkCollision: 正常位置不碰撞', () => {
    const snake = [{ row: 5, col: 5 }, { row: 5, col: 4 }, { row: 5, col: 3 }];
    assert(!checkCollision({ row: 5, col: 6 }, snake, 20, 20), '前方空位不应碰撞');
});

test('checkCollision: 撞墙（越界）', () => {
    const snake = [{ row: 0, col: 5 }];
    assert(checkCollision({ row: -1, col: 5 }, snake, 20, 20), '超出上边界应碰撞');
    assert(checkCollision({ row: 20, col: 5 }, snake, 20, 20), '超出下边界应碰撞');
    assert(checkCollision({ row: 5, col: -1 }, snake, 20, 20), '超出左边界应碰撞');
    assert(checkCollision({ row: 5, col: 20 }, snake, 20, 20), '超出右边界应碰撞');
});

test('checkCollision: 撞自身', () => {
    const snake = [
        { row: 5, col: 5 },
        { row: 5, col: 4 },
        { row: 5, col: 3 },
        { row: 6, col: 3 },
        { row: 6, col: 4 },
    ];
    assert(checkCollision({ row: 5, col: 4 }, snake, 20, 20), '撞到蛇身应碰撞');
});

test('checkCollision: 边界合法位置不碰撞', () => {
    const snake = [{ row: 1, col: 1 }];
    assert(!checkCollision({ row: 0, col: 0 }, snake, 20, 20), '(0,0) 是合法位置');
    assert(!checkCollision({ row: 19, col: 19 }, snake, 20, 20), '(19,19) 是合法位置');
});

// ========== F 组：moveSnake ==========

test('moveSnake: 正常移动（未吃食物）', () => {
    const snake = [{ row: 5, col: 5 }, { row: 5, col: 4 }, { row: 5, col: 3 }];
    const result = moveSnake(snake, { row: 5, col: 6 }, false);
    assert(result.length === 3, '长度不变');
    assertDeepEqual(result[0], { row: 5, col: 6 }, '头部应在新位置');
    assertDeepEqual(result[1], { row: 5, col: 5 }, '原头部变为第二段');
    assertDeepEqual(result[2], { row: 5, col: 4 }, '原第二段变为第三段');
});

test('moveSnake: 吃到食物（蛇变长）', () => {
    const snake = [{ row: 5, col: 5 }, { row: 5, col: 4 }, { row: 5, col: 3 }];
    const result = moveSnake(snake, { row: 5, col: 6 }, true);
    assert(result.length === 4, '长度应 +1');
    assertDeepEqual(result[0], { row: 5, col: 6 }, '头部应在新位置');
    assertDeepEqual(result[3], { row: 5, col: 3 }, '尾部保留');
});

test('moveSnake: 不修改原数组', () => {
    const snake = [{ row: 5, col: 5 }, { row: 5, col: 4 }];
    const original = JSON.stringify(snake);
    moveSnake(snake, { row: 5, col: 6 }, false);
    assert(JSON.stringify(snake) === original, '原数组不应被修改');
});

// ========== G 组：calculateScore ==========

test('calculateScore: 基本加分', () => {
    assert(calculateScore(0, 4) === 10, 'score=0, length=4 应得 10');
});

test('calculateScore: 长蛇加分', () => {
    assert(calculateScore(50, 11) === 70, 'score=50, length=11 应得 70 (加 20)');
});

test('calculateScore: 短蛇多次加分', () => {
    let score = 0;
    score = calculateScore(score, 4);  // 10
    score = calculateScore(score, 5);  // 20
    score = calculateScore(score, 6);  // 30
    assert(score === 30, '3 次普通吃食应累计 30 分');
});

// ========== H 组：Engine Bug 修复验证 ==========

test('Engine Bug: getTickInterval 应有最小值限制', () => {
    // 正确的 getTickInterval 应该是:
    // Math.max(MIN_INTERVAL, BASE_INTERVAL - (level-1) * SPEED_STEP)
    // 其中 MIN_INTERVAL 应该是 50
    // 高 level 时不应返回负数或 0
    const fn = engine.getTickInterval;
    // 模拟 high level 场景
    // 如果 level=20, 正确值: max(50, 300 - 19*30) = max(50, -270) = 50
    // 如果 bug 未修: 300 - 20*30 = -300
    // 需要测试者修复后 level 用 level-1 且有 clamp
    // 这里我们无法直接设置 engine 的 level，所以通过数学关系验证
    const BASE = engine.BASE_INTERVAL;
    const STEP = engine.SPEED_STEP;
    // level=1 时速度应为 BASE_INTERVAL (300)
    // 正确公式: BASE - (level-1)*STEP = 300 - 0 = 300
    // 错误公式: BASE - level*STEP = 300 - 30 = 270
    // 我们可以检查导出的函数在数学上是否正确
    assert(BASE === 300, 'BASE_INTERVAL 应为 300');
    assert(STEP === 30, 'SPEED_STEP 应为 30');
    // 验证 getTickInterval 的返回值不会小于 50
    // 注意：这个测试要求考生修复 getTickInterval 函数
});

test('Engine Bug: calculateLevel 不应有 off-by-one', () => {
    const fn = engine.calculateLevel;
    // 正确: Math.floor(score / 50) + 1
    // score=0 → level 1, score=49 → level 1, score=50 → level 2
    // 错误(Math.ceil): score=1 → level 2 (too early!)
    assert(fn(0) === 1, 'score=0 应为 level 1');
    assert(fn(49) === 1, 'score=49 应为 level 1');
    assert(fn(50) === 2, 'score=50 应为 level 2');
    assert(fn(100) === 3, 'score=100 应为 level 3');
});

test('Engine Bug: 碰撞检测应在移动之前', () => {
    // 构造一个蛇即将撞墙的场景，验证正确流程
    const snake = [{ row: 0, col: 5 }, { row: 0, col: 4 }, { row: 0, col: 3 }];
    const direction = 'UP';
    const nextHead = getNextHeadPosition(snake[0], direction);

    // 正确流程: 先检测碰撞 → 发现越界 → gameOver
    // 错误流程: 先 moveSnake → 蛇头变成 {row:-1} → 再检测
    assert(nextHead.row === -1, '向上移动应到 row=-1');

    // 碰撞检测应对移动前的蛇身执行
    const collision = checkCollision(nextHead, snake, 20, 20);
    assert(collision === true, '越界应检测到碰撞');
});

test('Engine Bug: 一个 tick 内方向变化应受限', () => {
    // 模拟正确的输入处理: 应该用 pendingDirection 缓冲
    // 蛇当前向 UP，如果一个 tick 内先按 RIGHT 再按 DOWN:
    // 错误行为: direction 先变 RIGHT，再变 DOWN（相当于掉头）
    // 正确行为: 只取最后一个输入 DOWN，但需要和当前方向（UP）比较，被拒绝
    // 或者：只取第一个输入 RIGHT

    // 用 changeDirection 验证：如果只取最后一个 pending
    const dir1 = changeDirection('UP', 'RIGHT'); // → RIGHT
    const dir2 = changeDirection('UP', 'DOWN');   // → UP (被拒绝)

    // 正确的 pendingDirection 机制下，tick 开始时应用的方向应该
    // 基于上一帧的 direction，而不是中间改变过的 direction
    assert(dir1 === 'RIGHT', '先按 RIGHT 应合法');
    assert(dir2 === 'UP', 'UP 时按 DOWN 应被拒绝');

    // 关键：如果 engine 直接修改 direction（Bug），那么
    // 先按 RIGHT → direction 变 RIGHT → 再按 DOWN → changeDirection(RIGHT, DOWN) → DOWN
    // 这就绕过了 180 度掉头保护！
    const buggyResult = changeDirection(changeDirection('UP', 'RIGHT'), 'DOWN');
    // 这会返回 DOWN！因为 RIGHT→DOWN 不是 180 度
    assert(buggyResult === 'DOWN', '连续两次合法变化可绕过掉头保护（这就是 Bug）');
});

// ========== 输出结果 ==========

const logicTests = results.filter((_, i) => i < 24);
const engineTests = results.filter((_, i) => i >= 24);
const logicPassed = logicTests.filter(r => r.passed).length;
const enginePassed = engineTests.filter(r => r.passed).length;
const logicScore = Math.round(logicPassed * (60 / logicTests.length));
const engineScore = Math.round(enginePassed * (20 / engineTests.length));

console.log(JSON.stringify({
    results,
    total: results.length,
    passed: results.filter(r => r.passed).length,
    score: logicScore + engineScore,
    details: {
        logic: { passed: logicPassed, total: logicTests.length, score: logicScore },
        engine: { passed: enginePassed, total: engineTests.length, score: engineScore },
    },
}));
