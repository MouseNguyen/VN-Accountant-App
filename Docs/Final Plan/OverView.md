\# LABA ERP – Developer Onboarding



Chào mừng bạn đến với \*\*LABA ERP\*\* 👋  

Đây là hệ thống ERP mini + máy tính thuế cho nông trại Việt Nam, phát triển theo 5 Phase, mở rộng dần từ sổ sách đơn giản tới tax engine, PWA offline và auto-backend.



Tài liệu này giúp bạn:

\- Hiểu nhanh \*\*bức tranh tổng thể\*\* 5 phase.

\- Nắm \*\*kiến trúc \& tech stack\*\*.

\- Biết \*\*chỗ nào đã làm / chỗ nào đang là spec\*\*.

\- Biết nên \*\*bắt đầu đọc \& code từ đâu\*\*.



---



\## 1. Kiến trúc tổng thể



\*\*Tech chính:\*\*



\- \*\*Frontend\*\*

&nbsp; - Next.js (App Router) + TypeScript

&nbsp; - TailwindCSS + shadcn/ui

&nbsp; - PWA + Offline (Phase 4)

\- \*\*Backend\*\*

&nbsp; - Next.js API Routes (hoặc NestJS tương đương, spec viết theo kiểu REST chuẩn)

&nbsp; - Prisma ORM

&nbsp; - PostgreSQL

\- \*\*Triết lý thiết kế\*\*

&nbsp; - UX cho \*\*chủ nông trại lớn tuổi, ít rành công nghệ\*\*.

&nbsp; - Mobile-first, font to, nút to, tối đa 2–3 bước cho mỗi tác vụ.

&nbsp; - “\*\*Auto-backend\*\*”: user nhập ít, backend tự lo hạch toán / thuế / lương / khấu hao / ngân sách.



\*\*Cách phát triển theo Phase:\*\*



\- Phase sau \*\*không đập đi làm lại\*\*, chỉ:

&nbsp; - Mở rộng DB schema.

&nbsp; - Thêm API mới / mở rộng API cũ (giữ backward compatibility).

&nbsp; - Thêm màn hình / chức năng mới trên UI.



---



\## 2. Domain khái quát



Một số khái niệm cốt lõi:



\- \*\*Farm\*\*: 1 đơn vị kinh doanh chính (nông trại).

\- \*\*User\*\*: người dùng hệ thống, role: OWNER, STAFF, ACCOUNTANT…

\- \*\*Transaction\*\*: giao dịch tài chính (thu/chi/bán/mua/chuyển khoản…).

\- \*\*Product\*\*: nông sản, vật tư.

\- \*\*Partner\*\*: khách hàng / nhà cung cấp (gắn với công nợ).

\- \*\*Stock \& StockMovement\*\*: tồn kho và lịch sử nhập/xuất.

\- \*\*Tax\*\*:

&nbsp; - VAT: thuế GTGT đầu vào/ra.

&nbsp; - CIT: thuế TNDN.

&nbsp; - PIT: thuế TNCN.

\- \*\*Asset \& Depreciation\*\*: tài sản cố định + khấu hao.

\- \*\*Tool (CCDC)\*\*: công cụ dụng cụ phân bổ nhiều kỳ.

\- \*\*Payroll\*\*: bảng lương, BHXH, thuế TNCN.

\- \*\*Budget\*\*: ngân sách theo nhóm chi phí / theo tháng.



Khi đọc code, bạn sẽ thấy các bảng Prisma tương ứng với các khái niệm này.



---



\## 3. Tổng quan 5 Phase (high-level)



\### Phase 1 – Core ERP mini cho nông trại



\*\*Mục tiêu:\*\*  

ERP đơn giản cho nông trại nhỏ:



\- Quản lý \*\*Tiền\*\*: thu/chi/chuyển khoản.

\- \*\*Bán hàng\*\* nông sản.

\- \*\*Mua hàng\*\* vật tư.

