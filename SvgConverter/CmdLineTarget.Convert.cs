using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using BKLib.CommandLineParser;

namespace SvgConverter
{
    /// <summary>
    /// 提供給外部工具（如 Claude Code）以 CLI 形式呼叫 SVG → XAML 轉換的指令。
    /// 與 BuildDict 不同，這支指令支援單檔 / 資料夾 / stdout 三種輸出，並可指定輸出格式。
    /// </summary>
    public partial class CmdLineTarget
    {
        [ArgumentCommand(LongDesc = "Convert one SVG (or all SVGs in a folder) to WPF XAML. " +
                                    "Output formats: geometry (Path-based, recolorable), button (Button style with hover/pressed), drawingimage (legacy DrawingImage). " +
                                    "Pass '-' as input to read SVG from stdin (e.g. piping curl output). " +
                                    "Omit -output to write XAML to stdout.")]
        public int Convert(
            [ArgumentParam(Aliases = "i", Desc = "input svg file, folder, or '-' for stdin",
                LongDesc = "path to a single .svg/.svgz file, a folder containing svg files, or '-' to read SVG content from stdin")]
            string input,
            [ArgumentParam(Aliases = "o", DefaultValue = null, ExplicitNeeded = false,
                LongDesc = "output xaml file (single input) or folder (folder input); omit to write to stdout")]
            string output = null,
            [ArgumentParam(Aliases = "f", DefaultValue = "geometry", ExplicitNeeded = false,
                LongDesc = "output format: geometry | button | drawingimage (default: geometry)")]
            string format = "geometry",
            [ArgumentParam(DefaultValue = false, ExplicitNeeded = false,
                LongDesc = "recurse into subfolders when input is a folder (default: false)")]
            bool recurse = false,
            [ArgumentParam(Aliases = "n", DefaultValue = null, ExplicitNeeded = false,
                LongDesc = "override resource key base name (defaults to filename without extension; recommended when reading from stdin so keys are meaningful)")]
            string name = null)
        {
            var fmt = NormalizeFormat(format);
            if (fmt == null)
            {
                Console.Error.WriteLine("Error: invalid --format '{0}'. Expected: geometry | button | drawingimage", format);
                return 2;
            }

            if (string.IsNullOrEmpty(input))
            {
                Console.Error.WriteLine("Error: --input is required");
                return 2;
            }

            if (input == "-")
                return ConvertFromStdin(output, fmt, name);

            if (!string.IsNullOrEmpty(name))
                Console.Error.WriteLine("Note: /name is only honored when reading from stdin; ignored for file/folder input (resource keys follow the filename).");

            if (File.Exists(input))
                return ConvertSingleFile(input, output, fmt);

            if (Directory.Exists(input))
                return ConvertFolder(input, output, fmt, recurse);

            Console.Error.WriteLine("Error: input not found: {0}", input);
            return 1;
        }

        /// <summary>
        /// 從 stdin 讀 SVG 內容，寫到暫存檔後沿用既有 ConvertSingleFile 流程。
        /// 暫存資料夾名稱含 GUID 避免併發衝突；轉完無論成敗都清掉。
        /// </summary>
        private static int ConvertFromStdin(string output, string fmt, string name)
        {
            string svg;
            try
            {
                svg = Console.In.ReadToEnd();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Error reading stdin: {0}", ex.Message);
                return 1;
            }

            if (string.IsNullOrWhiteSpace(svg))
            {
                Console.Error.WriteLine("Error: stdin is empty (did you forget to pipe content in?)");
                return 1;
            }

            var safeName = SanitizeForFilename(string.IsNullOrEmpty(name) ? "Icon" : name);
            var tempDir = Path.Combine(Path.GetTempPath(), "SvgToXaml_" + Guid.NewGuid().ToString("N").Substring(0, 8));
            try
            {
                Directory.CreateDirectory(tempDir);
                var tempFile = Path.Combine(tempDir, safeName + ".svg");
                File.WriteAllText(tempFile, svg);
                return ConvertSingleFile(tempFile, output, fmt);
            }
            finally
            {
                try { if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true); }
                catch { /* best-effort cleanup; OS will handle %TEMP% eventually */ }
            }
        }

        private static string SanitizeForFilename(string s)
        {
            if (string.IsNullOrEmpty(s)) return "Icon";
            var invalid = Path.GetInvalidFileNameChars();
            var chars = new char[s.Length];
            for (int i = 0; i < s.Length; i++)
                chars[i] = Array.IndexOf(invalid, s[i]) >= 0 ? '_' : s[i];
            return new string(chars);
        }

