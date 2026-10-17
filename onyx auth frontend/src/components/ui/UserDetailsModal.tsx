import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../../pages/Users";
import { X, Shield, Activity, Laptop, Key } from "lucide-react";

interface UserDetailsModalProps {
  user: User | null;
  onClose: () => void;
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'security', label: 'Security', icon: Shield },
];

export function UserDetailsModal({ user, onClose }: UserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!user) return null;

  const isExpired = new Date(user.expiration_date).getTime() < Date.now();
  const expiryColor = isExpired ? 'text-red-600 dark:text-red-400 font-bold' : 'text-foreground dark:text-slate-200';

  const getIpType = (ip: string | undefined) => {
    if (!ip) return null;
    if (ip.includes(':')) return 'IPv6';
    if (ip.includes('.')) return 'IPv4';
    return null;
  };
  const ipType = getIpType(user.last_ip);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-[95vw] sm:w-full sm:max-w-4xl bg-background dark:bg-[#0F172A] border border-border dark:border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-border dark:border-[#1E293B] bg-muted/50 dark:bg-slate-900/50 relative overflow-hidden shrink-0">
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none bg-primary`} />
            
            <div className="flex gap-3 sm:gap-5 items-center relative z-10 w-full pr-12">
              <div className="w-full">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground dark:text-white mb-1 truncate w-full">{user.username}</h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                  <span className="text-primary dark:text-primary font-medium">{user.subscription_level || 'Free'} Plan</span>
                  <span className="text-muted-foreground/50 dark:text-slate-600">•</span>
                  <span className={`capitalize ${isExpired ? 'text-red-600 dark:text-red-400 font-bold' : 'text-muted-foreground dark:text-slate-400'}`}>{isExpired ? 'Expired' : user.status}</span>
                  <span className="text-muted-foreground/50 dark:text-slate-600 hidden sm:inline">•</span>
                  <span className="text-muted-foreground dark:text-slate-400 font-mono text-xs truncate max-w-[120px] sm:max-w-none">{user.id}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center absolute top-4 sm:top-6 right-4 sm:right-6 z-10">
              <button onClick={onClose} className="p-2 hover:bg-muted dark:hover:bg-slate-800 rounded-full transition-colors text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body with Sidebar Tabs */}
          <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
            {/* Sidebar (Horizontal Tabs on Mobile) */}
            <div className="w-full sm:w-48 bg-muted/30 dark:bg-slate-900/30 border-b sm:border-b-0 sm:border-r border-border dark:border-[#1E293B] flex flex-row sm:flex-col p-2 sm:p-3 gap-1 overflow-x-auto sm:overflow-x-hidden overflow-y-hidden sm:overflow-y-auto chat-scrollbar shrink-0">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === t.id 
                      ? 'bg-primary/10 text-primary dark:text-primary' 
                      : 'text-muted-foreground dark:text-slate-400 hover:bg-muted dark:hover:bg-slate-800 hover:text-foreground dark:hover:text-slate-200'
                  }`}
                >
                  <t.icon className="w-4 h-4 shrink-0" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto chat-scrollbar bg-background dark:bg-[#0B1120]">
              
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground dark:text-white">General Overview</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <div className="bg-muted/50 dark:bg-slate-900/50 p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-border dark:border-slate-800">
                      <Label className="text-[10px] sm:text-xs text-muted-foreground dark:text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 block">Email Address</Label>
                      <p className="text-sm sm:text-base text-foreground dark:text-slate-200 truncate">{user.email || 'N/A'}</p>
                    </div>
                    <div className="bg-muted/50 dark:bg-slate-900/50 p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-border dark:border-slate-800">
                      <Label className="text-[10px] sm:text-xs text-muted-foreground dark:text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 block">Created On</Label>
                      <p className="text-sm sm:text-base text-foreground dark:text-slate-200 truncate">{new Date(user.created_at).toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/50 dark:bg-slate-900/50 p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-border dark:border-slate-800">
                      <Label className="text-[10px] sm:text-xs text-muted-foreground dark:text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 block">Expiration Date</Label>
                      <p className={`${expiryColor} text-sm sm:text-base truncate`}>{new Date(user.expiration_date).toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/50 dark:bg-slate-900/50 p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-border dark:border-slate-800">
                      <Label className="text-[10px] sm:text-xs text-muted-foreground dark:text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 block">Last Login</Label>
                      <p className="text-sm sm:text-base text-foreground dark:text-slate-200 truncate">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</p>
                    </div>
                    <div className="bg-muted/50 dark:bg-slate-900/50 p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-border dark:border-slate-800 sm:col-span-2">
                      <Label className="text-[10px] sm:text-xs text-muted-foreground dark:text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 block">Last IP Address</Label>
                      <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                        <p className="text-sm sm:text-base text-foreground dark:text-slate-200 font-mono truncate">{user.last_ip || 'N/A'}</p>
                        {ipType && (
                          <span className="bg-primary/10 text-primary text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                            {ipType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground dark:text-white">Security Posture</h3>
                  <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center justify-between bg-muted/50 dark:bg-slate-900/50 p-4 rounded-xl border border-border dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <Key className="w-5 h-5 text-muted-foreground dark:text-slate-400" />
                          <div>
                            <p className="text-foreground dark:text-slate-200 font-medium">Primary Hardware ID (HWID)</p>
                            <p className="text-xs font-mono text-muted-foreground dark:text-slate-500 mt-1 max-w-[400px] truncate" title={user.hwid || ''}>
                              {user.hwid ? user.hwid : 'Not bound yet'}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.hwid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {user.hwid ? 'Locked' : 'Unlocked'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-muted/50 dark:bg-slate-900/50 p-4 rounded-xl border border-border dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <Laptop className="w-5 h-5 text-muted-foreground dark:text-slate-400" />
                          <div>
                            <p className="text-foreground dark:text-slate-200 font-medium">Additional HWIDs</p>
                            <p className="text-xs font-mono text-muted-foreground dark:text-slate-500 mt-1 max-w-[400px] truncate" title={user.additional_hwid || ''}>
                              {user.additional_hwid ? user.additional_hwid : 'None configured'}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.additional_hwid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-muted-foreground dark:text-slate-400'}`}>
                          {user.additional_hwid ? 'Configured' : 'Empty'}
                        </span>
                      </div>
                    <div className="flex items-center justify-between bg-muted/50 dark:bg-slate-900/50 p-4 rounded-xl border border-border dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-muted-foreground dark:text-slate-400" />
                        <div>
                          <p className="text-foreground dark:text-slate-200 font-medium">Two-Factor Auth</p>
                          <p className="text-xs text-muted-foreground dark:text-slate-500">{user.is_2fa_enabled ? 'Authenticator active' : 'Vulnerable to takeover'}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.is_2fa_enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {user.is_2fa_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Label({ className, children }: { className?: string, children: React.ReactNode }) {
  return <label className={className}>{children}</label>;
}
