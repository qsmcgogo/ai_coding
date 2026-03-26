# Nowcoder AI Coding — AI 编程能力在线测评平台

## 项目简介

考察开发者与 AI 协作完成工程任务的能力。不同于传统 OJ 的算法题模式，本平台以**真实工程项目**为载体，考生在内置 AI 助手的 Web IDE 中完成指定功能实现，通过自动化测试评分。

## 核心功能

- **三栏 IDE 环境**：左侧项目文件树（锁定/可编辑标识）、中间 Monaco 代码编辑器、右侧 AI 对话助手
- **工程题库**：每道题是一个真实项目骨架，考生在约定接口上实现功能，测试用例自动评分
- **AI 助手**：内置大模型对话，可帮助理解题意、调试代码（限制不直接给完整实现）
- **在线测试**：一键运行测试，结果实时展示在底部面板
- **代码持久化**：基于 localStorage 的浏览器缓存，关闭页面后可继续做题
- **重置代码**：一键恢复初始状态

## 快速开始

```bash
pip install requests
python server.py
```

浏览器打开 http://localhost:8080

## 目录结构

```
ai_coding/
├── index.html              # 主页（题库列表）
├── exam.html               # 考试页（IDE 环境）
├── css/
│   ├── home.css            # 主页样式
│   └── main.css            # 考试页样式
├── js/
│   ├── home.js             # 主页逻辑（题目卡片、粒子背景）
│   └── app.js              # 考试页逻辑（编辑器、文件树、聊天、测试）
├── server.py               # Python 后端（静态服务 + API）
├── problem/
│   └── project/
│       └── question1/      # 工程题 1：俄罗斯方块
│           ├── manifest.json
│           ├── README.md
│           ├── index.html
│           ├── css/style.css
│           ├── js/
│           │   ├── engine.js   # 游戏引擎 [锁定]
│           │   └── logic.js    # 考生实现 [可编辑]
│           └── tests/test.js   # 自动化测试 [锁定]
└── docs/                   # 开发文档及杂项
```

## 出题指南

在 `problem/project/` 下新建目录，放入 `manifest.json`：

```json
{
    "title": "题目标题",
    "time": 90,
    "files": [
        { "path": "README.md", "type": "md", "mode": "locked" },
        { "path": "src/solution.js", "type": "js", "mode": "editable" },
        { "path": "tests/test.js", "type": "js", "mode": "locked" }
    ]
}
```

- `mode: "locked"`：考生只读
- `mode: "editable"`：考生可修改
- 测试文件约定输出 JSON 格式，由 `node tests/test.js` 执行

## 技术栈

- 前端：原生 HTML/CSS/JS + Monaco Editor（CDN）
- 后端：Python 标准库 `http.server` + `requests`
- AI：牛客 One API（兼容 OpenAI 接口）
- 评测：Node.js 执行测试脚本，JSON 格式输出结果
