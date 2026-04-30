using System.Collections.Generic;
using System.Windows;
using SvgToXaml.Infrastructure;
using SvgToXaml.ViewModels;

namespace SvgToXaml
{
    public partial class ImportXamlDialog : Window
    {
        public List<DesignTokenEntry> ImportedTokens { get; private set; } = new List<DesignTokenEntry>();

        /// <summary>
        /// 開啟時預先填入 TextBox 的內容；設定後 placeholder 不會顯示。
        /// </summary>
        public string InitialText { get; set; }

        /// <summary>
        /// 視窗標題覆寫；為 null 時使用預設 import 標題。
        /// </summary>
        public string TitleOverride { get; set; }

        public ImportXamlDialog()
        {
            InitializeComponent();
            Loaded += OnLoaded;
        }

        private void OnLoaded(object sender, RoutedEventArgs e)
        {
            if (!string.IsNullOrEmpty(TitleOverride))
            {
                Title = TitleOverride;
            }
            if (!string.IsNullOrEmpty(InitialText))
            {
                XamlInput.Text = InitialText;
            }
        }

        private void OK_Click(object sender, RoutedEventArgs e)
        {
            string error;
            var entries = DesignTokenXamlImporter.Parse(XamlInput.Text, out error);
            if (entries.Count == 0)
            {
                ResultText.Text = LanguageManager.GetString("S.Settings.Import.ParseError");
                return;
            }
            ImportedTokens = entries;
            DialogResult = true;
            Close();
        }

        private void Cancel_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
