# Travel Companion PWA

你的隨身旅遊規劃助手 — 純前端 PWA，資料存於 localStorage，無需後端或登入。

## 功能

- **旅程管理**：建立多個旅程，封面圖片、日期計算、進度追蹤
- **每日行程**：Day tabs 切換、時間衝突偵測、SortableJS 拖曳排序
- **地圖中心**：一鍵開啟 Google Maps App 或網頁版導航
- **預算管理**：圓餅圖分析、手動支出記錄、分帳計算
- **旅行清單**：預設模板 + 自訂項目、進度顯示
- **重要資訊**：航班、住宿、緊急聯絡資訊
- **AI 行程區**：貼入 Markdown 格式行程並即時預覽
- **資料管理**：JSON 匯出/匯入備份

## 部署至 GitHub Pages

1. 不需要任何 build 步驟，直接使用原始檔案
2. 將整個 `travel-companion/` 資料夾內容 push 到 GitHub repo
3. 在 repo **Settings → Pages** → 選擇 `main` branch → `/ (root)`
4. 等待 1~2 分鐘，即可訪問：
   ```
   https://[your-username].github.io/[repo-name]/
   ```

## 本地開發

直接用任意 HTTP server 開啟即可：

```bash
# Python
python3 -m http.server 8080

# 或用 VS Code Live Server extension
```

## 技術棧

- 純 HTML5 + CSS3 + Vanilla JavaScript（ES6+）
- Chart.js — 預算圓餅圖
- Marked.js — Markdown 渲染
- SortableJS — 拖曳排序
- PWA：manifest.json + Service Worker（Cache First）
