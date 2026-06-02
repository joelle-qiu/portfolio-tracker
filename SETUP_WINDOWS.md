# SETUP_WINDOWS

`Portfolio Tracker` 在 Windows 新电脑上的完整安装与运行说明。

## 1. 前置准备

请先安装以下软件（建议最新版）：

- [Cursor](https://www.cursor.com/)
- [Node.js 22 LTS](https://nodejs.org/)
- [Git for Windows](https://git-scm.com/download/win)

安装完成后，打开 PowerShell 验证：

```powershell
node -v
npm -v
git --version
```

如果命令报错，通常是安装后未重启终端，先关闭并重新打开 PowerShell。

## 2. 获取项目代码

```powershell
git clone https://github.com/joelle-qiu/portfolio-tracker.git
cd portfolio-tracker
```

## 3. 安装依赖

```powershell
npm install
```

> 首次安装可能需要 1-5 分钟，取决于网络环境。

## 4. 启动开发模式

```powershell
npm run dev
```

正常日志会出现：

- `electron main process built successfully`
- `electron preload scripts built successfully`
- `Local: http://localhost:5173/`
- `starting electron app...`

这表示 Electron 桌面窗口应该已启动。

## 5. 推荐 Cursor 扩展（可选但建议）

- ESLint: `dbaeumer.vscode-eslint`
- Prettier: `esbenp.prettier-vscode`
- Office Viewer（查看 docx/xlsx）

> 扩展不影响运行，只提升开发体验。

## 6. 环境变量（可选）

项目支持行情源切换：

- `VITE_QUOTE_PROVIDER`: `mock` 或 `real`
- `VITE_QUOTE_API_BASE`: `real` 模式下的接口地址

PowerShell 示例：

```powershell
$env:VITE_QUOTE_PROVIDER="real"
$env:VITE_QUOTE_API_BASE="http://localhost:8080"
npm run dev
```

恢复默认 mock：

```powershell
Remove-Item Env:VITE_QUOTE_PROVIDER -ErrorAction SilentlyContinue
Remove-Item Env:VITE_QUOTE_API_BASE -ErrorAction SilentlyContinue
npm run dev
```

## 7. 常用命令

```powershell
# 类型检查
npm run typecheck

# 代码规范检查
npm run lint

# 生产构建
npm run build

# Windows 打包
npm run build:win
```

## 8. 数据说明（很重要）

- 本地数据库名：`portfolio-tracker-db`
- 存储位置：IndexedDB（本机本地）
- 即使不重新导入 Excel，也可能看到历史数据（来自本地快照）

如果要验证“全新空数据”状态，可在开发者工具中清空 IndexedDB 后重启应用。

## 9. 常见问题排查

### Q1: `npm install` 失败

- 切换更稳定网络后重试
- 删除 `node_modules` 和 `package-lock.json` 后重装：

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

### Q2: `npm run dev` 没弹出窗口

- 先确认终端是否有 `starting electron app...`
- 关闭旧进程后重启命令
- 检查是否被杀毒软件拦截 Electron 子进程

### Q3: 界面没更新

- 应用内按 `Ctrl + R`
- 强制刷新按 `Ctrl + Shift + R`
- 不行就重启 `npm run dev`

### Q4: 端口冲突（5173）

关闭占用端口的进程后重试，或临时修改 Vite 端口配置。

## 10. 首次验收清单

- [ ] `npm install` 成功
- [ ] `npm run dev` 成功
- [ ] Electron 窗口能打开
- [ ] 顶部能看到 `Portfolio Tracker`
- [ ] 可以点击 `导入 Excel`
- [ ] `npm run typecheck` 通过

---

如需团队统一安装，可把本文件与 `README.md` 一起作为 onboarding 文档使用。

