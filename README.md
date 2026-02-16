**🌐 [繁體中文](README.zh-TW.md) | English**

# SvgToXaml

A WPF desktop tool for browsing SVG files and converting them to XAML for use in .NET projects.

Forked from [BerndK/SvgToXaml](https://github.com/nickkuijpers/SvgToXaml) with custom enhancements for a modern dark-themed workflow.

## Features

- **SVG Browser** — Open a folder and instantly preview all SVG icons in a resizable grid
- **Geometry Output** — Converts SVG to `PathGeometry` / `GeometryGroup`, so icon color is controlled by `Foreground` in your app (complex SVGs with gradients fall back to `DrawingImage`)
- **Double-click to Copy** — Double-click any icon to copy its XAML to the clipboard, with a toast notification
- **Detail View** — Inspect preview, design size, actual size, stretch mode, raw XAML, and SVG source
- **Background Toggle** — Switch preview background between dark gray, light gray, and checkerboard
- **Auto Refresh** — `FileSystemWatcher` monitors the folder and refreshes automatically when files change
- **i18n** — Toggle between English and Traditional Chinese (zh-TW); preference is persisted
- **Batch Export** — Convert an entire folder of SVGs into a single XAML `ResourceDictionary`
- **Drag & Drop** — Drop a folder to browse it, or drop a file to open the detail view
- **Dark Theme** — Modern dark UI powered by HandyControl, with custom-styled context menus, tooltips, and scrollbars

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
4. Double-click an icon to copy its Geometry XAML to the clipboard
5. Right-click for context menu: copy XAML, view detail, open file

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
```

## License

Based on [BerndK/SvgToXaml](https://github.com/nickkuijpers/SvgToXaml). See original repository for license details.
