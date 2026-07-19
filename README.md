# 拾光盒 Lumibox

<p align="center">
  <strong>本地优先 · 隐私守护 · 极速浏览</strong><br/>
  把每一段时光,妥帖收存。
</p>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%2010%2F11-blue">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-31-47848F">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green">
</p>

---

## 项目简介

**拾光盒（Lumibox）** 是一款基于 Electron + React + TypeScript 构建的桌面相册管理软件,以「**用户完全掌控数据目录**」为核心理念。

软件本身**不存储任何照片数据**,仅作为「管理与增强层」叠加在用户选择的目录之上:

- 所有 UI 操作都映射为**真实的文件系统操作**(拖拽 = 移动文件、相册 = 子目录、删除 = 移入回收站)
- 所有元数据与缓存都附着在用户目录下的 `.lumibox` 系统目录中
- 无云端、无追踪、无广告 —— 你的回忆只属于你

## 核心特性

### 数据与隐私

- 🔒 **本地优先**:所有照片视频仅存于本机,无需联网,永不上传
- 📁 **真实文件系统映射**:相册 = 真实子目录,拖拽导入 = 文件移动,所见即所得
- ♻️ **回收站机制**:删除后 30 天内可恢复,过期自动彻底清理
- ↩️ **撤销栈**:删除、移动后按 `Ctrl+Z` 可撤销

### 媒体支持

- 🖼️ **图片**:`jpg` / `png` / `gif` / `webp` / `bmp` / `tiff` / `heic` / `heif` / `avif` / `svg`
- 🎬 **视频**:`mp4` / `mov` / `mkv` / `webm` / `avi` / `flv` / `wmv` / `m4v` / `mpg` / `mpeg` / `ts` / `3gp`
- 🎞️ **视频元数据**:分辨率、帧率、码率、时长自动探查(`ffprobe`)
- 📷 **EXIF 元数据**:相机型号、镜头、拍摄时间
- 🖼️ **缩略图**:sharp 异步生成图片缩略图,ffmpeg 实时抓取视频封面帧(内存 LRU 缓存,零磁盘文件)

### 界面与交互

- 🎨 **Apple HIG 风格 UI**:毛玻璃材质、1.2rem 圆角、spring 动效、PingFang SC 字体
- 🌗 **明暗主题**:light / dark / auto(跟随系统),实时切换
- 🖥️ **自研全屏查看器**:替代原生 `<video controls>`,含自定义进度条、播放控制、缩放拖拽、键盘快捷键
- 🗂️ **多视图**:网格视图 / 列表视图,按日期分组
- 🔢 **多选与排序**:Ctrl/Shift 多选、批量操作、4 种排序方式(最新/最旧/名称/大小)
- 🔍 **搜索**:按文件名 / 日期范围 / EXIF 信息查询
- 📡 **文件热更新**:文件资源管理器中改动后,软件内 300ms 内自动刷新(chokidar 监听)

### 性能

- ⚡ **缩略图懒加载**:进入视口才请求,IntersectionObserver + 200px 预加载
- 🧠 **三层缓存**:主进程内存 LRU + 浏览器 HTTP 缓存(7 天)+ 数据库索引
- 🔢 **并发控制**:图片解码并发上限 4,视频元数据探查并发上限 4
- 📊 **分页加载**:大图库支持万张以上,按需加载不卡顿

## 技术栈

| 层 | 技术 |
|---|---|
| **框架** | Electron 31 + React 18 + TypeScript 5 |
| **构建** | electron-forge (Webpack Plugin) |
| **样式** | Tailwind CSS 3 + CSS Variables(明暗主题) |
| **状态** | Redux Toolkit + react-redux |
| **数据库** | better-sqlite3(图片索引/回收站记录) |
| **图片处理** | sharp(缩略图生成) |
| **视频处理** | ffmpeg-static + fluent-ffmpeg(抓帧)+ ffprobe-static(元数据) |
| **文件监听** | chokidar |
| **EXIF 解析** | exif-reader |
| **图标** | lucide-react |
| **通知** | sonner |

## 目录结构

