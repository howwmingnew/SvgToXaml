using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Forms;
using System.Windows.Input;
using System.Windows.Media;
using SvgConverter;
using SvgToXaml.Command;
using SvgToXaml.Infrastructure;
using Application = System.Windows.Application;
using MessageBox = System.Windows.MessageBox;
using OpenFileDialog = Microsoft.Win32.OpenFileDialog;

namespace SvgToXaml.ViewModels
{
    public class SvgImagesViewModel : ViewModelBase
    {
        private static readonly Brush DarkGrayBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#3C3C3C"));
        private static readonly Brush LightGrayBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#D0D0D0"));
        private static readonly Brush CheckerboardBrush = CreateCheckerboardBrush();

        static SvgImagesViewModel()
        {
            DarkGrayBrush.Freeze();
            LightGrayBrush.Freeze();
            CheckerboardBrush.Freeze();
        }

        private static DrawingBrush CreateCheckerboardBrush()
        {
            var brush = new DrawingBrush
            {
                TileMode = TileMode.Tile,
                Viewport = new Rect(0, 0, 20, 20),
                ViewportUnits = BrushMappingMode.Absolute
            };

            var white = new GeometryDrawing(
                Brushes.White,
                null,
                new RectangleGeometry(new Rect(0, 0, 20, 20)));

            var gray1 = new GeometryDrawing(
                Brushes.LightGray,
                null,
                new RectangleGeometry(new Rect(0, 0, 10, 10)));

            var gray2 = new GeometryDrawing(
                Brushes.LightGray,
                null,
                new RectangleGeometry(new Rect(10, 10, 10, 10)));

            var group = new DrawingGroup();
            group.Children.Add(white);
            group.Children.Add(gray1);
            group.Children.Add(gray2);

            brush.Drawing = group;
            return brush;
        }

        private string _currentDir;
        private ObservableCollectionSafe<ImageBaseViewModel> _images;
        private ImageBaseViewModel _selectedItem;
        private PreviewBackground _previewBackground = PreviewBackground.DarkGray;

        public SvgImagesViewModel()
        {
            _images = new ObservableCollectionSafe<ImageBaseViewModel>();
            OpenFileCommand = new DelegateCommand(OpenFileExecute);
            OpenFolderCommand = new DelegateCommand(OpenFolderExecute);
            ExportDirCommand = new DelegateCommand(ExportDirExecute);
            InfoCommand = new DelegateCommand(InfoExecute);
            ToggleBackgroundCommand = new DelegateCommand(ToggleBackgroundExecute);

            ContextMenuCommands = new ObservableCollection<Tuple<object, ICommand>>();
            ContextMenuCommands.Add(new Tuple<object, ICommand>("Open Explorer", new DelegateCommand<string>(OpenExplorerExecute)));
        }

        private void OpenFolderExecute()
        {
            var folderDialog = new FolderBrowserDialog { Description = "Open Folder", SelectedPath = CurrentDir, ShowNewFolderButton = false };
            if (folderDialog.ShowDialog() == DialogResult.OK)
                CurrentDir = folderDialog.SelectedPath;
        }

        private void OpenFileExecute()
        {
            var openDlg = new OpenFileDialog { CheckFileExists = true, Filter = "Svg-Files|*.svg*", Multiselect = false };
            if (openDlg.ShowDialog(Application.Current.MainWindow).GetValueOrDefault())
            {
                ImageBaseViewModel.OpenDetailWindow(new SvgImageViewModel(openDlg.FileName));
            }
        }

