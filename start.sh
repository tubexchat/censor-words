#!/bin/bash

echo "🚀 启动 Censor Words 应用..."

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
  echo "📦 安装依赖..."
  npm install
fi

# 检查是否已构建
if [ ! -d ".next" ]; then
  echo "🔨 构建应用..."
  npm run build
fi

# 启动 PM2
echo "🎯 使用 PM2 启动应用在端口 4088..."
npm run pm2:start

echo "✅ 应用已启动！"
echo "🌐 访问地址: http://localhost:4088"
echo "📊 监控面板: npm run pm2:monit"
echo "📋 查看日志: npm run pm2:logs"
echo "🛑 停止应用: npm run pm2:stop" 