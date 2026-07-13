# 拾光盒 Lumibox

> 本地优先（Local-first）的高性能桌面相册管理系统。

## 项目简介

拾光盒（Lumibox）是一款以「用户完全掌控数据目录」为核心理念的桌面相册管理软件。软件本身不存储任何照片数据，仅作为「管理与增强层」叠加在用户选择的目录之上 —— 所有 UI 操作都映射为真实的文件系统操作，所有元数据增强都附着在用户目录下的 `.lumibox` 系统目录中。

## 核心特性

- **本地优先**：所有数据保存在用户选择的本地目录，无云端依赖，隐私可控。
- **图片 + 视频统一管理**：扫描、缩略图、全屏查看、相册移动均支持图片（jpg/png/webp 等）和视频（mp4/mov/mkv 等）。
- **白色极简 UI + 自研组件**：
  - 全屏查看器完全自研（替代原生 `<video controls>`），含自定义进度条、播放控制、缩放拖拽、键盘快捷键。
  - 全软件统一使用 PingFang SC Semibold 字体。
- **真实文件系统映射**：
  - 拖拽导入 = 文件移动到当前目录
  - 相册 = 真实子目录
  - 删除 = 移入 `.lumibox/trash`，可恢复
- **文件热更新**：在文件资源管理器中修改/替换/删除库内文件，软件内自动刷新（chokidar 监听 + IPC 推送）。
- **安全加载协议**：自研 `lumibox://` 协议（支持 Range 请求，视频进度条可拖动），绕过 CSP 对 `file://` 的限制。
- **高效浏览**：缩略图懒加载 + 视频首帧截图（ffmpeg）+ 大列表分页。
- **元数据增强**：EXIF 读取、标签系统、按名称/日期/标签/EXIF 搜索。
- **撤销机制**：删除、移动等操作支持 Ctrl+Z 撤销。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Electron 31 + React 18 + TypeScript 5 |
| 构建 | electron-forge (webpack plugin) |
| 样式 | Tailwind CSS 3 |
| 状态 | Redux Toolkit + react-redux |
| 数据库 | better-sqlite3（标签/索引/回收站） |
| 缩略图 | sharp（图片）+ ffmpeg-static / fluent-ffmpeg（视频） |
| 文件监听 | chokidar |
| EXIF | exif-reader |
| 图标/字体 | sharp 圆角切边 + PingFang SC Semibold |

## 目录结构

```
Lumibox/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts            # 入口:注册 lumibox:// 协议 + 启动
│   │   ├── window.ts           # 窗口创建(Logo/菜单/DevTools 配置)
│   │   ├── ipc/                # IPC 处理器(image/album/trash/tag/search/undo)
│   │   └── services/          # 业务服务
│   │       ├── database.ts     # SQLite schema + CRUD
│   │       ├── scanner.ts     # 全量扫描 + chokidar 文件监听
│   │       ├── thumbnail.ts    # 图片/视频缩略图生成
│   │       ├── fs-ops.ts       # 文件移动/复制/删除到回收站
│   │       ├── path-guard.ts   # 路径越界校验
│   │       ├── exif.ts         # EXIF 读取
│   │       ├── config.ts       # 多照片库配置
│   │       └── undo-stack.ts   # 撤销栈
│   ├── preload/
│   │   └── index.ts            # contextBridge 暴露的 lumibox API
│   ├── renderer/               # React 渲染层
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── components/     # 组件(image/album/layout/viewer/tag/trash/ui)
│   │       ├── hooks/          # useDragDrop/useKeyboard/useMultiSelect
│   │       ├── store/          # Redux slices
│   │       ├── styles/         # globals.css(字体 + 主题)
│   │       └── lib/utils.ts    # 工具函数(格式化时长等)
│   └── shared/
│       └── types.ts            # 主/渲染层共享类型 + LumiboxAPI 接口
├── build/
│   ├── icon.png                # 圆角矩形切边的应用 Logo
│   └── APP_Logo_rounded.png    # 切边源文件
├── scripts/
│   └── generate-rounded-logo.js # Logo 圆角切边生成脚本
├── tests/                      # 主进程单元测试
├── forge.config.ts             # electron-forge 配置
├── webpack.rules.ts            # webpack loader 规则
├── webpack.renderer.config.ts
├── webpack.main.config.ts
├── tailwind.config.js
└── package.json
```

## 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9
- Windows 10/11（主要测试平台）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm start
```

### 类型检查

```bash
npm run lint
```

### 运行测试

```bash
npm test
```

### 打包安装包

```bash
npm run make
```

产物在 `out/` 目录下（Squirrel 安装包 + zip 便携版）。

## 使用指南

### 首次启动

1. 选择或创建一个照片库目录（如 `E:\照片视频`）。
2. 软件会在该目录下创建 `.lumibox` 系统目录（含 `cache`、`trash`、`db.sqlite`）。
3. 自动扫描所有图片和视频并建立索引。

### 日常使用

- **导入照片**：从文件资源管理器拖拽图片/视频到软件窗口 —— 自动移动到当前所在目录（相册或库根）。
- **移动到相册**：直接把图片卡片拖到左侧相册项。支持多选后一起拖（按 Ctrl/Shift 多选）。
- **相册管理**：左侧相册栏顶部「+」新建相册（= 创建子目录），右键删除（移到回收站）。
- **全屏查看**：双击图片或视频。
  - 图片：滚轮缩放、双击切换缩放、放大后拖拽平移。
  - 视频：自研播放器，进度条点击/拖动跳转、空格播放暂停、←→ 切换、F 全屏、M 静音。
- **搜索/筛选**：顶部搜索栏按名称/日期/标签/EXIF 查询。
- **回收站**：删除的图片/视频进入 `.lumibox/trash`，可恢复或彻底清除。
- **撤销**：删除/移动后按 Ctrl+Z 撤销。

### 文件热更新

软件运行期间，如果在 Windows 文件资源管理器中修改/替换/删除库内文件，软件内会自动刷新（约 300ms 防抖延迟）。替换图片后缩略图也会自动重新生成。

## 自定义协议说明

软件通过 `lumibox://img/<相对路径>` 协议加载库内媒体文件，相比 `file://` 有以下优势：

- 绕过 CSP 对 `file://` 的限制
- 路径越界校验（禁止访问 `.lumibox` 内部文件）
- 手动处理 `Range` 请求，返回 `206 Partial Content`，支持视频进度条拖动
- `bypassCSP: true` + `registerSchemesAsPrivileged` 确保 fetch / img / video 都能正常加载

## 开发约定

- 代码注释统一使用中文。
- 所有 IPC 通道命名：`模块:动作`（如 `image:listByDir`）。
- 类型定义集中在 [src/shared/types.ts](src/shared/types.ts)，主/渲染层共享。
- 新增字体/图片等静态资源放 `src/renderer/src/assets/`，webpack 已配置 `asset/resource` 规则。

## 许可证

MIT
