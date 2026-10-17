import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { devApi } from "../lib/api";
import { getOptimizedImageUrl, getDefaultAvatarUrl } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { ToggleAnimated } from "../components/ui/toggle-animated";
import { SelectAnimated } from "../components/ui/select-animated";
import { ThemeToggle } from "../components/ThemeToggle";
import SupportChatBubble from "../components/support/SupportChatBubble";
import TeamChat from "../components/support/TeamChat";
import ShinyText from "../components/ui/shiny-text";
import GradientText from "../components/ui/gradient-text";
import { toast } from "sonner";
import { 
    LayoutDashboard, Key, Users, Ticket, CreditCard, MonitorPlay, 
    Users2, Settings, Search, Plus, Check, Copy, Activity, Lock, Unlock, Pause, PauseCircle, Play, X,
    Edit3, Trash2, Edit, CheckCircle2, ChevronRight, Clock, AlertTriangle, LogOut, User, MessageCircle, Bell, LifeBuoy, Mail, MessageSquare, Menu, Sparkles, FolderDown, Blocks
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import { motion, AnimatePresence } from "motion/react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandDialog,
} from "../components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";


import Licenses from "./Licenses";
import UsersView from "./Users";
import Tokens from "./Tokens";
import Subscriptions from "./Subscriptions";
import Sessions from "./Sessions";
import Team from "./Team";
import Overview from "./Overview";
import SettingsComponent from "./Settings";
import Profile from "./Profile";
import BalancesView from "./Balances";
import FilesView from "./Files";
import VariablesView from "./Variables";

interface AppData {
    id: string;
    name: string;
    api_key: string;
    status: boolean;
    description?: string;
    owner_id?: string;
    api_secret?: string;
    version?: string;
    user_count?: number;
    active_sessions_count?: number;
    token_validation?: boolean;
    membership?: {
        role: string;
        balance_day: number;
        balance_week: number;
        balance_month: number;
        balance_three_month: number;
        balance_six_month: number;
        balance_year: number;
        balance_lifetime: number;
        is_unlimited_reseller: boolean;
        allowed_license_levels: string;
    };
}

import { useDialog } from "../hooks/use-dialog";
import BrandWordmark from "../components/BrandWordmark";
import { SEO } from "../components/SEO";

interface AppSelectorDropdownProps {
    apps: AppData[];
    selectedAppId: string | null;
    onSelect: (appId: string | null) => void;
}

