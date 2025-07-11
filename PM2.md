# PM2 部署指南

本项目已配置支持 PM2 进程管理器，端口设置为 4088。

## 安装 PM2

如果您还没有安装 PM2，请全局安装：

```bash
npm install -g pm2
```

## 项目安装和构建

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

## PM2 命令

### 启动应用
```bash
npm run pm2:start
```

### 停止应用
```bash
npm run pm2:stop
```

### 重启应用
```bash
npm run pm2:restart
```

### 重载应用（零停机时间）
```bash
npm run pm2:reload
```

### 删除应用
```bash
npm run pm2:delete
```

### 查看日志
```bash
npm run pm2:logs
```

### 监控应用
```bash
npm run pm2:monit
```

## 直接使用 PM2 命令

```bash
# 启动
pm2 start ecosystem.config.js

# 查看所有进程
pm2 list

# 查看进程详情
pm2 show censor-words

# 查看实时日志
pm2 logs censor-words --lines 50

# 重启所有进程
pm2 restart all

# 停止所有进程
pm2 stop all

# 删除所有进程
pm2 delete all
```

## 配置说明

- **应用名称**: censor-words
- **端口**: 4088
- **运行模式**: fork
- **实例数量**: 1
- **最大内存**: 1G
- **日志目录**: ./logs/

## 访问应用

应用启动后，可通过以下地址访问：
- 本地: http://localhost:4088
- 服务器: http://your-server-ip:4088

## 开机自启动

如果希望应用在服务器重启后自动启动：

```bash
# 保存当前 PM2 进程列表
pm2 save

# 生成开机启动脚本
pm2 startup

# 按照提示执行相应命令（通常需要 sudo 权限）
```

## 注意事项

1. 确保端口 4088 未被其他应用占用
2. 日志文件会自动创建在 `./logs/` 目录下
3. 应用会在内存使用超过 1G 时自动重启
4. 支持自动重启，最多连续重启 10 次 