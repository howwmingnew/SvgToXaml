using System;
using System.Windows;
using System.Windows.Media;
using SvgConverter;

namespace SvgToXaml.ViewModels
{
    public class SvgImageViewModel : ImageBaseViewModel
    {
        private ConvertedSvgData _convertedSvgData;


        public SvgImageViewModel(string filepath) : base(filepath)
        {
        }

        public SvgImageViewModel(ConvertedSvgData convertedSvgData)
            : this(convertedSvgData.Filepath)
        {
            _convertedSvgData = convertedSvgData;
        }

        public static SvgImageViewModel DesignInstance
        {
            get
            {
                var imageSource = new DrawingImage(new GeometryDrawing(Brushes.Black, null, new RectangleGeometry(new Rect(new Size(10, 10)), 1, 1)));
                var data = new ConvertedSvgData { ConvertedObj = imageSource, Filepath = "FilePath", Svg = "<svg/>", Xaml = "<xaml/>" };
                return new SvgImageViewModel(data);
            }
        }

        protected override ImageSource GetImageSource()
        {
            return SvgData?.ConvertedObj as ImageSource;
        }

        protected override string GetSvgDesignInfo()
        {
            if (PreviewSource is DrawingImage)
            {
                var di = (DrawingImage) PreviewSource;
                if (di.Drawing is DrawingGroup)
                {
                    var dg = (DrawingGroup) di.Drawing;
                    var bounds = dg.ClipGeometry?.Bounds ?? dg.Bounds;
                    return $"{bounds.Width:#.##}x{bounds.Height:#.##}";
                }
            }
            return null;
        }

        protected override void CopyXamlExecute()
        {
            // 預設複製 Button Style；若擷取失敗依序 fallback 到 Geometry → DrawingImage
            var text = ButtonData;
            if (string.IsNullOrEmpty(text)) text = GeometryData;
            if (string.IsNullOrEmpty(text)) text = Xaml;
            if (string.IsNullOrEmpty(text)) return;
            try
            {
                Clipboard.SetText(text);
                RaiseXamlCopied();
            }
            catch
            {
                // 剪貼簿被其他程式鎖定時忽略
            }
        }

        public override bool HasXaml => true;
        public override bool HasSvg => true;

        public string Svg => SvgData?.Svg;

        public string Xaml => SvgData?.Xaml;

        public string GeometryData => SvgData?.GeometryData;

        public string ButtonData => SvgData?.ButtonData;

        public bool IsComplexSvg => SvgData?.IsComplex ?? false;


        public ConvertedSvgData SvgData
        {
            get
            {
                if (_convertedSvgData == null)
                {
                    try
                    {
                        _convertedSvgData = ConverterLogic.ConvertSvg(Filepath, ResultMode.DrawingImage);
                    }
                    catch (Exception)
                    {
                        return null;
                    }
                    
                    //verzögertes Laden: ist scheiß lahm
                    //InUi(DispatcherPriority.Loaded, () =>
                    //{
                    //    _convertedSvgData = ConverterLogic.ConvertSvg(_filepath, ResultMode.DrawingImage);
                    //    OnPropertyChanged("");
                    //});
                    //return null;
                }
                return _convertedSvgData;
            }
        }
    }
}
