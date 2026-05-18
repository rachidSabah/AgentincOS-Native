---
name: vps-manager
description: Manage VPS lifecycle, deployments, and server health. Handles Docker setup, Nginx configuration, and automated application deployment via SSH/SFTP.
---

# VPS Manager

Comprehensive skill for provisioning, managing, and deploying to Linux Virtual Private Servers.

## Core Workflows

### 1. Server Provisioning
- **Initial Setup:** Automate `apt-get update`, user creation, and SSH key installation.
- **Resource Monitoring:** Check CPU, Memory, and Disk usage using `htop`, `df -h`, and `free -m`.
- **Environment Setup:** Install runtimes (Node.js, Python, Go) and build tools.

### 2. Docker & Containerization
- **Installation:** Automated Docker Engine and Docker Compose setup.
- **Orchestration:** Manage containers, volumes, and networks using `docker-compose`.
- **Optimization:** Cleanup unused images and volumes to save disk space.

### 3. Web Server Management
- **Nginx/Apache:** Configure reverse proxies, virtual hosts, and load balancing.
- **SSL/TLS:** Automate Let's Encrypt certificates using `certbot`.
- **Static Hosting:** Deploy and update static assets via SFTP or Git.

### 4. Automated Deployment
- **Packaging:** Tar/Zip source code for transfer.
- **Delivery:** Upload artifacts to VPS via SCP/SFTP.
- **Execution:** Remote execution of build/restart scripts using SSH.

## Best Practices
- **Persistence:** Use `systemd` or `pm2` for process management.
- **Backups:** Implement regular database and file-level backups.
- **Logging:** Centralize logs and use `logrotate` to prevent disk overflow.
- **Atomic Deploys:** Use symlinks or blue-green patterns for zero-downtime updates.
