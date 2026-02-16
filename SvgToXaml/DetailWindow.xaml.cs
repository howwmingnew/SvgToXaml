using System;
using System.Linq;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;

namespace SvgToXaml
{
    /// <summary>
    /// Interaction logic for DetailWindow.xaml
    /// </summary>
    public partial class DetailWindow
    {
        public DetailWindow()
        {
            InitializeComponent();
            Loaded += OnLoaded;
        }

        private void OnLoaded(object sender, RoutedEventArgs e)
        {
            // 視窗大小設為主視窗的 1/3，並置中於主視窗
            if (Owner != null)
            {
                Width = Math.Max(MinWidth, Owner.ActualWidth / 3);
                Height = Math.Max(MinHeight, Owner.ActualHeight / 3);
                Left = Owner.Left + (Owner.ActualWidth - Width) / 2;
                Top = Owner.Top + (Owner.ActualHeight - Height) / 2;
            }
            else
            {
                Width = 450;
                Height = 380;
            }
        }

        private void CopyToClipboardClick(object sender, RoutedEventArgs e)
        {
            Clipboard.SetText(XmlViewer.Text);
        }

        private void ToggleStretchClicked(object sender, MouseButtonEventArgs e)
        {
            var values = Enum.GetValues(typeof(Stretch)).OfType<Stretch>().ToList();
            var idx = values.IndexOf(Image.Stretch);
            idx = (idx + 1) % values.Count;
            Image.Stretch = values[idx];
        }
    }
}