        private static int ConvertSingleFile(string svgFile, string output, string fmt)
        {
            string xaml;
            try
            {
                xaml = ConvertOne(svgFile, fmt);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Error converting {0}: {1}", svgFile, ex.Message);
                return 1;
            }

            if (string.IsNullOrEmpty(xaml))
            {
                Console.Error.WriteLine("Conversion produced no output: {0}", svgFile);
                return 1;
            }

            if (string.IsNullOrEmpty(output))
            {
                Console.Out.Write(xaml);
                if (!xaml.EndsWith("\n", StringComparison.Ordinal))
                    Console.Out.WriteLine();
                return 0;
            }

            // 若 -output 是現存資料夾或結尾為斜線，視為輸出資料夾，自動產生檔名
            string outFile = output;
            if (Directory.Exists(output) ||
                output.EndsWith("\\", StringComparison.Ordinal) ||
                output.EndsWith("/", StringComparison.Ordinal))
            {
                Directory.CreateDirectory(output);
                outFile = Path.Combine(output, Path.GetFileNameWithoutExtension(svgFile) + ".xaml");
            }
            else
            {
                var parent = Path.GetDirectoryName(Path.GetFullPath(outFile));
                if (!string.IsNullOrEmpty(parent))
                    Directory.CreateDirectory(parent);
            }

            File.WriteAllText(outFile, xaml);
            Console.Error.WriteLine("Written: {0}", Path.GetFullPath(outFile));
            return 0;
        }

        private static int ConvertFolder(string folder, string output, string fmt, bool recurse)
        {
            var files = ConverterLogic.SvgFilesFromFolder(folder, recurse).ToList();
            if (files.Count == 0)
            {
                Console.Error.WriteLine("No svg files found in: {0}", folder);
                return 1;
            }

            bool toStdout = string.IsNullOrEmpty(output);
            if (!toStdout)
                Directory.CreateDirectory(output);

            int errors = 0;
            int succeeded = 0;
            foreach (var f in files)
            {
                string xaml;
                try
                {
                    xaml = ConvertOne(f, fmt);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine("Error converting {0}: {1}", f, ex.Message);
                    errors++;
                    continue;
                }

                if (string.IsNullOrEmpty(xaml))
                {
                    Console.Error.WriteLine("Skipped (empty output): {0}", f);
                    continue;
                }

                if (toStdout)
                {
                    Console.Out.WriteLine("<!-- ===== {0} ===== -->", Path.GetFileName(f));
                    Console.Out.Write(xaml);
                    if (!xaml.EndsWith("\n", StringComparison.Ordinal))
                        Console.Out.WriteLine();
                }
                else
                {
                    var outFile = Path.Combine(output, Path.GetFileNameWithoutExtension(f) + ".xaml");
                    File.WriteAllText(outFile, xaml);
                    Console.Error.WriteLine("Written: {0}", Path.GetFullPath(outFile));
                }
                succeeded++;
            }

            Console.Error.WriteLine("Done. {0} succeeded, {1} failed.", succeeded, errors);
            return errors == 0 ? 0 : 1;
        }

        /// <summary>
        /// 依照指定格式回傳 XAML。geometry 模式遇到漸層 / clip 等複雜內容會印 fallback 警告並改回 drawingimage。
        /// </summary>
        private static string ConvertOne(string svgFile, string fmt)
        {
            var data = ConverterLogic.ConvertSvg(svgFile, ResultMode.DrawingImage);

            switch (fmt)
            {
                case "button":
                    var btn = data.ButtonData;
                    if (string.IsNullOrEmpty(btn))
                    {
                        Console.Error.WriteLine("Warning: ButtonData unavailable for {0}; falling back to DrawingImage", svgFile);
                        return data.Xaml;
                    }
                    return btn;

                case "drawingimage":
                    return data.Xaml;

                case "geometry":
                default:
                    if (data.IsComplex)
                    {
                        Console.Error.WriteLine("Warning: {0} contains gradients or clips; falling back to DrawingImage format", svgFile);
                        return data.Xaml;
                    }
                    var geo = data.GeometryData;
                    if (string.IsNullOrEmpty(geo))
                    {
                        Console.Error.WriteLine("Warning: GeometryData unavailable for {0}; falling back to DrawingImage", svgFile);
                        return data.Xaml;
                    }
                    return geo;
            }
        }

        private static readonly HashSet<string> ValidFormats =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "geometry", "button", "drawingimage" };

        private static string NormalizeFormat(string fmt)
        {
            if (string.IsNullOrEmpty(fmt)) return "geometry";
            var f = fmt.Trim();
            return ValidFormats.Contains(f) ? f.ToLowerInvariant() : null;
        }
    }
}
