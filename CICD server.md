# CI/CD Server — GitLab + Jenkins + Full Pipeline

> **Đối tượng đọc**: Sinh viên mới học.
> **Vai trò**: Tự động hóa từ lúc Developer push code → build → quét bảo mật → deploy lên Web Server.
> **2 VM**: GitLab (10.10.10.20) và Jenkins (10.10.10.21).

---

## 1. Tổng Quan Pipeline (Sơ Đồ 2)

```
Developer
   │ Push Code
   ▼
GitLab (10.10.10.20) ── Webhook Trigger ──▶ Jenkins (10.10.10.21)
                                                  │
   ┌──────────────────────────────────────────────┘
   ▼
 [1] Checkout → [2] Vault (get secrets) → [3] SonarQube (phân tích code)
   → [4] Build Docker Image → [5] Trivy (quét lỗ hổng image)
   → [6] Push lên Harbor Registry → [7] Test
   → [8] Deploy to Docker Swarm (Web Server 10.10.10.10)
```

**Giải thích cho người mới:**
- **CI (Continuous Integration)**: mỗi lần push code, hệ thống tự build + test ngay → phát hiện lỗi sớm.
- **CD (Continuous Deployment)**: nếu mọi bước OK, tự động đưa code lên server chạy thật.
- **Webhook**: GitLab "gọi điện" cho Jenkins ngay khi có code mới, không cần Jenkins ngồi hỏi liên tục.

---

## 2. Yêu Cầu Phần Cứng (mỗi VM)

| Thành phần | GitLab | Jenkins |
|-----------|--------|---------|
| RAM | 4 GB (min) / 8 GB | 4 GB |
| CPU | 2–4 vCPU | 2 vCPU |
| Disk | 40 GB | 40 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

# PHẦN A — JENKINS SERVER (10.10.10.21)

## A1. Cấu Hình Mạng (Netplan)

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  ethernets:
    ens33:
      dhcp4: false
      addresses: [192.168.159.21/24]
      routes:
        - to: default
          via: 192.168.159.2
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
    ens34:
      dhcp4: false
      addresses: [10.10.10.21/24]
  version: 2
```

```bash
sudo netplan apply
sudo apt update
```

> **Lưu ý**: Không dùng `gateway4` (deprecated từ Ubuntu 22.04). Dùng `routes`.

## A2. Fix Hostname

```bash
echo "127.0.0.1 jenkins-server" | sudo tee -a /etc/hosts
sudo hostnamectl set-hostname jenkins-server
```

## A3. Cài Java 21

Jenkins bản mới yêu cầu **Java 21+** (không dùng Java 17).

```bash
sudo apt update
sudo apt install -y openjdk-21-jdk
java -version           # phải hiện "openjdk 21"
```

## A4. Cài Jenkins

```bash
# GPG key — xác minh repo Jenkins là thật, không bị giả mạo
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 7198F4B714ABFC68

# Thêm repo (Ubuntu mặc định không có Jenkins)
echo "deb [trusted=yes] https://pkg.jenkins.io/debian-stable binary/" | \
  sudo tee /etc/apt/sources.list.d/jenkins.list

sudo apt update && sudo apt install -y jenkins
sudo systemctl enable --now jenkins
sudo systemctl status jenkins         # phải "active (running)"
```

## A5. Mở Firewall + Truy Cập Lần Đầu

```bash
sudo ufw allow 8080
sudo ufw allow 22
sudo ufw enable
```

Lấy mật khẩu admin lần đầu:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Mở trình duyệt → `http://192.168.159.21:8080` → dán mật khẩu → **Install suggested plugins** → tạo tài khoản admin.

## A6. Cài Docker Trên Jenkins (Để Build Image)

```bash
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker

# Jenkins chạy bằng user "jenkins" → thêm vào group docker để build không cần sudo
sudo usermod -aG docker jenkins
sudo systemctl restart docker
sudo systemctl restart jenkins
docker --version
docker compose version
```

## A7. Cài Git

```bash
sudo apt install -y git
```

## A8. Snapshot

VMware → **Take Snapshot** → `jenkins-base-ready`.

---

# PHẦN B — GITLAB SERVER (10.10.10.20)

## B1. Cấu Hình Mạng

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

```bash
sudo netplan apply
echo "127.0.0.1 gitlab-server" | sudo tee -a /etc/hosts
sudo hostnamectl set-hostname gitlab-server
```

## B2. Cài GitLab CE

```bash
sudo apt update
sudo apt install -y curl openssh-server ca-certificates postfix
# (Khi cài postfix hỏi cấu hình → chọn "Internet Site")

curl https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.deb.sh | sudo bash
sudo EXTERNAL_URL="http://192.168.159.20" apt install -y gitlab-ce
```

## B3. Khởi Động + Đăng Nhập

