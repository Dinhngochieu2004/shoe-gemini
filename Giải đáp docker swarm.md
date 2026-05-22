# 🐳 Docker Swarm — Hướng dẫn deploy lên Production

> File này dùng `docker-stack.yml` để deploy lên **server thật**.
> Khác với `docker-compose.yml` chỉ dùng để chạy thử trên máy cá nhân.

---

## Docker Swarm là gì?

Docker Compose chạy trên **1 máy**. Khi máy đó chết → toàn bộ hệ thống sập.

Docker Swarm cho phép chạy trên **nhiều máy cùng lúc**:

```
                    ┌─────────────────┐
                    │  Manager Node   │  ← điều phối, phân công việc
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌─────▼──────┐ ┌────▼───────┐
       │   Worker 1  │ │  Worker 2  │ │  Worker 3  │
       │  backend    │ │  frontend  │ │  frontend  │
       └─────────────┘ └────────────┘ └────────────┘
```

- **Manager** — não của cluster, quyết định container nào chạy ở đâu
- **Worker** — máy phụ, chỉ chạy container theo lệnh Manager
- Nếu Worker 2 chết → Swarm tự chuyển container sang Worker 3 → **không downtime**

---

## Hệ thống trong dự án này

```
Internet
    │
    ▼
 Nginx (mode: global — chạy trên mọi node)
    │
    ├── /           → Frontend  (2 replicas, mỗi node 1 cái)
    ├── /api/       → Backend   (1 replica, cố định trên node có uploads)
    ├── /chat       → Backend
    └── /uploads/   → Backend
```

| Service    | Replicas | Ghi chú |
|------------|----------|---------|
| `backend`  | 1        | Cố định trên node có volume uploads |
| `frontend` | 2        | Mỗi node 1 replica, tự động HA |
| `nginx`    | global   | Chạy trên tất cả node |

> **Tại sao backend chỉ 1 replica?**
> Vì ảnh sản phẩm được lưu vào volume local trên 1 node. Nếu chạy 2 replica trên 2 node khác nhau, node kia sẽ không có ảnh → lỗi.

---

## Bước 1 — Khởi tạo Swarm

Chạy trên **Manager node**:

```bash
docker swarm init --advertise-addr <IP_của_máy>
```

Lệnh này in ra token để thêm worker. Ví dụ:

```
To add a worker to this swarm, run the following command:
    docker swarm join --token SWMTKN-1-xxx... 192.168.1.10:2377
```

Lưu token đó lại.

### Thêm Worker vào cluster

Chạy lệnh trên từng **Worker node**:

```bash
docker swarm join --token SWMTKN-1-xxx... <IP_Manager>:2377
```

Kiểm tra cluster:

```bash
docker node ls
```

```
ID          HOSTNAME    STATUS    AVAILABILITY   MANAGER STATUS
abc123 *    manager-1   Ready     Active         Leader
def456      worker-1    Ready     Active
ghi789      worker-2    Ready     Active
```

---

## Bước 2 — Label node chứa uploads

Backend cần chạy cố định trên node có volume uploads. Cần label node đó:

```bash
# Xem ID của worker node
docker node ls

# Gán label
docker node update --label-add uploads=true <worker-node-id>
```

---

## Bước 3 — Tạo Secrets

Secret là cách Swarm lưu thông tin nhạy cảm (mật khẩu, API key) một cách bảo mật.

- Dữ liệu được **mã hóa AES-256** khi lưu
- Chỉ được giải mã trong RAM của container khi cần dùng
- Không bao giờ ghi ra disk
- Container đọc từ `/run/secrets/<tên_secret>`

Tạo toàn bộ secrets cho dự án:

```bash
# Database
echo "mongodb://smartphone:..." | docker secret create mongo_uri -
echo "redis://default:..."      | docker secret create redis_uri -

# JWT
echo "hieu-access-key"  | docker secret create jwt_access_key -
echo "hieu-refresh-key" | docker secret create jwt_refresh_key -

# MoMo
echo "F8BBA842ECF85"    | docker secret create momo_access_key -
echo "K951B6PE1w..."    | docker secret create momo_secret_key -

# VNPay
echo "DH2F13SW"         | docker secret create vnpay_tmn_code -
echo "NXZM3DWF..."      | docker secret create vnpay_secure_secret -

# Gemini AI
echo "AIzaSyB9W6..."    | docker secret create gemini_api_key -

# Email
echo "your@gmail.com"   | docker secret create email_user -
echo "client-id"        | docker secret create email_client_id -
echo "client-secret"    | docker secret create email_client_secret -
echo "redirect-uri"     | docker secret create email_redirect_uri -
echo "refresh-token"    | docker secret create email_refresh_token -
```

Kiểm tra:

```bash
docker secret ls
```

---

## Bước 4 — Copy file cấu hình lên Manager

