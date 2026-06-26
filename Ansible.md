# Ansible + Bastion Host — Quản Lý Cấu Hình & Kiểm Soát Truy Cập

> **Đối tượng đọc**: Sinh viên mới học.
> **Vai trò**: (1) **Bastion Host** = cổng SSH duy nhất vào hệ thống, ghi lại mọi phiên. (2) **Ansible** = tự động đẩy cấu hình đồng nhất tới tất cả server.
> **IP**: Bastion `10.10.10.5`.

---

## 1. Tổng Quan Kiến Trúc (Sơ Đồ 3)

```
System Administrator
   │ SSH:22 (MFA + Ed25519)
   ▼
Bastion Host (10.10.10.5) ── Audit/Session Logs ──▶ Security Server (10.0.1.1)
   │
   │ SSH Jump + Ansible chạy từ đây
   ▼
Ansible Control Node
   ├──▶ Config Push ─────────────────▶ Web Server (10.10.10.10)  [auto-deploy Swarm]
   ├──▶ Config Push (scoped sudoers) ▶ CI/CD Server               [Developer: no-sudo]
   ├──▶ Config Push ─────────────────▶ Monitoring Server (10.10.10.30)
   └──▶ Config Push (append-only) ───▶ Logging Server (10.10.10.40) [SOC: sudo]

Developer                 ── SSH:22 no-sudo ─▶ CI/CD Server
Security Operation Center ── SSH:22 sudo ────▶ Logging Server
```

**Giải thích cho người mới:**
- **Bastion Host (jump host)**: thay vì mở SSH của 6 server ra internet (rất nguy hiểm), ta chỉ mở 1 cửa duy nhất = Bastion. Mọi người vào Bastion trước, rồi mới "nhảy" (jump) vào server đích.
- **MFA**: cần cả SSH key **và** mã OTP 6 số trên điện thoại → mất key vẫn chưa vào được.
- **Ansible**: thay vì SSH vào từng máy gõ lệnh tay (dễ sai, không đồng nhất), viết "playbook" một lần rồi đẩy tới mọi máy.
- **Idempotent**: chạy playbook nhiều lần kết quả vẫn như nhau — Ansible chỉ thay đổi cái gì chưa đúng.

---

# PHẦN 1 — BASTION HOST

## 1.1 Yêu Cầu Phần Cứng

| RAM | CPU | Disk | Card mạng |
|-----|-----|------|-----------|
| 1 GB | 1 vCPU | 20 GB | 2 (NAT + Internal) |

## 1.2 Cấu Hình Mạng

```yaml
network:
  ethernets:
    ens33:                              # NAT — nhận SSH từ ngoài (qua pfSense/VPN)
      dhcp4: false
      addresses: [192.168.159.5/24]
      routes:
        - to: default
          via: 192.168.159.2
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
    ens34:                              # Internal — jump vào server đích
      dhcp4: false
      addresses: [10.10.10.5/24]
  version: 2
```

```bash
sudo netplan apply
echo "127.0.0.1 bastion" | sudo tee -a /etc/hosts
sudo hostnamectl set-hostname bastion
```

## 1.3 Hardening SSH

```bash
sudo nano /etc/ssh/sshd_config
```

```ini
PasswordAuthentication no          # cấm đăng nhập bằng mật khẩu (chỉ key)
PubkeyAuthentication yes
PermitRootLogin no                 # cấm login thẳng bằng root
AllowGroups ssh-users              # chỉ group này được vào Bastion
MaxAuthTries 3
ClientAliveInterval 300            # tự ngắt nếu idle 5 phút
ClientAliveCountMax 0
LogLevel VERBOSE                   # log chi tiết để audit
```

```bash
sudo systemctl restart ssh
```

## 1.4 Tạo Group + User

```bash
sudo groupadd ssh-users
sudo useradd -m -s /bin/bash sysadmin && sudo usermod -aG ssh-users sysadmin
sudo useradd -m -s /bin/bash ansible  && sudo usermod -aG ssh-users ansible
```

## 1.5 Bật MFA (Google Authenticator)

```bash
sudo apt update && sudo apt install -y libpam-google-authenticator

su - sysadmin
google-authenticator
# Trả lời: time-based? y → quét QR bằng app điện thoại → update file? y
#          disallow multiple use? y → rate limiting? y
exit
```

Kích hoạt PAM cho SSH:

```bash
# Thêm vào ĐẦU file /etc/pam.d/sshd
echo 'auth required pam_google_authenticator.so' | sudo tee /tmp/ga.line
sudo sed -i '1i auth required pam_google_authenticator.so' /etc/pam.d/sshd
```

```bash
sudo nano /etc/ssh/sshd_config
```

```ini
KbdInteractiveAuthentication yes
AuthenticationMethods publickey,keyboard-interactive    # cần CẢ key VÀ OTP
```

```bash
sudo systemctl restart ssh
```

## 1.6 Tạo SSH Key Ed25519 (trên máy của SysAdmin)