```
Lumibox/
├── src/
│   ├── main/                        # Electron 主进程
│   │   ├── index.ts                # 应用入口:协议注册 + 启动 + 过期回收站清理
│   │   ├── window.ts               # 主窗口创建(Logo/菜单/DevTools)
│   │   ├── ipc/                    # IPC 处理器(按模块拆分)
│   │   │   ├── index.ts            # 处理器汇总注册
│   │   │   ├── library.ts          # 库选择/初始化/切换
│   │   │   ├── album.ts            # 相册 CRUD + 图片移动
│   │   │   ├── image.ts            # 图片增删改查 + EXIF + 缩略图
│   │   │   ├── trash.ts            # 回收站列表/还原/彻底删除
│   │   │   ├── search.ts           # 按名/日期/EXIF 搜索
│   │   │   ├── undo.ts             # 撤销栈(Ctrl+Z)
│   │   │   └── viewer.ts           # 全屏查看器占位
│   │   └── services/              # 业务服务层
│   │       ├── database.ts         # SQLite schema + 图片/回收站 CRUD
│   │       ├── scanner.ts          # 全量扫描 + chokidar 文件监听
│   │       ├── fs-ops.ts           # 文件移动/复制/删除到回收站
│   │       ├── path-guard.ts       # 路径越界校验
│   │       ├── config.ts           # 多照片库配置
│   │       ├── exif.ts             # EXIF 读取
│   │       ├── thumbnail.ts        # 缩略图 URL 路由
│   │       ├── image-thumb.ts      # 图片缩略图内存 LRU 缓存
│   │       ├── frame-cache.ts      # 视频帧内存 LRU 缓存
│   │       ├── trash-thumb.ts     # 回收站缩略图内存 LRU 缓存
│   │       ├── video-probe.ts     # ffprobe 视频元数据探查
│   │       └── undo-stack.ts       # 撤销栈实现
│   ├── preload/
│   │   └── index.ts                # contextBridge 暴露的 lumibox API
│   ├── renderer/                   # React 渲染层
│   │   ├── index.html              # HTML 模板(含 CSP)
│   │   └── src/
│   │       ├── main.tsx            # React 入口
│   │       ├── App.tsx             # 应用根组件
│   │       ├── components/         # UI 组件
│   │       │   ├── about/         # 关于页
│   │       │   │   └── AboutPage.tsx
│   │       │   ├── album/         # 相册栏
│   │       │   │   ├── AlbumList.tsx
│   │       │   │   └── AlbumItem.tsx
│   │       │   ├── image/         # 图片网格
│   │       │   │   ├── ImageGrid.tsx
│   │       │   │   └── ImageCard.tsx
│   │       │   ├── layout/        # 布局框架
│   │       │   │   ├── AppShell.tsx
│   │       │   │   ├── Sidebar.tsx
│   │       │   │   ├── TopBar.tsx
│   │       │   │   └── RightPanel.tsx
│   │       │   ├── library/       # 库选择页
│   │       │   │   └── LibraryPicker.tsx
│   │       │   ├── trash/         # 回收站
│   │       │   │   └── TrashView.tsx
│   │       │   ├── ui/            # 基础组件
│   │       │   │   ├── button.tsx
│   │       │   │   └── dialog.tsx
│   │       │   └── viewer/        # 全屏查看器
│   │       │       └── FullscreenViewer.tsx
│   │       ├── hooks/             # 自定义 Hooks
│   │       │   ├── useDragDrop.ts    # 拖拽导入
│   │       │   ├── useKeyboard.ts   # 键盘快捷键
│   │       │   ├── useMultiSelect.ts # 多选逻辑
│   │       │   └── useTheme.ts      # 主题切换
│   │       ├── store/             # Redux Slices
│   │       │   ├── index.ts
│   │       │   ├── librarySlice.ts
│   │       │   ├── albumsSlice.ts
│   │       │   ├── imagesSlice.ts
│   │       │   ├── selectionSlice.ts
│   │       │   └── uiSlice.ts
│   │       ├── lib/utils.ts       # 工具函数(格式化字节/时长/日期/码率)
│   │       ├── types/index.ts     # 渲染层类型(Window 全局声明)
│   │       ├── assets/            # 静态资源(Logo/字体)
│   │       └── styles/globals.css # 全局样式 + 设计 tokens
│   └── shared/
│       └── types.ts               # 主/渲染层共享类型 + LumiboxAPI 接口
├── build/
│   ├── icon.png                   # 应用 Logo(PNG)
│   └── icon.ico                   # 应用图标(ICO,多尺寸)
├── scripts/
│   └── png-to-ico.js               # PNG → ICO 转换脚本
├── tests/                          # 主进程单元测试
│   └── main/
│       ├── database.test.ts
│       ├── fs-ops.test.ts
│       ├── path-guard.test.ts
│       └── undo-stack.test.ts
├── forge.config.ts                # electron-forge 配置
├── webpack.rules.ts                # Webpack loader 规则
├── webpack.main.config.ts          # 主进程 Webpack 配置
├── webpack.renderer.config.ts      # 渲染层 Webpack 配置
├── tailwind.config.js              # Tailwind 主题与动画配置
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vitest.config.ts
└── package.json
```

