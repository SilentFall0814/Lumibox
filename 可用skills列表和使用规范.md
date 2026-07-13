# Lumibox 项目可用 Skills 列表和使用规范

> 本文档整理了适用于 Lumibox 桌面相册管理系统项目的所有可用 Skills，并提供详细的使用指导和规划。

---

## 一、项目技术背景

### 1.1 项目概述
- **项目名称**: 拾光盒 (Lumibox)
- **项目类型**: 本地优先的桌面相册管理系统
- **核心特点**: 文件系统映射管理、高性能浏览、标签系统、虚拟相册

### 1.2 技术栈方案
- **主要方案**: Tauri + Vue
- **备选方案**: Electron + React
- **数据存储**: SQLite + 本地文件系统
- **UI交互**: 拖拽操作、批量处理、实时搜索

---

## 二、核心开发 Skills

### 2.1 Code (编码工作流)

**Skill 描述**: 编码工作流，包含规划、实现、验证和测试的完整软件开发流程。

**项目职责**:
- 主要功能模块的代码实现
- 复杂业务逻辑的开发（文件系统映射、拖拽系统、缓存机制）
- 代码重构和优化
- Bug 修复

**使用场景**:
- ✅ 开发新的功能模块（如标签系统、虚拟相册）
- ✅ 实现文件操作核心逻辑（fs.rename、fs.unlink等）
- ✅ 优化性能关键路径（缩略图加载、懒加载）
- ✅ 修复复杂 Bug

**触发时机**: 需要实现具体功能代码时主动调用

**示例任务**:
```
"实现图片导入的拖拽系统，支持移动和复制操作"
"优化 SQLite 数据库查询性能"
"实现回收站的恢复功能"
```

---

### 2.2 web-dev (Web 应用开发)

**Skill 描述**: 创建生产级 Web 界面，具有高设计质量。

**项目职责**:
- 前端界面搭建（如果选择 Vue 技术栈）
- 响应式布局设计
- 组件化开发
- 前端架构设计

**使用场景**:
- ✅ 从零开始搭建前端项目
- ✅ 创建主要页面结构（相册网格、详情页、设置页）
- ✅ 实现复杂交互组件（图片查看器、标签编辑器）
- ❌ 不适用于纯后端逻辑

**触发时机**: 明确需要构建新的 Web 界面或页面时

**注意事项**:
- 仅用于从零开始的新建项目，不适用于现有项目修改
- 适合项目初始化阶段使用

---

### 2.3 frontend-design (前端设计)

**Skill 描述**: 创建独特的、生产级前端界面，具有高设计质量。

**项目职责**:
- UI/UX 设计方案制定
- 视觉风格定义
- 用户交互流程设计
- 高质量视觉组件实现

**使用场景**:
- ✅ 设计图片网格浏览的视觉方案
- ✅ 实现侧边栏导航的交互设计
- ✅ 创建标签编辑器的 UI 组件
- ✅ 优化整体视觉体验

**触发时机**: 需要高质量视觉设计或构建 Web 组件/页面时

**与其他 Skill 的关系**:
- 与 `web-dev` 互补，更侧重设计质量
- 可与 `shadcn` 配合使用（如使用 React）

---

### 2.4 frontend-skill (前端着陆页技能)

**Skill 描述**: 用于需要强视觉效果的着陆页、网站、应用、原型、演示或游戏 UI。

**项目职责**:
- 关键页面的视觉设计（如欢迎页、首次使用引导）
- 高质量着陆页开发
- 视觉层次和动效设计

**使用场景**:
- ✅ 设计首次启动引导界面
- ✅ 创建欢迎/介绍页面
- ❌ 不适用于常规功能页面

**触发时机**: 需要强视觉表现的页面设计

---

## 三、UI 组件开发 Skills

### 3.1 shadcn (组件管理)

**Skill 描述**: 管理 shadcn 组件和项目，提供项目上下文、组件文档和使用示例。

**项目职责**:
- UI 组件库管理（如果使用 React）
- 组件样式定制
- 组件组合和复用

**使用场景**:
- ✅ 添加和使用 shadcn/ui 组件
- ✅ 组件样式调试
- ✅ 设计系统实施
- ❌ 不适用于 Vue 项目

**前提条件**:
- 项目必须使用 React 技术栈
- 需要有 `components.json` 配置文件

---

### 3.2 ui-ux-pro-max (UI/UX 专业指南)

**Skill 描述**: UI/UX 设计智能和实现指导，用于构建精致界面。

