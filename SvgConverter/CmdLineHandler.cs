using System;
using BKLib.CommandLineParser;

namespace SvgConverter
{
    public static class CmdLineHandler
    {
        public static int HandleCommandLine(string arg)
        {
            string[] args = arg != null ? arg.Split(' ') : new string[0];
            return HandleCommandLine(args);
        }
        public static int HandleCommandLine(string[] args)
        {
            var clp = new CommandLineParser { SkipCommandsWhenHelpRequested = true };

            clp.Target = new CmdLineTarget();
            // 把 banner 印到 stderr，避免污染 stdout 的指令輸出（例如 Convert 用 stdout 回傳 XAML）
            Console.Error.WriteLine("SvgToXaml - Tool to convert SVGs to a Dictionary");
            Console.Error.WriteLine("(c) 2015 Bernd Klaiber");
            clp.Header = "";
            clp.LogErrorsToConsole = true;
            try
            {
                return clp.ParseArgs(args, true);
            }
            catch (Exception)
            {
                //nothing to do, the errors are hopefully already reported via CommandLineParser
                Console.Error.WriteLine("Error while handling Commandline.");
                return -1;
            }
        }
    }
}
