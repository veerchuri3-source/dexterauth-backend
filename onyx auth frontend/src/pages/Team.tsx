import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { devApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Crown, Edit, ChevronRight, ChevronLeft, X, Check, Key, Users2, Wallet, ShieldCheck, Mail, Clock, XCircle, RefreshCw, User as UserIcon, ExternalLink, Loader2 } from "lucide-react";
import { useDialog } from "../hooks/use-dialog";
import { CheckboxAnimated } from "../components/ui/checkbox-animated";
import { BADGES, BadgeIcon } from "../components/Badges";
import ShinyText from "../components/ui/shiny-text";
import GradientText from "../components/ui/gradient-text";
import { UserProfileModal } from "../components/ui/UserProfileModal";
import { getDefaultAvatarUrl } from "../lib/utils";

interface TeamMember {
    id: string;
    username: string;
    email: string;
    role: string;
    status?: string;
    created_at?: string;
    expires_at?: string;
    owner_id?: string | null;
    is_invited?: boolean | number;
    is_owner?: boolean;   // injected by backend when caller is manager — marks the admin/owner row
    balance_day?: number;
    balance_week?: number;
    balance_month?: number;
    balance_three_month?: number;
    balance_six_month?: number;
    balance_year?: number;
    balance_lifetime?: number;
    is_unlimited_reseller?: boolean;
    allowed_license_levels?: string;
    badges?: string[];
    apps?: string[];
    perms?: any;
    avatar_url?: string;
    banner_url?: string;
    bio?: string;
    display_name?: string;
    plan?: string;
}

interface SentInvitation {
    id: string;
    role: string;
    status: 'pending' | 'rejected';
    created_at: string;
    invitee_username: string;
    invitee_email: string;
    app_name: string;
    app_id: string;
}

interface AppData { id: string; name: string; }

const MANAGER_PERMS = [
    { key: 'licenses', label: 'Licenses' },
    { key: 'users', label: 'Users' },
    { key: 'tokens', label: 'Tokens' },
    { key: 'subscriptions', label: 'Subscriptions' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'settings', label: 'App Settings' },
    { key: 'chats', label: 'Chats' },
    { key: 'team', label: 'Team' },
    { key: 'webhooks', label: 'Webhooks' },
    { key: 'vars', label: 'Variables' },
    { key: 'rules', label: 'Rules' },
    { key: 'logs', label: 'Logs' },
];

const BALANCE_FIELDS = [
    { key: 'balance_day', label: 'Day', desc: '1-day keys' },
    { key: 'balance_week', label: 'Week', desc: '7-day keys' },
    { key: 'balance_month', label: 'Month', desc: '30-day keys' },
    { key: 'balance_three_month', label: '3 Months', desc: '90-day keys' },
    { key: 'balance_six_month', label: '6 Months', desc: '180-day keys' },
    { key: 'balance_year', label: 'Year', desc: '365-day keys' },
    { key: 'balance_lifetime', label: 'Lifetime', desc: 'Permanent keys' },
];

const normalizePerms = (backendPerms: any) => {
    if (!backendPerms) return {};
    const normalized: any = {};
    MANAGER_PERMS.forEach(p => {
        const backendKey = `can_manage_${p.key}`;
        normalized[p.key] = backendPerms[backendKey] === 1 || backendPerms[backendKey] === true || backendPerms[p.key] === 1 || backendPerms[p.key] === true;
    });
    return normalized;
};

const emptyForm = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const tzoffset = d.getTimezoneOffset() * 60000;
    const defaultDateTime = new Date(d.getTime() - tzoffset).toISOString();
    return {
        username: '', email: '', pw: '', role: '' as 'reseller' | 'manager' | '',
        selectedApps: [] as string[],
        keylevels: '1',
        balance_day: '0', balance_week: '0', balance_month: '0',
        balance_three_month: '0', balance_six_month: '0', balance_year: '0', balance_lifetime: '0',
        is_unlimited_reseller: false,
        does_expire: false, expires_date: defaultDateTime.split('T')[0], expires_time: defaultDateTime.split('T')[1].slice(0, 5),
        perms: {} as Record<string, boolean>,
        badges: [] as string[],
        inviteMode: true,
    };
};

const getCurrentDate = () => {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().split('T')[0];
};