\- \*\*OCR hóa đơn\*\*: upload ảnh hóa đơn → trích xuất dữ liệu.

\- \*\*Nhân công thời vụ\*\*: công nhật, ngày công.

\- \*\*Dashboard\*\*: tổng quan thu – chi – lãi/lỗ đơn giản.



\*\*Tầng dữ liệu chính:\*\*



\- `Farm`, `User`, `Account`

\- `Product`, `Partner`

\- `Transaction`, `TransactionItem`

\- `Worker`, `WorkLog`

\- `Invoice` (lưu ảnh + OCR result)



> Với dev mới: \*\*hãy đọc Phase 1 trước\*\* để hiểu dòng chảy dữ liệu cơ bản.



---



\### Phase 2 – Kho, Công nợ, Báo cáo, Security



\*\*Mục tiêu:\*\*



\- Thêm \*\*quản lý kho\*\* (tồn kho, nhập/xuất, kiểm kê).

\- Công nợ \*\*phải thu (AR) / phải trả (AP)\*\*.

\- Bộ \*\*báo cáo kế toán\*\* (sổ chi tiết, tổng hợp, VAT report,…).

\- Nâng cấp \*\*bảo mật\*\* (session, failed login, audit log).



\*\*Thêm các entity chính:\*\*



\- `Stock`, `StockMovement` – tính \*\*giá vốn bình quân\*\*.

\- `ARTransaction`, `APTransaction` – tracking công nợ theo hóa đơn.

\- `VATDeclaration` – kết quả gom VAT theo kỳ.

\- `UserSession`, `FailedLogin`, `AuditLog` – security \& audit.



> Về mental model: Phase 2 biến Phase 1 từ “cashbook” thành \*\*hệ thống kế toán tương đối đầy đủ\*\*.



---



\### Phase 3 – Tax Engine + BCTC + TSCĐ



\*\*Mục tiêu:\*\*



\- Xây \*\*máy tính thuế Việt Nam\*\* trên dữ liệu Phase 1–2:

&nbsp; - VAT nâng cao (điều kiện được khấu trừ).

&nbsp; - CIT: TNDN tạm tính + quyết toán.

&nbsp; - PIT: thuế TNCN lũy tiến.

\- Quản lý \*\*Tài sản cố định\*\* + tự động khấu hao.

\- Sinh \*\*Báo cáo tài chính\*\* (CĐKT, KQKD, lưu chuyển tiền tệ…).



\*\*Entity \& logic nổi bật:\*\*



\- `TaxRule`: mã hóa \*\*luật thuế\*\* thành rule (condition + action).

\- `CITCalculation`, `CITAdjustment`: tính thuế TNDN + các khoản loại trừ/không được trừ.

\- `PITCalculation`: bảng chi tiết tính thuế TNCN theo bậc.

\- `Asset`, `DepreciationSchedule`: tài sản cố định + schedule khấu hao.

\- `TaxSchedule`: lịch nộp VAT/CIT/PIT, nhắc việc.



> Phase 3 là \*\*layer “Tax Intelligence”\*\* nằm trên data kế toán.



---



\### Phase 4 – PWA Offline + Sync + Hóa đơn điện tử



\*\*Mục tiêu:\*\*



\- App \*\*PWA\*\*, chạy được \*\*offline\*\* trên điện thoại.

\- Multi-user cho 1 farm, sync dữ liệu khi có mạng.

\- Export/Import dữ liệu.

\- Tích hợp \*\*Hóa đơn điện tử\*\* (VNPT/Viettel/FPT/MISA…).



\*\*Thành phần chính:\*\*



\- \*\*Client side\*\*

&nbsp; - Service Worker, IndexedDB (Dexie) để cache \& queue thay đổi.

&nbsp; - Sync engine: push/pull, conflict handling đơn giản.

\- \*\*Server side\*\*

&nbsp; - `SyncQueue`: lưu các operation từ client gửi lên.

