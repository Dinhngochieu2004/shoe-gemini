# Hướng Dẫn Cài Jenkins và Docker Trên Máy Ảo VMware (Ubuntu)

## Yêu Cầu

- VMware Workstation / Player
- Ubuntu 20.04 LTS (focal) trở lên
- RAM tối thiểu 2GB (khuyến nghị 4GB)
- Ổ đĩa tối thiểu 20GB

---

## Bước 1 — Fix Network (Netplan)

Sau khi cài Ubuntu xong, cấu hình mạng để VM có thể kết nối internet.

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

Thay toàn bộ nội dung file thành:

```yaml
network:
  ethernets:
    ens33:
      dhcp4: false
      addresses: [192.168.159.20/24]
      routes:
        - to: default
          via: 192.168.159.2
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
    ens34:
      dhcp4: false
      addresses: [10.10.10.20/24]
  version: 2
```

> ⚠️ **Lưu ý:** Không dùng `gateway4` vì đã bị deprecated từ Ubuntu 22.04 trở lên. Thay bằng `routes` như trên.

Lưu file (`Ctrl+O` → `Enter` → `Ctrl+X`) rồi apply:

```bash
sudo netplan apply
sudo apt update
```

---

## Bước 2 — Fix Hostname

Thêm hostname vào `/etc/hosts` để tránh lỗi `unable to resolve host`:

```bash
echo "127.0.0.1 cicdserver" | sudo tee -a /etc/hosts
```

---

## Bước 3 — Cài Java 21

Jenkins phiên bản mới yêu cầu **Java 21 trở lên** (không dùng Java 17).

```bash
sudo apt update
sudo apt install openjdk-21-jdk -y
java -version
```

Output phải hiện `openjdk 21`.

---

## Bước 4 — Cài Jenkins

### 4.1 Thêm GPG Key

GPG key là để xác minh repo Jenkins là thật, không bị giả mạo hay chỉnh sửa.

```bash
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 7198F4B714ABFC68
```

### 4.2 Thêm Repository Jenkins

vì Ubuntu không có Jenkins sẵn
Repo mặc định của Ubuntu không chứa Jenkins, chạy apt install jenkins sẽ báo Package not found ngay.

```bash
echo "deb [trusted=yes] https://pkg.jenkins.io/debian-stable binary/" | \
  sudo tee /etc/apt/sources.list.d/jenkins.list
```

### 4.3 Cài Đặt

```bash
sudo apt update && sudo apt install jenkins -y
```

### 4.4 Khởi Động Jenkins

```bash
sudo systemctl enable jenkins
sudo systemctl status jenkins
```

Output phải hiện `Active: active (running)`.

---

## Bước 5 — Mở Firewall

```bash
sudo ufw allow 8080
sudo ufw allow 22
sudo ufw enable
```

---

## Bước 6 — Truy Cập Giao Diện Jenkins

Lấy mật khẩu admin lần đầu:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Mở trình duyệt trên máy host, truy cập:

```
http://192.168.159.20:8080
```

Dán mật khẩu vào → chọn **Install suggested plugins** → tạo tài khoản admin → hoàn tất!

---

## Lưu Ý Quan Trọng

| Vấn đề                        | Giải pháp                               |
| ----------------------------- | --------------------------------------- |
| Mất network sau khi restart   | Đã fix vĩnh viễn bằng Netplan ở Bước 1  |
| Jenkins không start           | Kiểm tra Java version: phải là Java 21+ |
| Không truy cập được port 8080 | Chạy `sudo ufw allow 8080`              |
| VMware Network Adapter        | Chọn **NAT** để VM dùng được internet   |

---

## Tạo Snapshot Sau Khi Cài Xong

Sau khi Jenkins chạy thành công, nên tạo snapshot để dễ khôi phục:

1. VMware → **VM** → **Snapshots** → **Take Snapshot**
2. Đặt tên: `jenkins-storage`
3. Bấm **Take Snapshot**

## Bước 7 Cài đặt và khởi động Docker

```bash
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo systemctl status docker
```

Sau khi cài đặt xong và khởi động nếu hiện active (running) là đã cài thành công sau đó kiểm tra phiên bản của docker

```bash
docker --version
```

Cho user hiện tại dùng docker không cần Sudo
vì tk Jenkins chạy user Jenkins nên add vào group docker

```bash
sudo usermod -aG docker jenkins
```

Sau đó hay restart lại

```bash
sudo systemctl restart docker
sudo systemctl restart jenkins
```

## Bước 8: Cài đặt docker compose

```bash
sudo apt install -y docker-compose-plugin
docker compose --version
```

## Bước 9: Cài Git

```bash
sudo apt install -y git
```

## Hướng dẫn cài Sonaquabe và Harbor Registry

Phần này tôi sẽ hướng dẫn sau
