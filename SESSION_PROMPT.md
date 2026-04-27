# Session Recovery Prompt

Copy-paste prompt dưới đây để khôi phục phiên làm việc nhanh nhất:

---

```
Tôi đang làm việc với repo SmartFarm DakLak. Hãy:

1. Pull repo mới nhất:
   cd /root/.openclaw/workspace/smartfarm-daklak && git pull https://<TOKEN>@github.com/dinhhieudl/smartfarm-daklak.git

   (Thay <TOKEN> bằng GitHub PAT, hoặc nếu đã có repo rồi thì bỏ qua bước pull)

2. Đọc PROGRESS.md để hiểu trạng thái dự án hiện tại

3. Đọc các file docs chính (chỉ cần lướt qua tiêu đề và TODO):
   - docs/planning/deployment-guide.md
   - docs/planning/two-options-comparison.md
   - docs/software/vendor-software-analysis.md

4. Tiếp tục công việc từ TODO list trong PROGRESS.md

Context nhanh:
- Dự án: Hệ thống nông nghiệp thông minh DakLak
- Hardware đã có: E870 gateway (LoRaWAN) + E78-DTU(900LN22) node + Soil sensor (RS485 Modbus)
- Server: Docker (ChirpStack + Node-RED + InfluxDB + Grafana)
- Ngôn ngữ: Tài liệu tiếng Anh, giao tiếp tiếng Việt
```

---

## Alternative: Short prompt (nếu đã có repo)

```
Đọc /root/.openclaw/workspace/smartfarm-daklak/PROGRESS.md và tiếp tục từ TODO list.
```

## Push workflow

```
cd /root/.openclaw/workspace/smartfarm-daklak
git add -A && git commit -m "mô tả công việc"
git remote set-url origin https://<TOKEN>@github.com/dinhhieudl/smartfarm-daklak.git
git push origin main
git remote set-url origin https://github.com/dinhhieudl/smartfarm-daklak.git  # xóa token
```
