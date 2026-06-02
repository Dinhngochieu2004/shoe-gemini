# Xóa sạch các folder .git ẩn trước khi đẩy dự án lên

Remove-Item -Path .git, client/.git, server/.git -Recurse -Force -ErrorAction SilentlyContinue

# chạy khởi động dự án (local) và kiem tra cong xem có bị trùng ko

```bash
netstat -ano | findstr :5001
```

TCP 0.0.0.0:5001 0.0.0.0:0 LISTENING 15160
TCP [::]:5001 [::]:0 LISTENING 15160

# sau đó xóa tiến trình

```bash
taskkill /PID 15160 /F
```

# Bắt đầu khởi động dự án

cd client và cd server
npm i
npm start
