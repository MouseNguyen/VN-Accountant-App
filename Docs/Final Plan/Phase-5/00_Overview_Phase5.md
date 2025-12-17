# 📋 PHASE 5: ADVANCED FEATURES (AUTO-BACKEND)

## Thông Tin Tổng Quan

| Mục | Chi tiết |
|-----|----------|
| **Phase** | 5 |
| **Tên** | Advanced Features (Auto-Backend) |
| **Thời gian** | 6 tuần (3 Sprints × 2 tuần) |
| **Triết lý** | TỰ ĐỘNG HÓA - User không cần làm gì trừ khi bắt buộc |

---

## 🎯 TRIẾT LÝ THIẾT KẾ

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 TỰ ĐỘNG HÓA                                             │
│                                                             │
│  ✅ Hệ thống tự động tính toán ở backend                   │
│  ✅ User chỉ nhập dữ liệu đơn giản                         │
│  ✅ Báo cáo/kết quả tự động xuất hiện                      │
│  ✅ Chỉ hỏi user khi THẬT SỰ cần quyết định               │
│                                                             │
│  VÍ DỤ:                                                     │
│  • User nhập lương → Hệ thống TỰ ĐỘNG tính BHXH, TNCN      │
│  • User mua CCDC → Hệ thống TỰ ĐỘNG phân bổ hàng tháng     │
│  • User tạo ngân sách → Hệ thống TỰ ĐỘNG cảnh báo vượt    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 MODULES

| # | Module | Mô tả |
|---|--------|-------|
| 1 | **Payroll Auto** | BHXH, TNCN tự động tính từ lương gộp |
| 2 | **CCDC Auto-Allocate** | Phân bổ công cụ dụng cụ hàng tháng tự động |
| 3 | **Budget Monitoring** | Theo dõi chi tiêu, cảnh báo tự động khi vượt 80%/100% |
| 4 | **Product Costing** | Tính giá thành tự động, phân tích lợi nhuận |

---

## 📋 TASK BREAKDOWN (12 Tasks)

### Sprint 5.1: Payroll Module (2 tuần)

| Task | Tên | Giờ | Mô tả |
|------|-----|-----|-------|
| 1 | Database Schema Phase 5 | 6-8h | employees, payrolls, tools, budgets, product_costs |
| 2 | Employee CRUD | 6-8h | Quản lý nhân viên, NPT, hợp đồng |
| 3 | Payroll Auto-Calculate | 10-12h | BHXH, BHYT, BHTN, TNCN lũy tiến, NET |
| 4 | Payroll UI & Reports | 8-10h | Bảng lương, phiếu lương, tờ khai TNCN |

### Sprint 5.2: CCDC & Budget (2 tuần)

| Task | Tên | Giờ | Mô tả |
|------|-----|-----|-------|
| 5 | CCDC CRUD & Auto-Allocate | 10-12h | Tạo CCDC, cron phân bổ hàng tháng |
| 6 | Budget CRUD & Monitoring | 8-10h | Lập ngân sách, theo dõi thực tế |
| 7 | Push Notifications | 6-8h | FCM/OneSignal integration, cảnh báo |
| 8 | Budget Dashboard | 6-8h | Chart so sánh planned vs actual |

### Sprint 5.3: Product Costing & Analytics (2 tuần)

| Task | Tên | Giờ | Mô tả |
|------|-----|-----|-------|
| 9 | Cost Aggregation Service | 10-12h | Tự động tổng hợp chi phí theo sản phẩm |
| 10 | Product Costing UI | 8-10h | Giá thành, lợi nhuận, cảnh báo bán lỗ |
| 11 | Analytics Dashboard | 10-12h | Xu hướng 6 tháng, top products, alerts |
| 12 | Onboarding Tour & Testing | 8-10h | Tour hướng dẫn, E2E tests, load tests |

---

## 📊 TIMELINE

```
Sprint 5.1 (2 tuần):
├── Task 1: Database Schema
├── Task 2: Employee CRUD
├── Task 3: Payroll Auto-Calculate
└── Task 4: Payroll UI & Reports

Sprint 5.2 (2 tuần):
├── Task 5: CCDC Auto-Allocate
├── Task 6: Budget Monitoring
├── Task 7: Push Notifications
└── Task 8: Budget Dashboard

Sprint 5.3 (2 tuần):
├── Task 9: Cost Aggregation
├── Task 10: Product Costing UI
├── Task 11: Analytics Dashboard
└── Task 12: Onboarding & Testing
```

---

## 🔑 KEY FEATURES

### 1. Payroll Auto-Calculate
```
User nhập: Lương gộp = 10,000,000đ
           ↓
Hệ thống TỰ ĐỘNG tính:
  • BHXH (8%):     800,000đ
  • BHYT (1.5%):   150,000đ
  • BHTN (1%):     100,000đ
  • Giảm trừ:      11,000,000đ
  • Thuế TNCN:     0đ
  • Lương NET:     8,950,000đ
```

### 2. CCDC Auto-Allocate
```
User nhập: Máy cắt cỏ = 5,000,000đ, 12 tháng
           ↓
Hệ thống TỰ ĐỘNG:
  • Mỗi tháng phân bổ: 416,667đ
  • Tự động ghi chi phí vào GL
  • Status → COMPLETED sau 12 tháng
```

### 3. Budget Auto-Warning
```
User lập: Ngân sách = 20,000,000đ/tháng
           ↓
Hệ thống TỰ ĐỘNG:
  • Chi 80% → Push notification ⚠️
  • Chi 100% → Popup cảnh báo 🚨
```

### 4. Product Costing
```
Hệ thống TỰ ĐỘNG tính giá thành:
  • Chi phí giống:    500,000đ
  • Chi phí phân bón: 300,000đ
  • Chi phí nhân công: 200,000đ
  ─────────────────────────
  Tổng: 1,100,000đ / 100kg = 11,000đ/kg
  
  Giá bán: 20,000đ/kg → Lợi nhuận: 45%
```

---

## ⏱️ TỔNG THỜI GIAN

| Sprint | Tasks | Giờ |
|--------|-------|-----|
| 5.1 | Tasks 1-4 | 30-38h |
| 5.2 | Tasks 5-8 | 30-38h |
| 5.3 | Tasks 9-12 | 36-44h |
| **TOTAL** | **12 Tasks** | **96-120h** |

---

## ✅ DEFINITION OF DONE

- [ ] User chỉ cần nhập input tối thiểu
- [ ] Hệ thống tự động tính toán 100%
- [ ] Cảnh báo tự động khi cần
- [ ] Không yêu cầu kiến thức kế toán
- [ ] Tuân thủ 100% luật thuế VN

---

## 📋 PHỤ THUỘC

| Phase | Dependencies |
|-------|--------------|
| Phase 5 | Phase 1-4 hoàn thành |
| - | Auth & RBAC từ Phase 4 |
| - | GL/Journal từ Phase 3-4 |
| - | Push Notification infrastructure |

---

**Xem chi tiết từng Task trong các file Phase5_Task_XX_*.md**
