using System;
using System.Net.Http;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace SvgToXaml.Infrastructure
{
    /// <summary>
    /// 版本檢查結果（不可變）
    /// </summary>
    public sealed class UpdateCheckResult
    {
        public static readonly UpdateCheckResult NoUpdate = new UpdateCheckResult(false, null, null);

        public bool IsUpdateAvailable { get; }
        public string LatestVersionTag { get; }
        public string ReleaseUrl { get; }

        public UpdateCheckResult(bool isUpdateAvailable, string latestVersionTag, string releaseUrl)
        {
            IsUpdateAvailable = isUpdateAvailable;
            LatestVersionTag = latestVersionTag;
            ReleaseUrl = releaseUrl;
        }
    }

    /// <summary>
    /// 透過 GitHub API 檢查是否有新版本
    /// </summary>
    public static class GitHubUpdateService
    {
        private const string ReleaseApiUrl =
            "https://api.github.com/repos/howwmingnew/SvgToXaml/releases/latest";

        private static readonly HttpClient SharedClient = CreateClient();

        private static HttpClient CreateClient()
        {
            var client = new HttpClient();
            client.DefaultRequestHeaders.Add("User-Agent", "SvgToXaml-UpdateChecker");
            client.Timeout = TimeSpan.FromSeconds(10);
            return client;
        }

        /// <summary>
        /// 檢查 GitHub Release 是否有比目前版本更新的版本。
        /// 任何錯誤一律靜默回傳「無更新」。
        /// </summary>
        public static async Task<UpdateCheckResult> CheckForUpdateAsync()
        {
            try
            {
                var json = await SharedClient.GetStringAsync(ReleaseApiUrl).ConfigureAwait(false);

                var tagName = ExtractJsonValue(json, "tag_name");
                var htmlUrl = ExtractJsonValue(json, "html_url");

                if (string.IsNullOrEmpty(tagName) || string.IsNullOrEmpty(htmlUrl))
                    return UpdateCheckResult.NoUpdate;

                var remoteVersion = ParseVersion(tagName);
                if (remoteVersion == null)
                    return UpdateCheckResult.NoUpdate;

                var localVersion = Assembly.GetEntryAssembly()?.GetName().Version;
                if (localVersion == null)
                    return UpdateCheckResult.NoUpdate;

                // 只比較 Major.Minor.Build（忽略 Revision）
                var comparable = new Version(localVersion.Major, localVersion.Minor, localVersion.Build);

                if (remoteVersion > comparable)
                    return new UpdateCheckResult(true, tagName, htmlUrl);

                return UpdateCheckResult.NoUpdate;
            }
            catch
            {
                // 無網路、API 錯誤、解析失敗等一律靜默
                return UpdateCheckResult.NoUpdate;
            }
        }

        /// <summary>
        /// 用 Regex 從 JSON 字串中擷取指定 key 的 string value
        /// </summary>
        private static string ExtractJsonValue(string json, string key)
        {
            // 匹配 "key" : "value"，支援 key/value 之間的空白
            var pattern = "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"([^\"]+)\"";
            var match = Regex.Match(json, pattern);
            return match.Success ? match.Groups[1].Value : null;
        }

        /// <summary>
        /// 將 tag（如 "v1.3.1" 或 "1.3.1"）解析為 System.Version
        /// </summary>
        private static Version ParseVersion(string tag)
        {
            if (string.IsNullOrEmpty(tag))
                return null;

            // 移除開頭的 'v' 或 'V'
            var versionString = tag.TrimStart('v', 'V');

            Version version;
            if (Version.TryParse(versionString, out version))
                return version;

            return null;
        }
    }
}
