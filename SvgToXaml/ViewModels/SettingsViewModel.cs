using System;
using System.Collections.ObjectModel;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Markup;
using System.Windows.Media;
using SvgConverter;
using SvgToXaml.Command;
using SvgToXaml.Infrastructure;
using SvgToXaml.Properties;

namespace SvgToXaml.ViewModels
{
    public class SettingsViewModel : ViewModelBase
    {
        private bool _isCopyModeButton;
        private bool _isCopyModeGeometry;

        public SettingsViewModel()
        {
            // 載入預設複製模式
            var mode = Settings.Default.DefaultCopyMode;
            if (string.Equals(mode, "Geometry", StringComparison.OrdinalIgnoreCase))
            {
                _isCopyModeGeometry = true;
            }
            else
            {
                _isCopyModeButton = true;
            }

            // 載入 design tokens
            DesignTokens = new ObservableCollection<DesignTokenEntryVm>(
                DesignTokenStore.Load().Select(e => new DesignTokenEntryVm(e.Key, e.Color)));

            AddTokenCommand = new DelegateCommand(AddTokenExecute);
            RemoveTokenCommand = new DelegateCommand<DesignTokenEntryVm>(RemoveTokenExecute);
            ImportFromXamlCommand = new DelegateCommand(ImportFromXamlExecute);
        }

        public bool IsCopyModeButton
        {
            get { return _isCopyModeButton; }
            set
            {
                if (SetProperty(ref _isCopyModeButton, value) && value)
                {
                    _isCopyModeGeometry = false;
                    OnPropertyChanged(nameof(IsCopyModeGeometry));
                }
            }
        }

        public bool IsCopyModeGeometry
        {
            get { return _isCopyModeGeometry; }
            set
            {
                if (SetProperty(ref _isCopyModeGeometry, value) && value)
                {
                    _isCopyModeButton = false;
                    OnPropertyChanged(nameof(IsCopyModeButton));
                }
            }
        }

        public ObservableCollection<DesignTokenEntryVm> DesignTokens { get; }

        public System.Windows.Input.ICommand AddTokenCommand { get; }
        public System.Windows.Input.ICommand RemoveTokenCommand { get; }
        public System.Windows.Input.ICommand ImportFromXamlCommand { get; }

        private void AddTokenExecute()
        {
            DesignTokens.Add(new DesignTokenEntryVm(string.Empty, "#FF000000"));
        }

        private void RemoveTokenExecute(DesignTokenEntryVm entry)
        {
            if (entry == null) return;
            DesignTokens.Remove(entry);
        }

        private void ImportFromXamlExecute()
        {
            var dlg = new ImportXamlDialog();
            var owner = Application.Current?.Windows.OfType<Window>().FirstOrDefault(w => w.IsActive);
            if (owner != null) dlg.Owner = owner;
            if (dlg.ShowDialog() != true) return;
            var imported = dlg.ImportedTokens;
            if (imported == null || imported.Count == 0) return;
            foreach (var entry in imported)
            {
                // 同 key 取代既有；不同 key 才新增
                var existing = DesignTokens.FirstOrDefault(e => string.Equals(e.Key, entry.Key, StringComparison.Ordinal));
                if (existing != null) existing.Color = entry.Color;
                else DesignTokens.Add(new DesignTokenEntryVm(entry.Key, entry.Color));
            }
        }

        /// <summary>
        /// 將目前狀態寫回 Settings 與 DesignTokenStore，並 broadcast 變更。
        /// </summary>
        public void Save()
        {
            Settings.Default.DefaultCopyMode = _isCopyModeGeometry ? "Geometry" : "Button";
            try { Settings.Default.Save(); } catch { }

            var entries = DesignTokens
                .Where(e => !string.IsNullOrWhiteSpace(e.Key) && !string.IsNullOrWhiteSpace(e.Color)
                            && DesignTokenSet.NormalizeColor(e.Color) != null)
                .Select(e => new DesignTokenEntry { Key = e.Key.Trim(), Color = e.Color.Trim() })
                .ToList();
            DesignTokenStore.Save(entries);
            DesignTokenStore.Reload();
        }
    }

    /// <summary>
    /// 編輯用的 token 條目，附帶預覽 Brush。
    /// </summary>
    public class DesignTokenEntryVm : BindableBase
    {
        private string _key;
        private string _color;

        public DesignTokenEntryVm(string key, string color)
        {
            _key = key ?? string.Empty;
            _color = color ?? string.Empty;
        }

        public string Key
        {
            get { return _key; }
            set { SetProperty(ref _key, value); }
        }

        public string Color
        {
            get { return _color; }
            set
            {
                if (SetProperty(ref _color, value))
                {
                    OnPropertyChanged(nameof(PreviewBrush));
                    OnPropertyChanged(nameof(IsValid));
                }
            }
        }

        public bool IsValid
        {
            get { return !string.IsNullOrWhiteSpace(_key) && DesignTokenSet.NormalizeColor(_color) != null; }
        }

        public Brush PreviewBrush
        {
            get
            {
                var normalized = DesignTokenSet.NormalizeColor(_color);
                if (normalized == null) return Brushes.Transparent;
                try
                {
                    var c = (Color)ColorConverter.ConvertFromString(normalized);
                    var b = new SolidColorBrush(c);
                    b.Freeze();
                    return b;
                }
                catch
                {
                    return Brushes.Transparent;
                }
            }
        }
    }

    /// <summary>
    /// 用 XamlReader 解析 ResourceDictionary，從中擷取 SolidColorBrush / Color 條目。
    /// 此類別在 SettingsViewModel 內透過 ImportXamlDialog 視窗使用。
    /// </summary>
    public static class DesignTokenXamlImporter
    {
        public static System.Collections.Generic.List<DesignTokenEntry> Parse(string xaml, out string error)
        {
            error = null;
            var result = new System.Collections.Generic.List<DesignTokenEntry>();
            if (string.IsNullOrWhiteSpace(xaml))
            {
                error = "empty";
                return result;
            }

            // 自動補上 ResourceDictionary 外殼，如果使用者只貼了內部條目
            var trimmed = xaml.TrimStart();
            if (!trimmed.StartsWith("<ResourceDictionary", StringComparison.Ordinal))
            {
                xaml = "<ResourceDictionary " +
                       "xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" " +
                       "xmlns:x=\"http://schemas.microsoft.com/winfx/2006/xaml\">" +
                       xaml + "</ResourceDictionary>";
            }

            try
            {
                using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(xaml)))
                {
                    var obj = XamlReader.Load(stream);
                    var dict = obj as ResourceDictionary;
                    if (dict == null)
                    {
                        error = "not a ResourceDictionary";
                        return result;
                    }
                    foreach (var key in dict.Keys)
                    {
                        var keyStr = key as string;
                        if (string.IsNullOrWhiteSpace(keyStr)) continue;
                        var value = dict[key];
                        string colorHex = null;
                        if (value is SolidColorBrush brush)
                        {
                            colorHex = ColorToHex(brush.Color);
                        }
                        else if (value is Color color)
                        {
                            colorHex = ColorToHex(color);
                        }
                        if (colorHex != null)
                        {
                            result.Add(new DesignTokenEntry { Key = keyStr, Color = colorHex });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                error = ex.Message;
            }
            return result;
        }

        private static string ColorToHex(Color c)
        {
            return string.Format(CultureInfo.InvariantCulture,
                "#{0:X2}{1:X2}{2:X2}{3:X2}", c.A, c.R, c.G, c.B);
        }
    }
}
