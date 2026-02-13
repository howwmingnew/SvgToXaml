using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows;
using System.Windows.Media;
using System.Xml;
using System.Xml.Linq;
using System.Xml.XPath;
using SharpVectors.Converters;
using SharpVectors.Renderers.Wpf;

namespace SvgConverter
{
    public enum ResultMode
    {
        DrawingGroup,
        DrawingImage
    }

    public class GeometryEntry
    {
        public string Data { get; set; }
        public string GeometryType { get; set; }  // "inline", "EllipseGeometry", "RectangleGeometry"
        public Dictionary<string, string> GeometryAttrs { get; set; } = new Dictionary<string, string>();

        public string Fill { get; set; }
        public string Stroke { get; set; }
        public string StrokeThickness { get; set; }
        public string StrokeStartLineCap { get; set; }
        public string StrokeEndLineCap { get; set; }
        public string StrokeLineJoin { get; set; }
        public string StrokeMiterLimit { get; set; }
    }

    public class GeometryResult
    {
        public List<GeometryEntry> Entries { get; set; } = new List<GeometryEntry>();
        public bool IsComplex { get; set; }
        public double Width { get; set; } = 20;
        public double Height { get; set; } = 20;
    }

    public static class ConverterLogic
    {
        private const char CPrefixSeparator = '_';

        static ConverterLogic()
        {
            //bringt leider nix? _nsManager.AddNamespace("", "http://schemas.microsoft.com/winfx/2006/xaml/presentation");
            NsManager.AddNamespace("defns", "http://schemas.microsoft.com/winfx/2006/xaml/presentation");
            NsManager.AddNamespace("x", "http://schemas.microsoft.com/winfx/2006/xaml");
        }

        internal static XNamespace Nsx = "http://schemas.microsoft.com/winfx/2006/xaml";
        internal static XNamespace NsDef = "http://schemas.microsoft.com/winfx/2006/xaml/presentation";
        internal static XmlNamespaceManager NsManager = new XmlNamespaceManager(new NameTable());

        public static string SvgFileToXaml(string filepath, ResultMode resultMode, ResKeyInfo resKeyInfo,
            bool filterPixelsPerDip, WpfDrawingSettings wpfDrawingSettings = null)
        {
            var obj = ConvertSvgToObject(filepath, resultMode, wpfDrawingSettings, out var name, resKeyInfo);
            return SvgObjectToXaml(obj, wpfDrawingSettings != null && wpfDrawingSettings.IncludeRuntime, name, filterPixelsPerDip);
        }

        public static ConvertedSvgData ConvertSvg(string filepath, ResultMode resultMode)
        {
            //Lazy Loading: all these elements are loaded if someone accesses the getter
            //string name;
            //var obj = ConvertSvgToObject(filepath, resultMode, null, out name) as DependencyObject;
            //var xaml = SvgObjectToXaml(obj, false, name);
            //var svg = File.ReadAllText(filepath);
           
            return new ConvertedSvgData { Filepath = filepath
            //, ConvertedObj = obj, Svg = svg, Xaml = xaml 
            };
        }

        public static object ConvertSvgToObject(string filepath, ResultMode resultMode, WpfDrawingSettings wpfDrawingSettings, out string name, ResKeyInfo resKeyInfo)
        {
            var dg = ConvertFileToDrawingGroup(filepath, wpfDrawingSettings);
            var elementName = Path.GetFileNameWithoutExtension(filepath);
            switch (resultMode)
            {
                case ResultMode.DrawingGroup:
                    name = BuildDrawingGroupName(elementName, resKeyInfo);
                    return dg;
                case ResultMode.DrawingImage:
                    name = BuildDrawingImageName(elementName, resKeyInfo);
                    return DrawingToImage(dg);
                default:
                    throw new ArgumentOutOfRangeException(nameof(resultMode));
            }
        }

        public static string SvgObjectToXaml(object obj, bool includeRuntime, string name, bool filterPixelsPerDip)
        {
            var xamlUntidy = WpfObjToXaml(obj, includeRuntime);

            var doc = XDocument.Parse(xamlUntidy);
            BeautifyDrawingElement(doc.Root, name);
            if (filterPixelsPerDip)
                FilterPixelsPerDip(doc.Root);
            var xamlWithNamespaces = doc.ToString();

            var xamlClean = RemoveNamespaceDeclarations(xamlWithNamespaces);
            return xamlClean;
        }

        public static string SvgDirToXaml(string folder, ResKeyInfo resKeyInfo, bool filterPixelsPerDip)
        {
            return SvgDirToXaml(folder, resKeyInfo, null, filterPixelsPerDip);
        }

        public static string SvgDirToXaml(string folder, ResKeyInfo resKeyInfo, WpfDrawingSettings wpfDrawingSettings,
            bool filterPixelsPerDip, bool handleSubFolders = false)
        {
            //firstChar Upper
            var firstChar = char.ToUpperInvariant(resKeyInfo.XamlName[0]);
            resKeyInfo.XamlName = firstChar + resKeyInfo.XamlName.Remove(0, 1);


            var files = SvgFilesFromFolder(folder, handleSubFolders);
            var dict = ConvertFilesToResourceDictionary(files, wpfDrawingSettings, resKeyInfo);
            var xamlUntidy = WpfObjToXaml(dict, wpfDrawingSettings?.IncludeRuntime ?? false);

            var doc = XDocument.Parse(xamlUntidy);
            RemoveResDictEntries(doc.Root);
            var drawingGroupElements = doc.Root.XPathSelectElements("defns:DrawingGroup", NsManager).ToList();
            foreach (var drawingGroupElement in drawingGroupElements)
            {
                BeautifyDrawingElement(drawingGroupElement, null);
                if (filterPixelsPerDip)
                    FilterPixelsPerDip(drawingGroupElement);

                ExtractGeometries(drawingGroupElement, resKeyInfo);
            }

            AddNameSpaceDef(doc.Root, resKeyInfo);
            //ReplaceBrushesInDrawingGroups(doc.Root, resKeyInfo);
            AddDrawingImagesToDrawingGroups(doc.Root);
            return doc.ToString();
        }

