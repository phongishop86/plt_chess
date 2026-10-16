# Phong Chess Online ♟️⚡

Ứng dụng chơi Cờ Vua Trực Tuyến 2 Người Thời Gian Thực được phát triển với **Google Antigravity**, **Firebase** và **Vercel**.

---

## 🌟 Tính Năng Nổi Bật

1. **Giao diện Tiếng Việt & Responsive:** Thiết kế hiện đại trên nền tảng React + TypeScript + Tailwind CSS, tối ưu cho cả máy tính và điện thoại di động.
2. **Tạo & Tham gia phòng tức thì:**
   - Người tạo phòng tự động nhận **Quân Trắng** (đi trước) và sinh liên kết dạng `/game/{roomId}`.
   - Đối thủ nhấp vào link công khai tự động nhận **Quân Đen** (đi sau).
   - **Giới hạn nghiêm ngặt 2 ghế chơi:** Người thứ ba trở đi truy cập sẽ chỉ có quyền theo dõi (Khán giả - Spectator), không thể chiếm ghế hoặc can thiệp ván cờ.
3. **Đăng nhập Ẩn danh (Firebase Anonymous Auth):** Người chơi không cần đăng ký tài khoản, không cần mật khẩu rườm rà.
4. **Đồng bộ thời gian thực 2 chiều:** Sử dụng Cloud Firestore `onSnapshot` để đồng bộ từng nước đi với độ trễ cực thấp.
5. **Khôi phục trạng thái hoàn hảo:** Tải lại trang (F5) không bị mất ván cờ; trạng thái FEN, lượt đi và lịch sử nước cờ được nạp lại tức thì.
6. **Bảo mật Server-side & Firestore Transaction:**
   - Toàn bộ nước đi và hành động đầu hàng phải gửi lên Vercel Serverless Functions.
   - Máy chủ xác minh Firebase ID Token, kiểm tra quyền người chơi, đúng lượt, nước đi hợp lệ (`chess.js`).
   - Áp dụng **Firestore Transaction** chống ghi đè dữ liệu khi có nhiều yêu cầu gửi đồng thời.
7. **Quy tắc bảo mật Firestore (Security Rules):** Client **tuyệt đối không được ghi trực tiếp** vào Firestore; chỉ cho phép đọc dữ liệu đối với người dùng đã xác thực.
8. **Âm thanh tích hợp Synthesizer:** Sử dụng Web Audio API để phát âm thanh đi quân, ăn quân, chiếu tướng, thắng/thua mà không phụ thuộc vào file âm thanh ngoài.

---

## 💰 Kiểm Tra Yêu Cầu Billing & Chi Phí (100% Miễn Phí)

| Dịch vụ | Gói sử dụng | Yêu cầu thẻ tín dụng (Billing) | Giới hạn miễn phí |
| :--- | :--- | :--- | :--- |
| **Firebase Authentication** | Spark Plan | ❌ **Không cần thẻ** | Miễn phí không giới hạn đăng nhập ẩn danh |
| **Cloud Firestore** | Spark Plan | ❌ **Không cần thẻ** | 1 GiB lưu trữ, 50,000 lượt đọc/ngày, 20,000 lượt ghi/ngày |
| **Vercel Serverless Functions** | Hobby Plan | ❌ **Không cần thẻ** | Miễn phí 100,000 lượt gọi API/ngày, băng thông hào phóng |

> **Ưu điểm kiến trúc:** Bằng cách chạy backend trên **Vercel Serverless Functions** thay vì Google Cloud Functions, bạn **hoàn toàn KHÔNG cần nâng cấp Firebase lên gói trả phí Blaze**! Dự án hoạt động an toàn và hoàn toàn miễn phí trên gói Spark.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Canvas Confetti.
- **Bàn cờ & Luật chơi:** `react-chessboard`, `chess.js`.
- **Cơ sở dữ liệu & Xác thực Client:** Firebase JS SDK (`firebase/auth`, `firebase/firestore`).
- **Xác thực Server & Giao dịch:** Firebase Admin SDK (`firebase-admin`), `@vercel/node`.
- **Kiểm thử tự động:** Vitest (13/13 test cases bao phủ luật cờ, chống can thiệp, sai lượt, phòng đủ người).

---

## 📋 Hướng Dẫn Thao Tác Trên Firebase Console (Bắt Buộc)

