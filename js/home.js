/**
 * Nowcoder AI Coding - 主页逻辑
 */
(function () {
    'use strict';

    // ========== 题目数据 ==========
    const PROBLEMS = [
        {
            id: 'question1',
            number: 'P001',
            title: '俄罗斯方块',
            desc: '在已有的游戏框架中实现核心逻辑：方块下落、行消除、计分系统。考察你拆解需求、理解接口约定和调试的能力。',
            difficulty: 'medium',
            diffLabel: '中等',
            category: 'game',
            tags: ['JavaScript', '游戏逻辑', '前端'],
            time: '90 分钟',
            participants: 342,
            status: 'not-started', // not-started | in-progress | completed
        },
        {
            id: 'question2',
            number: 'P002',
            title: 'Markdown 编辑器',
            desc: '实现一个实时预览的 Markdown 编辑器，支持标题、列表、代码块、表格等常用语法的解析与渲染。',
            difficulty: 'easy',
            diffLabel: '简单',
            category: 'tool',
            tags: ['JavaScript', '文本解析', '前端'],
            time: '60 分钟',
            participants: 528,
            status: 'not-started',
        },
        {
            id: 'question3',
            number: 'P003',
            title: '贪吃蛇 AI',
            desc: '为贪吃蛇游戏实现一个自动寻路 AI，使蛇能在不撞墙、不咬自己的前提下尽可能多地吃到食物。',
            difficulty: 'hard',
            diffLabel: '困难',
            category: 'game',
            tags: ['JavaScript', '算法', 'AI'],
            time: '120 分钟',
            participants: 156,
            status: 'not-started',
        },
        {
            id: 'question4',
            number: 'P004',
            title: '待办事项应用',
            desc: '实现一个功能完整的 Todo App：增删改查、筛选、本地持久化。重点考察前端状态管理和 DOM 操作。',
            difficulty: 'easy',
            diffLabel: '简单',
            category: 'frontend',
            tags: ['JavaScript', 'DOM', '状态管理'],
            time: '60 分钟',
            participants: 891,
            status: 'not-started',
        },
        {
            id: 'question5',
            number: 'P005',
            title: 'JSON 格式化工具',
            desc: '实现 JSON 的解析、格式化、压缩、校验功能，支持语法高亮和错误定位。',
            difficulty: 'medium',
            diffLabel: '中等',
            category: 'tool',
            tags: ['JavaScript', '解析器', '工具'],
            time: '90 分钟',
            participants: 267,
            status: 'not-started',
        },
        {
            id: 'question6',
            number: 'P006',
            title: '2048 游戏',
            desc: '在给定框架中实现 2048 游戏的核心合并逻辑、滑动动画和胜负判定。',
            difficulty: 'medium',
            diffLabel: '中等',
            category: 'game',
            tags: ['JavaScript', '游戏逻辑', '动画'],
            time: '90 分钟',
            participants: 413,
            status: 'not-started',
        },
    ];

    // ========== 渲染题目卡片 ==========
    const $grid = document.getElementById('problemGrid');

    function renderProblems(filter) {
        const list = filter === 'all'
            ? PROBLEMS
            : PROBLEMS.filter(p => p.category === filter);

        $grid.innerHTML = list.map(p => `
            <div class="problem-card" data-id="${p.id}" data-category="${p.category}">
                <div class="card-top">
                    <span class="card-number">${p.number}</span>
                    <span class="card-difficulty diff-${p.difficulty}">${p.diffLabel}</span>
                </div>
                <div class="card-title">${p.title}</div>
                <div class="card-desc">${p.desc}</div>
                <div class="card-tags">
                    ${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
                <div class="card-footer">
                    <div class="card-meta">
                        <span><span class="status-dot status-${p.status}"></span>${statusText(p.status)}</span>
                        <span>⏱ ${p.time}</span>
                        <span>${p.participants} 人参与</span>
                    </div>
                    <div class="card-action">开始挑战 →</div>
                </div>
            </div>
        `).join('');

        // 绑定点击事件
        $grid.querySelectorAll('.problem-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                window.location.href = `exam.html?problem=${id}`;
            });
        });
    }

    function statusText(s) {
        switch (s) {
            case 'completed': return '已完成';
            case 'in-progress': return '进行中';
            default: return '未开始';
        }
    }

    // ========== 筛选 ==========
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProblems(btn.dataset.filter);
        });
    });

    // ========== 数字滚动动画 ==========
    function animateNumbers() {
        document.querySelectorAll('.stat-number').forEach(el => {
            const target = parseInt(el.dataset.target);
            const duration = 1200;
            const start = performance.now();

            function tick(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                // easeOutExpo
                const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                el.textContent = Math.round(target * ease);
                if (progress < 1) requestAnimationFrame(tick);
            }

            requestAnimationFrame(tick);
        });
    }

    // ========== 粒子背景 ==========
    function initParticles() {
        const canvas = document.getElementById('particles');
        const ctx = canvas.getContext('2d');
        let w, h;
        const particles = [];
        const PARTICLE_COUNT = 60;

        function resize() {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        }

        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.3 + 0.05,
            });
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);

            // 绘制粒子
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(108, 92, 231, ${p.alpha})`;
                ctx.fill();
            });

            // 绘制连线
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(108, 92, 231, ${0.06 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            // 更新位置
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
            });

            requestAnimationFrame(draw);
        }

        draw();
    }

    // ========== 启动 ==========
    renderProblems('all');
    animateNumbers();
    initParticles();

})();