        public static IEnumerable<string> SvgFilesFromFolder(string folder, bool handleSubFolders = false)
        {
            try
            {
                if (handleSubFolders)
                {
                    return Directory.GetFiles(folder, "*.svg*", SearchOption.AllDirectories);
                }
                return Directory.GetFiles(folder, "*.svg*");
            }
            catch
            {
                return Enumerable.Empty<string>();
            }
        }

        private static void AddNameSpaceDef(XElement root, ResKeyInfo resKeyInfo)
        {
            if (resKeyInfo.UseComponentResKeys)
            {
                root.Add(new XAttribute(XNamespace.Xmlns + resKeyInfo.NameSpaceName, "clr-namespace:" + resKeyInfo.NameSpace));
            }
        }

        /// <summary>
        /// This one uses local and global colors
        /// </summary>
        /// <param name="rootElement"></param>
        /// <param name="resKeyInfo"></param>
        private static void ReplaceBrushesInDrawingGroupsOld(XElement rootElement, ResKeyInfo resKeyInfo)
        {
            //three steps of colouring: 1. global Color, 2, global ColorBrush, 3. local ColorBrush
            //<Color x:Key="ImagesColor1">#FF000000</Color>
            //<SolidColorBrush x:Key="ImagesColorBrush1" Color="{DynamicResource ImagesColor1}" />
            //<SolidColorBrush x:Key="JOG_BrushColor1" Color="{Binding Color, Source={StaticResource ImagesColorBrush1}}" />

            var allBrushes = CollectBrushAttributesWithColor(rootElement)
                .Select(a => a.Value)
                .Distinct(StringComparer.InvariantCultureIgnoreCase) //same Color only once
                .Select((s, i) => new
                {
                    ResKey1 = BuildColorName(i+1, resKeyInfo), 
                    ResKey2 = BuildColorBrushName(i + 1, resKeyInfo), 
                    Color = s
                }) //add numbers
                .ToList();

            //building global Elements like: <SolidColorBrush x:Key="ImagesColorBrush1" Color="{DynamicResource ImagesColor1}" />
            rootElement.AddFirst(allBrushes
                .Select(brush => new XElement(NsDef + "SolidColorBrush", 
                    new XAttribute(Nsx + "Key", brush.ResKey2),
                    new XAttribute("Color", $"{{DynamicResource {brush.ResKey1}}}"))));

            //building global Elements like: <Color x:Key="ImagesColor1">#FF000000</Color>
            rootElement.AddFirst(allBrushes
                .Select(brush => new XElement(NsDef + "Color", 
                    new XAttribute(Nsx + "Key", brush.ResKey1),
                    brush.Color)));

            var colorKeys = allBrushes.ToDictionary(brush => brush.Color, brush => brush.ResKey2);

            //building local Elements
            var drawingGroups = rootElement.Elements(NsDef + "DrawingGroup").ToList();
            foreach (var node in drawingGroups)
            {
                //get Name of DrawingGroup
                var keyDg = node.Attribute(Nsx + "Key").Value;
                var elemName = GetElemNameFromResKey(keyDg, resKeyInfo);
                var elemBaseName = elemName.Replace("DrawingGroup", "");
                
                var brushAttributes = CollectBrushAttributesWithColor(node).ToList();
                
                foreach (var brushAttribute in brushAttributes)
                {
                    var color = brushAttribute.Value;
                    string resKeyColor;
                    if (colorKeys.TryGetValue(color, out resKeyColor))
                    {   //global color found
                        
                        //build resourcename
                        var nameBrush = brushAttributes.Count > 1
                            ? $"{elemBaseName}Color{brushAttributes.IndexOf(brushAttribute) + 1}Brush"
                            : $"{elemBaseName}ColorBrush"; //dont add number if only one color
                        var resKeyBrush = BuildResKey(nameBrush, resKeyInfo);
                        node.AddBeforeSelf(new XElement(NsDef + "SolidColorBrush", 
                            new XAttribute(Nsx + "Key", resKeyBrush), 
                            new XAttribute("Color", $"{{Binding Color, Source={BuildResKeyReference(resKeyColor, false)}}}") ));
                        //set brush value as Reference
                        //  <GeometryDrawing Brush="{DynamicResource {x:Static nsname:Test.cloud-3-iconBrushColor}}" ... />
                        brushAttribute.Value = BuildResKeyReference(resKeyBrush, true);
                    }
                }
            }
        }

        private static void ReplaceBrushesInDrawingGroups(XElement rootElement, ResKeyInfo resKeyInfo)
        {
            //building local Elements
            var drawingGroups = rootElement.Elements(NsDef + "DrawingGroup").ToList();
            foreach (var node in drawingGroups)
            {
                var brushAttributes = CollectBrushAttributesWithColor(node).ToList();
                
                foreach (var brushAttribute in brushAttributes)
                {
                    var color = brushAttribute.Value;
                    var index = brushAttributes.IndexOf(brushAttribute);
                    brushAttribute.Value =
                        $"{{Binding Path=(brushes:Props.ContentBrushes)[{index}], RelativeSource={{RelativeSource AncestorType=Visual}}, FallbackValue={color}}}";
                }
            }

        }

