# 🐳 Docker Swarm — Hướng Dẫn Deploy Production (Dành Cho Người Mới)

> Dùng `docker-stack.yml` để deploy lên **server thật** với nhiều máy.
> Khác với `docker-compose.yml` chỉ dùng để chạy thử trên máy cá nhân.

---

## 1. Docker Swarm Là Gì?

**Vấn đề của Docker Compose**: Chạy trên **1 máy duy nhất**.
Nếu máy đó sập → toàn bộ website sập theo.

**Docker Swarm giải quyết điều đó**: Chạy trên **nhiều máy cùng lúc**.

```
                 [Manager Node]
                 Não của cluster
                 Phân công việc
                       |
         +-------------+-------------+
         |                           |
   [Worker 1]                  [Worker 2]
   backend + nginx              frontend + nginx
```

- **Manager Node** — Nhận lệnh deploy, phân công container về các máy
- **Worker Node** — Chạy container theo lệnh Manager
- Nếu Worker 1 chết → Swarm tự chuyển container sang Worker 2 → **không downtime**

---

## 2. Tại Sao Cần Swarm Cho Production?

| Tình huống | Docker Compose | Docker Swarm |
|-----------|---------------|-------------|
| Máy chủ chết đột ngột | Toàn bộ sập | Tự chuyển sang máy khác |
| Deploy version mới | Phải down rồi up lại (có downtime) | Rolling update — không downtime |
| Lưu mật khẩu, API key | Lưu trong file `.env` (kém bảo mật) | Mã hóa AES-256, chỉ giải mã trong RAM |
| Tăng số lượng server | Phải làm thủ công | 1 lệnh scale |

---

## 3. Hệ Thống Dự Án Này Trong Swarm

```
Internet
    |
    v
[Nginx — mode: global]     <- Chạy trên TẤT CẢ các node
    |
    |-- /           --> [Frontend x2 replicas]
    |-- /api/       --> [Backend x1 replica]
    |-- /chat       --> [Backend x1 replica]
    |-- /uploads/   --> [Backend x1 replica]
    |
    |-- HTTPS      --> [Certbot — tự renew 90 ngày]
```

| Service | Số lượng | Lý do |
|---------|---------|-------|
| `nginx` | global (1 per node) | Mọi node đều cần nhận traffic |
| `frontend` | 2 replicas | Tự động HA, mỗi node 1 cái |
| `backend` | 1 replica | Ảnh upload lưu local volume trên 1 node cố định |
| `certbot` | 1 replica (manager) | Chỉ cần renew SSL 1 lần |

> **Tại sao backend chỉ 1 replica?**
> Ảnh sản phẩm lưu vào `uploads-data` volume trên 1 node. Nếu backend chạy trên 2 node khác nhau, node kia không có ảnh → vỡ ảnh.
> Giải pháp tương lai: migrate lưu ảnh lên S3/Cloudflare R2 → có thể scale backend tự do.

---

## 4. Các Bước Triển Khai

### Bước 1 — Khởi Tạo Swarm Trên Manager Node

Đăng nhập vào máy Manager, chạy:

```bash
docker swarm init --advertise-addr <IP_của_máy_Manager>
```

Ví dụ:

```bash
docker swarm init --advertise-addr 192.168.1.10
```

Lệnh này in ra token để thêm worker. **Lưu lại token này**:

```
To add a worker to this swarm, run the following command:
    docker swarm join --token SWMTKN-1-5o5j8... 192.168.1.10:2377
```

---

### Bước 2 — Thêm Worker Node Vào Cluster

Trên từng máy Worker, chạy lệnh vừa copy ở trên:

```bash
docker swarm join --token SWMTKN-1-5o5j8... 192.168.1.10:2377
```

Kiểm tra trên Manager:

```bash
docker node ls
```

```
ID           HOSTNAME    STATUS   AVAILABILITY   MANAGER STATUS
abc123  *    manager-1   Ready    Active         Leader
def456       worker-1    Ready    Active
ghi789       worker-2    Ready    Active
```

Dấu `*` = node bạn đang đứng. `Leader` = Manager.

---

### Bước 3 — Gán Label Cho Node Chứa Uploads

Backend phải chạy cố định trên node có volume ảnh. Gán label cho đúng node đó:

```bash
# Xem ID của worker node muốn gán
docker node ls

# Gán label "uploads=true" cho worker đó
docker node update --label-add uploads=true <worker-node-id>
```

Ví dụ:

```bash
docker node update --label-add uploads=true def456
```

---

### Bước 4 — Tạo Secrets (Thông Tin Bí Mật)

