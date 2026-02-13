using System;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;

namespace SvgToXaml.Infrastructure
{
    /// <summary>
    /// 使用 Windows Vista+ 原生 IFileOpenDialog 的資料夾選擇對話框，
    /// 外觀與 OpenFileDialog 一致，開啟時強制置中於父視窗。
    /// </summary>
    public static class FolderPicker
    {
        public static string Show(string title = "選擇資料夾", string initialFolder = null)
        {
            var dialog = (IFileOpenDialog)new FileOpenDialog();
            try
            {
                dialog.SetOptions(FOS.FOS_PICKFOLDERS | FOS.FOS_FORCEFILESYSTEM);
                dialog.SetTitle(title);

                if (!string.IsNullOrEmpty(initialFolder))
                {
                    var hr = SHCreateItemFromParsingName(initialFolder, IntPtr.Zero, typeof(IShellItem).GUID, out var folder);
                    if (hr == 0 && folder != null)
                    {
                        dialog.SetFolder(folder);
                    }
                }

                var ownerHandle = new WindowInteropHelper(Application.Current.MainWindow).Handle;

                // 安裝 CBT hook，在對話框啟動時置中
                var hook = new DialogCenterHook(ownerHandle);
                var result = dialog.Show(ownerHandle);
                hook.Dispose();

                if (result != 0)
                    return null;

                dialog.GetResult(out var item);
                item.GetDisplayName(SIGDN.SIGDN_FILESYSPATH, out var path);
                return path;
            }
            finally
            {
                Marshal.ReleaseComObject(dialog);
            }
        }

        /// <summary>
        /// 用 WH_CBT hook 攔截 HCBT_ACTIVATE，將目標視窗置中於 owner。
        /// </summary>
        private class DialogCenterHook : IDisposable
        {
            private const int WH_CBT = 5;
            private const int HCBT_ACTIVATE = 5;

            private readonly IntPtr _owner;
            private IntPtr _hookHandle;
            private HookProc _hookProc; // prevent GC

            private delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);

            public DialogCenterHook(IntPtr owner)
            {
                _owner = owner;
                _hookProc = CBTCallback;
                _hookHandle = SetWindowsHookEx(WH_CBT, _hookProc, IntPtr.Zero, GetCurrentThreadId());
            }

            private IntPtr CBTCallback(int nCode, IntPtr wParam, IntPtr lParam)
            {
                if (nCode == HCBT_ACTIVATE)
                {
                    CenterWindowOnOwner(wParam, _owner);
                    // 只處理一次就卸載
                    Dispose();
                }
                return CallNextHookEx(_hookHandle, nCode, wParam, lParam);
            }

            private static void CenterWindowOnOwner(IntPtr dialogHandle, IntPtr ownerHandle)
            {
                if (!GetWindowRect(dialogHandle, out var dialogRect))
                    return;
                if (!GetWindowRect(ownerHandle, out var ownerRect))
                    return;

                var dialogWidth = dialogRect.Right - dialogRect.Left;
                var dialogHeight = dialogRect.Bottom - dialogRect.Top;
                var ownerCenterX = ownerRect.Left + (ownerRect.Right - ownerRect.Left) / 2;
                var ownerCenterY = ownerRect.Top + (ownerRect.Bottom - ownerRect.Top) / 2;

                var newX = ownerCenterX - dialogWidth / 2;
                var newY = ownerCenterY - dialogHeight / 2;

                SetWindowPos(dialogHandle, IntPtr.Zero, newX, newY, 0, 0,
                    SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE);
            }

            public void Dispose()
            {
                if (_hookHandle != IntPtr.Zero)
                {
                    UnhookWindowsHookEx(_hookHandle);
                    _hookHandle = IntPtr.Zero;
                }
            }

            private const uint SWP_NOSIZE = 0x0001;
            private const uint SWP_NOZORDER = 0x0004;
            private const uint SWP_NOACTIVATE = 0x0010;

            [StructLayout(LayoutKind.Sequential)]
            private struct RECT
            {
                public int Left, Top, Right, Bottom;
            }

            [DllImport("user32.dll")] private static extern IntPtr SetWindowsHookEx(int idHook, HookProc lpfn, IntPtr hMod, uint dwThreadId);
            [DllImport("user32.dll")] private static extern bool UnhookWindowsHookEx(IntPtr hhk);
            [DllImport("user32.dll")] private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);
            [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            [DllImport("user32.dll")] private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
            [DllImport("kernel32.dll")] private static extern uint GetCurrentThreadId();
        }

        [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = true)]
        private static extern int SHCreateItemFromParsingName(
            string pszPath, IntPtr pbc, [In] Guid riid, out IShellItem ppv);

        [ComImport, Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")]
        private class FileOpenDialog { }

        [ComImport, Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IFileOpenDialog
        {
            [PreserveSig] int Show(IntPtr parent);
            void SetFileTypes();
            void SetFileTypeIndex();
            void GetFileTypeIndex();
            void Advise();
            void Unadvise();
            void SetOptions(FOS fos);
            void GetOptions();
            void SetDefaultFolder(IShellItem psi);
            void SetFolder(IShellItem psi);
            void GetFolder();
            void GetCurrentSelection();
            void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);
            void GetFileName();
            void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
            void SetOkButtonLabel();
            void SetFileNameLabel();
            void GetResult(out IShellItem ppsi);
            void AddPlace();
            void SetDefaultExtension();
            void Close();
            void SetClientGuid();
            void ClearClientData();
            void SetFilter();
            void GetResults();
            void GetSelectedItems();
        }

        [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IShellItem
        {
            void BindToHandler();
            void GetParent();
            void GetDisplayName(SIGDN sigdnName, [MarshalAs(UnmanagedType.LPWStr)] out string ppszName);
            void GetAttributes();
            void Compare();
        }

        [Flags]
        private enum FOS : uint
        {
            FOS_PICKFOLDERS = 0x00000020,
            FOS_FORCEFILESYSTEM = 0x00000040,
        }

        private enum SIGDN : uint
        {
            SIGDN_FILESYSPATH = 0x80058000,
        }
    }
}