        private static IEnumerable<XAttribute> CollectBrushAttributesWithColor(XElement drawingElement)
        {
            return drawingElement.Descendants()
                .SelectMany(d => d.Attributes())
                .Where(a => a.Name.LocalName == "Brush" || a.Name.LocalName == "ForegroundBrush")
                .Where(a => a.Value.StartsWith("#", StringComparison.InvariantCulture)); //is Color like #FF000000
        }

        private static void AddDrawingImagesToDrawingGroups(XElement rootElement)
        {
            var drawingGroups = rootElement.Elements(NsDef + "DrawingGroup").ToList();
            foreach (var node in drawingGroups)
            {
                //get Name of DrawingGroup
                var nameDg = node.Attribute(Nsx + "Key").Value;
                var nameImg = nameDg.Replace("DrawingGroup", "DrawingImage");
                //<DrawingImage x:Key="xxx" Drawing="{StaticResource cloud_5_icon_DrawingGroup}"/>
                var drawingImage = new XElement(NsDef + "DrawingImage",
                    new XAttribute(Nsx + "Key", nameImg),
                    new XAttribute("Drawing", string.Format(CultureInfo.InvariantCulture, "{{StaticResource {0}}}", nameDg))
                    );
                node.AddAfterSelf(drawingImage);
            }
        }

        internal static ResourceDictionary ConvertFilesToResourceDictionary(IEnumerable<string> files, WpfDrawingSettings wpfDrawingSettings, ResKeyInfo resKeyInfo)
        {
            var dict = new ResourceDictionary();
            foreach (var file in files)
            {
                var drawingGroup = ConvertFileToDrawingGroup(file, wpfDrawingSettings);
                var elementName = Path.GetFileNameWithoutExtension(file);
                var keyDg = BuildDrawingGroupName(elementName, resKeyInfo);
                dict[keyDg] = drawingGroup;
            }
            return dict;
        }

        // 用來標記注入的 viewBox 背景矩形的顏色（轉換後會改成 Transparent）
        private const string ViewBoxMarkerFill = "#F0F1F2";
        private static readonly Color ViewBoxMarkerColor = Color.FromRgb(0xF0, 0xF1, 0xF2);

        private static DrawingGroup ConvertFileToDrawingGroup(string filepath, WpfDrawingSettings wpfDrawingSettings)
        {
            var dg = SvgFileToWpfObject(filepath, wpfDrawingSettings);
            SetSizeToGeometries(dg);
            RemoveObjectNames(dg);
            MakeViewBoxRectTransparent(dg);
            return dg;
        }

        /// <summary>
        /// 轉換後找到注入的 viewBox 灰色矩形，把 Brush 改成 Transparent
        /// </summary>
        private static void MakeViewBoxRectTransparent(DrawingGroup dg)
        {
            MakeViewBoxRectTransparentRecursive(dg);
        }

        private static bool MakeViewBoxRectTransparentRecursive(DrawingGroup dg)
        {
            foreach (var child in dg.Children)
            {
                if (child is GeometryDrawing gd)
                {
                    var brush = gd.Brush as SolidColorBrush;
                    if (brush != null && brush.Color == ViewBoxMarkerColor)
                    {
                        gd.Brush = Brushes.Transparent;
                        return true;
                    }
                }
                if (child is DrawingGroup subDg)
                {
                    if (MakeViewBoxRectTransparentRecursive(subDg))
                        return true;
                }
            }
            return false;
        }

        /// <summary>
        /// 從 DrawingGroup 提取 Geometry + Pen/Brush 資訊，產生 Viewbox+Path 格式
        /// </summary>
        public static GeometryResult ExtractGeometryData(DrawingGroup dg)
        {
            var xamlUntidy = WpfObjToXaml(dg, false);
            var doc = XDocument.Parse(xamlUntidy);
            BeautifyDrawingElement(doc.Root, null);

            // 從 ClipGeometry 解析尺寸
            double width = 20, height = 20;
            foreach (var dgElem in doc.Root.DescendantsAndSelf(NsDef + "DrawingGroup"))
            {
                var clip = dgElem.Attribute("ClipGeometry");
                if (clip != null)
                {
                    ParseClipGeometrySize(clip.Value, out width, out height);
                    break;
                }
            }

            var geoDrawings = doc.Root.DescendantsAndSelf(NsDef + "GeometryDrawing").ToList();
            var entries = new List<GeometryEntry>();
            bool isComplex = false;

            foreach (var gd in geoDrawings)
            {
                var entry = ParseGeometryDrawing(gd, ref isComplex);
                if (entry != null)
                    entries.Add(entry);
            }

            // 檢查是否含漸層 brush
            if (doc.Root.Descendants().Any(e =>
                e.Name.LocalName == "LinearGradientBrush" ||
                e.Name.LocalName == "RadialGradientBrush"))
                isComplex = true;

            return new GeometryResult
            {
                Entries = entries,
                IsComplex = isComplex,
                Width = width,
                Height = height
            };
        }