## 快速开始

### 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Windows 10/11**(主要测试平台)

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/SilentFall0814/Lumibox.git
cd Lumibox

# 2. 安装依赖
npm install

# 3. 启动开发模式
npm start
```

### 常用脚本

| 命令 | 说明 |
|---|---|
| `npm start` | 启动开发模式(electron-forge) |
| `npm run lint` | TypeScript 类型检查(`tsc --noEmit`) |
| `npm test` | 运行单元测试(vitest) |
| `npm test:watch` | 测试 watch 模式 |
| `npm run package` | 打包当前平台产物 |
| `npm run make` | 生成 Squirrel 安装包 + ZIP 便携版 |
| `npm run gen:icon` | 由 PNG 重新生成多尺寸 ICO |

打包产物在 `out/` 目录下:

- `Lumibox-x.x.x Setup.exe` — Squirrel.Windows 安装程序
- `Lumibox-x.x.x.zip` — 免安装便携版

## 使用指南

### 首次启动

1. 启动后进入欢迎页,点击「选择库目录」
2. 选择或新建一个照片库目录(例如 `E:\照片视频`)
3. 软件会在该目录下创建 `.lumibox` 系统目录:
   ```
   E:\照片视频\
   └── .lumibox\
       ├── db.sqlite        # SQLite 索引数据库
       └── trash\           # 回收站(已删除的文件暂存于此)
   ```
4. 自动扫描所有图片和视频,建立索引(进度显示在顶栏右上角)

### 日常操作

#### 导入照片

从 Windows 文件资源管理器**拖拽图片/视频**到软件窗口 —— 自动移动到当前所在目录(相册或库根)。

> 按住 `Ctrl` 拖入则为**复制**而非移动。

#### 相册管理

- 左侧相册栏顶部「+」→ 新建相册(= 创建子目录)
- 右键相册 → 重命名 / 删除(删除会移入回收站)
- **拖拽图片卡片**到左侧相册项 → 移动图片到该相册
- 多选模式下可批量移动(按 `Ctrl`/`Shift` 多选)

#### 全屏查看

**双击图片或视频**进入全屏查看器。

**图片**:

- 滚轮缩放
- 双击切换「适应屏幕 / 实际大小」
- 放大后拖拽平移

**视频**(自研播放器,替代原生 `<video controls>`):

- 空格 — 播放 / 暂停
- `←` / `→` — 切换上一张 / 下一张
- `F` — 切换全屏
- `M` — 静音切换
- 进度条:点击跳转 / 拖动拖动跳转
- 鼠标移动显示控制栏,静止 3 秒自动隐藏

#### 多选与批量操作

- 点击顶栏「多选」图标(或快捷键 `Ctrl+A` 全选)
- 多选模式下底部出现浮动操作栏:**移动到相册** / **删除**
- 选中态:卡片缩小 + 蓝色边框 + 22px 圆形勾选框

#### 搜索与筛选

顶栏搜索框支持:

- 按文件名模糊搜索
- 按日期范围搜索
- 按 EXIF(相机/镜头)搜索

#### 回收站

- 左侧导航「回收站」
- 删除的图片/视频进入 `.lumibox/trash`,保留 30 天
- 顶部警告条提示剩余天数
- 可**还原选中** 或 **彻底删除**
- 「立即清空」一键清空所有回收站内容

#### 排序与视图

- **排序**:最新优先 / 最旧优先 / 按名称 / 按大小
- **视图**:网格视图 / 列表视图
- 网格视图按日期分组(如「2026 年 7 月」),左侧 3px 蓝色竖条标识

#### 主题切换

顶栏右上角「主题」按钮:

- ☀️ 浅色
- 🌙 深色
- 🖥️ 跟随系统(默认,实时响应系统主题切换)

### 文件热更新

软件运行期间,如果在 Windows 文件资源管理器中**修改 / 替换 / 删除**库内文件:

- 软件内约 300ms 后自动刷新
- 替换图片后缩略图会自动重新生成
- 新增文件自动加入索引

## 自定义协议说明

软件通过自研 `lumibox://` 协议加载库内媒体文件,相比 `file://` 有以下优势:

