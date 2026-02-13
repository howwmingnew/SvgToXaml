using System;
using System.Windows;
using SvgToXaml.Properties;

namespace SvgToXaml.Infrastructure
{
    public static class LanguageManager
    {
        private const string EnDictionaryUri = "Localization/Strings.en.xaml";
        private const string ZhTwDictionaryUri = "Localization/Strings.zh-TW.xaml";

        public static string CurrentLanguage { get; private set; } = "en";

        public static void Initialize()
        {
            var saved = Settings.Default.Language;
            if (string.IsNullOrEmpty(saved))
                saved = "en";
            SetLanguage(saved);
        }

        public static void SetLanguage(string langCode)
        {
            var uri = langCode == "zh-TW" ? ZhTwDictionaryUri : EnDictionaryUri;
            CurrentLanguage = langCode == "zh-TW" ? "zh-TW" : "en";

            var newDict = new ResourceDictionary
            {
                Source = new Uri(uri, UriKind.Relative)
            };

            var mergedDicts = Application.Current.Resources.MergedDictionaries;

            // 移除舊的語言字典
            ResourceDictionary existing = null;
            foreach (var dict in mergedDicts)
            {
                if (dict.Source != null && dict.Source.OriginalString.StartsWith("Localization/"))
                {
                    existing = dict;
                    break;
                }
            }
            if (existing != null)
                mergedDicts.Remove(existing);

            mergedDicts.Add(newDict);

            try
            {
                Settings.Default.Language = CurrentLanguage;
                Settings.Default.Save();
            }
            catch (Exception)
            {
                // 設定檔無法寫入時，語言切換仍在當前工作階段生效
            }
        }

        public static void ToggleLanguage()
        {
            SetLanguage(CurrentLanguage == "en" ? "zh-TW" : "en");
        }

        public static string GetString(string key)
        {
            if (Application.Current == null)
                return key;

            var value = Application.Current.Resources[key];
            return value as string ?? key;
        }
    }
}
