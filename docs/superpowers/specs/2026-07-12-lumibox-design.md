# 拾光盒 Lumibox 设计文档

- **文档版本**: v1.0
- **创建日期**: 2026-07-12
- **适用项目**: 拾光盒 Lumibox 本地相册管理系统
- **状态**: 已获用户确认(2026-07-12)

---

## 一、项目定义

### 1.1 产品名称

- 中文:拾光盒
- 英文:Lumibox

### 1.2 产品定位

> 本地优先(Local-first)+ 高性能 + 摄影友好的桌面相册管理系统

核心特点:

- 用户完全掌控数据目录
- 软件仅作为"管理与增强层"
- 所有操作映射真实文件系统
- 支持高效浏览、分类、筛选、管理大量照片

### 1.3 核心设计原则

- 用户选择数据目录(不预设路径)
- 不破坏原有文件结构
- 所有增强能力附着在 `.lumibox` 系统目录
- UI 操作 = 文件系统操作 + 元数据增强

---

## 二、技术栈

| 维度 | 选型 |
|------|------|
| 桌面框架 | Electron 31 |
| 前端框架 | React 18 + TypeScript |
| 构建打包 | electron-forge + webpack(electron-forge/plugin/webpack) |
| UI 组件 | shadcn/ui + Tailwind CSS |
| 状态管理 | Redux Toolkit + RTK Query |
| 数据库 | better-sqlite3(同步、高性能、WAL 模式) |
| 图片处理 | sharp(缩略图生成) |
| 文件监听 | chokidar |
| EXIF 解析 | exif-reader(轻量,纯 JS) |
| 测试 | Vitest(主进程单元)+ Playwright via webapp-testing(渲染层) |

---

## 三、进程架构(三段式安全隔离)

```
┌──────────────────────────────────────────────────┐
│  Main 进程(Node.js)                              │
│  - 文件系统操作(fs.rename / fs.copyFile / unlink)│
│  - SQLite 数据库                                 │
│  - 缩略图生成(sharp)                             │
│  - 后台扫描(chokidar)                            │
│  - 窗口管理、菜单                                │
└────────────────────┬─────────────────────────────┘
                     │ contextBridge (白名单 API)
┌────────────────────┴─────────────────────────────┐
│  Preload                                         │
│  - 暴露 window.lumibox.*                         │
│  - 禁用 nodeIntegration                          │
│  - contextIsolation: true                        │
└────────────────────┬─────────────────────────────┘
                     │ ipcRenderer.invoke
┌────────────────────┴─────────────────────────────┐
│  Renderer (React)                                │
│  - 仅通过 window.lumibox 调用能力                │
│  - 无 Node 直接访问                              │
└──────────────────────────────────────────────────┘
```

### 3.1 安全配置

```ts
// BrowserWindow 配置
{
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: path.join(__dirname, 'preload.js')
  }
}
```

---

## 四、目录结构