**Secret là gì?**
- Thay vì lưu mật khẩu trong file `.env` (dễ bị lộ), Swarm lưu vào **Secret**
- Dữ liệu được **mã hóa AES-256** khi lưu trên disk
- Chỉ giải mã trong **RAM** của container khi cần dùng
- Container đọc từ `/run/secrets/<tên_secret>`

Tạo toàn bộ secrets (chạy trên Manager):

```bash
# Database
echo "mongodb+srv://user:pass@cluster.mongodb.net/shoe" | docker secret create mongo_uri -
echo "redis://default:pass@redis-host:port"             | docker secret create redis_uri -

# JWT
echo "your-access-secret-key"   | docker secret create jwt_access_key -
echo "your-refresh-secret-key"  | docker secret create jwt_refresh_key -

# MoMo
echo "your-momo-access-key"     | docker secret create momo_access_key -
echo "your-momo-secret-key"     | docker secret create momo_secret_key -

# VNPay
echo "your-vnpay-code"          | docker secret create vnpay_tmn_code -
echo "your-vnpay-secret"        | docker secret create vnpay_secure_secret -

# Gemini AI
echo "your-gemini-api-key"      | docker secret create gemini_api_key -

# Email
echo "your@gmail.com"           | docker secret create email_user -
echo "your-client-id"           | docker secret create email_client_id -
echo "your-client-secret"       | docker secret create email_client_secret -
echo "your-redirect-uri"        | docker secret create email_redirect_uri -
echo "your-refresh-token"       | docker secret create email_refresh_token -
```

Kiểm tra:

```bash
docker secret ls
```

> **Lưu ý**: Dấu `-` ở cuối lệnh có nghĩa "đọc input từ stdin (pipe)". Cách này tránh lộ giá trị trong lịch sử lệnh shell.

---

### Bước 5 — Lấy SSL Certificate (Lần Đầu)

Trước khi deploy stack, cần có certificate SSL cho domain. Chạy certbot thủ công lần đầu:

```bash
# Tạm thời chạy nginx để certbot verify domain
docker run --rm \
  -p 80:80 \
  -v certbot-certs:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  certbot/certbot:v2.11.0 certonly \
  --standalone \
  -d giaythethao.click \
  -d www.giaythethao.click \
  --email your@email.com \
  --agree-tos \
  --no-eff-email
```

Sau khi có cert, Swarm sẽ tự renew mỗi 12h.

---

### Bước 6 — Copy File Lên Manager

```bash
scp docker-stack.yml      user@manager-ip:/opt/shoe-gemini/
scp nginx/nginx-ssl.conf  user@manager-ip:/opt/shoe-gemini/nginx/
```

---

### Bước 7 — Deploy Stack

```bash
cd /opt/shoe-gemini

docker stack deploy \
  -c docker-stack.yml \
  shoe-gemini \
  --with-registry-auth
```

- `shoe-gemini` = tên stack. Các service sẽ có prefix này: `shoe-gemini_backend`, `shoe-gemini_frontend`...
- `--with-registry-auth` = gửi Docker Hub credentials để Worker nodes có thể pull private image

Kiểm tra:

```bash
docker service ls
```

```
NAME                     MODE        REPLICAS   IMAGE
shoe-gemini_backend      replicated  1/1        .../shoe-gemini-backend:latest
shoe-gemini_frontend     replicated  2/2        .../shoe-gemini-frontend:latest
shoe-gemini_nginx        global      2/2        nginx:1.27.0-alpine3.19
shoe-gemini_certbot      replicated  1/1        certbot/certbot:v2.11.0
```

Cột `REPLICAS` hiện đúng số → thành công ✅

---

## 5. Giải Thích File `docker-stack.yml`

### Backend

```yaml
backend:
  image: dinhngochieu3112004/shoe-gemini-backend:latest
  environment:
    - PORT=5001
    - SERVER_URL=https://giaythethao.click     # Non-sensitive → dùng environment thường
    - REACT_APP_URL=https://giaythethao.click
  secrets:
    - mongo_uri        # Sensitive → dùng secret, mount vào /run/secrets/mongo_uri
    - jwt_access_key
    - ...
  volumes:
    - uploads-data:/app/dist/uploads  # Giữ ảnh khi container restart
  deploy:
    replicas: 1
    placement:
      constraints:
        - node.role == worker
        - node.labels.uploads == true   # Chỉ chạy trên node được gán label ở Bước 3
    update_config:
      order: start-first        # Bản mới khởi động trước, bản cũ tắt sau → không downtime
      failure_action: rollback  # Deploy lỗi → tự động rollback về version cũ
    restart_policy:
      condition: on-failure
      max_attempts: 3           # Thử lại tối đa 3 lần nếu crash
```

