using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading;

namespace DexterAuth
{
    // ─── Logging System ──────────────────────────────────────────────────────

    public enum LogLevel
    {
        DebugLevel = 0,
        InfoLevel = 1,
        WarnLevel = 2,
        ErrorLevel = 3
    }

    public class Logger
    {
        private static readonly Lazy<Logger> _instance = new Lazy<Logger>(() => new Logger());
        public static Logger Instance => _instance.Value;

        private readonly object _lock = new object();
        private string _logFilePath = "logs/sdk.log";
        private bool _consolePrint = false;
        private LogLevel _level = LogLevel.InfoLevel;

        private Logger() { }

        public void Init(string logFilePath, bool consolePrint, LogLevel level)
        {
            lock (_lock)
            {
                _logFilePath = logFilePath;
                _consolePrint = consolePrint;
                _level = level;

                try
                {
                    string dir = Path.GetDirectoryName(logFilePath);
                    if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    {
                        Directory.CreateDirectory(dir);
                    }
                }
                catch { }
            }
        }

        public void Log(LogLevel level, string message, string file = "", int line = 0, string func = "")
        {
            lock (_lock)
            {
                if (level < _level) return;

                string timeStr = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff");
                string levelStr = level.ToString().ToUpper().Replace("LEVEL", "");
                string prefix = $"[{timeStr}] [{levelStr}]";

                if (!string.IsNullOrEmpty(file))
                {
                    string fileName = Path.GetFileName(file);
                    prefix += $" [{fileName}:{line}:{func}]";
                }

                string fullMessage = $"{prefix} {message}";

                try
                {
                    File.AppendAllText(_logFilePath, fullMessage + Environment.NewLine, Encoding.UTF8);
                }
                catch { }

                if (_consolePrint)
                {
                    try
                    {
                        ConsoleColor oldColor = Console.ForegroundColor;
                        switch (level)
                        {
                            case LogLevel.DebugLevel:
                                Console.ForegroundColor = ConsoleColor.Gray;
                                break;
                            case LogLevel.InfoLevel:
                                Console.ForegroundColor = ConsoleColor.Cyan;
                                break;
                            case LogLevel.WarnLevel:
                                Console.ForegroundColor = ConsoleColor.Yellow;
                                break;
                            case LogLevel.ErrorLevel:
                                Console.ForegroundColor = ConsoleColor.Red;
                                break;
                        }
                        Console.WriteLine(fullMessage);
                        Console.ForegroundColor = oldColor;
                    }
                    catch
                    {
                        try
                        {
                            System.Diagnostics.Debug.WriteLine(fullMessage);
                        }
                        catch { }
                    }
                }
            }
        }
    }

    public static class LogHelper
    {
        public static void LogDebug(string msg, [CallerFilePath] string file = "", [CallerLineNumber] int line = 0, [CallerMemberName] string func = "")
            => Logger.Instance.Log(LogLevel.DebugLevel, msg, file, line, func);

        public static void LogInfo(string msg, [CallerFilePath] string file = "", [CallerLineNumber] int line = 0, [CallerMemberName] string func = "")
            => Logger.Instance.Log(LogLevel.InfoLevel, msg, file, line, func);

        public static void LogWarn(string msg, [CallerFilePath] string file = "", [CallerLineNumber] int line = 0, [CallerMemberName] string func = "")
            => Logger.Instance.Log(LogLevel.WarnLevel, msg, file, line, func);

        public static void LogWarning(string msg, [CallerFilePath] string file = "", [CallerLineNumber] int line = 0, [CallerMemberName] string func = "")
            => Logger.Instance.Log(LogLevel.WarnLevel, msg, file, line, func);

        public static void LogError(string msg, [CallerFilePath] string file = "", [CallerLineNumber] int line = 0, [CallerMemberName] string func = "")
            => Logger.Instance.Log(LogLevel.ErrorLevel, msg, file, line, func);
    }

    // ─── Others Helper Class ─────────────────────────────────────────────────

