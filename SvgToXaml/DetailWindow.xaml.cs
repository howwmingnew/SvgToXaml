using System;
using System.Linq;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using SvgToXaml.ViewModels;

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
            DataContextChanged += (s, e) => RefreshXaml();
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

            RefreshXaml();
        }

        private void XamlMode_Changed(object sender, RoutedEventArgs e)
        {
            RefreshXaml();
        }

        private void RefreshXaml()
        {
            if (XmlViewer == null) return;
            var vm = DataContext as SvgImageViewModel;
            if (vm == null) return;

            string text;
            if (ModeGeometry != null && ModeGeometry.IsChecked == true)
                text = vm.GeometryData;
            else if (ModeDrawingImage != null && ModeDrawingImage.IsChecked == true)
                text = vm.Xaml;
            else
                text = vm.ButtonData;

            XmlViewer.Text = text ?? string.Empty;
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
