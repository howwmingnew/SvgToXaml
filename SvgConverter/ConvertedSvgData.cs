using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Media;

namespace SvgConverter
{
    public class ConvertedSvgData
    {
        private string _filepath;
        private string _xaml;
        private string _svg;
        private string _objectName;
        private DependencyObject _convertedObj;
        private GeometryResult _geometryResult;

        public string Filepath
        {
            get { return _filepath; }
            set { _filepath = value; }
        }

        public string Xaml
        {
            get { return _xaml ?? (_xaml = ConverterLogic.SvgObjectToXaml(ConvertedObj, false, _objectName, false)); }
            set { _xaml = value; }
        }

        public string Svg
        {
            get { return _svg ?? (_svg = File.ReadAllText(_filepath)); }
            set { _svg = value; }
        }

        public DependencyObject ConvertedObj
        {
            get
            {
                if (_convertedObj == null)
                {
                    _convertedObj = ConverterLogic.ConvertSvgToObject(_filepath, ResultMode.DrawingImage, null, out _objectName, new ResKeyInfo()) as DependencyObject;
                }
                return _convertedObj;
            }
            set { _convertedObj = value; }
        }

        private GeometryResult GetGeometryResult()
        {
            if (_geometryResult == null)
            {
                var di = ConvertedObj as DrawingImage;
                var dg = di?.Drawing as DrawingGroup;
                _geometryResult = dg != null
                    ? ConverterLogic.ExtractGeometryData(dg)
                    : new GeometryResult { IsComplex = true };
            }
            return _geometryResult;
        }