```bash
scp docker-stack.yml     user@manager-host:/opt/shoe-gemini/
scp nginx/default.conf   user@manager-host:/opt/shoe-gemini/nginx/
```

---

## Bước 5 — Deploy

```bash
docker stack deploy -c docker-stack.yml shoe-gemini --with-registry-auth
```

- `shoe-gemini` — tên stack, các service sẽ có tên dạng `shoe-gemini_backend`, `shoe-gemini_frontend`...
- `--with-registry-auth` — truyền credentials Docker Hub để worker có thể pull image private

Kiểm tra:

```bash
docker service ls
```

```
NAME                    MODE        REPLICAS   IMAGE
shoe-gemini_backend     replicated  1/1        shoe-gemini-backend:latest
shoe-gemini_frontend    replicated  2/2        shoe-gemini-frontend:latest
shoe-gemini_nginx       global      2/2        nginx:stable-alpine
```

Cột `REPLICAS` hiện đúng số → thành công ✅

---

## Giải thích file `docker-stack.yml`

### Backend

```yaml
backend:
  environment:
    - REACT_APP_URL=https://giaythethao.click  # non-sensitive → dùng environment
  secrets:
    - mongo_uri       # sensitive → dùng secret, mount vào /run/secrets/mongo_uri
    - jwt_access_key
    - ...
  volumes:
    - uploads-data:/app/dist/uploads  # giữ ảnh khi container restart
  deploy:
    replicas: 1
    placement:
      constraints:
        - node.role == worker
        - node.labels.uploads == true   # chỉ chạy trên node được label
    update_config:
      order: start-first        # bản mới lên trước, bản cũ mới tắt → không downtime
      failure_action: rollback  # deploy lỗi → tự rollback về version cũ
    rollback_config:
      order: start-first
```

### Frontend

```yaml
frontend:
  deploy:
    replicas: 2
    placement:
      max_replicas_per_node: 1  # mỗi node tối đa 1 replica → đảm bảo HA
    update_config:
      order: start-first
      failure_action: rollback
```

### Nginx

```yaml
nginx:
  deploy:
    mode: global   # chạy đúng 1 container trên MỖI node
                   # thêm node mới → nginx tự chạy trên node đó
```

### Network

```yaml
networks:
  mern-stack-net:
    driver: overlay          # cho phép container trên các node khác nhau giao tiếp
    driver_opts:
      encrypted: "true"      # mã hóa traffic giữa các node
```

---

## Các lệnh hay dùng

### Xem trạng thái

```bash
docker service ls                              # xem tất cả service
docker service ps shoe-gemini_backend          # xem replica đang chạy ở node nào
docker service logs shoe-gemini_backend -f     # xem log realtime
```

### Update image mới

```bash
docker service update \
  --image dinhngochieu3112004/shoe-gemini-backend:latest \
  shoe-gemini_backend
```

Swarm sẽ tự động rolling update — bản mới lên trước, bản cũ tắt sau, không downtime.

### Scale service

```bash
docker service scale shoe-gemini_frontend=3
```

### Rollback thủ công

```bash
docker service rollback shoe-gemini_backend
```

### Xóa toàn bộ stack

```bash
docker stack rm shoe-gemini
```

---

## Xử lý lỗi thường gặp

### Service không đủ replica (`0/1` hoặc `0/2`)

```bash
docker service ps shoe-gemini_backend --no-trunc
```

Cột `ERROR` sẽ hiện lý do. Thường gặp:

- **"secret not found"** → chưa tạo secret, chạy lại Bước 3
- **"no suitable node"** → không có node nào thỏa placement constraint, kiểm tra label node
- **"pull access denied"** → image private, thêm `--with-registry-auth` khi deploy

### Backend crash liên tục

```bash
docker service logs shoe-gemini_backend --tail=50
```

Thường do sai connection string Atlas hoặc Redis trong secret.

### Nginx 502 sau khi deploy

Backend chưa healthy. Đợi 20-30 giây rồi thử lại. Nếu vẫn lỗi:

```bash
docker service ps shoe-gemini_backend
docker service logs shoe-gemini_backend
```

---

## So sánh Docker Compose vs Docker Swarm

| | Docker Compose | Docker Swarm |
|--|----------------|--------------|
| Dùng cho | Dev, test local | Production |
| Số máy | 1 máy | Nhiều máy |
| Khi 1 máy chết | Toàn bộ sập | Tự chuyển sang máy khác |
| Secrets | Dùng `.env` file | Mã hóa AES-256 |
| Update | Phải down rồi up lại | Rolling update, không downtime |
| Lệnh | `docker compose up` | `docker stack deploy` |

---

> Muốn thêm HTTPS (port 443) → cần cấu hình TLS certificate trong Nginx hoặc dùng Traefik.
> Muốn scale backend lên nhiều replica → cần migrate lưu ảnh sang object storage (S3, MinIO, Cloudflare R2) thay vì local volume.