        private void ExportDirExecute()
        {
            string outFileName = Path.GetFileNameWithoutExtension(CurrentDir) + ".xaml"; 
            var saveDlg = new SaveFileDialog {AddExtension = true, DefaultExt = ".xaml", Filter = "Xaml-File|*.xaml", InitialDirectory = CurrentDir, FileName = outFileName};
            if (saveDlg.ShowDialog() == DialogResult.OK)
            {
                string namePrefix = null;

                bool useComponentResKeys = false;
                string nameSpaceName = null;
                var nameSpace = Microsoft.VisualBasic.Interaction.InputBox("Enter a NameSpace for using static ComponentResKeys (or leave empty to not use it)", "NameSpace");
                if (!string.IsNullOrWhiteSpace(nameSpace))
                {
                    useComponentResKeys = true;
                    nameSpaceName =
                        Microsoft.VisualBasic.Interaction.InputBox(
                            "Enter a Name of NameSpace for using static ComponentResKeys", "NamespaceName");
                }
                else
                {
                    namePrefix = Microsoft.VisualBasic.Interaction.InputBox("Enter a namePrefix (or leave empty to not use it)", "Name Prefix");
                    if (string.IsNullOrWhiteSpace(namePrefix))
                        namePrefix = null;

                }

                outFileName = Path.GetFullPath(saveDlg.FileName);
                var resKeyInfo = new ResKeyInfo
                {
                    XamlName = Path.GetFileNameWithoutExtension(outFileName),
                    Prefix = namePrefix,
                    UseComponentResKeys = useComponentResKeys,
                    NameSpace = nameSpace,
                    NameSpaceName = nameSpaceName,

                };
                File.WriteAllText(outFileName, ConverterLogic.SvgDirToXaml(CurrentDir, resKeyInfo, false));

                BuildBatchFile(outFileName, resKeyInfo);
            }
        }

        private void BuildBatchFile(string outFileName, ResKeyInfo compResKeyInfo)
        {
            if (MessageBox.Show(Application.Current.MainWindow,
                outFileName + "\nhas been written\nCreate a BatchFile to automate next time?",
                "Export", MessageBoxButton.YesNoCancel) == MessageBoxResult.Yes)
            {
                var outputname = Path.GetFileNameWithoutExtension(outFileName);
                var outputdir = Path.GetDirectoryName(outFileName);
                var relOutputDir = FileUtils.MakeRelativePath(CurrentDir, PathIs.Folder, outputdir, PathIs.Folder);
                var svgToXamlPath =System.Reflection.Assembly.GetEntryAssembly().Location;
                var relSvgToXamlPath = FileUtils.MakeRelativePath(CurrentDir, PathIs.Folder, svgToXamlPath, PathIs.File);
                var batchText = $"{relSvgToXamlPath} BuildDict /inputdir \".\" /outputdir \"{relOutputDir}\" /outputname {outputname}";

                if (compResKeyInfo.UseComponentResKeys)
                {
                    batchText += $" /useComponentResKeys=true /compResKeyNSName={compResKeyInfo.NameSpaceName} /compResKeyNS={compResKeyInfo.NameSpace}";
                    WriteT4Template(outFileName);
                }
                else
                {
                    if (!string.IsNullOrWhiteSpace(compResKeyInfo.Prefix))
                    {
                        batchText += " /nameprefix \"" + compResKeyInfo.Prefix + "\"";
                    }
                }

                batchText += "\r\npause";

                File.WriteAllText(Path.Combine(CurrentDir, "Update.cmd"), batchText);

                ////Copy ExeFile
                //var srcFile = Environment.GetCommandLineArgs().First();
                //var destFile = Path.Combine(CurrentDir, Path.GetFileName(srcFile));
                ////Console.WriteLine("srcFile:", srcFile);
                ////Console.WriteLine("destFile:", destFile);
                //if (!string.Equals(srcFile, destFile, StringComparison.OrdinalIgnoreCase))
                //{
                //    Console.WriteLine("Copying file...");
                //    File.Copy(srcFile, destFile, true);
                //}
            }
        }

        private void WriteT4Template(string outFileName)
        {
            //BuildAction: "Embedded Resource"
            var appType = typeof(App);
            var assembly = appType.Assembly;
            //assembly.GetName().Name
            var resourceName = appType.Namespace + "." + "Payload.T4Template.tt"; //Achtung: hier Punkt statt Slash
            var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream == null)
                throw new InvalidDataException($"Error: {resourceName} not found in payload file");
            var text = new StreamReader(stream, Encoding.UTF8).ReadToEnd();
            var t4FileName = Path.ChangeExtension(outFileName, ".tt");
            File.WriteAllText(t4FileName, text, Encoding.UTF8);
        }