```
Lumibox/
├── forge.config.ts               # electron-forge 配置(webpack 插件)
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── components.json               # shadcn 配置
├── .gitignore
├── docs/superpowers/specs/       # 设计文档
├── src/
│   ├── main/                     # 主进程
│   │   ├── index.ts              # 入口,创建窗口、注册 IPC
│   │   ├── window.ts              # 窗口工厂
│   │   ├── ipc/                  # IPC 处理器(按域分文件)
│   │   │   ├── library.ts
│   │   │   ├── album.ts
│   │   │   ├── image.ts
│   │   │   ├── trash.ts
│   │   │   ├── tag.ts
│   │   │   ├── search.ts
│   │   │   ├── undo.ts
│   │   │   └── viewer.ts
│   │   └── services/             # 核心服务
│   │       ├── database.ts       # SQLite 连接、迁移、查询
│   │       ├── fs-ops.ts         # 文件操作(移动/复制/删除/恢复)
│   │       ├── thumbnail.ts       # 缩略图缓存
│   │       ├── scanner.ts        # 后台扫描+chokidar 监听
│   │       ├── undo-stack.ts     # 操作撤销栈
│   │       ├── config.ts         # 库路径配置
│   │       └── path-guard.ts     # 路径越界防护
│   ├── preload/
│   │   └── index.ts              # contextBridge 白名单 API
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx          # React 入口
│   │       ├── App.tsx           # 路由/布局
│   │       ├── store/            # Redux slices
│   │       │   ├── index.ts
│   │       │   ├── librarySlice.ts
│   │       │   ├── albumsSlice.ts
│   │       │   ├── imagesSlice.ts
│   │       │   ├── selectionSlice.ts
│   │       │   ├── tagsSlice.ts
│   │       │   └── uiSlice.ts
│   │       ├── components/
│   │       │   ├── layout/       # TopBar / Sidebar / MainContent / RightPanel
│   │       │   ├── library/      # LibraryPicker / LibraryList
│   │       │   ├── album/        # AlbumList / AlbumItem / AlbumDialog
│   │       │   ├── image/        # ImageGrid / ImageCard / Thumbnail / DropZone
│   │       │   ├── viewer/       # FullscreenViewer / ZoomableImage
│   │       │   ├── tag/          # TagEditor / TagFilter
│   │       │   ├── trash/        # TrashView / RestoreButton
│   │       │   ├── search/       # SearchBar / FilterPanel
│   │       │   └── ui/           # shadcn 组件(button/dialog/dropdownmenu 等)
│   │       ├── hooks/
│   │       │   ├── useDragDrop.ts
│   │       │   ├── useMultiSelect.ts
│   │       │   ├── useKeyboard.ts
│   │       │   └── useLazyThumbnail.ts
│   │       ├── lib/
│   │       │   └── utils.ts      # cn() 等
│   │       ├── styles/
│   │       │   └── globals.css   # Tailwind 入口 + 主题变量
│   │       └── types/
│   │           └── index.ts
│   └── shared/
│       └── types.ts              # 主/渲染共享类型(IPC 参数/返回值)
└── tests/
    ├── main/
    │   ├── fs-ops.test.ts
    │   ├── database.test.ts
    │   ├── thumbnail.test.ts
    │   ├── undo-stack.test.ts
    │   └── path-guard.test.ts
    └── renderer/
        └── (Playwright e2e)
```

---

## 五、数据库设计(SQLite)

### 5.1 表结构

