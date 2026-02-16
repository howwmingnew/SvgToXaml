using System.Windows;
using System.Windows.Media;
using ICSharpCode.AvalonEdit;
using ICSharpCode.AvalonEdit.Highlighting;

namespace SvgToXaml.TextViewer
{
    public class XmlViewer: TextEditor
    {
        public static readonly DependencyProperty TextProperty = DependencyProperty.Register(
            "Text", typeof (string), typeof (XmlViewer), new PropertyMetadata(default(string), TextChanged));

        private new static void TextChanged(DependencyObject dependencyObject, DependencyPropertyChangedEventArgs args)
        {
            var xmlViewer = (XmlViewer) dependencyObject;
            xmlViewer.Document.Text = (string)args.NewValue;
        }

        public new string Text
        {
            get { return Document.Text; }
            set { SetValue(TextProperty, value); }
        }

        public XmlViewer()
        {
            SyntaxHighlighting = CreateDarkXmlHighlighting();
            Options.EnableHyperlinks = true;
            Options.EnableEmailHyperlinks = true;

            ShowLineNumbers = true;
            IsReadOnly = true;

            // 暗黑主題配色
            Background = new SolidColorBrush(Color.FromRgb(0x1E, 0x1E, 0x1E));
            Foreground = new SolidColorBrush(Color.FromRgb(0xD4, 0xD4, 0xD4));
            LineNumbersForeground = new SolidColorBrush(Color.FromRgb(0x60, 0x60, 0x60));
            TextArea.TextView.LinkTextForegroundBrush = new SolidColorBrush(Color.FromRgb(0x37, 0x94, 0xFF));
            TextArea.SelectionBrush = new SolidColorBrush(Color.FromRgb(0x26, 0x4F, 0x78));
            TextArea.SelectionForeground = new SolidColorBrush(Colors.White);
        }

        /// <summary>
        /// 建立 VS Code 風格的暗黑 XML 語法高亮
        /// </summary>
        private static IHighlightingDefinition CreateDarkXmlHighlighting()
        {
            var definition = HighlightingManager.Instance.GetDefinition("XML");
            if (definition == null)
                return null;

            // 套用暗黑主題色彩到各個語法規則
            foreach (var color in definition.NamedHighlightingColors)
            {
                switch (color.Name)
                {
                    case "Comment":
                        // 註解：暗綠色
                        color.Foreground = new SimpleHighlightingBrush(
                            Color.FromRgb(0x6A, 0x99, 0x55));
                        break;
                    case "CData":
                        // CDATA：淡黃色
                        color.Foreground = new SimpleHighlightingBrush(
                            Color.FromRgb(0xD7, 0xBA, 0x7D));
                        break;
                    case "DocType":
                    case "XmlDeclaration":
                        // DOCTYPE / XML 宣告：淡紫色
                        color.Foreground = new SimpleHighlightingBrush(
                            Color.FromRgb(0xC5, 0x86, 0xC0));
                        break;
                    case "XmlTag":
                        // 標籤角括號 < > /：灰色
                        color.Foreground = new SimpleHighlightingBrush(
                            Color.FromRgb(0x80, 0x80, 0x80));
                        break;
                    case "AttributeName":
                        // 屬性名稱：淡藍色
                        color.Foreground = new SimpleHighlightingBrush(
                            Color.FromRgb(0x9C, 0xDC, 0xFE));
                        break;
                    case "AttributeValue":
                        // 屬性值：橘色
                        color.Foreground = new SimpleHighlightingBrush(
                            Color.FromRgb(0xCE, 0x91, 0x78));
                        break;
                    case "Entity":
                        // 實體參考 &amp; 等：淡黃色
                        color.Foreground = new SimpleHighlightingBrush(
                            Color.FromRgb(0xD7, 0xBA, 0x7D));
                        break;
                    case "BrokenEntity":
                        // 壞掉的實體參考：紅色
                        color.Foreground = new SimpleHighlightingBrush(
                            Color.FromRgb(0xF4, 0x47, 0x47));
                        break;
                }
            }

            // 設定標籤名稱顏色（在 RuleSet 的 rules 中）
            ApplyElementNameColor(definition);

            return definition;
        }

        /// <summary>
        /// 設定 XML 元素名稱的顏色
        /// </summary>
        private static void ApplyElementNameColor(IHighlightingDefinition definition)
        {
            var tagColor = new HighlightingColor
            {
                Foreground = new SimpleHighlightingBrush(
                    Color.FromRgb(0x56, 0x9C, 0xD6))  // 標籤名稱：藍色
            };

            foreach (var ruleSet in definition.MainRuleSet.Spans)
            {
                if (ruleSet.SpanColorIncludesEnd && ruleSet.RuleSet != null)
                {
                    // 這是 XML 標籤內部的 RuleSet，包含元素名稱規則
                    foreach (var rule in ruleSet.RuleSet.Rules)
                    {
                        // 元素名稱規則通常是第一個沒有命名顏色的規則
                        if (rule.Color != null && rule.Color.Foreground != null)
                            continue;
                        rule.Color = tagColor;
                    }
                }
            }
        }

        //der ganze Folding Quatsch funktioniert nicht richtig -> bleiben lassen
        //private XmlFoldingStrategy _foldingStrategy;
        //private FoldingManager _foldingManager;
        //private volatile bool _updateFoldingRequested;
        //private async void DocumentTextChanged(object sender, EventArgs eventArgs)
        //{
        //    if (!_updateFoldingRequested)
        //    {
        //        _updateFoldingRequested = true;
        //        await Task.Delay(1000);
        //    }
        //    _updateFoldingRequested = false;
        //    _foldingStrategy.UpdateFoldings(_foldingManager, Document);
        //}

    }
}