**项目职责**:
- UI 设计系统制定
- UX 流程优化
- 信息架构设计
- 无障碍设计
- 设计 Token 和组件规范

**使用场景**:
- ✅ 制定整体 UI 设计规范
- ✅ 优化用户交互流程（如拖拽操作的视觉反馈）
- ✅ 设计响应式布局方案
- ✅ 进行 UI 代码审查和改进

**触发时机**:
- 需要设计指导
- 构建 UI 库
- 改进现有 UI/UX

---

## 四、测试和质量保障 Skills

### 4.1 test-driven-development (测试驱动开发)

**Skill 描述**: 在编写实现代码之前，用于任何功能或 Bug 修复。

**项目职责**:
- 单元测试编写
- 集成测试设计
- 测试策略制定
- 代码质量保障

**使用场景**:
- ✅ 开发核心功能前编写测试（文件操作、数据库查询）
- ✅ 修复 Bug 时先写测试用例
- ✅ 为关键业务逻辑添加测试覆盖

**触发时机**: **必须在实现任何功能或修复 Bug 之前调用**

**重要原则**: TDD 流程 → 先写测试 → 再写实现 → 验证通过

---

### 4.2 webapp-testing (Web 应用测试)

**Skill 描述**: 使用 Playwright 与本地 Web 应用交互和测试的工具集。

**项目职责**:
- 前端功能测试
- 用户交互流程测试
- 浏览器兼容性测试
- UI 行为调试

**使用场景**:
- ✅ 测试拖拽导入功能
- ✅ 验证多选批量操作
- ✅ 测试图片浏览和缩放
- ✅ 捕获浏览器截图和日志

**触发时机**: 需要测试前端功能或调试 UI 行为时

---

### 4.3 TRAE-code-review (代码审查)

**Skill 描述**: 执行代码审查任务，适用于审查合并请求、代码差异。

**项目职责**:
- 代码质量审查
- 最佳实践检查
- 代码逻辑验证
- 合并请求审查

**使用场景**:
- ✅ 合并代码前的审查
- ✅ 代码重构后的质量检查
- ✅ 关键模块的代码评审

**触发时机**: 完成功能开发或准备合并代码时

---

### 4.4 security-best-practices (安全最佳实践)

**Skill 描述**: 执行语言和框架特定的安全最佳实践审查。

**项目职责**:
- 文件系统操作安全检查
- SQL 注入防护
- XSS 防护
- 用户输入验证

**使用场景**:
- ✅ 文件路径处理的安全性审查
- ✅ 数据库操作的安全检查
- ✅ 用户输入的验证和清洗
- ✅ 安全漏洞扫描

**触发时机**: 明确请求安全最佳实践指导、安全审查或安全编码帮助时

**支持语言**: Python, JavaScript/TypeScript, Go

---

## 五、规划和设计 Skills

### 5.1 brainstorming (头脑风暴)

**Skill 描述**: 在任何创建性工作之前必须使用 - 创建功能、构建组件、添加功能或修改行为。

**项目职责**:
- 功能需求探索
- 技术方案讨论
- 架构设计决策
- 用户场景分析

**使用场景**:
- ✅ 设计标签系统的交互方式
- ✅ 规划虚拟相册的实现方案
- ✅ 讨论性能优化策略
- ✅ 分析用户需求和技术可行性

**触发时机**: **必须在创建新功能、组件或修改行为之前调用**

**重要**: 这是一个强制性前置步骤

---

### 5.2 writing-plans (编写计划)

**Skill 描述**: 当有规格说明或需求时，在触碰代码之前使用。

**项目职责**:
- 功能实现计划编写
- 任务分解和排期
- 技术方案规划
- 风险评估

**使用场景**:
- ✅ 制定文件系统映射功能的实现计划
- ✅ 规划缓存系统的开发步骤
- ✅ 设计数据库架构方案
- ✅ 分解多模块开发任务

**触发时机**: 有明确需求和规格说明后，开始编码前

---

### 5.3 executing-plans (执行计划)

**Skill 描述**: 当你有书面实施计划时，在单独的会话中执行并带有审查检查点。

**项目职责**:
- 执行已制定的计划
- 分阶段实施功能
- 进度跟踪和检查
- 计划调整和优化

**使用场景**:
- ✅ 按照计划分步实现功能模块
- ✅ 执行性能优化计划
- ✅ 实施重构方案
- ✅ 逐步完成开发任务

**触发时机**: 有完整的实施计划需要执行时

---

## 六、框架和专业 Skills

