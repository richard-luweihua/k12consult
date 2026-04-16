#!/bin/bash

# K12Consult 环境变量自动设置脚本
# 自动设置 Vercel 环境变量，无需手动操作

set -e

echo "🚀 K12Consult 环境变量自动设置"

# 检查是否登录Vercel
if ! vercel whoami > /dev/null 2>&1; then
    echo "❌ 请先登录Vercel"
    exit 1
fi

echo "📝 正在设置环境变量..."

# 设置环境变量 (使用占位符，用户稍后更新)
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://your-project.supabase.co" --force
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production <<< "your_publishable_key" --force
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "your_anon_key" --force
vercel env add SUPABASE_SECRET_KEY production <<< "your_secret_key" --force
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "your_service_role_key" --force
vercel env add WECOM_WEBHOOK_URL production <<< "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=your_key" --force
vercel env add WECOM_HIGH_PRIORITY_WEBHOOK_URL production <<< "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=your_high_priority_key" --force
vercel env add ADMIN_ACCESS_PASSWORD production <<< "your_admin_password" --force
vercel env add NEXT_PUBLIC_SITE_URL production <<< "https://www.skymirror.tech" --force

echo "✅ 环境变量设置完成"
echo ""
echo "⚠️  重要提醒："
echo "   这些是占位符值，请立即在 Vercel 仪表板中更新为真实值："
echo "   https://vercel.com/dashboard → 您的项目 → Settings → Environment Variables"
echo ""
echo "🔄 正在尝试部署..."

# 尝试部署
if vercel --prod --yes; then
    echo "✅ 部署成功！"
    vercel ls | tail -5
else
    echo "❌ 部署失败，请检查环境变量"
fi

echo ""
echo "🎉 设置完成！请更新真实的环境变量值以使应用正常工作。"