    public static class Others
    {
        [DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool IsDebuggerPresent();

        [DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool CheckRemoteDebuggerPresent(IntPtr hProcess, [MarshalAs(UnmanagedType.Bool)] ref bool isDebuggerPresent);

        public static string GetChecksum()
        {
            try
            {
                string path = Process.GetCurrentProcess().MainModule?.FileName;
                if (string.IsNullOrEmpty(path) || !File.Exists(path))
                {
                    return "UNKNOWN_HASH";
                }

                using (var sha256 = SHA256.Create())
                {
                    using (var stream = File.OpenRead(path))
                    {
                        byte[] hashBytes = sha256.ComputeHash(stream);
                        StringBuilder sb = new StringBuilder();
                        foreach (byte b in hashBytes)
                        {
                            sb.Append(b.ToString("x2"));
                        }
                        return sb.ToString();
                    }
                }
            }
            catch
            {
                return "UNKNOWN_HASH";
            }
        }

        public static void AntiDebug()
        {
            if (Debugger.IsAttached || IsDebuggerPresent())
            {
                LogHelper.LogError("Security violation: Debugger detected. Exiting.");
                Environment.Exit(1);
            }

            try
            {
                bool isDebuggerPresent = false;
                if (CheckRemoteDebuggerPresent(Process.GetCurrentProcess().Handle, ref isDebuggerPresent))
                {
                    if (isDebuggerPresent)
                    {
                        LogHelper.LogError("Security violation: Remote debugger detected. Exiting.");
                        Environment.Exit(1);
                    }
                }
            }
            catch { }
        }

        public static string GetHWID(string method = "windows_user")
        {
            bool isWindows = Path.DirectorySeparatorChar == '\\';
            bool isMac = !isWindows && Directory.Exists("/System/Library/CoreServices");
            bool isLinux = !isWindows && !isMac;

            if (isWindows)
            {
                if (method == "windows_user")
                {
                    try
                    {
                        Type type = Type.GetType("System.Security.Principal.WindowsIdentity, System.Security.Principal.Windows") 
                                    ?? Type.GetType("System.Security.Principal.WindowsIdentity, mscorlib");
                        if (type != null)
                        {
                            object current = type.GetMethod("GetCurrent", new Type[0]).Invoke(null, null);
                            if (current != null)
                            {
                                object user = type.GetProperty("User").GetValue(current, null);
                                if (user != null)
                                {
                                    object value = user.GetType().GetProperty("Value").GetValue(user, null);
                                    if (value != null)
                                    {
                                        return value.ToString();
                                    }
                                }
                            }
                        }
                    }
                    catch { }
                    return "Unknown-Windows-User-HWID";
                }
                else
                {
                    try
                    {
                        Type registryKeyType = Type.GetType("Microsoft.Win32.RegistryKey, Microsoft.Win32.Registry")
                                              ?? Type.GetType("Microsoft.Win32.RegistryKey, mscorlib");
                        Type registryHiveType = Type.GetType("Microsoft.Win32.RegistryHive, Microsoft.Win32.Registry")
                                                ?? Type.GetType("Microsoft.Win32.RegistryHive, mscorlib");
                        Type registryViewType = Type.GetType("Microsoft.Win32.RegistryView, Microsoft.Win32.Registry")
                                                ?? Type.GetType("Microsoft.Win32.RegistryView, mscorlib");

                        if (registryKeyType != null && registryHiveType != null && registryViewType != null)
                        {
                            object localMachineHive = Enum.ToObject(registryHiveType, 0x80000002);
                            object registry64View = Enum.ToObject(registryViewType, 2);

                            var openBaseKeyMethod = registryKeyType.GetMethod("OpenBaseKey", new Type[] { registryHiveType, registryViewType });
                            if (openBaseKeyMethod != null)
                            {
                                using (var baseKey = openBaseKeyMethod.Invoke(null, new object[] { localMachineHive, registry64View }) as IDisposable)
                                {
                                    if (baseKey != null)
                                    {
                                        var openSubKeyMethod = registryKeyType.GetMethod("OpenSubKey", new Type[] { typeof(string) });
                                        using (var subKey = openSubKeyMethod.Invoke(baseKey, new object[] { @"SOFTWARE\Microsoft\Cryptography" }) as IDisposable)
                                        {
                                            if (subKey != null)
                                            {
                                                var getValueMethod = registryKeyType.GetMethod("GetValue", new Type[] { typeof(string) });
                                                object value = getValueMethod.Invoke(subKey, new object[] { "MachineGuid" });
                                                if (value != null)
                                                {
                                                    return value.ToString();
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch { }
                    return "Unknown-Windows-Machine-HWID";
                }
            }
            else if (isLinux)
            {
                try
                {
                    if (File.Exists("/etc/machine-id"))
                    {
                        return File.ReadAllText("/etc/machine-id").Trim();
                    }
                    if (File.Exists("/var/lib/dbus/machine-id"))
                    {
                        return File.ReadAllText("/var/lib/dbus/machine-id").Trim();
                    }
                }
                catch { }
                return "Unknown-Linux-Machine-HWID";
            }
            else if (isMac)
            {
                try
                {
                    using (var process = new Process())
                    {
                        process.StartInfo = new ProcessStartInfo
                        {
                            FileName = "sysctl",
                            Arguments = "-n kern.uuid",
                            UseShellExecute = false,
                            RedirectStandardOutput = true,
                            CreateNoWindow = true
                        };
                        process.Start();
                        string output = process.StandardOutput.ReadToEnd();
                        process.WaitForExit();
                        if (!string.IsNullOrEmpty(output))
                        {
                            return output.Trim();
                        }
                    }
                }
                catch { }
                return "Unknown-Mac-Hardware-HWID";
            }

            return "Unknown-Generic-HWID";
        }
    }

    // ─── Data Models ─────────────────────────────────────────────────────────

    public struct SubscriptionInfo
    {
        public string subscription { get; set; }
        public string expiry { get; set; }
    }

    public class UserData
    {
        public string username { get; set; } = "";
        public string hwid { get; set; } = "N/A";
        public string expires { get; set; } = "";
        public string createdate { get; set; } = "";
        public string lastlogin { get; set; } = "";
        public string subscription { get; set; } = "";
        public List<SubscriptionInfo> subscriptions { get; set; } = new List<SubscriptionInfo>();
        public bool is_authenticated { get; set; } = false;
        public double auth_runtime_start { get; set; } = 0.0;
    }

    public class UpdateInfo
    {
        public bool update_available { get; set; } = false;
        public string current_version { get; set; } = "";
        public string latest_version { get; set; } = "";
        public string download_url { get; set; } = "";
        public string file_name { get; set; } = "";
        public string release_notes { get; set; } = "";
    }

    // ─── Main SDK API Class ──────────────────────────────────────────────────

    public class api
    {
        public string name { get; private set; }
        public string ownerid { get; private set; }
        public string version { get; private set; }
        public string client_secret { get; private set; }
        public string hash_to_check { get; private set; }
        public string api_url { get; private set; }
        public string session_token { get; private set; } = "";
        public bool initialized { get; private set; } = false;
        public string hwid_method { get; private set; } = "windows_user";
        public UserData user_data { get; private set; } = new UserData();

        // Auto-Updater fields
        public bool auto_update_enabled { get; set; } = true;
        public UpdateInfo update_info { get; private set; } = new UpdateInfo();

        public string ban_reason { get; private set; } = "";
        public string ban_revoke_date { get; private set; } = "";
        public string last_message { get; private set; } = "";

        public bool secure_strings_enabled { get; private set; } = false;
        public byte[] secure_key { get; private set; } = new byte[0];

        private int login_fails = 0;
        private double lockout_end = 0.0;
        private bool debug = false;

        private readonly List<string> allowed_hosts = new List<string>();
        private readonly List<string> pinned_public_keys = new List<string>();
        private readonly List<string> pinned_cert_hashes = new List<string>();

        private Thread ban_monitor_thread = null;
        private bool ban_monitor_active = false;
        private readonly object ban_monitor_lock = new object();

        public api(string name, string ownerid, string version, string secret = "", string hashToCheck = "", string apiUrl = "")
        {
            this.name = name;
            this.ownerid = ownerid;
            this.version = version;
            this.client_secret = secret;
            this.hash_to_check = string.IsNullOrEmpty(hashToCheck) ? Others.GetChecksum() : hashToCheck;
            this.api_url = string.IsNullOrEmpty(apiUrl) ? "https://dexterauth.onrender.com/api/v2/client" : apiUrl;

            // Configure TLS security protocol to standard modern levels (TLS 1.2 / TLS 1.3)
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | (SecurityProtocolType)12288; // 12288 = Tls13

            init();
        }

        ~api()
        {
            stop_ban_monitor();
        }

        public void init()
        {
            // Intercept --dexterauth-update-finish stage before anything else
            HandleUpdateStage();

            // Cleanup previous .old backup if it exists
            string currentExe = GetCurrentExecutablePath();
            if (!string.IsNullOrEmpty(currentExe))
            {
                string oldBackup = currentExe + ".old";
                if (File.Exists(oldBackup))
                {
                    try { File.Delete(oldBackup); } catch { }
                }
            }

            Others.AntiDebug();

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "name", name },
                { "version", version },
                { "secret", string.IsNullOrEmpty(client_secret) ? "NO_SECRET" : client_secret }
            };

            var response = DoRequest("/init", payload);

            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                var appInfo = response.ContainsKey("app_info") ? response["app_info"] as Dictionary<string, object> : null;
                if (appInfo != null)
                {
                    string serverName = appInfo.ContainsKey("name") ? appInfo["name"].ToString() : name;
                    string serverVersion = appInfo.ContainsKey("version") ? appInfo["version"].ToString() : version;

                    if (serverName != name)
                    {
                        LogHelper.LogError($"[SECURITY] Application name mismatch! Expected: {name} | Server reports: {serverName}");
                        last_message = $"Application name mismatch! Expected: {name} | Server reports: {serverName}";
                        initialized = false;
                        return;
                    }

                    string CleanVer(string v)
                    {
                        if (string.IsNullOrEmpty(v)) return "";
                        v = v.Trim();
                        if (v.StartsWith("v", StringComparison.OrdinalIgnoreCase))
                        {
                            v = v.Substring(1);
                        }
                        return v;
                    }

                    if (CleanVer(serverVersion) != CleanVer(version))
                    {
                        LogHelper.LogError($"[UPDATE REQUIRED] Application version is outdated! Current: {version} | Required: {serverVersion}");
                        last_message = $"Application version is outdated! Current: {version} | Required: {serverVersion}";

                        if (auto_update_enabled)
                        {
                            LogHelper.LogInfo($"[AUTO-UPDATE] Initiating auto-update to {serverVersion}...");
                            UpdateInfo info = CheckForUpdates();
                            info.update_available = true;
                            PerformUpdate(info);
                        }

                        initialized = false;
                        return;
                    }

                    initialized = true;
                    hwid_method = appInfo.ContainsKey("hwid_method") ? appInfo["hwid_method"].ToString() : "windows_user";

                    LogHelper.LogInfo($"SDK Initialized successfully. Name: {name}, Version: {version}, HWID Method: {hwid_method}");
                    if (debug)
                    {
                        LogHelper.LogDebug($"Hash mode: {(string.IsNullOrEmpty(client_secret) ? "OFF" : "SECURE")}");
                    }
                }
            }
            else
            {
                string errMsg = "Failed to initialise. Check ownerid and network connectivity.";
                if (response != null && response.ContainsKey("message"))
                {
                    errMsg = response["message"].ToString();
                }
                LogHelper.LogError($"Initialization failed: {errMsg}");
                last_message = errMsg;
                initialized = false;
            }
        }

        // ─── Authentication API ──────────────────────────────────────────────────

        public bool login(string user, string password, string hwid = "")
        {
            if (!checkinit()) return false;

            if (string.IsNullOrEmpty(hwid))
            {
                hwid = Others.GetHWID(hwid_method);
            }

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "username", user },
                { "password", password },
                { "hwid", hwid },
                { "version", version }
            };

            var hashPayload = BuildHashPayload();
            foreach (var kvp in hashPayload)
            {
                payload[kvp.Key] = kvp.Value;
            }

            if (debug)
            {
                string safeHash = hash_to_check.Length > 16 ? hash_to_check.Substring(0, 16) + "..." : hash_to_check;
                LogHelper.LogDebug($"login() hash mode: {(string.IsNullOrEmpty(client_secret) ? "OFF" : "SECURE")}, hash: {safeHash}");
            }

            var response = DoRequest("/login", payload);



            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                var data = response.ContainsKey("data") ? response["data"] as Dictionary<string, object> : null;
                if (data != null)
                {
                    session_token = data.ContainsKey("token") ? data["token"].ToString() : "";
                    LoadUserData(data.ContainsKey("user") ? data["user"] as Dictionary<string, object> : null);

                    if (!has_active_subscription())
                    {
                        LogHelper.LogError("Login Failed: Subscription has expired or is paused.");
                        session_token = "";
                        user_data.is_authenticated = false;
                        return false;
                    }

                    mark_authenticated();
                    LogHelper.LogInfo($"Successfully logged in as '{user_data.username}'!");
                    return true;
                }
            }

            string msg = (response == null) ? "No server response." : (response.ContainsKey("message") ? response["message"].ToString() : "Login failed.");
            ParseBanInfo(msg);
            LogHelper.LogError($"Login Failed: {msg}");
            LoginHint(msg);
            return false;
        }

        public bool registerAccount(string user, string email, string password, string licenseKey, string hwid = "")
        {
            if (!checkinit()) return false;

            if (string.IsNullOrEmpty(hwid))
            {
                hwid = Others.GetHWID(hwid_method);
            }

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "username", user },
                { "email", email },
                { "password", password },
                { "license_key", licenseKey },
                { "hwid", hwid }
            };

            var hashPayload = BuildHashPayload();
            foreach (var kvp in hashPayload)
            {
                payload[kvp.Key] = kvp.Value;
            }

            var response = DoRequest("/register", payload);

            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                string successMsg = response.ContainsKey("message") ? response["message"].ToString() : "Registration successful!";
                LogHelper.LogInfo(successMsg);
                return true;
            }

            string msg = (response == null) ? "No server response." : (response.ContainsKey("message") ? response["message"].ToString() : "Registration failed.");
            ParseBanInfo(msg);
            LogHelper.LogError($"Registration Failed: {msg}");
            LoginHint(msg);
            return false;
        }

        public bool webLogin(string user, string password)
        {
            if (!checkinit()) return false;

            if (lockout_active())
            {
                long secs = (long)(lockout_remaining_ms() / 1000);
                LogHelper.LogError($"Locked out due to multiple failed attempts. Try again in {secs}s.");
                return false;
            }

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "username", user },
                { "password", password }
            };

