# Portfolio Tracker

Windows 本地桌面应用（Electron），用于跟踪博主持仓与策略观点。

> Windows 新电脑快速上手请先看：[`SETUP_WINDOWS.md`](./SETUP_WINDOWS.md)

## 1) 新电脑快速启动（Cursor）

### 系统要求
- OS: Windows 10/11（当前项目主要在 Windows 开发）
- Node.js: `>=20`（推荐 Node 22 LTS）
- npm: `>=10`
- Git: 最新稳定版

### 必装工具
- [Cursor](https://www.cursor.com/)（后续开发 IDE）
- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)

### Cursor/VSCode 推荐扩展（开发体验）
- ESLint: `dbaeumer.vscode-eslint`
- Prettier: `esbenp.prettier-vscode`
- Office Viewer（可选，查看 docx/xlsx）

> 说明：项目本身运行不依赖 IDE 扩展；扩展仅用于代码质量与文档查看体验。

## 2) 克隆与安装

```bash
git clone https://github.com/joelle-qiu/portfolio-tracker.git
cd portfolio-tracker
npm install
```

## 3) 启动开发环境

```bash
npm run dev
```

启动后会同时拉起：
- Electron Main 进程
- Preload 脚本
- Renderer（Vite 开发服务器）

常见访问地址（日志可见）：`http://localhost:5173/`

## 4) 构建与打包

```bash
# 仅构建（含类型检查）
npm run build

# Windows 安装包
npm run build:win

# macOS / Linux（跨平台构建需对应环境）
npm run build:mac
npm run build:linux
```

## 5) 质量检查

```bash
npm run typecheck
npm run lint
```

## 6) 环境变量（可选）

当前支持的前端环境变量（用于行情源切换）：

- `VITE_QUOTE_PROVIDER`: `mock` | `real`
- `VITE_QUOTE_API_BASE`: 实盘模式下的 HTTP API 基地址（例如 `http://localhost:8080`）

示例（PowerShell）：

```powershell
$env:VITE_QUOTE_PROVIDER="real"
$env:VITE_QUOTE_API_BASE="http://localhost:8080"
npm run dev
```

## 7) 关键技术栈与核心依赖

### 框架与构建
- Electron
- electron-vite
- React + TypeScript
- Tailwind CSS + PostCSS

### 业务核心
- Dexie（IndexedDB 本地库）
- Zustand（状态管理）
- xlsx / SheetJS（Excel 解析）
- Recharts（可视化）

### 本地数据库信息
- 数据库名：`portfolio-tracker-db`
- 存储方式：本机 IndexedDB（按浏览器上下文本地持久化）

## 8) 目录结构

- `src/main`: Electron 主进程
- `src/preload`: Electron preload
- `src/renderer/src/components`: 页面组件
- `src/renderer/src/services`: DB / 解析 / 行情服务
- `src/renderer/src/store`: Zustand 状态
- `src/renderer/src/utils`: 规则与映射工具
- `src/renderer/src/types`: 领域模型
- `scripts`: 辅助脚本（解析验证等）

## 9) 已实现能力（截至当前）

- 默认博主 `八喜`，支持新增博主
- 多博主数据隔离（按 `influencerId`）
- 历史默认用户迁移与重复用户去重
- Excel 导入与持仓快照
- 行业分布可视化
- 持仓金字塔（TOP1->TOPN）
- 主题命中率 + 点击筛选联动
- 买点判断提示列
- 行情源 mock/real 切换框架

## 10) 常见问题

- 为什么未重新导入也有数据？
  - 因为本地 IndexedDB 已有历史快照，应用启动会自动加载最新快照。

- 为什么“持仓金字塔 / 配置仓”没数据？
  - 旧快照可能没有新字段（`holdingTier`、`poolType`），建议重新导入最新 Excel。

- 如何强制刷新界面？
  - `Ctrl + R`（普通刷新）
  - `Ctrl + Shift + R`（强制刷新）

