# SvgToXaml - Brian's Custom Fork

## 專案簡介
這是 BerndK/SvgToXaml 的 fork 版本，一個 WPF 桌面工具，用來瀏覽 SVG 檔案並轉換成 XAML 供 .NET 專案使用。
我正在基於原專案進行客製化修改，讓操作更方便。

## 技術棧
- **框架**：WPF (.NET Framework)
- **語言**：C# + XAML
- **核心依賴**：SharpVectors（SVG → XAML 轉換引擎）
- **Solution 結構**：
  - `SvgToXaml/` - 主應用程式（WPF UI）
  - `SvgConverter/` - 轉換核心邏輯（Library）
  - `SvgConverterTest/` - 單元測試
  - `WpfDemoApp/` - 展示用 Demo
  - `IconResources/` - 圖示資源

## 開發規範
- 使用繁體中文撰寫 commit message 和註解
- 遵循 MVVM 模式（如果原專案有的話跟隨，沒有的話新增功能用 MVVM）
- 新增功能用 partial class 或新檔案，盡量不大幅改動原有程式碼結構
- XAML 的命名使用 PascalCase

## 修改計畫（依建議執行順序）

### Feature 4（先做）：背景色改為深灰 + 可切換
- 預設背景改為深灰色（#3C3C3C）方便看白色 icon
- 提供背景切換按鈕：深灰 / 淺灰 / 棋盤格（透明感）
- 棋盤格用 DrawingBrush + TileBrush 實現

### Feature 1：自動刷新資料夾 SVG 預覽
- 使用 FileSystemWatcher 監聽目前開啟的資料夾
- 監聽 Created、Deleted、Renamed、Changed 事件
- 事件觸發後用 Dispatcher.Invoke 回到 UI 執行緒刷新 collection
- 加入 debounce 機制避免短時間內大量刷新（例如 500ms）

### Feature 2：雙擊 SVG 圖示複製 XAML 到剪貼簿 + Toast 通知
- 主頁的 SVG 項目雙擊左鍵觸發複製
- 複製的內容是轉換後的 Geometry XAML（見 Feature 3）
- 複製成功後在畫面上顯示 Toast 通知「已複製到剪貼簿」
- Toast 使用自製輕量 Popup/Adorner，淡入 → 停留 2 秒 → 淡出
- 不使用第三方 Toast 套件

### Feature 3（核心改動）：輸出格式從 DrawingImage 改為 Geometry
- 原專案轉換後輸出 DrawingImage（形狀 + 顏色綁死）
- 改為輸出純 Geometry / PathGeometry
- 這樣顏色可以在外部 Style 裡用 Foreground 動態控制
- 如果 SVG 有多個 path，合併成 GeometryGroup
- 對於帶 gradient 或 clip 的複雜 SVG，提供 fallback 仍輸出 DrawingImage，並在 UI 上標示

### Feature 5（最後做）：介面美化
- 整體風格現代化：圓角、適當間距、清爽配色
- 考慮整合 HandyControl 或 MaterialDesignInXamlToolkit（擇一）
- 如果整合 UI 套件太複雜，手動調整也可以：
  - 統一字型（Segoe UI）
  - 按鈕和面板加圓角
  - 適當的 hover/click 回饋效果
  - 工具列/狀態列重新排版
