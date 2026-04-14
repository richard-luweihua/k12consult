#!/bin/bash

# K12Consult Vercel 自动部署配置脚本
# 使用方法: ./scripts/auto-deploy.sh <github-repo-url> [vercel-token]

set -e

GITHUB_REPO_URL=$1
VERCEL_TOKEN=$2

echo "🚀 开始自动配置 K12Consult 项目部署到 Vercel"

# 检查是否为Git仓库
if [ ! -d ".git" ]; then
    echo "📝 初始化Git仓库..."
    git init
    git add .
    git commit -m "🎯 Initial commit: K12Consult advisor system"
fi

# 设置GitHub远程仓库
if [ -n "$GITHUB_REPO_URL" ]; then
    echo "🔗 设置GitHub远程仓库: $GITHUB_REPO_URL"
    git remote add origin "$GITHUB_REPO_URL" 2>/dev/null || git remote set-url origin "$GITHUB_REPO_URL"
    git branch -M main
    git push -u origin main
    echo "✅ 代码已推送到GitHub"
else
    echo "⚠️  请提供GitHub仓库URL作为第一个参数"
    echo "   示例: ./scripts/auto-deploy.sh https://github.com/username/k12consult"
    exit 1
fi

# Vercel部署
if [ -n "$VERCEL_TOKEN" ]; then
    echo "🔧 配置Vercel CLI..."
    vercel login --token "$VERCEL_TOKEN"

    echo "📦 部署到Vercel..."
    vercel --prod --yes

    echo "✅ 项目已部署到Vercel!"
    echo "🌐 查看部署状态: vercel ls"
else
    echo "📋 Vercel手动配置步骤:"
    echo "1. 访问 https://vercel.com 并登录"
    echo "2. 点击 'Import Project'"
    echo "3. 连接您的GitHub仓库: $GITHUB_REPO_URL"
    echo "4. 配置环境变量 (见 DEPLOYMENT.md)"
    echo "5. 部署项目"
fi

echo "🎉 配置完成! 请检查部署状态并配置环境变量。"