```bash
# Ed25519 an toàn & nhanh hơn RSA
ssh-keygen -t ed25519 -C "sysadmin@shoe-infra" -f ~/.ssh/shoe_ed25519
ssh-copy-id -i ~/.ssh/shoe_ed25519.pub sysadmin@192.168.159.5
ssh -i ~/.ssh/shoe_ed25519 sysadmin@192.168.159.5      # sẽ hỏi thêm OTP
```

## 1.7 Ghi Lại Phiên SSH (Session Recording → Security Server)

```bash
sudo apt install -y util-linux        # cung cấp lệnh "script"
sudo mkdir -p /var/log/ssh-sessions

sudo tee /etc/profile.d/session-audit.sh <<'EOF'
if [ -n "$SSH_CONNECTION" ] && [ "$USER" != "ansible" ]; then
    LOG="/var/log/ssh-sessions/$(date +%Y%m%d_%H%M%S)_${USER}.log"
    script -q -f "$LOG"
fi
EOF
sudo chmod +x /etc/profile.d/session-audit.sh
```

> Forward log này về Security Server: cài Filebeat trỏ tới `10.0.1.1:5044` — xem [Security-Server.md](Security-Server.md) Bước 7.

---

# PHẦN 2 — ANSIBLE CONTROL NODE

> Cài Ansible ngay trên Bastion Host (chạy bằng user `ansible`).

## 2.1 Cài Ansible

```bash
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository --yes --update ppa:ansible/ansible
sudo apt install -y ansible
ansible --version
```

## 2.2 SSH Key Cho Ansible (Không MFA — Để Tự Động Hóa)

```bash
sudo su - ansible
ssh-keygen -t ed25519 -C "ansible@shoe-infra" -f ~/.ssh/ansible_ed25519 -N ""
```

## 2.3 Tạo User `ansible` Trên Mọi Managed Server

> Lặp lại trên: Web (10.10.10.10), GitLab (.20), Jenkins (.21), Monitoring (.30), Logging (.40).

```bash
sudo useradd -m -s /bin/bash ansible
echo "ansible ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/ansible
sudo chmod 440 /etc/sudoers.d/ansible
```

Copy public key từ Bastion sang từng máy:

```bash
# Chạy với user ansible trên Bastion
for S in 10.10.10.10 10.10.10.20 10.10.10.21 10.10.10.30 10.10.10.40; do
    ssh-copy-id -i ~/.ssh/ansible_ed25519.pub ansible@$S
done
```

## 2.4 Inventory

```bash
sudo nano /etc/ansible/hosts
```

```ini
[webserver]
10.10.10.10

[cicd]
10.10.10.20 server_role=gitlab
10.10.10.21 server_role=jenkins

[monitoring]
10.10.10.30

[logging]
10.10.10.40

[all_servers:children]
webserver
cicd
monitoring
logging

[all_servers:vars]
ansible_user=ansible
ansible_ssh_private_key_file=/home/ansible/.ssh/ansible_ed25519
```

## 2.5 ansible.cfg

```bash
sudo nano /etc/ansible/ansible.cfg
```

```ini
[defaults]
inventory         = /etc/ansible/hosts
remote_user       = ansible
host_key_checking = False
log_path          = /var/log/ansible/ansible.log
forks             = 5

[privilege_escalation]
become        = True
become_method = sudo
```

```bash
sudo mkdir -p /var/log/ansible && sudo chown ansible /var/log/ansible
ansible all_servers -m ping            # mọi máy phải trả "pong"
```

---

# PHẦN 3 — PLAYBOOKS

```bash
sudo mkdir -p /opt/ansible-playbooks && cd /opt/ansible-playbooks
```

## 3.1 SSH Hardening (Tất Cả Server)

```bash
nano ssh-hardening.yml
```

```yaml
---
- name: SSH Hardening toàn hệ thống
  hosts: all_servers
  become: true
  tasks:
    - name: Áp dụng các tham số sshd an toàn
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.re }}"
        line: "{{ item.line }}"
      loop:
        - { re: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { re: '^#?PermitRootLogin',        line: 'PermitRootLogin no' }
        - { re: '^#?MaxAuthTries',           line: 'MaxAuthTries 3' }
        - { re: '^#?LogLevel',               line: 'LogLevel VERBOSE' }
      notify: restart ssh
  handlers:
    - name: restart ssh
      service: { name: ssh, state: restarted }
```

## 3.2 CI/CD Access — Developer KHÔNG Sudo

```bash
nano cicd-access.yml
```

```yaml
---
- name: Cấu hình quyền cho Developer trên CI/CD
  hosts: cicd
  become: true
  vars:
    developers: [dev01, dev02, dev03]
  tasks:
    - name: Tạo group developer
      group: { name: developer, state: present }

    - name: Tạo user developer (KHÔNG thêm vào sudo)
      user:
        name: "{{ item }}"
        groups: developer
        shell: /bin/bash
      loop: "{{ developers }}"

    - name: Đảm bảo developer KHÔNG có file sudoers
      file:
        path: "/etc/sudoers.d/{{ item }}"
        state: absent
      loop: "{{ developers }}"

    - name: Chỉ cho group hợp lệ SSH vào
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^AllowGroups'
        line: 'AllowGroups ssh-users developer ansible'
      notify: restart ssh
  handlers:
    - name: restart ssh
      service: { name: ssh, state: restarted }
```