```bash
sudo gitlab-ctl reconfigure        # tự cấu hình toàn bộ (chạy vài phút)
sudo gitlab-ctl status
```

Truy cập `http://192.168.159.20`:
- User: `root`
- Mật khẩu: `sudo cat /etc/gitlab/initial_root_password`

> ⚠️ **Đổi mật khẩu root NGAY sau lần đăng nhập đầu.**

## B4. Tạo Webhook Gọi Jenkins

GitLab → project → **Settings → Webhooks**:
- URL: `http://10.10.10.21:8080/project/shoe-app`
- Secret Token: tạo chuỗi ngẫu nhiên (lưu lại để khai báo ở Jenkins)
- Trigger: tick **Push events** + **Merge request events**
- **Add webhook** → bấm **Test** → phải trả về HTTP 200.

---

# PHẦN C — CÁC CÔNG CỤ TRONG PIPELINE

## C1. Vault (Quản Lý Secret) — trên Jenkins VM

Vault giữ secret (DB password, JWT key). Jenkins lấy lúc build thay vì hardcode trong code.

```bash
wget -O - https://apt.releases.hashicorp.com/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y vault
```

Chạy dev mode (chỉ cho lab — dữ liệu trong RAM):

```bash
vault server -dev -dev-root-token-id="root" &
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN="root"

# ⚠️ PLACEHOLDER — thay bằng secret thật của bạn
vault kv put secret/shoe-app \
  mongo_uri="mongodb+srv://USER:PASSWORD@cluster.mongodb.net/shoedb" \
  redis_url="rediss://USER:PASSWORD@redis-host:6380" \
  jwt_secret="CHANGE_ME_super_secret_jwt"
```

> **Production**: KHÔNG dùng dev mode. Dùng storage backend (Consul/file) + unseal keys + AppRole cho Jenkins thay vì root token.

## C2. SonarQube (Phân Tích Chất Lượng Code) — Docker

```bash
sudo mkdir -p /opt/sonarqube/{data,logs,extensions}
docker run -d --name sonarqube --restart always -p 9000:9000 \
  -v /opt/sonarqube/data:/opt/sonarqube/data \
  -v /opt/sonarqube/logs:/opt/sonarqube/logs \
  -v /opt/sonarqube/extensions:/opt/sonarqube/extensions \
  sonarqube:community
```

Truy cập `http://10.10.10.21:9000` (admin/admin → đổi mật khẩu).
**Projects → Create → Manually** → key `shoe-app` → **Generate token** (lưu lại).

## C3. Trivy (Quét Lỗ Hổng Image)

```bash
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | \
  sudo gpg --dearmor -o /usr/share/keyrings/trivy.gpg
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] \
  https://aquasecurity.github.io/trivy-repo/deb generic main" | \
  sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt update && sudo apt install -y trivy
trivy --version
```

## C4. Harbor (Private Docker Registry)

```bash
cd /opt
wget https://github.com/goharbor/harbor/releases/download/v2.10.0/harbor-online-installer-v2.10.0.tgz
tar xvf harbor-online-installer-v2.10.0.tgz
cd harbor
cp harbor.yml.tmpl harbor.yml
nano harbor.yml
```

Sửa các dòng:

```yaml
hostname: 10.10.10.21
# https:                              # tắt HTTPS cho lab (bật cho production)
harbor_admin_password: CHANGE_ME_Harbor   # ⚠️ đổi placeholder này
```

```bash
sudo ./install.sh           # cần Docker + compose đã cài (Bước A6)
```

Truy cập `http://10.10.10.21` (admin / mật khẩu vừa đặt) → **Projects → New Project** → `shoe` (Private).

Vì dùng HTTP, khai báo registry "insecure" trên Jenkins VM:

```bash
echo '{ "insecure-registries": ["10.10.10.21:80"] }' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
docker login 10.10.10.21:80 -u admin
```

---

# PHẦN D — KẾT NỐI JENKINS VỚI CÁC CÔNG CỤ

Jenkins → **Manage Jenkins → Plugins**, cài: **SonarQube Scanner**, **HashiCorp Vault**, **SSH Agent**, **Docker Pipeline**.

**Manage Jenkins → Credentials** (thêm):
- `harbor-credentials` (Username/Password) — tài khoản Harbor
- `webserver-ssh-key` (SSH private key) — để Jenkins SSH vào Web Server deploy
- `sonar-token` (Secret text) — token SonarQube ở Bước C2

**Manage Jenkins → System**:
- SonarQube servers → Name `SonarQube`, URL `http://10.10.10.21:9000`, token `sonar-token`
- Vault Plugin → URL `http://127.0.0.1:8200`, token `root` (lab)

---

# PHẦN E — JENKINSFILE (PIPELINE HOÀN CHỈNH)