### 协议路由

| 路由 | 用途 | 缓存策略 |
|---|---|---|
| `lumibox://img/<相对路径>` | 加载原图/视频 | 图片浏览器缓存 7 天;视频不缓存(走 Range 请求) |
| `lumibox://thumb/<imageId>` | 图片缩略图(400×400 JPEG) | 浏览器缓存 7 天 + 主进程内存 LRU |
| `lumibox://vframe/<imageId>` | 视频封面帧(800×800 JPEG) | 浏览器缓存 7 天 + 主进程内存 LRU |
| `lumibox://trash-thumb/<trashId>` | 回收站缩略图 | 浏览器缓存 7 天 + 主进程内存 LRU |

### 技术细节

- **注册为特权 Scheme**:`registerSchemesAsPrivileged` + `bypassCSP: true`,确保 fetch / img / video 都能正常加载
- **路径越界校验**:禁止访问 `.lumibox` 内部文件
- **Range 请求支持**:手动解析 `Range` header,返回 `206 Partial Content`,支持视频进度条拖动
- **流式响应**:`fs.createReadStream` 避免大文件一次性读入内存

## 缩略图策略

拾光盒采用**零磁盘缓存**方案,所有缓存都在内存中:

```
┌─────────────────────────────────────────────────────────────────┐
│                     请求缩略图流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   渲染层 <img>                                                  │
│      │                                                          │
│      ▼                                                          │
│   lumibox://thumb/<imageId>  ──►  主进程                        │
│                                       │                         │
│                                       ▼                         │
│                              ┌──────────────────┐              │
│                              │ 1. 内存 LRU 命中? │              │
│                              └──────────────────┘              │
│                                       │                         │
│                              命中 ◄──┴──► 未命中                │
│                              │              │                   │
│                              │              ▼                   │
│                              │     2. sharp 异步解码            │
│                              │     (并发上限 4)                │
│                              │              │                   │
│                              │              ▼                   │
│                              │     3. 写入 LRU 缓存            │
│                              │              │                   │
│                              ◄──────────────┘                   │
│                              │                                  │
│                              ▼                                  │
│   浏览器 HTTP 缓存(7 天)  ◄────  JPEG Buffer                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**优势**:

1. 不产生任何磁盘缓存文件,保持库目录干净
2. 浏览器 HTTP 缓存 + 主进程内存缓存双重加速
3. 应用退出后内存自动释放,无残留

## IPC API 一览

主进程通过 `contextBridge` 暴露的 `window.lumibox` API:

```typescript
interface LumiboxAPI {
  library: {
    selectDirectory(): Promise<string | null>;       // 选择目录对话框
    initLibrary(rootPath: string): Promise<InitResult>;  // 初始化照片库
    getConfig(): Promise<Config | null>;
    listLibraries(): Promise<Library[]>;
    switchLibrary(id: number): Promise<void>;
  };
  album: {
    listAlbums(): Promise<Album[]>;
    createAlbum(name: string): Promise<Album>;
    renameAlbum(oldName: string, newName: string): Promise<void>;
    removeAlbum(albumPath: string): Promise<void>;
    moveImagesTo(imageIds: number[], albumPath: string): Promise<MoveResult>;
  };
  image: {
    listByDir(dirPath: string, page: number): Promise<ImagePage>;
    moveImages(srcPaths: string[], destDir: string): Promise<MoveResult>;
    copyImages(srcPaths: string[], destDir: string): Promise<MoveResult>;
    deleteMany(imageIds: number[]): Promise<DeleteResult>;
    getThumbnail(imageId: number): Promise<string>;
    getExif(imageId: number): Promise<ExifData>;
    importExternal(filePaths: string[], mode: 'move' | 'copy', destDir: string): Promise<MoveResult>;
    getAbsolutePath(imageId: number): Promise<string>;
  };
  trash: {
    listTrash(): Promise<TrashItem[]>;
    restore(trashId: number): Promise<void>;
    purge(trashId: number): Promise<void>;
    emptyTrash(): Promise<void>;
  };
  search: {
    byName(query: string): Promise<ImageRecord[]>;
    byDateRange(from: number, to: number): Promise<ImageRecord[]>;
    byExif(camera?: string, lens?: string): Promise<ImageRecord[]>;
  };
  undo: {
    pushUndo(entry: UndoEntry): Promise<void>;
    undo(): Promise<UndoResult>;
    canUndo(): Promise<boolean>;
  };
  viewer: { openFullscreen(imageId: number): Promise<void>; };
  scan: {
    onProgress(cb: (current: number, total: number) => void): void;
    onImageChanged(cb: (payload: { type: 'add' | 'unlink' | 'change'; path: string }) => void): () => void;
    onAlbumChanged(cb: () => void): () => void;
  };
}
```

所有 IPC 通道遵循 `模块:动作` 命名规范(如 `image:listByDir`)。

## 键盘快捷键

| 快捷键 | 作用 |
|---|---|
| `Delete` / `Backspace` | 删除选中图片 |
| `Ctrl+Z` | 撤销上一步(删除/移动) |
| `Ctrl+A` | 全选 |
| `Esc` | 退出多选 / 关闭对话框 |
| `←` / `→` | 全屏查看时切换上一张/下一张 |
| `Space` | 视频播放/暂停 |
| `F` | 视频全屏切换 |
| `M` | 视频静音切换 |
| `F12` / `Ctrl+Shift+I` | 打开 DevTools |

## 数据库 Schema

```sql
-- 图片/视频索引表
CREATE TABLE images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  path        TEXT UNIQUE NOT NULL,           -- 相对库根的路径
  name        TEXT NOT NULL,                   -- 文件名
  type        TEXT NOT NULL DEFAULT 'image',   -- 'image' | 'video'
  created_at  INTEGER NOT NULL,                -- mtime
  hash        TEXT,
  exif_camera TEXT,
  exif_lens   TEXT,
  exif_date   INTEGER,
  width       INTEGER,
  height      INTEGER,
  size        INTEGER,
  duration    REAL,                            -- 视频时长(秒)
  fps         REAL,                            -- 视频帧率
  bitrate     INTEGER,                         -- 视频码率(bits/s)
  video_thumbnail_time REAL,                   -- 视频封面帧时间戳
  indexed_at  INTEGER NOT NULL
);

