**🌐 繁體中文 | [English](README.md)**

# SvgToXaml

一款 WPF 桌面工具，用於瀏覽 SVG 檔案並轉換為 XAML，供 .NET 專案使用。

基於 [BerndK/SvgToXaml](https://github.com/nickkuijpers/SvgToXaml) 進行客製化修改，打造現代暗色主題的工作流程。

## Web 版

**[線上使用 — 免安裝](https://howwmingnew.github.io/SvgToXaml/)**

純前端 Web 應用（React + TypeScript），完全在瀏覽器中運行。拖放 SVG 檔案即可預覽並即時轉換為 XAML。支援 Geometry 和 DrawingImage 雙模式輸出，可批次匯出 ResourceDictionary / UserControl / ZIP。

## 功能特色

- **SVG 瀏覽器** — 開啟資料夾即可在可調整大小的網格中預覽所有 SVG 圖示
- **三種輸出格式** — 自由選擇 SVG 轉 XAML 的形式：
  - **Button Style**（預設） — 完整的 `Button` 樣板，含 `IsMouseOver` / `IsPressed` 觸發器，貼上即可作為可互動的 icon 按鈕
  - **Geometry Style** — 純 `ContentControl` 圖示樣板，顏色由外部 `Foreground` 控制
  - **DrawingImage** — 含漸層或 clip path 的複雜 SVG 會自動 fallback 為此格式
- **單擊即複製** — 左鍵單擊任一圖示即可將 XAML 複製到剪貼簿，並顯示 Toast 通知（預設複製模式可在設定中切換）
- **設定頁面** — 工具列齒輪按鈕開啟設定視窗：
  - 預設左鍵動作 — **Button Style** 與 **Geometry Style** 二選一，旁邊 `?` 按鈕的 tooltip 提供兩種輸出範例的 XAML 對照
  - **Design Tokens** — 註冊你專案的色彩 token，SVG 顏色命中 token 時直接輸出 `{StaticResource TokenKey}`，不再為每個圖示產生獨立的 `SolidColorBrush`。可用 DataGrid 即時編輯、**從 XAML 匯入**（與現有清單合併）、或**編輯 XAML**（把整個 token 集合以 `ResourceDictionary` 形式開啟編輯，存檔後完整取代）。Token 會自動依 key 排序。
  - 設定會跨版本保留（更新版本後第一次啟動會自動從舊版 user.config 遷移過來）。
- **Detail 檢視** — 檢查預覽、設計尺寸、實際尺寸、縮放模式、原始 XAML 及 SVG 原始碼
- **背景切換** — 在深灰、淺灰和棋盤格之間切換預覽背景
- **自動刷新** — 使用 `FileSystemWatcher` 監聽資料夾，檔案變更時自動刷新
- **多語系** — 在英文和繁體中文（zh-TW）之間切換，設定會自動保存
- **批次匯出** — 將整個資料夾的 SVG 轉換為單一 XAML `ResourceDictionary`（Design Tokens 同樣會套用）
- **拖放支援** — 拖放資料夾即可瀏覽，拖放檔案即可開啟 Detail 檢視
- **暗色主題** — 採用 HandyControl 的現代暗色 UI，搭配自訂右鍵選單、工具提示及捲軸樣式
- **自動檢查更新** — 啟動時查詢 GitHub 最新 release，工具列出現提示按鈕引導下載

## 快速開始

### 下載

前往 [Releases](../../releases) 下載 `SvgToXaml.exe` — 直接執行，無需安裝或解壓縮。

### 從原始碼建置

**前置需求：** Visual Studio 2022，需安裝 .NET Framework 4.6.2 targeting pack。

```bash
git clone https://github.com/howwmingnew/SvgToXaml.git
cd SvgToXaml
nuget restore SvgToXaml.sln
msbuild SvgToXaml.sln /p:Configuration=Release
```

輸出位置：`SvgToXaml\bin\Release\SvgToXaml.exe`

## 使用方式

### 圖形介面

1. 啟動 `SvgToXaml.exe`
2. 透過工具列按鈕、網址列或拖放方式開啟資料夾
3. 瀏覽圖示 — 使用滑桿調整大小、切換背景、切換語系
4. 左鍵單擊（或雙擊）任一圖示即可將 XAML 複製到剪貼簿，輸出格式依**預設左鍵動作**設定
5. 點擊工具列齒輪圖示開啟**設定**視窗 — 切換預設複製模式、管理 **Design Tokens**
6. 右鍵開啟選單：複製 XAML、檢視詳情、開啟檔案

### Design Tokens

若你的 WPF 專案已經定義好命名 brush（例如 `Brand.Primary`），可在**設定 → Design Tokens** 註冊；命中 token 的 SVG 顏色會直接引用，不再內嵌 brush 宣告。

例如註冊 `Brand.Primary = #FF0066CC`，SVG 內使用 `#0066CC`（無 alpha 視為 `#FF0066CC`）：

```xml
<!-- 無 token -->
<SolidColorBrush x:Key="home_Brush" Color="#FF0066CC" />
<Path Fill="{StaticResource home_Brush}" ... />

<!-- 有 token -->
<Path Fill="{StaticResource Brand.Primary}" ... />
```

Tokens 儲存於 `%APPDATA%\SvgToXaml\design-tokens.txt`，**單擊複製**與**批次匯出**都會套用。

### 命令列介面（CLI）

`SvgToXaml.exe` 同時支援命令列模式，適用於自動化流程或 AI agent 整合 — 例如把 Figma 匯出的 SVG 餵給 Claude Code、串接 MCP 工作流，或接到 CI/CD 上。共有兩個指令。

#### `Convert` — 單檔或資料夾，多種輸出格式

轉換單一 SVG 或整個資料夾的 SVG，輸出到檔案、資料夾或 stdout。

```bash
# 單檔 → stdout（預設格式：geometry）
SvgToXaml.exe Convert /input icon.svg

# 單檔 → 指定檔案
SvgToXaml.exe Convert /input icon.svg /output icon.xaml

# 切換輸出格式
SvgToXaml.exe Convert /input icon.svg /format button         # Button 含 hover/pressed 觸發器
SvgToXaml.exe Convert /input icon.svg /format drawingimage   # 舊版 DrawingImage

# 資料夾批次 → 輸出資料夾
SvgToXaml.exe Convert /input ./icons /output ./xaml /recurse

# 資料夾批次 → stdout（每個檔案以 `<!-- ===== filename ===== -->` 分隔）
SvgToXaml.exe Convert /input ./icons

# 從 stdin 讀 SVG — 不產生暫存檔（適合直接 pipe curl 或 Figma asset URL）
curl -s "https://example.com/icon.svg" | SvgToXaml.exe Convert /input - /name brush
```

**輸出格式：**
- `geometry`（預設） — 以 `Path` 為基礎的 `ContentControl` 樣板，可透過 `Foreground` 動態換色
- `button` — 完整 `Button` 樣板，含 `IsMouseOver` / `IsPressed` 觸發器
- `drawingimage` — 舊版 `DrawingImage` 格式（含漸層或 clip path 的 SVG 也會自動 fallback 到此格式）

**輸入來源：**
- 檔案路徑 — 單一 SVG(`.svg` / `.svgz`)
- 資料夾路徑 — 批次轉換內部所有 SVG(`/recurse` 遞迴子資料夾)
- `-`(短橫線) — 從 **stdin** 讀 SVG 內容,搭配 `/name <baseName>` 讓 resource key 有意義(省略時預設為 `Icon`)

**輸出流:**
- **stdout** — 純 XAML 內容(省略 `/output` 時)
- **stderr** — banner、警告、寫檔確認訊息、錯誤訊息

**Exit code:** `0` 成功 · `1` IO / 轉換錯誤 · `2` 參數錯誤

> **注意：** SvgToXaml 是 Windows GUI 應用程式（WinExe）。從 PowerShell、Bash 或非 `cmd` shell 呼叫時請用 `cmd /c "..."` 包裝,父程序才會等子程序結束、stdout 重導向也才能正確擷取輸出。

#### `BuildDict` — 產生單一 `ResourceDictionary`

```
SvgToXaml.exe BuildDict /inputdir:".\svg" /outputname:icons /outputdir:"."
```

會產生 `icons.xaml` — 可合併到應用程式的 `ResourceDictionary`：

```xml
<Application.Resources>
    <ResourceDictionary>
        <ResourceDictionary.MergedDictionaries>
            <ResourceDictionary Source="icons.xaml" />
        </ResourceDictionary.MergedDictionaries>
    </ResourceDictionary>
</Application.Resources>
```

接著在 XAML 中使用圖示：

```xml
<Path Data="{StaticResource cloud_iconGeometry}" Fill="{Binding Foreground}" />
```

#### Help 指令

```
SvgToXaml.exe /?              # 列出所有指令
SvgToXaml.exe Convert /?      # Convert 的完整參數說明
SvgToXaml.exe BuildDict /?    # BuildDict 的完整參數說明
```

## 技術棧

| 元件 | 技術 |
|------|------|
| 框架 | WPF (.NET Framework 4.6.2) |
| 語言 | C# + XAML |
| SVG 引擎 | [SharpVectors](https://github.com/nickkuijpers/SharpVectors) |
| UI 套件 | [HandyControl](https://github.com/HandyOrg/HandyControl) |
| 程式碼編輯器 | [AvalonEdit](http://avalonedit.net/) |
| CI/CD | GitHub Actions（tag push 時自動建置） |
| Web 版 | React 18 + TypeScript + Vite + Tailwind CSS |

## 專案結構

```
SvgToXaml/          # 主 WPF 應用程式
  Infrastructure/   # LanguageManager、FolderPicker、工具類別
  Localization/     # Strings.en.xaml、Strings.zh-TW.xaml
  ViewModels/       # MVVM 視圖模型
  Themes/           # CustomStyles.xaml（暗色主題）
  Explorer/         # 資料夾樹狀控制項
SvgConverter/       # 核心 SVG 轉 XAML 轉換函式庫
SvgConverterTest/   # 單元測試
WpfDemoApp/         # 展示用應用程式
svg-to-xaml-web/    # Web 版（React + TypeScript）
```

## 授權

基於 [BerndK/SvgToXaml](https://github.com/nickkuijpers/SvgToXaml)。授權條款請參閱原始儲存庫。