```sql
-- 图片主表
CREATE TABLE IF NOT EXISTS images (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  path          TEXT UNIQUE NOT NULL,       -- 相对库根的相对路径
  name          TEXT NOT NULL,              -- 文件名
  created_at    INTEGER NOT NULL,           -- 文件创建时间(Unix ms)
  hash          TEXT,                       -- 文件内容 hash(可选,用于去重)
  exif_camera   TEXT,
  exif_lens     TEXT,
  exif_date     INTEGER,
  width         INTEGER,
  height        INTEGER,
  size          INTEGER,                    -- 字节数
  indexed_at    INTEGER NOT NULL           -- 入库时间
);

-- 标签
CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

-- 图片-标签 多对多
CREATE TABLE IF NOT EXISTS image_tags (
  image_id INTEGER NOT NULL,
  tag_id   INTEGER NOT NULL,
  PRIMARY KEY (image_id, tag_id),
  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)   ON DELETE CASCADE
);

-- 虚拟相册(基于 DB,不复制文件)
CREATE TABLE IF NOT EXISTS albums_virtual (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- 虚拟相册-图片 多对多
CREATE TABLE IF NOT EXISTS album_images (
  album_id INTEGER NOT NULL,
  image_id INTEGER NOT NULL,
  PRIMARY KEY (album_id, image_id),
  FOREIGN KEY (album_id) REFERENCES albums_virtual(id) ON DELETE CASCADE,
  FOREIGN KEY (image_id) REFERENCES images(id)        ON DELETE CASCADE
);

-- 回收站记录
CREATE TABLE IF NOT EXISTS trash (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id      INTEGER,                    -- 可空,图片可能尚未入库即被删
  original_path TEXT NOT NULL,              -- 删除前的相对路径
  trash_name    TEXT NOT NULL,             -- trash 目录中的唯一文件名(带时间戳)
  trashed_at    INTEGER NOT NULL,
  size          INTEGER,
  restored      INTEGER DEFAULT 0
);

-- 配置(key-value)
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

### 5.2 索引

```sql
CREATE INDEX IF NOT EXISTS idx_images_path        ON images(path);
CREATE INDEX IF NOT EXISTS idx_images_created_at  ON images(created_at);
CREATE INDEX IF NOT EXISTS idx_image_tags_tag_id  ON image_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_album_images_album ON album_images(album_id);
```

### 5.3 模式

- `PRAGMA journal_mode = WAL;` 提升并发
- `PRAGMA foreign_keys = ON;` 启用外键
- 所有查询用 prepared statement,防 SQL 注入

---

## 六、IPC API 设计(window.lumibox)

通过 `contextBridge` 暴露,按域分组,均为 `ipcRenderer.invoke` / `ipcMain.handle` 双向通道。

### 6.1 library(库管理)

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `selectDirectory` | - | `string \| null` | 弹出原生目录选择对话框 |
| `initLibrary` | `rootPath` | `InitResult` | 校验+创建 `.lumibox/`+初始化 DB |
| `getConfig` | - | `Config \| null` | 读取当前库配置 |
| `listLibraries` | - | `Library[]` | 列出所有已添加库 |
| `switchLibrary` | `id` | `void` | 切换当前活动库 |

### 6.2 album(相册=文件夹)

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `listAlbums` | `libraryId` | `Album[]` | 列出顶级文件夹 |
| `createAlbum` | `name` | `Album` | 在库根创建文件夹 |
| `renameAlbum` | `old, new` | `void` | 重命名文件夹 |
| `removeAlbum` | `path` | `void` | 移动到回收站 |
| `moveImagesTo` | `imageIds, albumPath` | `MoveResult` | 移动图片到指定相册(移动,非复制) |

### 6.3 image(图片)

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `listByDir` | `dirPath, page` | `ImagePage` | 分页加载目录图片 |
| `moveImages` | `srcPaths, destDir` | `MoveResult` | **移动文件(fs.rename)** |
| `copyImages` | `srcPaths, destDir` | `MoveResult` | 复制文件(Ctrl+拖入时) |
| `deleteMany` | `imageIds` | `DeleteResult` | 移到回收站 |
| `getThumbnail` | `imageId` | `dataUrl \| path` | 返回缩略图(缓存或生成) |
| `getExif` | `imageId` | `ExifData` | 读取 EXIF |
| `importExternal` | `filePaths, mode` | `MoveResult` | 从窗口外拖入(mode=move/copy) |

### 6.4 trash(回收站)

| 方法 | 参数 | 返回 |
|------|------|------|
| `listTrash` | - | `TrashItem[]` |
| `restore` | `trashId` | `void` |
| `purge` | `trashId` | `void`(永久删除) |
| `emptyTrash` | - | `void` |

### 6.5 tag(标签)

| 方法 | 参数 | 返回 |
|------|------|------|
| `listTags` | - | `Tag[]` |
| `createTag` | `name` | `Tag` |
| `attachTag` | `imageId, tagId` | `void` |
| `detachTag` | `imageId, tagId` | `void` |
| `listTagsByImage` | `imageId` | `Tag[]` |

### 6.6 search(搜索)

| 方法 | 参数 | 返回 |
|------|------|------|
| `searchByName` | `query` | `Image[]` |
| `searchByDateRange` | `from, to` | `Image[]` |
| `searchByTags` | `tagIds[]` | `Image[]` |
| `searchByExif` | `camera?, lens?` | `Image[]` |

### 6.7 undo(撤销)

| 方法 | 参数 | 返回 |
|------|------|------|
| `pushUndo` | `UndoEntry` | `void` |
| `undo` | - | `UndoResult` |
| `canUndo` | - | `boolean` |

支持的操作类型:删除、移动。

### 6.8 viewer(查看器)

| 方法 | 参数 | 返回 |
|------|------|------|
| `openFullscreen` | `imageId` | `void` |
| `next` / `prev` | - | `void` |

---

## 七、核心流程

### 7.1 启动与初始化

```
app.whenReady()
  → 创建主窗口
  → 读取 config(库路径)
  → 若无库路径:
      → 渲染层显示 LibraryPicker
      → 用户点击"选择目录"
      → 调用 library.selectDirectory(原生对话框)
      → 校验:存在? 可读写? (含图片则提示但不强制)
      → 创建 <root>/.lumibox/{cache, trash}
      → 创建 db.sqlite,执行迁移建表
      → 写入 config
  → 若有库路径:
      → 打开 DB
      → 启动后台扫描(scanner.start)
  → 渲染主界面
