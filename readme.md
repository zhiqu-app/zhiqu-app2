# 知序 · AI 学习空间
> 学习不是赶路，是一点点看清方向。
知序是一个面向大学生的 **AI 辅助学习空间**。它把课程资料、知识星图、题库练习、错题复习、学习计划和学习报告放在同一个工作区里，帮助学生从「资料堆」走向「结构化的理解」。
项目采用前后端分离架构：
- **前端**：Vue 2.7 + Vite 5 + Vue Router 3 + Less + GSAP
- **后端**：FastAPI + SQLAlchemy 2 + Pydantic 2 + Alembic
- **数据库**：MySQL 8.0 / 8.4
- **实时能力**：WebSocket 学习提醒
- **可选能力**：接入 OpenAI 兼容接口的课程资料问答
当前后端提供 **42 个 REST 接口 + 1 个 WebSocket 端点**，数据库迁移版本为 **0007**。

## 项目简介
大学学习的问题往往不是「没有资料」，而是：
- 资料散落在课件、PDF、笔记和题库里，找不到主线；
- 知识点之间没有连成结构，复习时只能从头翻；
- 练习、错题和复习计划各自为政，缺少反馈闭环；
- 学习节奏靠感觉，很难看到自己真正推进了什么。
知序围绕「课程」组织学习数据：
1. **课程**是资料、题库、知识星图和复习计划的最小组织单位；
2. **知识星图**由用户为自己的课程手动配置知识点与关系，而不是假装自动解析一切；
3. **练习与错题**绑定课程和题库，作答后进入错题本与学习报告；
4. **复习计划**支持自定义清单和习题计划，并通过 WebSocket 推送到期提醒；
5. **AI 研习室**优先基于课程资料做检索问答，配置模型后才调用外部大模型。
正式注册的账号默认是空数据；只有用户显式点击「在线体验」时，才会创建带示例数据的体验账号。

## 功能特性
### 账号与学习空间
- 邮箱验证码注册（QQ 邮箱 SMTP）
- 邮箱 + 密码登录、会话恢复、退出登录
- Bearer Token 鉴权，令牌保存在 `sessionStorage`
- 「在线体验」独立体验账号，便于快速演示
- 个人资料、学习偏好与提醒设置
### 学习总览
- 课程数量、作答次数、正确率、待完成计划
- 当前课程知识星图预览
- 继续学习、今日复习、快捷入口
### 课程与资料
- 创建、归档、恢复、删除课程
- 上传 TXT / Markdown / PDF 课程资料
- 资料预览、删除、PDF 原件读取
- 课程详情、章节信息、学习进度
- 按课程组织题库与知识星图
### 知识星图
- 课程级知识点与连线配置
- 知识点分组（大知识点）
- 可选关联复习任务
- 总览页 / 知识路线页 / 课程详情页复用同一份课程图谱
- 手动配置，不自动编造知识关系
### 题库与练习
- 课程题库查看
- 手动新增单选题
- JSON 批量导入题目（完整重复自动跳过）
- 按课程出题、提交作答、即时判分
- 错题本、错题加入复习计划
- 作答历史分页与按课程筛选
### 复习计划与提醒
- 自定义计划（父任务 + 子任务清单）
- 习题计划（绑定课程与题目）
- 到期提醒、完成提醒、未读通知
- WebSocket 实时刷新通知与计划
- 支持重新读取历史通知，断线后从数据库恢复
### 学习报告
- 作答量、正确率、课程分布
- 近期学习趋势与薄弱知识点
- 数据来自真实作答记录
### AI 研习室
- 基于课程资料检索并回答学习问题
- 课程问答历史持久化
- 未配置模型时使用本地检索模式
- 配置 `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` 后切换为模型问答
### 个人与设置
- 修改昵称、专业、年级等资料
- 学习偏好与动效设置
- 检查后端连接
- 导出本人学习记录
- 确认后清空本人学习数据
### 交互与可访问性
- Hash 路由，部署简单，刷新不依赖额外 rewrite
- 页面过渡、数字动效、知识星图动画
- 尊重 `prefers-reduced-motion` 与用户动效偏好
- 键盘可操作的星图节点、弹窗焦点管理与 ESC 关闭
- 响应式布局，适配桌面与移动端