### Frontend

```yaml
frontend:
  deploy:
    replicas: 2
    placement:
      max_replicas_per_node: 1  # Mỗi node tối đa 1 replica → Worker 1 chết, còn Worker 2
    update_config:
      order: start-first        # Rolling update không downtime
```

### Nginx

```yaml
nginx:
  deploy:
    mode: global   # Chạy đúng 1 container trên MỖI node
                   # Thêm node mới → nginx tự chạy trên đó
```

### Network

```yaml
networks:
  mern-stack-net:
    driver: overlay          # Overlay network — container trên các máy khác nhau giao tiếp được
    driver_opts:
      encrypted: "true"      # Mã hóa traffic giữa các node (TLS)
```

### Certbot (Auto-renew SSL)

```yaml
certbot:
  command: >
    sh -c "trap exit TERM;
           while :; do
             certbot renew --webroot --quiet;
             sleep 12h & wait $${!};
           done"
  deploy:
    placement:
      constraints:
        - node.role == manager  # Chạy trên Manager node
```

Certificate Let's Encrypt có hạn 90 ngày. Certbot renew mỗi 12h, tự gia hạn khi còn 30 ngày.

---

## 6. Các Lệnh Hay Dùng Sau Khi Deploy

### Xem Trạng Thái

```bash
docker service ls                               # Xem tất cả service
docker service ps shoe-gemini_backend           # Replica đang chạy ở node nào
docker service logs shoe-gemini_backend -f      # Xem log realtime
docker service inspect shoe-gemini_backend      # Xem cấu hình chi tiết
```

### Cập Nhật Image Mới

```bash
docker service update \
  --image dinhngochieu3112004/shoe-gemini-backend:latest \
  shoe-gemini_backend
```

Swarm tự rolling update — bản mới lên trước, bản cũ tắt sau. Không downtime.

### Scale Service

```bash
docker service scale shoe-gemini_frontend=3
```

### Rollback Thủ Công

```bash
docker service rollback shoe-gemini_backend
```

### Xóa Toàn Bộ Stack

```bash
docker stack rm shoe-gemini
```

---

## 7. Xử Lý Lỗi Thường Gặp

### Service không đủ replica (`0/1` hoặc `0/2`)

```bash
docker service ps shoe-gemini_backend --no-trunc
```

Cột `ERROR` sẽ hiện lý do cụ thể:

| Lỗi | Nguyên nhân | Cách sửa |
|-----|------------|---------|
| `secret not found` | Chưa tạo secret | Chạy lại Bước 4 |
| `no suitable node` | Không node nào thỏa constraint | Kiểm tra label node (Bước 3) |
| `pull access denied` | Không pull được image | Thêm `--with-registry-auth` khi deploy |
| `port already in use` | Port 80/443 bị chiếm | Tắt nginx/apache trên host |

### Backend crash liên tục

```bash
docker service logs shoe-gemini_backend --tail=50
```

Thường do sai connection string trong secret. Kiểm tra lại giá trị secret:

```bash
# Không thể xem giá trị secret trực tiếp — đây là tính năng bảo mật
# Phải xóa rồi tạo lại:
docker secret rm mongo_uri
echo "mongodb+srv://..." | docker secret create mongo_uri -
docker service update --force shoe-gemini_backend
```

### Nginx 502 sau khi deploy

Backend chưa healthy. Đợi 20-30 giây rồi thử lại:

```bash
docker service ps shoe-gemini_backend
docker service logs shoe-gemini_backend --tail=30
```

### SSL không hoạt động (ERR_SSL_PROTOCOL_ERROR)

Certificate chưa có hoặc đặt sai path. Kiểm tra:

```bash
docker service logs shoe-gemini_certbot --tail=20
```

---

## 8. So Sánh Docker Compose vs Docker Swarm

| | Docker Compose | Docker Swarm |
|--|----------------|-------------|
| Dùng cho | Dev, test local | Production |
| Số máy | 1 máy | Nhiều máy |
| Khi máy chết | Toàn bộ sập | Tự chuyển sang máy khác |
| Secrets | File `.env` | Mã hóa AES-256 |
| Deploy version mới | Down → Up (downtime) | Rolling update, không downtime |
| Tự scale | Không | `docker service scale` |
| Lệnh chạy | `docker compose up` | `docker stack deploy` |
| File config | `docker-compose.yml` | `docker-stack.yml` |

---

> **Bước tiếp theo khi muốn scale backend lên nhiều replica:**
> Migrate lưu ảnh từ local volume sang object storage (AWS S3, Cloudflare R2, MinIO).
> Khi đó backend không còn phụ thuộc vào 1 node cụ thể nữa.