```

### 7.2 后台扫描与索引

- **首次全量遍历**:递归遍历库根(排除 `.lumibox`),将图片写入 `images` 表
- **chokidar 监听**:`watch(root, { ignored: /.lumibox/, ignoreInitial: true })`
  - `add`:新图片入库 + 异步生成缩略图
  - `unlink`:从 images 表删除 + 清理 cache
  - `addDir` / `unlinkDir`:更新相册列表
- **不阻塞 UI**:扫描在 Main 进程异步进行,通过 `webContents.send('scan:progress')` 推送进度
- **缩略图生成**:worker 队列,sharp 压缩到 256×256,存到 `cache/<hash>.webp`

### 7.3 图片浏览(懒加载)

- 网格组件用 `IntersectionObserver` 监听可视卡片
- 卡片进入视口 → 调用 `image.getThumbnail(imageId)`
- 主进程:若 cache 存在则直读,否则生成并写入 cache,返回 dataURL
- 分页加载:每次返回 100 张,滚到底部加载下一页

### 7.4 全屏查看器

- 双击图片 → `viewer.openFullscreen`
- 快捷键:`Space` 预览 / `Esc` 退出 / `← →` 切换 / `Delete` 删除
- 滚轮缩放:`transform: scale()` + 阻尼

### 7.5 拖拽系统

| 触发 | 行为 | 实现 |
|------|------|------|
| 拖入窗口(无修饰) | 移动文件 | `fs.rename` |
| Ctrl + 拖入 | 复制文件 | `fs.copyFile` |
| 拖到相册 | 移动到该目录 | `fs.rename` 到目标路径 |
| 窗口内拖到相册 | 移动到该相册 | 同上 |
| 拖到回收站 | 移到 trash | 走删除流程 |

**禁止行为**:任何"拖拽"场景下用复制替代移动(除 Ctrl+拖入显式复制)。

### 7.6 多选与批处理

- `Ctrl + 点击`:切换选中
- `Shift + 点击`:从上次选中到当前连选
- `Ctrl + A`:全选当前视图
- `Delete`:批量删除(弹确认对话框)→ 移到 trash + 记 trash 表
- 拖动多选:框选(待评估,核心需求可不实现)

### 7.7 删除与回收站

```
deleteMany(imageIds):
  → 对每张图片:
      → 计算 trash_name = <原文件名>_<时间戳>.<扩展名>
      → fs.rename 原文件 → <root>/.lumibox/trash/<trash_name>
      → 写入 trash 表(original_path, trash_name, trashed_at, size)
      → 从 images 表标记或保留(用于恢复)
  → 弹出 toast:"已删除 N 张,可从回收站恢复"

restore(trashId):
  → 读 trash 表 → fs.rename trash/<trash_name> → original_path
  → 更新 trash.restored = 1
  → 重新扫描该文件入库

purge(trashId):
  → fs.unlink trash 文件
  → 删除 trash 记录
