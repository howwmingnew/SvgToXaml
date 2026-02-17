using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using SvgToXaml.ViewModels;

namespace SvgToXaml
{
    public partial class ExportPreviewWindow : Window
    {
        public ExportPreviewWindow()
        {
            InitializeComponent();

            var workArea = SystemParameters.WorkArea;
            Width = workArea.Width * 0.75;
            Height = workArea.Height * 0.75;
        }

        /// <summary>
        /// 從已載入的 SvgImageViewModel 集合載入預覽圖示
        /// </summary>
        public void LoadFromImages(IEnumerable<SvgImageViewModel> svgImages)
        {
            var list = svgImages.ToList();
            HeaderText.Text = string.Format("{0} icons", list.Count);

            foreach (var svgImg in list)
            {
                if (svgImg.PreviewSource == null) continue;

                var image = new Image
                {
                    Width = 40,
                    Height = 40,
                    Margin = new Thickness(3),
                    Source = svgImg.PreviewSource,
                    Stretch = Stretch.Uniform,
                    ToolTip = Path.GetFileNameWithoutExtension(svgImg.Filepath),
                };
                IconPanel.Children.Add(image);
            }
        }
    }
}