&nbsp; - `DataExport`: lịch sử export (ZIP/backup).

&nbsp; - `EInvoiceConfig`: cấu hình hóa đơn điện tử (API key, mẫu số, ký hiệu…).

&nbsp; - `EInvoice`: record hóa đơn điện tử gắn với `Transaction` (QR, PDF, XML, status).



> Phase 4 biến hệ thống thành \*\*offline-first ERP\*\*, phù hợp vùng sóng yếu.



---



\### Phase 5 – Advanced Auto-Backend



\*\*Triết lý chung:\*\*  

User chỉ nhập \*\*ý định \& dữ liệu thô\*\*, backend tự tạo \*\*“hậu trường kế toán”\*\*.



Các module chính:



1\. \*\*Payroll auto\*\*

&nbsp;  - Input: lương gộp, ngày công, có/không BHXH, số người phụ thuộc.

&nbsp;  - Output: BHXH/BHYT/BHTN, giảm trừ, thuế TNCN, lương NET, bút toán lương.

&nbsp;  - Entity: `Employee`, `Payroll`.



2\. \*\*CCDC auto (Tool allocation)\*\*

&nbsp;  - Input: giá trị CCDC, số tháng phân bổ.

&nbsp;  - Cron job hàng tháng:

&nbsp;    - Tự tạo `Transaction` chi phí.

&nbsp;    - Cập nhật `Tool` cho đến khi phân bổ xong.



3\. \*\*Ngân sách \& cảnh báo\*\*

&nbsp;  - Entity `Budget`: limit theo nhóm chi phí / tháng.

&nbsp;  - Sau mỗi `Transaction`, hệ thống kiểm tra:

&nbsp;    - >80%: cảnh báo.

&nbsp;    - >100%: chặn / yêu cầu confirm override.



> Phase 5 chính là lớp \*\*“tự động hóa tài chính”\*\*, giúp chủ farm không phải hiểu hết kế toán/thuế.



---



\## 4. Repo structure \& điểm bắt đầu cho dev mới



\_Tùy repo thực tế, nhưng logic chung:\_



\- `backend/`

&nbsp; - NestJS hoặc Next API routes.

&nbsp; - `prisma/schema.prisma` – đọc để hiểu \*\*domain model\*\*.

&nbsp; - `src/modules/...` – chia theo nghiệp vụ: auth, farm, transaction, inventory, tax, payroll…

\- `frontend/`

&nbsp; - Next.js (App Router).

&nbsp; - `src/app/(public)/...` – landing, login, register.

&nbsp; - `src/app/(dashboard)/...` – tiền, bán hàng, mua hàng, kho, thuế, lương…

&nbsp; - `src/lib/apiClient.ts` – client REST, token, refresh logic.



\*\*Gợi ý lộ trình đọc cho dev mới:\*\*



1\. \*\*Đọc Phase 1 spec\*\* → hiểu object chính: Farm, Transaction, Product, Worker.

2\. Mở `prisma/schema.prisma` → map lại domain.

3\. Chạy app local, đi qua các flow:

&nbsp;  - Đăng nhập.

&nbsp;  - Tạo 1 giao dịch bán hàng.

&nbsp;  - Tạo 1 giao dịch mua hàng.

4\. Đọc tiếp Phase 2–3–4–5 để hiểu \*\*bản đồ tương lai\*\* (roadmap tính năng).



---



\## 5. Chạy local (high-level)



Chi tiết có thể đã nằm trong README riêng, nhưng tóm tắt:



1\. Cài:

&nbsp;  - Node.js LTS

&nbsp;  - PostgreSQL

2\. Copy `.env.example` → `.env` và cấu hình:

&nbsp;  - `DATABASE\_URL=...`

&nbsp;  - Base URL API, JWT secret, v.v.

3\. Migration DB:

&nbsp;  ```bash

&nbsp;  npx prisma migrate dev

&nbsp;  npx prisma db seed   # nếu có