### 6.1 electron (Electron 自动化)

**Skill 描述**: 通过 Chrome DevTools 协议自动化 Electron 桌面应用。

**项目职责**:
- Electron 应用自动化测试
- 桌面应用交互控制
- 应用性能监控
- 原生功能调试

**使用场景**:
- ✅ 测试 Electron 版本的桌面应用
- ✅ 自动化桌面应用交互流程
- ✅ 连接运行中的应用进行调试
- ❌ 不适用于 Tauri 技术栈

**触发时机**: 使用 Electron 技术栈并需要测试或自动化桌面应用时

---

### 6.2 vercel-react-best-practices (React 最佳实践)

**Skill 描述**: Vercel 工程团队的 React 和 Next.js 性能优化指南。

**项目职责**:
- React 组件性能优化
- 数据获取策略优化
- 打包体积优化
- 性能模式实施

**使用场景**:
- ✅ 优化 React 组件性能（如使用 React 技术栈）
- ✅ 改进数据加载策略
- ✅ 减少打包体积
- ✅ 实施性能最佳实践

**触发时机**: 编写、审查或重构 React/Next.js 代码时

---

### 6.3 cc-skill-coding-standards (编码标准)

**Skill 描述**: TypeScript、JavaScript、React 和 Node.js 开发的通用编码标准、最佳实践和模式。

**项目职责**:
- 代码风格规范化
- 最佳实践指导
- 设计模式应用
- 代码质量提升

**使用场景**:
- ✅ 制定项目编码规范
- ✅ 代码审查中的标准参考
- ✅ 解决编码风格问题
- ✅ 应用设计模式

**触发时机**: 需要编码标准指导或代码审查时

---

## 七、工具和辅助 Skills

### 7.1 git-commit (Git 提交)

**Skill 描述**: 执行带有约定式提交消息分析的 Git 提交。

**项目职责**:
- 智能生成提交信息
- 文件暂存管理
- 提交类型和范围自动检测
- 提交历史分析

**使用场景**:
- ✅ 完成功能开发后提交代码
- ✅ 批量修改后的代码提交
- ✅ Bug 修复的提交
- ✅ 重构代码的提交

**触发时机**: 用户明确要求提交代码或提及 "/commit"

**重要原则**:
- 未经用户明确要求，不要主动提交代码
- 遵循约定式提交规范

---

### 7.2 gh-cli (GitHub CLI)

**Skill 描述**: GitHub CLI 的全面参考，涵盖仓库、问题、拉取请求、Actions 等。

**项目职责**:
- GitHub 仓库管理
- Issue 和 PR 管理
- CI/CD 操作
- 项目管理

**使用场景**:
- ✅ 创建和管理 GitHub Issues
- ✅ 处理 Pull Requests
- ✅ 管理 GitHub Actions
- ✅ 仓库操作

**触发时机**: 需要使用 GitHub CLI 进行操作时

---

### 7.3 doc-coauthoring (文档协作)

**Skill 描述**: 指导用户通过结构化工作流编写文档。

**项目职责**:
- 技术文档编写
- API 文档生成
- 用户手册编写
- 开发文档维护

**使用场景**:
- ✅ 编写 API 文档
- ✅ 创建用户使用手册
- ✅ 编写技术规范文档
- ✅ 编写项目提案

**触发时机**: 用户要求编写文档、创建提案、起草规范时

---

### 7.4 mcp-builder (MCP 服务器构建)

**Skill 描述**: 创建高质量 MCP (Model Context Protocol) 服务器。

**项目职责**:
- 外部 API 集成
- 自定义工具开发
- 服务接口封装

**使用场景**:
- ✅ 集成外部图像处理服务
- ✅ 连接云存储 API
- ✅ 封装第三方工具

**触发时机**: 需要构建 MCP 服务器集成外部 API 或服务时

---

## 八、调试和问题解决 Skills

### 8.1 TRAE-debugger (调试器)

**Skill 描述**: 用于调试需要收集运行时证据的复杂问题。

**项目职责**:
- 复杂 Bug 调试
- 运行时问题诊断
- 性能问题分析
- 错误日志收集

**使用场景**:
- ✅ 文件操作错误的调试
- ✅ 数据库查询问题的诊断
- ✅ 性能瓶颈分析
- ✅ 内存泄漏排查

**触发时机**:
- 仅通过静态代码分析无法诊断的 Bug
- 用户明确要求运行时调试
- 多轮对话仍无法通过静态分析解决问题时

