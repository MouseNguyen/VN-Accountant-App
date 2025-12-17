# 📋 PHASE 1 - TASK 8: DASHBOARD & REPORTS

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P1-T8 |
| **Tên** | Dashboard & Báo cáo |
| **Thời gian** | 4-5 giờ |
| **Phụ thuộc** | Task 5, 6, 7 |
| **Task tiếp theo** | Task 9 (OCR) |

---

## 📋 MỤC TIÊU

- Dashboard tổng quan realtime
- Chart Thu Chi theo tháng (Recharts)  
- Top sản phẩm, khách hàng
- Công nợ tổng hợp

---

## PHẦN 1: API ENDPOINTS

### GET /api/dashboard

```typescript
// Summary cards: cash_in, cash_out, net, total_ar, total_ap
// Monthly chart: last 6 months income/expense
// Top products: by sale amount this month
// Recent transactions: latest 5
```

**Response:**
```json
{
  "summary": {
    "cash_in": 50000000,
    "cash_out": 30000000,
    "net": 20000000,
    "total_ar": 15000000,
    "total_ap": 5000000
  },
  "monthly_chart": [
    { "month": "01/2024", "income": 45000000, "expense": 28000000 }
  ],
  "top_products": [
    { "name": "Lúa", "amount": 25000000 }
  ],
  "recent_transactions": []
}
```

### GET /api/reports/summary

- Group by transaction type
- Group by payment method
- Date range filter

---

## PHẦN 2: UI COMPONENTS

### Summary Cards
- Thu tháng này (green)
- Chi tháng này (red)
- Lãi/(Lỗ) ròng
- Công nợ ròng

### Monthly Chart (Recharts)
- BarChart với Thu/Chi
- 6 tháng gần nhất
- Tooltip format VND

### Top Products
- Progress bar theo tỷ lệ
- Sort by amount DESC

### Recent Transactions
- Icon theo loại (in/out)
- Color code
- Date format

---

## ✅ CHECKLIST

- [ ] GET /api/dashboard
- [ ] GET /api/reports/summary
- [ ] Dashboard page với cards
- [ ] Monthly chart (Recharts)
- [ ] Top products list
- [ ] Recent transactions

---

**Next Task:** Task 9 - OCR Integration