Do Firebase yêu cầu quyền quản trị viên của dự án cá nhân, bạn hãy thực hiện theo các bước sau trong [Firebase Console](https://console.firebase.google.com/):

### Bước 1: Tạo dự án Firebase
1. Truy cập [Firebase Console](https://console.firebase.google.com/) và chọn **Add project** (Tạo dự án).
2. Đặt tên dự án (ví dụ: `phong-chess-online`), tắt hoặc bật Google Analytics tùy ý, sau đó nhấn **Create project**.
3. Đảm bảo dự án đang ở gói mặc định **Spark** (Free).

### Bước 2: Bật Đăng nhập Ẩn danh (Anonymous Authentication)
1. Trong menu bên trái, vào mục **Build** ➜ **Authentication** ➜ Nhấn **Get started**.
2. Chọn tab **Sign-in method**.
3. Chọn **Anonymous** (Ẩn danh) ➜ Gạt nút **Enable** ➜ Nhấn **Save**.

### Bước 3: Tạo cơ sở dữ liệu Cloud Firestore
1. Trong menu bên trái, vào mục **Build** ➜ **Firestore Database** ➜ Nhấn **Create database**.
2. Chọn vị trí máy chủ (Location) gần bạn (ví dụ: `asia-southeast1` tại Singapore).
3. Chọn chế độ **Production mode** (Chế độ sản xuất) ➜ Nhấn **Create**.
4. Vào tab **Rules** của Firestore, xóa toàn bộ nội dung cũ và dán nội dung từ file `firestore.rules`:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /rooms/{roomId} {
         allow read: if request.auth != null;
         allow write: if false;
       }
     }
   }
   ```
5. Nhấn **Publish** để áp dụng luật bảo mật.

### Bước 4: Lấy thông tin cấu hình Frontend (Client Config)
1. Nhấn vào biểu tượng **Cài đặt** (hình bánh răng ⚙️ ở góc trên bên trái) ➜ **Project settings**.
2. Cuộn xuống phần **Your apps** ➜ Nhấn vào biểu tượng **Web** (`</>`).
3. Đặt biệt danh ứng dụng (ví dụ: `Phong Chess Web`) ➜ Nhấn **Register app**.
4. Sao chép các trường trong `firebaseConfig` để điền vào file `.env.local` ở phía client:
   - `apiKey` ➜ `VITE_FIREBASE_API_KEY`
   - `authDomain` ➜ `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` ➜ `VITE_FIREBASE_PROJECT_ID`
   - `storageBucket` ➜ `VITE_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` ➜ `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` ➜ `VITE_FIREBASE_APP_ID`

### Bước 5: Tạo Service Account Key cho Backend (Server Admin SDK)
1. Vẫn trong trang **Project settings**, chọn tab **Service accounts**.
2. Chọn **Node.js** và nhấn nút **Generate new private key** (Tạo khóa riêng mới).
3. Một file `.json` sẽ được tải về máy của bạn. Mở file đó ra để lấy 3 thông số:
   - `project_id` ➜ `FIREBASE_PROJECT_ID`
   - `client_email` ➜ `FIREBASE_CLIENT_EMAIL`
   - `private_key` ➜ `FIREBASE_PRIVATE_KEY` *(Lưu ý: Giữ nguyên `\n` trong chuỗi khóa)*.

---

## 💻 Hướng Dẫn Chạy Tại Localhost

### 1. Cấu hình biến môi trường
Tạo file `.env.local` từ mẫu `.env.example`:
```bash
cp .env.example .env.local
```
Mở file `.env.local` và điền đầy đủ các thông tin đã lấy ở Bước 4 và Bước 5 ở trên.

### 2. Chạy ứng dụng Frontend
```bash
npm run dev
```
Mở trình duyệt tại địa chỉ: `http://localhost:5173`.

### 3. Chạy bộ kiểm thử (Vitest)
```bash
npm test
```
Bộ kiểm thử sẽ kiểm tra 13 kịch bản:
- Tạo phòng, nhận ghế Trắng
- Tham gia phòng, nhận ghế Đen
- Chặn người thứ 3 chiếm ghế (Chỉ cho phép làm khán giả)
- Chặn khán giả đi quân
- Chặn đi sai lượt (Đen đi trước khi Trắng đi, Trắng đi 2 nước liên tiếp)
- Chặn nước đi trái luật cờ vua
- Xử lý chiếu bí (Scholar's mate) và phong cấp
- Khôi phục trạng thái sau khi tải lại trang
- Kịch bản đầu hàng (Resignation)

### 4. Build kiểm tra sản phẩm
```bash
npm run build
```

---

## 🚀 Hướng Dẫn Đẩy Lên GitHub & Triển Khai Vercel

### Bước 1: Đẩy mã nguồn lên GitHub
1. Khởi tạo Git và commit:
   ```bash
   git init
   git add .
   git commit -m "feat: Khoi tao du an Phong Chess Online"
   ```
2. Tạo một Repository mới trên [GitHub](https://github.com/new) (ví dụ: `phong-chess-online`).
3. Đẩy mã nguồn lên GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/phong-chess-online.git
   git branch -M main
   git push -u origin main
   ```

### Bước 2: Triển khai lên Vercel
1. Đăng nhập vào [Vercel](https://vercel.com/) bằng tài khoản GitHub.
2. Chọn **Add New...** ➜ **Project**.
3. Chọn kho lưu trữ `phong-chess-online` vừa tạo và nhấn **Import**.
4. Mở rộng phần **Environment Variables** và nhập toàn bộ các biến trong file `.env.local`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` *(Lưu ý: Dán chuỗi private key đầy đủ bao gồm cả `-----BEGIN PRIVATE KEY-----`)*.
5. Nhấn **Deploy**.
6. Sau khoảng 1 phút, Vercel sẽ cung cấp tên miền trực tiếp dạng: `https://phong-chess-online.vercel.app`.

---

## 🔒 Quy Ước An Toàn & Bảo Mật

- **Không commit thông tin bảo mật:** File `.gitignore` đã được cấu hình loại trừ triệt để `.env`, `.env.local`, các file khóa `*serviceAccount*.json` và `.pem`.
- **Không nhúng Firebase Admin vào Client:** Mã nguồn frontend chỉ tương tác với Firebase Client SDK. Toàn bộ logic nhạy cảm nằm ở các serverless function trong thư mục `api/`.
- **Chống gian lận:** Mọi nước cờ đều được `chess.js` phân tích độc lập ở máy chủ trước khi lưu vào cơ sở dữ liệu.