        public string GeometryData
        {
            get
            {
                var result = GetGeometryResult();
                var entries = result.Entries;
                if (entries == null || entries.Count == 0) return null;

                var elementName = Path.GetFileNameWithoutExtension(_filepath);
                var baseName = ConverterLogic.ValidateName(elementName);

                var lines = new List<string>();
                var geoKeys = new List<string>();
                var brushMap = new Dictionary<string, string>(System.StringComparer.OrdinalIgnoreCase);
                var usedGeoKeys = new HashSet<string>();

                lines.Add(string.Format("<!--{0} Start-->", baseName));

                for (int i = 0; i < entries.Count; i++)
                {
                    var entry = entries[i];
                    var keyName = ConverterLogic.GenerateResourceKey(baseName, i, entry);
                    var geoKey = keyName + "_Geo";

                    // 避免重複 key
                    if (usedGeoKeys.Contains(geoKey))
                    {
                        int counter = 2;
                        while (usedGeoKeys.Contains(geoKey + counter)) counter++;
                        geoKey = geoKey + counter;
                    }
                    usedGeoKeys.Add(geoKey);

                    if (entry.GeometryType == "EllipseGeometry")
                    {
                        string center, rx, ry;
                        if (!entry.GeometryAttrs.TryGetValue("Center", out center)) center = "0,0";
                        if (!entry.GeometryAttrs.TryGetValue("RadiusX", out rx)) rx = "1";
                        if (!entry.GeometryAttrs.TryGetValue("RadiusY", out ry)) ry = "1";
                        lines.Add(string.Format("<EllipseGeometry x:Key=\"{0}\" Center=\"{1}\" RadiusX=\"{2}\" RadiusY=\"{3}\" />",
                            geoKey, center, rx, ry));
                    }
                    else if (entry.GeometryType == "RectangleGeometry")
                    {
                        string rect;
                        if (!entry.GeometryAttrs.TryGetValue("Rect", out rect)) rect = "0,0,1,1";
                        lines.Add(string.Format("<RectangleGeometry x:Key=\"{0}\" Rect=\"{1}\" />", geoKey, rect));
                    }
                    else if (entry.Data != null)
                    {
                        lines.Add(string.Format("<Geometry x:Key=\"{0}\">{1}</Geometry>", geoKey, entry.Data));
                    }

                    geoKeys.Add(geoKey);

                    // 收集 Brush 顏色
                    CollectBrush(entry.Stroke, keyName, brushMap);
                    CollectBrush(entry.Fill, keyName, brushMap);
                }

                // --- Brush 資源 ---
                foreach (var kvp in brushMap)
                {
                    lines.Add(string.Format("<SolidColorBrush x:Key=\"{0}\" Color=\"{1}\" />", kvp.Value, kvp.Key));
                }

                // --- Style ---
                var w = result.Width == (int)result.Width
                    ? ((int)result.Width).ToString()
                    : result.Width.ToString(CultureInfo.InvariantCulture);
                var h = result.Height == (int)result.Height
                    ? ((int)result.Height).ToString()
                    : result.Height.ToString(CultureInfo.InvariantCulture);

                var p = "                            ";  // 28 spaces for Path attrs indent
                lines.Add(string.Format("<Style x:Key=\"{0}\" TargetType=\"ContentControl\">", baseName));
                lines.Add("    <Setter Property=\"Template\">");
                lines.Add("        <Setter.Value>");
                lines.Add("            <ControlTemplate TargetType=\"ContentControl\">");
                lines.Add("                <Border>");
                lines.Add("                    <Viewbox Stretch=\"Uniform\">");
                lines.Add(string.Format("                        <Grid Width=\"{0}\" Height=\"{1}\">", w, h));

                for (int i = 0; i < entries.Count; i++)
                {
                    var entry = entries[i];
                    var geoKey = geoKeys[i];
                    var attrs = new List<string>();

                    attrs.Add(string.Format("Data=\"{{StaticResource {0}}}\"", geoKey));

                    if (entry.Fill != null)
                        attrs.Add(string.Format("Fill=\"{{StaticResource {0}}}\"", brushMap[entry.Fill]));
                    if (entry.Stroke != null)
                        attrs.Add(string.Format("Stroke=\"{{StaticResource {0}}}\"", brushMap[entry.Stroke]));
                    if (entry.StrokeEndLineCap != null)
                        attrs.Add(string.Format("StrokeEndLineCap=\"{0}\"", entry.StrokeEndLineCap));
                    if (entry.StrokeLineJoin != null)
                        attrs.Add(string.Format("StrokeLineJoin=\"{0}\"", entry.StrokeLineJoin));
                    if (entry.StrokeMiterLimit != null)
                        attrs.Add(string.Format("StrokeMiterLimit=\"{0}\"", entry.StrokeMiterLimit));
                    if (entry.StrokeStartLineCap != null)
                        attrs.Add(string.Format("StrokeStartLineCap=\"{0}\"", entry.StrokeStartLineCap));
                    if (entry.StrokeThickness != null)
                        attrs.Add(string.Format("StrokeThickness=\"{0}\"", entry.StrokeThickness));

                    lines.Add(p + "<Path");
                    for (int j = 0; j < attrs.Count; j++)
                    {
                        var end = j == attrs.Count - 1 ? " />" : "";
                        lines.Add(p + "    " + attrs[j] + end);
                    }
                }

                lines.Add("                        </Grid>");
                lines.Add("                    </Viewbox>");
                lines.Add("                </Border>");
                lines.Add("            </ControlTemplate>");
                lines.Add("        </Setter.Value>");
                lines.Add("    </Setter>");
                lines.Add("</Style>");

                return string.Join("\n", lines);
            }
        }

        private static void CollectBrush(string color, string keyName, Dictionary<string, string> brushMap)
        {
            if (color == null || brushMap.ContainsKey(color)) return;
            var brushName = keyName + "_Brush";
            // 避免重複 brush key name
            if (brushMap.Values.Contains(brushName))
            {
                int counter = 2;
                while (brushMap.Values.Contains(brushName + counter)) counter++;
                brushName = brushName + counter;
            }
            brushMap[color] = brushName;
        }

        public bool IsComplex => GetGeometryResult().IsComplex;
    }
}