**工作流程**: 假设 → 插桩 → 复现 → 分析 → 修复 → 验证

---

## 九、专项功能 Skills

### 9.1 数据分析相关 (data-analysis)

虽然不是核心需求，但可用于：
- 分析用户使用数据（如果有收集）
- 生成统计报告
- 数据可视化

---

### 9.2 图表可视化 (chart-visualization)

可用于：
- 生成存储空间使用报告
- 创建相册统计图表
- 数据分析可视化

---

### 9.3 安全审查 (TRAE-security-review)

**Skill 描述**: 执行代码安全扫描任务。

**项目职责**:
- 安全漏洞扫描
- 代码安全审查
- 安全最佳实践建议
- 风险评估

**使用场景**:
- ✅ 合并请求的安全审查
- ✅ 代码差异的安全检查
- ✅ 安全漏洞风险提示
- ✅ 安全最佳实践反馈

**触发时机**: 审查合并请求、代码差异时需要安全检查

---

## 十、Skills 使用决策树

### 10.1 新功能开发流程

```
开始新功能
    ↓
brainstorming (必须)
    ↓
writing-plans
    ↓
test-driven-development (推荐)
    ↓
Code / web-dev / frontend-design
    ↓
webapp-testing / TRAE-code-review
    ↓
git-commit (用户要求时)
```

### 10.2 Bug 修复流程

```
发现 Bug
    ↓
TRAE-debugger (复杂问题)
    ↓
test-driven-development
    ↓
Code
    ↓
webapp-testing
    ↓
git-commit (用户要求时)
```

### 10.3 UI 开发流程

```
UI 需求
    ↓
brainstorming (必须)
    ↓
ui-ux-pro-max / frontend-design
    ↓
web-dev / frontend-skill
    ↓
webapp-testing
    ↓
git-commit (用户要求时)
```

---

## 十一、Skill 选择指南

### 11.1 根据开发阶段选择

| 开发阶段 | 推荐 Skills | 优先级 |
|---------|------------|--------|
| 需求分析 | brainstorming | 必须 |
| 架构设计 | writing-plans, ui-ux-pro-max | 高 |
| 测试设计 | test-driven-development | 高 |
| 功能实现 | Code, web-dev, frontend-design | 必须 |
| UI 开发 | frontend-design, shadcn (React) | 高 |
| 代码审查 | TRAE-code-review, cc-skill-coding-standards | 中 |
| 安全检查 | security-best-practices, TRAE-security-review | 中 |
| 测试验证 | webapp-testing, electron (Electron) | 高 |
| 问题调试 | TRAE-debugger | 按需 |
| 代码提交 | git-commit | 用户要求 |

### 11.2 根据技术栈选择

**Tauri + Vue 技术栈**:
- 核心开发: Code, web-dev
- UI 设计: frontend-design, ui-ux-pro-max
- 测试: webapp-testing, test-driven-development
- ❌ 不使用: shadcn, electron, vercel-react-best-practices

**Electron + React 技术栈**:
- 核心开发: Code, web-dev
- UI 组件: shadcn, frontend-design
- 框架优化: vercel-react-best-practices
- 桌面测试: electron
- 测试: webapp-testing, test-driven-development

---

## 十二、最佳实践建议

### 12.1 强制性前置 Skills

以下 Skills 必须在特定操作前调用：

1. **brainstorming**: 创建新功能/组件前必须使用
2. **test-driven-development**: 编写实现代码前推荐使用
3. **writing-plans**: 复杂任务开始前建议使用

### 12.2 组合使用建议

**完整功能开发**:
```
brainstorming + writing-plans + test-driven-development + Code + webapp-testing + TRAE-code-review
```

**UI 组件开发**:
```
brainstorming + ui-ux-pro-max + frontend-design + shadcn + webapp-testing
```

**性能优化**:
```
TRAE-debugger + vercel-react-best-practices + Code
```

**安全加固**:
```
security-best-practices + TRAE-security-review + TRAE-code-review
```

### 12.3 避免误用

1. **不要滥用 web-dev**: 仅用于新建项目，不用于现有项目修改
2. **git-commit 不要主动触发**: 必须等待用户明确要求
3. **electron 仅用于 Electron 技术栈**: Tauri 项目不适用
4. **shadcn 仅用于 React 项目**: Vue 项目不适用

---

## 十三、项目特定 Skills 应用场景

### 13.1 核心功能模块 Skills 映射

#### 文件系统映射管理
- brainstorming: 设计文件操作方案
- Code: 实现文件系统 API
- test-driven-development: 编写文件操作测试
- security-best-practices: 文件路径安全检查