        private void InfoExecute()
        {
            MessageBox.Show(Application.Current.MainWindow, "SvgToXaml © 2015 Bernd Klaiber\n\nPowered by\nsharpvectors.codeplex.com (Svg-Support),\nicsharpcode (AvalonEdit)", "Info");
        }
        private void OpenExplorerExecute(string path)
        {
            Process.Start(path);
        }

        public static SvgImagesViewModel DesignInstance
        {
            get
            {
                var result = new SvgImagesViewModel();
                result.Images.Add(SvgImageViewModel.DesignInstance);
                result.Images.Add(SvgImageViewModel.DesignInstance);
                return result;
            }
        }

        public string CurrentDir
        {
            get { return _currentDir; }
            set
            {
                if (SetProperty(ref _currentDir, value))
                    ReadImagesFromDir(_currentDir);
            }
        }

        public ImageBaseViewModel SelectedItem
        {
            get { return _selectedItem; }
            set { SetProperty(ref _selectedItem, value); }
        }

        public ObservableCollectionSafe<ImageBaseViewModel> Images
        {
            get { return _images; }
            set { SetProperty(ref _images, value); }
        }

        public ICommand OpenFolderCommand { get; set; }
        public ICommand OpenFileCommand { get; set; }
        public ICommand ExportDirCommand { get; set; }
        public ICommand InfoCommand { get; set; }
        public ICommand ToggleBackgroundCommand { get; set; }

        public PreviewBackground PreviewBackground
        {
            get { return _previewBackground; }
            set
            {
                if (SetProperty(ref _previewBackground, value))
                {
                    OnPropertyChanged(nameof(PreviewBackgroundBrush));
                    OnPropertyChanged(nameof(BackgroundLabel));
                }
            }
        }

        public Brush PreviewBackgroundBrush
        {
            get
            {
                switch (_previewBackground)
                {
                    case PreviewBackground.LightGray: return LightGrayBrush;
                    case PreviewBackground.Checkerboard: return CheckerboardBrush;
                    default: return DarkGrayBrush;
                }
            }
        }

        public string BackgroundLabel
        {
            get
            {
                switch (_previewBackground)
                {
                    case PreviewBackground.LightGray: return "淺灰";
                    case PreviewBackground.Checkerboard: return "棋盤";
                    default: return "深灰";
                }
            }
        }

        private void ToggleBackgroundExecute()
        {
            switch (_previewBackground)
            {
                case PreviewBackground.DarkGray:
                    PreviewBackground = PreviewBackground.LightGray;
                    break;
                case PreviewBackground.LightGray:
                    PreviewBackground = PreviewBackground.Checkerboard;
                    break;
                default:
                    PreviewBackground = PreviewBackground.DarkGray;
                    break;
            }
        }

        public ObservableCollection<Tuple<object, ICommand>> ContextMenuCommands { get; set; }

        private void ReadImagesFromDir(string folder)
        {
            Images.Clear();
            var svgFiles = ConverterLogic.SvgFilesFromFolder(folder);
            var svgImages = svgFiles.Select(f => new SvgImageViewModel(f));

            var graphicFiles = GetFilesMulti(folder, GraphicImageViewModel.SupportedFormats);
            var graphicImages = graphicFiles.Select(f => new GraphicImageViewModel(f));
            
            var allImages = svgImages.Concat<ImageBaseViewModel>(graphicImages).OrderBy(e=>e.Filepath);
            
            Images.AddRange(allImages);
        }

        private static string[] GetFilesMulti(string sourceFolder, string filters, SearchOption searchOption = SearchOption.TopDirectoryOnly)
        {
            try
            {
                if (!Directory.Exists(sourceFolder))
                    return new string[0];
                return filters.Split('|').SelectMany(filter => Directory.GetFiles(sourceFolder, filter, searchOption)).ToArray();
            }
            catch (Exception)
            {
                return new string[0];
            }
        }
    }
}