Tạo file `Jenkinsfile` ở thư mục gốc của repo trong GitLab:

```groovy
pipeline {
    agent any
    environment {
        HARBOR    = "10.10.10.21:80"
        PROJECT   = "shoe"
        TAG       = "${BUILD_NUMBER}"
    }
    stages {
        stage('1. Checkout') {
            steps { checkout scm }
        }
        stage('2. Get Secrets (Vault)') {
            steps {
                withVault(vaultSecrets: [[
                    path: 'secret/shoe-app',
                    secretValues: [
                        [envVar: 'MONGO_URI',  vaultKey: 'mongo_uri'],
                        [envVar: 'REDIS_URL',  vaultKey: 'redis_url'],
                        [envVar: 'JWT_SECRET', vaultKey: 'jwt_secret']
                    ]]]) {
                    sh 'echo "Secrets loaded"'
                }
            }
        }
        stage('3. SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh 'sonar-scanner -Dsonar.projectKey=shoe-app -Dsonar.sources=.'
                }
            }
        }
        stage('4. Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        stage('5. Build Images') {
            parallel {
                stage('Frontend') {
                    steps { sh "docker build -t ${HARBOR}/${PROJECT}/frontend:${TAG} ./client" }
                }
                stage('Backend') {
                    steps { sh "docker build -t ${HARBOR}/${PROJECT}/backend:${TAG} ./server" }
                }
            }
        }
        stage('6. Trivy Scan') {
            steps {
                sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${HARBOR}/${PROJECT}/frontend:${TAG}"
                sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${HARBOR}/${PROJECT}/backend:${TAG}"
            }
        }
        stage('7. Push to Harbor') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'harbor-credentials',
                    usernameVariable: 'U', passwordVariable: 'P')]) {
                    sh "docker login ${HARBOR} -u $U -p $P"
                    sh "docker push ${HARBOR}/${PROJECT}/frontend:${TAG}"
                    sh "docker push ${HARBOR}/${PROJECT}/backend:${TAG}"
                }
            }
        }
        stage('8. Deploy to Docker Swarm') {
            steps {
                sshagent(['webserver-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ubuntu@10.10.10.10 '
                            docker service update --image ${HARBOR}/${PROJECT}/frontend:${TAG} shoe-app_frontend
                            docker service update --image ${HARBOR}/${PROJECT}/backend:${TAG}  shoe-app_backend
                        '
                    """
                }
            }
        }
    }
    post {
        success { echo "✅ Build #${BUILD_NUMBER} deployed" }
        failure { echo "❌ Build #${BUILD_NUMBER} failed" }
        always  { cleanWs() }
    }
}
```

Trong Jenkins: **New Item → Pipeline** → **Pipeline script from SCM** → Git URL của repo GitLab → branch `main`, script path `Jenkinsfile`.

---

## F. Tích Hợp Giám Sát

- **Node Exporter** (:9100) → Prometheus (10.10.10.32). Cài như [Webserver.md](Webserver.md) Bước 11, đặt label `server: jenkins` / `server: gitlab`.
- **Zabbix Agent** → Zabbix (10.10.10.31), `Hostname=jenkins-server` / `gitlab-server`.
- **Filebeat** → ElasticSearch (10.10.10.41:5200). Xem [Logging-Server.md](Logging-Server.md) Bước 7.

---

## G. Bảng Tổng Hợp Port

| Service | Server | Port | Mở cho |
|---------|--------|------|--------|
| GitLab Web | 10.10.10.20 | 80 | Developer (VPN) |
| Jenkins | 10.10.10.21 | 8080 | Internal |
| SonarQube | 10.10.10.21 | 9000 | Internal |
| Harbor | 10.10.10.21 | 80 | Internal |
| Vault | 10.10.10.21 | 8200 | localhost |
| Node Exporter | cả 2 | 9100 | Prometheus (10.10.10.32) |
| Zabbix Agent | cả 2 | 10050 | Zabbix (10.10.10.31) |

---

## H. Lưu Ý Quan Trọng

| Vấn đề | Giải pháp |
|--------|-----------|
| Mất network sau restart | Đã fix vĩnh viễn bằng Netplan (Phần A1/B1) |
| Jenkins không start | Kiểm tra Java phải là **21+** |
| Không vào được port 8080 | `sudo ufw allow 8080` |
| Jenkins build báo permission denied (docker) | `sudo usermod -aG docker jenkins` rồi restart |
| VMware không ra internet | Network Adapter chọn **NAT** |

---

## I. Kiểm Tra Tổng Thể

```bash
sudo systemctl status jenkins         # Jenkins running
sudo gitlab-ctl status                # GitLab running (trên VM GitLab)
docker ps | grep sonarqube            # SonarQube container up
trivy --version                       # Trivy OK
docker login 10.10.10.21:80           # Harbor login OK
```