## 3.3 Logging Access — SOC Sudo Giới Hạn (Scoped)

```bash
nano logging-access.yml
```

```yaml
---
- name: Cấu hình quyền cho SOC trên Logging Server
  hosts: logging
  become: true
  vars:
    soc_users: [soc01, soc02]
  tasks:
    - name: Tạo group soc
      group: { name: soc, state: present }

    - name: Tạo user SOC
      user: { name: "{{ item }}", groups: soc, shell: /bin/bash }
      loop: "{{ soc_users }}"

    - name: Sudo giới hạn — SOC chỉ được XEM log, không sửa/xóa
      copy:
        dest: /etc/sudoers.d/soc-limited
        mode: '0440'
        validate: 'visudo -cf %s'
        content: |
          %soc ALL=(ALL) NOPASSWD: /usr/bin/journalctl
          %soc ALL=(ALL) NOPASSWD: /bin/cat /var/log/*
          %soc ALL=(ALL) NOPASSWD: /usr/bin/tail /var/log/*
          %soc ALL=(ALL) NOPASSWD: /bin/ls /var/log/
```

## 3.4 Web Server — Đảm Bảo Service Chạy + Firewall

```bash
nano webserver-config.yml
```

```yaml
---
- name: Bảo trì Web Server
  hosts: webserver
  become: true
  tasks:
    - name: Đảm bảo Docker + Node Exporter + Zabbix Agent chạy
      service: { name: "{{ item }}", state: started, enabled: true }
      loop: [docker, node_exporter, zabbix-agent2]

    - name: Mở port firewall cần thiết
      ufw: { rule: allow, port: "{{ item }}", proto: tcp }
      loop: ["22", "80", "443"]

    - name: Bật UFW
      ufw: { state: enabled }
```

## 3.5 Master Playbook

```bash
nano site.yml
```

```yaml
---
- import_playbook: ssh-hardening.yml
- import_playbook: cicd-access.yml
- import_playbook: logging-access.yml
- import_playbook: webserver-config.yml
```

Chạy thử (dry-run trước, an toàn):

```bash
ansible-playbook site.yml --check        # mô phỏng, không đổi gì
ansible-playbook site.yml                # áp dụng thật
```

---

# PHẦN 4 — SSH JUMP CONFIG (Trên Máy SysAdmin)

```bash
nano ~/.ssh/config
```

```
Host bastion
    HostName 192.168.159.5
    User sysadmin
    IdentityFile ~/.ssh/shoe_ed25519

Host webserver
    HostName 10.10.10.10
    User sysadmin
    ProxyJump bastion
Host gitlab
    HostName 10.10.10.20
    User sysadmin
    ProxyJump bastion
Host jenkins
    HostName 10.10.10.21
    User sysadmin
    ProxyJump bastion
Host monitoring
    HostName 10.10.10.30
    User sysadmin
    ProxyJump bastion
Host logging
    HostName 10.10.10.40
    User sysadmin
    ProxyJump bastion
```

Giờ chỉ cần:

```bash
ssh webserver        # tự đi qua Bastion → Web Server (1 lệnh)
ssh monitoring       # tự đi qua Bastion → Monitoring
```

---

# PHẦN 5 — BẢNG PHÂN QUYỀN TRUY CẬP

| Người dùng | Vào được | Xác thực | Quyền |
|-----------|----------|----------|-------|
| System Administrator | Tất cả (qua Bastion) | Ed25519 + **MFA** | sudo đầy đủ |
| Developer | CI/CD Server | Ed25519 | **Không sudo** |
| Security Operation Center | Logging Server | Ed25519 | sudo **giới hạn** (xem log) |
| Security Officer | Security Server (Kibana) | VPN + HTTPS | chỉ đọc audit log |
| Ansible | Tất cả (qua Bastion) | Ed25519 (no MFA) | sudo đầy đủ (automation) |

---

# PHẦN 6 — KIỂM TRA TỔNG THỂ

```bash
# 1. Ansible thông tới mọi máy
ansible all_servers -m ping

# 2. SSH hardening đã áp dụng
ansible all_servers -m shell -a "sshd -T | grep -E 'passwordauthentication|permitrootlogin'"

# 3. SOC chỉ xem được log, không xóa được
ssh soc01@10.10.10.40 'sudo journalctl -n 5'        # ✅ chạy được
ssh soc01@10.10.10.40 'sudo rm /var/log/syslog'     # ❌ bị từ chối

# 4. SSH jump hoạt động
ssh webserver 'hostname'                             # in ra "webserver"
```

---

## 7. Snapshot VMware

**VM → Snapshots → Take Snapshot** → `bastion-ansible-ready`.

---

## Liên Quan
- Forward audit log: [Security-Server.md](Security-Server.md)
- Server được Ansible quản lý: [Webserver.md](Webserver.md), [CICD server.md](CICD%20server.md), [Monitoring-Server.md](Monitoring-Server.md), [Logging-Server.md](Logging-Server.md)