        /// <summary>
        /// 從 ClipGeometry 字串解析寬高，例如 "M0,0 V20 H20 V0 H0 Z"
        /// </summary>
        private static void ParseClipGeometrySize(string clipGeo, out double width, out double height)
        {
            width = 20; height = 20;
            var vMatch = Regex.Match(clipGeo, @"V([\d.]+)");
            var hMatch = Regex.Match(clipGeo, @"H([\d.]+)");
            if (vMatch.Success && hMatch.Success)
            {
                double.TryParse(hMatch.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out width);
                double.TryParse(vMatch.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out height);
                return;
            }
            var rectMatches = Regex.Matches(clipGeo, @"([\d.]+),([\d.]+)");
            if (rectMatches.Count >= 3)
            {
                var xs = new List<double>();
                var ys = new List<double>();
                foreach (Match m in rectMatches)
                {
                    double x, y;
                    if (double.TryParse(m.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out x))
                        xs.Add(x);
                    if (double.TryParse(m.Groups[2].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out y))
                        ys.Add(y);
                }
                if (xs.Count > 0) width = xs.Max();
                if (ys.Count > 0) height = ys.Max();
            }
        }

        /// <summary>
        /// 解析單一 GeometryDrawing 元素，擷取 Geometry、Brush、Pen 完整資訊
        /// </summary>
        private static GeometryEntry ParseGeometryDrawing(XElement gd, ref bool isComplex)
        {
            var entry = new GeometryEntry();
            var brushAttr = gd.Attribute("Brush");

            // 跳過 viewBox 標記矩形（Transparent）
            if (brushAttr != null &&
                (brushAttr.Value == "Transparent" ||
                 brushAttr.Value.StartsWith("#00", StringComparison.OrdinalIgnoreCase)))
                return null;

            // --- 解析 Geometry ---
            var geoAttr = gd.Attribute("Geometry");
            if (geoAttr != null)
            {
                entry.Data = CleanGeometryString(geoAttr.Value);
                entry.GeometryType = "inline";
            }

            var geoChild = gd.Elements().FirstOrDefault(e => e.Name.LocalName == "GeometryDrawing.Geometry");
            if (geoChild != null)
            {
                foreach (var geo in geoChild.Elements())
                {
                    var geoTag = geo.Name.LocalName;
                    if (geoTag == "EllipseGeometry")
                    {
                        entry.GeometryType = "EllipseGeometry";
                        entry.GeometryAttrs = geo.Attributes().ToDictionary(a => a.Name.LocalName, a => a.Value);
                    }
                    else if (geoTag == "RectangleGeometry")
                    {
                        entry.GeometryType = "RectangleGeometry";
                        entry.GeometryAttrs = geo.Attributes().ToDictionary(a => a.Name.LocalName, a => a.Value);
                    }
                    else if (geoTag == "LineGeometry")
                    {
                        var sp = geo.Attribute("StartPoint")?.Value ?? "0,0";
                        var ep = geo.Attribute("EndPoint")?.Value ?? "0,0";
                        entry.Data = string.Format("M{0} L{1}", sp, ep);
                        entry.GeometryType = "inline";
                    }
                    else if (geoTag == "PathGeometry")
                    {
                        var figuresAttr = geo.Attribute("Figures");
                        if (figuresAttr != null)
                        {
                            entry.Data = CleanGeometryString(figuresAttr.Value);
                            entry.GeometryType = "inline";
                        }
                    }
                }
            }

            // --- 解析 Brush (Fill) ---
            if (brushAttr != null)
                entry.Fill = brushAttr.Value;

            var brushChild = gd.Elements().FirstOrDefault(e => e.Name.LocalName == "GeometryDrawing.Brush");
            if (brushChild != null)
            {
                var solidBrush = brushChild.Elements().FirstOrDefault(e => e.Name.LocalName == "SolidColorBrush");
                if (solidBrush != null)
                    entry.Fill = solidBrush.Attribute("Color")?.Value;
                if (brushChild.Elements().Any(e =>
                    e.Name.LocalName == "LinearGradientBrush" ||
                    e.Name.LocalName == "RadialGradientBrush"))
                    isComplex = true;
            }

            // --- 解析 Pen (Stroke) ---
            var penChild = gd.Elements().FirstOrDefault(e => e.Name.LocalName == "GeometryDrawing.Pen");
            if (penChild != null)
            {
                var pen = penChild.Elements().FirstOrDefault(e => e.Name.LocalName == "Pen");
                if (pen != null)
                {
                    entry.Stroke = pen.Attribute("Brush")?.Value;
                    entry.StrokeThickness = pen.Attribute("Thickness")?.Value;
                    entry.StrokeStartLineCap = pen.Attribute("StartLineCap")?.Value;
                    entry.StrokeEndLineCap = pen.Attribute("EndLineCap")?.Value;
                    entry.StrokeLineJoin = pen.Attribute("LineJoin")?.Value;
                    entry.StrokeMiterLimit = pen.Attribute("MiterLimit")?.Value;
                }
            }

            // 必須有 geometry 資料
            if (entry.Data == null && entry.GeometryType == null)
                return null;

            return entry;
        }

