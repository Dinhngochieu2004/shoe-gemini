# Logging Server — ElasticSearch + Kibana (Application Logs)

> **Đối tượng đọc**: Sinh viên mới học.
> **Vai trò**: Thu thập **log ứng dụng/hệ thống** từ mọi server về một chỗ để tìm kiếm và phân tích.
> **IP theo sơ đồ**: ElasticSearch `10.10.10.41`, Kibana `10.10.10.40`.
> **Phân biệt với Security Server**: Server này lưu log vận hành (nginx, app, syslog). Log **audit/bảo mật** (SSH session, sudo) nằm ở [Security-Server.md](Security-Server.md).

---

## 1. Tổng Quan Kiến Trúc

```
Các server (Web, CI/CD, Monitoring) cài Filebeat
        │ Log shipping :5200
        ▼
┌──────────────────────────────────────────────┐
│  LOGGING SERVER                                │
│                                                │
│   Logstash :5200  (lọc, parse log)            │
│        │                                       │
│        ▼                                       │
│   ElasticSearch (10.10.10.41:9200)            │
│   (lưu trữ + đánh index)                      │
│        │ Query :9200                           │
│        ▼                                       │
│   Kibana (10.10.10.40:5601)                   │
│   (giao diện search + dashboard)              │
└──────────────────────────────────────────────┘
        │ HTTPS:5601 (qua VPN)
        ▼
   System Administrator
```

**Giải thích cho người mới (ELK Stack):**
- **Filebeat**: agent nhẹ đọc file log, gửi đi (đặt trên mọi server).
- **Logstash**: trạm xử lý trung gian — parse, lọc, gắn nhãn log trước khi lưu.
- **ElasticSearch (E)**: kho lưu trữ + công cụ tìm kiếm cực nhanh.
- **Kibana (K)**: web UI để search log và vẽ dashboard.

---

## 2. Yêu Cầu Phần Cứng

| Thành phần | Tối thiểu | Khuyến nghị |
|-----------|-----------|-------------|
| RAM | **8 GB** | 16 GB |
| CPU | 2 vCPU | 4 vCPU |
| Disk | 100 GB | 200 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

> **Tại sao RAM cao?** ElasticSearch là thành phần ngốn RAM nhất hệ thống (Java heap + cache index).

---

## 3. Cấu Hình Mạng (Netplan)

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  ethernets:
    ens33:
      dhcp4: false
      addresses: [10.10.10.40/24]
      routes:
        - to: default
          via: 10.10.10.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
  version: 2
```

```bash
sudo netplan apply
```

---

## 4. Fix Hostname + Chuẩn Bị Kernel

```bash
echo "127.0.0.1 logging-server" | sudo tee -a /etc/hosts
sudo hostnamectl set-hostname logging-server

# ElasticSearch yêu cầu tăng giới hạn virtual memory, nếu không sẽ không start
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

sudo apt update && sudo apt install -y openjdk-17-jdk
```

---

## 5. Cài ElasticSearch (10.10.10.41:9200)

```bash
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | \
  sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
sudo apt install -y apt-transport-https
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] \
  https://artifacts.elastic.co/packages/8.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install -y elasticsearch
```

Cấu hình:

```bash
sudo nano /etc/elasticsearch/elasticsearch.yml
```

```yaml
cluster.name: shoe-logging-cluster
node.name: logging-node-1
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node

# Lab: tắt security cho đơn giản. ⚠️ PRODUCTION phải bật lại (xác thực + TLS)!
xpack.security.enabled: false
```

Giới hạn Java heap = 50% RAM (vd VM 8GB → 4g):

```bash
echo -e "-Xms4g\n-Xmx4g" | sudo tee /etc/elasticsearch/jvm.options.d/heap.options
sudo systemctl daemon-reload
sudo systemctl enable --now elasticsearch
sleep 30
curl http://localhost:9200            # phải trả JSON "You Know, for Search"
```

---

## 6. Cài Logstash (:5200)

```bash
sudo apt install -y logstash
sudo nano /etc/logstash/conf.d/shoe-pipeline.conf
```

```
input {
  beats { port => 5200 }              # nhận log từ Filebeat
}
filter {
  if [fields][log_type] == "nginx" {
    grok { match => { "message" => "%{COMBINEDAPACHELOG}" } }
  }
  if [fields][log_type] == "app" {
    json { source => "message" }
  }
}
output {
  elasticsearch {
    hosts => ["http://localhost:9200"]
    index => "shoe-logs-%{[fields][server]}-%{+YYYY.MM.dd}"
  }
}
```

```bash
sudo systemctl enable --now logstash
```

---

## 7. Cài Filebeat Trên Các Server Khác

> Lặp lại trên: Web Server, GitLab, Jenkins, Monitoring Server.

```bash
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | \
  sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] \
  https://artifacts.elastic.co/packages/8.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install -y filebeat

