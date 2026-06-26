# Monitoring Server — Prometheus + Zabbix + Grafana

> **Đối tượng đọc**: Sinh viên mới học.
> **Vai trò**: Giám sát sức khỏe toàn hệ thống (CPU, RAM, disk, service) và báo động khi có sự cố.
> **IP theo sơ đồ**: Grafana `10.10.10.30`, Zabbix `10.10.10.31`, Prometheus `10.10.10.32`.

---

## 1. Tổng Quan Kiến Trúc

```
Các server khác (Web, CI/CD, Logging) cài sẵn:
   Node Exporter :9100   ─────┐ (Prometheus KÉO về)
   Zabbix Agent  :10050  ──┐  │ (Zabbix HỎI từng agent)
                           │  │
┌──────────────────────────┼──┼──────────────────────────┐
│  MONITORING SERVER        │  │                           │
│                           ▼  ▼                           │
│   Zabbix (10.10.10.31)    Prometheus (10.10.10.32)       │
│        │                       │                         │
│        │ Datasource Query      │ Datasource Query        │
│        └───────────┬───────────┘                         │
│                    ▼                                      │
│              Grafana (10.10.10.30)                        │
│                    │ Trigger                              │
│                    ▼                                      │
│              Alerting ──▶ Email / System Administrator    │
└──────────────────────────────────────────────────────────┘
            │ HTTPS:3000 (Grafana qua VPN)
            ▼
      System Administrator
```

**Giải thích cho người mới — 2 công cụ khác gì nhau?**
- **Prometheus**: chủ động **KÉO** (pull) metrics từ Node Exporter mỗi 15s. Mạnh về số liệu thời gian thực (time-series).
- **Zabbix**: nền tảng giám sát tổng hợp, có agent cài trên từng máy, mạnh về cảnh báo + giám sát hạ tầng truyền thống.
- **Grafana**: vẽ biểu đồ đẹp từ cả hai nguồn trên, là nơi bạn nhìn vào hằng ngày.

> **Lab note**: 3 dịch vụ chạy trên cùng 1 VM. Mỗi dịch vụ gắn 1 IP alias theo sơ đồ. Đơn giản nhất: dùng `10.10.10.30` làm IP chính, ba dịch vụ phân biệt bằng port. Bên dưới ghi rõ IP/port theo sơ đồ để bạn map đúng.

---

## 2. Yêu Cầu Phần Cứng

| Thành phần | Tối thiểu | Khuyến nghị |
|-----------|-----------|-------------|
| RAM | 4 GB | 8 GB |
| CPU | 2 vCPU | 4 vCPU |
| Disk | 40 GB | 80 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## 3. Cấu Hình Mạng (Netplan)

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

Single VM chạy 3 dịch vụ. Để mỗi dịch vụ có đúng IP như sơ đồ, ta gán 3 IP alias lên cùng 1 card:

```yaml
network:
  ethernets:
    ens33:
      dhcp4: false
      addresses:
        - 10.10.10.30/24        # Grafana
        - 10.10.10.31/24        # Zabbix  (IP alias)
        - 10.10.10.32/24        # Prometheus (IP alias)
      routes:
        - to: default
          via: 10.10.10.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
  version: 2
```

```bash
sudo netplan apply
ip a | grep -E '10.10.10.3[012]'      # xác nhận cả 3 IP đã lên
```

> **Tại sao chỉ 1 card NAT-free?** Monitoring nằm trong mạng nội bộ, SysAdmin truy cập qua VPN → không cần card NAT public. Ba IP alias giúp tài liệu khớp chính xác sơ đồ (Grafana .30, Zabbix .31, Prometheus .32).

---

## 4. Fix Hostname

```bash
echo "127.0.0.1 monitoring-server" | sudo tee -a /etc/hosts
sudo hostnamectl set-hostname monitoring-server
```

---

## 5. Cài Prometheus (10.10.10.32:9090)

```bash
# Tạo user riêng (không cho login) — nguyên tắc least-privilege
sudo useradd --no-create-home --shell /bin/false prometheus
sudo mkdir -p /etc/prometheus /var/lib/prometheus
sudo chown prometheus:prometheus /var/lib/prometheus

cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v2.49.0/prometheus-2.49.0.linux-amd64.tar.gz
tar xvf prometheus-2.49.0.linux-amd64.tar.gz
cd prometheus-2.49.0.linux-amd64
sudo mv prometheus promtool /usr/local/bin/
sudo mv consoles console_libraries /etc/prometheus/
sudo chown -R prometheus:prometheus /etc/prometheus
```

Cấu hình các target để Prometheus kéo metrics:

```bash
sudo nano /etc/prometheus/prometheus.yml
```

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "node-exporters"
    static_configs:
      - targets: ["10.10.10.30:9100"]
        labels: { server: "monitoring" }
      - targets: ["10.10.10.10:9100"]
        labels: { server: "webserver" }
      - targets: ["10.10.10.20:9100"]
        labels: { server: "gitlab" }
      - targets: ["10.10.10.21:9100"]
        labels: { server: "jenkins" }
      - targets: ["10.10.10.41:9100"]
        labels: { server: "elasticsearch" }
      - targets: ["10.10.10.40:9100"]
        labels: { server: "kibana" }
```

Tạo service systemd (bind vào IP 10.10.10.32 theo sơ đồ):

```bash
sudo tee /etc/systemd/system/prometheus.service <<EOF
[Unit]
Description=Prometheus
After=network-online.target
[Service]
User=prometheus
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus/ \
  --web.listen-address=10.10.10.32:9090
