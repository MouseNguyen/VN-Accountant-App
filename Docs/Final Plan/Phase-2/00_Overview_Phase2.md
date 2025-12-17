# 📋 LABA ERP - PHASE 2: TỔNG QUAN & KẾ HOẠCH TASKS

## Thông Tin Phase

| Mục | Chi tiết |
|-----|----------|
| **Phase** | 2 |
| **Tên** | Inventory + AR/AP + Reports + Security |
| **Thời gian** | 10 tuần (5 Sprints × 2 tuần) |
| **Tiền đề** | Phase 1 hoàn thành |
| **Tổng Tasks** | 10 tasks |

---

## 🎯 MỤC TIÊU PHASE 2

### Deliverables

| STT | Chức năng | Mô tả |
|-----|-----------|-------|
| 1 | **Quản lý Kho** | Tồn kho realtime, Nhập/Xuất, Giá vốn bình quân |
| 2 | **Công nợ Phải thu (AR)** | Theo dõi khách hàng nợ, Thu tiền |
| 3 | **Công nợ Phải trả (AP)** | Theo dõi nợ NCC, Trả tiền |
| 4 | **Báo cáo Kế toán** | 8+ báo cáo chuẩn VN |
| 5 | **Xuất Hồ sơ Thuế** | 1 file ZIP đầy đủ chứng từ |
| 6 | **Tờ khai GTGT** | XML chuẩn Tổng cục Thuế |
| 7 | **Bảo mật nâng cao** | Session, Audit Log, Protection |

---

## 📊 DATABASE SCHEMA MỚI

### Inventory (Kho)
- `stocks` - Tồn kho theo sản phẩm
- `stock_movements` - Lịch sử nhập/xuất

### Accounting (Kế toán)
- `ar_transactions` - Công nợ phải thu
- `ap_transactions` - Công nợ phải trả

### Tax (Thuế)
- `vat_declarations` - Tờ khai thuế GTGT

### Security (Bảo mật)
- `user_sessions` - Quản lý phiên đăng nhập
- `failed_logins` - Theo dõi đăng nhập thất bại
- `audit_logs` - Nhật ký hoạt động

---

## 📋 DANH SÁCH 10 TASKS

### Sprint 1: Inventory & Stock (Tuần 1-2)

| Task | Tên | Mô tả | Thời gian |
|------|-----|-------|-----------|
| **1** | Database Schema Phase 2 | Migration + Models mới | 4-5 giờ |
| **2** | Inventory Management | Nhập/Xuất kho, Giá vốn bình quân | 8-10 giờ |
| **3** | Stock Reports & Alerts | Báo cáo tồn kho, Cảnh báo tồn thấp | 4-5 giờ |

### Sprint 2: AR/AP (Tuần 3-4)

| Task | Tên | Mô tả | Thời gian |
|------|-----|-------|-----------|
| **4** | AR - Accounts Receivable | Công nợ phải thu, Thu tiền KH | 6-8 giờ |
| **5** | AP - Accounts Payable | Công nợ phải trả, Trả tiền NCC | 6-8 giờ |

### Sprint 3: Reports (Tuần 5-6)

| Task | Tên | Mô tả | Thời gian |
|------|-----|-------|-----------|
| **6** | Accounting Reports | 8 báo cáo kế toán chuẩn | 10-12 giờ |
| **7** | Export to Excel | Xuất báo cáo Excel | 4-5 giờ |

### Sprint 4: Tax & Compliance (Tuần 7-8)

| Task | Tên | Mô tả | Thời gian |
|------|-----|-------|-----------|
| **8** | VAT Declaration | Tính thuế GTGT, Tờ khai XML | 8-10 giờ |
| **9** | Tax Package Export | Xuất hồ sơ thuế ZIP | 6-8 giờ |

### Sprint 5: Security (Tuần 9-10)

