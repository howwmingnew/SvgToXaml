using System.Windows;
using SvgToXaml.ViewModels;

namespace SvgToXaml
{
    public partial class SettingsWindow : Window
    {
        private readonly SettingsViewModel _vm;

        public SettingsWindow()
        {
            InitializeComponent();
            _vm = new SettingsViewModel();
            DataContext = _vm;
        }

        private void AddToken_Click(object sender, RoutedEventArgs e)
        {
            var entry = new DesignTokenEntryVm(string.Empty, "#FF000000");
            _vm.DesignTokens.Add(entry);
            TokenGrid.SelectedItem = entry;
            TokenGrid.ScrollIntoView(entry);
            TokenGrid.CurrentCell = new System.Windows.Controls.DataGridCellInfo(entry, TokenGrid.Columns[0]);
            TokenGrid.BeginEdit();
        }

        private void RemoveToken_Click(object sender, RoutedEventArgs e)
        {
            var selected = TokenGrid.SelectedItem as DesignTokenEntryVm;
            if (selected != null)
            {
                _vm.DesignTokens.Remove(selected);
            }
        }

        private void OK_Click(object sender, RoutedEventArgs e)
        {
            // 提交 DataGrid 內未確認的編輯（例如焦點還在儲存格時按 OK）
            TokenGrid.CommitEdit(System.Windows.Controls.DataGridEditingUnit.Cell, true);
            TokenGrid.CommitEdit(System.Windows.Controls.DataGridEditingUnit.Row, true);

            _vm.Save();
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
