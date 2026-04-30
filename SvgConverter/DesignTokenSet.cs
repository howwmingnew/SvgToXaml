using System;
using System.Collections.Generic;
using System.Globalization;

namespace SvgConverter
{
    /// <summary>
    /// Design Token 對照表：把顏色（含 alpha 的 #AARRGGBB）對應到一個 StaticResource key。
    /// SVG 解析時若遇到顏色命中 token，就直接用 token key 引用，跳過產生獨立的 SolidColorBrush。
    /// </summary>
    public sealed class DesignTokenSet
    {
        private readonly Dictionary<string, string> _colorToKey;

        public static readonly DesignTokenSet Empty = new DesignTokenSet();

        public DesignTokenSet()
        {
            _colorToKey = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        public DesignTokenSet(IEnumerable<KeyValuePair<string, string>> tokens) : this()
        {
            if (tokens == null) return;
            foreach (var pair in tokens)
            {
                Add(pair.Key, pair.Value);
            }
        }

        public int Count
        {
            get { return _colorToKey.Count; }
        }

        public void Add(string tokenKey, string color)
        {
            if (string.IsNullOrWhiteSpace(tokenKey)) return;
            var normalized = NormalizeColor(color);
            if (normalized == null) return;
            _colorToKey[normalized] = tokenKey.Trim();
        }

        /// <summary>
        /// 嘗試把顏色字串對應到 token key。color 可以是 #RGB / #ARGB / #RRGGBB / #AARRGGBB 任一格式，比對採大小寫不敏感且無 alpha 視為 FF。
        /// </summary>
        public bool TryResolve(string color, out string tokenKey)
        {
            tokenKey = null;
            var normalized = NormalizeColor(color);
            if (normalized == null) return false;
            return _colorToKey.TryGetValue(normalized, out tokenKey);
        }

        /// <summary>
        /// 把任意有效的顏色字串轉成大寫 8 位 hex 格式（#AARRGGBB），無 alpha 視為 FF；解析失敗回 null。
        /// </summary>
        public static string NormalizeColor(string color)
        {
            if (string.IsNullOrWhiteSpace(color)) return null;
            var s = color.Trim();
            if (!s.StartsWith("#", StringComparison.Ordinal)) return null;
            var hex = s.Substring(1);
            string a, r, g, b;
            switch (hex.Length)
            {
                case 3: // #RGB
                    a = "FF";
                    r = new string(hex[0], 2);
                    g = new string(hex[1], 2);
                    b = new string(hex[2], 2);
                    break;
                case 4: // #ARGB
                    a = new string(hex[0], 2);
                    r = new string(hex[1], 2);
                    g = new string(hex[2], 2);
                    b = new string(hex[3], 2);
                    break;
                case 6: // #RRGGBB
                    a = "FF";
                    r = hex.Substring(0, 2);
                    g = hex.Substring(2, 2);
                    b = hex.Substring(4, 2);
                    break;
                case 8: // #AARRGGBB
                    a = hex.Substring(0, 2);
                    r = hex.Substring(2, 2);
                    g = hex.Substring(4, 2);
                    b = hex.Substring(6, 2);
                    break;
                default:
                    return null;
            }
            if (!IsHex(a) || !IsHex(r) || !IsHex(g) || !IsHex(b)) return null;
            return ("#" + a + r + g + b).ToUpper(CultureInfo.InvariantCulture);
        }

        private static bool IsHex(string s)
        {
            for (int i = 0; i < s.Length; i++)
            {
                var c = s[i];
                var ok = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
                if (!ok) return false;
            }
            return true;
        }
    }
}