| Task | Tên | Mô tả | Thời gian |
|------|-----|-------|-----------|
| **10** | Security Enhancement | Session, Audit, Rate Limiting | 8-10 giờ |

---

## 🔗 SƠ ĐỒ DEPENDENCIES

```
Phase 1 Complete
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  Sprint 1: Inventory                                      │
│  ════════════════════                                     │
│  Task 1: DB Schema  ──▶  Task 2: Inventory  ──▶  Task 3  │
│                               Management        Reports   │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│  Sprint 2: AR/AP                                          │
│  ═══════════════                                          │
│  Task 4: AR (Phải thu)      Task 5: AP (Phải trả)        │
│          │                          │                     │
│          └──────────┬───────────────┘                     │
└─────────────────────│────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  Sprint 3: Reports                                        │
│  ════════════════                                         │
│  Task 6: Accounting Reports  ──▶  Task 7: Excel Export   │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│  Sprint 4: Tax                                            │
│  ═════════════                                            │
│  Task 8: VAT Declaration  ──▶  Task 9: Tax Package ZIP   │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│  Sprint 5: Security                                       │
│  ══════════════════                                       │
│  Task 10: Security Enhancement                            │
│           (Session, Audit, Protection)                    │
└──────────────────────────────────────────────────────────┘
```

---

## 📝 CHI TIẾT TỪNG TASK

### Task 1: Database Schema Phase 2

**Mục tiêu:** Migration tất cả tables mới cho Phase 2

**Nội dung:**
- [ ] Migration: stocks, stock_movements
- [ ] Migration: ar_transactions, ap_transactions
- [ ] Migration: vat_declarations
- [ ] Migration: user_sessions, failed_logins, audit_logs
- [ ] Seed data: Mẫu báo cáo, VAT rates

**Ước tính:** 4-5 giờ

---

### Task 2: Inventory Management

**Mục tiêu:** Quản lý kho với giá vốn bình quân (Moving Average)

**Nội dung:**
- [ ] Service: stockIn(), stockOut(), adjustStock()
- [ ] Logic: Moving Average Cost calculation
- [ ] API: GET/POST /api/stocks, /api/stock-movements
- [ ] UI: Danh sách tồn kho, Phiếu nhập/xuất

**Ước tính:** 8-10 giờ

---

### Task 3: Stock Reports & Alerts

**Mục tiêu:** Báo cáo tồn kho và cảnh báo

**Nội dung:**
- [ ] Report: Nhập-Xuất-Tồn
- [ ] Report: Thẻ kho theo sản phẩm
- [ ] Alert: Tồn kho dưới mức tối thiểu
- [ ] UI: Dashboard widget tồn kho

**Ước tính:** 4-5 giờ

---

### Task 4: AR - Accounts Receivable

**Mục tiêu:** Công nợ phải thu từ khách hàng

**Nội dung:**
- [ ] Service: createARTransaction(), collectPayment()
- [ ] Logic: Phân bổ tiền thu vào hóa đơn
- [ ] API: GET/POST /api/ar-transactions, /api/ar/collect
- [ ] UI: Danh sách công nợ KH, Thu tiền

**Ước tính:** 6-8 giờ

---

### Task 5: AP - Accounts Payable

**Mục tiêu:** Công nợ phải trả cho nhà cung cấp

**Nội dung:**
- [ ] Service: createAPTransaction(), makePayment()
- [ ] Logic: Phân bổ tiền trả vào hóa đơn
- [ ] API: GET/POST /api/ap-transactions, /api/ap/pay
- [ ] UI: Danh sách công nợ NCC, Trả tiền

**Ước tính:** 6-8 giờ

---

### Task 6: Accounting Reports

**Mục tiêu:** 8 báo cáo kế toán chuẩn Việt Nam

