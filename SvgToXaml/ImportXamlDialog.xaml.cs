using System.Collections.Generic;
using System.Windows;
using SvgToXaml.Infrastructure;
using SvgToXaml.ViewModels;

namespace SvgToXaml
{
    public partial class ImportXamlDialog : Window
    {
        public List<DesignTokenEntry> ImportedTokens { get; private set; } = new List<DesignTokenEntry>();

        public ImportXamlDialog()
        {
            InitializeComponent();
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