```

### 7.8 撤销系统

- 操作栈(内存,DB 不持久化,关闭即清空)
- 每次删除/移动前 push 一条 `UndoEntry`:
  - `delete`:记录原路径 + trash_name → 撤销 = restore
  - `move`:记录 src → dest → 撤销 = 反向 move
- `Ctrl + Z` 触发 `undo.undo()` → 弹栈 → 反向执行 → toast 提示

### 7.9 标签与虚拟相册

- **标签**:纯 DB 操作。图片卡片右侧面板编辑,`attachTag` / `detachTag`。左侧"标签"列表点击 → `searchByTags`
- **虚拟相册**:左侧独立分组。创建 = `albums_virtual` 插入;添加图片 = `album_images` 插入;**不复制文件**。一图可属多相册

### 7.10 搜索

- 顶部搜索框 + 高级筛选面板
- 组合查询:文件名 LIKE + 时间范围 + 标签交集 + EXIF 字段
- 结果渲染为图片网格,支持后续多选/移动/删除

---

## 八、UI 设计(白色极简)

### 8.1 布局

```
┌──────────────────────────────────────────────────┐
│ 顶部栏: 搜索框 | 当前路径 | 导入 | 新建 | 视图切换 │
├─────────┬──────────────────────────┬─────────────┤
│ 左侧栏  │ 中间图片网格             │ 右侧栏      │
│ 照片库  │ (缩略图懒加载 + 多选)    │ 图片信息    │
│ 相册    │                          │ 标签编辑    │
│ 虚拟相册│                          │ EXIF       │
│ 标签    │                          │ 操作按钮    │
│ 回收站  │                          │             │
└─────────┴──────────────────────────┴─────────────┘
```

### 8.2 配色(白色极简)

| 用途 | 颜色 |
|------|------|
| 主背景 | `#ffffff` |
| 卡片/次级背景 | `#f9fafb` |
| 边框 | `#e5e7eb` |
| 主色(选中/链接/按钮) | `#2563eb` |
| 主色 hover | `#1d4ed8` |
| 主文字 | `#1f2937` |
| 次要文字 | `#6b7280` |
| 危险色(删除) | `#dc2626` |
| 阴影 | `0 1px 2px rgba(0,0,0,0.04)` |

### 8.3 视觉规范

- 圆角:卡片 `rounded-md`(6px),按钮 `rounded-md`,对话框 `rounded-lg`
- 间距:侧边栏宽 240px,右侧栏宽 320px,卡片间距 8px
- 字体:系统默认 `system-ui, -apple-system, "Segoe UI", sans-serif`,字号 14px 基准
- 图标:`lucide-react`,1.5px stroke,与 shadcn 一致
- 选中态:卡片 2px 蓝色边框 + 浅蓝 `#eff6ff` 背景
- hover:浅灰 `#f3f4f6` 背景

### 8.4 组件清单(shadcn)

`button` `dialog` `dropdown-menu` `input` `scroll-area` `separator` `tooltip` `toast`(sonner)`context-menu` `checkbox` `tabs` `alert-dialog` `popover` `command`

---

## 九、安全机制

### 9.1 路径防护(path-guard.ts)

所有文件操作前,必须:

```ts
function assertWithinLibrary(targetPath: string): void {
  const resolved = path.resolve(targetPath);
  const root = getLibraryRoot();
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error('路径越界,禁止操作');
  }
  if (resolved.includes('.lumibox') && !isInternalOperation) {
    throw new Error('禁止操作 .lumibox 系统目录');
  }
}
```

- 禁止 `..` 越界
- 禁止操作 `.lumibox` 内部(除系统服务自身)
- 拒绝符号链接跳出库根

### 9.2 操作确认

- 批量删除:AlertDialog 二次确认
- 删除相册:AlertDialog 二次确认(含图片数量)
- 清空回收站:AlertDialog 二次确认(不可恢复)

### 9.3 输入校验

- 相册名:禁用 `<>:"/\|?*` 等 Windows 非法字符
- 标签名:trim 后非空,长度 ≤ 30

---

## 十、性能策略

### 10.1 缩略图缓存

- 路径:`<root>/.lumibox/cache/<sha256>.webp`
- 尺寸:256×256,质量 80
- 生成时机:首次访问时按需生成,后台异步补全
- 命中策略:优先读 cache,缺失才生成

### 10.2 懒加载

- `IntersectionObserver` 监听卡片进入视口
- 分页:每页 100 张
- 虚拟滚动(可选,图片量大时引入 `@tanstack/react-virtual`)

### 10.3 后台扫描

- chokidar 增量监听,首次全量扫描分批 commit(每 500 条)
- 扫描进度通过 IPC 推送,UI 显示进度条

---

## 十一、测试策略

### 11.1 主进程单元测试(Vitest)

| 模块 | 测试重点 |
|------|----------|
| `fs-ops.ts` | 移动/复制/删除/恢复,路径越界拒绝 |
| `database.ts` | 建表、CRUD、外键级联、迁移幂等 |
| `thumbnail.ts` | 缓存命中、生成、并发 |
| `undo-stack.ts` | push/undo、栈空、多类型 |
| `path-guard.ts` | 各种越界场景拒绝 |

临时目录隔离,每测试用例独立 fixture。