function AppSelectorDropdown({ apps, selectedAppId, onSelect }: AppSelectorDropdownProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const selectedApp = apps.find(a => a.id === selectedAppId);

    useEffect(() => {
        const handler = (e: MouseEvent | TouchEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handler);
        document.addEventListener("touchstart", handler);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("touchstart", handler);
        };
    }, []);

    const filtered = apps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={ref} className="px-4 py-3 border-b border-border/30 relative">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-2 px-1">Active App</p>
            <button
                type="button"
                onClick={() => { setOpen(o => !o); setSearch(""); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-200 text-left group ${
                    open 
                        ? 'bg-card border-primary/60 shadow-[0_0_0_2px_rgba(239,68,68,0.15)]' 
                        : 'bg-card/60 backdrop-blur-md hover:bg-card/90 border-border hover:border-primary/40'
                }`}
            >
                {selectedApp ? (
                    <>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary/10 border border-primary/20 text-primary group-hover:scale-105 transition-transform`}>
                            {selectedApp.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate leading-snug">{selectedApp.name}</p>
                            <p className={`text-[9px] font-medium leading-none mt-0.5 ${selectedApp.status ? 'text-emerald-500/90' : 'text-amber-500/90'}`}>
                                {selectedApp.status ? '● Active' : '⚠ Paused'}
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0 border border-border/50">
                            <LayoutDashboard className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium flex-1 truncate">Select application...</span>
                    </>
                )}
                <svg className={`w-4 h-4 flex-shrink-0 text-muted-foreground/75 group-hover:text-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute left-4 right-4 top-[calc(100%+6px)] z-50 bg-card/95 backdrop-blur-2xl border border-border rounded-xl shadow-2xl overflow-hidden p-1"
                    >
                        {apps.length > 4 && (
                            <div className="p-1.5 border-b border-border/30">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <input
                                        autoFocus
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search apps..."
                                        className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="max-h-[200px] overflow-y-auto custom-scrollbar py-1 space-y-0.5">
                            {filtered.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">No apps found</p>
                            ) : (
                                filtered.map(app => {
                                    const isSelected = app.id === selectedAppId;
                                    return (
                                        <button
                                            key={app.id}
                                            type="button"
                                            onClick={() => { onSelect(app.id); setOpen(false); setSearch(""); }}
                                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 ${
                                                isSelected 
                                                    ? 'bg-primary/20 text-white font-semibold border border-primary/20' 
                                                    : 'hover:bg-muted/85 text-muted-foreground hover:text-white'
                                            }`}
                                        >
                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                                isSelected
                                                    ? 'bg-primary text-white'
                                                    : app.status 
                                                        ? 'bg-primary/10 text-primary border border-primary/20' 
                                                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                            }`}>
                                                {app.name.slice(0, 1).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs truncate">{app.name}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {!app.status && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Paused</span>
                                                )}
                                                {isSelected && (
                                                    <Check className="w-3.5 h-3.5 text-primary" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function Dashboard() {

    const { confirm, prompt } = useDialog();
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem("active_tab") || "apps");

    const getTabTitle = (tab: string) => {
        switch (tab) {
            case "apps": return "Dashboard";
            case "overview": return "App Overview";
            case "licenses": return "Licenses";
            case "users": return "Users";
            case "tokens": return "Tokens";
            case "subscriptions": return "Subscriptions";
            case "sessions": return "Sessions";
            case "team": return "Team";
            case "settings": return "Settings";
            case "profile": return "Profile";
            case "balances": return "Balances";
            case "team-chat": return "Team Chat";
            default: return "Dashboard";
        }
    };

    useEffect(() => {
        localStorage.setItem("active_tab", activeTab);
    }, [activeTab]);
    const [apps, setApps] = useState<AppData[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalDbError, setGlobalDbError] = useState<boolean>(false);
    const [rateLimited, setRateLimited] = useState<boolean>(false);
    const [platformSettings, setPlatformSettings] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('admin'); // 'admin' | 'reseller' | 'manager'
    const [selectedAppId, setSelectedAppId] = useState<string | null>(() => localStorage.getItem("selected_app_id"));
    const [selectedAppDetails, setSelectedAppDetails] = useState<AppData | null>(null);
    const [showCode, setShowCode] = useState(false);
    const [selectedLang, setSelectedLang] = useState("csharp");
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [appFilter, setAppFilter] = useState("All Applications");
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showDiscordModal, setShowDiscordModal] = useState(false);
    const [newAppName, setNewAppName] = useState("");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Command Palette State
    const [isCommandOpen, setIsCommandOpen] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsCommandOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Rename App Modal
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [appToRename, setAppToRename] = useState<AppData | null>(null);
    const [newRename, setNewRename] = useState("");

    // Edit Description Modal
    const [isEditDescModalOpen, setIsEditDescModalOpen] = useState(false);
    const [appToEditDesc, setAppToEditDesc] = useState<AppData | null>(null);
    const [newDescription, setNewDescription] = useState("");

    const { login, logout, user } = useAuth();
    const isAdminImpersonating = localStorage.getItem('admin_token') !== null;
    const handleExitImpersonation = () => {
        const adminToken = localStorage.getItem('admin_token');
        if (adminToken) {
            localStorage.setItem('dev_token', adminToken);
            localStorage.removeItem('admin_token');
            localStorage.removeItem('selected_app_id');
            login(adminToken);
            navigate('/admin');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("selected_app_id");
        localStorage.removeItem("active_tab");
        localStorage.removeItem("admin_token"); // Ensure admin token is wiped on logout
        logout();
        navigate("/login");
    };

    const handleManageBilling = () => {
        setActiveTab("profile");
    };
    const navigate = useNavigate();

    // User Profile State
    const [profile, setProfile] = useState({
        id: "",
        username: "",
        display_name: "",
        email: "",
        role: "User",
        plan: "Free",
        plan_expires_at: null as number | null,
        avatar_url: "",
        banner_url: "",
        bio: "",
        badges: [] as string[],
        cloudflareDomain: "",
        nodeIp: "",
        contactEmail: "",
        discordInvite: "",
        is_unlimited_reseller: false,
        is_invited: false,
        balance_day: 0,
        balance_week: 0,
        balance_month: 0,
        balance_three_month: 0,
        balance_six_month: 0,
        balance_year: 0,
        balance_lifetime: 0,
        created_at: ""
    });
    const [permissions, setPermissions] = useState<any>(null);
    const [teamCount, setTeamCount] = useState<number>(0);
    const [showSupportModal, setShowSupportModal] = useState(false);

    // Notifications State
    const [notifications, setNotifications] = useState<{ invitations: any[], announcements: any[] }>({
        invitations: [],
        announcements: []
    });
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
    const [expandedAnnouncements, setExpandedAnnouncements] = useState<Record<string, boolean>>({});
    const prevNotifCountRef = useRef(0);
    const isInitialLoadRef = useRef(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = 0.5;
        }

        const unlockAudio = () => {
            // Play a 1-sample silent WAV file to unlock the browser's audio context quietly
            const silentPlay = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA').play();
            if (silentPlay !== undefined) {
                silentPlay.catch(err => {
                    console.log("Audio unlock muted/blocked:", err);
                });
            }
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

    const toggleExpandAnnouncement = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedAnnouncements(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const fetchNotifications = async () => {
        try {
            const res = await devApi.getNotifications();
            if (res.status === 'success') {
                setNotifications(res.data);
                const currentCount = res.data.invitations.length + res.data.announcements.length;
                const hasNew = !!res.data.hasUnread;
                
                if (isInitialLoadRef.current) {
                    setHasUnreadNotifications(hasNew);
                    isInitialLoadRef.current = false;
                } else if (currentCount > prevNotifCountRef.current && hasNew) {
                    // New notification arrived while dashboard is open!
                    setHasUnreadNotifications(true);
                    if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        console.log("Playing notification sound...");
                        const playPromise = audioRef.current.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(error => {
                                console.warn("Browser blocked autoplay:", error);
                            });
                        }
                    }
                } else if (!hasNew) {
                    setHasUnreadNotifications(false);
                }
                prevNotifCountRef.current = currentCount;
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    const handleRespondInvitation = async (invitationId: string, accept: boolean) => {
        try {
            const res = await devApi.respondToInvitation(invitationId, accept);
            toast.success(res.message);
            fetchNotifications();
            fetchApps();
            fetchProfile();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to respond to invitation");
        }
    };

    const handleLeaveTeam = async () => {
        if (!selectedAppId) return;
        if (!await confirm({
            title: "Leave Team",
            description: "Are you sure you want to leave this application/team? You will lose access immediately.",
            variant: "destructive"
        })) return;
        try {
            const res = await devApi.leaveTeam(selectedAppId);
            toast.success(res.message);
            setSelectedAppId(null);
            setSelectedAppDetails(null);
            fetchApps();
            fetchProfile();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to leave team");
        }
    };

    // Per-app ownership: true when the user owns the currently selected app
    // Used to gate admin-only features (Settings, Team, Rename, Delete, etc.)
    const isCurrentAppOwner = !selectedAppDetails?.owner_id || selectedAppDetails?.owner_id === profile?.id;

    // Calculate effective role based on whether an app is selected and if the user is a member
    const currentAppMembership = selectedAppDetails?.membership;
    const effectiveRole = isCurrentAppOwner ? userRole : (currentAppMembership?.role || userRole);

    const effectiveProfile = {
        ...profile,
        ...(isCurrentAppOwner ? {} : currentAppMembership || {})
    };

    const isReseller = effectiveRole === 'reseller';
    const isManager = effectiveRole === 'manager';
    const isAdmin = effectiveRole === 'admin';
    const isSeller = ['Developer', 'Seller'].includes(profile?.plan || '');
    const hasTeamAccess = isAdmin ? isSeller : true;

    const hasPermission = (key: string) => {
        if (!isManager) return true; // Admins and Resellers have full access to their tabs
        if (!permissions) return false;
        return permissions[key] === 1 || permissions[key] === true;
    };

    const isTabAllowed = (tab: string) => {
        if (!selectedAppId) return tab === "apps" || tab === "profile";
        if (tab === "apps" || tab === "profile" || tab === "overview") return true;
        if (tab === "licenses") return hasPermission('can_manage_licenses');
        if (tab === "users") return hasPermission('can_manage_users');
        if (tab === "tokens") return !isReseller && hasPermission('can_manage_tokens') && selectedAppDetails?.token_validation;
        if (tab === "subscriptions") return !isReseller && hasPermission('can_manage_subscriptions');
        if (tab === "sessions") return !isReseller && hasPermission('can_manage_sessions');
        if (tab === "variables") return !isReseller && (isCurrentAppOwner || (isManager && hasPermission('can_manage_vars')));
        if (tab === "files") return !isReseller && (isCurrentAppOwner || (isManager && hasPermission('can_manage_files')));
        if (tab === "team") return !isReseller && hasTeamAccess && (isCurrentAppOwner || (isManager && hasPermission('can_manage_team')));
        if (tab === "settings") return !isReseller && (isCurrentAppOwner || (isManager && hasPermission('can_manage_settings')));
        if (tab === "team-chat") return hasPermission('can_manage_chats');
        if (tab === "balances") return isReseller && !effectiveProfile?.is_unlimited_reseller;
        return true;
    };

    const sidebarLinks = [
        ...(selectedAppId ? [{ id: "overview", label: "App Overview", icon: Activity }] : []),
        { id: "apps", label: "Manage Apps", icon: LayoutDashboard },
        ...(selectedAppId ? [
            ...(hasPermission('can_manage_licenses') ? [{ id: "licenses", label: "Licenses", icon: Key }] : []),
            ...(hasPermission('can_manage_users') ? [{ id: "users", label: "Users", icon: Users }] : []),
            ...(!isReseller && hasPermission('can_manage_tokens') && selectedAppDetails?.token_validation ? [{ id: "tokens", label: "Tokens", icon: Ticket }] : []),
            ...(!isReseller && hasPermission('can_manage_subscriptions') ? [{ id: "subscriptions", label: "Subscriptions", icon: CreditCard }] : []),
            ...(!isReseller && hasPermission('can_manage_sessions') ? [{ id: "sessions", label: "Sessions", icon: MonitorPlay }] : []),
            ...(!isReseller && (isCurrentAppOwner || (isManager && hasPermission('can_manage_vars'))) ? [{ id: "variables", label: "Variables", icon: Blocks }] : []),
            ...(!isReseller && (isCurrentAppOwner || (isManager && hasPermission('can_manage_files'))) ? [{ id: "files", label: "Files", icon: FolderDown }] : []),
            ...(hasTeamAccess && hasPermission('can_manage_chats') && (teamCount > 0 || isReseller || isManager) ? [{ id: "team-chat", label: "Team Chat", icon: MessageCircle }] : []),
        ] : []),
        // Team & Settings: show when the user owns the app, or if they are a manager with explicit permission
        ...(!isReseller && hasTeamAccess && (isCurrentAppOwner || (isManager && hasPermission('can_manage_team'))) ? [{ id: "team", label: "Team", icon: Users2 }] : []),
        ...(!isReseller && (isCurrentAppOwner || (isManager && hasPermission('can_manage_settings'))) && selectedAppId ? [{ id: "settings", label: "Settings", icon: Settings }] : []),
        ...(isReseller && !effectiveProfile?.is_unlimited_reseller ? [{ id: "balances", label: "My Balances", icon: CreditCard }] : []),
        { id: "profile", label: "Profile", icon: Users },
    ].filter(Boolean);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.has("discord_link")) {
            setActiveTab("profile");
        }

        checkSystemHealth();
        fetchProfile();
        checkDiscordLink();
        fetchApps();
        fetchTeamCount(selectedAppId || undefined);
        fetchNotifications();
        fetchPlatformSettings();
        // Check health every 2 minutes — no need to hammer the server
        const healthInterval = setInterval(() => {
            checkSystemHealth();
            fetchNotifications();
            fetchPlatformSettings();
        }, 120000);
        return () => clearInterval(healthInterval);
    }, []);

    // Lightweight read of team size so the Team Chat tab can be hidden
    // entirely when there are no members to chat with.
    const fetchTeamCount = async (appIdForTeam?: string) => {
        try {
            const res = await devApi.getTeamMembers(appIdForTeam);
            if (res.status === 'success') {
                setTeamCount((res.data?.teamMembers || []).length);
            }
        } catch {
            setTeamCount(0);
        }
    };

    const fetchPlatformSettings = async () => {
        try {
            const res = await devApi.getPublicPlatformSettings();
            if (res.status === 'success') {
                setPlatformSettings(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch platform settings", error);
        }
    };

    const checkSystemHealth = async () => {
        try {
            const health = await devApi.getSystemHealth();
            if (health.status === 'rate_limited') {
                setRateLimited(true);
                setGlobalDbError(false);
            } else if (health.status === 'error' || health.database !== 'connected') {
                setGlobalDbError(true);
                setRateLimited(false);
            } else {
                setGlobalDbError(false);
                setRateLimited(false);
            }
        } catch {
            setGlobalDbError(true);
            setRateLimited(false);
        }
    };

    useEffect(() => {
        const appTabs = ["overview", "licenses", "users", "tokens", "subscriptions", "sessions", "settings", "team-chat"];
        if (appTabs.includes(activeTab) && !selectedAppId) {
            setActiveTab("apps");
        }
    }, [activeTab, selectedAppId]);

    const fetchProfile = async () => {
        try {
            const data = await devApi.getMe();
            if (data.status === 'success') {
                const rawRole = data.data.user.role;
                if (rawRole === 'master_admin') {
                    navigate('/admin');
                    return;
                }
                setUserRole(rawRole);
                setProfile({
                    id: data.data.user.id,
                    username: data.data.user.username,
                    display_name: data.data.user.display_name || "",
                    email: data.data.user.email,
                    role: rawRole === 'admin' ? 'Account Owner' : (rawRole === 'reseller' ? 'Reseller' : rawRole === 'manager' ? 'Manager' : 'User'),
                    plan: data.data.user.plan || "Free",
                    // plan_expires_at was dropped here → every downstream view
                    // (Profile, etc.) always rendered "Lifetime / Forever".
                    plan_expires_at: data.data.user.plan_expires_at ?? null,
                    avatar_url: data.data.user.avatar_url || "",
                    banner_url: data.data.user.banner_url || "",
                    bio: data.data.user.bio || "",
                    badges: typeof data.data.user.badges === 'string' 
                        ? JSON.parse(data.data.user.badges) 
                        : (data.data.user.badges || []),
                    cloudflareDomain: data.data.cloudflareDomain || "",
                    nodeIp: data.data.nodeIp || "",
                    contactEmail: data.data.contactEmail || "",
                    discordInvite: data.data.discordInvite || "",
                    is_unlimited_reseller: data.data.user.is_unlimited_reseller || false,
                    is_invited: data.data.user.is_invited === 1 || data.data.user.is_invited === true,
                    balance_day: data.data.user.balance_day || 0,
                    balance_week: data.data.user.balance_week || 0,
                    balance_month: data.data.user.balance_month || 0,
                    balance_three_month: data.data.user.balance_three_month || 0,
                    balance_six_month: data.data.user.balance_six_month || 0,
                    balance_year: data.data.user.balance_year || 0,
                    balance_lifetime: data.data.user.balance_lifetime || 0,
                    created_at: data.data.user.created_at
                });
                if (data.data.permissions) {
                    setPermissions(data.data.permissions);
                }
            }
        } catch (error) {
            console.error("Failed to fetch profile", error);
        }
    };

    const checkDiscordLink = async () => {
        try {
            const res = await devApi.getDiscordProfile();
            if (res.status === "success" && !res.data.linked) {
                if (!sessionStorage.getItem('discord_prompt_dismissed')) {
                    setShowDiscordModal(true);
                }
            }
        } catch (error) {
            console.error("Failed to check Discord link status:", error);
        }
    };

    const handleLinkDiscordInModal = async () => {
        try {
            const res = await devApi.getDiscordAuthUrl();
            if (res.status === "success" && res.data?.url) {
                window.location.href = res.data.url;
            } else {
                toast.error("Failed to retrieve Discord authorization link.");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to generate authorization URL.");
        }
    };

    const handleSelectAppInDropdown = (appId: string) => {
        setSelectedAppId(appId);
        const appTabs = ["overview", "licenses", "users", "tokens", "subscriptions", "sessions", "settings", "team-chat"];
        if (!appTabs.includes(activeTab)) {
            setActiveTab("overview");
        }
    };

    useEffect(() => {
        if (selectedAppId) {
            localStorage.setItem("selected_app_id", selectedAppId);
            fetchAppDetails(selectedAppId);
            fetchTeamCount(selectedAppId);
        } else {
            localStorage.removeItem("selected_app_id");
            setTeamCount(0);
        }
    }, [selectedAppId]);

    const fetchApps = async () => {
        try {
            const data = await devApi.getApps();
            if (data.status === "success") {
                const fetchedApps = data.data.apps || [];
                setApps(fetchedApps);
                const storedId = localStorage.getItem("selected_app_id");
                const exists = fetchedApps.some(a => a.id === storedId);
                if (exists && storedId) {
                    setSelectedAppId(storedId);
                    fetchAppDetails(storedId);
                } else if (fetchedApps.length > 0) {
                    setSelectedAppId(fetchedApps[0].id);
                } else {
                    setSelectedAppId(null);
                }
            }
        } catch (error) {
            // Do NOT set globalDbError here — apps failing ≠ DB down
            console.error("Failed to fetch apps", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAppDetails = async (id: string) => {
        try {
            const res = await devApi.getApp(id);
            if (res.status === 'success') {
                setSelectedAppDetails(res.data.app);
            }
        } catch (error) {
            console.error("Failed to fetch app details", error);
        }
    };

    const [isCreating, setIsCreating] = useState(false);

    const handleCreateApp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAppName || isCreating) return;
        setIsCreating(true);
        try {
            const data = await devApi.createApp(newAppName, "1.0");
            if (data.status === "success") {
                toast.success("Application created successfully!");
                setNewAppName("");
                setIsCreateModalOpen(false);
                // Add to local state instead of re-fetching all apps
                const newApp = data.data.app;
                setApps(prev => [...prev, newApp]);
                if (!selectedAppId) setSelectedAppId(newApp.id);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create app");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteApp = async (e: React.MouseEvent, appId: string) => {
        e.stopPropagation();
        if (!await confirm({ title: "Delete Application", description: "Are you sure you want to completely delete this application? This cannot be undone.", variant: "destructive" })) return;
        try {
            await devApi.deleteApp(appId);
            toast.success("Application deleted completely.");
            // Update local state — no re-fetch needed
            setApps(prev => prev.filter(a => a.id !== appId));
            if (selectedAppId === appId) {
                setSelectedAppId(null);
                setSelectedAppDetails(null);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete app");
        }
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success(`${field} copied!`);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleUpdateAppStatus = async (appId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            await devApi.updateApp(appId, { status: newStatus });
            toast.success(`Application ${newStatus === false ? 'paused' : 'resumed'} successfully.`);
            // Update local state only
            setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
            if (selectedAppId === appId) setSelectedAppDetails(prev => prev ? { ...prev, status: newStatus } : prev);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update application status");
        }
    };

    const handleRenameApp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appToRename || !newRename) return;
        try {
            await devApi.updateApp(appToRename.id, { name: newRename });
            toast.success("Application renamed successfully.");
            setIsRenameModalOpen(false);
            // Update local state only
            setApps(prev => prev.map(a => a.id === appToRename.id ? { ...a, name: newRename } : a));
            if (selectedAppId === appToRename.id) setSelectedAppDetails(prev => prev ? { ...prev, name: newRename } : prev);
            setAppToRename(null);
            setNewRename("");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to rename application");
        }
    };

    const handleEditDescription = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appToEditDesc) return;
        try {
            await devApi.updateApp(appToEditDesc.id, { description: newDescription });
            toast.success("Application description updated successfully.");
            setIsEditDescModalOpen(false);
            // Update local state only
            setApps(prev => prev.map(a => a.id === appToEditDesc.id ? { ...a, description: newDescription } : a));
            if (selectedAppId === appToEditDesc.id) setSelectedAppDetails(prev => prev ? { ...prev, description: newDescription } : prev);
            setAppToEditDesc(null);
            setNewDescription("");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update description");
        }
    };

    const handleRefreshSecret = async () => {
        if (!selectedAppId) return;
        if (!await confirm({ 
            title: "Refresh Secret", 
            description: "Are you sure you want to refresh the application secret? All existing SDK connections using the old secret will be broken.", 
            variant: "destructive" 
        })) return;
        
        try {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const newSecret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            
            await devApi.updateApp(selectedAppId, { api_secret: newSecret });
            toast.success("Application secret refreshed successfully");
            // Update local state only — no double fetch
            setSelectedAppDetails(prev => prev ? { ...prev, api_secret: newSecret } : prev);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to refresh secret");
        }
    };

    // --- Bulk Actions ---
    const handleBulkDeleteUsedLicenses = async () => {
        if (!selectedAppId) return;
        if (!await confirm({ title: "Delete All Used Licenses", description: "Are you sure you want to delete ALL used licenses for this app? This action cannot be undone.", variant: "destructive" })) return;
        try {
            const res = await devApi.deleteUsedLicenses(selectedAppId);
            toast.success(res.message || "Used licenses deleted.");
            setIsCommandOpen(false);
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete used licenses"); }
    };

    const handleBulkDeleteUnusedLicenses = async () => {
        if (!selectedAppId) return;
        if (!await confirm({ title: "Delete All Unused Licenses", description: "Are you sure you want to delete ALL unused licenses for this app? This action cannot be undone.", variant: "destructive" })) return;
        try {
            const res = await devApi.deleteUnusedLicenses(selectedAppId);
            toast.success(res.message || "Unused licenses deleted.");
            setIsCommandOpen(false);
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete unused licenses"); }
    };

    const handleBulkAddTimeToUnusedLicenses = async () => {
        if (!selectedAppId) return;
        const timeInput = await prompt({
            title: "Add Time to Unused Licenses",
            description: "Enter the amount of time in days to add to ALL unused licenses:",
            defaultValue: "30",
            confirmText: "Add Time"
        });
        if (!timeInput) return;
        const days = parseInt(timeInput);
        if (isNaN(days) || days <= 0) { toast.error("Please enter a valid number of days."); return; }
        
        try {
            const seconds = days * 24 * 60 * 60;
            const res = await devApi.addTimeToUnusedLicenses(selectedAppId, seconds);
            toast.success(res.message || "Time added to unused licenses.");
            setIsCommandOpen(false);
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to add time"); }
    };

    const handleBulkDeleteAllUsers = async () => {
        if (!selectedAppId) return;
        if (!await confirm({ title: "Delete ALL Users", description: "Are you sure you want to delete ALL users for this app? This action is extremely dangerous and cannot be undone.", variant: "destructive" })) return;
        try {
            const res = await devApi.deleteAllUsers(selectedAppId);
            toast.success(res.message || "All users deleted.");
            setIsCommandOpen(false);
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete users"); }
    };

    const handleBulkDeleteExpiredUsers = async () => {
        if (!selectedAppId) return;
        if (!await confirm({ title: "Delete Expired Users", description: "Are you sure you want to delete all EXPIRED users for this app? This action cannot be undone.", variant: "destructive" })) return;
        try {
            const res = await devApi.deleteExpiredUsers(selectedAppId);
            toast.success(res.message || "Expired users deleted.");
            setIsCommandOpen(false);
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete expired users"); }
    };

    const activeAppsCount = apps.filter(a => !!a.status).length;
    const pausedAppsCount = apps.length - activeAppsCount;
    
    const filteredApps = apps.filter(app => {
        const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = 
            appFilter === "All Applications" ? true :
            appFilter === "Active Only" ? !!app.status :
            !app.status;
        return matchesSearch && matchesFilter;
    });

    return (
        <>
        <SEO title={getTabTitle(activeTab)} path="/dashboard" indexable={false} />
        {isAdminImpersonating && (
            <div className="w-full bg-primary/10 border-b border-border/60 py-2 px-4 flex items-center justify-between text-xs sm:text-sm font-medium text-foreground relative z-50 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span>You are currently logged in as <strong>{user?.username || user?.email || "Developer"}</strong> (Impersonation Mode).</span>
                </div>
                <Button 
                    onClick={handleExitImpersonation}
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-semibold rounded-lg flex items-center gap-1.5"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Exit Impersonation
                </Button>
            </div>
        )}
        <div className={`flex ${isAdminImpersonating ? 'h-[calc(100vh-45px)]' : 'h-screen'} bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30`}>
            {/* Sidebar */}
            <motion.aside 
                className="w-64 flex-shrink-0 bg-muted/40 border-r border-border hidden md:flex flex-col z-20"
                initial={{ x: -250 }}
                animate={{ x: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                <div className="p-6 flex items-center justify-between border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <img src="/RDX.png" alt="Dexter Auth" className="w-8 h-8 rounded-lg object-cover border border-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.25)]" />
                        <span className="text-lg"><BrandWordmark /></span>
                    </div>
                </div>

                {/* Application Selector Dropdown */}
                {apps.length > 0 && (
                    <AppSelectorDropdown 
                        apps={apps} 
                        selectedAppId={selectedAppId} 
                        onSelect={(appId) => {
                            if (appId) {
                                handleSelectAppInDropdown(appId);
                            } else {
                                setSelectedAppId(null);
                                setActiveTab("apps");
                            }
                        }} 
                    />
                )}

                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    <nav className="space-y-1">
                        {sidebarLinks.map((link) => (
                            <button 
                                key={link.id} 
                                onClick={() => {
                                    setActiveTab(link.id);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    activeTab === link.id
                                    ? 'bg-primary/10 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                <link.icon className={`w-4 h-4 ${activeTab === link.id ? 'text-primary' : 'opacity-70'}`} />
                                {link.label}
                            </button>
                        ))}
                    </nav>
                </div>
                
                <div className="p-4 border-t border-border/50">
                    <button 
                        onClick={() => setShowSupportModal(true)} 
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground group"
                    >
                        <LifeBuoy className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors" />
                        Help & Support
                    </button>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Top Navigation Bar */}
                <header className="h-16 flex-shrink-0 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 z-50 gap-2 sm:gap-4">
                    {/* Mobile Menu Toggle */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors flex-shrink-0"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="relative flex-1 min-w-0 md:w-96 md:flex-none group z-50">
                        <button 
                            className="flex w-full min-w-0 items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground/70 hover:bg-muted/80 hover:text-foreground/80 transition-all shadow-sm"
                            onClick={() => setIsCommandOpen(true)}
                        >
                            <span className="flex items-center gap-2 overflow-hidden w-full">
                                <Search className="w-4 h-4 shrink-0" />
                                <span className="truncate">Search...</span>
                            </span>
                            <kbd className="hidden sm:inline-flex h-5 shrink-0 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </button>

                        <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
                            <CommandInput placeholder="Type a command or search..." />
                            <CommandList className="custom-scrollbar max-h-[350px]">
                                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground/70">No results found.</CommandEmpty>
                                
                                <CommandGroup heading="Applications" className="text-muted-foreground">
                                    {apps.map(app => (
                                        <CommandItem
                                            key={app.id}
                                            onSelect={() => {
                                                setSelectedAppId(app.id);
                                                setActiveTab("overview");
                                                setIsCommandOpen(false);
                                            }}
                                            className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2"
                                        >
                                            <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                                            <span>{app.name}</span>
                                            {!app.status && (
                                                <Badge variant="outline" className="ml-auto bg-orange-500/10 text-orange-500 border-orange-500/20 px-1 py-0 h-4 text-[9px]">
                                                    Paused
                                                </Badge>
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                
                                <CommandSeparator className="bg-muted" />
                                
                                <CommandGroup heading="Navigation" className="text-muted-foreground">
                                    {selectedAppId && (
                                        <CommandItem onSelect={() => { setActiveTab("overview"); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                            <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Overview</span>
                                        </CommandItem>
                                    )}
                                    {hasPermission('can_manage_licenses') && (
                                        <CommandItem onSelect={() => { setActiveTab("licenses"); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                            <Key className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Licenses</span>
                                        </CommandItem>
                                    )}
                                    {hasPermission('can_manage_users') && (
                                        <CommandItem onSelect={() => { setActiveTab("users"); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Users</span>
                                        </CommandItem>
                                    )}
                                    {(!isReseller && hasPermission('can_manage_tokens') && selectedAppDetails?.token_validation) && (
                                        <CommandItem onSelect={() => { setActiveTab("tokens"); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                            <Ticket className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Tokens</span>
                                        </CommandItem>
                                    )}
                                    {(!isReseller && hasPermission('can_manage_subscriptions')) && (
                                        <CommandItem onSelect={() => { setActiveTab("subscriptions"); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                            <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Subscriptions</span>
                                        </CommandItem>
                                    )}
                                    {(!isReseller && hasPermission('can_manage_sessions')) && (
                                        <CommandItem onSelect={() => { setActiveTab("sessions"); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                            <MonitorPlay className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Sessions</span>
                                        </CommandItem>
                                    )}
                                    {(!isReseller && (isCurrentAppOwner || (isManager && hasPermission('can_manage_files')))) && (
                                        <CommandItem onSelect={() => { setActiveTab("files"); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                            <FolderDown className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Files</span>
                                        </CommandItem>
                                    )}
                                    {(!isReseller && hasTeamAccess && (isCurrentAppOwner || (isManager && hasPermission('can_manage_team')))) && (
                                        <CommandItem onSelect={() => { setActiveTab("team"); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                            <Users2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Team Management</span>
                                        </CommandItem>
                                    )}
                                    {(!isReseller && (isCurrentAppOwner || (isManager && hasPermission('can_manage_settings'))) && selectedAppId) && (
                                        <CommandItem onSelect={() => { setActiveTab("settings"); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                            <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>App Settings</span>
                                        </CommandItem>
                                    )}
                                </CommandGroup>

                                <CommandSeparator className="bg-muted" />

                                <CommandGroup heading="Tab Actions" className="text-muted-foreground">
                                    {hasPermission('can_manage_licenses') && (
                                        <>
                                            <CommandItem onSelect={handleBulkDeleteUsedLicenses} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                                <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                                <span>Licenses / Delete All Used Licenses</span>
                                            </CommandItem>
                                            <CommandItem onSelect={handleBulkDeleteUnusedLicenses} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                                <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                                <span>Licenses / Delete All Unused Licenses</span>
                                            </CommandItem>
                                            <CommandItem onSelect={handleBulkAddTimeToUnusedLicenses} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                                <Clock className="mr-2 h-4 w-4 text-primary" />
                                                <span>Licenses / Add Time To Unused License</span>
                                            </CommandItem>
                                        </>
                                    )}
                                    {hasPermission('can_manage_users') && (
                                        <>
                                            <CommandItem onSelect={() => { setActiveTab("users"); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                                                <span>Users / View All Users</span>
                                            </CommandItem>
                                            <CommandItem onSelect={handleBulkDeleteAllUsers} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                                <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                                <span>Users / Delete All Users</span>
                                            </CommandItem>
                                            <CommandItem onSelect={handleBulkDeleteExpiredUsers} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                                <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                                <span>Users / Delete All Expired Users</span>
                                            </CommandItem>
                                        </>
                                    )}
                                </CommandGroup>

                                <CommandSeparator className="bg-muted" />

                                <CommandGroup heading="Quick Actions" className="text-muted-foreground">
                                    {isAdmin && (
                                        <CommandItem onSelect={() => { setIsCreateModalOpen(true); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                            <Plus className="mr-2 h-4 w-4 text-emerald-500" />
                                            <span>Create New Application</span>
                                        </CommandItem>
                                    )}
                                    <CommandItem onSelect={() => { setActiveTab("profile"); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-foreground px-3 py-2">
                                        <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <span>My Profile</span>
                                    </CommandItem>
                                    <CommandItem onSelect={() => { handleLogout(); setIsCommandOpen(false); }} className="cursor-pointer hover:bg-muted/40 data-[selected='true']:bg-muted/40 text-red-400 hover:text-red-300 px-3 py-2">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log Out</span>
                                    </CommandItem>
                                </CommandGroup>
                                        </CommandList>
                        </CommandDialog>
                    </div>

                    {/* Right side controls: Notifications & Profile */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <ThemeToggle />
                        {/* Notifications Dropdown */}
                        <DropdownMenu onOpenChange={async (isOpen) => {
                            if (isOpen) {
                                setHasUnreadNotifications(false);
                                try {
                                    await devApi.markNotificationsAsSeen();
                                } catch (err) {
                                    console.error("Failed to mark notifications as seen", err);
                                }
                            }
                        }}>
                            <DropdownMenuTrigger asChild>
                                <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-full transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    <Bell className="w-5 h-5" />
                                    {hasUnreadNotifications && (
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background animate-pulse" />
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[95vw] sm:w-[420px] max-w-[420px] bg-popover/95 backdrop-blur-xl border-border/50 text-popover-foreground p-0 shadow-2xl rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-border/50 bg-muted/20 flex justify-between items-center">
                                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-primary" />
                                        Notifications
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] font-medium bg-primary/10 text-primary border-primary/20 rounded-full px-2">
                                        {notifications.invitations.length + notifications.announcements.length} Total
                                    </Badge>
                                </div>
                                
                                <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-3 space-y-3">
                                    {notifications.invitations.length === 0 && notifications.announcements.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                                                <Bell className="w-6 h-6 text-muted-foreground/50" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">All caught up!</p>
                                            <p className="text-xs text-muted-foreground mt-1">You have no new notifications.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Invitations */}
                                            {notifications.invitations.map((inv) => (
                                                <div key={inv.id} className="p-3 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl space-y-3 transition-all hover:border-emerald-500/30">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                            <Users className="w-4 h-4 text-emerald-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-emerald-400">Team Invitation</p>
                                                            <p className="text-[13px] leading-relaxed text-foreground mt-1">
                                                                <span className="font-semibold text-emerald-300">@{inv.inviter_username}</span> invited you to join <span className="font-semibold text-foreground">{inv.app_name}</span> as a <span className="text-emerald-300 font-medium">{inv.role}</span>.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 pl-11">
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleRespondInvitation(inv.id, true)} 
                                                            className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-foreground font-semibold rounded-lg shadow-md shadow-emerald-900/20"
                                                        >
                                                            Accept
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleRespondInvitation(inv.id, false)} 
                                                            variant="outline" 
                                                            className="flex-1 h-8 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-semibold rounded-lg"
                                                        >
                                                            Decline
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Announcements */}
                                            {notifications.announcements.map((ann) => {
                                                const isLong = ann.content && ann.content.length > 150;
                                                const isExpanded = !!expandedAnnouncements[ann.id];
                                                const displayText = isLong && !isExpanded 
                                                    ? `${ann.content.substring(0, 150)}...` 
                                                    : ann.content;

                                                return (
                                                    <div key={ann.id} className={`group p-3 bg-gradient-to-br from-transparent to-transparent border rounded-xl space-y-2 transition-all relative overflow-hidden ${
                                                        ann.type === 'Critical' ? 'border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10' :
                                                        ann.type === 'Update' ? 'border-primary/30 hover:border-primary/50 hover:bg-primary/10' :
                                                        ann.type === 'Complete' ? 'border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/10' :
                                                        'border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10'
                                                    }`}>
                                                        <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${
                                                            ann.type === 'Critical' ? 'bg-red-500/50 group-hover:bg-red-400' :
                                                            ann.type === 'Update' ? 'bg-primary/50 group-hover:bg-primary' :
                                                            ann.type === 'Complete' ? 'bg-emerald-500/50 group-hover:bg-emerald-400' :
                                                            'bg-purple-500/50 group-hover:bg-purple-400'
                                                        }`} />
                                                        <div className="pl-2">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <p className={`text-sm font-semibold leading-tight ${
                                                                        ann.type === 'Critical' ? 'text-red-400' :
                                                                        ann.type === 'Update' ? 'text-primary' :
                                                                        ann.type === 'Complete' ? 'text-emerald-400' :
                                                                        'text-purple-400'
                                                                    }`}>
                                                                        {ann.title}
                                                                    </p>
                                                                    <Badge variant="outline" className={`text-[9px] uppercase font-bold py-0 h-4 border ${
                                                                        ann.type === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                        ann.type === 'Update' ? 'bg-primary/10 text-primary border-primary/20' :
                                                                        ann.type === 'Complete' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                        'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                                    }`}>
                                                                        {ann.type || 'Information'}
                                                                    </Badge>
                                                                </div>
                                                                <span className="text-[10px] font-medium text-muted-foreground/60 shrink-0 bg-muted/50 px-1.5 py-0.5 rounded-md">
                                                                    {new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-[13px] leading-relaxed text-muted-foreground mt-1.5 whitespace-pre-wrap break-words">{displayText}</p>
                                                            {isLong && (
                                                                <button 
                                                                    onClick={(e) => toggleExpandAnnouncement(ann.id, e)}
                                                                    className="text-xs font-semibold text-primary hover:underline mt-1.5 block"
                                                                >
                                                                    {isExpanded ? "Show Less" : "Read More"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Profile Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="flex items-center gap-4 cursor-pointer hover:bg-muted/40 p-2 rounded-xl transition-colors">
                                    <div className="text-right hidden sm:block">
                                        {profile?.plan === 'Seller' ? (
                                            <div className="flex items-center gap-1.5 justify-end">
                                                <ShinyText 
                                                    text={profile.display_name || profile.username || "Loading..."} 
                                                    speed={2} 
                                                    color="#94a3b8" 
                                                    shineColor="#ffffff" 
                                                    className="text-sm font-semibold leading-tight block" 
                                                />
                                                <span className="text-[9px] bg-primary/15 text-primary border border-primary/20 px-1 py-0.2 rounded font-bold uppercase tracking-wider scale-90">Seller</span>
                                            </div>
                                        ) : profile?.plan === 'Developer' ? (
                                            <div className="flex items-center gap-1.5 justify-end">
                                                <GradientText
                                                    colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                                    animationSpeed={3}
                                                    showBorder={false}
                                                    className="text-sm font-semibold leading-tight block"
                                                >
                                                    {profile.display_name || profile.username || "Loading..."}
                                                </GradientText>
                                                <span className="text-[9px] bg-purple-500/15 text-purple-400 border border-purple-500/20 px-1 py-0.2 rounded font-bold uppercase tracking-wider scale-90">Developer</span>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-semibold text-foreground leading-tight">{profile.display_name || profile.username || "Loading..."}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">{profile.role}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center text-foreground font-bold shadow-lg shrink-0">
                                        {profile.avatar_url || profile.email || profile.username ? (
                                            <img 
                                                src={getOptimizedImageUrl(profile.avatar_url || getDefaultAvatarUrl(profile.email, profile.username), 48, 48)} 
                                                alt="Profile" 
                                                className="w-full h-full object-cover" 
                                                loading="lazy" 
                                                onError={(e) => {
                                                    const target = e.currentTarget;
                                                    target.onerror = null;
                                                    target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile.username || profile.email || 'U')}`;
                                                }}
                                            />
                                        ) : (
                                            <span className="text-sm bg-gradient-to-br from-primary to-red-600 w-full h-full flex items-center justify-center">
                                                {(profile.display_name || profile.username || "??").substring(0, 2).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-muted" />
                                <DropdownMenuItem onClick={() => setActiveTab("profile")} className="cursor-pointer hover:bg-muted focus:bg-muted">
                                    <User className="mr-2 w-4 h-4" /> Profile Settings
                                </DropdownMenuItem>
                                {profile?.plan === 'Free' ? (
                                    <DropdownMenuItem onClick={() => navigate('/', { state: { scrollToPricing: true } })} className="cursor-pointer hover:bg-muted focus:bg-muted">
                                        <Sparkles className="mr-2 w-4 h-4 text-primary" /> Upgrade Plan
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={handleManageBilling} className="cursor-pointer hover:bg-muted focus:bg-muted">
                                        <CreditCard className="mr-2 w-4 h-4 text-primary" /> Manage Billing
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-muted" />
                                <DropdownMenuItem onClick={() => handleLogout()} className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400">
                                    <LogOut className="mr-2 w-4 h-4" /> Log Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Global Outage Banner */}
                {globalDbError && (
                    <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-400">Database Connection Error</p>
                            <p className="text-xs text-red-300/80">The system cannot reach the database. App data will not load.</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => window.open('https://status.dexterauth.com/', '_blank')} className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30">
                            View Status
                        </Button>
                    </div>
                )}
                
                {/* Rate Limited Banner */}
                {rateLimited && (
                    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-3 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-400">Rate Limited</p>
                            <p className="text-xs text-yellow-300/80">You have made too many requests. Please wait a moment.</p>
                        </div>
                    </div>
                )}

                {/* Urgent Dashboard-Wide Banner */}
                {platformSettings?.dashboardBannerActive && platformSettings?.dashboardBannerText && (
                    <div className={`border-b px-6 py-3 flex items-center gap-3 ${
                        platformSettings.dashboardBannerTheme === 'critical'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
                            : platformSettings.dashboardBannerTheme === 'warning'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : 'bg-primary/10 border-primary/20 text-primary'
                    }`}>
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">{platformSettings.dashboardBannerText}</p>
                        </div>
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
                    {activeTab === "apps" && (
                        <div className="max-w-[1400px] mx-auto">
                            
                            {/* Header Area */}
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }} 
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-8"
                            >
                            <nav className="flex mb-2" aria-label="Breadcrumb">
                                <ol className="inline-flex items-center space-x-1 md:space-x-2 text-sm max-w-full overflow-hidden">
                                    <li className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0">
                                        Manage Apps
                                    </li>
                                    <li className="truncate">
                                        <div className="flex items-center text-muted-foreground/70 truncate">
                                            <ChevronRight className="w-4 h-4 mx-1 shrink-0" />
                                            <span className="truncate">Current Application: <span className="text-foreground font-medium ml-1">{selectedAppDetails?.name || (selectedAppId ? "Loading..." : "Not Selected")}</span></span>
                                        </div>
                                    </li>
                                </ol>
                            </nav>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground truncate">Manage Applications</h1>
                        </motion.div>

                        {/* Statistics Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[
                                { title: "Total Apps", value: apps.length },
                                { title: "Active Apps", value: activeAppsCount },
                                { title: "Paused Apps", value: pausedAppsCount },
                                { title: "Active Sessions", value: apps.reduce((sum, app) => sum + (app.active_sessions_count || 0), 0) },
                            ].map((stat, i) => (
                                <motion.div
                                    key={stat.title}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: i * 0.1 }}
                                >
                                    <div className="relative flex flex-col items-center justify-center text-center bg-muted/40 border border-border px-2 sm:px-4 py-6 rounded-xl w-full transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                                        <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1 truncate w-full">{stat.value}</p>
                                        <p className="text-[10px] sm:text-sm text-muted-foreground whitespace-nowrap truncate w-full px-1">{stat.title}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Two-Column Layout */}
                        <div className="flex flex-col lg:flex-row gap-6">
                            
                            {/* Left Column (Application Credentials) */}
                            {selectedAppId && (
                                <motion.div 
                                    className="w-full lg:w-1/3"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.4 }}
                                >
                                <div className="bg-muted/40 rounded-xl border border-border p-6 h-full shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-foreground">Application Credentials</h3>
                                        {/* Show "Leave Team" only on apps the user does NOT own */}
                                        {selectedAppDetails?.owner_id && selectedAppDetails.owner_id !== profile.id && (
                                            <Button 
                                                onClick={handleLeaveTeam} 
                                                variant="outline" 
                                                size="sm"
                                                className="border-red-500/20 text-red-500 hover:bg-red-500/10 h-8 rounded-lg"
                                            >
                                                Leave Team
                                            </Button>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-muted-foreground">Display Code Snippet</span>
                                            <ToggleAnimated checked={showCode} onChange={(val) => setShowCode(val)} />
                                        </div>

                                        <AnimatePresence mode="wait">
                                            {!showCode ? (
                                                <motion.div 
                                                    key="credentials"
                                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                    className="space-y-3"
                                                >
                                                    {[
                                                        { label: "Application Name", value: selectedAppDetails?.name, mask: false },
                                                        ...(!isReseller ? [{ label: "Application ID (ownerid)", value: selectedAppDetails?.id, mask: true }] : []),
                                                        ...(!isReseller ? [{ label: "Application Secret", value: selectedAppDetails?.api_secret, mask: true }] : []),
                                                        { label: "Application Version", value: selectedAppDetails?.version, mask: false },
                                                    ].filter(Boolean).map((field: any, idx: number) => (
                                                        <div key={idx} className="relative bg-background rounded-lg p-3 border border-border group/field overflow-hidden">
                                                            <button 
                                                                onClick={() => copyToClipboard(field.value || "", field.label)} 
                                                                className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground/70 hover:text-foreground transition-all transform active:scale-95 z-20 bg-background p-1.5 rounded-md shadow-sm border border-border"
                                                                title="Copy to clipboard"
                                                            >
                                                                {copiedField === field.label ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                                            </button>
                                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-1 whitespace-nowrap truncate w-full pr-8">{field.label}</p>
                                                            <div className="pr-10 relative z-10">
                                                                <p className={`text-sm font-semibold text-foreground font-mono break-all ${field.mask ? 'blur-[4px] hover:blur-none transition-all duration-300 cursor-pointer select-none hover:select-text' : 'select-all'}`}>
                                                                    {field.value || "Loading..."}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {!isReseller && isCurrentAppOwner && (
                                                        <Button onClick={handleRefreshSecret} className="w-full mt-4 bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-foreground border border-orange-500/20 hover:border-orange-500 transition-all active:scale-[0.98]">
                                                            Refresh Application Secret
                                                        </Button>
                                                    )}
                                                    
                                                    <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary">
                                                        Note: Keep your application secret secure. Do not share it publicly.
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div 
                                                    key="code"
                                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                    className="space-y-3"
                                                >
                                                    <SelectAnimated 
                                                        value={selectedLang}
                                                        onChange={(val) => setSelectedLang(val)}
                                                        options={[
                                                            { value: "csharp", label: "C#" },
                                                            { value: "cpp", label: "C++" },
                                                            { value: "py", label: "Python" },
                                                            { value: "js", label: "JavaScript" },
                                                            { value: "php", label: "PHP" }
                                                        ]}
                                                    />
                                                    <div className="relative">
                                                        <pre id="dashboard-code-snippet" className="bg-muted/60 dark:bg-[#1f1f23]/80 text-black dark:text-emerald-400 text-xs p-4 rounded-lg overflow-x-auto border border-border dark:border-[#27272a] font-mono leading-relaxed">
{selectedLang === "csharp" && `public static api DexterAuthApp = new api(
    name: "${selectedAppDetails?.name || 'Loading...'}", ${
        !isReseller ? `\n    ownerid: "${selectedAppDetails?.id || 'Loading...'}",\n    secret: "${selectedAppDetails?.api_secret || 'Loading...'}",` : ''
    }
    version: "${selectedAppDetails?.version || 'Loading...'}" 
);`}
{selectedLang === "cpp" && `std::string name = skCrypt("${selectedAppDetails?.name || 'Loading'}").decrypt(); ${!isReseller ? `\nstd::string ownerid = skCrypt("${selectedAppDetails?.id || 'Loading'}").decrypt(); \nstd::string secret = skCrypt("${selectedAppDetails?.api_secret || 'Loading'}").decrypt();` : ''} 
std::string version = skCrypt("${selectedAppDetails?.version || 'Loading'}").decrypt(); 
std::string url = skCrypt("https://${profile.cloudflareDomain || profile.nodeIp || 'dexterauth.onrender.com'}/api/v2/client/").decrypt();`}
{selectedLang === "py" && `dexterapp = api(
    name = "${selectedAppDetails?.name || 'Loading'}", ${!isReseller ? `\n    ownerid = "${selectedAppDetails?.id || 'Loading'}",\n    client_secret = "${selectedAppDetails?.api_secret || 'Loading'}",` : ''}
    version = "${selectedAppDetails?.version || 'Loading'}", 
    hash_to_check = getchecksum()
)`}
{selectedLang === "js" && `const DexterAuthApp = new Dexter Auth({
    name: "${selectedAppDetails?.name || 'Loading'}",${!isReseller ? `\n    ownerid: "${selectedAppDetails?.id || 'Loading'}",\n    secret: "${selectedAppDetails?.api_secret || 'Loading'}",` : ''}
    version: "${selectedAppDetails?.version || 'Loading'}",
})`}
{selectedLang === "php" && `$name = "${selectedAppDetails?.name || 'Loading'}";${!isReseller ? `\n$ownerid = "${selectedAppDetails?.id || 'Loading'}";\n$secret = "${selectedAppDetails?.api_secret || 'Loading'}";` : ''}`}
                                                        </pre>
                                                        <div className="mt-3 flex gap-2 flex-wrap">
                                                            <Button onClick={() => {
                                                                let codeStr = "";
                                                                if (selectedLang === "csharp") {
                                                                    codeStr = `public static api DexterAuthApp = new api(\n    name: "${selectedAppDetails?.name || 'Loading...'}", ${
                                                                        !isReseller ? `\n    ownerid: "${selectedAppDetails?.id || 'Loading...'}",\n    secret: "${selectedAppDetails?.api_secret || 'Loading...'}",` : ''
                                                                    }\n    version: "${selectedAppDetails?.version || 'Loading...'}"\n);`;
                                                                } else if (selectedLang === "cpp") {
                                                                    codeStr = `std::string name = skCrypt("${selectedAppDetails?.name || 'Loading'}").decrypt(); ${!isReseller ? `\nstd::string ownerid = skCrypt("${selectedAppDetails?.id || 'Loading'}").decrypt(); \nstd::string secret = skCrypt("${selectedAppDetails?.api_secret || 'Loading'}").decrypt();` : ''}\nstd::string version = skCrypt("${selectedAppDetails?.version || 'Loading'}").decrypt();\nstd::string url = skCrypt("https://${profile.cloudflareDomain || profile.nodeIp || 'dexterauth.onrender.com'}/api/v2/client/").decrypt();`;
                                                                } else if (selectedLang === "py") {
                                                                    codeStr = `dexterapp = api(\n    name = "${selectedAppDetails?.name || 'Loading'}", ${!isReseller ? `\n    ownerid = "${selectedAppDetails?.id || 'Loading'}",\n    client_secret = "${selectedAppDetails?.api_secret || 'Loading'}",` : ''}\n    version = "${selectedAppDetails?.version || 'Loading'}",\n    hash_to_check = getchecksum()\n)`;
                                                                } else if (selectedLang === "js") {
                                                                    codeStr = `const DexterAuthApp = new Dexter Auth({\n    name: "${selectedAppDetails?.name || 'Loading'}",${!isReseller ? `\n    ownerid: "${selectedAppDetails?.id || 'Loading'}",\n    secret: "${selectedAppDetails?.api_secret || 'Loading'}",` : ''}\n    version: "${selectedAppDetails?.version || 'Loading'}",\n})`;
                                                                } else if (selectedLang === "php") {
                                                                    codeStr = `$name = "${selectedAppDetails?.name || 'Loading'}";${!isReseller ? `\n$ownerid = "${selectedAppDetails?.id || 'Loading'}";\n$secret = "${selectedAppDetails?.api_secret || 'Loading'}";` : ''}`;
                                                                }
                                                                
                                                                navigator.clipboard.writeText(codeStr);
                                                                toast.success("Code copied!");
                                                            }} variant="secondary" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground border-none">
                                                                <Copy className="w-3 h-3 mr-2" />
                                                                Copy Code
                                                            </Button>
                                                            <Button 
                                                                onClick={() => {
                                                                    if (selectedLang === 'py') window.open('https://github.com/shivapatel2/DexterAuth', '_blank');
                                                                    else window.open('/docs#sdks', '_blank');
                                                                }} 
                                                                variant="secondary" 
                                                                size="sm" 
                                                                className="bg-green-600 hover:bg-green-700 text-white border-none"
                                                            >
                                                                <MonitorPlay className="w-3 h-3 mr-2" />
                                                                {selectedLang === 'py' ? 'View Python Example' : 'View Docs'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                            )}

                            {/* Right Column (My Applications) */}
                            <motion.div 
                                className={`w-full ${selectedAppId ? 'lg:w-2/3' : ''} flex flex-col`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <div className="bg-muted/40 rounded-xl border border-border p-6 flex-1 shadow-sm">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                                        <h3 className="text-lg font-semibold text-foreground whitespace-nowrap">My Applications</h3>
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <div className="relative w-full sm:w-48">
                                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                                                <Input 
                                                    className="pl-9 bg-background border-border h-9 text-sm focus-visible:ring-primary/50" 
                                                    placeholder="Search apps..." 
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <SelectAnimated 
                                                className="w-[160px] shrink-0"
                                                value={appFilter}
                                                onChange={(val) => setAppFilter(val)}
                                                options={[
                                                    { value: "All Applications", label: "All Applications" },
                                                    { value: "Active Only", label: "Active Only" },
                                                    { value: "Paused", label: "Paused" }
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    {!isReseller && (
                                        <Button 
                                            className="w-full mb-6 bg-primary hover:bg-primary hover:brightness-110 text-white font-semibold transition-all transform hover:scale-[1.01] active:scale-[0.98]"
                                            onClick={() => setIsCreateModalOpen(true)}
                                        >
                                            <Plus className="w-5 h-5 mr-2" />
                                            Create Application
                                        </Button>
                                    )}

                                    <div className="space-y-3">
                                        {loading ? (
                                            [1,2,3].map(i => <div key={i} className="animate-pulse bg-muted/50 h-24 rounded-lg" />)
                                        ) : filteredApps.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground/70">No applications found.</div>
                                        ) : (
                                            filteredApps.map((app, index) => (
                                                <motion.div
                                                    key={app.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                                    className={`relative group p-4 rounded-lg border transition-all duration-300 ${
                                                        selectedAppId === app.id 
                                                            ? 'bg-muted border-primary/50 shadow-[0_0_10px_rgba(37,99,235,0.1)]' 
                                                            : !app.status
                                                                ? 'bg-background border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)] opacity-90'
                                                                : 'bg-background border-border hover:border-border'
                                                    }`}
                                                >
                                                    {!app.status && (
                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full flex items-center shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            Paused recently
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <h4 className={`font-bold text-base ${!app.status ? 'text-amber-600 dark:text-amber-100/70' : 'text-foreground'}`}>{app.name}</h4>
                                                                    </TooltipTrigger>
                                                                    {!app.status && (
                                                                        <TooltipContent className="bg-amber-950 border border-amber-500/50 text-amber-200">
                                                                            <p>This application is currently paused. Users cannot access it.</p>
                                                                        </TooltipContent>
                                                                    )}
                                                                </Tooltip>
                                                                {!app.status ? (
                                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30 text-[10px] uppercase px-2 py-0 h-5 flex items-center shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                                                                        <PauseCircle className="w-3 h-3 mr-1" />
                                                                        Paused
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase px-2 py-0 h-5 flex items-center">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                                                                        Active
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {app.description && (
                                                                <p className={`text-sm max-w-md truncate mb-2 ${!app.status ? 'text-amber-600/80 dark:text-amber-500/60' : 'text-muted-foreground'}`}>
                                                                    {app.description}
                                                                </p>
                                                            )}
                                                            <div className={`flex items-center gap-4 text-xs ${!app.status ? 'text-amber-600/70 dark:text-amber-500/50' : 'text-muted-foreground'}`}>
                                                                <span>Version: {app.version || "1.0"}</span>
                                                                <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {app.user_count || 0} Users</span>
                                                                <span className="flex items-center gap-1"><MonitorPlay className="w-3 h-3"/> {app.active_sessions_count || 0} Sessions</span>
                                                                {!app.status ? (
                                                                    <span className="flex items-center gap-1 text-amber-500"><AlertTriangle className="w-3 h-3"/> Maintenance</span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="w-3 h-3"/> Good Standing</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => {
                                                                    setSelectedAppId(app.id);
                                                                    setActiveTab("overview");
                                                                }}
                                                                className={`h-8 text-xs font-medium transition-all active:scale-95 ${
                                                                    selectedAppId === app.id 
                                                                    ? 'bg-primary hover:bg-primary text-white' 
                                                                    : 'bg-muted hover:bg-muted text-foreground/80'
                                                                }`}
                                                            >
                                                                Select
                                                            </Button>
                                                            {/* Show admin buttons only if the user OWNS this specific app */}
                                                            {!isReseller && (!app.owner_id || app.owner_id === profile.id) && (<>
                                                            <Button 
                                                                size="sm" 
                                                                onClick={(e) => { e.stopPropagation(); setAppToRename(app); setNewRename(app.name); setIsRenameModalOpen(true); }}
                                                                className="h-8 w-8 p-0 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-foreground transition-all active:scale-95 border border-purple-500/20" 
                                                                title="Rename"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="sm" onClick={(e) => { e.stopPropagation(); setAppToEditDesc(app); setNewDescription(app.description || ""); setIsEditDescModalOpen(true); }} className="h-8 w-8 p-0 bg-teal-500/10 text-teal-400 hover:bg-teal-500 hover:text-foreground transition-all active:scale-95 border border-teal-500/20" title="Edit Description">
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                onClick={(e) => { e.stopPropagation(); handleUpdateAppStatus(app.id, app.status); }}
                                                                className={`h-8 w-8 p-0 transition-all active:scale-95 border ${
                                                                    !app.status
                                                                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-foreground border-emerald-500/20'
                                                                    : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-foreground border-amber-500/20'
                                                                }`} 
                                                                title={!app.status ? 'Resume' : 'Pause'}
                                                            >
                                                                {!app.status ? <Play className="w-4 h-4 ml-0.5" /> : <Pause className="w-4 h-4" />}
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteApp(e, app.id); }}
                                                                className="h-8 w-8 p-0 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-foreground transition-all active:scale-95 border border-red-500/20" 
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                            </>)}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                    )}
                    {!isTabAllowed(activeTab) ? (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-6 bg-card border border-border rounded-2xl max-w-md mx-auto my-12 shadow-sm animate-in fade-in-50 duration-200">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-1">Access Denied</h3>
                            <p className="text-sm text-muted-foreground">You do not have permission to access the "{activeTab}" section of this application.</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === "overview" && (
                                <Overview appId={selectedAppId || ""} appName={selectedAppDetails?.name || "Loading..."} />
                            )}
                            {activeTab === "licenses" && (
                                <Licenses appId={selectedAppId || ""} appName={selectedAppDetails?.name || "Loading..."} isPaused={!selectedAppDetails?.status} />
                            )}
                            {activeTab === "users" && (
                                <UsersView appId={selectedAppId || ""} appName={selectedAppDetails?.name || "Loading..."} isPaused={!selectedAppDetails?.status} profile={profile} />
                            )}
                            {activeTab === "tokens" && (
                                <Tokens appId={selectedAppId || ""} appName={selectedAppDetails?.name || "Loading..."} />
                            )}
                            {activeTab === "subscriptions" && (
                                <Subscriptions appId={selectedAppId || ""} appName={selectedAppDetails?.name || "Loading..."} isPaused={!selectedAppDetails?.status} />
                            )}
                            {activeTab === "sessions" && (
                                <Sessions appId={selectedAppId || ""} appName={selectedAppDetails?.name || "Loading..."} />
                            )}
                            {activeTab === "variables" && (
                                <VariablesView appId={selectedAppId || ""} appName={selectedAppDetails?.name || "Loading..."} isPaused={!selectedAppDetails?.status} />
                            )}
                            {activeTab === "files" && (
                                <FilesView appId={selectedAppId || ""} appName={selectedAppDetails?.name || "Loading..."} isPaused={!selectedAppDetails?.status} />
                            )}
                            {activeTab === "team" && (
                                <Team profile={profile} userRole={effectiveRole} appId={selectedAppId || ""} canManageTeam={hasPermission('can_manage_team')} />
                            )}
                            {activeTab === "settings" && (
                                <SettingsComponent appId={selectedAppId || ""} appName={selectedAppDetails?.name || "Loading..."} />
                            )}
                            {activeTab === "profile" && <Profile profile={profile} setProfile={setProfile} />}
                            {activeTab === "balances" && (
                                <BalancesView profile={effectiveProfile} />
                            )}
                            {activeTab === "team-chat" && (
                                <TeamChat 
                                    appId={selectedAppId} 
                                    appName={selectedAppDetails?.name || "Loading..."} 
                                    userRole={userRole}
                                    currentUsername={profile?.username || ''}
                                />
                            )}
                            {/* Fallback for disabled tabs */}
                            {activeTab !== "apps" && activeTab !== "overview" && activeTab !== "settings" && activeTab !== "licenses" && activeTab !== "users" && activeTab !== "tokens" && activeTab !== "subscriptions" && activeTab !== "sessions" && activeTab !== "variables" && activeTab !== "files" && activeTab !== "profile" && activeTab !== "team" && activeTab !== "team-chat" && activeTab !== "balances" && (
                                <div className="flex items-center justify-center h-full text-muted-foreground/70">
                                    Module {activeTab} is under construction
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* Support Chat Bubble */}
            <SupportChatBubble />
        </div>

        {/* Create App Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md"
                        >
                            <Card className="bg-card border-border shadow-2xl">
                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-foreground mb-2">Create Application</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Provision a new secure authentication cluster.</p>
                                    <form onSubmit={handleCreateApp} className="space-y-4">
                                        <Input 
                                            placeholder="Application Name" 
                                            value={newAppName} 
                                            onChange={(e) => setNewAppName(e.target.value)}
                                            autoFocus
                                            className="bg-background border-border text-foreground focus-visible:ring-primary/50"
                                        />
                                        <div className="flex justify-end gap-3 pt-2">
                                            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="hover:bg-muted text-foreground/80">Cancel</Button>
                                            <Button type="submit" disabled={!newAppName || isCreating} className="bg-primary hover:bg-primary text-white font-medium shadow-lg hover:shadow-primary/25">
                                                {isCreating ? "Deploying..." : "Deploy App"}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Discord Link Modal */}
            <AnimatePresence>
                {showDiscordModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 15, opacity: 0 }} 
                            animate={{ scale: 1, y: 0, opacity: 1 }} 
                            exit={{ scale: 0.95, y: 15, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="w-full max-w-md"
                        >
                            <Card 
                                className="border border-white/10 dark:border-white/5 shadow-2xl relative overflow-hidden rounded-2xl"
                                style={{ 
                                    background: 'linear-gradient(135deg, rgba(19, 18, 25, 0.95), rgba(12, 11, 16, 0.95))',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <div className="p-8 relative z-10">
                                    {/* Visual Connection: Dexter Auth <=> Discord */}
                                    <div className="flex items-center justify-center gap-4 mb-6">
                                        {/* Dexter Auth Logo container */}
                                        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                                            <Key className="w-6 h-6 animate-pulse" />
                                        </div>
                                        
                                        {/* Connecting Indicator */}
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-ping" />
                                            <div className="w-8 h-[1px] bg-gradient-to-r from-primary/30 to-[#5865F2]/30" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#5865F2]/40 animate-ping" />
                                        </div>

                                        {/* Discord Logo container */}
                                        <div className="w-14 h-14 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center text-[#5865F2] shadow-[0_0_20px_rgba(88,101,242,0.15)]">
                                            <svg className="w-7 h-7" viewBox="0 0 127.14 96.36" fill="currentColor">
                                                <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.78-.57,1.52-1.19,2.24-1.82a75.4,75.4,0,0,0,73.46,0c.72.63,1.46,1.25,2.24,1.82a68.69,68.69,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.58-18.83C129,54.65,122.58,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-extrabold text-white tracking-tight">Integrate Discord</h2>
                                        <p className="text-sm text-muted-foreground mt-2 max-w-[320px] mx-auto">
                                            Link your seller profile to enable Discord bot operations and automated webhook updates.
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-4 mb-6">
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mt-0.5 flex-shrink-0">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-foreground">Discord License Bot</p>
                                                <p className="text-[10px] text-muted-foreground leading-relaxed">Generate and manage license keys directly from your Discord server using slash commands.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mt-0.5 flex-shrink-0">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-foreground">Real-time Webhook Logging</p>
                                                <p className="text-[10px] text-muted-foreground leading-relaxed">Instantly route creation, activation, and user ban logs directly to Discord channels.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mt-0.5 flex-shrink-0">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-foreground">Team Chat Integration</p>
                                                <p className="text-[10px] text-muted-foreground leading-relaxed">Sync permissions and coordinate with your support staff in real time.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Button 
                                            type="button" 
                                            onClick={handleLinkDiscordInModal}
                                            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(88,101,242,0.25)] hover:shadow-[0_4px_25px_rgba(88,101,242,0.4)]"
                                        >
                                            <svg className="w-5 h-5 fill-current" viewBox="0 0 127.14 96.36">
                                                <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.78-.57,1.52-1.19,2.24-1.82a75.4,75.4,0,0,0,73.46,0c.72.63,1.46,1.25,2.24,1.82a68.69,68.69,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.58-18.83C129,54.65,122.58,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
                                            </svg>
                                            Link Discord Account
                                        </Button>
                                        
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                sessionStorage.setItem('discord_prompt_dismissed', 'true');
                                                setShowDiscordModal(false);
                                            }} 
                                            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2 font-medium underline underline-offset-4"
                                        >
                                            Maybe later, remind me next time
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Rename App Modal */}
            <AnimatePresence>
                {isRenameModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md"
                        >
                            <Card className="bg-card border-border shadow-2xl">
                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-foreground mb-2">Rename Application</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Change the display name of your application.</p>
                                    <form onSubmit={handleRenameApp} className="space-y-4">
                                        <Input 
                                            placeholder="New Application Name" 
                                            value={newRename} 
                                            onChange={(e) => setNewRename(e.target.value)}
                                            autoFocus
                                            className="bg-background border-border text-foreground focus-visible:ring-primary/50"
                                        />
                                        <div className="flex justify-end gap-3 pt-2">
                                            <Button type="button" variant="ghost" onClick={() => { setIsRenameModalOpen(false); setAppToRename(null); }} className="hover:bg-muted text-foreground/80">Cancel</Button>
                                            <Button type="submit" disabled={!newRename} className="bg-primary hover:bg-primary text-white font-medium shadow-lg hover:shadow-primary/25">Rename App</Button>
                                        </div>
                                    </form>
                                </div>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Description Modal */}
            <AnimatePresence>
                {isEditDescModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md"
                        >
                            <Card className="bg-card border-border shadow-2xl">
                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-foreground mb-2">Edit Description</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Update the description for this application.</p>
                                    <form onSubmit={handleEditDescription} className="space-y-4">
                                        <textarea
                                            placeholder="Application Description..." 
                                            value={newDescription} 
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            autoFocus
                                            rows={4}
                                            className="w-full rounded-md border bg-background border-border text-foreground px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none custom-scrollbar"
                                        />
                                        <div className="flex justify-end gap-3 pt-2">
                                            <Button type="button" variant="ghost" onClick={() => { setIsEditDescModalOpen(false); setAppToEditDesc(null); }} className="hover:bg-muted text-foreground/80">Cancel</Button>
                                            <Button type="submit" className="bg-teal-600 hover:bg-teal-500 text-foreground font-medium shadow-lg hover:shadow-teal-500/25">Save Description</Button>
                                        </div>
                                    </form>
                                </div>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Support Modal */}
            <AnimatePresence>
                {showSupportModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
                        onClick={() => setShowSupportModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
                        >
                            {/* Glow Effect */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-primary to-red-500" />
                            
                            <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-muted/20">
                                <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5 tracking-tight">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary shadow-sm border border-primary/20">
                                        <LifeBuoy className="w-5 h-5" />
                                    </div>
                                    Help & Support
                                </h2>
                                <button onClick={() => setShowSupportModal(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-md">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    If you need assistance, have questions, or want to report an issue, please reach out through our official channels below.
                                </p>
                                
                                <div className="space-y-3">
                                    {profile.contactEmail && (
                                        <a href={`mailto:${profile.contactEmail}`} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/60 transition-all duration-300 group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
                                            <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
                                                <Mail className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-foreground mb-0.5">Email Support</p>
                                                <p className="text-xs text-muted-foreground truncate">{profile.contactEmail}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                                        </a>
                                    )}
                                    
                                    {profile.discordInvite && (
                                        <a href={profile.discordInvite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/60 transition-all duration-300 group hover:border-[#5865F2]/30 hover:shadow-lg hover:shadow-[#5865F2]/10">
                                            <div className="w-12 h-12 shrink-0 rounded-full bg-[#5865F2]/10 flex items-center justify-center border border-[#5865F2]/20 group-hover:bg-[#5865F2]/20 transition-colors">
                                                <MessageSquare className="w-5 h-5 text-[#5865F2] group-hover:scale-110 transition-transform" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-foreground mb-0.5">Discord Community</p>
                                                <p className="text-xs text-muted-foreground truncate">Join our official server</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                                        </a>
                                    )}

                                    {!profile.contactEmail && !profile.discordInvite && (
                                        <div className="text-center py-8 px-4 bg-muted/20 rounded-xl border border-border/50 border-dashed">
                                            <p className="text-sm text-muted-foreground italic">No contact details have been configured by the administrator yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: hsl(var(--muted-foreground) / 0.3);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: hsl(var(--primary) / 0.5);
                }
            `}</style>
            <audio ref={audioRef} src="/sounds/message-notify.wav" preload="auto" />
            
            {/* Mobile Navigation Drawer Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] md:hidden"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="fixed inset-y-0 left-0 w-3/4 max-w-[300px] bg-background/95 backdrop-blur-xl border-r border-border z-[101] md:hidden flex flex-col"
                        >
                            <div className="p-4 flex items-center justify-between border-b border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.25)]">
                                        <Key className="w-4 h-4" />
                                    </div>
                                    <span className="text-lg"><BrandWordmark /></span>
                                </div>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Mobile Application Selector Dropdown */}
                            {apps.length > 0 && (
                                <AppSelectorDropdown 
                                    apps={apps} 
                                    selectedAppId={selectedAppId} 
                                    onSelect={(appId) => {
                                        if (appId) {
                                            handleSelectAppInDropdown(appId);
                                        } else {
                                            setSelectedAppId(null);
                                            setActiveTab("apps");
                                        }
                                        setIsMobileMenuOpen(false);
                                    }} 
                                />
                            )}

                            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                                <nav className="space-y-1">
                                    {sidebarLinks.map((link) => (
                                        <button 
                                            key={link.id} 
                                            onClick={() => {
                                                setActiveTab(link.id);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                activeTab === link.id
                                                ? 'bg-primary/10 text-primary shadow-sm'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                        >
                                            <link.icon className={`w-4 h-4 ${activeTab === link.id ? 'text-primary' : 'opacity-70'}`} />
                                            <span className="whitespace-nowrap truncate">{link.label}</span>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                            <div className="p-4 border-t border-border/50 bg-muted/20">
                                <button 
                                    onClick={() => { setShowSupportModal(true); setIsMobileMenuOpen(false); }} 
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground group"
                                >
                                    <LifeBuoy className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors" />
                                    <span className="whitespace-nowrap truncate">Help & Support</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
