# Travel Companion PWA

你的隨身旅遊規劃助手 — Mobile-First PWA，支援多人即時共享。  
資料儲存於 **Firebase Firestore**，封面圖片存於 localStorage。

## 功能

- **旅程管理**：建立多個旅程、封面圖片、日期計算、進度追蹤
- **多人共享**：產生邀請碼，朋友掃碼即可加入共同編輯
- **即時同步**：所有成員的修改即時反映（Firestore onSnapshot）
- **每日行程**：Day tabs 切換、時間衝突偵測、SortableJS 拖曳排序
- **地圖中心**：一鍵開啟 Google Maps App 或網頁版導航
- **預算管理**：圓餅圖分析、手動支出記錄、分帳計算
- **旅行清單**：預設模板 + 自訂項目、進度顯示
- **重要資訊**：航班、住宿、緊急聯絡資訊
- **AI 行程區**：貼入 Markdown 格式行程並即時預覽
- **離線支援**：Firestore IndexedDB 快取，無網路時顯示上次資料

---

## Firebase 設定步驟（必須完成才能使用）

### 1. 建立 Firebase 專案

1. 前往 [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. 點擊「新增專案」，取一個名稱（如 `travel-companion`）
3. 可選擇停用 Google Analytics（不需要）
4. 等待專案建立完成

### 2. 啟用 Firestore Database

1. 左側選單 → **Build → Firestore Database**
2. 點擊「建立資料庫」
3. 選擇 **Production mode**（之後設定安全規則）
4. 選擇離你最近的資料中心（亞洲可選 `asia-east1`）

### 3. 啟用匿名登入

1. 左側選單 → **Build → Authentication**
2. 點擊「開始使用」
3. 選擇「Sign-in method」→「匿名」→ 啟用

### 4. 取得 Firebase Config

1. 點擊左側齒輪圖示 → **專案設定**
2. 滾動到「你的應用程式」，點擊 `</>`（網頁）圖示
3. 輸入應用程式暱稱，點擊「繼續」
4. 複製 `firebaseConfig` 物件中的所有值

### 5. 填入設定

打開 `js/firebase.js`，將所有 `YOUR_...` 替換為你的實際值：

```javascript
const firebaseConfig = {
  apiKey:            'AIzaSy...',
  authDomain:        'your-project.firebaseapp.com',
  projectId:         'your-project-id',
  storageBucket:     'your-project.appspot.com',
  messagingSenderId: '123456789',
  appId:             '1:123456789:web:abcdef',
};
```

### 6. 設定 Firestore 安全規則

1. Firebase Console → **Firestore → 規則**
2. 貼入以下規則後點「發佈」：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 旅程：只有成員可讀寫
    match /trips/{tripId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null
        && request.auth.uid in resource.data.members;

      match /items/{itemId} {
        allow read, write: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/trips/$(tripId)).data.members;
      }
    }

    match /budgets/{tripId} {
      allow read, write: if request.auth != null
        && request.auth.uid in get(/databases/$(database)/documents/trips/$(tripId)).data.members;

      match /expenses/{expenseId} {
        allow read, write: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/trips/$(tripId)).data.members;
      }
    }

    match /checklists/{tripId} {
      allow read, write: if request.auth != null
        && request.auth.uid in get(/databases/$(database)/documents/trips/$(tripId)).data.members;
    }

    match /infos/{tripId} {
      allow read, write: if request.auth != null
        && request.auth.uid in get(/databases/$(database)/documents/trips/$(tripId)).data.members;
    }
  }
}
```

### 7. 加入授權網域（部署到 GitHub Pages 後）

1. Firebase Console → **Authentication → Settings → 授權網域**
2. 點擊「新增網域」，輸入你的 GitHub Pages 網域：
   ```
   [your-username].github.io
   ```

---

## 部署至 GitHub Pages

1. 確認已完成上方 Firebase 設定
2. 將整個 `travel-companion/` 資料夾內容 push 到 GitHub repo
3. 在 repo **Settings → Pages** → 選擇 `main` branch → `/ (root)`
4. 等待 1~2 分鐘，即可訪問：
   ```
   https://[your-username].github.io/[repo-name]/
   ```

## 本地開發

```bash
# Python
python3 -m http.server 8080
# 開啟 http://localhost:8080
```

> **注意**：本機開發時 Firebase Auth 在 `localhost` 上正常運作。

---

## 技術棧

- 純 HTML5 + CSS3 + Vanilla JavaScript (ES Modules)
- **Firebase Firestore** — 雲端資料庫 + 即時同步
- **Firebase Auth** — 匿名登入識別用戶
- Chart.js — 預算圓餅圖
- Marked.js — Markdown 渲染
- SortableJS — 拖曳排序
- PWA：manifest.json + Service Worker（Cache First + IndexedDB offline）

## 免費額度說明

Firebase Spark（免費方案）每天提供：
- 50,000 次讀取
- 20,000 次寫入
- 1 GB 儲存

小團體旅遊使用完全足夠。
