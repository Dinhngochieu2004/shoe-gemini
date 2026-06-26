# Security Server — Audit / SIEM (ElasticSearch + Kibana)

> **Đối tượng đọc**: Sinh viên mới học.
> **Vai trò**: Kho lưu **log bảo mật/audit** RIÊNG BIỆT với log vận hành — gồm SSH session, lệnh sudo, auth.log. Phục vụ Security Officer điều tra sự cố.
> **IP theo sơ đồ 3**: ElasticSearch `10.0.1.1`, Kibana `10.1.0.1`.
> **Tại sao tách riêng?** Nếu kẻ tấn công chiếm được Logging Server vận hành, log audit vẫn an toàn ở một hệ thống độc lập → đảm bảo tính toàn vẹn bằng chứng (non-repudiation).

---

## 1. Tổng Quan Kiến Trúc (Sơ Đồ 3)

```
Security Officer
   │ HTTPS:5601 (qua VPN → pfSense)
   ▼
┌──────────────────────────────────────────────┐
│  SECURITY SERVER                               │
│                                                │
│   Kibana (10.1.0.1:5601)                      │
│        │ Query :9200                           │
│        ▼                                       │
│   ElasticSearch (10.0.1.1:9200)               │
│        ▲                                       │
│        │ Audit / Session Logs                  │
└────────┼───────────────────────────────────────┘
         │ Log Forward
   Bastion Host (10.10.10.5)
         ▲ SSH session + auth.log của TẤT CẢ truy cập
```

**Giải thích cho người mới:**
- Đây cũng là một **ELK stack** (như Logging Server) nhưng chuyên cho **bảo mật**.
- Nguồn log chính là **Bastion Host** — nơi mọi phiên SSH đi qua và được ghi lại.
- **SIEM** (Security Information and Event Management): hệ thống tập trung log bảo mật để phát hiện hành vi bất thường.

---

## 2. Yêu Cầu Phần Cứng

| Thành phần | Tối thiểu | Khuyến nghị |
|-----------|-----------|-------------|
| RAM | 8 GB | 16 GB |
| CPU | 2 vCPU | 4 vCPU |
| Disk | 100 GB | 200 GB (giữ log audit lâu hơn) |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## 3. Cấu Hình Mạng (Netplan)

> Sơ đồ dùng 2 dải IP cho 2 dịch vụ (`10.0.1.1` cho ES, `10.1.0.1` cho Kibana). Trong lab chạy 1 VM, ta gán cả 2 IP alias lên cùng card.

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  ethernets:
    ens33:
      dhcp4: false
      addresses:
        - 10.0.1.1/24        # ElasticSearch
        - 10.1.0.1/24        # Kibana (IP alias thứ hai)
      routes:
        - to: default
          via: 10.0.1.254
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
  version: 2
```

```bash
sudo netplan apply
ip a | grep -E '10.0.1.1|10.1.0.1'      # xác nhận cả 2 IP đã lên
```

---

## 4. Fix Hostname + Chuẩn Bị Kernel

```bash
echo "127.0.0.1 security-server" | sudo tee -a /etc/hosts
sudo hostnamectl set-hostname security-server

sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo apt update && sudo apt install -y openjdk-17-jdk
```

---

## 5. Cài ElasticSearch (10.0.1.1:9200)

```bash
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | \
  sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
sudo apt install -y apt-transport-https
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] \
  https://artifacts.elastic.co/packages/8.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install -y elasticsearch

sudo nano /etc/elasticsearch/elasticsearch.yml
```

```yaml
cluster.name: shoe-security-cluster
node.name: security-node-1
network.host: 10.0.1.1
http.port: 9200
discovery.type: single-node

# ⚠️ Server bảo mật: KHUYẾN NGHỊ bật security + TLS ngay cả trong lab.
# Để đơn giản hóa lab có thể tắt, nhưng production BẮT BUỘC bật:
xpack.security.enabled: false
```

```bash
echo -e "-Xms4g\n-Xmx4g" | sudo tee /etc/elasticsearch/jvm.options.d/heap.options
sudo systemctl daemon-reload
sudo systemctl enable --now elasticsearch
sleep 30
curl http://10.0.1.1:9200
```

---

## 6. Cài Logstash (Nhận Audit Log Từ Bastion)

```bash
sudo apt install -y logstash
sudo nano /etc/logstash/conf.d/audit-pipeline.conf
```

```
input {
  beats { port => 5044 }                # Filebeat từ Bastion gửi tới đây
}
filter {
  if [fields][log_type] == "audit" {
    grok { match => { "message" => "%{SYSLOGTIMESTAMP:ts} %{HOSTNAME:host} %{GREEDYDATA:msg}" } }
  }
  # Đánh dấu các sự kiện nhạy cảm để dễ truy vấn
  if "sudo" in [message] or "Failed password" in [message] or "Accepted publickey" in [message] {
    mutate { add_tag => ["security_event"] }
  }
}
output {
  elasticsearch {
    hosts => ["http://10.0.1.1:9200"]
    index => "audit-logs-%{+YYYY.MM.dd}"
  }
}
```

```bash
sudo systemctl enable --now logstash
```

---

## 7. Cấu Hình Bastion Host Forward Audit Log

> Thực hiện trên **Bastion Host** (10.10.10.5). Chi tiết Bastion xem [Ansible.md](Ansible.md) Phần 1.

Cài Filebeat trên Bastion để đẩy session + auth log về Security Server:

```bash
# Trên Bastion Host
sudo apt install -y filebeat
sudo nano /etc/filebeat/filebeat.yml
```

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/auth.log                 # đăng nhập, sudo, SSH
      - /var/log/ssh-sessions/*.log       # bản ghi từng phiên SSH
    fields: { log_type: audit, server: bastion }

output.logstash:
  hosts: ["10.0.1.1:5044"]               # → Security Server
```

