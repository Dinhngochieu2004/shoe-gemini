# Web Server — Docker Swarm + Nginx Reverse Proxy

> **Đối tượng đọc**: Sinh viên mới học. Mỗi lệnh đều có giải thích "tại sao", không chỉ "gõ gì".
> **Vai trò server này**: Chạy ứng dụng Shoe (Frontend + Backend) dưới dạng Docker Swarm, đứng sau Nginx làm reverse proxy + kết thúc TLS.

---

## 1. Tổng Quan Kiến Trúc

```
Internet
   │  HTTP:80 / HTTPS:443
   ▼
pfSense Firewall
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│  WEB SERVER  (ens33: 192.168.159.10 | ens34: 10.10.10.10)│
│                                                          │
│   Nginx Reverse Proxy ── SSL (Certbot, auto-renew 90d)   │
│   (TLS Termination, Replicas: 2)                         │
│        │                                                 │
│        ├──▶ Frontend  (Replicas: 2)                      │
│        └──▶ Backend   (Replicas: 2)                      │
│                  │                                       │
│        Docker Swarm Cluster + Overlay Network            │
└──────────────────────────────────────────────────────────┘
        │ TLS                          │ Get/Set Token (TLS)
        ▼                              ▼
   MongoDB Atlas                  Redis Cloud

Tích hợp giám sát:
  Node Exporter :9100  ──▶ Prometheus (10.10.10.32)
  Zabbix Agent  :10050 ──▶ Zabbix Server (10.10.10.31)
  Filebeat      :5200  ──▶ ElasticSearch (10.10.10.41)
```

**Giải thích khái niệm cho người mới:**

- **Reverse proxy**: một "người gác cổng" nhận mọi request từ internet rồi chuyển vào đúng container bên trong. Người dùng không bao giờ chạm trực tiếp vào app.
- **TLS Termination**: Nginx là nơi giải mã HTTPS. Bên trong cluster các container nói chuyện HTTP (mạng nội bộ đã an toàn), giảm tải mã hóa cho app.
- **Docker Swarm**: công cụ chạy nhiều bản sao (replica) của container, tự khởi động lại khi chết, tự chia tải.

---

## 2. Yêu Cầu Phần Cứng (VMware)

| Thành phần | Tối thiểu          | Khuyến nghị        |
| ---------- | ------------------ | ------------------ |
| RAM        | 4 GB               | 8 GB               |
| CPU        | 2 vCPU             | 4 vCPU             |
| Disk       | 40 GB              | 60 GB              |
| OS         | Ubuntu 22.04 LTS   | Ubuntu 22.04 LTS   |
| Card mạng  | 2 (NAT + Internal) | 2 (NAT + Internal) |

> **Tại sao 2 card mạng?** `ens33` (NAT) để nhận traffic từ internet; `ens34` (Internal 10.10.10.0/24) để nói chuyện với các server nội bộ (monitoring, logging) mà không lộ ra ngoài.

---

## 3. Cấu Hình Mạng (Netplan)

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  ethernets:
    ens33: # Card NAT — internet
      dhcp4: false
      addresses: [192.168.159.10/24]
      routes:
        - to: default
          via: 192.168.159.2
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
    ens34: # Card Internal — mạng nội bộ
      dhcp4: false
      addresses: [10.10.10.10/24]
  version: 2
```

```bash
sudo netplan apply
ping -c 3 8.8.8.8          # kiểm tra ra internet được
```

> **Lưu ý**: Không dùng `gateway4` (đã deprecated từ Ubuntu 22.04). Dùng `routes` như trên.

---

## 4. Fix Hostname

Tránh lỗi `unable to resolve host` mỗi khi chạy sudo:

```bash
echo "127.0.0.1 webserver" | sudo tee -a /etc/hosts
sudo hostnamectl set-hostname webserver
```

---

## 5. Cài Docker Engine

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release

# Thêm GPG key của Docker — để apt tin tưởng gói tải về là chính chủ
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Thêm repo Docker (Ubuntu mặc định không có Docker bản mới)
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker
docker --version
```

