# 阿里云部署指南

## 1. 服务器选购

**推荐配置：**
- 实例：ECS 2vCPU 2GB 内存
- 系统：Ubuntu 22.04
- 磁盘：40GB 系统盘
- 带宽：按量或 1-3Mbps 固定

**新用户优惠：** 阿里云搜索"免费试用"→ ECS 首年 ¥100 内

## 2. 安装 Docker

SSH 登录服务器后：

```bash
curl -fsSL https://get.docker.com | bash
apt install -y docker-compose-plugin
```

## 3. 部署步骤

```bash
# 克隆项目
git clone https://github.com/shibazichuan/my-site.git /opt/my-site
cd /opt/my-site

# 配置
cp .env.example .env
vim .env   # 修改密码和密钥

# 启动
docker compose up -d --build

# 迁移 + 管理员
docker exec my-site-backend-1 alembic upgrade head
docker exec my-site-backend-1 python -m app.seed
```

## 4. SSL 证书

```bash
apt install -y certbot
certbot certonly --standalone -d your-domain.com
```

证书在 `/etc/letsencrypt/live/your-domain.com/`

## 5. 域名 + DNS

1. 域名解析 → A 记录指向 ECS 公网 IP
2. Nginx 监听 80/443，证书路径指向 Let's Encrypt

## 6. 安全组

阿里云控制台 → 安全组 → 入方向开放：
- 80 (HTTP)
- 443 (HTTPS)
- 22 (SSH)

## 7. 看门狗

```bash
# crontab -e  增加自动重启
@reboot cd /opt/my-site && docker compose up -d
```
