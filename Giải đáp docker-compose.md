# 🐳 Docker Compose — Hướng dẫn chạy dự án ở môi trường Dev

> File này dùng `docker-compose.yml` để chạy thử trên **máy cá nhân**.
> Không dùng để deploy lên server thật.

---

## Docker Compose là gì?

Bình thường để chạy dự án này bạn phải mở **3 terminal** chạy 3 lệnh riêng:

```
terminal 1: cd server && npm run dev
terminal 2: cd client && npm start
terminal 3: nginx ...
```

Docker Compose giúp bạn chạy tất cả chỉ bằng **1 lệnh duy nhất**:

```bash
docker compose up -d
```

Nó đọc file `docker-compose.yml`, tự động build và khởi động toàn bộ hệ thống.

---

## Hệ thống gồm những gì?

```
Trình duyệt
    │
    ▼
 Nginx :80          ← cổng duy nhất ra ngoài
    │
    ├── /           → Frontend (React)  :80
    ├── /api/       → Backend (Node.js) :5001
    ├── /chat       → Backend (Node.js) :5001
    └── /uploads/   → Backend (Node.js) :5001
```

| Service    | Vai trò                                      |
|------------|----------------------------------------------|
| `backend`  | API Node.js + Express, kết nối Atlas + Redis |
| `frontend` | React app đã build, serve bằng nginx         |
| `nginx`    | Nhận request từ browser, phân phối đúng chỗ  |

> Database (MongoDB Atlas) và Cache (RedisLabs) là dịch vụ **bên ngoài**, không chạy trong Docker.

---

## Cài đặt

Cần cài [Docker Desktop](https://www.docker.com/products/docker-desktop/) trước khi bắt đầu.

Kiểm tra cài thành công:

```bash
docker --version
docker compose version
```

---

## Bước 1 — Chuẩn bị file .env

Dự án dùng 2 file `.env` để lưu thông tin cấu hình (API key, connection string...).
Các file này **không được commit lên Git** vì chứa thông tin nhạy cảm.

### `server/.env`

```env
# Database — kết nối MongoDB Atlas
CONNECT_DB=mongodb://smartphone:Hieu7067@cluster111-shard-00-00...

# Cache — kết nối RedisLabs
CONNECT_REDIS=redis://default:...@redis-18362...

# JWT
JWT_ACCESS_KEY=your-access-key
JWT_REFRESH_KEY=your-refresh-key
JWT_SECRET=your-secret-key

# Server
PORT=5001
SERVER_URL=http://localhost:5001

# CORS — cho phép frontend gọi API
REACT_APP_URL=http://localhost
REACT_APP_URL_DOMAIN=http://localhost

# Email (để trống nếu chưa dùng)
EMAIL_USER=
CLIENT_ID=
CLIENT_SECRET=
REDIRECT_URI=
REFRESH_TOKEN=

# Thanh toán
MOMO_ACCESS_KEY=...
MOMO_SECRET_KEY=...
VNPAY_TMN_CODE=...
VNPAY_SECURE_SECRET=...

# AI
GEMINI_API_KEY=...
```

### `client/.env`

```env
# Khi chạy qua Docker, request đi qua nginx port 80
REACT_APP_SERVER=http://localhost
REACT_APP_IMG=http://localhost/uploads
```

> **Tại sao `REACT_APP_SERVER=http://localhost` chứ không phải `http://localhost:5001`?**
> Vì nginx đứng ở port 80 nhận request rồi mới chuyển vào backend. Frontend không gọi thẳng vào backend.

---

## Bước 2 — Khởi động

```bash
# Build image và khởi động toàn bộ hệ thống
docker compose up -d --build

# Kiểm tra các container có đang chạy không
docker compose ps
```

Kết quả mong đợi:

```
NAME                        STATUS
shoe-gemini-backend-1       Up
shoe-gemini-frontend-1      Up
shoe-gemini-nginx-1         Up
```

Mở trình duyệt vào: **http://localhost**

---

## Bước 3 — Xem log khi có lỗi

```bash
# Xem log tất cả service
docker compose logs -f

# Chỉ xem log backend
docker compose logs -f backend

# Chỉ xem log frontend
docker compose logs -f frontend

# Chỉ xem log nginx
docker compose logs -f nginx
```

Nhấn `Ctrl + C` để thoát.

---

## Giải thích file `docker-compose.yml`

```yaml
services:
  backend:
    build:
      context: ./server      # build image từ thư mục server/
      dockerfile: Dockerfile
    ports:
      - "5001:5001"          # mở thêm port 5001 để debug trực tiếp nếu cần
    env_file:
      - ./server/.env        # đọc biến môi trường từ file .env
    environment:
      - REACT_APP_URL=http://localhost   # override CORS cho đúng với nginx
    volumes:
      - ./server/src/uploads:/app/dist/uploads
      # mount thư mục uploads từ máy vào container
      # → ảnh upload không mất khi rebuild container

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
    # không expose port vì chỉ nginx mới cần giao tiếp với frontend

  nginx:
    image: nginx:stable-alpine
    ports:
      - "80:80"              # cổng duy nhất public ra ngoài
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      # ":ro" = read-only, container không được sửa file config
    depends_on:
      - frontend
      - backend              # nginx chờ frontend và backend khởi động xong mới chạy
```

---

## Các lệnh hay dùng

| Lệnh | Tác dụng |
|------|----------|
| `docker compose up -d --build` | Build lại và khởi động |
| `docker compose up -d` | Khởi động (không build lại) |
| `docker compose down` | Dừng hệ thống |
| `docker compose restart backend` | Restart chỉ backend |
| `docker compose ps` | Xem trạng thái |
| `docker compose logs -f backend` | Xem log realtime |

---

## Xử lý lỗi thường gặp

### Lỗi 502 Bad Gateway

Backend chưa khởi động xong hoặc bị crash.

```bash
docker compose ps -a                  # xem container nào đang lỗi
docker compose logs backend --tail=50 # xem 50 dòng log cuối
```

Nguyên nhân thường gặp:
- Thiếu file `server/.env`
- Sai connection string MongoDB Atlas hoặc Redis

### Lỗi 404 khi F5 trang React

Nginx chưa cấu hình fallback cho React Router. Kiểm tra `nginx/default.conf` có đoạn:

```nginx
proxy_intercept_errors on;
error_page 404 = @frontend_fallback;
```

### Backend không kết nối được Atlas

```bash
docker compose logs backend | grep "MongoDB"
```

Kiểm tra `CONNECT_DB` trong `server/.env` có đúng connection string Atlas không.

### Ảnh upload không hiển thị

Kiểm tra volume mount đúng chưa:

```bash
docker compose exec backend ls /app/dist/uploads
```

---

## Dừng hệ thống

```bash
docker compose down
```

---

> Khi deploy lên server thật → dùng `docker-stack.yml` với Docker Swarm. Xem file `Giải đáp docker swarm.md`.
