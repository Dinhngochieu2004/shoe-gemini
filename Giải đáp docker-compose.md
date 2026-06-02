# 🐳 Docker Compose — Hướng Dẫn Chạy Dev (Dành Cho Người Mới)

> Dùng để chạy thử trên **máy cá nhân**. Không dùng để deploy lên server thật.

---

## 1. Docker Compose Là Gì?

Hãy tưởng tượng dự án này cần **3 thứ chạy cùng lúc**:

```
[Backend Node.js]   [Frontend React]   [Nginx - cổng vào]
```

Bình thường bạn phải mở **3 terminal** để chạy từng cái:

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm start

# Terminal 3
nginx ...
```

**Docker Compose** gom tất cả lại, chỉ cần **1 lệnh duy nhất**:

```bash
docker compose up -d --build
```

Nó đọc file `docker-compose.yml`, tự build và khởi động toàn bộ.

---

## 2. Luồng Request Trong Hệ Thống

```
Trình duyệt bạn
       |
       v
  [Nginx :80]  <-- cổng DUY NHẤT ra ngoài
       |
       |-- /           --> [Frontend React :80]
       |-- /api/       --> [Backend Node.js :5001]
       |-- /chat       --> [Backend Node.js :5001]
       |-- /uploads/   --> [Backend Node.js :5001]
```

**Tại sao phải đi qua Nginx?**
- Frontend và Backend không cần lộ port ra ngoài
- Nginx làm "người gác cổng": nhận request → phân phối đúng chỗ
- Dễ thêm SSL, cache, gzip sau này

> Database (MongoDB Atlas) và Cache (Redis) là dịch vụ **đám mây bên ngoài**, không chạy trong Docker.

---

## 3. Yêu Cầu Trước Khi Bắt Đầu

Cài [Docker Desktop](https://www.docker.com/products/docker-desktop/) (bao gồm cả Docker Compose).

Kiểm tra đã cài thành công:

```bash
docker --version
docker compose version
```

---

## 4. Chuẩn Bị File .env

File `.env` chứa thông tin cấu hình bí mật (mật khẩu, API key...). **Không được commit lên Git**.

### `server/.env`

```env
# Database
CONNECT_DB=mongodb+srv://user:password@cluster.mongodb.net/shoe

# Cache
CONNECT_REDIS=redis://default:password@redis-host:port

# JWT (đặt chuỗi bất kỳ, càng dài càng bảo mật)
JWT_ACCESS_KEY=your-access-secret-key
JWT_REFRESH_KEY=your-refresh-secret-key
JWT_SECRET=your-secret-key

# Server
PORT=5001
SERVER_URL=http://localhost:5001

# CORS — phải khớp với địa chỉ frontend (khi dùng Docker thì nginx là port 80)
REACT_APP_URL=http://localhost
REACT_APP_URL_DOMAIN=http://localhost

# Email (để trống nếu chưa cần)
EMAIL_USER=
CLIENT_ID=
CLIENT_SECRET=
REDIRECT_URI=
REFRESH_TOKEN=

# Thanh toán
MOMO_ACCESS_KEY=your-momo-key
MOMO_SECRET_KEY=your-momo-secret
VNPAY_TMN_CODE=your-vnpay-code
VNPAY_SECURE_SECRET=your-vnpay-secret

# AI Chatbot
GEMINI_API_KEY=your-gemini-key
```

### `client/.env`

```env
# Khi chạy qua Docker (nginx port 80)
REACT_APP_SERVER=http://localhost
REACT_APP_IMG=http://localhost/uploads
```

> **Tại sao `REACT_APP_SERVER=http://localhost` chứ không phải `:5001`?**
> Vì request từ trình duyệt → nginx (port 80) → nginx chuyển sang backend.
> Frontend không được gọi thẳng vào backend, phải đi qua nginx.

---

## 5. Khởi Động

```bash
# Build image và khởi động (lần đầu hoặc khi sửa code)
docker compose up -d --build

# Kiểm tra các container đang chạy
docker compose ps
```

