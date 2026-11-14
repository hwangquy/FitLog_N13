[README_FitLog_GitHub.md](https://github.com/user-attachments/files/34846927/README_FitLog_GitHub.md)
# FitLog – Nhật ký luyện tập và AI Coach

FitLog là ứng dụng theo dõi hoạt động luyện tập, quản lý mục tiêu và lịch tập cá nhân. Ứng dụng có trợ lý **AI Coach** hỗ trợ hội thoại, gợi ý bài tập, đề xuất và điều chỉnh kế hoạch luyện tập theo dữ liệu người dùng.

> **Tài liệu dành cho giảng viên và thành viên nhóm.** Hướng dẫn dưới đây sử dụng **Windows + PowerShell**, MariaDB cài trực tiếp, không yêu cầu Docker hoặc Qdrant. Không có mật khẩu hay API key thật trong tài liệu.

## 1. Công nghệ sử dụng

| Thành phần | Công nghệ | Vai trò |
| --- | --- | --- |
| Mobile / Web | React Native, Expo Router, TypeScript | Giao diện người dùng và quản trị |
| Backend | Java 21, Spring Boot, Spring Security, Spring Data JPA | API, xác thực, phân quyền và xử lý nghiệp vụ |
| Cơ sở dữ liệu | MariaDB **11.8 LTS** (hoặc phiên bản hỗ trợ `VECTOR`) | Tài khoản, lịch tập, nhật ký, dữ liệu chat và embedding |
| AI hội thoại | Gemini API | Trả lời, tư vấn và đề xuất kế hoạch |
| Embedding | Ollama – `bge-m3` | Tạo vector ngữ nghĩa cho tra cứu RAG |

AI key chỉ được sử dụng ở **Backend**; Frontend gọi API qua Spring Boot và không chứa khóa bí mật.

## 2. Yêu cầu trước khi chạy

- JDK 21 và Maven.
- Node.js và npm; điện thoại có ứng dụng **Expo Go** nếu muốn chạy trên thiết bị thật.
- MariaDB **11.8 LTS** cài trên máy (ví dụ `127.0.0.1:3306`).
- Ollama với model embedding `bge-m3`.
- Gemini API key hợp lệ và tên model đang được tài khoản hỗ trợ.

Kiểm tra môi trường:

```powershell
java -version
mvn -version
node -v
npm -v
ollama list
```

Nếu chưa có BGE-M3:

```powershell
ollama pull bge-m3
```

Đảm bảo dịch vụ Ollama đang chạy tại `http://localhost:11434`.

## 3. Tạo cơ sở dữ liệu MariaDB

Sử dụng **HeidiSQL** hoặc công cụ quản trị MariaDB, kết nối bằng tài khoản quản trị. **Không dùng tài khoản `fitlog_app` để tạo schema.**

### 3.1. Máy chưa có database FitLog

Chạy các file theo **đúng thứ tự**:

| Thứ tự | File SQL | Công dụng |
| --- | --- | --- |
| 1 | `backend/src/main/resources/db/migration/V1__schema.sql` | Tạo `fitlog_db` và các bảng nghiệp vụ ban đầu |
| 2 | `backend/sql/02_add_user_avatar.sql` | Bổ sung cột ảnh đại diện cho `users` |
| 3 | `backend/sql/ai_features.sql` | Tạo bảng hồ sơ AI, phiên chat, tin nhắn, hành động, check-in, hạn mức, tài liệu và báo cáo |
| 4 | `backend/sql/ai_knowledge_seed.sql` | Thêm dữ liệu kiến thức bài tập mẫu |
| 5 | `backend/sql/ai_vector_mariadb.sql` | Tạo bảng `ai_knowledge_vectors` dùng `VECTOR(1024)` |

> `V1__schema.sql` được thiết kế cho **database mới, rỗng**. Không chạy lại trên database đã có dữ liệu. Dự án hiện cấu hình `spring.flyway.enabled: false`, vì vậy các file SQL trên được chạy **thủ công** theo thứ tự.

### 3.2. Máy đã có database FitLog

**Sao lưu database trước.** Bỏ qua `V1__schema.sql`; chỉ chạy những script bổ sung chưa áp dụng (avatar, AI và vector). Với `ai_knowledge_seed.sql`, kiểm tra dữ liệu đã có để tránh thêm trùng nội dung mẫu.

Không xóa database cũ và không chạy `V1__schema.sql` lần nữa.

### 3.3. Tạo tài khoản kết nối database

Chạy bằng tài khoản quản trị MariaDB, **thay** `THAY_BANG_MAT_KHAU_RIENG` bằng mật khẩu mạnh do người cài tự chọn (không sao chép mật khẩu ví dụ lên GitHub):

```sql
CREATE USER IF NOT EXISTS 'fitlog_app'@'localhost'
IDENTIFIED BY 'THAY_BANG_MAT_KHAU_RIENG';

CREATE USER IF NOT EXISTS 'fitlog_app'@'127.0.0.1'
IDENTIFIED BY 'THAY_BANG_MAT_KHAU_RIENG';

GRANT SELECT, INSERT, UPDATE, DELETE
ON fitlog_db.* TO 'fitlog_app'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE
ON fitlog_db.* TO 'fitlog_app'@'127.0.0.1';

SHOW GRANTS FOR 'fitlog_app'@'localhost';
SHOW GRANTS FOR 'fitlog_app'@'127.0.0.1';
```

**Lưu ý:** `CREATE USER IF NOT EXISTS` không thay đổi mật khẩu của tài khoản đã có. Nếu tài khoản tồn tại, quản trị viên cần sử dụng `ALTER USER ... IDENTIFIED BY ...` để cập nhật mật khẩu theo môi trường của mình.

Có thể kiểm tra phiên bản và bảng đã tạo:

```sql
SELECT VERSION();
USE fitlog_db;
SHOW TABLES;
SHOW COLUMNS FROM users LIKE 'avatar';
SELECT COUNT(*) AS so_tai_lieu FROM ai_knowledge;
```

## 4. Cấu hình và chạy Backend

Mở **PowerShell** từ thư mục gốc repository:

```powershell
cd backend

$env:DB_URL = "jdbc:mariadb://127.0.0.1:3306/fitlog_db"
$env:DB_USER = "fitlog_app"
$env:DB_PASSWORD = "<MAT_KHAU_DATABASE_CUA_BAN>"
$env:GEMINI_API_KEY = "<GEMINI_API_KEY_CUA_BAN>"
$env:GEMINI_MODEL = "<TEN_MODEL_GEMINI_DANG_HOAT_DONG>"
$env:OLLAMA_EMBED_URL = "http://localhost:11434/api/embed"
$env:EMBEDDING_MODEL = "bge-m3"

mvn clean spring-boot:run
```

Thay các giá trị nằm trong dấu `<...>`; **không sử dụng nguyên văn**. Biến môi trường chỉ có hiệu lực trong cửa sổ PowerShell đang chạy. Backend mặc định chạy tại `http://localhost:8080`.

Kiểm tra dịch vụ:

```text
http://localhost:8080/actuator/health
```

Kết quả mong đợi khi dịch vụ hoạt động bình thường: `{"status":"UP"}`.

## 5. Cấu hình và chạy Frontend

Mở **PowerShell mới** từ thư mục gốc repository:

```powershell
cd frontend
npm install
```

Tạo `frontend/.env` từ mẫu `frontend/.env.example`, rồi cập nhật URL Backend:

```dotenv
# Chạy Web trên cùng máy:
EXPO_PUBLIC_API_URL=http://localhost:8080/api
```

Nếu chạy trên **iPhone/Android thật**, thay `localhost` bằng IP LAN của máy tính chạy Spring Boot (cùng mạng Wi-Fi):

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.x.x:8080/api
```

Địa chỉ `192.168.x.x` là ví dụ, lấy IP thực tế qua `ipconfig`. Chú ý có `/api` ở cuối. Chạy ứng dụng:

```powershell
npx expo start --go --clear
```

- **iPhone:** dùng Camera quét mã QR, mở trong Expo Go.
- **Android:** mở Expo Go và quét mã QR.
- **Web:** có thể dùng `npx expo start --web`.

Nếu thiết bị không kết nối được, kiểm tra Wi-Fi, cổng 8080, Spring Boot và Windows Firewall. Không cần Android Emulator để quét QR bằng điện thoại thật.

## 6. Khởi tạo kiến thức AI (RAG)

Sau khi Backend, MariaDB và Ollama hoạt động:

1. Đăng nhập bằng tài khoản có quyền **Admin**.
2. Vào trang **Quản lý kiến thức AI**.
3. Chọn **Reindex toàn bộ** để tạo embedding với BGE-M3 và lưu vào MariaDB Vector.
4. Kiểm tra bằng SQL:

```sql
USE fitlog_db;
SELECT COUNT(*) AS documents FROM ai_knowledge;
SELECT COUNT(*) AS vectors FROM ai_knowledge_vectors;
```

Dữ liệu chat, lịch tập và vector được lưu trong MariaDB; không dùng Qdrant. **Lưu ý:** chạy SQL seed không tự tạo embedding; phải thực hiện Reindex.

## 7. Chức năng chính

- Đăng ký, đăng nhập, phân quyền User/Admin.
- Quản lý buổi tập, mục tiêu, kế hoạch và tiến độ luyện tập.
- Ghi nhận ảnh buổi tập và theo dõi kết quả.
- AI Coach: trò chuyện, tư vấn, đề xuất lịch, hỗ trợ điều chỉnh lịch sau khi người dùng xác nhận.
- Lịch sử chat, báo cáo và dữ liệu AI được lưu vào cơ sở dữ liệu.
- Tra cứu kiến thức bài tập bằng RAG với BGE-M3 và MariaDB Vector.
- Giao diện AI Chatbox dạng nút nổi để mở nhanh trên ứng dụng.

## 8. Bảo mật và lưu ý khi bàn giao

- **Không commit** `frontend/.env`, API key Gemini, mật khẩu database, token đăng nhập, các file trong `backend/private-uploads`, file backup SQL chứa dữ liệu người dùng hoặc `node_modules`.
- Dùng `.env.example` làm **mẫu**, không điền bí mật thật vào file này.
- Gemini API key chỉ nằm ở môi trường Backend, tuyệt đối không đưa vào biến `EXPO_PUBLIC_*`.
- Tránh lưu mật khẩu mẫu trực tiếp trong `application.yml`. Nên dùng `password: ${DB_PASSWORD}` thay vì cung cấp mật khẩu mặc định.
- Backend cần kiểm tra quyền tài khoản trước khi truy cập ảnh riêng tư, lịch sử chat và thay đổi lịch tập.
- Môi trường nộp/demo có thể dùng HTTP trong LAN; khi triển khai qua Internet phải cấu hình HTTPS và quản lý bí mật an toàn.

## 9. Xử lý lỗi thường gặp

| Thông báo | Cách kiểm tra |
| --- | --- |
| `no POM in this directory` | Chạy Maven trong thư mục `backend` |
| `Access denied for user` | Kiểm tra `DB_USER`, `DB_PASSWORD` và quyền MariaDB |
| `Connection refused` | Kiểm tra MariaDB/Ollama/Spring Boot và cổng đang dùng |
| `Table ... doesn't exist` | Xem lại thứ tự SQL và phiên bản database |
| Expo không tìm thấy plugin | Chạy `npm install` trong `frontend` |
| iPhone không gọi được API | Dùng IP LAN của máy tính thay cho `localhost` |
| AI không tìm được kiến thức | Kiểm tra BGE-M3 và thao tác Admin → Reindex |
| Ảnh không hiển thị | Kiểm tra quyền truy cập media và thư mục `backend/private-uploads` |

---

**Dự án phục vụ mục đích học tập và trình diễn.** Khi triển khai thực tế cần bổ sung cấu hình bảo mật, sao lưu, giám sát và kiểm thử phù hợp.
