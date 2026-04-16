#!/usr/bin/env bash

set -euo pipefail

CONFIG_FILE="${1:-.deploy/gce.env}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  printf "找不到配置文件: %s\n" "$CONFIG_FILE" >&2
  printf "请先复制 .deploy/gce.env.example 为 .deploy/gce.env 并填写真实值。\n" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-}"
SSH_PORT="${SSH_PORT:-22}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/k12consult}"
APP_NAME="${APP_NAME:-k12consult}"
APP_PORT="${APP_PORT:-3000}"

required_vars=(DEPLOY_HOST DEPLOY_USER REPO_URL NEXT_PUBLIC_SITE_URL)
for name in "${required_vars[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    printf "缺少必填配置: %s\n" "$name" >&2
    exit 1
  fi
done

SSH_BASE=(ssh -p "$SSH_PORT")
SCP_BASE=(scp -P "$SSH_PORT")

if [[ -n "$SSH_KEY_PATH" ]]; then
  SSH_BASE+=(-i "$SSH_KEY_PATH")
  SCP_BASE+=(-i "$SSH_KEY_PATH")
fi

SSH_TARGET="$DEPLOY_USER@$DEPLOY_HOST"
TEMP_ENV_FILE="$(mktemp)"

cleanup() {
  rm -f "$TEMP_ENV_FILE"
}

trap cleanup EXIT

escape_env_value() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

append_env() {
  local key="$1"
  local value="${2:-}"
  printf '%s="%s"\n' "$key" "$(escape_env_value "$value")" >>"$TEMP_ENV_FILE"
}

append_env "NEXT_PUBLIC_SITE_URL" "${NEXT_PUBLIC_SITE_URL:-}"
append_env "NEXT_PUBLIC_SUPABASE_URL" "${NEXT_PUBLIC_SUPABASE_URL:-}"
append_env "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}"
append_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
append_env "SUPABASE_SECRET_KEY" "${SUPABASE_SECRET_KEY:-}"
append_env "SUPABASE_SERVICE_ROLE_KEY" "${SUPABASE_SERVICE_ROLE_KEY:-}"
append_env "WECOM_WEBHOOK_URL" "${WECOM_WEBHOOK_URL:-}"
append_env "WECOM_HIGH_PRIORITY_WEBHOOK_URL" "${WECOM_HIGH_PRIORITY_WEBHOOK_URL:-}"
append_env "ADMIN_ACCESS_PASSWORD" "${ADMIN_ACCESS_PASSWORD:-}"
append_env "ADVISOR_INVITE_CODE" "${ADVISOR_INVITE_CODE:-}"
append_env "PORT" "$APP_PORT"
append_env "NODE_ENV" "production"

printf "\n==> 检查 SSH 连通性\n"
"${SSH_BASE[@]}" "$SSH_TARGET" "echo 'SSH 连接成功'"

printf "\n==> 准备服务器目录\n"
"${SSH_BASE[@]}" "$SSH_TARGET" "mkdir -p '$DEPLOY_PATH'"

printf "\n==> 同步代码\n"
"${SSH_BASE[@]}" "$SSH_TARGET" "
  set -euo pipefail
  if [ -d '$DEPLOY_PATH/.git' ]; then
    git -C '$DEPLOY_PATH' fetch --all --prune
    git -C '$DEPLOY_PATH' checkout '$BRANCH'
    git -C '$DEPLOY_PATH' pull origin '$BRANCH'
  elif [ -d '$DEPLOY_PATH' ] && [ -n \"\$(find '$DEPLOY_PATH' -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)\" ]; then
    echo '目标目录已存在且不是 Git 仓库，请先手动清理或改一个新的 DEPLOY_PATH。' >&2
    exit 1
  else
    git clone --branch '$BRANCH' '$REPO_URL' '$DEPLOY_PATH'
  fi
"

printf "\n==> 上传生产环境变量\n"
"${SCP_BASE[@]}" "$TEMP_ENV_FILE" "$SSH_TARGET:$DEPLOY_PATH/.env.local"

printf "\n==> 安装依赖、构建并重启服务\n"
"${SSH_BASE[@]}" "$SSH_TARGET" "
  set -euo pipefail
  cd '$DEPLOY_PATH'
  npm install
  npm run build

  if pm2 describe '$APP_NAME' >/dev/null 2>&1; then
    PORT='$APP_PORT' NODE_ENV=production pm2 restart ecosystem.config.cjs --only '$APP_NAME' --update-env
  else
    PORT='$APP_PORT' NODE_ENV=production pm2 start ecosystem.config.cjs --only '$APP_NAME' --update-env
  fi

  pm2 save

  for attempt in \$(seq 1 30); do
    if curl -fsI 'http://127.0.0.1:$APP_PORT' >/dev/null; then
      curl -I 'http://127.0.0.1:$APP_PORT'
      exit 0
    fi

    sleep 1
  done

  echo '应用已启动，但健康检查在 30 秒内未通过。请检查 pm2 logs $APP_NAME。' >&2
  exit 1
"

printf "\n部署完成。\n"
printf "如果这是第一次部署，请在服务器执行一次: pm2 startup\n"