### 11.2 渲染层测试(Playwright via webapp-testing skill)

- 拖拽导入:拖入 → 验证文件移动
- 多选:Ctrl/Shift 选择 → 批量删除
- 浏览:网格渲染、双击全屏、Esc 退出
- 标签:添加、筛选

### 11.3 桌面端验证(electron skill)

- `npm start` 启动应用
- 选择目录 → 创建 `.lumibox`
- 拖拽移动 → 验证文件位置变化
- 删除 → 验证进入 trash

### 11.4 交付前验证(Windows 实机)

按用户偏好"目标环境验证后再报告完成":

1. `npm start` 成功启动
2. 首次选目录 → 初始化完成
3. 拖入图片 → 文件移动(非复制)确认
4. 创建相册 → 拖图到相册 → 移动确认
5. 多选删除 → 回收站恢复确认
6. 全屏查看 + 快捷键
7. 标签 + 虚拟相册
8. 搜索 + EXIF 筛选
9. `npm run make` 打包 → 安装包运行

---

## 十二、开发执行顺序(遵循文档第十一节)

1. **项目脚手架**:electron-forge + webpack + React + TS + Tailwind + shadcn 跑通空白应用
2. **初始化系统**:目录选择 + `.lumibox` 创建 + DB 迁移 + 配置持久化
3. **文件浏览**:网格 + 缩略图缓存 + 懒加载 + 后台扫描
4. **拖拽 + 移动**:拖入窗口/Ctrl 拖入/拖到相册(移动而非复制)
5. **删除 + 回收站 + 撤销**:批量删除、trash、恢复、Ctrl+Z
6. **图片查看器**:全屏、缩放、快捷键
7. **标签系统**:CRUD、筛选
8. **虚拟相册 + 搜索(EXIF)**:多对多关系、组合查询

---

## 十三、配置文件示例

### 13.1 forge.config.ts(核心)

```ts
import type { ForgeConfig } from '@electron-forge/shared-types';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: { name: 'Lumibox', executableName: 'Lumibox' },
  makers: [
    new MakerSquirrel({ setupIcon: './build/icon.ico' }),
    new MakerZIP({}, ['win32-x64'])
  ],
  plugins: [
    new WebpackPlugin({
      mainConfig,
      renderer: { config: rendererConfig, entryPoints: [/* ... */] }
    })
  ]
};
export default config;
```

### 13.2 dependencies 关键依赖

```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "chokidar": "^3.6.0",
    "sharp": "^0.33.0",
    "exif-reader": "^2.0.0",
    "@reduxjs/toolkit": "^2.2.0",
    "react-redux": "^9.1.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0",
    "sonner": "^1.5.0"
  },
  "devDependencies": {
    "@electron-forge/cli": "^7.4.0",
    "@electron-forge/plugin-webpack": "^7.4.0",
    "@electron-forge/maker-squirrel": "^7.4.0",
    "@electron-forge/maker-zip": "^7.4.0",
    "electron": "^31.0.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^1.6.0",
    "@playwright/test": "^1.45.0"
  }
}
```

---

## 十四、自审记录

- [x] 占位符扫描:无 TBD/TODO
- [x] 内部一致性:UI 配色与布局章节一致;IPC 方法与流程章节对应
- [x] 范围检查:单次可实现(分 8 个阶段)
- [x] 歧义检查:
  - "拖拽排序(UI层)"(相册):本版本暂不实现相册拖拽排序,因文档将其列为次要项。如需可补
  - "Ctrl+Z 撤销":仅支持删除与移动两类(文档明确)
  - "EXIF 筛选":实现 camera + lens 两字段(文档扩展项)
  - 缩略图格式定为 WebP(质量与体积平衡)

---

## 十五、用户决策记录(2026-07-12)

| 决策点 | 选择 |
|--------|------|
| 交付范围 | 文档全部功能 |
| UI 组件方案 | shadcn/ui + Tailwind |
| 状态管理 | Redux Toolkit |
| 构建打包 | electron-forge + webpack |
| UI 配色 | **白色极简**(用户第二轮确认变更) |

---

**下一步**:用户审查本设计文档 → 调用 `writing-plans` skill 制定分步实施计划 → 进入编码。
