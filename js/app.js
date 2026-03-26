/**
 * AI Coding 考试平台 - 主应用逻辑
 */
(function () {
    'use strict';

    // ========== 从 URL 获取题目 ID ==========
    const urlParams = new URLSearchParams(window.location.search);
    const PROBLEM_ID = urlParams.get('problem') || 'question1';

    // ========== 题目文件结构（从服务器加载） ==========
    let PROJECT_FILES = [];

    // 文件图标（纯符号，不显示类型文字）
    const FILE_ICONS = {
        folder: '📁',
        js: '📄',
        css: '📄',
        html: '📄',
        md: '📄',
        py: '📄',
        default: '📄',
    };

    // Monaco Editor 语言映射
    const LANG_MAP = {
        js: 'javascript',
        css: 'css',
        html: 'html',
        md: 'markdown',
        py: 'python',
    };

    // ========== 状态 ==========
    let monacoEditor = null;
    let openTabs = [];        // [{ path, model }]
    let activeTabPath = null;
    let fileContents = {};    // path -> content string
    let modifiedFiles = {};   // path -> modified content

    // ========== localStorage 缓存 ==========
    const STORAGE_KEY = 'ai_coding_' + PROBLEM_ID;

    function saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(modifiedFiles));
        } catch (e) { /* 忽略 */ }
    }

    function loadFromStorage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                modifiedFiles = JSON.parse(saved);
            }
        } catch (e) { /* 忽略 */ }
    }

    function clearStorage() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // ========== DOM ==========
    const $fileTree = document.getElementById('fileTree');
    const $tabBar = document.getElementById('tabBar');
    const $editorContainer = document.getElementById('editorContainer');
    const $markdownView = document.getElementById('markdownView');
    const $previewFrame = document.getElementById('previewFrame');
    const $chatMessages = document.getElementById('chatMessages');
    const $chatInput = document.getElementById('chatInput');
    const $btnSend = document.getElementById('btnSend');
    const $btnTest = document.getElementById('btnTest');
    const $btnPreview = document.getElementById('btnPreview');
    const $btnSubmit = document.getElementById('btnSubmit');
    const $testPanel = document.getElementById('testPanel');
    const $testPanelBody = document.getElementById('testPanelBody');
    const $testPanelClose = document.getElementById('testPanelClose');
    const $timer = document.getElementById('timer');

    // ========== 初始化 Monaco Editor ==========
    function loadMonaco(callback) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
        script.onload = function () {
            require.config({
                paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
            });
            require(['vs/editor/editor.main'], function () {
                monaco.editor.defineTheme('exam-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                        'editor.background': '#1e1e1e',
                    }
                });
                monacoEditor = monaco.editor.create($editorContainer, {
                    theme: 'exam-dark',
                    fontSize: 14,
                    fontFamily: "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    wordWrap: 'off',
                    lineNumbers: 'on',
                    renderWhitespace: 'selection',
                    bracketPairColorization: { enabled: true },
                });

                // 监听内容变化，自动保存到 localStorage
                monacoEditor.onDidChangeModelContent(function () {
                    if (activeTabPath) {
                        const file = getFile(activeTabPath);
                        if (file && file.mode === 'editable') {
                            modifiedFiles[activeTabPath] = monacoEditor.getValue();
                            saveToStorage();
                        }
                    }
                });

                callback();
            });
        };
        document.head.appendChild(script);
    }

    // ========== 文件操作 ==========
    function getFile(path) {
        return PROJECT_FILES.find(f => f.path === path);
    }

    async function fetchFileContent(path) {
        if (fileContents[path] !== undefined) return fileContents[path];
        try {
            const resp = await fetch('/api/file?problem=' + encodeURIComponent(PROBLEM_ID) + '&path=' + encodeURIComponent(path));
            if (resp.ok) {
                const text = await resp.text();
                fileContents[path] = text;
                return text;
            }
        } catch (e) {
            // 忽略
        }
        fileContents[path] = '// 文件加载失败';
        return fileContents[path];
    }

    async function loadProblemManifest() {
        try {
            const resp = await fetch('/api/manifest?problem=' + encodeURIComponent(PROBLEM_ID));
            if (resp.ok) {
                const data = await resp.json();
                PROJECT_FILES = data.files || [];
                document.getElementById('problemTitle').textContent = data.title || PROBLEM_ID;
                document.title = (data.title || 'AI Coding') + ' - Nowcoder AI Coding';
            }
        } catch (e) {
            document.getElementById('problemTitle').textContent = '加载失败';
        }
    }

    // ========== 文件树 ==========
    function buildFileTree() {
        // 构建树结构
        const tree = {};
        PROJECT_FILES.forEach(file => {
            const parts = file.path.split('/');
            let node = tree;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!node[parts[i]]) node[parts[i]] = {};
                node = node[parts[i]];
            }
            node[parts[parts.length - 1]] = file;
        });

        $fileTree.innerHTML = '';
        renderTree(tree, $fileTree, 0, '');
    }

    function renderTree(node, container, depth, prefix) {
        // 先渲染文件夹，再渲染文件
        const folders = [];
        const files = [];

        Object.keys(node).forEach(key => {
            if (node[key].path !== undefined) {
                files.push({ name: key, data: node[key] });
            } else {
                folders.push({ name: key, children: node[key] });
            }
        });

        folders.forEach(folder => {
            const item = document.createElement('div');
            item.className = 'tree-item';
            item.innerHTML = `
                <span class="indent" style="width:${depth * 16}px"></span>
                <span class="icon icon-folder">${FILE_ICONS.folder}</span>
                <span class="filename">${folder.name}/</span>
            `;
            container.appendChild(item);

            const subContainer = document.createElement('div');
            container.appendChild(subContainer);

            let expanded = true;
            item.addEventListener('click', () => {
                expanded = !expanded;
                subContainer.style.display = expanded ? '' : 'none';
            });

            renderTree(folder.children, subContainer, depth + 1, prefix + folder.name + '/');
        });

        files.forEach(file => {
            const f = file.data;
            const item = document.createElement('div');
            const isEditable = f.mode === 'editable';
            item.className = 'tree-item' + (isEditable ? ' editable' : '');
            item.dataset.path = f.path;

            const badge = isEditable
                ? '<span class="badge badge-editable">可编辑</span>'
                : '<span class="badge badge-locked">🔒</span>';

            item.innerHTML = `
                <span class="indent" style="width:${depth * 16}px"></span>
                <span class="icon icon-file">📄</span>
                <span class="filename">${file.name}</span>
                ${badge}
            `;

            item.addEventListener('click', () => openFile(f.path));
            container.appendChild(item);
        });
    }

    // ========== 标签页 ==========
    function renderTabs() {
        $tabBar.innerHTML = '';
        openTabs.forEach(tab => {
            const el = document.createElement('div');
            el.className = 'tab' + (tab.path === activeTabPath ? ' active' : '');

            const file = getFile(tab.path);
            const name = tab.path.split('/').pop();
            el.innerHTML = `
                <span>${name}</span>
                <span class="tab-close">×</span>
            `;

            el.querySelector('.tab-close').addEventListener('click', (e) => {
                e.stopPropagation();
                closeTab(tab.path);
            });

            el.addEventListener('click', () => switchTab(tab.path));
            $tabBar.appendChild(el);
        });
    }

    async function openFile(path) {
        // 已打开则切换
        let tab = openTabs.find(t => t.path === path);
        if (!tab) {
            const content = modifiedFiles[path] || await fetchFileContent(path);
            const file = getFile(path);
            const lang = LANG_MAP[file.type] || 'plaintext';

            let model = null;
            if (file.type !== 'md') {
                model = monaco.editor.createModel(content, lang);
            }

            tab = { path, model };
            openTabs.push(tab);
        }

        switchTab(path);
    }

    function switchTab(path) {
        activeTabPath = path;
        const tab = openTabs.find(t => t.path === path);
        const file = getFile(path);

        // 更新文件树高亮
        document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
        const treeItem = document.querySelector(`.tree-item[data-path="${path}"]`);
        if (treeItem) treeItem.classList.add('active');

        if (file.type === 'md') {
            // Markdown 渲染
            $editorContainer.classList.add('hidden');
            $previewFrame.classList.add('hidden');
            $markdownView.classList.remove('hidden');
            const content = modifiedFiles[path] || fileContents[path] || '';
            $markdownView.innerHTML = renderMarkdown(content);
        } else {
            // 代码编辑
            $markdownView.classList.add('hidden');
            $previewFrame.classList.add('hidden');
            $editorContainer.classList.remove('hidden');

            if (tab.model) {
                monacoEditor.setModel(tab.model);
            }

            // 只读控制
            monacoEditor.updateOptions({
                readOnly: file.mode === 'locked'
            });
        }

        renderTabs();
    }

    function closeTab(path) {
        const idx = openTabs.findIndex(t => t.path === path);
        if (idx === -1) return;

        const tab = openTabs[idx];
        if (tab.model) tab.model.dispose();
        openTabs.splice(idx, 1);

        if (activeTabPath === path) {
            if (openTabs.length > 0) {
                const newIdx = Math.min(idx, openTabs.length - 1);
                switchTab(openTabs[newIdx].path);
            } else {
                activeTabPath = null;
                $editorContainer.classList.add('hidden');
                $markdownView.classList.add('hidden');
            }
        }

        renderTabs();
    }

    // ========== 简易 Markdown 渲染 ==========
    function renderMarkdown(md) {
        let html = md
            // code blocks
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            // inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // headings
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // tables
            .replace(/^\|(.+)\|$/gm, function (match) {
                const cells = match.split('|').filter(c => c.trim());
                if (cells.every(c => /^[\s-:]+$/.test(c))) return '<!--sep-->';
                return '<tr>' + cells.map(c => '<td>' + c.trim() + '</td>').join('') + '</tr>';
            })
            // wrap tables
            .replace(/((<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>')
            .replace(/<!--sep-->\n?/g, '')
            // lists
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
            // numbered lists
            .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
            // paragraphs
            .replace(/^(?!<[hultiop])((?!<).+)$/gm, '<p>$1</p>')
            // clean up
            .replace(/<\/table>\n<p><\/p>/g, '</table>');

        return html;
    }

    // ========== AI 聊天 ==========
    const chatHistory = []; // { role: 'user'|'assistant', content: '' }
    const MAX_HISTORY = 10; // 保留最近 10 条
    const MAX_MSG_LEN = 50; // 历史消息超过此字数则截断

    function addChatMessage(role, text) {
        const msg = document.createElement('div');
        msg.className = 'chat-msg chat-msg-' + role;
        msg.innerHTML = `
            <div class="chat-avatar">${role === 'ai' ? 'AI' : '我'}</div>
            <div class="chat-bubble">${escapeHtml(text)}</div>
        `;
        $chatMessages.appendChild(msg);
        $chatMessages.scrollTop = $chatMessages.scrollHeight;
        return msg;
    }

    // ========== 代码修改解析与确认 ==========
    // 兼容多种格式：```<code-change>、markdown代码块包裹的、缺少<的等
    const CODE_CHANGE_RE = /(?:```\s*)?<code-change\s+path="([^"]+)">\s*\n?([\s\S]*?)<\/code-change>(?:\s*```)?/g;

    function parseCodeChanges(reply) {
        // 返回 { textParts: [], changes: [{path, code}] }
        const changes = [];
        let lastIndex = 0;
        const textParts = [];
        let match;

        CODE_CHANGE_RE.lastIndex = 0;
        while ((match = CODE_CHANGE_RE.exec(reply)) !== null) {
            // match 前面的文本
            if (match.index > lastIndex) {
                textParts.push({ type: 'text', content: reply.slice(lastIndex, match.index).trim() });
            }
            changes.push({ path: match[1], code: match[2].trim() });
            textParts.push({ type: 'change', index: changes.length - 1 });
            lastIndex = match.index + match[0].length;
        }

        // 末尾文本
        if (lastIndex < reply.length) {
            const tail = reply.slice(lastIndex).trim();
            if (tail) textParts.push({ type: 'text', content: tail });
        }

        return { textParts, changes };
    }

    function renderAIReply(reply) {
        const { textParts, changes } = parseCodeChanges(reply);

        // 没有代码修改，普通显示
        if (changes.length === 0) {
            addChatMessage('ai', reply);
            return;
        }

        // 有代码修改，分段渲染
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-msg chat-msg-ai';

        let html = '<div class="chat-avatar">AI</div><div class="chat-bubble">';

        textParts.forEach(part => {
            if (part.type === 'text') {
                html += escapeHtml(part.content) + '<br>';
            } else {
                const change = changes[part.index];
                html += `
                    <div class="code-change-card" data-change-index="${part.index}">
                        <div class="code-change-header">
                            <span class="code-change-file">📄 修改文件: ${escapeHtml(change.path)}</span>
                        </div>
                        <pre class="code-change-preview">${escapeHtml(change.code.length > 300 ? change.code.slice(0, 300) + '\n...' : change.code)}</pre>
                        <div class="code-change-actions">
                            <button class="btn btn-primary btn-accept" data-idx="${part.index}">✓ 接受修改</button>
                            <button class="btn btn-secondary btn-reject" data-idx="${part.index}">✗ 拒绝</button>
                        </div>
                    </div>
                `;
            }
        });

        html += '</div>';
        wrapper.innerHTML = html;

        // 绑定按钮事件
        wrapper.querySelectorAll('.btn-accept').forEach(btn => {
            btn.addEventListener('click', function () {
                const idx = parseInt(this.dataset.idx);
                applyCodeChange(changes[idx], this.closest('.code-change-card'));
            });
        });

        wrapper.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', function () {
                const idx = parseInt(this.dataset.idx);
                rejectCodeChange(changes[idx], this.closest('.code-change-card'));
            });
        });

        $chatMessages.appendChild(wrapper);
        $chatMessages.scrollTop = $chatMessages.scrollHeight;
    }

    function applyCodeChange(change, cardEl) {
        const file = getFile(change.path);
        if (!file) {
            cardEl.querySelector('.code-change-actions').innerHTML =
                '<span class="test-fail">文件不存在: ' + escapeHtml(change.path) + '</span>';
            return;
        }
        if (file.mode !== 'editable') {
            cardEl.querySelector('.code-change-actions').innerHTML =
                '<span class="test-fail">该文件为只读，无法修改</span>';
            return;
        }

        // 写入内容
        modifiedFiles[change.path] = change.code;
        saveToStorage();

        // 如果该文件已在编辑器打开，更新 model
        const tab = openTabs.find(t => t.path === change.path);
        if (tab && tab.model) {
            tab.model.setValue(change.code);
        }

        // 更新卡片状态
        cardEl.querySelector('.code-change-actions').innerHTML =
            '<span class="test-pass">✓ 已应用到 ' + escapeHtml(change.path) + '</span>';
    }

    function rejectCodeChange(change, cardEl) {
        // 把代码贴到输入框
        $chatInput.value = change.code;
        $chatInput.focus();

        cardEl.querySelector('.code-change-actions').innerHTML =
            '<span style="color:var(--text-secondary);">已拒绝，代码已复制到输入框</span>';
    }

    function addThinking() {
        const msg = document.createElement('div');
        msg.className = 'chat-msg chat-msg-ai';
        msg.id = 'thinkingMsg';
        msg.innerHTML = `
            <div class="chat-avatar">AI</div>
            <div class="chat-bubble thinking-bubble">
                <span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span> 思考中
            </div>
        `;
        $chatMessages.appendChild(msg);
        $chatMessages.scrollTop = $chatMessages.scrollHeight;
        return msg;
    }

    function removeThinking() {
        const el = document.getElementById('thinkingMsg');
        if (el) el.remove();
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function buildContextMessage() {
        const tree = PROJECT_FILES.map(f => {
            const tag = f.mode === 'editable' ? ' [可编辑]' : '';
            return '  ' + f.path + tag;
        }).join('\n');

        let fileInfo = '';
        if (activeTabPath) {
            const file = getFile(activeTabPath);
            fileInfo = `<current-file path="${activeTabPath}" editable="${file && file.mode === 'editable'}">`;
            if (file && file.mode === 'editable') {
                const content = modifiedFiles[activeTabPath] || fileContents[activeTabPath];
                if (content) {
                    const preview = content.length > 100 ? content.slice(0, 100) + '...' : content;
                    fileInfo += `\n${preview}\n`;
                }
            }
            fileInfo += '</current-file>';
        }

        return `<env>\n<project-files>\n${tree}\n</project-files>\n${fileInfo}\n</env>`;
    }

    // ========== @文件 解析 ==========
    const AT_FILE_RE = /@([\w.\/\-]+)/g;

    function expandAtFiles(text) {
        // 把 @js/logic.js 替换为完整文件内容
        let expanded = text;
        const attachments = [];
        let match;
        AT_FILE_RE.lastIndex = 0;
        while ((match = AT_FILE_RE.exec(text)) !== null) {
            const path = match[1];
            const content = modifiedFiles[path] || fileContents[path];
            if (content) {
                attachments.push(`[文件: ${path}]\n${content}`);
            }
        }
        if (attachments.length > 0) {
            expanded += '\n\n' + attachments.join('\n\n');
        }
        return expanded;
    }

    // ========== <read-file> 检测 ==========
    const READ_FILE_RE = /<read-file\s+path="([^"]+)"\s*\/>/g;

    function detectReadFileRequests(reply) {
        const requests = [];
        let match;
        READ_FILE_RE.lastIndex = 0;
        while ((match = READ_FILE_RE.exec(reply)) !== null) {
            requests.push(match[1]);
        }
        return requests;
    }

    function buildFileContent(paths) {
        // 构造文件内容消息
        const parts = paths.map(p => {
            const content = modifiedFiles[p] || fileContents[p];
            if (content) return `[文件: ${p}]\n${content}`;
            return `[文件: ${p}] (不存在)`;
        });
        return parts.join('\n\n');
    }

    // ========== 发送消息 ==========
    async function sendMessage() {
        const text = $chatInput.value.trim();
        if (!text) return;

        addChatMessage('user', text);
        $chatInput.value = '';

        // 展开 @文件引用，记录到历史
        const expandedText = expandAtFiles(text);
        chatHistory.push({ role: 'user', content: expandedText });

        while (chatHistory.length > MAX_HISTORY) chatHistory.shift();

        addThinking();
        await callAIAndHandle();
    }

    async function callAIAndHandle() {
        const trimmedHistory = chatHistory.map((msg, i) => {
            if (i === chatHistory.length - 1) return msg;
            if (msg.content.length > MAX_MSG_LEN) {
                return { role: msg.role, content: msg.content.slice(0, MAX_MSG_LEN) + '...' };
            }
            return msg;
        });

        const apiMessages = [
            { role: 'system', content: buildContextMessage() },
            ...trimmedHistory,
        ];

        try {
            const resp = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    problem: PROBLEM_ID,
                }),
            });

            if (!resp.ok) {
                removeThinking();
                addChatMessage('ai', '服务暂时不可用，请稍后重试。');
                return;
            }

            const data = await resp.json();
            const reply = data.reply || '抱歉，我暂时无法回答。';

            // 检测 AI 是否请求读取文件
            const readRequests = detectReadFileRequests(reply);
            if (readRequests.length > 0) {
                // AI 需要看文件，自动补充内容再请求一次
                const fileMsg = buildFileContent(readRequests);
                chatHistory.push({ role: 'assistant', content: reply });
                chatHistory.push({ role: 'user', content: '[系统自动提供文件内容]\n' + fileMsg });

                // 再调一次 AI
                await callAIAndHandle();
                return;
            }

            removeThinking();
            renderAIReply(reply);
            chatHistory.push({ role: 'assistant', content: reply });

        } catch (e) {
            removeThinking();
            addChatMessage('ai', '网络连接失败，请检查服务是否启动。');
        }
    }

    $btnSend.addEventListener('click', sendMessage);
    $chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // ========== 运行测试 ==========
    $btnTest.addEventListener('click', async function () {
        $testPanel.classList.remove('hidden');
        $testPanelBody.innerHTML = '<div class="test-running">正在运行测试...</div>';

        try {
            const resp = await fetch('/api/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ problem: PROBLEM_ID, files: modifiedFiles }),
            });
            if (resp.ok) {
                const data = await resp.json();
                renderTestResults(data);
            } else {
                $testPanelBody.innerHTML = '<div class="test-fail">测试服务异常，请稍后重试。</div>';
            }
        } catch (e) {
            $testPanelBody.innerHTML = '<div class="test-fail">网络连接失败，请检查服务是否启动。</div>';
        }
    });

    $testPanelClose.addEventListener('click', function () {
        $testPanel.classList.add('hidden');
    });

    function renderTestResults(data) {
        const results = data.results || [];
        const total = results.length;
        const passed = results.filter(r => r.passed).length;

        let html = '';
        results.forEach((r, i) => {
            const icon = r.passed ? '✓' : '✗';
            const cls = r.passed ? 'test-pass' : 'test-fail';
            html += `<div class="test-item ${cls}">${icon} ${r.name}`;
            if (!r.passed && r.message) {
                html += `<div style="padding-left:20px;color:#888;font-size:12px;">${escapeHtml(r.message)}</div>`;
            }
            html += `</div>`;
        });

        html += `<div class="test-summary ${passed === total ? 'test-pass' : 'test-fail'}">`;
        html += `通过 ${passed}/${total} 项测试`;
        if (data.score !== undefined) {
            html += ` — 得分: ${data.score}`;
        }
        html += `</div>`;

        $testPanelBody.innerHTML = html;
    }

    // ========== 重置代码 ==========
    document.getElementById('btnReset').addEventListener('click', function () {
        if (!confirm('确定要重置所有代码到初始状态吗？你的修改将丢失。')) return;

        clearStorage();
        modifiedFiles = {};

        // 重新加载所有已打开的可编辑文件的 model 内容
        openTabs.forEach(tab => {
            const file = getFile(tab.path);
            if (file && file.mode === 'editable' && tab.model) {
                const original = fileContents[tab.path] || '';
                tab.model.setValue(original);
            }
        });

        addChatMessage('ai', '代码已重置为初始状态。');
    });

    // ========== 预览运行 ==========
    $btnPreview.addEventListener('click', function () {
        // TODO: 组装项目文件，在 iframe 中运行
        addChatMessage('ai', '预览功能开发中...');
    });

    // ========== 提交评测 ==========
    $btnSubmit.addEventListener('click', async function () {
        addChatMessage('ai', '正在提交评测...');
        try {
            const resp = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ problem: PROBLEM_ID, files: modifiedFiles }),
            });
            if (resp.ok) {
                const result = await resp.json();
                addChatMessage('ai', '评测结果：\n' + JSON.stringify(result, null, 2));
            } else {
                addChatMessage('ai', '提交失败，请稍后重试。');
            }
        } catch (e) {
            addChatMessage('ai', '网络连接失败。');
        }
    });

    // ========== 倒计时 ==========
    let remainingSeconds = 90 * 60; // 1.5 小时
    function updateTimer() {
        const h = Math.floor(remainingSeconds / 3600);
        const m = Math.floor((remainingSeconds % 3600) / 60);
        const s = remainingSeconds % 60;
        $timer.textContent =
            String(h).padStart(2, '0') + ':' +
            String(m).padStart(2, '0') + ':' +
            String(s).padStart(2, '0');

        if (remainingSeconds <= 300) {
            $timer.style.color = '#f44747';
        }

        if (remainingSeconds > 0) {
            remainingSeconds--;
        }
    }

    setInterval(updateTimer, 1000);
    updateTimer();

    // ========== 拖拽分割线 ==========
    function setupDivider(dividerId, leftPanelId, rightPanelId, minLeft, minRight) {
        const divider = document.getElementById(dividerId);
        const leftPanel = document.getElementById(leftPanelId);
        const rightPanel = document.getElementById(rightPanelId);

        let startX, startLeftWidth;

        divider.addEventListener('mousedown', function (e) {
            startX = e.clientX;
            startLeftWidth = leftPanel.getBoundingClientRect().width;
            divider.classList.add('active');

            function onMouseMove(e) {
                const delta = e.clientX - startX;
                const newWidth = Math.max(minLeft, startLeftWidth + delta);
                leftPanel.style.width = newWidth + 'px';
                // 触发 Monaco 重新布局
                if (monacoEditor) monacoEditor.layout();
            }

            function onMouseUp() {
                divider.classList.remove('active');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    setupDivider('dividerLeft', 'panelLeft', 'panelCenter', 150, 300);
    setupDivider('dividerRight', 'panelCenter', 'panelRight', 300, 200);

    // 右侧分割线需要反向逻辑
    (function () {
        const divider = document.getElementById('dividerRight');
        const panel = document.getElementById('panelRight');
        let startX, startWidth;

        // 覆盖上面的逻辑
        divider.onmousedown = null;
        divider.addEventListener('mousedown', function (e) {
            startX = e.clientX;
            startWidth = panel.getBoundingClientRect().width;
            divider.classList.add('active');

            function onMouseMove(e) {
                const delta = startX - e.clientX;
                const newWidth = Math.max(200, startWidth + delta);
                panel.style.width = newWidth + 'px';
                if (monacoEditor) monacoEditor.layout();
            }

            function onMouseUp() {
                divider.classList.remove('active');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    })();

    // ========== 启动 ==========
    loadMonaco(async function () {
        await loadProblemManifest();
        loadFromStorage();
        buildFileTree();
        // 默认打开 README.md
        await openFile('README.md');
    });

})();