#### 图片浏览系统
- brainstorming: 设计浏览交互方案
- ui-ux-pro-max: 设计浏览体验
- frontend-design: 实现网格布局
- webapp-testing: 测试浏览功能

#### 标签系统
- brainstorming: 设计标签数据结构
- writing-plans: 规划标签功能实现
- Code: 实现标签增删改查
- test-driven-development: 编写标签逻辑测试

#### 虚拟相册
- brainstorming: 设计虚拟相册架构
- writing-plans: 规划数据库设计
- Code: 实现相册关联逻辑
- webapp-testing: 测试多对多关系

#### 拖拽导入系统
- brainstorming: 设计拖拽交互
- frontend-design: 实现拖拽 UI
- webapp-testing: 测试拖拽行为
- TRAE-debugger: 调试拖拽问题

#### 缓存系统
- brainstorming: 设计缓存策略
- writing-plans: 规划缓存实现
- Code: 实现缓存逻辑
- test-driven-development: 测试缓存效果

### 13.2 性能优化 Skills 应用

#### 缩略图缓存优化
- TRAE-debugger: 分析性能瓶颈
- Code: 实现懒加载
- vercel-react-best-practices: 组件性能优化（React）

#### 数据库性能优化
- TRAE-debugger: 分析查询性能
- Code: 优化 SQL 查询
- test-driven-development: 性能测试

---

## 十四、注意事项和限制

### 14.1 Skill 触发限制

1. **不要主动触发 git-commit**: 必须等待用户明确要求
2. **brainstorming 是强制性前置**: 创建新功能前必须调用
3. **security-best-practices 仅支持特定语言**: Python, JavaScript/TypeScript, Go

### 14.2 技术栈限制

1. **shadcn**: 仅用于 React 项目
2. **electron**: 仅用于 Electron 项目
3. **vercel-react-best-practices**: 仅用于 React/Next.js 项目

### 14.3 Skill 组合限制

1. 不要同时使用 `web-dev` 和 `frontend-design` 做同一件事
2. 不要跳过 `brainstorming` 直接进入实现
3. 不要在没有计划的情况下开始复杂功能开发

---

## 十五、持续改进

### 15.1 文档维护

- 随着项目进展更新 Skills 使用情况
- 记录实际使用中遇到的问题
- 补充项目特定的最佳实践

### 15.2 团队协作

- 确保团队成员了解 Skills 使用规范
- 在代码审查中检查 Skills 使用是否合理
- 定期回顾和优化 Skills 使用流程

---

## 附录：快速参考表

| Skill 名称 | 核心用途 | 触发时机 | 优先级 |
|-----------|---------|---------|--------|
| brainstorming | 需求探索和方案设计 | 创建新功能前（强制） | ⭐⭐⭐⭐⭐ |
| Code | 功能实现和代码编写 | 需要编码时 | ⭐⭐⭐⭐⭐ |
| test-driven-development | 测试驱动开发 | 实现代码前 | ⭐⭐⭐⭐ |
| web-dev | 新建 Web 项目 | 从零开始搭建前端 | ⭐⭐⭐⭐ |
| frontend-design | UI 界面设计 | 需要高质量 UI | ⭐⭐⭐⭐ |
| ui-ux-pro-max | UI/UX 设计指导 | 设计阶段 | ⭐⭐⭐ |
| writing-plans | 编写实施计划 | 有明确需求后 | ⭐⭐⭐⭐ |
| executing-plans | 执行计划 | 有完整计划时 | ⭐⭐⭐ |
| webapp-testing | Web 应用测试 | 功能完成后 | ⭐⭐⭐⭐ |
| TRAE-debugger | 复杂问题调试 | 遇到难以诊断的 Bug | ⭐⭐⭐ |
| git-commit | 代码提交 | 用户明确要求时 | ⭐⭐ |
| security-best-practices | 安全审查 | 安全相关开发 | ⭐⭐⭐ |
| TRAE-code-review | 代码审查 | 合并代码前 | ⭐⭐⭐ |
| shadcn | React 组件库 | React 项目组件开发 | ⭐⭐⭐ |
| electron | Electron 自动化 | Electron 项目测试 | ⭐⭐⭐ |
| doc-coauthoring | 文档协作 | 编写文档时 | ⭐⭐ |

---

**文档版本**: v1.0
**更新日期**: 2026-07-12
**适用项目**: Lumibox 桌面相册管理系统