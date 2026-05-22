# 视己

> 观己所见，自成图景

AI 助手在工作和学习对话中，被动观察并提取你的偏好、习惯和认知，构建专属记忆图谱。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key（可选，不配则 AI 回复为模拟数据）
export ANTHROPIC_AUTH_TOKEN="your-api-key"
export ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic"

# 3. 一键启动
npm run share
```

打开 `http://localhost:5173`，手机号 + 验证码 `1234` 登录。

## 分享给其他人

### 方式一：局域网（同一 WiFi）

启动后终端会显示局域网地址，比如 `http://192.168.x.x:5173`，同一 WiFi 下其他人直接访问。

### 方式二：公网隧道（发给任何人）

```bash
npm run share          # 先启动服务
# 然后新开终端：
npx localtunnel --port 5173   # 会生成一个 https://xxxx.loca.lt 公网地址
```

### 方式三：其他人自己运行

```bash
git clone <repo-url> && cd ai-memory-system
npm install
npm run share
```

## 功能

- **AI 对话** — 问任何工作/学习问题，AI 结合你的背景个性化回复
- **被动特征提取** — 对话中自动识别身份、偏好、项目、人际关系等
- **记忆图谱** — 力导向图可视化所有提取的特征及其关联
- **仪表盘** — 统计数据总览、置信度分布、新增趋势
- **导出** — Markdown / JSON / Prompt 上下文多种格式
- **账号体系** — 手机号 + 验证码登录，数据隔离

## 项目结构

```
src/
├── App.tsx              # 主应用
├── authStore.ts         # 登录认证
├── store.ts             # 记忆状态管理
├── chatStore.ts         # 聊天 + 特征提取引擎
├── nlu.ts               # 自然语言意图识别
├── exportUtils.ts       # 导出工具
├── components/
│   ├── ChatView.tsx      # AI 对话界面
│   ├── Dashboard.tsx     # 仪表盘
│   ├── MemoryGraph.tsx   # D3 力导向图谱
│   ├── Timeline.tsx      # 时间线
│   ├── LoginPage.tsx     # 登录页
│   └── ...
server/
└── index.ts             # Express + SQLite 后端
```

## 技术栈

React 18 + TypeScript + Vite + Tailwind CSS + D3.js + Express + SQLite + Anthropic SDK
