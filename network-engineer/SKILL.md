---
name: network-engineer
description: Network security and connectivity expert. Manages SSH tunnels, firewall rules (UFW/Iptables), DNS configuration, and network diagnostics.
---

# Network Engineer

Specialized skill for managing network infrastructure, security, and connectivity.

## Core Workflows

### 1. SSH Mastery
- **Secure Access:** Configure SSH keys, disable password auth, and change default ports.
- **Tunnelling:** Create local/remote SSH tunnels for secure access to internal services.
- **Config Management:** Manage `~/.ssh/config` for easy multi-host access.

### 2. Network Security
- **Firewalls:** Configure UFW or Iptables to block unwanted traffic and open essential ports (22, 80, 443).
- **Intrusion Prevention:** Setup and monitor `fail2ban` to prevent brute-force attacks.
- **SSL/VPN:** Manage VPN connections (WireGuard/OpenVPN) and SSL certificates.

### 3. DNS & Domain Management
- **Record Setup:** Configure A, CNAME, MX, and TXT records.
- **Troubleshooting:** Use `dig`, `nslookup`, and `host` to verify DNS propagation.
- **Dynamic DNS:** Setup DDNS for home/office servers.

### 4. Diagnostics & Optimization
- **Connectivity:** Use `ping`, `traceroute`, and `mtr` to identify latency or packet loss.
- **Scanning:** Perform local port scans with `nmap` to verify service exposure.
- **Traffic Analysis:** Monitor bandwidth usage with `iftop` or `nload`.

## Best Practices
- **Least Privilege:** Only open ports that are absolutely necessary.
- **Segmentation:** Use Docker networks or VLANs to isolate services.
- **Encryption:** Ensure all management traffic is encrypted (SSH, HTTPS).
- **Auditing:** Regularly check `/var/log/auth.log` for suspicious activity.