            var response = DoRequest("/web-login", payload);

            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                var data = response.ContainsKey("data") ? response["data"] as Dictionary<string, object> : null;
                if (data != null)
                {
                    session_token = data.ContainsKey("token") ? data["token"].ToString() : "";
                    LoadUserData(data.ContainsKey("user") ? data["user"] as Dictionary<string, object> : null);
                    reset_lockout();

                    if (!has_active_subscription())
                    {
                        LogHelper.LogError("Web Login Failed: Subscription has expired or is paused.");
                        session_token = "";
                        user_data.is_authenticated = false;
                        return false;
                    }

                    mark_authenticated();
                    LogHelper.LogInfo("Successfully logged in (Web)!");
                    return true;
                }
            }

            record_login_fail();
            Thread.Sleep(2000); // 2-second bad input delay

            string msg = (response == null) ? "No server response." : (response.ContainsKey("message") ? response["message"].ToString() : "Web login failed.");
            ParseBanInfo(msg);
            LogHelper.LogError($"Web Login Failed: {msg}");
            return false;
        }

        public bool registerWeb(string user, string email, string password, string licenseKey)
        {
            return registerAccount(user, email, password, licenseKey, "WEB_REGISTRATION");
        }

        public bool logout()
        {
            if (!checkinit()) return false;
            if (string.IsNullOrEmpty(session_token))
            {
                LogHelper.LogError("Not logged in.");
                return false;
            }

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "session_token", session_token }
            };

            var response = DoRequest("/logout", payload);

            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                string msg = response.ContainsKey("message") ? response["message"].ToString() : "Logged out.";
                LogHelper.LogInfo(msg);
                session_token = "";
                user_data = new UserData();
                return true;
            }

            string errMsg = (response == null) ? "No server response." : (response.ContainsKey("message") ? response["message"].ToString() : "Logout failed.");
            LogHelper.LogError(errMsg);
            return false;
        }

        // ─── Variable Management (Global & Per-User Variables) ───────────────────

        /// <summary>
        /// Fetches a Global Application Variable by name.
        /// If logged in, session_token is automatically included for authenticated variables.
        /// </summary>
        /// <param name="name">Name of the global variable set in the DexterAuth Dashboard.</param>
        /// <returns>String value of the variable, or empty string on failure.</returns>
        public string Var(string name)
        {
            if (!checkinit()) return "";

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "secret", client_secret },
                { "variable_name", name }
            };

            if (!string.IsNullOrEmpty(session_token))
            {
                payload["session_token"] = session_token;
            }

            var response = DoRequest("/var", payload);

            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                if (response.ContainsKey("data") && response["data"] is Dictionary<string, object> data)
                {
                    return data.ContainsKey("value") ? data["value"]?.ToString() ?? "" : "";
                }
            }
            return "";
        }

        /// <summary>
        /// Fetches a Per-User Variable for the currently logged in user session.
        /// </summary>
        /// <param name="key">Key/Name of the user variable.</param>
        /// <returns>String value of the user variable, or empty string if not found.</returns>
        public string GetUserVar(string key)
        {
            if (!checkinit()) return "";
            if (string.IsNullOrEmpty(session_token))
            {
                LogHelper.LogError("Session token required to fetch user variables. Please log in first.");
                return "";
            }

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "secret", client_secret },
                { "session_token", session_token },
                { "key", key }
            };

            var response = DoRequest("/vars/user/get", payload);

            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                if (response.ContainsKey("data") && response["data"] is Dictionary<string, object> data)
                {
                    return data.ContainsKey("value") ? data["value"]?.ToString() ?? "" : "";
                }
            }
            return "";
        }

        /// <summary>
        /// Creates or updates a Per-User Variable for the currently logged in user.
        /// </summary>
        /// <param name="key">Key/Name of the user variable.</param>
        /// <param name="value">Value to store for the user.</param>
        /// <returns>True if saved successfully, False if failed or read-only.</returns>
        public bool SetUserVar(string key, string value)
        {
            if (!checkinit()) return false;
            if (string.IsNullOrEmpty(session_token))
            {
                LogHelper.LogError("Session token required to set user variables. Please log in first.");
                return false;
            }

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "secret", client_secret },
                { "session_token", session_token },
                { "key", key },
                { "value", value }
            };

            var response = DoRequest("/vars/user/set", payload);
            return response != null && response.ContainsKey("status") && response["status"].ToString() == "success";
        }

        // ─── License Operations ──────────────────────────────────────────────────

        public bool upgrade(string user, string licenseKey)
        {
            if (!checkinit()) return false;

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "username", user },
                { "license_key", licenseKey }
            };

            var response = DoRequest("/upgrade", payload);

            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                string msg = response.ContainsKey("message") ? response["message"].ToString() : "License successfully applied!";
                LogHelper.LogInfo(msg);
                return true;
            }

            string errMsg = (response == null) ? "No response." : (response.ContainsKey("message") ? response["message"].ToString() : "Upgrade failed.");
            ParseBanInfo(errMsg);
            LogHelper.LogError($"Upgrade Failed: {errMsg}");
            return false;
        }

        // ─── Session Verification ───────────────────────────────────────────────

        public bool check()
        {
            if (!checkinit()) return false;
            if (string.IsNullOrEmpty(session_token))
            {
                return false;
            }

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "token", session_token }
            };

            var response = DoRequest("/verify-session", payload);
            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                if (response.ContainsKey("data") && response["data"] is Dictionary<string, object> data)
                {
                    bool isValid = false;
                    if (data.ContainsKey("is_valid"))
                    {
                        string val = data["is_valid"].ToString().ToLower();
                        isValid = (val == "true" || val == "1");
                    }
                    if (!isValid) return false;

                    if (data.ContainsKey("subscription") && data["subscription"] != null)
                    {
                        user_data.subscription = data["subscription"].ToString();
                    }
                    if (data.ContainsKey("expiry") && data["expiry"] != null)
                    {
                        user_data.expires = data["expiry"].ToString();
                    }
                }
                return true;
            }
            return false;
        }

        public bool verifyToken(string standaloneToken)
        {
            if (!checkinit()) return false;

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "token", standaloneToken }
            };

            var response = DoRequest("/verify-token", payload);

            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                LogHelper.LogInfo("Token is valid!");
                return true;
            }

            string msg = (response == null) ? "No response." : (response.ContainsKey("message") ? response["message"].ToString() : "Invalid or banned token.");
            ParseBanInfo(msg);
            LogHelper.LogError(msg);
            return false;
        }

        // ─── Account Management ──────────────────────────────────────────────────

        public bool changeUsername(string newUsername)
        {
            if (!checkinit()) return false;
            if (string.IsNullOrEmpty(session_token))
            {
                LogHelper.LogError("Must be logged in to change username.");
                return false;
            }

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "session_token", session_token },
                { "new_username", newUsername }
            };

            var response = DoRequest("/change-username", payload);

            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                string msg = response.ContainsKey("message") ? response["message"].ToString() : "Username changed!";
                LogHelper.LogInfo(msg);
                user_data.username = newUsername;
                return true;
            }

            string errMsg = (response == null) ? "No response." : (response.ContainsKey("message") ? response["message"].ToString() : "Failed.");
            LogHelper.LogError($"changeUsername Failed: {errMsg}");
            return false;
        }

        public bool forgot(string user, string newPassword, string hwid = "")
        {
            if (!checkinit()) return false;
            if (string.IsNullOrEmpty(hwid))
            {
                hwid = Others.GetHWID(hwid_method);
            }

            var payload = new Dictionary<string, object>
            {
                { "app_id", ownerid },
                { "username", user },
                { "hwid", hwid },
                { "new_password", newPassword }
            };

            var response = DoRequest("/forgot", payload);

            if (response != null && response.ContainsKey("status") && response["status"].ToString() == "success")
            {
                string msg = response.ContainsKey("message") ? response["message"].ToString() : "Password reset!";
                LogHelper.LogInfo(msg);
                return true;
            }

            string errMsg = (response == null) ? "No response." : (response.ContainsKey("message") ? response["message"].ToString() : "Failed.");
            LogHelper.LogError($"forgot Failed: {errMsg}");
            return false;
        }

        // ─── Subscription Helpers ────────────────────────────────────────────────

        public bool has_active_subscription()
        {
            return expiry_remaining() > 0.0;
        }

        public double expiry_remaining()
        {
            if (string.IsNullOrEmpty(user_data.expires))
            {
                return 0.0;
            }

            string s = user_data.expires.Trim();
            if (s == "Lifetime" || s == "N/A" || s == "never" || s == "Active")
            {
                return 4000000000.0; // Far future offset
            }

            // Check if UNIX timestamp
            if (long.TryParse(s, out long unixTime))
            {
                double diffSec = unixTime - (DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds;
                return diffSec > 0.0 ? diffSec : 0.0;
            }

            // Try standard ISO-8601 parsing natives
            if (DateTime.TryParse(s, out DateTime expTime))
            {
                double diffSec = (expTime.ToUniversalTime() - DateTime.UtcNow).TotalSeconds;
                return diffSec > 0.0 ? diffSec : 0.0;
            }

            return 4000000000.0; // Fallback to safe far future
        }

        public void mark_authenticated()
        {
            user_data.is_authenticated = true;
            user_data.auth_runtime_start = (DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds;
        }

        public void refresh_auth_runtime()
        {
            user_data.auth_runtime_start = (DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds;
        }

        public void reset_auth_runtime()
        {
            refresh_auth_runtime();
        }

        // ─── Host Whitelisting ───────────────────────────────────────────────────

        public void set_allowed_hosts(List<string> hosts)
        {
            allowed_hosts.Clear();
            allowed_hosts.AddRange(hosts);
        }

        public void add_allowed_host(string host)
        {
            if (!allowed_hosts.Contains(host))
            {
                allowed_hosts.Add(host);
            }
        }

        public void clear_allowed_hosts()
        {
            allowed_hosts.Clear();
        }

        public void set_pinned_public_keys(List<string> keys)
        {
            pinned_public_keys.Clear();
            pinned_public_keys.AddRange(keys);
        }

        public void add_pinned_public_key(string key)
        {
            if (!pinned_public_keys.Contains(key))
            {
                pinned_public_keys.Add(key);
            }
        }

        public void clear_pinned_public_keys()
        {
            pinned_public_keys.Clear();
        }

        public void add_pinned_cert(string sha256_hash)
        {
            if (string.IsNullOrEmpty(sha256_hash)) return;
            sha256_hash = sha256_hash.Trim().ToLower();
            if (!pinned_cert_hashes.Contains(sha256_hash))
            {
                pinned_cert_hashes.Add(sha256_hash);
            }
        }

        // ─── Secure Cryptography (XOR / Seal) ────────────────────────────────────

        public void enable_secure_strings()
        {
            secure_strings_enabled = true;
        }

        public void derive_secure_key(string material)
        {
            using (var sha = SHA256.Create())
            {
                secure_key = sha.ComputeHash(Encoding.UTF8.GetBytes(material));
            }
        }

        public string xor_crypt_field(string data, string key)
        {
            byte[] dataBytes = Encoding.UTF8.GetBytes(data);
            byte[] keyBytes = Encoding.UTF8.GetBytes(key);
            byte[] result = new byte[dataBytes.Length];

            for (int i = 0; i < dataBytes.Length; ++i)
            {
                result[i] = (byte)(dataBytes[i] ^ keyBytes[i % keyBytes.Length]);
            }

            return Encoding.UTF8.GetString(result);
        }

        public string compute_auth_seal(string payload)
        {
            if (secure_key == null || secure_key.Length == 0) return "";

            using (var hmac = new HMACSHA256(secure_key))
            {
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
                StringBuilder sb = new StringBuilder();
                foreach (byte b in hash)
                {
                    sb.Append(b.ToString("x2"));
                }
                return sb.ToString();
            }
        }

        // ─── Ban Monitor Loop ────────────────────────────────────────────────────

        public void start_ban_monitor(int intervalSeconds = 60)
        {
            lock (ban_monitor_lock)
            {
                if (ban_monitor_active) return;

                ban_monitor_active = true;
                ban_monitor_thread = new Thread(() => BanMonitorLoop(intervalSeconds))
                {
                    IsBackground = true
                };
                ban_monitor_thread.Start();

                if (debug)
                {
                    LogHelper.LogDebug("Ban monitor started.");
                }
            }
        }

        public void stop_ban_monitor()
        {
            lock (ban_monitor_lock)
            {
                if (!ban_monitor_active) return;
                ban_monitor_active = false;
                ban_monitor_thread = null;
            }
        }

        public bool ban_monitor_running()
        {
            lock (ban_monitor_lock)
            {
                return ban_monitor_active;
            }
        }

        private void BanMonitorLoop(int interval)
        {
            while (true)
            {
                lock (ban_monitor_lock)
                {
                    if (!ban_monitor_active) break;
                }

                if (!check())
                {
                    LogHelper.LogError("Session validation check failed! Stop monitor and shut down.");
                    Environment.Exit(1);
                    break;
                }

                // Sleep in small increments to respond quickly to shutdown request
                for (int i = 0; i < interval; ++i)
                {
                    lock (ban_monitor_lock)
                    {
                        if (!ban_monitor_active) break;
                    }
                    Thread.Sleep(1000);
                }
            }
        }

        // ─── Lockouts & Rate Limiting ────────────────────────────────────────────

        public void record_login_fail()
        {
            login_fails++;
            if (login_fails >= 3)
            {
                lockout_end = (DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds + 300.0; // 5 minute lockout
            }
        }

        public bool lockout_active()
        {
            double now = (DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds;
            if (now < lockout_end)
            {
                return true;
            }
            if (lockout_end > 0.0 && now >= lockout_end)
            {
                reset_lockout();
            }
            return false;
        }

        public long lockout_remaining_ms()
        {
            if (!lockout_active())
            {
                return 0;
            }
            double now = (DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds;
            double diff = lockout_end - now;
            return diff > 0.0 ? (long)(diff * 1000.0) : 0;
        }

        public void reset_lockout()
        {
            login_fails = 0;
            lockout_end = 0.0;
        }

        public void setDebug(bool enable)
        {
            debug = enable;
        }

        public Dictionary<string, string> debugInfo()
        {
            string safeSession = string.IsNullOrEmpty(session_token) ? "" : (session_token.Length > 12 ? session_token.Substring(0, 12) + "..." : session_token);
            return new Dictionary<string, string>
            {
                { "debug_enabled", debug ? "true" : "false" },
                { "hash_mode", string.IsNullOrEmpty(client_secret) ? "OFF" : "SECURE" },
                { "lockout_active", lockout_active() ? "true" : "false" },
                { "login_fails", login_fails.ToString() },
                { "session", safeSession },
                { "hash", hash_to_check },
                { "hwid_method", hwid_method }
            };
        }

        // ─── Private Request Core ────────────────────────────────────────────────

        private bool checkinit()
        {
            if (!initialized)
            {
                LogHelper.LogError("SDK not initialised. Ensure API constructor completes successfully.");
                return false;
            }
            return true;
        }

        private Dictionary<string, object> DoRequest(string endpoint, Dictionary<string, object> postData)
        {
            try
            {
                Uri uri = new Uri(api_url);
                string host = uri.Host;

                // Host Whitelisting Check
                if (allowed_hosts.Count > 0 && !allowed_hosts.Contains(host))
                {
                    LogHelper.LogError($"Security violation: blocked connection to {host}");
                    last_message = $"Security violation: blocked connection to {host}";
                    return null;
                }

                string requestUrl = api_url.TrimEnd('/') + endpoint;
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(requestUrl);
                request.Method = "POST";
                request.ContentType = "application/json";
                request.UserAgent = $"DexterAuth-SDK-CS/1.0 ({name} v{version})";
                request.Timeout = 5000;
                request.ReadWriteTimeout = 5000;

                // ── TLS Certificate Pinning Verification ───────────────────────
                if (pinned_cert_hashes.Count > 0)
                {
                    request.ServerCertificateValidationCallback = (sender, cert, chain, errors) =>
                    {
                        if (errors != System.Net.Security.SslPolicyErrors.None)
                        {
                            LogHelper.LogError($"[SECURITY] TLS Policy Error detected: {errors}");
                            return false;
                        }

                        if (chain == null || chain.ChainElements.Count == 0)
                        {
                            LogHelper.LogError("[SECURITY] Certificate chain is empty.");
                            return false;
                        }

                        bool pinMatched = false;
                        List<string> actualHashes = new List<string>();

                        foreach (var element in chain.ChainElements)
                        {
                            try
                            {
                                byte[] rawData = element.Certificate.RawData;
                                using (SHA256 sha256 = SHA256.Create())
                                {
                                    byte[] hashBytes = sha256.ComputeHash(rawData);
                                    string actualHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
                                    actualHashes.Add(actualHash);

                                    if (pinned_cert_hashes.Contains(actualHash))
                                    {
                                        pinMatched = true;
                                        break; // Valid root/intermediate/leaf found!
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                LogHelper.LogError($"Error hashing chain certificate: {ex.Message}");
                            }
                        }

                        if (!pinMatched)
                        {
                            LogHelper.LogError("[SECURITY] TLS Certificate Chain Pinning FAILED! MITM Detected.");
                            foreach (var h in actualHashes)
                            {
                                LogHelper.LogError($"[SECURITY] Chain Cert Hash: {h}");
                            }
                            // Hard terminate the application
                            Environment.Exit(1);
                            return false;
                        }

                        return true;
                    };
                }

                string postDataStr = SimpleJson.Serialize(postData);

                if (debug)
                {
                    // Obfuscate password in debug logs
                    var safeData = new Dictionary<string, object>(postData);
                    if (safeData.ContainsKey("password"))
                    {
                        safeData["password"] = "***";
                    }
                    LogHelper.LogDebug($"→ POST {endpoint} {SimpleJson.Serialize(safeData)}");
                }

                byte[] postBytes = Encoding.UTF8.GetBytes(postDataStr);
                request.ContentLength = postBytes.Length;

                using (Stream requestStream = request.GetRequestStream())
                {
                    requestStream.Write(postBytes, 0, postBytes.Length);
                }

                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    using (StreamReader reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
                    {
                        string respStr = reader.ReadToEnd();

                        // ── SRP (Signed Response Protocol) Verification ──────────────
                        if (!string.IsNullOrEmpty(client_secret))
                        {
                            string sigHeader = response.Headers["X-Response-Sig"];
                            string nonceHeader = response.Headers["X-Response-Nonce"];

                            if (string.IsNullOrEmpty(sigHeader) || string.IsNullOrEmpty(nonceHeader))
                            {
                                LogHelper.LogError("[SECURITY] Missing SRP headers from server! MITM Interception Detected.");
                                Environment.Exit(1);
                            }

                            string canonicalBody;
                            try
                            {
                                canonicalBody = SimpleJson.SerializeCanonical(SimpleJson.Deserialize(respStr));
                            }
                            catch
                            {
                                canonicalBody = respStr;
                            }

                            using (HMACSHA256 hmac = new HMACSHA256(Encoding.UTF8.GetBytes(client_secret)))
                            {
                                string payload = $"{canonicalBody}:{nonceHeader}";
                                byte[] hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
                                string expectedSig = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();

                                if (expectedSig != sigHeader.ToLower())
                                {
                                    LogHelper.LogError("[SECURITY] SRP Signature mismatch! Server response was spoofed.");
                                    LogHelper.LogError($"[SRP] client_secret: {client_secret}");
                                    LogHelper.LogError($"[SRP] payload: {payload}");
                                    LogHelper.LogError($"[SRP] expected_sig: {expectedSig}");
                                    LogHelper.LogError($"[SRP] sig_header: {sigHeader}");
                                    LogHelper.LogError($"[SRP] nonce_header: {nonceHeader}");
                                    Environment.Exit(1);
                                }
                            }
                        }
                        // ─────────────────────────────────────────────────────────────

                        if (debug)
                        {
                            string safeResp = respStr.Length > 200 ? respStr.Substring(0, 200) + "..." : respStr;
                            LogHelper.LogDebug($"← {safeResp}");
                        }

                        return SimpleJson.Deserialize(respStr) as Dictionary<string, object>;
                    }
                }
            }
            catch (WebException wex)
            {
                string errMsg = wex.Message;
                if (wex.Response != null)
                {
                    try
                    {
                        using (StreamReader reader = new StreamReader(wex.Response.GetResponseStream(), Encoding.UTF8))
                        {
                            string respStr = reader.ReadToEnd();
                            var errorJson = SimpleJson.Deserialize(respStr) as Dictionary<string, object>;
                            if (errorJson != null && errorJson.ContainsKey("message"))
                            {
                                errMsg = errorJson["message"].ToString();
                            }
                        }
                    }
                    catch { }
                }

                LogHelper.LogError($"Network request error: {errMsg}");
                last_message = errMsg;
                return null;
            }
            catch (Exception ex)
            {
                LogHelper.LogError($"Request Exception: {ex.Message}");
                last_message = ex.Message;
                return null;
            }
        }

        private void LoadUserData(Dictionary<string, object> data)
        {
            if (data == null) return;

            user_data.username = data.ContainsKey("username") ? data["username"].ToString() : "";
            user_data.hwid = data.ContainsKey("hwid") ? data["hwid"].ToString() : "N/A";
            user_data.createdate = data.ContainsKey("created_at") ? data["created_at"].ToString() : "";
            user_data.lastlogin = data.ContainsKey("last_login") ? data["last_login"].ToString() : "";

            user_data.subscriptions.Clear();
            if (data.ContainsKey("subscriptions") && data["subscriptions"] is List<object> subs)
            {
                foreach (var sObj in subs)
                {
                    if (sObj is Dictionary<string, object> s)
                    {
                        SubscriptionInfo info = new SubscriptionInfo
                        {
                            subscription = s.ContainsKey("subscription") ? s["subscription"].ToString() : "",
                            expiry = s.ContainsKey("expiry") ? s["expiry"].ToString() : ""
                        };
                        user_data.subscriptions.Add(info);
                    }
                }
            }

            if (user_data.subscriptions.Count > 0)
            {
                user_data.expires = user_data.subscriptions[0].expiry;
                user_data.subscription = user_data.subscriptions[0].subscription;
            }
            else
            {
                user_data.expires = "";
                user_data.subscription = "";
            }
        }

        private void ParseBanInfo(string msg)
        {
            ban_reason = "";
            ban_revoke_date = "";

            if (string.IsNullOrEmpty(msg) || (!msg.Contains("Account is Banned") && !msg.Contains("License is Banned")))
            {
                return;
            }

            int reasonIndex = msg.IndexOf("Reason:");
            if (reasonIndex != -1)
            {
                reasonIndex += 7;
                int barIndex = msg.IndexOf("|", reasonIndex);
                if (barIndex != -1)
                {
                    ban_reason = msg.Substring(reasonIndex, barIndex - reasonIndex).Trim();
                }
                else
                {
                    ban_reason = msg.Substring(reasonIndex).Trim();
                }
            }

            int expiresIndex = msg.IndexOf("Expires:");
            if (expiresIndex != -1)
            {
                expiresIndex += 8;
                ban_revoke_date = msg.Substring(expiresIndex).Trim();
            }
        }

        private void LoginHint(string msg)
        {
            string lmsg = msg.ToLower();

            if (lmsg.Contains("signature") || lmsg.Contains("hmac"))
            {
                LogHelper.LogWarn("[ANTI-TAMPER] HMAC verification failed. Possible causes:\n" +
                                  "  1. client_secret is wrong — copy it exactly from the dashboard.\n" +
                                  "  2. System clock is more than 5 minutes off — sync your clock.");
            }
            else if (lmsg.Contains("application not found"))
            {
                LogHelper.LogError("[SETUP ERROR] ownerid (App ID) is wrong.\n" +
                                   "  Resolution: copy the exact App ID from DexterAuth Dashboard → App Info.");
            }
            else if (lmsg.Contains("hardware id mismatch"))
            {
                LogHelper.LogWarn("[USER] HWID changed. Admin must reset HWID in the dashboard.");
            }
            else if (lmsg.Contains("subscription has expired"))
            {
                LogHelper.LogWarn("[USER] Subscription expired. Purchase a new license key.");
            }
            else if (lmsg.Contains("application is currently disabled"))
            {
                LogHelper.LogError("[SETUP ERROR] App is disabled in the dashboard.\n" +
                                   "  Resolution: Dashboard → Select App → Enable.");
            }
            else if (lmsg.Contains("replay") || lmsg.Contains("nonce"))
            {
                LogHelper.LogError("[SECURITY] Replay attack blocked. Each request must use a fresh nonce.\n" +
                                   "  This error means someone is trying to re-use a captured packet.");
            }
        }

        private string GenerateNonce(int len)
        {
            const string hexChars = "0123456789abcdef";
            var bytes = new byte[len];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
            }
            StringBuilder sb = new StringBuilder(len);
            foreach (byte b in bytes)
            {
                sb.Append(hexChars[b % 16]);
            }
            return sb.ToString();
        }

        private Tuple<string, string, string> ComputeHashSignature()
        {
            string timestamp = ((long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds).ToString();
            string nonce = GenerateNonce(32);
            string dataToSign = hash_to_check + ":" + timestamp + ":" + nonce;

            byte[] keyBytes = Encoding.UTF8.GetBytes(client_secret);
            byte[] dataBytes = Encoding.UTF8.GetBytes(dataToSign);

            using (var hmac = new HMACSHA256(keyBytes))
            {
                byte[] hash = hmac.ComputeHash(dataBytes);
                StringBuilder sb = new StringBuilder();
                foreach (byte b in hash)
                {
                    sb.Append(b.ToString("x2"));
                }
                return Tuple.Create(sb.ToString(), timestamp, nonce);
            }
        }

        private Dictionary<string, object> BuildHashPayload()
        {
            var payload = new Dictionary<string, object>
            {
                { "hash", hash_to_check }
            };

            if (!string.IsNullOrEmpty(client_secret))
            {
                var sigTuple = ComputeHashSignature();
                payload["hash_signature"] = sigTuple.Item1;
                payload["hash_timestamp"] = sigTuple.Item2;
                payload["hash_nonce"] = sigTuple.Item3;
            }

            return payload;
        }

        // ─── Auto-Updater ────────────────────────────────────────────────────────

        public static string GetCurrentExecutablePath()
        {
            try
            {
                string path = Process.GetCurrentProcess().MainModule?.FileName;
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                {
                    return path;
                }
            }
            catch { }

            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string friendlyName = AppDomain.CurrentDomain.FriendlyName;
                string combined = Path.Combine(baseDir, friendlyName);
                if (File.Exists(combined)) return combined;
            }
            catch { }

            return Environment.GetCommandLineArgs()[0];
        }

        public static void HandleUpdateStage()
        {
            try
            {
                string[] args = Environment.GetCommandLineArgs();
                int finishIndex = Array.IndexOf(args, "--dexterauth-update-finish");
                if (finishIndex == -1 || finishIndex + 1 >= args.Length) return;

                string targetPath = args[finishIndex + 1];
                if (string.IsNullOrEmpty(targetPath)) return;

                string currentPath = GetCurrentExecutablePath();
                if (string.IsNullOrEmpty(currentPath)) return;

                // Wait until targetPath process exits and releases file lock (up to 10s)
                int retries = 50;
                while (retries-- > 0)
                {
                    try
                    {
                        using (FileStream fs = File.Open(targetPath, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
                        {
                            break;
                        }
                    }
                    catch
                    {
                        Thread.Sleep(200);
                    }
                }

                string backupPath = targetPath + ".old";
                if (File.Exists(backupPath))
                {
                    try { File.Delete(backupPath); } catch { }
                }

                File.Move(targetPath, backupPath);
                File.Move(currentPath, targetPath);

                // Spawn original application process
                Process.Start(new ProcessStartInfo
                {
                    FileName = targetPath,
                    UseShellExecute = true
                });

                Environment.Exit(0);
            }
            catch (Exception ex)
            {
                LogHelper.LogError($"[AUTO-UPDATE STAGE 2 ERROR] {ex.Message}");
            }
        }

        private (bool isValid, string errorMessage) ValidateDownloadUrl(string url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return (false, "No download URL provided. Set the auto_update_link in your DexterAuth Dashboard.");

            if (!url.StartsWith("http://") && !url.StartsWith("https://"))
                return (false, $"Invalid URL format: '{url}'. URL must start with http:// or https://.");

            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Method = "HEAD";
                req.UserAgent = $"DexterAuth-SDK-CSharp/1.0 ({name} v{version})";
                req.AllowAutoRedirect = true;
                req.Timeout = 10000;

                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    int status = (int)resp.StatusCode;

                    if (status == 404)
                        return (false,
                            $"Download URL returned 404 Not Found.\n" +
                            $"  URL: {url}\n" +
                            $"  \u2192 The file may have been deleted or the URL is incorrect.\n" +
                            $"  \u2192 Please upload the update file and set the correct URL in your Dashboard.");

                    if (status == 403)
                        return (false,
                            $"Download URL returned 403 Forbidden.\n" +
                            $"  URL: {url}\n" +
                            $"  \u2192 The server is blocking access. Check file permissions or use a public link.");

                    if (status >= 400)
                        return (false,
                            $"Download URL returned HTTP {status}.\n" +
                            $"  URL: {url}\n" +
                            $"  \u2192 Please verify the URL is correct and the file is publicly accessible.");

                    string ct = resp.ContentType?.ToLower() ?? "";
                    if (ct.Contains("text/html"))
                        return (false,
                            $"The URL does not point to a direct file download.\n" +
                            $"  URL: {url}\n" +
                            $"  Content-Type received: {ct}\n" +
                            $"  \ud83d\udca1 Tip: Use a direct download link, not a webpage URL.\n" +
                            $"      Example: https://example.com/files/myapp-v2.0 (no HTML, no login page)");

                    return (true, "");
                }
            }
            catch (WebException wex) when (wex.Response is HttpWebResponse errResp)
            {
                int status = (int)errResp.StatusCode;
                if (status == 404)
                    return (false,
                        $"Download URL returned 404 Not Found.\n" +
                        $"  URL: {url}\n" +
                        $"  \u2192 Upload the update file and set the correct URL in your Dashboard.");
                return (false,
                    $"Server returned HTTP {status}.\n" +
                    $"  URL: {url}\n" +
                    $"  \u2192 Please verify the URL is correct and the file is publicly accessible.");
            }
            catch (Exception ex)
            {
                return (false,
                    $"Could not reach the download URL.\n" +
                    $"  URL: {url}\n" +
                    $"  Error: {ex.Message}\n" +
                    $"  \u2192 Check your internet connection and verify the URL is reachable.");
            }
        }

        private bool DownloadFileHttp(string url, string targetPath)
        {
            if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(targetPath)) return false;

            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                request.Method = "GET";
                request.UserAgent = $"DexterAuth-SDK-CSharp/1.0 ({name} v{version})";
                request.AllowAutoRedirect = true;
                request.Timeout = 15000;

                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    if (response.StatusCode == HttpStatusCode.OK)
                    {
                        long totalBytes   = response.ContentLength; // -1 if unknown
                        long downloaded   = 0;
                        int  lastPct      = -1;

                        using (Stream inputStream = response.GetResponseStream())
                        using (FileStream outputStream = File.Create(targetPath))
                        {
                            byte[] buffer = new byte[65536];
                            int bytesRead;
                            while ((bytesRead = inputStream.Read(buffer, 0, buffer.Length)) > 0)
                            {
                                outputStream.Write(buffer, 0, bytesRead);
                                downloaded += bytesRead;

                                if (totalBytes > 0)
                                {
                                    int pct = (int)(downloaded * 100L / totalBytes);
                                    if (pct != lastPct)
                                    {
                                        int filled = pct / 5;
                                        string bar = new string('█', filled) + new string('░', 20 - filled);
                                        double mbDone  = downloaded / (1024.0 * 1024.0);
                                        double mbTotal = totalBytes  / (1024.0 * 1024.0);
                                        Console.Write($"\r  [{bar}] {pct,3}%  {mbDone:F1} / {mbTotal:F1} MB");
                                        lastPct = pct;
                                    }
                                }
                                else
                                {
                                    double mbDone = downloaded / (1024.0 * 1024.0);
                                    Console.Write($"\r  Downloading... {mbDone:F1} MB");
                                }
                            }
                        }

                        Console.WriteLine(); // newline after progress bar
                        FileInfo fi = new FileInfo(targetPath);
                        return fi.Exists && fi.Length > 0;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(); // newline if progress was mid-line
                LogHelper.LogError($"[DOWNLOAD ERROR] Failed to download update: {ex.Message}");
            }
            return false;
        }

        public UpdateInfo CheckForUpdates()
        {
            UpdateInfo info = new UpdateInfo
            {
                current_version = version
            };

            try
            {
                var payload = new Dictionary<string, object>
                {
                    { "app_id", ownerid },
                    { "name", name },
                    { "version", version },
                    { "secret", string.IsNullOrEmpty(client_secret) ? "NO_SECRET" : client_secret }
                };

                string latestVer = "";
                string dlUrl = "";
                string fileN = "";

                string CleanVer(string v)
                {
                    if (string.IsNullOrEmpty(v)) return "";
                    v = v.Trim();
                    if (v.StartsWith("v", StringComparison.OrdinalIgnoreCase))
                    {
                        v = v.Substring(1);
                    }
                    return v;
                }

                // 1. Query /file/latest first — authoritative latest release file info from Files manager
                var fileRes = DoRequest("/file/latest", payload);
                if (fileRes != null && fileRes.ContainsKey("status") && fileRes["status"]?.ToString() == "success")
                {
                    var data = fileRes.ContainsKey("data") ? fileRes["data"] as Dictionary<string, object> : null;
                    var fileObj = data != null && data.ContainsKey("file") ? data["file"] as Dictionary<string, object> : null;
                    if (fileObj != null)
                    {
                        if (fileObj.ContainsKey("version_tag") && fileObj["version_tag"] != null)
                        {
                            latestVer = fileObj["version_tag"].ToString();
                        }
                        if (fileObj.ContainsKey("download_url") && fileObj["download_url"] != null)
                        {
                            dlUrl = fileObj["download_url"].ToString();
                        }
                        if (fileObj.ContainsKey("name") && fileObj["name"] != null)
                        {
                            fileN = fileObj["name"].ToString();
                        }
                    }
                }

                // 2. Query /init endpoint as fallback/enrichment
                var response = DoRequest("/init", payload);
                string initVer = "";
                if (response != null && response.ContainsKey("status") && response["status"]?.ToString() == "success")
                {
                    var appInfo = response.ContainsKey("app_info") ? response["app_info"] as Dictionary<string, object> : null;
                    if (appInfo != null)
                    {
                        initVer = appInfo.ContainsKey("version") && appInfo["version"] != null ? appInfo["version"].ToString() : "";
                        if (string.IsNullOrEmpty(latestVer) || (!string.IsNullOrEmpty(initVer) && CleanVer(initVer) != CleanVer(version)))
                        {
                            latestVer = initVer;
                        }
                        if (string.IsNullOrEmpty(dlUrl))
                        {
                            dlUrl = appInfo.ContainsKey("auto_update_link") && appInfo["auto_update_link"] != null ? appInfo["auto_update_link"].ToString() : "";
                        }
                    }
                }

                info.latest_version = string.IsNullOrEmpty(latestVer) ? (string.IsNullOrEmpty(initVer) ? version : initVer) : latestVer;
                info.file_name = fileN;

                string cleanCurrent = CleanVer(version);
                string cleanLatest = CleanVer(info.latest_version);
                string cleanInit = CleanVer(initVer);

                if ((!string.IsNullOrEmpty(info.latest_version) && cleanLatest != cleanCurrent) ||
                    (!string.IsNullOrEmpty(cleanInit) && cleanInit != cleanCurrent))
                {
                    info.update_available = true;
                }

                // Always target the Latest Mark release endpoint (/download/latest/:appName) for auto-update
                dlUrl = $"{api_url}/download/latest/{name}";
                info.download_url = dlUrl;
            }
            catch (Exception ex)
            {
                LogHelper.LogError($"[AUTO-UPDATE] Exception in CheckForUpdates: {ex.Message}");
                info.download_url = $"{api_url}/download/latest/{name}";
                info.update_available = true;
            }

            this.update_info = info;
            return info;
        }

        public bool PerformUpdate(UpdateInfo info)
        {
            if (info == null || !info.update_available || string.IsNullOrEmpty(info.download_url))
            {
                LogHelper.LogError("[AUTO-UPDATE] Cannot install update: download URL empty or update not available.");
                return false;
            }

            string currentExe = GetCurrentExecutablePath();
            if (string.IsNullOrEmpty(currentExe))
            {
                LogHelper.LogError("[AUTO-UPDATE] Could not determine current binary path.");
                return false;
            }

            string backupExe = currentExe + ".old";

            LogHelper.LogInfo($"[AUTO-UPDATE] Preparing file update for: {currentExe}");
            LogHelper.LogInfo($"[AUTO-UPDATE] Renaming current binary to backup: {backupExe}");

            try
            {
                if (File.Exists(backupExe)) File.Delete(backupExe);
                File.Move(currentExe, backupExe);
            }
            catch (Exception ex)
            {
                LogHelper.LogWarning($"[AUTO-UPDATE] Rename self to .old failed ({ex.Message}). Attempting direct overwrite...");
            }

            LogHelper.LogInfo($"[AUTO-UPDATE] Downloading update from: {info.download_url}");
            bool downloadOk = DownloadFileHttp(info.download_url, currentExe);

            // If initial download fails or file is not found, wait 10 seconds and retry one last time
            if (!downloadOk)
            {
                LogHelper.LogWarning("[AUTO-UPDATE] File download failed or not found! Waiting 10 seconds before final retry attempt...");
                Thread.Sleep(10000);

                string latestFallback = $"{api_url}/download/latest/{name}";
                LogHelper.LogInfo($"[AUTO-UPDATE] Retrying final download attempt from: {latestFallback}");
                downloadOk = DownloadFileHttp(latestFallback, currentExe);
            }

            if (!downloadOk)
            {
                LogHelper.LogError("[AUTO-UPDATE] Final download retry failed! No latest release file available. Restoring backup and exiting...");
                try
                {
                    if (File.Exists(backupExe))
                    {
                        if (File.Exists(currentExe)) File.Delete(currentExe);
                        File.Move(backupExe, currentExe);
                    }
                }
                catch { }
                Environment.Exit(1);
                return false;
            }

            LogHelper.LogInfo("[AUTO-UPDATE] Download completed successfully! Launching updated executable...");

            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = currentExe,
                    UseShellExecute = true
                });

                LogHelper.LogInfo("[AUTO-UPDATE] Updated executable launched successfully. Exiting old process...");
                Environment.Exit(0);
                return true;
            }
            catch (Exception ex)
            {
                LogHelper.LogError($"[AUTO-UPDATE] Failed to launch updated executable: {ex.Message}");
                return false;
            }
        }
    }

    public static class SimpleJson
    {
        public static object Deserialize(string json)
        {
            if (string.IsNullOrEmpty(json)) return null;
            json = json.Trim();
            int index = 0;
            return ParseValue(json, ref index);
        }

        public static string Serialize(object obj)
        {
            if (obj == null) return "null";
            if (obj is string s) return "\"" + EscapeString(s) + "\"";
            if (obj is bool b) return b ? "true" : "false";
            if (obj is double || obj is float || obj is int || obj is long) return obj.ToString();
            
            if (obj is IDictionary<string, object> dict)
            {
                StringBuilder sb = new StringBuilder();
                sb.Append("{");
                bool first = true;
                foreach (var pair in dict)
                {
                    if (!first) sb.Append(",");
                    first = false;
                    sb.Append("\"").Append(EscapeString(pair.Key)).Append("\":").Append(Serialize(pair.Value));
                }
                sb.Append("}");
                return sb.ToString();
            }

            if (obj is System.Collections.IEnumerable list)
            {
                StringBuilder sb = new StringBuilder();
                sb.Append("[");
                bool first = true;
                foreach (var val in list)
                {
                    if (!first) sb.Append(",");
                    first = false;
                    sb.Append(Serialize(val));
                }
                sb.Append("]");
                return sb.ToString();
            }

            return "\"" + EscapeString(obj.ToString()) + "\"";
        }

        public static string SerializeCanonical(object obj)
        {
            if (obj == null) return "null";
            if (obj is string s) return "\"" + EscapeString(s) + "\"";
            if (obj is bool b) return b ? "true" : "false";
            if (obj is double || obj is float || obj is int || obj is long) return obj.ToString();
            
            if (obj is IDictionary<string, object> dict)
            {
                var sortedKeys = new List<string>(dict.Keys);
                sortedKeys.Sort(StringComparer.Ordinal);
                StringBuilder sb = new StringBuilder();
                sb.Append("{");
                bool first = true;
                foreach (var key in sortedKeys)
                {
                    if (!first) sb.Append(",");
                    first = false;
                    sb.Append("\"").Append(EscapeString(key)).Append("\":").Append(SerializeCanonical(dict[key]));
                }
                sb.Append("}");
                return sb.ToString();
            }

            if (obj is System.Collections.IEnumerable list)
            {
                StringBuilder sb = new StringBuilder();
                sb.Append("[");
                bool first = true;
                foreach (var val in list)
                {
                    if (!first) sb.Append(",");
                    first = false;
                    sb.Append(SerializeCanonical(val));
                }
                sb.Append("]");
                return sb.ToString();
            }

            return "\"" + EscapeString(obj.ToString()) + "\"";
        }

        private static string EscapeString(string s)
        {
            StringBuilder sb = new StringBuilder();
            foreach (char c in s)
            {
                if (c == '"') sb.Append("\\\"");
                else if (c == '\\') sb.Append("\\\\");
                else if (c == '\n') sb.Append("\\n");
                else if (c == '\r') sb.Append("\\r");
                else if (c == '\t') sb.Append("\\t");
                else if (c < 32) sb.Append(string.Format("\\u{0:x4}", (int)c));
                else sb.Append(c);
            }
            return sb.ToString();
        }

        private static object ParseValue(string json, ref int index)
        {
            SkipWhitespace(json, ref index);
            if (index >= json.Length) return null;

            char c = json[index];
            if (c == '{') return ParseObject(json, ref index);
            if (c == '[') return ParseArray(json, ref index);
            if (c == '"') return ParseString(json, ref index);
            if (char.IsDigit(c) || c == '-') return ParseNumber(json, ref index);
            if (c == 't' || c == 'f') return ParseBool(json, ref index);
            if (c == 'n') { index += 4; return null; }

            throw new Exception("Invalid JSON token at " + index);
        }

        private static Dictionary<string, object> ParseObject(string json, ref int index)
        {
            var dict = new Dictionary<string, object>();
            index++; // skip '{'
            SkipWhitespace(json, ref index);

            while (index < json.Length && json[index] != '}')
            {
                if (json[index] == ',') { index++; SkipWhitespace(json, ref index); }
                if (json[index] == '}') break;

                string key = ParseString(json, ref index);
                SkipWhitespace(json, ref index);
                if (json[index] != ':') throw new Exception("Expected ':'");
                index++; // skip ':'

                object val = ParseValue(json, ref index);
                dict[key] = val;
                SkipWhitespace(json, ref index);
            }
            if (index < json.Length) index++; // skip '}'
            return dict;
        }

        private static List<object> ParseArray(string json, ref int index)
        {
            var list = new List<object>();
            index++; // skip '['
            SkipWhitespace(json, ref index);

            while (index < json.Length && json[index] != ']')
            {
                if (json[index] == ',') { index++; SkipWhitespace(json, ref index); }
                if (json[index] == ']') break;

                list.Add(ParseValue(json, ref index));
                SkipWhitespace(json, ref index);
            }
            if (index < json.Length) index++; // skip ']'
            return list;
        }

        private static string ParseString(string json, ref int index)
        {
            index++; // skip '"'
            StringBuilder sb = new StringBuilder();
            while (index < json.Length && json[index] != '"')
            {
                char c = json[index];
                if (c == '\\')
                {
                    index++;
                    if (index >= json.Length) break;
                    char esc = json[index];
                    if (esc == 'n') sb.Append('\n');
                    else if (esc == 'r') sb.Append('\r');
                    else if (esc == 't') sb.Append('\t');
                    else sb.Append(esc);
                }
                else
                {
                    sb.Append(c);
                }
                index++;
            }
            if (index < json.Length) index++; // skip '"'
            return sb.ToString();
        }

        private static object ParseNumber(string json, ref int index)
        {
            int start = index;
            while (index < json.Length && (char.IsDigit(json[index]) || json[index] == '.' || json[index] == '-' || json[index] == 'e' || json[index] == 'E' || json[index] == '+'))
            {
                index++;
            }
            string s = json.Substring(start, index - start);
            if (s.Contains(".")) return double.Parse(s, System.Globalization.CultureInfo.InvariantCulture);
            return long.Parse(s);
        }

        private static bool ParseBool(string json, ref int index)
        {
            if (json[index] == 't') { index += 4; return true; }
            index += 5;
            return false;
        }

        private static void SkipWhitespace(string json, ref int index)
        {
            while (index < json.Length && char.IsWhiteSpace(json[index])) index++;
        }
    }

    public static class Obfuscator
    {
        private static readonly byte[] Key = new byte[] { 0x4F, 0xBD, 0x2A, 0x76, 0x9C, 0xE1, 0x38, 0x5B };

        public static string Decrypt(byte[] data)
        {
            byte[] decrypted = new byte[data.Length];
            for (int i = 0; i < data.Length; i++)
            {
                decrypted[i] = (byte)(data[i] ^ Key[i % Key.Length]);
            }
            return Encoding.UTF8.GetString(decrypted);
        }
    }
}
