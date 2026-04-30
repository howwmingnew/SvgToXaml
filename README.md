**🌐 [繁體中文](README.zh-TW.md) | English**

# SvgToXaml

A WPF desktop tool for browsing SVG files and converting them to XAML for use in .NET projects.

Forked from [BerndK/SvgToXaml](https://github.com/nickkuijpers/SvgToXaml) with custom enhancements for a modern dark-themed workflow.

## Web Version

**[Try it online — no installation needed](https://howwmingnew.github.io/SvgToXaml/)**

A pure frontend web app (React + TypeScript) that runs entirely in the browser. Drag & drop SVG files, preview them, and convert to XAML instantly. Supports both Geometry and DrawingImage output modes, batch export to ResourceDictionary / UserControl / ZIP.

## Features

- **SVG Browser** — Open a folder and instantly preview all SVG icons in a resizable grid
- **Three Output Modes** — Choose how SVGs are emitted to XAML:
  - **Button Style** *(default)* — Full `Button` template with `IsMouseOver` / `IsPressed` triggers, ready to drop in as a clickable icon button
  - **Geometry Style** — Pure `ContentControl` icon template; color controlled externally via `Foreground`
  - **DrawingImage** — Automatic fallback for complex SVGs containing gradients or clip paths
- **Click to Copy** — Single-click any icon to copy its XAML to the clipboard with a toast notification (default mode is configurable in Settings)
- **Settings** — In-app settings window (toolbar gear icon):
  - Default left-click action — **Button Style** vs **Geometry Style**, with side-by-side example XAML in the help tooltip
  - **Design Tokens** — define your project's color tokens once; SVG colors that match a token are emitted as `{StaticResource TokenKey}` instead of generating a per-icon `SolidColorBrush`. Supports importing tokens from any `ResourceDictionary` XAML you paste in
- **Detail View** — Inspect preview, design size, actual size, stretch mode, raw XAML, and SVG source
- **Background Toggle** — Switch preview background between dark gray, light gray, and checkerboard
- **Auto Refresh** — `FileSystemWatcher` monitors the folder and refreshes automatically when files change
- **i18n** — Toggle between English and Traditional Chinese (zh-TW); preference is persisted
- **Batch Export** — Convert an entire folder of SVGs into a single XAML `ResourceDictionary` (Design Tokens are applied here too)
- **Drag & Drop** — Drop a folder to browse it, or drop a file to open the detail view
- **Dark Theme** — Modern dark UI powered by HandyControl, with custom-styled context menus, tooltips, and scrollbars
- **Auto-Update Check** — On launch, queries the latest GitHub release; a button appears in the toolbar when a newer version is available

## Getting Started

### Download

Go to [Releases](../../releases) and download `SvgToXaml.exe` — run directly, no installation or extraction needed.

### Build from Source

**Prerequisites:** Visual Studio 2022 with .NET Framework 4.6.2 targeting pack.

```bash
git clone https://github.com/howwmingnew/SvgToXaml.git
cd SvgToXaml
nuget restore SvgToXaml.sln
msbuild SvgToXaml.sln /p:Configuration=Release
```

Output: `SvgToXaml\bin\Release\SvgToXaml.exe`

## Usage

### GUI

1. Launch `SvgToXaml.exe`
2. Open a folder via the toolbar button, address bar, or drag & drop
3. Browse icons — resize with the slider, toggle background, switch language
4. Single-click (or double-click) any icon to copy its XAML to the clipboard — the output format follows your **Default left-click action** setting
5. Click the gear icon in the toolbar to open **Settings** — switch the default copy mode or manage **Design Tokens**
6. Right-click for context menu: copy XAML, view detail, open file

### Design Tokens

If your WPF project already defines named brushes (e.g. `Brand.Primary`), you can register them in **Settings → Design Tokens** so SVG colors that match are emitted as references instead of inline brushes.

Given a token `Brand.Primary = #FF0066CC` and an SVG that uses `#0066CC` (alpha-less colors are treated as `#FF0066CC`):

```xml
<!-- Without tokens -->
<SolidColorBrush x:Key="home_Brush" Color="#FF0066CC" />
<Path Fill="{StaticResource home_Brush}" ... />

<!-- With token -->
<Path Fill="{StaticResource Brand.Primary}" ... />
```

Tokens are stored in `%APPDATA%\SvgToXaml\design-tokens.txt` and applied to **both** click-to-copy and folder export.

### Batch Conversion (CLI)

SvgToXaml doubles as a CLI tool. Run with parameters to skip the GUI:

```
SvgToXaml.exe BuildDict /inputdir:".\svg" /outputname:icons /outputdir:"."
```

This produces `icons.xaml` — a `ResourceDictionary` you can merge into your app:

```xml
<Application.Resources>
    <ResourceDictionary>
        <ResourceDictionary.MergedDictionaries>
            <ResourceDictionary Source="icons.xaml" />
        </ResourceDictionary.MergedDictionaries>
    </ResourceDictionary>
</Application.Resources>
```

Then use icons in XAML:

```xml
<Path Data="{StaticResource cloud_iconGeometry}" Fill="{Binding Foreground}" />
```

Run `SvgToXaml.exe /?` for full CLI help.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | WPF (.NET Framework 4.6.2) |
| Language | C# + XAML |
| SVG Engine | [SharpVectors](https://github.com/nickkuijpers/SharpVectors) |
| UI Toolkit | [HandyControl](https://github.com/HandyOrg/HandyControl) |
| Code Editor | [AvalonEdit](http://avalonedit.net/) |
| CI/CD | GitHub Actions (auto-build on tag push) |
| Web Version | React 18 + TypeScript + Vite + Tailwind CSS |

## Project Structure

```
SvgToXaml/          # Main WPF application
  Infrastructure/   # LanguageManager, FolderPicker, utilities
  Localization/     # Strings.en.xaml, Strings.zh-TW.xaml
  ViewModels/       # MVVM view models
  Themes/           # CustomStyles.xaml (dark theme)
  Explorer/         # Folder tree control
SvgConverter/       # Core SVG-to-XAML conversion library
SvgConverterTest/   # Unit tests
WpfDemoApp/         # Demo application
svg-to-xaml-web/    # Web version (React + TypeScript)
```

## License

Based on [BerndK/SvgToXaml](https://github.com/nickkuijpers/SvgToXaml). See original repository for license details.