**Danh sách báo cáo:**
1. Sổ quỹ tiền mặt (TK 111)
2. Sổ tiền gửi ngân hàng (TK 112)
3. Bảng kê hóa đơn mua vào
4. Bảng kê hóa đơn bán ra
5. Sổ chi tiết công nợ 131 (Phải thu KH)
6. Sổ chi tiết công nợ 331 (Phải trả NCC)
7. Báo cáo nhập xuất tồn kho
8. Bảng cân đối số phát sinh

**Ước tính:** 10-12 giờ

---

### Task 7: Export to Excel

**Mục tiêu:** Xuất báo cáo ra file Excel

**Nội dung:**
- [ ] Thư viện: ExcelJS
- [ ] Template: Mẫu Excel cho từng báo cáo
- [ ] API: GET /api/reports/:type/export
- [ ] UI: Nút xuất Excel trên mỗi báo cáo

**Ước tính:** 4-5 giờ

---

### Task 8: VAT Declaration

**Mục tiêu:** Tính thuế GTGT và tờ khai XML

**Nội dung:**
- [ ] Service: calculateVAT(), generateVATXML()
- [ ] Logic: Thuế đầu vào, đầu ra, phải nộp
- [ ] XML: Format chuẩn Tổng cục Thuế
- [ ] API: GET/POST /api/vat-declarations
- [ ] UI: Màn hình tờ khai thuế

**Ước tính:** 8-10 giờ

---

### Task 9: Tax Package Export

**Mục tiêu:** Xuất 1 file ZIP đầy đủ hồ sơ thuế

**Nội dung ZIP:**
```
ho-so-thue-2024-12.zip
├── 01-so-quy-tien-mat.xlsx
├── 02-so-tien-gui-ngan-hang.xlsx
├── 03-bang-ke-hoa-don-mua-vao.xlsx
├── 04-bang-ke-hoa-don-ban-ra.xlsx
├── 05-so-chi-tiet-cong-no-131.xlsx
├── 06-so-chi-tiet-cong-no-331.xlsx
├── 07-bao-cao-ton-kho.xlsx
├── 08-bang-can-doi-so-phat-sinh.xlsx
└── images/  (Ảnh hóa đơn)
```

**Ước tính:** 6-8 giờ

---

### Task 10: Security Enhancement

**Mục tiêu:** Bảo mật production-ready

**Nội dung:**
- [ ] Session Management (multi-device)
- [ ] Failed Login Tracking (khóa sau 5 lần)
- [ ] Audit Logging (tự động)
- [ ] Rate Limiting
- [ ] Input Sanitization
- [ ] CORS Configuration

**Ước tính:** 8-10 giờ

---

## ⏱️ TỔNG THỜI GIAN

| Sprint | Tasks | Thời gian |
|--------|-------|-----------|
| Sprint 1 | Task 1-3 | 16-20 giờ |
| Sprint 2 | Task 4-5 | 12-16 giờ |
| Sprint 3 | Task 6-7 | 14-17 giờ |
| Sprint 4 | Task 8-9 | 14-18 giờ |
| Sprint 5 | Task 10 | 8-10 giờ |
| **Tổng** | **10 Tasks** | **64-81 giờ** |

---

## ✅ CHECKLIST PHASE 2

### Inventory
- [ ] Nhập kho với giá vốn bình quân
- [ ] Xuất kho tự động tính COGS
- [ ] Điều chỉnh tồn kho
- [ ] Cảnh báo tồn thấp

### AR/AP
- [ ] Tạo công nợ từ bán/mua hàng
- [ ] Thu tiền từ khách hàng
- [ ] Trả tiền cho NCC
- [ ] Báo cáo tuổi nợ

### Reports
- [ ] 8 báo cáo kế toán
- [ ] Xuất Excel
- [ ] Tờ khai VAT XML

### Tax
- [ ] Tính thuế GTGT
- [ ] Xuất ZIP hồ sơ thuế

### Security
- [ ] Session management
- [ ] Audit logging
- [ ] Rate limiting

---

**Phiên bản:** 1.0  
**Ngày tạo:** 12/12/2024  
**Tác giả:** LABA Team