sudo nano /etc/filebeat/filebeat.yml
```

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/syslog
    fields: { log_type: system, server: webserver }   # đổi 'server' theo từng máy

  - type: log
    enabled: true
    paths:
      - /var/log/nginx/*.log                            # chỉ trên Web Server
    fields: { log_type: nginx, server: webserver }

output.logstash:
  hosts: ["10.10.10.41:5200"]
output.elasticsearch:
  enabled: false
```

```bash
sudo systemctl enable --now filebeat
sudo journalctl -u filebeat -f          # xem log đang được gửi
```

---

## 8. Cài Kibana (10.10.10.40:5601, HTTPS)

```bash
sudo apt install -y kibana
sudo mkdir -p /etc/kibana/certs
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/kibana/certs/kibana.key -out /etc/kibana/certs/kibana.crt \
  -subj "/CN=10.10.10.40"
sudo chown -R kibana:kibana /etc/kibana/certs

sudo nano /etc/kibana/kibana.yml
```

```yaml
server.port: 5601
server.host: "0.0.0.0"
elasticsearch.hosts: ["http://localhost:9200"]
server.ssl.enabled: true
server.ssl.certificate: /etc/kibana/certs/kibana.crt
server.ssl.key: /etc/kibana/certs/kibana.key
```

```bash
sudo systemctl enable --now kibana
```

Truy cập `https://10.10.10.40:5601` (qua VPN).
**Stack Management → Index Patterns → Create** → pattern `shoe-logs-*`, time field `@timestamp`.
Xem log: **Analytics → Discover**.

---

## 9. Tự Động Xóa Log Cũ (ILM — Tiết Kiệm Disk)

```bash
curl -X PUT "http://10.10.10.41:9200/_ilm/policy/shoe-logs-policy" \
  -H "Content-Type: application/json" -d '{
    "policy": { "phases": {
      "hot":    { "min_age": "0ms", "actions": {} },
      "delete": { "min_age": "30d", "actions": { "delete": {} } }
    }}
  }'
```

> Giải thích: log cũ hơn 30 ngày tự xóa → disk không bị đầy dần.

---

## 10. Firewall (UFW)

```bash
sudo ufw allow 22/tcp
sudo ufw allow from 10.10.10.0/24 to any port 9200   # ElasticSearch (internal)
sudo ufw allow from 10.10.10.0/24 to any port 5200   # Logstash nhận Filebeat
sudo ufw allow 5601/tcp                              # Kibana (qua VPN)
sudo ufw enable
```

---

## 11. Bảng Tổng Hợp Port

| Service | IP (sơ đồ) | Port | Mở cho |
|---------|-----------|------|--------|
| ElasticSearch | 10.10.10.41 | 9200 | Kibana, Logstash (internal) |
| Logstash | 10.10.10.41 | 5200 | Filebeat từ mọi server |
| Kibana | 10.10.10.40 | 5601 (HTTPS) | SysAdmin qua VPN |
| SSH | — | 22 | Internal / Bastion |

---

## 12. Kiểm Tra Tổng Thể

```bash
curl http://10.10.10.41:9200/_cluster/health?pretty     # status: green/yellow
curl http://10.10.10.41:9200/_cat/indices?v             # phải thấy index shoe-logs-*
curl http://localhost:9600/?pretty                      # Logstash sống
curl -k https://10.10.10.40:5601/api/status             # Kibana available
```

---

## 13. Lưu Ý Quan Trọng

| Vấn đề | Giải pháp |
|--------|-----------|
| ElasticSearch không start | RAM thiếu → giảm heap trong `jvm.options.d/heap.options` |
| `max_map_count too low` | `sudo sysctl -w vm.max_map_count=262144` |
| Kibana báo không kết nối ES | Đợi 30–60s sau khi ES start |
| Không thấy log trong Kibana | Kiểm tra `journalctl -u filebeat` trên server nguồn |

---

## 14. Snapshot VMware

**VM → Snapshots → Take Snapshot** → `logging-stack-ready`.