Kết quả mong đợi:

```
NAME                       STATUS    PORTS
shoe-gemini-backend-1      Up
shoe-gemini-frontend-1     Up
shoe-gemini-nginx-1        Up        0.0.0.0:80->80/tcp
```

Mở trình duyệt: **http://localhost** ✅

---

## 6. Xem Log Khi Có Lỗi

```bash
# Xem log tất cả (nhấn Ctrl+C để thoát)
docker compose logs -f

# Chỉ xem backend
docker compose logs -f backend

# Chỉ xem frontend
docker compose logs -f frontend

# Chỉ xem nginx
docker compose logs -f nginx
```

---

## 7. Giải Thích File `docker-compose.yml`

```yaml
services:
  backend:
    build:
      context: ./server       # Docker build từ thư mục server/
      dockerfile: Dockerfile
      target: dev             # Chỉ build đến stage "dev" — bao gồm nodemon hot-reload
    env_file:
      - ./server/.env         # Đọc biến môi trường từ file .env
    volumes:
      - ./server/src:/app/src         # Mount source code từ máy vào container
                                       # Nodemon theo dõi thư mục này để hot-reload
      - uploads-data:/app/src/uploads # Ảnh upload được lưu vào named volume
                                       # → không mất khi rebuild container
      - /app/node_modules             # node_modules trong container, không bị host ghi đè
    expose:
      - "5001"                # Chỉ expose nội bộ, không mở ra ngoài

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile  # Build toàn bộ → stage "production" (React build + nginx)
    # Không expose port vì nginx là người duy nhất giao tiếp với frontend

  nginx:
    image: nginx:1.27.0-alpine3.19
    ports:
      - "80:80"               # CHỈ port này được mở ra ngoài
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      # ":ro" = read-only, container không được sửa file config
    depends_on:
      - frontend
      - backend               # Nginx chờ frontend và backend khởi động xong

volumes:
  uploads-data:               # Named volume — dữ liệu tồn tại dù container restart hay rebuild
```

---

## 8. Các Lệnh Hay Dùng

| Lệnh | Tác dụng |
|------|----------|
| `docker compose up -d --build` | Build lại và khởi động |
| `docker compose up -d` | Khởi động (không build lại) |
| `docker compose down` | Dừng và xóa container |
| `docker compose down -v` | Dừng + xóa cả volumes (mất ảnh upload!) |
| `docker compose restart backend` | Restart chỉ backend |
| `docker compose ps` | Xem trạng thái |
| `docker compose logs -f backend` | Xem log realtime |
| `docker compose exec backend sh` | Vào trong container backend |

---

## 9. Xử Lý Lỗi Thường Gặp

### Lỗi 502 Bad Gateway

Nginx không kết nối được backend.

```bash
docker compose ps -a                    # Xem container nào đang bị lỗi
docker compose logs backend --tail=50   # Xem 50 dòng log cuối của backend
```

Nguyên nhân thường gặp:
- Thiếu file `server/.env`
- Sai connection string MongoDB hoặc Redis trong `.env`
- Backend đang khởi động, đợi thêm 10-15 giây

### Lỗi 404 khi F5 (refresh) trang React

Nginx cần fallback về `index.html` cho React Router. Kiểm tra `nginx/default.conf` có đoạn:

```nginx
proxy_intercept_errors on;
error_page 404 = @frontend_fallback;
```

### Ảnh upload không hiển thị

Kiểm tra volume mount đúng chưa:

```bash
docker compose exec backend ls /app/src/uploads
```

### Port 80 đang bị chiếm

```bash
# Windows — xem ai đang dùng port 80
netstat -ano | findstr :80

# Tắt IIS hoặc web server đang chiếm port 80
```

---

## 10. Dừng Hệ Thống

```bash
docker compose down
```

---

> Khi cần deploy lên server thật → dùng `docker-stack.yml` với Docker Swarm.
> Xem file `Giải đáp docker swarm.md`.