        /// <summary>
        /// 產生資源 key 名稱，自動偵測顏色和形狀提示
        /// </summary>
        public static string GenerateResourceKey(string baseName, int index, GeometryEntry entry)
        {
            var color = (entry.Stroke ?? entry.Fill ?? "").ToLowerInvariant();
            var colorHint = "";
            var colorMap = new Dictionary<string, string[]>
            {
                { "Red", new[] { "#ff0000", "#ffff0000", "red" } },
                { "Green", new[] { "#00ff00", "#ff00ff00", "#00d400", "#ff00d400", "green" } },
                { "Blue", new[] { "#198cff", "#ff198cff", "#0000ff", "#ff0000ff", "blue" } },
                { "Yellow", new[] { "#ffff00", "#ffffff00", "yellow" } },
                { "White", new[] { "#ffffff", "#ffffffff", "white" } },
                { "Black", new[] { "#000000", "#ff000000", "black" } },
            };
            foreach (var kvp in colorMap)
            {
                if (kvp.Value.Any(p => string.Equals(p, color, StringComparison.OrdinalIgnoreCase)))
                {
                    colorHint = "_" + kvp.Key;
                    break;
                }
            }

            var geoHint = "";
            if (entry.GeometryType == "EllipseGeometry")
            {
                geoHint = "_Circle";
            }
            else if (entry.Data != null)
            {
                var points = Regex.Matches(entry.Data, @"([\d.]+),([\d.]+)");
                if (points.Count == 2)
                {
                    double x1, y1, x2, y2;
                    if (double.TryParse(points[0].Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out x1) &&
                        double.TryParse(points[0].Groups[2].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out y1) &&
                        double.TryParse(points[1].Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out x2) &&
                        double.TryParse(points[1].Groups[2].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out y2))
                    {
                        if (Math.Abs(x1 - x2) < 0.1) geoHint = "_VLine";
                        else if (Math.Abs(y1 - y2) < 0.1) geoHint = "_HLine";
                        else geoHint = "_Line";
                    }
                }
            }

            if (colorHint.Length > 0 || geoHint.Length > 0)
                return baseName + colorHint + geoHint;
            return baseName + "_Part" + (index + 1);
        }

        /// <summary>
        /// 清理 Geometry 字串：移除 FillRule 前綴和定位用退化圖形
        /// </summary>
        private static string CleanGeometryString(string geo)
        {
            geo = geo.Trim();
            geo = Regex.Replace(geo, @"^F[01]\s+", "");
            geo = Regex.Replace(geo, @"M[\d.\-]+,[\d.\-]+z\s*", "");
            return geo.Trim();
        }

        internal static void SetSizeToGeometries(DrawingGroup dg)
        {
            var size = GetSizeFromDrawingGroup(dg);
            if (size.HasValue)
            {
                var geometries = GetPathGeometries(dg).ToList();
                geometries.ForEach(g => SizeGeometry(g, size.Value));
            }
        }

        public static IEnumerable<PathGeometry> GetPathGeometries(Drawing drawing)
        {
            var result = new List<PathGeometry>();

            Action<Drawing> handleDrawing = null;
            handleDrawing = aDrawing =>
            {
                if (aDrawing is DrawingGroup)
                    foreach (Drawing d in ((DrawingGroup)aDrawing).Children)
                    {
                        handleDrawing(d);
                    }
                if (aDrawing is GeometryDrawing)
                {
                    var gd = (GeometryDrawing)aDrawing;
                    Geometry geometry = gd.Geometry;
                    if (geometry is PathGeometry)
                    {
                        result.Add((PathGeometry)geometry);
                    }
                }
            };
            handleDrawing(drawing);

            return result;
        }

        public static void SizeGeometry(PathGeometry pg, Size size)
        {
            if (size.Height > 0 && size.Height > 0)
            {
                PathFigure[] sizeFigures =
                {
                    new PathFigure(new Point(size.Width, size.Height), Enumerable.Empty<PathSegment>(), true),
                    new PathFigure(new Point(0,0), Enumerable.Empty<PathSegment>(), true),
                };

                var newGeo = new PathGeometry(sizeFigures.Concat(pg.Figures), pg.FillRule, null);//pg.Transform do not add transform here, it will recalculate all the Points
                pg.Clear();
                pg.AddGeometry(newGeo);
                //return new PathGeometry(sizeFigures.Concat(pg.Figures), pg.FillRule, pg.Transform);
            }
        }

        internal static DrawingGroup SvgFileToWpfObject(string filepath, WpfDrawingSettings wpfDrawingSettings)
        {
            if (wpfDrawingSettings == null) //use defaults if null
                wpfDrawingSettings = new WpfDrawingSettings { IncludeRuntime = false, TextAsGeometry = false, OptimizePath = true };
            var reader = new FileSvgReader(wpfDrawingSettings);

            //this is straight forward, but in this version of the dlls there is an error when name starts with a digit
            //var uri = new Uri(Path.GetFullPath(filepath));
            //reader.Read(uri); //accessing using the filename results is problems with the uri (if the dlls are packed in ressources)
            //return reader.Drawing;

            //this should be faster, but using CreateReader will loose text items like "JOG" ?!
            //using (var stream = File.OpenRead(Path.GetFullPath(filepath)))
            //{
            //    //workaround: error when Id starts with a number
            //    var doc = XDocument.Load(stream);
            //    ReplaceIdsWithNumbers(doc.Root); //id="3d-view-icon" -> id="_3d-view-icon"
            //    using (var xmlReader = doc.CreateReader())
            //    {
            //        reader.Read(xmlReader);
            //        return reader.Drawing;
            //    }
            //}

            filepath = Path.GetFullPath(filepath);
            Stream stream = IsSvgz(filepath)
                ? (Stream)new GZipStream(File.OpenRead(filepath), CompressionMode.Decompress, false)
                : File.OpenRead(filepath);
            var doc = XDocument.Load(stream);
            stream.Dispose();

            //workaround: error when Id starts with a number
            FixIds(doc.Root); //id="3d-view-icon" -> id="_3d-view-icon"
            InjectViewBoxRect(doc.Root);
            using (var ms = new MemoryStream())
            {
                doc.Save(ms);
                ms.Position = 0;
                reader.Read(ms);
                return reader.Drawing;
            }
        }

