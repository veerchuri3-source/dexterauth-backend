"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { devApi } from "../lib/api";
import { Users, Key, Activity, Ticket, CreditCard, MonitorPlay, ArrowUpRight, TrendingUp, Shield, Database, Zap, CheckCircle2, XCircle, Loader2, AlertTriangle, Clock } from "lucide-react";

interface OverviewProps {
  appId: string;
  appName: string;
  ownerId?: string;
  version?: string;
}

interface OverviewStats {
  totalUsers: number;
  totalLicenses: number;
  usedLicenses: number;
  unusedLicenses: number;
  activeSessions: number;
  totalTokens: number;
  totalSubscriptions: number;
  bannedUsers: number;
  appStatus: boolean;
  appName: string;
  health: {
    api: boolean;
    database: boolean;
    licenseVerification: boolean;
  };
  cloudflareDomain?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor: string;
  delay: number;
}

interface StatusItemProps {
  label: string;
  healthy: boolean;
  isPaused?: boolean;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, accentColor, delay }) => {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/20">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ring-1 ring-border`} style={{ background: `${accentColor}14` }}>
          {icon}
        </div>
        <span className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-muted text-muted-foreground">
          <ArrowUpRight className="w-3 h-3" />
          Live
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      </div>
    </div>
  );
};

