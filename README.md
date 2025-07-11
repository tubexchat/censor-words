# 敏感词替换管理系统

一个基于Next.js开发的敏感词替换管理系统，支持用户权限管理、敏感词库管理和Word文档批量处理。

## 功能特点

### 🔐 权限管理
- **管理员账号**：可以管理敏感词库、创建/删除用户、查看操作日志
- **操作员账号**：只能上传Word文档进行敏感词替换处理

### 📝 敏感词处理
- 支持Excel格式的敏感词库导入（第一列：敏感词，第二列：替换词）
- **智能替换算法**：按字数长度优先替换，避免"破财"变成"破cai"的问题
- 生成包含两段内容的处理结果：
  - 第一段：原文，敏感词用颜色标注
  - 第二段：替换后文本，替换词用颜色标注

### 📊 管理功能
- 用户管理：创建/删除操作员账号
- 敏感词库管理：上传更新Excel敏感词库
- 操作日志：查看所有用户的操作记录

## 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: SQLite (better-sqlite3)
- **文档处理**: mammoth, xlsx
- **认证**: JWT

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 创建环境变量

创建 `.env.local` 文件：

```bash
# JWT密钥，用于用户认证
JWT_SECRET=your-super-secret-jwt-key-here

# Node环境
NODE_ENV=development
```

### 3. 启动开发服务器

```bash
npm run dev
# 快速启动（推荐）
./start.sh

# 或者使用 npm 脚本
npm run pm2:start    # 启动应用
npm run pm2:stop     # 停止应用
npm run pm2:restart  # 重启应用
npm run pm2:logs     # 查看日志
npm run pm2:monit    # 监控面板
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 4. 默认账号

系统会自动创建默认管理员账号：
- 用户名：`admin`
- 密码：`admin123`

## 使用说明

### 管理员操作流程

1. 使用管理员账号登录
2. 在"敏感词库"标签页上传Excel敏感词库文件
3. 在"用户管理"标签页创建操作员账号
4. 在"操作日志"标签页查看系统使用情况

### 操作员操作流程

1. 使用操作员账号登录
2. 上传需要处理的Word文档
3. 点击"开始处理"，系统自动进行敏感词替换
4. 下载包含原文标注和替换后文本的处理结果

### Excel敏感词库格式

Excel文件应包含两列：
- 第一列：需要替换的敏感词
- 第二列：替换后的词

示例：
```
破财    ~
道家    D家
财      cai
```

系统会自动按字数长度排序，优先替换长词汇。

## 部署

### 本地部署

```bash
npm run build
npm run start
```

### Cloudflare部署

由于项目配置了Cloudflare Edge Runtime，可以直接部署到Cloudflare Pages：

1. 连接GitHub仓库到Cloudflare Pages
2. 设置构建命令：`npm run build`
3. 设置输出目录：`.next`
4. 配置环境变量：`JWT_SECRET`

注意：在Cloudflare环境中，数据库文件会存储在临时目录，重新部署后数据会丢失。建议在生产环境中使用外部数据库。

## 目录结构

```
├── app/
│   ├── api/                 # API路由
│   │   ├── auth/           # 用户认证
│   │   ├── users/          # 用户管理
│   │   ├── sensitive-words/ # 敏感词库管理
│   │   ├── replace/        # 文档处理
│   │   └── logs/           # 操作日志
│   ├── components/         # React组件
│   │   ├── LoginForm.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── OperatorDashboard.tsx
│   └── page.tsx           # 主页面
├── lib/
│   ├── database.ts        # 数据库操作
│   ├── auth.ts           # 认证工具
│   └── fileProcessor.ts  # 文件处理
└── data/                 # 数据库文件目录
```

## 注意事项

1. **数据库持久化**：在生产环境中，确保数据库文件的持久化存储
2. **文件大小限制**：根据服务器配置调整文件上传大小限制
3. **安全性**：及时修改默认管理员密码
4. **备份**：定期备份敏感词库和用户数据

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License