        private static bool IsSvgz(string filepath)
        {
            return string.Equals(Path.GetExtension(filepath), ".svgz", StringComparison.OrdinalIgnoreCase);
        }

        private static void FixIds(XElement root)
        {
            var idAttributesStartingWithDigit = root.DescendantsAndSelf()
                .SelectMany(d=>d.Attributes())
                .Where(a=>string.Equals(a.Name.LocalName, "Id", StringComparison.InvariantCultureIgnoreCase));
            foreach (var attr in idAttributesStartingWithDigit)
            {
                if (char.IsDigit(attr.Value.FirstOrDefault()))
                {
                    attr.Value = "_" + attr.Value;
                }

                attr.Value = attr.Value.Replace("/", "_");
            }
        }

        /// <summary>
        /// 在 SVG 最底層注入一個滿版矩形（模擬 Illustrator 手動加底圖的做法）
        /// 這樣 SharpVectors 轉換時會保留完整的 viewBox 範圍
        /// 轉換後由 MakeViewBoxRectTransparent 把顏色改成 Transparent
        /// </summary>
        private static void InjectViewBoxRect(XElement root)
        {
            if (root == null) return;

            double x = 0, y = 0, w = 0, h = 0;
            var viewBoxAttr = root.Attribute("viewBox")?.Value;

            if (viewBoxAttr != null)
            {
                var parts = viewBoxAttr.Split(new[] { ' ', ',' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length != 4 ||
                    !double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out x) ||
                    !double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out y) ||
                    !double.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out w) ||
                    !double.TryParse(parts[3], NumberStyles.Float, CultureInfo.InvariantCulture, out h))
                    return;
            }
            else
            {
                // fallback：用 width/height 屬性
                var widthAttr = root.Attribute("width")?.Value;
                var heightAttr = root.Attribute("height")?.Value;
                if (widthAttr == null || heightAttr == null) return;

                var wStr = Regex.Replace(widthAttr, @"[^0-9.\-]", "");
                var hStr = Regex.Replace(heightAttr, @"[^0-9.\-]", "");
                if (!double.TryParse(wStr, NumberStyles.Float, CultureInfo.InvariantCulture, out w) ||
                    !double.TryParse(hStr, NumberStyles.Float, CultureInfo.InvariantCulture, out h))
                    return;
            }

            if (w <= 0 || h <= 0) return;

