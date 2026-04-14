#!/bin/bash

# 部署前检查脚本
# 使用: bash scripts/pre-deployment-check.sh

set -e

echo "🚀 K12 Advisor Intake System - 部署前检查"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数
CHECKS_PASSED=0
CHECKS_FAILED=0

# 检查函数
check() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
  fi
}

# 1. Node.js 版本检查
echo "检查开发环境..."
node --version > /dev/null
check "Node.js 已安装"

npm --version > /dev/null
check "npm 已安装"

# 2. 依赖检查
echo ""
echo "检查项目依赖..."
[ -d "node_modules" ]
check "依赖已安装"

# 3. 文件存在性检查
echo ""
echo "检查关键文件..."
[ -f "package.json" ]
check "package.json 存在"

[ -f "next.config.js" ]
check "next.config.js 存在"

[ -f ".gitignore" ]
check ".gitignore 存在"

[ -f "README.md" ]
check "README.md 存在"

# 4. 环境变量检查
echo ""
echo "检查环境变量..."
[ -f ".env.local" ]
check ".env.local 存在"

grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local
check "NEXT_PUBLIC_SUPABASE_URL 已配置"

# 5. Git 检查
echo ""
echo "检查 Git 配置..."
git rev-parse --git-dir > /dev/null 2>&1
check "Git 仓库已初始化"

git remote get-url origin > /dev/null 2>&1
check "Git 远程仓库已配置"

# 6. 构建检查
echo ""
echo "执行生产构建检查..."
npm run build > /dev/null 2>&1
check "生产构建成功"

# 7. 构建输出检查
echo ""
echo "检查构建输出..."
[ -d ".next" ]
check ".next 目录已生成"

[ -f ".next/BUILD_ID" ]
check "BUILD_ID 文件已生成"

# 8. 清理
echo ""
echo "清理中..."
rm -rf .next
echo "✓ 清理完成"

# 最终报告
echo ""
echo "=========================================="
echo -e "检查结果: ${GREEN}${CHECKS_PASSED} 通过${NC}, ${RED}${CHECKS_FAILED} 失败${NC}"
echo "=========================================="

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ 所有检查通过，可以开始部署！${NC}"
  echo ""
  echo "接下来的步骤："
  echo "1. 确认所有代码已commit: git status"
  echo "2. 推送到GitHub: git push origin main"
  echo "3. 访问 Vercel 仪表板开始部署"
  exit 0
else
  echo -e "${RED}✗ 有 ${CHECKS_FAILED} 个检查失败，请修复后再部署${NC}"
  exit 1
fi