const StatusItem: React.FC<StatusItemProps> = ({ label, healthy, isPaused, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className="flex items-center justify-between py-3 border-b border-border last:border-0"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-2 w-2">
          {isPaused ? (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          ) : (
            <>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${healthy ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </>
          )}
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {isPaused ? (
          <>
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-500">Paused</span>
          </>
        ) : healthy ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">Operational</span>
          </>
        ) : (
          <>
            <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">Down</span>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default function Overview({ appId, appName, ownerId, version }: OverviewProps) {
  const [stats, setStats] = useState<OverviewStats | null>(() => {
    try {
      const cached = sessionStorage.getItem(`overview:${appId}`);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(() => {
    try { return !sessionStorage.getItem(`overview:${appId}`); } catch { return true; }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<'cpp' | 'python' | 'csharp'>('cpp');

  useEffect(() => {
    if (!appId) return;
    // Try to hydrate from cache instantly
    try {
      const cached = sessionStorage.getItem(`overview:${appId}`);
      if (cached) { setStats(JSON.parse(cached)); setLoading(false); }
    } catch {}
    fetchStats();
    // Keep backend cache warm
    const id = setInterval(fetchStats, 15000);
    return () => clearInterval(id);
  }, [appId]);

  const fetchStats = async () => {
    const hasCache = !!stats || (()=>{ try{return !!sessionStorage.getItem(`overview:${appId}`)}catch{return false} })();
    if (!hasCache) setLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const res = await devApi.getOverviewStats(appId);
      if (res.status === 'success') {
        setStats(res.data);
        try { sessionStorage.setItem(`overview:${appId}`, JSON.stringify(res.data)); } catch {}
      }
    } catch (err: any) {
      console.error("Failed to fetch overview stats", err);
      if (!hasCache) {
        if (err.response?.status === 429) setError("rate_limited");
        else setError("Failed to load overview data.");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  if (!appId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground/70 text-lg">
        Please select an application from Manage Apps first.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">Loading analytics...</p>
      </div>
    );
  }

  if (error === "rate_limited") {
    return (
      <div className="w-full flex flex-col items-center justify-center h-64 gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-8 max-w-xl mx-auto text-center">
        <AlertTriangle className="w-8 h-8 text-yellow-500" />
        <h3 className="text-lg font-bold text-yellow-500">Rate Limited</h3>
        <p className="text-sm text-muted-foreground">You are making too many requests. Please wait a moment.</p>
        <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 rounded-md text-xs font-semibold">
          Retry Sync
        </button>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="w-full flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <div className="bg-muted/40 border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between dark:bg-neutral-900 dark:border-neutral-800">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 dark:text-neutral-400">API Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <h3 className="text-2xl font-bold text-foreground">Operational</h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-4 dark:text-neutral-500">Core API is responding</p>
          </div>
          <div className="bg-muted/40 border border-red-500/20 rounded-xl p-6 shadow-sm flex flex-col justify-between dark:bg-neutral-900 dark:border-red-900/30">
            <div>
              <p className="text-sm font-medium text-red-600 mb-1 dark:text-red-400">Database Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                <h3 className="text-2xl font-bold text-foreground">Offline / Error</h3>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-4 dark:text-red-400">{error || "Connection failed or dataset empty"}</p>
          </div>
        </div>
      </div>
    );
  }

  const allHealthy = stats.health.api && stats.health.database && stats.health.licenseVerification;
  const healthPercent = [stats.health.api, stats.health.database, stats.health.licenseVerification].filter(Boolean).length;
  const healthBarWidth = `${(healthPercent / 3) * 100}%`;

  return (
    <div className="w-full text-foreground font-sans">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-left">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight mb-1">
              <span className="bg-gradient-to-br from-foreground to-primary bg-clip-text text-transparent dark:from-white dark:to-primary">
                Platform Analytics
              </span>
            </h1>
            {isRefreshing && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time insights for <span className="text-foreground font-medium">{stats.appName || appName}</span>
          </p>
          {isRefreshing && <div className="h-0.5 w-full bg-primary/20 rounded-full overflow-hidden mt-3"><div className="h-full w-full bg-primary animate-pulse" /></div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={<Users className="w-6 h-6 text-primary dark:text-primary" />}
            accentColor="#3b82f6"
            delay={0.1}
          />

          <StatCard
            title="Total Licenses"
            value={stats.totalLicenses.toLocaleString()}
            icon={<Key className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
            accentColor="#a855f7"
            delay={0.2}
          />

          <StatCard
            title="Active Sessions"
            value={stats.activeSessions.toLocaleString()}
            icon={<MonitorPlay className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
            accentColor="#10b981"
            delay={0.3}
          />

          <StatCard
            title="Unused Licenses"
            value={stats.unusedLicenses.toLocaleString()}
            icon={<Ticket className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
            accentColor="#f59e0b"
            delay={0.35}
          />

          <StatCard
            title="Active Tokens"
            value={stats.totalTokens.toLocaleString()}
            icon={<Shield className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />}
            accentColor="#06b6d4"
            delay={0.4}
          />

          <StatCard
            title="Subscriptions"
            value={stats.totalSubscriptions.toLocaleString()}
            icon={<CreditCard className="w-6 h-6 text-pink-600 dark:text-pink-400" />}
            accentColor="#ec4899"
            delay={0.45}
          />

          {/* Platform Health Panel */}
          <div className="md:col-span-2 lg:col-span-2 rounded-lg border border-border bg-card p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted ring-1 ring-border dark:ring-white/20">
                  <TrendingUp className="w-6 h-6 text-primary dark:text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Platform Health</h3>
                  <p className="text-sm text-muted-foreground">Live system telemetry</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-xl bg-muted/60 border border-border dark:bg-neutral-900/50">
                  <p className="text-2xl font-bold text-foreground">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Users</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/60 border border-border dark:bg-neutral-900/50">
                  <p className="text-2xl font-bold text-foreground">{stats.bannedUsers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Banned Users</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/60 border border-border dark:bg-neutral-900/50">
                  <p className="text-2xl font-bold text-foreground">{stats.usedLicenses.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Used Licenses</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/60 border border-border dark:bg-neutral-900/50">
                  <p className={`text-2xl font-bold ${stats.appStatus ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stats.appStatus ? 'Enabled' : 'Disabled'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">App Status</p>
                </div>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: healthBarWidth }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className={`h-full rounded-full ${allHealthy ? 'bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-500 dark:to-emerald-400' : 'bg-gradient-to-r from-yellow-600 to-orange-500 dark:from-yellow-500 dark:to-orange-400'}`}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>System Health</span>
                <span className="text-foreground font-medium">{healthPercent}/3 Systems Healthy</span>
              </div>
            </div>
          </div>

          {/* Core Services Status */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">Core Services</h3>
            <div className="space-y-1">
              <StatusItem label="Authentication API" healthy={stats.health.api} isPaused={!stats.appStatus} delay={0} />
              <StatusItem label="License Verification" healthy={stats.health.licenseVerification} isPaused={!stats.appStatus} delay={0} />
              <StatusItem label="Database Nodes" healthy={stats.health.database} delay={0} />
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${allHealthy ? 'bg-green-500' : 'bg-yellow-500'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${allHealthy ? 'bg-green-600' : 'bg-yellow-600'}`}></span>
              </span>
              {allHealthy ? 'All subsystems reporting healthy' : 'Some subsystems may need attention'}
            </div>
          </div>
          {/* Client Integration Code */}
          <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-border bg-card p-6 shadow-sm mt-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Client Integration</h3>
                  <p className="text-sm text-muted-foreground">Drop this snippet into your client to connect to your authentication server.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex p-1 bg-muted/50 border border-border rounded-lg max-w-fit">
                    <button onClick={() => setSelectedLang('cpp')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${selectedLang === 'cpp' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>C++</button>
                    <button onClick={() => setSelectedLang('python')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${selectedLang === 'python' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>Python</button>
                    <button onClick={() => setSelectedLang('csharp')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${selectedLang === 'csharp' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>C#</button>
                  </div>
                  <a href="/DexterAuth.cs" download className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white rounded-md text-xs font-semibold transition-colors">
                    <img src="/RDX.png" alt="RDX" className="w-4 h-4 rounded-sm object-cover" />
                    Download .cs
                  </a>
                </div>
              </div>
              
              <div>
                <div className="bg-muted/60 dark:bg-[#0d1117] border border-border dark:border-border/50 rounded-md p-4 overflow-x-auto">
                  {selectedLang === 'cpp' ? (
                    <pre className="text-sm font-mono text-black dark:text-zinc-300">
                      <code className="language-cpp">
{`std::string name = skCrypt("${stats.appName || appName}").decrypt();
std::string ownerid = skCrypt("${ownerId || "YOUR_OWNER_ID"}").decrypt();
std::string secret = skCrypt("YOUR_APP_SECRET_HERE").decrypt();
std::string version = skCrypt("${version || "1.0"}").decrypt();
std::string url = skCrypt("https://${stats.cloudflareDomain || 'dexterauth.onrender.com'}/api/v2/client/").decrypt();`}
                      </code>
                    </pre>
                  ) : selectedLang === 'python' ? (
                    <pre className="text-sm font-mono text-black dark:text-zinc-300">
                      <code className="language-python">
{`from dexter import api
 
app = api(
    name          = "${stats.appName || appName}",
    ownerid       = "${ownerId || "YOUR_OWNER_ID"}",
    version       = "${version || "1.0"}",
    client_secret = "YOUR_APP_SECRET_HERE",
    url           = "https://${stats.cloudflareDomain || 'dexterauth.onrender.com'}/api/v2/client/"
)`}
                      </code>
                    </pre>
                  ) : (
                    <pre className="text-sm font-mono text-black dark:text-zinc-300">
                      <code className="language-csharp">
{`// Download: /DexterAuth.cs (icon: /RDX.png)
// Icon: RDX.png is the app icon
using DexterAuth;
var api = new DexterApi(
    name: "${stats.appName || appName}",
    ownerId: "${ownerId || "YOUR_OWNER_ID"}",
    secret: "YOUR_APP_SECRET_HERE",
    version: "${version || "1.0"}",
    url: "https://${stats.cloudflareDomain || 'dexterauth.onrender.com'}/api/v2/client/"
);
if (await api.LoginAsync("username", "password")) {
    // authenticated
}
// File: /DexterAuth.cs — click Download .cs above`}
                      </code>
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
