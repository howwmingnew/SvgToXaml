using System;
using System.ComponentModel;
using System.IO;
using System.Windows;
using System.Windows.Media.Animation;
using SvgToXaml.Properties;
using SvgToXaml.ViewModels;

namespace SvgToXaml
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow
    {
        public MainWindow()
        {
            InitializeComponent();

            var workArea = SystemParameters.WorkArea;
            Width = workArea.Width * 0.75;
            Height = workArea.Height * 0.75;

            DataContext = new SvgImagesViewModel();
            ((SvgImagesViewModel) DataContext).CurrentDir = Settings.Default.LastDir;

            ImageBaseViewModel.XamlCopied += ShowToast;
        }

        protected override void OnClosing(CancelEventArgs e)
        {
            ImageBaseViewModel.XamlCopied -= ShowToast;

            //Save current Dir for next Start
            Settings.Default.LastDir = ((SvgImagesViewModel) DataContext).CurrentDir;
            Settings.Default.Save();

            base.OnClosing(e);
        }

        private void ShowToast()
        {
            var animation = new DoubleAnimationUsingKeyFrames();
            animation.KeyFrames.Add(new LinearDoubleKeyFrame(1, KeyTime.FromTimeSpan(TimeSpan.FromMilliseconds(200))));
            animation.KeyFrames.Add(new LinearDoubleKeyFrame(1, KeyTime.FromTimeSpan(TimeSpan.FromMilliseconds(2200))));
            animation.KeyFrames.Add(new LinearDoubleKeyFrame(0, KeyTime.FromTimeSpan(TimeSpan.FromMilliseconds(2500))));
            ToastBorder.BeginAnimation(OpacityProperty, animation);
        }

        private void MainWindow_OnDrop(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                string[] paths = (string[])e.Data.GetData(DataFormats.FileDrop);

                foreach (var path in paths)
                {
                    if (Directory.Exists(path))
                    {
                        ((SvgImagesViewModel) DataContext).CurrentDir = path;
                    }
                    else
                    {
                        if (File.Exists(path))
                        {
                            ImageBaseViewModel.OpenDetailWindow(new SvgImageViewModel(path));
                        }
                    }
                }
            }
        }
    }

   
}