[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now prometheus
```

Truy cập `http://10.10.10.32:9090` → **Status → Targets** → tất cả phải "UP".

---

## 6. Cài Zabbix Server (10.10.10.31)

```bash
wget https://repo.zabbix.com/zabbix/6.4/ubuntu/pool/main/z/zabbix-release/zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo dpkg -i zabbix-release_6.4-1+ubuntu22.04_all.deb
sudo apt update
sudo apt install -y zabbix-server-mysql zabbix-frontend-php \
  zabbix-nginx-conf zabbix-sql-scripts zabbix-agent2 mysql-server
```

Tạo database (⚠️ đổi placeholder password):

```bash
sudo mysql -uroot <<'SQL'
CREATE DATABASE zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER 'zabbix'@'localhost' IDENTIFIED BY 'CHANGE_ME_ZabbixDB';
GRANT ALL PRIVILEGES ON zabbix.* TO 'zabbix'@'localhost';
SET GLOBAL log_bin_trust_function_creators = 1;
FLUSH PRIVILEGES;
SQL

zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | \
  mysql --default-character-set=utf8mb4 -uzabbix -pCHANGE_ME_ZabbixDB zabbix
```

Khai báo password vào config + đặt port web 8080:

```bash
sudo sed -i 's/^# DBPassword=.*/DBPassword=CHANGE_ME_ZabbixDB/' /etc/zabbix/zabbix_server.conf
sudo sed -i 's/listen .*/listen 8080;/' /etc/zabbix/nginx.conf

sudo systemctl restart zabbix-server zabbix-agent2 nginx php8.1-fpm
sudo systemctl enable zabbix-server zabbix-agent2 nginx php8.1-fpm
```

Truy cập `http://10.10.10.31:8080` (Admin / `zabbix` → **đổi mật khẩu ngay**).

### Thêm host vào Zabbix
**Configuration → Hosts → Create host**: đặt Host name trùng `Hostname` trong agent (vd `webserver`), Interface → IP server đó (vd `10.10.10.10`), Template → `Linux by Zabbix agent`.

> Cách cài Zabbix Agent trên từng server: xem [Webserver.md](Webserver.md) Bước 11.

---

## 7. Cài Grafana (10.10.10.30:3000, HTTPS)

```bash
sudo apt install -y apt-transport-https software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt update && sudo apt install -y grafana
```

Bật HTTPS (SysAdmin truy cập qua VPN):

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/grafana.key -out /etc/ssl/certs/grafana.crt \
  -subj "/CN=10.10.10.30"
sudo chown grafana:grafana /etc/ssl/private/grafana.key /etc/ssl/certs/grafana.crt

sudo sed -i 's|^;protocol = http|protocol = https|'  /etc/grafana/grafana.ini
sudo sed -i 's|^;cert_file =.*|cert_file = /etc/ssl/certs/grafana.crt|'   /etc/grafana/grafana.ini
sudo sed -i 's|^;cert_key =.*|cert_key = /etc/ssl/private/grafana.key|'   /etc/grafana/grafana.ini

sudo systemctl enable --now grafana-server
```

Truy cập `https://10.10.10.30:3000` (admin/admin → **đổi mật khẩu**).

### Thêm Datasource + Dashboard
1. **Connections → Data sources → Add** → **Prometheus** → URL `http://10.10.10.32:9090` → **Save & Test**.
2. (Tùy chọn) thêm datasource **Zabbix** (cài plugin `alexanderzobnin-zabbix-app`).
3. **Dashboards → Import** → ID **1860** (Node Exporter Full) → chọn datasource Prometheus.

---

## 8. Cấu Hình Alerting (Báo Động Qua Email)

**Grafana → Alerting → Contact points → New**:
- Integration: **Email**, Addresses: `admin@your-domain.com`

**Alerting → Notification policies** → gắn contact point vừa tạo.

Tạo alert rule mẫu (CPU > 80%): mở panel CPU trong dashboard 1860 → **Edit → Alert → Create alert rule** → điều kiện `avg() > 80` → contact point Email.

---

## 9. Firewall (UFW)

```bash
sudo ufw allow 22/tcp                              # SSH
sudo ufw allow 3000/tcp                            # Grafana (qua VPN)
sudo ufw allow from 10.10.10.0/24 to any port 9090 # Prometheus (internal)
sudo ufw allow from 10.10.10.0/24 to any port 8080 # Zabbix Web (internal)
sudo ufw allow from 10.10.10.0/24 to any port 10051# Zabbix Server nhận agent
sudo ufw enable
```

---

## 10. Bảng Tổng Hợp Port

| Service | IP (sơ đồ) | Port | Mở cho |
|---------|-----------|------|--------|
| Grafana | 10.10.10.30 | 3000 (HTTPS) | SysAdmin qua VPN |
| Zabbix Web | 10.10.10.31 | 8080 | Internal |
| Zabbix Server | 10.10.10.31 | 10051 | Các Zabbix Agent |
| Prometheus | 10.10.10.32 | 9090 | Internal |
| Node Exporter | (mọi server) | 9100 | Prometheus pull |

---

## 11. Kiểm Tra Tổng Thể

```bash
curl -s 10.10.10.32:9090/-/healthy                     # Prometheus healthy
curl -s "10.10.10.32:9090/api/v1/targets" | grep -o '"health":"[a-z]*"' | sort -u
sudo systemctl status zabbix-server | head -3          # Zabbix running
curl -k https://10.10.10.30:3000/api/health            # Grafana ok
```

---

## 12. Snapshot VMware

**VM → Snapshots → Take Snapshot** → `monitoring-stack-ready`.