export default function Team({ profile, userRole, appId, canManageTeam }: { profile?: { id?: string; [key: string]: any }; userRole?: string; appId?: string; canManageTeam?: boolean }) {
    const isManager = userRole === 'manager';
    const { confirm } = useDialog();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
    const [apps, setApps] = useState<AppData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProfile, setSelectedProfile] = useState<TeamMember | null>(null);

    const [verifyStatus, setVerifyStatus] = useState<{
        state: 'idle' | 'checking' | 'verified' | 'error';
        message?: string;
        user?: { id: string; username: string; email: string; avatar_url?: string; display_name?: string };
        isAlreadyInTeam?: boolean;
    }>({ state: 'idle' });

    const verifyCache = useRef<Map<string, any>>(new Map());
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!form.inviteMode || editingMember) return;
        const val = (form.username || "").trim().toLowerCase();
        
        if (!val) {
            setVerifyStatus({ state: 'idle' });
            return;
        }

        const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{1,30}$/;

        // If string contains '@', require full valid email format before making any request
        if (val.includes('@')) {
            if (!EMAIL_REGEX.test(val)) {
                setVerifyStatus({ state: 'error', message: 'Please enter a complete valid email address (e.g. user@example.com)' });
                return;
            }
        } else if (!USERNAME_REGEX.test(val)) {
            setVerifyStatus({ state: 'error', message: 'Enter a valid username (e.g. johndoe) or email (e.g. john@example.com)' });
            return;
        }

        if (verifyCache.current.has(val)) {
            setVerifyStatus(verifyCache.current.get(val));
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Debounce request: only set checking state & send request after user stops typing for 500ms
        const timer = setTimeout(async () => {
            setVerifyStatus({ state: 'checking' });
            try {
                const res = await devApi.verifyUser(val, appId, 'invite', controller.signal);
                if (res.status === 'success') {
                    const data = res.data;
                    let newStatus: any;
                    if (!data.validFormat || !data.exists) {
                        newStatus = { state: 'error', message: data.message || 'User account not found on Dexter Auth. They must register an account first.' };
                    } else if (data.isSelf || data.isMasterAdmin) {
                        newStatus = { state: 'error', message: data.message };
                    } else if (data.isAlreadyInTeam) {
                        newStatus = { state: 'error', message: data.message, user: data.user, isAlreadyInTeam: true };
                    } else if (data.hasPendingInvite) {
                        newStatus = { state: 'error', message: data.message, user: data.user, hasPendingInvite: true };
                    } else {
                        newStatus = { state: 'verified', message: data.message, user: data.user, isAlreadyInTeam: false, hasPendingInvite: false };
                    }
                    verifyCache.current.set(val, newStatus);
                    setVerifyStatus(newStatus);
                }
            } catch (err: any) {
                if (!axios.isCancel(err) && err.name !== 'CanceledError' && err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') {
                    setVerifyStatus({ state: 'error', message: err.response?.data?.message || 'User account not found on Dexter Auth. They must register an account first.' });
                }
            }
        }, 500);

        return () => {
            clearTimeout(timer);
        };
    }, [form.username, form.inviteMode, editingMember, appId]);

    useEffect(() => { fetchMembers(); fetchApps(); fetchSentInvitations(); }, [appId]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const d = await devApi.getTeamMembers(appId || undefined);
            if (d.status === "success") setMembers(d.data.teamMembers || []);
        } catch { setMembers([]); }
        finally { setLoading(false); }
    };

    const fetchApps = async () => {
        try {
            const d = await devApi.getApps();
            if (d.status === "success") setApps(d.data.apps || []);
        } catch { setApps([]); }
    };

    const fetchSentInvitations = async () => {
        try {
            const d = await devApi.getSentInvitations();
            if (d.status === "success") setSentInvitations(d.data.invitations || []);
        } catch { setSentInvitations([]); }
    };

    const openCreate = () => {
        setEditingMember(null);
        setVerifyStatus({ state: 'idle' });
        const currentApp = appId ? apps.find(a => a.id === appId) : null;
        setForm({
            ...emptyForm(),
            role: isManager ? 'reseller' : '',
            selectedApps: currentApp ? [currentApp.name] : [],
            inviteMode: true
        });
        setStep(1);
        setIsModalOpen(true);
    };

    const openEdit = (member: TeamMember) => {
        setEditingMember(member);
        setForm({
            username: member.username,
            email: member.email,
            pw: '',
            role: member.role as 'reseller' | 'manager',
            selectedApps: member.apps || [],
            keylevels: member.allowed_license_levels || '1',
            balance_day: String(member.balance_day ?? 0),
            balance_week: String(member.balance_week ?? 0),
            balance_month: String(member.balance_month ?? 0),
            balance_three_month: String(member.balance_three_month ?? 0),
            balance_six_month: String(member.balance_six_month ?? 0),
            balance_year: String(member.balance_year ?? 0),
            balance_lifetime: String(member.balance_lifetime ?? 0),
            is_unlimited_reseller: !!member.is_unlimited_reseller,
            does_expire: !!member.expires_at,
            expires_date: member.expires_at ? member.expires_at.split('T')[0] : emptyForm().expires_date,
            expires_time: member.expires_at && member.expires_at.includes('T') ? member.expires_at.split('T')[1].slice(0,5) : emptyForm().expires_time,
            perms: normalizePerms(member.perms),
            badges: member.badges || [],
            inviteMode: false,
        });
        setStep(1);
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingMember(null); };

    const handleSave = async () => {
        if (form.inviteMode) {
            if (!form.username) {
                toast.error("Username or email is required to invite.");
                return;
            }
            const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{1,30}$/;
            if (!EMAIL_REGEX.test(form.username) && !USERNAME_REGEX.test(form.username)) {
                toast.error("Please enter a valid username or email address.");
                return;
            }
            if (!form.role) {
                toast.error("Please select an Account Role (Reseller or Manager).");
                return;
            }
            if (form.selectedApps.length !== 1) {
                toast.error("Please select exactly one application to invite the user to.");
                return;
            }
            setSaving(true);
            try {
                const targetApp = apps.find(a => a.name === form.selectedApps[0]);
                if (!targetApp) throw new Error("Application not found");
                
                await devApi.inviteUser({
                    usernameOrEmail: form.username,
                    appId: targetApp.id,
                    role: form.role,
                    keylevels: form.keylevels,
                    is_unlimited_reseller: form.is_unlimited_reseller,
                    perms: form.perms,
                    ...BALANCE_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: form[f.key as keyof typeof form] }), {})
                });
                toast.success("Invitation sent successfully!");
                closeModal();
                fetchMembers();
                fetchSentInvitations();
            } catch (err: any) {
                toast.error(err.response?.data?.message || err.message || "Failed to invite user.");
            } finally { setSaving(false); }
            return;
        }

        if (!form.username || !form.email || (!editingMember && !form.pw)) {
            toast.error("Username, email, and password are required.");
            return;
        }
        const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{1,30}$/;
        if (!EMAIL_REGEX.test(form.email)) {
            toast.error("Please enter a valid email address.");
            return;
        }
        if (!USERNAME_REGEX.test(form.username)) {
            toast.error("Username must be 1-30 characters and contain only letters, numbers, underscores, dots, or hyphens.");
            return;
        }
        if (!form.role) {
            toast.error("Please select an Account Role (Reseller or Manager).");
            return;
        }
        setSaving(true);
        
        let finalDate = form.expires_date;
        let finalTime = form.expires_time;
        if (form.does_expire && form.expires_date && form.expires_time) {
            const localDate = new Date(`${form.expires_date}T${form.expires_time}:00`);
            const utcIso = localDate.toISOString();
            finalDate = utcIso.split('T')[0];
            finalTime = utcIso.split('T')[1].slice(0, 5);
        }
        
        try {
            const payload: any = {
                username: form.username, email: form.email,
                role: form.role,
                pw: form.pw || undefined,
                keylevels: form.keylevels,
                apps: form.selectedApps,
                does_expire: form.does_expire,
                is_unlimited_reseller: form.is_unlimited_reseller,
                expires_date: finalDate,
                expires_time: finalTime,
                badges: form.badges,
                ...BALANCE_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: form[f.key as keyof typeof form] }), {}),
                ...MANAGER_PERMS.reduce((acc, p) => ({ ...acc, [p.key]: form.perms[p.key] ?? false }), {}),
            };

            if (editingMember) {
                await devApi.updateTeamMember(editingMember.id, payload);
                toast.success("Team member updated!");
            } else {
                await devApi.createTeamMember(payload);
                toast.success("Team member created!");
            }
            closeModal();
            fetchMembers();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save.");
        } finally { setSaving(false); }
    };

    const handleRemove = async (member: TeamMember) => {
        const isInvitedMember = (member.is_invited === 1 || member.is_invited === true) ||
            (profile?.id && member.owner_id !== null && member.owner_id !== undefined && member.owner_id !== profile.id);
        const title = isInvitedMember ? "Remove from Team" : "Delete Team Member";
        const description = isInvitedMember 
            ? "This will remove this user from your apps. Their independent account will remain intact."
            : "This will permanently delete this account and all data created by them.";

        if (!await confirm({ title, description, variant: "destructive" })) return;
        try { await devApi.deleteTeamMember(member.id, isManager ? appId : undefined); toast.success(isInvitedMember ? "Member removed from team." : "Member deleted."); fetchMembers(); }
        catch (error: any) { toast.error(error.response?.data?.message || "Failed to remove member."); }
    };

    const handleLeave = async () => {
        if (!await confirm({ title: "Leave Team", description: "Are you sure you want to leave this team? You will lose access to the app immediately.", variant: "destructive" })) return;
        try {
            if (!appId) { toast.error("Could not determine your app assignment."); return; }
            await devApi.leaveTeam(appId);
            toast.success("You have left the team.");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to leave team.");
        }
    };

    const handleCancelInvitation = async (inv: SentInvitation) => {
        if (!await confirm({ title: "Cancel Invitation", description: `Cancel the pending invitation for ${inv.invitee_username}?`, variant: "destructive" })) return;
        try {
            await devApi.cancelInvitation(inv.id);
            toast.success("Invitation cancelled.");
            fetchSentInvitations();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to cancel invitation.");
        }
    };

    const handleResendInvitation = async (inv: SentInvitation) => {
        try {
            await devApi.resendInvitation(inv.id);
            toast.success(`Invitation resent to ${inv.invitee_username}!`);
            fetchSentInvitations();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to resend invitation.");
        }
    };

    const getRoleBadge = (role: string, isInvited?: boolean) => {
        if (role === 'admin') return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px] font-semibold uppercase tracking-wider gap-1"><Crown className="w-3 h-3" />Admin</Badge>;
        if (role === 'reseller') return <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/25 text-[10px] font-semibold uppercase tracking-wider gap-1"><Wallet className="w-3 h-3" />{isInvited ? 'Invited Reseller' : 'Reseller'}</Badge>;
        return <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px] font-semibold uppercase tracking-wider gap-1"><Shield className="w-3 h-3" />{isInvited ? 'Invited Manager' : 'Manager'}</Badge>;
    };

    const totalSteps = 3;

    return (
        <div className="max-w-[1400px] mx-auto h-full flex flex-col space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <Users2 className="w-6 h-6 text-primary" />Team Members
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {isManager ? "Your team — you can view members and kick resellers." : "Manage Resellers and Managers under your account."}
                    </p>
                </div>
                {/* Managers cannot add new members unless they have canManageTeam permission */}
                {(!isManager || canManageTeam) && (
                    <Button onClick={openCreate} className="bg-primary hover:bg-primary text-white font-medium rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Add Member
                    </Button>
                )}
            </div>

            {/* Sent Invitations (Pending / Rejected) — hidden for managers without permission */}
            {(!isManager || canManageTeam) && sentInvitations.length > 0 && (
                <div className="bg-muted/60 border border-border rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center gap-2 bg-background">
                        <Mail className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Sent Invitations</span>
                        <Badge className="bg-muted text-muted-foreground border-border text-[10px]">{sentInvitations.length}</Badge>
                    </div>
                    <div className="divide-y divide-border">
                        {sentInvitations.map(inv => (
                            <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-600/20 flex items-center justify-center text-foreground font-bold text-sm shadow border border-amber-500/20">
                                        {(inv.invitee_username || "?")[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground text-sm">{inv.invitee_username}</p>
                                        <p className="text-xs text-muted-foreground/70">{inv.invitee_email} · <span className="text-primary/70">{inv.app_name}</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Status Badge */}
                                    {inv.status === 'pending' ? (
                                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px] font-semibold uppercase tracking-wider gap-1">
                                            <Clock className="w-3 h-3" />Pending
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-red-500/15 text-red-400 border-red-500/25 text-[10px] font-semibold uppercase tracking-wider gap-1">
                                            <XCircle className="w-3 h-3" />Rejected
                                        </Badge>
                                    )}
                                    {getRoleBadge(inv.role)}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {inv.status === 'rejected' && (
                                            <button onClick={() => handleResendInvitation(inv)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                                title="Resend Invitation">
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {inv.status === 'pending' && (
                                            <button onClick={() => handleCancelInvitation(inv)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                                                title="Cancel Invitation">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Member Table */}
            <div className="bg-muted/60 border border-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between bg-background">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">All Members</span>
                        <Badge className="bg-muted text-muted-foreground border-border text-[10px]">{members.length}</Badge>
                    </div>
                    <div className="relative w-full max-w-xs">
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by username..." 
                            className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg h-9 text-sm pl-3"
                        />
                    </div>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground/70">Loading...</div>
                ) : members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground/70">
                        <Users2 className="w-10 h-10 opacity-40" />
                        <p className="text-sm">No team members yet. Add one to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#1E293B]">
                        {members.filter(m => (m.username || "").toLowerCase().includes(searchQuery.toLowerCase())).map((member) => (
                            <motion.div key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setSelectedProfile(member)}
                                        className="relative flex-shrink-0 transition-transform hover:scale-105 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-full focus:outline-none"
                                    >
                                        {member.avatar_url || member.email || member.username ? (
                                            <img 
                                                src={member.avatar_url || getDefaultAvatarUrl(member.email, member.username)} 
                                                alt={member.username} 
                                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} 
                                                className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800" 
                                            />
                                        ) : (
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-foreground font-bold text-sm shadow ${
                                                member.is_owner
                                                    ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                                                    : member.id === profile?.id
                                                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                                    : 'bg-gradient-to-br from-primary to-red-600'
                                            }`}>
                                                {(member.username || "?")[0].toUpperCase()}
                                            </div>
                                        )}
                                    </button>
                                    <div>
                                        <div className="flex items-center gap-2 animate-fade-in">
                                            <button 
                                                onClick={() => setSelectedProfile(member)}
                                                className="font-medium text-foreground text-sm hover:underline focus:outline-none text-left flex items-center gap-2"
                                            >
                                                {member.plan === 'Seller' ? (
                                                    <ShinyText 
                                                        text={member.username} 
                                                        speed={2} 
                                                        color="#94a3b8" 
                                                        shineColor="#ffffff" 
                                                        className="font-bold text-sm" 
                                                    />
                                                ) : member.plan === 'Developer' ? (
                                                    <GradientText
                                                        colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                                        animationSpeed={3}
                                                        showBorder={false}
                                                        className="font-bold text-sm"
                                                    >
                                                        {member.username}
                                                    </GradientText>
                                                ) : (
                                                    member.username
                                                )}
                                            </button>
                                            {member.is_owner && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5">Admin</span>
                                            )}
                                            {!member.is_owner && member.id === profile?.id && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">You</span>
                                            )}
                                            {Array.isArray(member.badges) && member.badges.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    {member.badges.map((bId: string) => (
                                                        <BadgeIcon key={bId} badgeId={bId} className="w-4 h-4 text-yellow-400" />
                                                    ))}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground/70">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {member.role === 'reseller' && (
                                        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground/70">
                                            {member.is_unlimited_reseller ? (
                                                <span className="bg-purple-500/20 text-purple-400 rounded px-2 py-1 border border-purple-500/30 font-semibold uppercase tracking-wide">Unlimited</span>
                                            ) : (
                                                <>
                                                    <span className="bg-muted rounded px-2 py-1 border border-border">Day: <span className="text-foreground font-semibold">{member.balance_day ?? 0}</span></span>
                                                    <span className="bg-muted rounded px-2 py-1 border border-border">Month: <span className="text-foreground font-semibold">{member.balance_month ?? 0}</span></span>
                                                    <span className="bg-muted rounded px-2 py-1 border border-border">Year: <span className="text-foreground font-semibold">{member.balance_year ?? 0}</span></span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {getRoleBadge(member.role, member.is_invited === 1 || member.is_invited === true)}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isManager ? (
                                            // Manager view: restricted actions
                                            member.is_owner ? (
                                                // Admin row — fully locked, no actions
                                                null
                                            ) : member.id === profile?.id ? (
                                                // Self row — only Leave button
                                                <button onClick={handleLeave}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-colors"
                                                    title="Leave team">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            ) : member.role === 'reseller' ? (
                                                // Reseller row — edit (if has permission) and kick
                                                <>
                                                    {canManageTeam && (
                                                        <button onClick={() => openEdit(member)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                                            title="Edit member">
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleRemove(member)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                                                        title="Kick member">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            ) : (
                                                // Other managers — view only
                                                null
                                            )
                                        ) : (
                                            // Admin view: full edit + delete
                                            <>
                                                <button onClick={() => openEdit(member)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleRemove(member)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
                        onClick={closeModal}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-xl bg-background border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}>
                            
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                                        <UserPlus className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-foreground text-base">{editingMember ? `Edit: ${editingMember.username}` : 'Add Team Member'}</h2>
                                        <p className="text-[11px] text-muted-foreground/70">Step {step} of {totalSteps}</p>
                                    </div>
                                </div>
                                <button onClick={closeModal} className="text-muted-foreground/70 hover:text-foreground transition-colors p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Step indicators */}
                            <div className="flex items-center gap-2 px-5 pt-4 flex-shrink-0">
                                {[
                                    { n: 1, label: 'Account' },
                                    { n: 2, label: 'Apps' },
                                    { n: 3, label: form.role === 'reseller' ? 'Balance' : 'Permissions' },
                                ].map((s) => (
                                    <div key={s.n} className="flex items-center gap-2 flex-1">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors ${step >= s.n ? 'bg-primary text-white' : 'bg-muted text-muted-foreground/70'}`}>
                                            {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
                                        </div>
                                        <span className={`text-xs font-medium ${step >= s.n ? 'text-foreground/80' : 'text-muted-foreground/70'}`}>{s.label}</span>
                                        {s.n < totalSteps && <div className={`flex-1 h-px ${step > s.n ? 'bg-primary' : 'bg-muted'}`} />}
                                    </div>
                                ))}
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto flex-1 p-5 custom-scrollbar">
                                
                                {/* STEP 1: Account */}
                                {step === 1 && (
                                    <div className="space-y-4">
                                        {/* Role Toggle */}
                                        <div>
                                            {!isManager && (
                                                <>
                                                    <label className="text-xs text-muted-foreground font-medium mb-2 block">Role *</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {(['reseller', 'manager'] as const).map(r => (
                                                            <button key={r} type="button" onClick={() => setForm(f => {
                                                                const updatedPerms = { ...f.perms };
                                                                if (r === 'manager' && Object.keys(updatedPerms).length === 0) {
                                                                    updatedPerms.licenses = true;
                                                                    updatedPerms.users = true;
                                                                    updatedPerms.tokens = true;
                                                                    updatedPerms.subscriptions = true;
                                                                    updatedPerms.chats = true;
                                                                    updatedPerms.sessions = true;
                                                                }
                                                                return { ...f, role: r, perms: updatedPerms };
                                                            })}
                                                                className={`py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${form.role === r ? 'bg-primary/15 border-primary text-primary' : 'bg-muted/40 border-border text-muted-foreground hover:border-border'}`}>
                                                                {r === 'reseller' ? <Wallet className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                                                {r === 'reseller' ? 'Reseller' : 'Manager'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground/70 mt-2 mb-4">
                                                        {form.role === 'reseller' ? '⚡ Resellers generate & sell licenses from their own balance.' : '🛡️ Managers get granular page-by-page access controls.'}
                                                    </p>
                                                </>
                                            )}
                                            {!editingMember && (
                                                <div className="flex items-center justify-between p-3.5 bg-primary/10 border border-primary/20 rounded-xl my-2">
                                                    <div>
                                                        <p className="text-xs font-semibold text-foreground">Invite Existing User Mode</p>
                                                        <p className="text-[11px] text-muted-foreground">Team members are added by inviting registered Dexter Auth users by username or email.</p>
                                                    </div>
                                                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase font-bold shrink-0">Required</Badge>
                                                </div>
                                            )}

                                            {form.inviteMode ? (
                                                <div>
                                                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Username or Email to Invite *</label>
                                                    <div className="relative">
                                                        <Input 
                                                            value={form.username} 
                                                            onChange={e => setForm(f => ({ ...f, username: e.target.value }))} 
                                                            placeholder="e.g. username or user@example.com" 
                                                            className={`bg-background border text-foreground focus-visible:ring-primary/50 rounded-lg pr-10 font-mono text-sm ${
                                                                verifyStatus.state === 'verified' 
                                                                    ? 'border-emerald-500/60 focus-visible:ring-emerald-500' 
                                                                    : verifyStatus.state === 'error'
                                                                    ? 'border-red-500/60 focus-visible:ring-red-500'
                                                                    : 'border-border'
                                                            }`} 
                                                        />
                                                        <div className="absolute right-3.5 inset-y-0 flex items-center pointer-events-none">
                                                            {verifyStatus.state === 'checking' && (
                                                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                                            )}
                                                            {verifyStatus.state === 'verified' && (
                                                                <Check className="w-4 h-4 text-emerald-400" />
                                                            )}
                                                            {verifyStatus.state === 'error' && (
                                                                <XCircle className="w-4 h-4 text-red-400" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {verifyStatus.state === 'checking' && (
                                                        <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5 animate-pulse">
                                                            <Loader2 className="w-3 h-3 text-primary animate-spin" /> Verifying account on Dexter Auth...
                                                        </p>
                                                    )}
                                                    {verifyStatus.state === 'verified' && verifyStatus.user && (
                                                        <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs border border-emerald-500/30 shrink-0 overflow-hidden">
                                                                {verifyStatus.user.avatar_url || verifyStatus.user.email || verifyStatus.user.username ? (
                                                                    <img 
                                                                        src={verifyStatus.user.avatar_url || getDefaultAvatarUrl(verifyStatus.user.email, verifyStatus.user.username)} 
                                                                        alt="" 
                                                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} 
                                                                        className="w-full h-full rounded-full object-cover" 
                                                                    />
                                                                ) : (
                                                                    (verifyStatus.user.username || "?")[0].toUpperCase()
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                                                                    <Check className="w-3.5 h-3.5 shrink-0" /> Account Verified: @{verifyStatus.user.username}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground/80 truncate">{verifyStatus.user.email}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {verifyStatus.state === 'error' && verifyStatus.message && (
                                                        <div className="mt-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                                                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                                            <span>{verifyStatus.message}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Username *</label>
                                                            <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. username" className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Email *</label>
                                                            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                                                            Password {editingMember ? <span className="text-muted-foreground/60">(leave blank to keep current)</span> : <span className="text-red-400">*</span>}
                                                        </label>
                                                        <Input type="password" value={form.pw} onChange={e => setForm(f => ({ ...f, pw: e.target.value }))} placeholder={editingMember ? "Leave blank to keep current" : "Set a strong password"} className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Expiry */}
                                        <div className="bg-muted/40 rounded-xl border border-border p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground/80">Account Expiration</p>
                                                    <p className="text-xs text-muted-foreground/70">Automatically disable this account after a date</p>
                                                </div>
                                                <button type="button" onClick={() => setForm(f => ({ ...f, does_expire: !f.does_expire }))}
                                                    className={`relative w-10 h-5 rounded-full transition-colors ${form.does_expire ? 'bg-primary' : 'bg-muted'}`}>
                                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-card rounded-full shadow transition-transform ${form.does_expire ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>
                                            {form.does_expire && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Input type="date" value={form.expires_date} min={getCurrentDate()} onChange={e => setForm(f => ({ ...f, expires_date: e.target.value }))} className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" />
                                                    <Input type="time" value={form.expires_time} onChange={e => setForm(f => ({ ...f, expires_time: e.target.value }))} className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: App Assignment */}
                                {step === 2 && (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium text-foreground/80 mb-1">Assign Applications</p>
                                            <p className="text-xs text-muted-foreground/70 mb-4">
                                                {appId ? "Selected application this member will be invited to." : "Select which apps this member can access."}
                                            </p>
                                            {(() => {
                                                const visibleApps = appId ? apps.filter(a => a.id === appId) : apps;
                                                if (visibleApps.length === 0) {
                                                    return <div className="text-center text-muted-foreground/70 text-sm py-8 border border-dashed border-border rounded-xl">No applications found. Create an app first.</div>;
                                                }
                                                return (
                                                    <div className="space-y-2">
                                                        {visibleApps.map(app => {
                                                            const selected = form.selectedApps.includes(app.name);
                                                            return (
                                                                <button key={app.id} type="button"
                                                                    onClick={() => setForm(f => ({
                                                                        ...f,
                                                                        selectedApps: f.inviteMode
                                                                            ? [app.name]
                                                                            : selected
                                                                                ? f.selectedApps.filter(n => n !== app.name)
                                                                                : [...f.selectedApps, app.name]
                                                                    }))}
                                                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${selected ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted/40 border-border text-foreground/80 hover:border-border'}`}>
                                                                    <CheckboxAnimated checked={selected} onChange={() => {}} />
                                                                    <span className="text-sm font-medium">{app.name}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: Reseller Balance */}
                                {step === 3 && form.role === 'reseller' && (
                                    <div className="space-y-5">
                                        <div>
                                            <p className="text-sm font-medium text-foreground/80 mb-1 flex items-center gap-2"><Key className="w-4 h-4 text-purple-400" />License Key Levels</p>
                                            <p className="text-xs text-muted-foreground/70 mb-2">Which tiers can this reseller generate? (e.g. <code className="text-purple-400">1|2|3</code>)</p>
                                            <Input value={form.keylevels} onChange={e => setForm(f => ({ ...f, keylevels: e.target.value }))} placeholder="1|2|3" className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg font-mono" />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground/80 flex items-center gap-2"><Wallet className="w-4 h-4 text-purple-400" />License Balance Allocation</p>
                                                    <p className="text-xs text-muted-foreground/70">Set how many keys this reseller can generate per duration. Max 999 each.</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-purple-400 font-medium">Unlimited Reseller</span>
                                                    <button type="button" onClick={() => setForm(f => ({ ...f, is_unlimited_reseller: !f.is_unlimited_reseller }))}
                                                        className={`relative w-10 h-5 rounded-full transition-colors ${form.is_unlimited_reseller ? 'bg-purple-600' : 'bg-muted'}`}>
                                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-card rounded-full shadow transition-transform ${form.is_unlimited_reseller ? 'translate-x-5' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {form.is_unlimited_reseller ? (
                                                <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 flex items-center justify-center text-center">
                                                    <p className="text-sm text-purple-300 font-medium flex items-center gap-2">
                                                        <Crown className="w-4 h-4 text-yellow-400" />
                                                        To Create User And License Freely using any expiry date.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-3">
                                                    {BALANCE_FIELDS.map(field => (
                                                        <div key={field.key} className="bg-muted/60 rounded-xl border border-border p-3">
                                                            <p className="text-xs text-muted-foreground font-medium mb-1">{field.label}</p>
                                                            <p className="text-[10px] text-muted-foreground/60 mb-2">{field.desc}</p>
                                                            <Input
                                                                type="number" min="0" max="999" inputMode="numeric"
                                                                value={form[field.key as keyof typeof form] as string}
                                                                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                                                                className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg h-8 text-sm"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: Manager Permissions */}
                                {step === 3 && form.role === 'manager' && (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium text-foreground/80 mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />Page Permissions</p>
                                            <p className="text-xs text-muted-foreground/70 mb-4">Toggle which sections of the dashboard this manager can access.</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {MANAGER_PERMS.map(perm => {
                                                    const checked = form.perms[perm.key] ?? false;
                                                    return (
                                                        <button key={perm.key} type="button"
                                                            onClick={() => setForm(f => ({ ...f, perms: { ...f.perms, [perm.key]: !f.perms[perm.key] } }))}
                                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${checked ? 'bg-primary/10 border-primary/40' : 'bg-muted/40 border-border hover:border-border'}`}>
                                                            <CheckboxAnimated checked={checked} onChange={() => {}} />
                                                            <span className={`text-sm font-medium ${checked ? 'text-primary' : 'text-muted-foreground'}`}>{perm.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between p-5 border-t border-border flex-shrink-0">
                                <Button type="button" variant="ghost" onClick={step === 1 ? closeModal : () => setStep(s => s - 1)}
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg flex items-center gap-2">
                                    {step === 1 ? <><X className="w-4 h-4" />Cancel</> : <><ChevronLeft className="w-4 h-4" />Back</>}
                                </Button>
                                {step < totalSteps ? (
                                    <Button type="button" onClick={() => setStep(s => s + 1)}
                                        disabled={
                                            step === 1 
                                                ? (form.inviteMode ? (!form.username || !form.role || verifyStatus.state !== 'verified') : (!form.username || !form.email || (!editingMember && !form.pw) || !form.role))
                                                : (step === 2 ? (form.inviteMode ? form.selectedApps.length !== 1 : form.selectedApps.length === 0) : false)
                                        }
                                        className="bg-primary hover:bg-primary text-white font-medium rounded-lg flex items-center gap-2 shadow-lg shadow-primary/20">
                                        Next <ChevronRight className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button type="button" onClick={handleSave} disabled={saving || !form.role || (form.inviteMode ? form.selectedApps.length !== 1 : form.selectedApps.length === 0)}
                                        className="bg-primary hover:bg-primary text-white font-medium rounded-lg flex items-center gap-2 shadow-lg shadow-primary/20">
                                        {saving ? 'Saving...' : <><Check className="w-4 h-4" />{form.inviteMode ? 'Send Invite' : (editingMember ? 'Save Changes' : 'Create Member')}</>}
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Modal */}
            <UserProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #1E293B; border-radius: 20px; }
            `}</style>
        </div>
    );
}
