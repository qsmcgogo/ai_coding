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

        // 兜底：如果没检测到 <code-change>，尝试从 markdown 代码块中提取
        if (changes.length === 0) {
            const mdRe = /```(?:javascript|js)?\s*\n([\s\S]*?)```/g;
            let mdMatch;
            while ((mdMatch = mdRe.exec(reply)) !== null) {
                const code = mdMatch[1].trim();
                // 只有代码足够长（像完整文件）且当前文件可编辑时才当作修改
                if (code.length > 200 && activeTabPath) {
                    const file = getFile(activeTabPath);
                    if (file && file.mode === 'editable') {
                        changes.push({ path: activeTabPath, code: code });
                        // 重建 textParts
                        textParts.length = 0;
                        const before = reply.slice(0, mdMatch.index).trim();
                        if (before) textParts.push({ type: 'text', content: before });
                        textParts.push({ type: 'change', index: 0 });
                        const after = reply.slice(mdMatch.index + mdMatch[0].length).trim();
                        if (after) textParts.push({ type: 'text', content: after });
                        break; // 只取第一个大代码块
                    }
                }
            }
        }

        // 检测 <code-edit> 标签（search/replace 模式）
        const CODE_EDIT_RE = /(?:```\s*)?<code-edit\s+path="([^"]+)">\s*\n?([\s\S]*?)<\/code-edit>(?:\s*```)?/g;
        CODE_EDIT_RE.lastIndex = 0;
        let editMatch;
        while ((editMatch = CODE_EDIT_RE.exec(reply)) !== null) {
            const editPath = editMatch[1];
            const editBody = editMatch[2];
            // 解析所有 SEARCH/REPLACE 块
            const blockRe = /<<<< SEARCH\n([\s\S]*?)\n====\n([\s\S]*?)\n>>>> END/g;
            let blockMatch;
            let fileContent = modifiedFiles[editPath] || fileContents[editPath] || '';
            let applied = false;
            while ((blockMatch = blockRe.exec(editBody)) !== null) {
                const search = blockMatch[1];
                const replace = blockMatch[2];
                if (fileContent.includes(search)) {
                    fileContent = fileContent.replace(search, replace);
                    applied = true;
                }
            }
            if (applied) {
                // 转换为 code-change 格式以复用现有的卡片 UI
                if (editMatch.index > lastIndex) {
                    textParts.push({ type: 'text', content: reply.slice(lastIndex, editMatch.index).trim() });
                }
                changes.push({ path: editPath, code: fileContent });
                textParts.push({ type: 'change', index: changes.length - 1 });
                lastIndex = editMatch.index + editMatch[0].length;
            }
        }

        // 处理 code-edit 后面的剩余文本
        if (lastIndex > 0 && lastIndex < reply.length) {
            const remaining = reply.slice(lastIndex).trim();
            if (remaining && !textParts.some(p => p.type === 'text' && p.content === remaining)) {
                textParts.push({ type: 'text', content: remaining });
            }
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

        // 所有可编辑文件的完整内容直接附上
        let editableFiles = '';
        PROJECT_FILES.forEach(f => {
            if (f.mode === 'editable') {
                const content = modifiedFiles[f.path] || fileContents[f.path];
                if (content) {
                    editableFiles += `\n<file path="${f.path}">\n${content}\n</file>`;
                }
            }
        });

        // 当前查看的文件（如果是只读的，给前 200 字预览）
        let currentInfo = '';
        if (activeTabPath) {
            const file = getFile(activeTabPath);
            if (file && file.mode !== 'editable') {
                const content = modifiedFiles[activeTabPath] || fileContents[activeTabPath];
                if (content) {
                    const preview = content.length > 200 ? content.slice(0, 200) + '...' : content;
                    currentInfo = `\n<current-file path="${activeTabPath}" readonly="true">\n${preview}\n</current-file>`;
                }
            } else {
                currentInfo = `\n<current-file path="${activeTabPath}"/>`;
            }
        }

        return `<env>\n<project-files>\n${tree}\n</project-files>${editableFiles}${currentInfo}\n</env>`;
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

            removeThinking();

            // 创建流式消息气泡
            const msgEl = document.createElement('div');
            msgEl.className = 'chat-msg chat-msg-ai';
            const bubbleEl = document.createElement('div');
            bubbleEl.className = 'chat-bubble';
            msgEl.innerHTML = '<div class="chat-avatar">AI</div>';
            msgEl.appendChild(bubbleEl);
            $chatMessages.appendChild(msgEl);

            let fullReply = '';
            let displayedLen = 0;
            const CHAR_DELAY = 15; // 每个字符的显示间隔（毫秒）
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let streamDone = false;

            // 逐字渲染定时器
            let renderTimer = null;
            function tickRender() {
                if (displayedLen < fullReply.length) {
                    // 每次显示一批字符（追赶速度）
                    const batch = Math.min(3, fullReply.length - displayedLen);
                    displayedLen += batch;
                    bubbleEl.textContent = fullReply.slice(0, displayedLen);
                    $chatMessages.scrollTop = $chatMessages.scrollHeight;
                    renderTimer = setTimeout(tickRender, CHAR_DELAY);
                } else {
                    renderTimer = null;
                }
            }

            while (!streamDone) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // 按 SSE 规范解析：消息之间用 \n\n 分隔
                let eventEnd;
                while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
                    const event = buffer.slice(0, eventEnd);
                    buffer = buffer.slice(eventEnd + 2);

                    for (const line of event.split('\n')) {
                        if (!line.startsWith('data: ')) continue;
                        const payload = line.slice(6).trim();
                        if (payload === '[DONE]') { streamDone = true; break; }
                        try {
                            const chunk = JSON.parse(payload);
                            if (chunk.content) {
                                fullReply += chunk.content;
                                // 启动逐字渲染（如果没在跑）
                                if (!renderTimer) tickRender();
                            }
                        } catch (e) { /* skip */ }
                    }
                    if (streamDone) break;
                }
            }

            // 流结束后，等逐字渲染追完
            await new Promise(resolve => {
                function waitRender() {
                    if (displayedLen >= fullReply.length) {
                        if (renderTimer) clearTimeout(renderTimer);
                        resolve();
                    } else {
                        setTimeout(waitRender, 20);
                    }
                }
                waitRender();
            });

            // 流结束后，用完整 markdown 渲染替换纯文本
            const reply = fullReply || '抱歉，我暂时无法回答。';

            // 替换为完整渲染（含 code-change 卡片等）
            msgEl.remove();
            renderAIReply(reply);
            chatHistory.push({ role: 'assistant', content: reply });

        } catch (e) {
            console.error('[callAIAndHandle] 异常:', e);
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
    document.getElementById('btnReset').addEventListener('click', async function () {
        if (!confirm('确定要重置所有代码到初始状态吗？你的修改将丢失。')) return;

        clearStorage();
        modifiedFiles = {};

        // 从服务器重新拉取原始文件内容
        for (const file of PROJECT_FILES) {
            if (file.mode === 'editable') {
                try {
                    const resp = await fetch(`/api/file?problem=${PROBLEM_ID}&path=${encodeURIComponent(file.path)}`);
                    if (resp.ok) {
                        const original = await resp.text();
                        fileContents[file.path] = original;
                        // 更新已打开的 tab
                        const tab = openTabs.find(t => t.path === file.path);
                        if (tab && tab.model) {
                            tab.model.setValue(original);
                        }
                    }
                } catch (e) {
                    console.error('重置文件失败:', file.path, e);
                }
            }
        }

        addChatMessage('ai', '代码已重置为初始状态。');
    });

    // ========== 预览运行 ==========
    $btnPreview.addEventListener('click', async function () {
        const getContent = async (path) => {
            if (modifiedFiles[path]) return modifiedFiles[path];
            if (fileContents[path]) return fileContents[path];
            try {
                const resp = await fetch(`/api/file?problem=${PROBLEM_ID}&path=${encodeURIComponent(path)}`);
                if (resp.ok) return await resp.text();
            } catch (e) {}
            return '';
        };

        // 获取题目的 index.html 作为模板
        let template = await getContent('index.html');
        if (!template) {
            addChatMessage('ai', '预览失败：找不到 index.html');
            return;
        }

        // 将外部 CSS 引用替换为内联 style
        template = template.replace(
            /<link\s+rel="stylesheet"\s+href="([^"]+)"[^>]*>/g,
            function (match, href) {
                // 同步获取已加载的内容（异步已在上面处理）
                return '<style>/* ' + href + ' */</style>';
            }
        );

        // 收集所有 CSS 文件内容
        const cssFiles = PROJECT_FILES.filter(f => f.path.endsWith('.css'));
        let allCss = '';
        for (const f of cssFiles) {
            allCss += await getContent(f.path) + '\n';
        }

        // 收集所有 JS 文件内容（按 index.html 中的 script 标签顺序）
        const scriptOrder = [];
        const scriptRe = /<script\s+src="([^"]+)"[^>]*><\/script>/g;
        let sMatch;
        while ((sMatch = scriptRe.exec(template)) !== null) {
            scriptOrder.push(sMatch[1]);
        }

        let allScripts = '';
        for (const src of scriptOrder) {
            const content = await getContent(src);
            allScripts += '<script>' + content + '<\/script>\n';
        }

        // 替换 link 标签为内联 CSS
        template = template.replace(/<link\s+rel="stylesheet"\s+href="[^"]*"[^>]*>/g, '');
        // 在 </head> 前插入所有 CSS
        template = template.replace('</head>', '<style>\n' + allCss + '\n</style>\n</head>');
        // 替换 script 标签为内联 JS
        template = template.replace(/<script\s+src="[^"]*"[^>]*><\/script>/g, '');
        // 在 </body> 前插入所有 JS
        template = template.replace('</body>', allScripts + '\n</body>');

        const blob = new Blob([template], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank', 'width=600,height=700');
        if (!win) {
            addChatMessage('ai', '弹窗被浏览器拦截，请允许弹窗后重试。');
        }
        setTimeout(() => URL.revokeObjectURL(url), 5000);
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
