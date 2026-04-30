using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using SvgConverter;

namespace SvgToXaml.Infrastructure
{
    /// <summary>
    /// 把 Design Tokens 以純文字格式存到 %APPDATA%\SvgToXaml\design-tokens.txt。
    /// 格式：每行 key=color，# 開頭視為註解，空行忽略。
    /// </summary>
    public static class DesignTokenStore
    {
        private const string FolderName = "SvgToXaml";
        private const string FileName = "design-tokens.txt";

        private static DesignTokenSet _currentSet = DesignTokenSet.Empty;

        /// <summary>
        /// 目前生效的 DesignTokenSet。設定頁面儲存後會更新此值。
        /// </summary>
        public static DesignTokenSet Current
        {
            get { return _currentSet ?? DesignTokenSet.Empty; }
        }

        /// <summary>
        /// Tokens 變更後觸發。SvgImagesViewModel 訂閱此事件來重新整理目前資料夾。
        /// </summary>
        public static event Action TokensChanged;

        /// <summary>
        /// 從檔案重新載入 tokens 並更新 Current。應用啟動時與設定變更後呼叫。
        /// </summary>
        public static void Reload()
        {
            _currentSet = LoadAsSet();
            var handler = TokensChanged;
            if (handler != null) handler();
        }

        public static string FilePath
        {
            get
            {
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                return Path.Combine(appData, FolderName, FileName);
            }
        }

        /// <summary>
        /// 讀取目前儲存的 token 清單。檔案不存在或解析失敗回傳空清單。
        /// </summary>
        public static List<DesignTokenEntry> Load()
        {
            var result = new List<DesignTokenEntry>();
            try
            {
                var path = FilePath;
                if (!File.Exists(path)) return result;
                var lines = File.ReadAllLines(path);
                foreach (var raw in lines)
                {
                    var line = raw == null ? string.Empty : raw.Trim();
                    if (line.Length == 0 || line.StartsWith("#", StringComparison.Ordinal)) continue;
                    var idx = line.IndexOf('=');
                    if (idx <= 0 || idx == line.Length - 1) continue;
                    var key = line.Substring(0, idx).Trim();
                    var color = line.Substring(idx + 1).Trim();
                    if (key.Length == 0 || color.Length == 0) continue;
                    if (DesignTokenSet.NormalizeColor(color) == null) continue;
                    result.Add(new DesignTokenEntry { Key = key, Color = color });
                }
            }
            catch
            {
                // 檔案損毀或無法讀取時回傳空清單
            }
            return result;
        }

        /// <summary>
        /// 將 token 清單寫回檔案。會自動建立資料夾。
        /// </summary>
        public static void Save(IEnumerable<DesignTokenEntry> entries)
        {
            var path = FilePath;
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
            var lines = new List<string>
            {
                "# SvgToXaml Design Tokens",
                "# 格式：TokenKey=ColorHex（例：Brand.Primary=#FF0066CC）",
                "# 比對採大小寫不敏感、無 alpha 視為 FF",
                string.Empty,
            };
            if (entries != null)
            {
                foreach (var e in entries)
                {
                    if (e == null || string.IsNullOrWhiteSpace(e.Key) || string.IsNullOrWhiteSpace(e.Color)) continue;
                    lines.Add(e.Key.Trim() + "=" + e.Color.Trim());
                }
            }
            File.WriteAllLines(path, lines);
        }

        /// <summary>
        /// 直接讀檔並轉成 SvgConverter 的 DesignTokenSet。
        /// </summary>
        public static DesignTokenSet LoadAsSet()
        {
            var entries = Load();
            return new DesignTokenSet(entries.Select(e => new KeyValuePair<string, string>(e.Key, e.Color)));
        }
    }

    public class DesignTokenEntry
    {
        public string Key { get; set; }
        public string Color { get; set; }
    }
}
