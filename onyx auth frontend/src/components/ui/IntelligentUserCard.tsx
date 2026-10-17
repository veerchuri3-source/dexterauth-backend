import React from "react";
import { motion } from "motion/react";
import { User } from "../../pages/Users";
import { 
  MoreHorizontal, Activity,
  Edit, Pause, Ban, RefreshCw, Key, Trash2, Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { CheckboxAnimated } from "./checkbox-animated";

interface IntelligentUserCardProps {
  user: User;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onToggleStatus: (status: 'active' | 'banned' | 'paused') => void;
  onResetHwid: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onViewBanReason: () => void;
  isSelected?: boolean;
  onToggleSelect?: (e: any) => void;
}

const formatTimeLeft = (expiresAt: string | undefined) => {
    if (!expiresAt) return 'Permanent';
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return 'Expired';
    if (ms > 50 * 365 * 24 * 60 * 60 * 1000) return 'Permanent';
    const totalHours = Math.floor(ms / (1000 * 60 * 60));
    const totalDays = Math.floor(totalHours / 24);
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;
    if (years > 0) return `${years}y ${months}m`;
    if (months > 0) return `${months}m ${days}d`;
    if (days > 0) return `${days}d ${totalHours % 24}h`;
    return `${totalHours}h ${Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))}m`;
};

export function IntelligentUserCard({ 
  user, onClick, onEdit, onToggleStatus, onResetHwid, onDelete, onViewBanReason, isSelected = false, onToggleSelect
}: IntelligentUserCardProps) {

  const isExpired = new Date(user.expiration_date).getTime() < Date.now();
  const normalizedStatus = user.status?.toLowerCase();

  // ── Status badge ──────────────────────────────────────────────────────────
  let statusBadge: React.ReactNode;
  if (isExpired) {
    statusBadge = (
      <span className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">Expired</span>
    );
  } else if (normalizedStatus === 'active') {
    statusBadge = (
      <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">Active</span>
    );
  } else if (normalizedStatus === 'paused') {
    statusBadge = (
      <span className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">Paused</span>
    );
  } else if (normalizedStatus === 'banned') {
    statusBadge = (
      <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/25 px-2.5 py-0.5 rounded-full">
        <span className="text-red-600 dark:text-red-400 text-xs font-semibold whitespace-nowrap">
          Banned ({formatTimeLeft(user.ban_expires)})
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onViewBanReason(); }}
          className="p-0.5 opacity-80 hover:opacity-100 transition-opacity"
          title="View ban reason"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-red-600 dark:text-red-400">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </button>
      </div>
    );
  } else {
    statusBadge = (
      <span className="bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full text-xs font-semibold">Unknown</span>
    );
  }

  // ── Avatar styles ─────────────────────────────────────────────────────────
  const avatarClasses = isSelected 
    ? 'bg-primary/20 text-primary dark:text-red-200' 
    : 'bg-primary/10 text-primary dark:text-red-400';

  // ── Card styles ──────────────────────────────────────────────────────────
  const cardClasses = isSelected
    ? 'bg-primary/5 dark:bg-[#201015] border-primary shadow-[0_0_0_1px_rgba(239,68,68,1),0_0_24px_rgba(239,68,68,0.25)]'
    : 'bg-card dark:bg-[#0d1322] border-border dark:border-[#1d263b] shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.5)] hover:border-primary/30 dark:hover:border-[#2e3c5d]';

  const activeSessions = user.last_login_at ? 1 : 0;
  const devices = user.hwid ? 1 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="h-full"
    >
      <div className={`flex flex-col h-full rounded-2xl p-5 cursor-pointer transition-all duration-200 relative overflow-hidden border ${cardClasses}`}>
        {/* ── TOP ROW: avatar + name | status + checkbox + menu ── */}
        <div className="flex justify-between items-center mb-3.5">
          {/* Left: avatar + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${avatarClasses}`}>
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-foreground font-bold text-[15px] leading-tight truncate">
                {user.username}
              </div>
              <div className="text-muted-foreground text-xs font-mono mt-0.5 truncate">
                {user.id.split('-')[0]}
              </div>
            </div>
          </div>

          {/* Right: status + checkbox + menu */}
          <div onClick={e => e.stopPropagation()} className="flex items-center gap-2 shrink-0">
            {statusBadge}
            {onToggleSelect && (
              <CheckboxAnimated checked={isSelected} onCheckedChange={onToggleSelect} />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:bg-muted p-1 rounded-lg transition-colors">
                  <MoreHorizontal className="w-4.5 h-4.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-2xl">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(e); }} className="cursor-pointer">
                  <Edit className="w-4 h-4 mr-2 text-muted-foreground" /> Edit User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResetHwid(e); }} className="cursor-pointer">
                  <Key className="w-4 h-4 mr-2 text-primary" /> Reset HWID
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-border" />
                {normalizedStatus === 'active' ? (
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => onToggleStatus('paused'), 150); }} className="text-amber-600 dark:text-yellow-400 focus:bg-amber-500/10 cursor-pointer">
                    <Pause className="w-4 h-4 mr-2" /> Pause Access
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => onToggleStatus('active'), 150); }} className="text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/10 cursor-pointer">
                    <Activity className="w-4 h-4 mr-2" /> Resume Access
                  </DropdownMenuItem>
                )}
                {normalizedStatus === 'banned' ? (
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => onToggleStatus('active'), 150); }} className="text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/10 cursor-pointer">
                    <RefreshCw className="w-4 h-4 mr-2" /> Unban
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => onToggleStatus('banned'), 150); }} className="text-red-600 dark:text-red-400 focus:bg-red-500/10 cursor-pointer">
                    <Ban className="w-4 h-4 mr-2" /> Ban User
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="border-border" />
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => onDelete(e as any), 150); }} className="text-red-600 dark:text-red-400 focus:bg-red-500/10 cursor-pointer font-bold">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── META ROW: plan pill + expiry ── */}
        <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
          <span className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-red-400 px-2.5 py-1 rounded-full text-xs font-semibold">
            {user.subscription_level || 'Default'}
          </span>
          <span className={`flex items-center gap-1.5 text-xs font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
            <Calendar className="w-3.5 h-3.5" />
            {isExpired ? 'Expired' : 'Expires'} {new Date(user.expiration_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* ── HWID FIELD ── */}
        <div className="bg-muted/50 dark:bg-[#070b14] border border-border dark:border-[#172033] rounded-lg px-3 py-2.5 flex items-center gap-2 mb-3.5 min-w-0">
          <span className="text-[11px] text-muted-foreground font-medium shrink-0 uppercase tracking-wider">Primary HWID</span>
          <span className={`text-xs font-mono truncate ${user.hwid ? 'text-foreground' : 'text-muted-foreground'}`}>
            {user.hwid ? user.hwid : 'Not bound'}
          </span>
        </div>

        {/* ── DIVIDER ── */}
        <div className="border-t border-border dark:border-[#172033] mb-3" />

        {/* ── STATS ROW ── */}
        <div className="flex items-center justify-between mt-auto w-full">
          {[
            { label: 'Login',    value: user.last_login_at ? 'Yes' : 'Never' },
            { label: 'HWID',     value: user.hwid ? 'Bound' : 'Free' },
            { label: 'Sessions', value: activeSessions },
            { label: 'Devices',  value: devices },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
              <span className="text-[13px] text-foreground font-semibold">{value}</span>
            </div>
          ))}
        </div>

      </div>
    </motion.div>
  );
}