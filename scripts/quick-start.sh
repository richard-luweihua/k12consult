#!/bin/bash

# 快速启动脚本
# 使用: bash scripts/quick-start.sh

set -e

echo "🚀 K12 Advisor Intake System - 快速启动"
echo "=========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js 未安装。请访问 https://nodejs.org 安装"
  exit 1
fi

echo "✓ Node.js $(node --version) 已安装"
echo "✓ npm $(npm --version) 已安装"

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo ""
  echo "📦 安装依赖中..."
  npm install
else
  echo "✓ 依赖已安装"
fi

# 检查环境变量
if [ ! -f ".env.local" ]; then
  echo ""
  echo "🔧 配置环境变量..."
  if [ -f ".env.example" ]; then
    cp .env.example .env.local
    echo "✓ 已从 .env.example 复制 .env.local"
    echo "⚠️  请编辑 .env.local 并填写实际的环境变量值"
  else
    echo "❌ 找不到 .env.example"
    exit 1
  fi
else
  echo "✓ .env.local 已存在"
fi

# 启动开发服务器
echo ""
echo "✓ 准备完毕！"
echo "📝 开始启动开发服务器..."
echo ""
echo "访问: http://localhost:3000"
echo "页面:"
echo "  - /              : 首页"
echo "  - /questionnaire : 前诊问卷"
echo "  - /result/:id    : 结果页"
echo "  - /advisor       : 顾问工作台"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

npm run dev