Cho user hiện tại dùng Docker không cần `sudo` (đỡ phải gõ sudo mỗi lệnh):

```bash
sudo usermod -aG docker $USER
newgrp docker
```

---

## 6. Khởi Tạo Docker Swarm + Overlay Network

```bash
# Biến VM này thành Manager Node của Swarm.
# --advertise-addr dùng IP nội bộ để worker (nếu có) join vào.
docker swarm init --advertise-addr 10.10.10.10

docker node ls      # phải thấy node này ở trạng thái "Ready / Leader"
```

> **Lab note**: Bài này chạy single-node Swarm (1 máy vừa là manager vừa chạy container). Swarm vẫn hoạt động bình thường.

Tạo **Overlay Network** — mạng ảo để các container nói chuyện với nhau bằng tên service:

```bash
docker network create --driver overlay --attachable shoe-network
docker network ls | grep shoe-network
```

---

## 7. SSL Certificate (Certbot)

```bash
sudo apt install -y certbot

# Có domain thật:
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

> **Chưa có domain (lab)** → tạo self-signed cert để test HTTPS:
>
> ```bash
> sudo mkdir -p /etc/letsencrypt/live/shoe
> sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
>   -keyout /etc/letsencrypt/live/shoe/privkey.pem \
>   -out /etc/letsencrypt/live/shoe/fullchain.pem \
>   -subj "/C=VN/ST=HCM/O=Lab/CN=192.168.159.10"
> ```

Certbot tự gia hạn mỗi 90 ngày — kiểm tra cơ chế tự động:

```bash
sudo certbot renew --dry-run
```

---

## 8. Cấu Hình Nginx Reverse Proxy

```bash
sudo mkdir -p /etc/nginx/conf.d
sudo nano /etc/nginx/conf.d/shoe-app.conf
```

```nginx
# Mọi request HTTP đều bị đẩy sang HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/shoe/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shoe/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Security headers — giảm rủi ro XSS, clickjacking
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location /api/ {                       # request API → Backend
        proxy_pass         http://backend:5000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location / {                           # còn lại → Frontend
        proxy_pass         http://frontend:80;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

> **Quan trọng**: `frontend` và `backend` là **tên service** trong Docker Swarm, không phải IP. Swarm tự phân giải tên này thành container đang sống.

---

## 9. Docker Secrets (Bảo Mật Thông Tin Nhạy Cảm)

Thay vì viết chuỗi kết nối DB thẳng vào file (dễ lộ), ta dùng Docker Secret — Swarm mã hóa và chỉ mount vào đúng container cần.

```bash
# ⚠️ Đây là PLACEHOLDER — thay bằng giá trị thật của bạn, ĐỪNG commit lên Git
printf 'mongodb+srv://USER:PASSWORD@cluster.mongodb.net/shoedb' | docker secret create mongo_uri -
printf 'rediss://USER:PASSWORD@redis-host:6380'                 | docker secret create redis_url -
printf 'CHANGE_ME_super_secret_jwt'                             | docker secret create jwt_secret -

docker secret ls
```

---

## 10. Docker Stack File + Deploy

```bash
sudo mkdir -p /opt/shoe-app
sudo nano /opt/shoe-app/docker-stack.yml
```

```yaml
version: "3.8"

services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - /etc/nginx/conf.d:/etc/nginx/conf.d:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    networks: [shoe-network]
    deploy:
      replicas: 2
      update_config: { parallelism: 1, delay: 10s }
      restart_policy: { condition: on-failure }

  frontend:
    image: 10.10.10.21:80/shoe/frontend:latest # Harbor registry
    networks: [shoe-network]
    environment: [NODE_ENV=production]
    deploy:
      replicas: 2
      update_config: { parallelism: 1, delay: 10s }
      restart_policy: { condition: on-failure }

  backend:
    image: 10.10.10.21:80/shoe/backend:latest
    networks: [shoe-network]
    environment: [NODE_ENV=production]
    secrets: [mongo_uri, redis_url, jwt_secret]
    deploy:
      replicas: 2
      update_config: { parallelism: 1, delay: 10s }
      restart_policy: { condition: on-failure }

secrets:
  mongo_uri: { external: true }
  redis_url: { external: true }
  jwt_secret: { external: true }

networks:
  shoe-network: { external: true }
```

Deploy toàn bộ stack:

```bash
cd /opt/shoe-app
docker stack deploy -c docker-stack.yml shoe-app
docker stack services shoe-app      # kiểm tra REPLICAS phải đủ (2/2)
```

---

## 11. Tích Hợp Giám Sát (Node Exporter + Zabbix Agent + Filebeat)

### Node Exporter (cho Prometheus 10.10.10.32 kéo metrics)

```bash
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvf node_exporter-1.7.0.linux-amd64.tar.gz
sudo mv node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/

sudo tee /etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Node Exporter
After=network.target
[Service]
User=nobody
ExecStart=/usr/local/bin/node_exporter
[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
curl -s localhost:9100/metrics | head -3
```

### Zabbix Agent (gửi về Zabbix Server 10.10.10.31)

```bash
wget https://repo.zabbix.com/zabbix/6.4/ubuntu/pool/main/z/zabbix-release/zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo dpkg -i zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo apt update && sudo apt install -y zabbix-agent2

sudo sed -i 's/^Server=.*/Server=10.10.10.31/'       /etc/zabbix/zabbix_agent2.conf
sudo sed -i 's/^ServerActive=.*/ServerActive=10.10.10.31/' /etc/zabbix/zabbix_agent2.conf
sudo sed -i 's/^Hostname=.*/Hostname=webserver/'     /etc/zabbix/zabbix_agent2.conf
sudo systemctl enable --now zabbix-agent2
```

### Filebeat (đẩy log về Logging Server 10.10.10.41:5200)

> Chi tiết cài Filebeat xem [Logging-Server.md](Logging-Server.md) — Bước 7. Cấu hình `fields.server: webserver`, ship `/var/log/nginx/*.log`.

---

## 12. Firewall (UFW)

```bash
sudo ufw allow 22/tcp                                  # SSH
sudo ufw allow 80/tcp                                  # HTTP
sudo ufw allow 443/tcp                                 # HTTPS
sudo ufw allow from 10.10.10.32 to any port 9100       # Node Exporter ← Prometheus
sudo ufw allow from 10.10.10.31 to any port 10050      # Zabbix Agent ← Zabbix
sudo ufw enable
sudo ufw status numbered
```

> **Nguyên tắc least-privilege**: port giám sát (9100, 10050) chỉ mở cho đúng IP server giám sát, không mở cho cả internet.

---

## 13. Bảng Tổng Hợp Port

| Service       | Port  | Mở cho                      |
| ------------- | ----- | --------------------------- |
| Nginx HTTP    | 80    | Internet (pfSense)          |
| Nginx HTTPS   | 443   | Internet (pfSense)          |
| Node Exporter | 9100  | Prometheus (10.10.10.32)    |
| Zabbix Agent  | 10050 | Zabbix Server (10.10.10.31) |
| SSH           | 22    | Internal / Bastion          |

---

## 14. Kiểm Tra Tổng Thể

```bash
docker node ls                                    # Swarm OK
docker stack services shoe-app                    # 2/2 mỗi service
curl -k https://192.168.159.10                    # Frontend trả về HTML
curl -k https://192.168.159.10/api/health         # Backend trả về OK
curl -s 10.10.10.10:9100/metrics | grep node_cpu  # Node Exporter chạy
sudo zabbix_agent2 -t system.uptime               # Zabbix Agent chạy
```

---

## 15. Cập Nhật App (Rolling Update — Không Downtime)

Khi pipeline CI/CD đẩy image mới lên Harbor:

```bash
docker service update --image 10.10.10.21:80/shoe/frontend:v2 shoe-app_frontend
docker service update --image 10.10.10.21:80/shoe/backend:v2  shoe-app_backend
```

Swarm thay từng container một (parallelism: 1) → người dùng không bị gián đoạn.

---

## 16. Snapshot VMware

Sau khi mọi thứ chạy ổn: **VM → Snapshots → Take Snapshot** → đặt tên `webserver-swarm-ready`.