## 技术栈
### 前端
| 技术 | 版本 | 用途 |
|---|---|---|
| Vue | 2.7.16 | 页面与组件 |
| Vue Router | 3.6.5 | Hash 路由与导航守卫 |
| Vite | 5.4.21 | 开发服务器与生产构建 |
| Less | 4.2.2 | 样式与设计令牌 |
| GSAP | 3.15.0 | 首屏与页面动效 |
| Axios | 1.20 | HTTP 请求封装 |
| Prettier | 3.5.3 | 代码格式化 |
### 后端
| 技术 | 版本 | 用途 |
|---|---|---|
| FastAPI | 0.156 | REST / WebSocket 应用 |
| Uvicorn | 0.54 | ASGI 服务器 |
| Pydantic | 2.14 | 请求校验与响应模型 |
| SQLAlchemy | 2.0 | ORM 与事务 |
| Alembic | 1.20 | 数据库迁移 |
| PyMySQL | 1.2 | MySQL 驱动 |
| websockets | 15.0.1 | WebSocket 运行时 |
| pypdf | 6.21 | PDF 文本解析 |
| python-dotenv | 1.2 | `.env` 配置加载 |

### 运行环境
- Node.js **18+**
- Python **3.11+**（推荐 3.12）
- MySQL **8.0+**（不支持 SQLite 作为生产库）
- Nginx（生产环境反向代理）
- QQ 邮箱 SMTP（邮箱注册验证码，可选但注册必需）

## 快速开始
### 1. 准备 MySQL
创建数据库和应用账号（字符集必须是 `utf8mb4`，排序规则建议 `utf8mb4_bin`）：
```sql
CREATE DATABASE IF NOT EXISTS `zhiqu_team`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER IF NOT EXISTS 'zhiqu_team_app'@'localhost'
  IDENTIFIED BY '你的数据库密码';
CREATE USER IF NOT EXISTS 'zhiqu_team_app'@'127.0.0.1'
  IDENTIFIED BY '你的数据库密码';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON `zhiqu_team`.* TO 'zhiqu_team_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON `zhiqu_team`.* TO 'zhiqu_team_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

MySQL 需要支持 20 MB PDF，`max_allowed_packet` 必须至少 **64 MB**：

```sql
SET PERSIST max_allowed_packet = 67108864;
```

### 2. 启动后端
Linux / macOS：
```bash
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -U pip
.venv/bin/python -m pip install -r requirements.lock.txt
cp .env.example .env
# 编辑 .env，至少填写 MYSQL_* 和 CORS_ORIGINS
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m uvicorn app.main:app \
  --host 127.0.0.1 --port 8000 \
  --workers 1 --ws websockets --ws-max-size 4096
```
Windows PowerShell：
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -U pip
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 --ws websockets --ws-max-size 4096
```
验证：
```bash
curl http://127.0.0.1:8000/api/v1/health
```
期望返回：
```json
{"status":"ok","database":"mysql","version":"2.6.0","assistantMode":"retrieval"}
```
接口文档：
- Swagger UI：`http://127.0.0.1:8000/docs`
- ReDoc：`http://127.0.0.1:8000/redoc`
- API 首页：`http://127.0.0.1:8000/api/v1`

### 3. 启动前端
```bash
npm ci
npm run dev
```
开发地址：`http://127.0.0.1:5173`。
开发环境默认请求 `http://127.0.0.1:8000/api/v1`，不需要额外配置。如需修改，在 `.env.local` 中写：
```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```
## 设计边界
知序是一个学习空间，不是「全自动学习机」。当前版本明确不包含：
- 教师/学生角色与考试权限
- 找回密码
- OCR 图片识别
- 自动知识抽取
- 自动出题
- 多实例共享通知总线
- 完整数据库备份能力（导出仅包含本人学习记录，不含 PDF 二进制、题库和星图）
其他说明：
- 知识星图由用户为自己的课程手动配置，不声称自动解析所有资料。
- AI 问答默认基于资料检索；只有配置模型后才请求外部服务。
- 正式账号失败时显示错误和重试，不自动回退到假数据。
- 在线体验账号独立创建，只有用户显式点击才会生成。
- 单 worker 是当前通知功能的运行前提。
---

## 说明
本项目为「智传杯」Web 设计大赛参赛作品，代码与设计主要用于学习、交流与竞赛展示。
- 前端仓库：`zhiqu-app/zhiqu-app2`
- 后端文档：见 `backend/docs/`
- 项目名称：知序（Zhixu）
- 数据库迁移：0007
