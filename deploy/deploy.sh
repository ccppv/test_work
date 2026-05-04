#!/bin/bash
# deploy.sh — первичный деплой на чистый сервер
# Запускать от root: bash deploy.sh
set -euo pipefail

REPO="https://github.com/ccppv/test_work.git"
APP_DIR="/opt/business-dashboard"
BACKUP_DIR="/opt/_archive_$(date +%Y%m%d_%H%M%S)"
NGINX_CONF="/etc/nginx/sites-available/x1k.ru"
DOMAIN="x1k.ru"

echo "=== [1/7] Обновление системы и установка зависимостей ==="
apt-get update -q
apt-get install -y --no-install-recommends \
    git curl nginx certbot python3-certbot-nginx

# Docker
if ! command -v docker &>/dev/null; then
    echo "Устанавливаю Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Docker Compose v2
if ! docker compose version &>/dev/null; then
    echo "Устанавливаю Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
fi

echo "=== [2/7] Архивирование текущего сайта ==="
if [ -d "$APP_DIR" ]; then
    echo "Перемещаю $APP_DIR → $BACKUP_DIR"
    mv "$APP_DIR" "$BACKUP_DIR"
fi

# Архивируем старый nginx-конфиг если есть
OLD_NGINX=$(ls /etc/nginx/sites-enabled/ 2>/dev/null | head -1 || true)
if [ -n "$OLD_NGINX" ] && [ "$OLD_NGINX" != "x1k.ru" ]; then
    echo "Архивирую nginx конфиг: $OLD_NGINX"
    mkdir -p "$BACKUP_DIR/nginx"
    cp "/etc/nginx/sites-enabled/$OLD_NGINX" "$BACKUP_DIR/nginx/" || true
    rm -f "/etc/nginx/sites-enabled/$OLD_NGINX"
fi

echo "=== [3/7] Клонирование репозитория ==="
git clone "$REPO" "$APP_DIR"
cd "$APP_DIR"

echo "=== [4/7] Создание .env.docker ==="
if [ ! -f .env.docker ]; then
    cp .env.docker.example .env.docker
    echo ""
    echo "ВНИМАНИЕ: заполните .env.docker перед запуском!"
    echo "  nano $APP_DIR/.env.docker"
    echo ""
    echo "Нужно добавить:"
    echo "  ANTHROPIC_API_KEY=sk-ant-..."
    echo "  GEMINI_API_KEY=AIza..."
    echo "  POSTGRES_PASSWORD=<strong_password>"
    echo ""
    echo "Нажмите Enter после заполнения файла..."
    read -r
fi

echo "=== [5/7] Настройка nginx ==="
cp deploy/nginx.conf "$NGINX_CONF"
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/x1k.ru
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== [6/7] Запуск Docker Compose ==="
FRONTEND_ORIGIN=http://$DOMAIN docker compose up -d --build

echo "=== [7/7] Ожидание готовности сервисов ==="
echo "Жду 30 секунд..."
sleep 30
docker compose ps

echo ""
echo "=== Деплой завершён ==="
echo "Сайт доступен: http://$DOMAIN"
echo ""
echo "Для получения SSL-сертификата выполните:"
echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "Команды управления:"
echo "  cd $APP_DIR"
echo "  docker compose logs -f          # логи"
echo "  docker compose restart frontend # перезапуск фронта"
echo "  docker compose down             # остановить всё"
echo "  docker compose up -d --build    # пересобрать и запустить"