            var svgNs = root.GetDefaultNamespace();
            root.AddFirst(new XElement(svgNs + "rect",
                new XAttribute("x", x.ToString(CultureInfo.InvariantCulture)),
                new XAttribute("y", y.ToString(CultureInfo.InvariantCulture)),
                new XAttribute("width", w.ToString(CultureInfo.InvariantCulture)),
                new XAttribute("height", h.ToString(CultureInfo.InvariantCulture)),
                new XAttribute("fill", ViewBoxMarkerFill)
            ));
        }


        internal static DrawingImage DrawingToImage(Drawing drawing)
        {
            return new DrawingImage(drawing);
        }

        internal static string WpfObjToXaml(object wpfObject, bool includeRuntime)
        {
            XmlXamlWriter writer = new XmlXamlWriter(new WpfDrawingSettings { IncludeRuntime = includeRuntime});
            var xaml = writer.Save(wpfObject);
            return xaml;
        }

        internal static void RemoveResDictEntries(XElement root)
        {
            var entriesElem = root.Element(NsDef + "ResourceDictionary.Entries");
            if (entriesElem != null)
            {
                root.Add(entriesElem.Elements());
                entriesElem.Remove();
            }
        }

        private static void BeautifyDrawingElement(XElement drawingElement, string name)
        {
            InlineClipping(drawingElement);
            RemoveCascadedDrawingGroup(drawingElement);
            CollapsePathGeometries(drawingElement);
            SetDrawingElementxKey(drawingElement, name);
        }

        private static void InlineClipping(XElement drawingElement)
        {
            Rect clipRect;
            var clipElement = GetClipElement(drawingElement, out clipRect);
            if (clipElement != null && clipElement.Parent.Name.LocalName == "DrawingGroup")
            {   //add Attribute: ClipGeometry="M0,0 V40 H40 V0 H0 Z" this is the description of a rectangle-like Geometry
                clipElement.Parent.Add(new XAttribute("ClipGeometry", string.Format(CultureInfo.InvariantCulture, "M{0},{1} V{2} H{3} V{1} H{0} Z", clipRect.Left, clipRect.Top, clipRect.Bottom, clipRect.Right)));
                //delete the old Element
                clipElement.Remove();
            }
        }

        private static void RemoveCascadedDrawingGroup(XElement drawingElement)
        {
            //wenn eine DrawingGroup nix anderes wie eine andere DrawingGroup hat, werden deren Elemente eine Ebene hochgezogen und die überflüssige Group entfernt
            var drawingGroups = drawingElement.DescendantsAndSelf(NsDef + "DrawingGroup");
            foreach (var drawingGroup in drawingGroups)
            {
                var elems = drawingGroup.Elements().ToList();
                if (elems.Count == 1 && elems[0].Name.LocalName == "DrawingGroup")
                {
                    var subGroup = elems[0];

                    //var subElems = subGroup.Elements().ToList();
                    //subElems.Remove();
                    //drawingGroup.Add(subElems);
                    var subAttrNames = subGroup.Attributes().Select(a => a.Name);
                    var attrNames = drawingGroup.Attributes().Select(a => a.Name);
                    if (subAttrNames.Intersect(attrNames).Any())
                        return;
                    drawingGroup.Add(subGroup.Attributes());
                    drawingGroup.Add(subGroup.Elements());
                    subGroup.Remove();
                }
            }
        }

        private static void CollapsePathGeometries(XElement drawingElement)
        {
            //<DrawingGroup x:Name="cloud_3_icon_DrawingGroup" ClipGeometry="M0,0 V512 H512 V0 H0 Z">
            //  <GeometryDrawing Brush="#FF000000">
            //    <GeometryDrawing.Geometry>
            //      <PathGeometry FillRule="Nonzero" Figures="M512,512z M0,0z M409.338,216.254C398.922,161.293 z" />
            //    </GeometryDrawing.Geometry>
            //  </GeometryDrawing>
            //</DrawingGroup>

            //würde auch gehen:var pathGeometries = drawingElement.XPathSelectElements(".//defns:PathGeometry", _nsManager).ToArray();
            var pathGeometries = drawingElement.Descendants(NsDef + "PathGeometry").ToArray();
            foreach (var pathGeometry in pathGeometries)
            {
                if (pathGeometry.Parent != null && pathGeometry.Parent.Parent != null && pathGeometry.Parent.Parent.Name.LocalName == "GeometryDrawing")
                {
                    //check if only FillRule and Figures is available
                    var attrNames = pathGeometry.Attributes().Select(a => a.Name.LocalName).ToList();
                    if (attrNames.Count <= 2 && attrNames.Contains("Figures") && (attrNames.Contains("FillRule") || attrNames.Count == 1))
                    {
                        var sFigures = pathGeometry.Attribute("Figures").Value;
                        var fillRuleAttr = pathGeometry.Attribute("FillRule");
                        if (fillRuleAttr != null)
                        {
                            if (fillRuleAttr.Value == "Nonzero")
                                sFigures = "F1 " + sFigures; //Nonzero
                            else
                                sFigures = "F0 " + sFigures; //EvenOdd
                        }
                        pathGeometry.Parent.Parent.Add(new XAttribute("Geometry", sFigures));
                        pathGeometry.Parent.Remove();
                    }
                }
            }
        }

        private static void SetDrawingElementxKey(XElement drawingElement, string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return;
            var attributes = drawingElement.Attributes().ToList();
            attributes.Insert(0, new XAttribute(Nsx + "Key", name)); //place in first position
            drawingElement.ReplaceAttributes(attributes);
        }

        private static void FilterPixelsPerDip(XElement drawingElement)
        {
            var glyphRuns = drawingElement.Descendants(NsDef + nameof(GlyphRun)).ToList();
            foreach (var glyphRun in glyphRuns)
            {
                var pixelsPerDipAttr = glyphRun.Attribute(nameof(GlyphRun.PixelsPerDip));
                if (pixelsPerDipAttr != null)
                    pixelsPerDipAttr.Remove();
            }
        }

        private static void ExtractGeometries(XElement drawingGroupElement, ResKeyInfo resKeyInfo)
        {
            //get Name of DrawingGroup
            var nameDg = drawingGroupElement.Attribute(Nsx + "Key").Value;
            var name = nameDg.Replace("DrawingGroup", "");
            name = GetElemNameFromResKey(name, resKeyInfo);

            //find this: <GeometryDrawing Brush="{DynamicResource _3d_view_icon_BrushColor}" Geometry="F1 M512,512z M0,0z M436.631,207.445L436.631,298.319z" />
            //var geos = drawingGroupElement.XPathSelectElements(".//defns:GeometryDrawing/@defns:Geometry", _nsManager).ToList();
            var geos = drawingGroupElement.Descendants()
                .Where(e => e.Name.LocalName == "GeometryDrawing")
                .SelectMany(e => e.Attributes())
                .Where(a => a.Name.LocalName == "Geometry")
                .ToList();
            foreach (var geo in geos)
            {
                //build resourcename
                int? no = geos.Count > 1
                    ? geos.IndexOf(geo) + 1
                    : (int?)null;
                var localName = BuildGeometryName(name, no, resKeyInfo);
                //Add this: <Geometry x:Key="cloud_3_iconGeometry">F1 M512,512z M0,0z M409.338,216.254C398.922,351.523z</Geometry>
                drawingGroupElement.AddBeforeSelf(new XElement(NsDef+"Geometry",
                    new XAttribute(Nsx + "Key", localName),
                    geo.Value));
                geo.Value = BuildResKeyReference(localName, false);
            }
        }

        public static string RemoveNamespaceDeclarations(string xml)
        {
            //hier wird nur die Deklaration des NS rausgeschmissen (rein auf StringBasis), so dass man den Kram pasten kann
            xml = xml.Replace(" xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"", "");
            xml = xml.Replace(" xmlns:x=\"http://schemas.microsoft.com/winfx/2006/xaml\"", "");
            return xml;
        }

        public static void RemoveObjectNames(DrawingGroup drawingGroup)
        {
            if (drawingGroup.GetValue(FrameworkElement.NameProperty) != null)
                drawingGroup.SetValue(FrameworkElement.NameProperty, null);
            foreach (var child in drawingGroup.Children.OfType<DependencyObject>())
            {
                if (child.GetValue(FrameworkElement.NameProperty) != null)
                    child.SetValue(FrameworkElement.NameProperty, null);
                if (child is DrawingGroup)
                    RemoveObjectNames(child as DrawingGroup);
            }
        }

        internal static string BuildDrawingGroupName(string elementName, ResKeyInfo resKeyInfo)
        {
            var rawName = elementName + "DrawingGroup";
            return BuildResKey(rawName, resKeyInfo);
        }
        internal static string BuildDrawingImageName(string elementName, ResKeyInfo resKeyInfo)
        {
            var rawName = elementName + "DrawingImage";
            return BuildResKey(rawName, resKeyInfo);
        }

        internal static string BuildGeometryName(string name, int? no, ResKeyInfo resKeyInfo)
        {
            var rawName = no.HasValue
                ? $"{name}Geometry{no.Value}"
                : $"{name}Geometry"; //dont add number if only one Geometry
            return BuildResKey(rawName, resKeyInfo);
        }

        internal static string BuildColorName(int no, ResKeyInfo resKeyInfo)
        {
            var rawName = $"Color{no}";
            return BuildResKey(rawName, resKeyInfo);
        }
        internal static string BuildColorBrushName(int no, ResKeyInfo resKeyInfo)
        {
            var rawName = $"Color{no}Brush";
            return BuildResKey(rawName, resKeyInfo);
        }

        internal static string BuildResKey(string name, ResKeyInfo resKeyInfo)
        {
            if (resKeyInfo.UseComponentResKeys)
            {
                return $"{{x:Static {resKeyInfo.NameSpaceName}:{resKeyInfo.XamlName}.{ValidateName(name)}Key}}";
            }
            string result = name;
            if (resKeyInfo.Prefix != null)
                result = resKeyInfo.Prefix + CPrefixSeparator + name;
            result = ValidateName(result);
            return result;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="refName">ist der schon komplett fertige name mit prefix oder Reskey</param>
        /// <param name="dynamic"></param>
        /// <returns></returns>
        internal static string BuildResKeyReference(string refName, bool dynamic = false)
        {
            var resourceIdent = dynamic ? "DynamicResource" : "StaticResource";
            return $"{{{resourceIdent} {refName}}}";
        }

        internal static string GetElemNameFromResKey(string name, ResKeyInfo resKeyInfo)
        {
            if (resKeyInfo.UseComponentResKeys)
            {   //{x:Static NameSpaceName:XamlName.ElementName}
                var p1 = name.IndexOf(".", StringComparison.Ordinal);
                var p2 = name.LastIndexOf("}", StringComparison.Ordinal);
                string result;
                if (p1 < p2)
                    result = name.Substring(p1 + 1, p2 - p1 - 1);
                else
                    result = name;
                if (result.EndsWith("Key", StringComparison.InvariantCulture))
                    result = result.Substring(0, result.Length - 3);
                return result;
            }
            else
            {
                if (resKeyInfo.Prefix == null)
                    return name;
                var prefixWithSeparator = resKeyInfo.Prefix + CPrefixSeparator;
                if (name.StartsWith(resKeyInfo.Prefix + CPrefixSeparator, StringComparison.OrdinalIgnoreCase))
                    name = name.Remove(0, prefixWithSeparator.Length);
                return name;
            }
        }

        internal static string ValidateName(string name)
        {
            var result = Regex.Replace(name, @"[^[0-9a-zA-Z]]*", "_");
            if (Regex.IsMatch(result, "^[0-9].*"))
                result = "_" + result;
            return result;
        }

        internal static void SetRootElementname(DependencyObject drawingGroup, string name)
        {
            drawingGroup.SetValue(FrameworkElement.NameProperty, name);
        }

        internal static XElement GetClipElement(XElement drawingGroupElement, out Rect rect)
        {
            rect = default(Rect);
            if (drawingGroupElement == null)
                return null;
            //<DrawingGroup x:Key="cloud_3_icon_DrawingGroup">
            //   <DrawingGroup>
            //       <DrawingGroup.ClipGeometry>
            //           <RectangleGeometry Rect="0,0,512,512" />
            //       </DrawingGroup.ClipGeometry>
            var clipElement = drawingGroupElement.XPathSelectElement(".//defns:DrawingGroup.ClipGeometry", NsManager);
            if (clipElement != null)
            {
                var rectangleElement = clipElement.Element(NsDef + "RectangleGeometry");
                if (rectangleElement != null)
                {
                    var rectAttr = rectangleElement.Attribute("Rect");
                    if (rectAttr != null)
                    {
                        rect = Rect.Parse(rectAttr.Value);
                        return clipElement;
                    }
                }
            }
            return null;
        }

        internal static Size? GetSizeFromDrawingGroup(DrawingGroup drawingGroup)
        {
            //<DrawingGroup x:Key="cloud_3_icon_DrawingGroup">
            //   <DrawingGroup>
            //       <DrawingGroup.ClipGeometry>
            //           <RectangleGeometry Rect="0,0,512,512" />
            //       </DrawingGroup.ClipGeometry>
            if (drawingGroup != null)
            {
                var subGroup = drawingGroup.Children
                    .OfType<DrawingGroup>()
                    .FirstOrDefault(c => c.ClipGeometry != null);
                if (subGroup != null)
                {
                    return subGroup.ClipGeometry.Bounds.Size;
                }
            }
            return null;
        }
    }
}
