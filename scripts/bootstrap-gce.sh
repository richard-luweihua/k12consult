#!/usr/bin/env bash

set -euo pipefail

CONFIG_FILE="${1:-.deploy/gce.env}"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

APP_NAME="${APP_NAME:-k12consult}"
APP_PORT="${APP_PORT:-3000}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/$APP_NAME}"
NODE_MAJOR="${NODE_MAJOR:-20}"
DOMAIN="${DOMAIN:-}"
SERVER_NAMES="${SERVER_NAMES:-${DOMAIN}}"

log() {
  printf "\n==> %s\n" "$1"
}

abort() {
  printf "错误: %s\n" "$1" >&2
  exit 1
}

require_sudo() {
  if ! command -v sudo >/dev/null 2>&1; then
    abort "当前系统没有 sudo，请手动以 root 执行安装步骤。"
  fi
}

current_node_major() {
  if ! command -v node >/dev/null 2>&1; then
    echo ""
    return
  fi

  node -p "process.versions.node.split('.')[0]"
}

write_nginx_config() {
  local target="/etc/nginx/sites-available/$APP_NAME"

  sudo tee "$target" >/dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_NAMES;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  if [[ ! -L "/etc/nginx/sites-enabled/$APP_NAME" ]]; then
    sudo ln -s "$target" "/etc/nginx/sites-enabled/$APP_NAME"
  fi

  sudo nginx -t
  sudo systemctl reload nginx
}

require_sudo

log "安装基础依赖"
sudo apt update
sudo apt install -y curl git nginx certbot python3-certbot-nginx

log "安装 Node.js $NODE_MAJOR"
if [[ "$(current_node_major)" != "$NODE_MAJOR" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt install -y nodejs
fi

log "安装 PM2"
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

log "创建应用目录"
sudo mkdir -p "$DEPLOY_PATH"
sudo chown -R "$USER":"$(id -gn)" "$DEPLOY_PATH"

if [[ -n "$SERVER_NAMES" ]]; then
  log "写入 Nginx 站点配置"
  write_nginx_config
else
  log "跳过 Nginx 域名配置"
  printf "提示: 还没设置 DOMAIN 或 SERVER_NAMES，稍后补上后可再次运行这个脚本。\n"
fi

log "环境检查"
printf "node: %s\n" "$(node -v)"
printf "npm: %s\n" "$(npm -v)"
printf "pm2: %s\n" "$(pm2 -v)"
printf "nginx: 已安装\n"
printf "应用目录: %s\n" "$DEPLOY_PATH"

printf "\n下一步:\n"
printf "1. 在本地把 .deploy/gce.env.example 复制为 .deploy/gce.env 并填写真实值。\n"
printf "2. 首次部署完成后，在服务器执行: pm2 startup\n"
printf "3. 如果域名已经解析到这台机器，再执行: sudo certbot --nginx -d your-domain.com\n"
