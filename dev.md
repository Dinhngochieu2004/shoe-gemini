# Xóa sạch các folder .git ẩn trước khi đẩy dự án lên

Remove-Item -Path .git, client/.git, server/.git -Recurse -Force -ErrorAction SilentlyContinue

# chạy khởi động dự án (local)

cd client và cd server
npm i
npm start