-- 回收站记录表
CREATE TABLE trash (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id      INTEGER,                       -- 原 imageId,可为 null
  original_path TEXT NOT NULL,                  -- 原路径(相对库根)
  trash_name    TEXT NOT NULL,                  -- 回收站内文件名
  trashed_at    INTEGER NOT NULL,
  size          INTEGER,
  restored      INTEGER DEFAULT 0               -- 0=未恢复,1=已恢复
);
```

- 数据库文件:`<库根>/.lumibox/db.sqlite`
- 启用 `WAL` 模式 + `foreign_keys`
- 兼容旧库:`ALTER TABLE` 自动补全缺失列

## 开发约定

- **代码注释统一使用中文**
- **IPC 通道命名**:`模块:动作`(如 `image:listByDir`)
- **类型定义**集中在 [src/shared/types.ts](src/shared/types.ts),主/渲染层共享
- **静态资源**放 `src/renderer/src/assets/`,Webpack 已配置 `asset/resource` 规则
- **设计 tokens**集中在 [src/renderer/src/styles/globals.css](src/renderer/src/styles/globals.css),通过 CSS 变量支持明暗主题
- **Tailwind 自定义动画**:见 [tailwind.config.js](tailwind.config.js) `keyframes` / `animation`

## 测试

测试覆盖主进程核心服务:

| 测试文件 | 覆盖内容 |
|---|---|
| [database.test.ts](tests/main/database.test.ts) | 建表幂等、图片插入与按目录查询 |
| [fs-ops.test.ts](tests/main/fs-ops.test.ts) | 文件移动/复制、相册 CRUD、回收站往返、扩展名集合 |
| [path-guard.test.ts](tests/main/path-guard.test.ts) | 路径越界校验、`.lumibox` 内部识别 |
| [undo-stack.test.ts](tests/main/undo-stack.test.ts) | 撤销栈 push/pop/clear/peek |

```bash
npm test
```

> 注:`better-sqlite3` 是原生模块,Node 版本变化时需 `npm rebuild better-sqlite3` 重新编译。

## 作者

- **作者**:SilentFall
- **邮箱**:[LJB110814@163.com](mailto:LJB110814@163.com)
- **QQ**:3552931982

## 许可证

[MIT](LICENSE) © 2026 SilentFall. 保留所有权利。

---

<p align="center">
  Made with care by SilentFall<br/>
  拾光盒 Lumibox · 把回忆留在身边
</p>