```bash
sudo systemctl enable --now filebeat
```

---

## 8. Cài Kibana (10.1.0.1:5601, HTTPS)

```bash
sudo apt install -y kibana
sudo mkdir -p /etc/kibana/certs
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/kibana/certs/kibana.key -out /etc/kibana/certs/kibana.crt \
  -subj "/CN=10.1.0.1"
sudo chown -R kibana:kibana /etc/kibana/certs

sudo nano /etc/kibana/kibana.yml
```

```yaml
server.port: 5601
server.host: "10.1.0.1"
elasticsearch.hosts: ["http://10.0.1.1:9200"]
server.ssl.enabled: true
server.ssl.certificate: /etc/kibana/certs/kibana.crt
server.ssl.key: /etc/kibana/certs/kibana.key
```

```bash
sudo systemctl enable --now kibana
```

Security Officer truy cập `https://10.1.0.1:5601` (qua VPN).
**Stack Management → Index Patterns → Create** → `audit-logs-*`.
Truy vấn nhanh sự kiện bảo mật: **Discover** → search `tags: security_event`.

---

## 9. Giữ Log Audit Lâu Hơn (ILM 1 Năm)

> Log bảo mật thường phải lưu lâu (tuân thủ/điều tra) — khác log vận hành chỉ 30 ngày.

```bash
curl -X PUT "http://10.0.1.1:9200/_ilm/policy/audit-logs-policy" \
  -H "Content-Type: application/json" -d '{
    "policy": { "phases": {
      "hot":    { "min_age": "0ms", "actions": {} },
      "delete": { "min_age": "365d", "actions": { "delete": {} } }
    }}
  }'
```

---

## 10. Tăng Cường Bảo Mật (Quan Trọng Với Server Này)

```bash
# Chỉ Security Officer (qua VPN) và Bastion mới được chạm vào server này
sudo ufw default deny incoming
sudo ufw allow 22/tcp                                   # SSH (qua Bastion)
sudo ufw allow from 10.10.10.5 to any port 5044         # Logstash ← Bastion
sudo ufw allow 5601/tcp                                 # Kibana ← VPN
sudo ufw enable
```

> **Least-privilege**: port 9200 (ElasticSearch) KHÔNG mở ra ngoài — chỉ Kibana cùng máy truy cập qua localhost/10.0.1.1.

Đặt index audit ở chế độ append-only để chống sửa log (chống xóa dấu vết):

```bash
# Trên ElasticSearch — chặn xóa/sửa document trong index audit
curl -X PUT "http://10.0.1.1:9200/audit-logs-*/_settings" \
  -H "Content-Type: application/json" \
  -d '{ "index.blocks.write": false, "index.blocks.delete": true }'
```

---

## 11. Bảng Tổng Hợp Port

| Service | IP (sơ đồ) | Port | Mở cho |
|---------|-----------|------|--------|
| ElasticSearch | 10.0.1.1 | 9200 | Kibana (localhost) |
| Logstash | 10.0.1.1 | 5044 | Bastion Host (10.10.10.5) |
| Kibana | 10.1.0.1 | 5601 (HTTPS) | Security Officer qua VPN |
| SSH | — | 22 | Qua Bastion |

---

## 12. Kiểm Tra Tổng Thể

```bash
curl http://10.0.1.1:9200/_cluster/health?pretty       # ES green/yellow
curl http://10.0.1.1:9200/_cat/indices?v               # thấy audit-logs-*
curl -k https://10.1.0.1:5601/api/status               # Kibana available
# Trên Bastion: tạo 1 lần SSH thử rồi kiểm tra log đã chảy về
ssh someuser@10.10.10.5 'exit'; curl "http://10.0.1.1:9200/audit-logs-*/_count"
```

---

## 13. Snapshot VMware

**VM → Snapshots → Take Snapshot** → `security-siem-ready`.

---

## Liên Quan
- Nguồn log audit: [Ansible.md](Ansible.md) (Bastion Host + session recording)
- Phân biệt với log vận hành: [Logging-Server.md](Logging-Server.md)
