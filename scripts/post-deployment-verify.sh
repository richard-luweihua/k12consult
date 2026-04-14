#!/bin/bash

# 部署后验证脚本
# 使用: bash scripts/post-deployment-verify.sh https://your-deployment-url

if [ -z "$1" ]; then
  echo "用法: bash scripts/post-deployment-verify.sh <deployment-url>"
  echo "例子: bash scripts/post-deployment-verify.sh https://k12-advisor-intake.vercel.app"
  exit 1
fi

BASE_URL="$1"
PASS=0
FAIL=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 K12 Advisor Intake System - 部署后验证"
echo "=========================================="
echo "部署 URL: $BASE_URL"
echo ""

# 验证函数
verify_endpoint() {
  local url="$1"
  local description="$2"
  local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  
  if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 302 ]; then
    echo -e "${GREEN}✓${NC} $description ($status_code)"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $description (HTTP $status_code)"
    ((FAIL++))
  fi
}

# 验证页面内容
verify_content() {
  local url="$1"
  local description="$2"
  local keyword="$3"
  local response=$(curl -s "$url")
  
  if echo "$response" | grep -q "$keyword"; then
    echo -e "${GREEN}✓${NC} $description (找到关键字)"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $description (缺少关键字: $keyword)"
    ((FAIL++))
  fi
}

# 1. 检查基本连接
echo "检查基本连接..."
verify_endpoint "$BASE_URL/" "首页加载"
verify_endpoint "$BASE_URL/questionnaire" "前诊问卷"
verify_endpoint "$BASE_URL/advisor" "顾问工作台"

# 2. 检查页面内容
echo ""
echo "检查页面内容..."
verify_content "$BASE_URL/" "首页标题" "K12 Advisory"
verify_content "$BASE_URL/questionnaire" "问卷表单" "form"
verify_content "$BASE_URL/advisor" "队列信息" "advisor\|顾问\|工作台"

# 3. 检查 API 端点
echo ""
echo "检查 API 端点..."
verify_endpoint "$BASE_URL/api/intake" "前诊 API"
verify_endpoint "$BASE_URL/api/leads" "线索 API"

# 4. 检查性能
echo ""
echo "检查性能..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/")
if (( $(echo "$RESPONSE_TIME < 3" | bc -l) )); then
  echo -e "${GREEN}✓${NC} 首页响应时间: ${RESPONSE_TIME}s (< 3s)"
  ((PASS++))
else
  echo -e "${YELLOW}⚠${NC} 首页响应时间: ${RESPONSE_TIME}s (> 3s)"
fi

# 5. 检查静态资源
echo ""
echo "检查静态资源..."
CSS_CHECK=$(curl -s -I "$BASE_URL/_next/static" | head -1)
if echo "$CSS_CHECK" | grep -q "HTTP.*2\|HTTP.*3"; then
  echo -e "${GREEN}✓${NC} 静态资源可访问"
  ((PASS++))
else
  echo -e "${YELLOW}⚠${NC} 静态资源可访问性不确定"
fi

# 6. 检查 SEO 元数据
echo ""
echo "检查 SEO 元数据..."
verify_content "$BASE_URL/" "Meta 标签" "charset\|viewport"

# 最终报告
echo ""
echo "=========================================="
echo -e "验证结果: ${GREEN}${PASS} 通过${NC}, ${RED}${FAIL} 失败${NC}"
echo "=========================================="

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✓ 部署验证成功！${NC}"
  echo ""
  echo "建议的后续步骤："
  echo "1. 在浏览器中打开并测试: $BASE_URL"
  echo "2. 完成问卷提交流程测试"
  echo "3. 验证数据库连接"
  echo "4. 测试企业微信通知（如配置）"
  echo "5. 监控错误日志"
  exit 0
else
  echo -e "${RED}✗ 验证遇到 ${FAIL} 个问题${NC}"
  echo ""
  echo "故障排查步骤："
  echo "1. 检查 Vercel 部署日志"
  echo "2. 验证环境变量配置"
  echo "3. 检查 Supabase 连接"
  echo "4. 查看浏览器控制台错误"
  exit 1
fi
