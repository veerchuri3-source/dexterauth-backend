import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { devApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { 
    Key, Trash2, ShieldCheck, Activity, Copy, ChevronRight, Check, 
    Users, Settings, LayoutDashboard, Menu, X, LogOut, ArrowLeft,
    Ticket, CreditCard, MonitorPlay, Search, Download, ShieldAlert, Fingerprint, FolderDown, Blocks, Timer, Save, AlertTriangle, Clock, PauseCircle,
    ExternalLink
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { SEO } from "../components/SEO";

import { useDialog } from "../hooks/use-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { 
    ColorPicker, 
    ColorPickerSelection, 
    ColorPickerHue, 
    ColorPickerEyeDropper, 
    ColorPickerFormat 
} from "../components/ui/color-picker";

export default function AppDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { confirm } = useDialog();
    
    // States
    const [activeTab, setActiveTab] = useState("overview");

    const getTabTitle = (tab: string) => {
        switch (tab) {
            case "overview": return "App Overview";
            case "licenses": return "Licenses";
            case "users": return "Users";
            case "tokens": return "Tokens";
            case "subscriptions": return "Subscriptions";
            case "sessions": return "Sessions";
            case "variables": return "Variables";
            case "files": return "Files & Auto-Update";
            case "settings": return "Settings";
            default: return "App Details";
        }
    };
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [amount, setAmount] = useState(10);
    const [duration, setDuration] = useState(30);
    const [level, setLevel] = useState("premium");
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [selectedLang, setSelectedLang] = useState("csharp");
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [appData, setAppData] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    
    // Tokens Tab
    const [tokens, setTokens] = useState<any[]>([]);
    const [loadingTokens, setLoadingTokens] = useState(false);
    const [tokenSearchQuery, setTokenSearchQuery] = useState("");

    // Files Tab State
    const [filesList, setFilesList] = useState<any[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [showFileModal, setShowFileModal] = useState(false);
    const [editingFileItem, setEditingFileItem] = useState<any | null>(null);
    const [fileFormData, setFileFormData] = useState({
        name: '',
        download_url: '',
        version_tag: '',
        is_latest_release: false,
        is_authenticated: false,
        tags: ''
    });
    const [isSubmittingFile, setIsSubmittingFile] = useState(false);

    const fetchAppFiles = async () => {
        if (!id) return;
        setLoadingFiles(true);
        try {
            const res = await devApi.getFiles(id);
            if (res.status === 'success') {
                setFilesList(res.data.files || []);
            }
        } catch (err) {
            console.error("Failed to fetch files", err);
        } finally {
            setLoadingFiles(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'files') {
            fetchAppFiles();
        }
    }, [id, activeTab]);

    const handleOpenCreateFile = () => {
        setEditingFileItem(null);
        setFileFormData({
            name: '',
            download_url: '',
            version_tag: '',
            is_latest_release: false,
            is_authenticated: false,
            tags: ''
        });
        setShowFileModal(true);
    };

    const handleOpenEditFile = (file: any) => {
        setEditingFileItem(file);
        setFileFormData({
            name: file.name || '',
            download_url: file.download_url || '',
            version_tag: file.version_tag || '',
            is_latest_release: Boolean(file.is_latest_release),
            is_authenticated: Boolean(file.is_authenticated),
            tags: Array.isArray(file.tags) ? file.tags.join(', ') : (file.tags || '')
        });
        setShowFileModal(true);
    };

    const handleSaveFile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        if (!fileFormData.name.trim() || !fileFormData.download_url.trim()) {
            toast.error("File name and direct download link URL are required.");
            return;
        }

        setIsSubmittingFile(true);
        try {
            const tagsArray = fileFormData.tags.split(',').map(t => t.trim()).filter(Boolean);
            const payload = {
                name: fileFormData.name.trim(),
                download_url: fileFormData.download_url.trim(),
                version_tag: fileFormData.version_tag.trim() || undefined,
                is_latest_release: fileFormData.is_latest_release,
                is_authenticated: fileFormData.is_authenticated,
                tags: tagsArray
            };

            if (editingFileItem) {
                await devApi.updateFile(id, editingFileItem.id, payload);
                toast.success("File updated successfully!");
            } else {
                await devApi.createFile(id, payload);
                toast.success("File created successfully!");
            }
            setShowFileModal(false);
            fetchAppFiles();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save file");
        } finally {
            setIsSubmittingFile(false);
        }
    };

    const handleToggleLatestRelease = async (file: any) => {
        if (!id) return;
        try {
            await devApi.setLatestReleaseFile(id, file.id);
            toast.success(`'${file.name}' set as the latest release!`);
            fetchAppFiles();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to set latest release");
        }
    };

    const handleDeleteFile = async (file: any) => {
        if (!id) return;
        if (!await confirm({
            title: "Delete File Entry",
            description: `Are you sure you want to delete '${file.name}'? Applications using SDK download requests for this file will no longer be able to fetch it.`,
            variant: "destructive"
        })) return;

        try {
            await devApi.deleteFile(id, file.id);
            toast.success("File entry deleted successfully!");
            fetchAppFiles();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to delete file");
        }
    };

    // Settings Tab State
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [settingsState, setSettingsState] = useState({
        status: true,
        hwid_lock: false,
        hwid_method: 'windows_user',
        force_hwid: false,
        block_vpns: false,
        hash_check: false,
        block_leaked_passwords: false,
        token_validation: false,
        version: '1.0.0',
        min_hwid_length: 20,
        cooldown_duration: 24,
        // UI-Only Mock Fields
        autoUpdateLink: '',
        webloaderLink: '',
        discordWebhook: '',
        logIp: true,
        minUsernameLength: 1,
        panel_status: true,
        panel_icon: 'https://cdn.keyauth.cc/front/assets/img/favicon.png',
        panel_color: '#8b5cf6'
    });

    const [savedSettingsState, setSavedSettingsState] = useState<any>(null);
    const [cooldownUnit, setCooldownUnit] = useState<'hours' | 'days'>('hours');
    const [savedCooldownUnit, setSavedCooldownUnit] = useState<'hours' | 'days'>('hours');

    // Populate Settings when appData changes
    useEffect(() => {
        if (appData) {
            const dbDuration = appData.cooldown_duration ?? 24;
            const unit = (dbDuration % 24 === 0 && dbDuration > 0) ? 'days' : 'hours';
            const displayDuration = unit === 'days' ? dbDuration / 24 : dbDuration;
            
            setCooldownUnit(unit);
            setSavedCooldownUnit(unit);

            const initial = {
                status: appData.status !== undefined ? Boolean(appData.status) : true,
                hwid_lock: Boolean(appData.hwid_lock),
                hwid_method: appData.hwid_method || 'windows_user',
                force_hwid: Boolean(appData.force_hwid),
                block_vpns: Boolean(appData.block_vpns),
                hash_check: Boolean(appData.hash_check),
                block_leaked_passwords: Boolean(appData.block_leaked_passwords),
                token_validation: Boolean(appData.token_validation),
                version: appData.version || '1.0.0',
                min_hwid_length: appData.min_hwid_length || 20,
                cooldown_duration: displayDuration,
                autoUpdateLink: '',
                webloaderLink: '',
                discordWebhook: '',
                logIp: true,
                minUsernameLength: 1,
                panel_status: appData.panel_status !== undefined ? Boolean(appData.panel_status) : true,
                panel_icon: appData.panel_icon || 'https://cdn.keyauth.cc/front/assets/img/favicon.png',
                panel_color: appData.panel_color || '#8b5cf6'
            };
            setSettingsState(initial);
            setSavedSettingsState(initial);
        }
    }, [appData]);

    const hasChanges = savedSettingsState ? (
        Object.keys(savedSettingsState).some(key => {
            let val1 = savedSettingsState[key];
            let val2 = (settingsState as any)[key];
            
            // Treat empty/null/undefined values as equivalent
            if ((val1 === null || val1 === undefined || val1 === '') && 
                (val2 === null || val2 === undefined || val2 === '')) {
                return false;
            }
            
            // Normalize MySQL TINYINT (1/0) to boolean when comparing with JS boolean
            if (typeof val1 === 'boolean' && (val2 === 1 || val2 === 0)) {
                val2 = val2 === 1;
            }
            if (typeof val2 === 'boolean' && (val1 === 1 || val1 === 0)) {
                val1 = val1 === 1;
            }
            
            // Normalize numeric fields strictly to numbers to avoid type mismatches (string vs number)
            const numericKeys = ['min_hwid_length', 'cooldown_duration', 'hwid_reset_cooldown', 'minUsernameLength'];
            if (numericKeys.includes(key)) {
                if (val1 !== null && val1 !== undefined && val1 !== '') {
                    val1 = Number(val1);
                }
                if (val2 !== null && val2 !== undefined && val2 !== '') {
                    val2 = Number(val2);
                }
            }
            
            if (key === 'cooldown_duration') {
                const currentHours = settingsState.cooldown_duration * (cooldownUnit === 'days' ? 24 : 1);
                const savedHours = savedSettingsState.cooldown_duration * (savedCooldownUnit === 'days' ? 24 : 1);
                return currentHours !== savedHours;
            }
            
            return val1 !== val2;
        })
    ) : false;

    useEffect(() => {
        if (!id) return;
        const fetchApp = async () => {
            try {
                const res = await devApi.getApp(id);
                if (res.status === 'success') {
                    setAppData(res.data.app);
                }
            } catch (error) {
                console.error("Failed to fetch app data", error);
            }

            try {
                const resMe = await devApi.getMe();
                if (resMe.status === 'success') {
                    setProfile({ ...resMe.data.user, cloudflareDomain: resMe.data.cloudflareDomain, nodeIp: resMe.data.nodeIp });
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            }
        };
        fetchApp();
    }, [id]);

    useEffect(() => {
        if (!id || activeTab !== "tokens") return;
        const fetchTokens = async () => {
            setLoadingTokens(true);
            try {
                const res = await devApi.getTokens(id);
                if (res.status === 'success') {
                    setTokens(res.data.tokens || []);
                }
            } catch (error) {
                console.error("Failed to fetch tokens", error);
            } finally {
                setLoadingTokens(false);
            }
        };
        fetchTokens();
    }, [id, activeTab]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        
        setLoading(true);
        try {
            const data = await devApi.generateLicenses(id, amount, duration, level);
            if (data.status === "success") {
                toast.success(`Successfully generated ${data.data.generated || amount} licenses!`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to generate licenses");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteApp = async () => {
        if (!id) return;
        if (!await confirm({ title: "Delete Application", description: "Are you sure you want to delete this application? ALL licenses and data will be destroyed.", variant: "destructive" })) return;
        
        setIsDeleting(true);
        try {
            await devApi.deleteApp(id);
            toast.success("Application deleted successfully.");
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete app");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!id) return;
        
        const versionRegex = /^\d+(\.\d+)*$/;
        if (!versionRegex.test(settingsState.version)) {
            toast.error("Invalid version format. Examples: 1.0, 1.0.0");
            return;
        }

        setIsSavingSettings(true);
        try {
            const calculatedHours = settingsState.cooldown_duration * (cooldownUnit === 'days' ? 24 : 1);
            const payload = {
                status: settingsState.status,
                hwid_lock: settingsState.hwid_lock,
                hwid_method: settingsState.hwid_method,
                force_hwid: settingsState.force_hwid,
                block_vpns: settingsState.block_vpns,
                hash_check: settingsState.hash_check,
                block_leaked_passwords: settingsState.block_leaked_passwords,
                token_validation: settingsState.token_validation,
                version: settingsState.version,
                min_hwid_length: settingsState.min_hwid_length,
                cooldown_duration: calculatedHours,
                hwid_reset_cooldown: calculatedHours * 3600,
                panel_status: settingsState.panel_status,
                panel_icon: settingsState.panel_icon,
                panel_color: settingsState.panel_color
            };
            await devApi.updateApp(id, payload);
            setSavedSettingsState({ ...settingsState });
            setSavedCooldownUnit(cooldownUnit);
            toast.success("Settings saved securely!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save settings");
        } finally {
            setIsSavingSettings(false);
        }
    };

    useEffect(() => {
        if (activeTab !== 'settings') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (hasChanges) {
                    handleSaveSettings();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeTab, hasChanges, handleSaveSettings]);

    const handleAddHash = async () => {
        if (!id) return;
        const hashVal = window.prompt("Enter the application hash to whitelist:");
        if (!hashVal) return;
        
        try {
            await devApi.addHash(id, hashVal);
            toast.success("Hash added successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add hash");
        }
    };

    const handleResetHashes = async () => {
        if (!id) return;
        if (!await confirm({ 
            title: "Reset All Hashes", 
            description: "Are you sure you want to delete all hashes? Users will need to authenticate again with valid hashes to auto-whitelist.", 
            variant: "destructive" 
        })) return;
        
        try {
            await devApi.resetHashes(id);
            toast.success("All hashes reset successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to reset hashes");
        }
    };

    const handleRefreshSecret = async () => {
        if (!await confirm({ 
            title: "Refresh Secret", 
            description: "Are you sure you want to refresh the application secret? All existing SDK connections using the old secret will be broken.", 
            variant: "destructive" 
        })) return;
        
        try {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const newSecret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            
            await devApi.updateApp(id!, { api_secret: newSecret });
            toast.success("Application secret refreshed successfully");
            
            const res = await devApi.getApp(id!);
            if (res.status === 'success') {
                setAppData(res.data.app);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to refresh secret");
        }
    };

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success(`Copied ${field} to clipboard`);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success(`Copied ${field} to clipboard`);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const isReseller = profile?.role === 'reseller' || profile?.role === 'Reseller';
    const navItems = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "licenses", label: "Licenses", icon: Key },
        { id: "users", label: "Users", icon: Users },
        ...(appData?.token_validation ? [{ id: "tokens", label: "Tokens", icon: Ticket }] : []),
        { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
        { id: "sessions", label: "Sessions", icon: MonitorPlay },
        { id: "variables", label: "Variables", icon: Blocks },
        ...(!isReseller ? [{ id: "files", label: "Files", icon: FolderDown }] : []),
        { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-[#09090b] text-foreground overflow-hidden font-sans dark">
            <SEO title={getTabTitle(activeTab)} path={`/dashboard/app/${id || ''}`} indexable={false} />
            
            {/* Sidebar */}
            <motion.aside 
                initial={false}
                animate={{ width: isSidebarOpen ? 260 : 0, opacity: isSidebarOpen ? 1 : 0 }}
                className="flex-shrink-0 bg-card dark:bg-[#0f0f13] border-r border-border dark:border-[#1f1f23] flex flex-col z-20 overflow-hidden"
            >
                <div className="p-6 flex items-center justify-between border-b border-border dark:border-[#1f1f23]/50">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                            <Activity className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-lg tracking-tight whitespace-nowrap">Dashboard</span>
                    </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Application
                    </div>
                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                        isActive 
                                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                                        : "text-muted-foreground hover:bg-muted dark:bg-[#1f1f23] hover:text-foreground"
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "opacity-70"}`} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
                
                <div className="p-4 border-t border-border dark:border-[#1f1f23]/50">
                    <button 
                        onClick={() => navigate("/dashboard")}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted dark:bg-[#1f1f23] hover:text-foreground transition-all"
                    >
                        <ArrowLeft className="w-4 h-4 opacity-70" />
                        Back to Apps
                    </button>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                
                {/* Header */}
                <header className="h-16 flex-shrink-0 bg-[#09090b]/80 backdrop-blur-md border-b border-border dark:border-[#1f1f23] flex items-center justify-between px-4 lg:px-8 z-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 rounded-md hover:bg-muted dark:bg-[#1f1f23] text-muted-foreground transition-colors"
                        >
                            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        
                        <nav className="hidden sm:flex" aria-label="Breadcrumb">
                            <ol className="inline-flex items-center space-x-1 md:space-x-2 text-sm text-muted-foreground">
                                <li className="inline-flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate("/dashboard")}>
                                    Apps
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
                                        <span className="font-semibold text-foreground uppercase tracking-wider text-xs bg-muted dark:bg-[#1f1f23] px-2 py-1 rounded-md border border-border dark:border-[#27272a]">
                                            {appData ? appData.name : id?.substring(0, 8)}
                                        </span>
                                    </div>
                                </li>
                            </ol>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        {!appData?.status ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 px-3 py-1 shadow-[0_0_8px_rgba(245,158,11,0.15)] flex items-center">
                                <PauseCircle className="w-4 h-4 mr-2" />
                                Paused
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 px-3 py-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                                Online
                            </Badge>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                
                                {!appData?.status && (
                                    <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start sm:items-center gap-4 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                        <div className="bg-amber-500/20 p-2 rounded-lg">
                                            <AlertTriangle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Application Paused</h3>
                                            <p className="text-amber-200/70 text-sm">Users cannot log in, register, or authenticate while the application is paused. Key generation and user management are disabled.</p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "overview" && (
                                    <div className="animate-in fade-in duration-500">
                                        <div className="mb-4 p-8 bg-card border border-border rounded-xl dark:bg-card dark:bg-[#0f0f13] dark:border-border dark:border-[#1f1f23]">
                                            <nav className="flex mb-5" aria-label="Breadcrumb">
                                                <ol className="inline-flex items-center space-x-1 md:space-x-2">
                                                    <li className="inline-flex items-center">
                                                        <span onClick={() => navigate('/dashboard')} className="cursor-pointer inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground dark:hover:text-foreground dark:text-white transition-colors">
                                                            <LayoutDashboard className="w-4 h-4 mr-2" />
                                                            Manage Apps
                                                        </span>
                                                    </li>
                                                    <li>
                                                        <div className="flex items-center">
                                                            <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                                                            <label className="inline-flex items-center text-sm font-medium text-muted-foreground">
                                                                Current Application: <span className="ml-1 text-foreground dark:text-foreground dark:text-white">{appData?.name || 'Loading...'}</span>
                                                            </label>
                                                        </div>
                                                    </li>
                                                </ol>
                                            </nav>
                                            <h1 className="text-xl font-semibold text-foreground dark:text-foreground dark:text-white sm:text-2xl mb-2">
                                                Manage Applications
                                            </h1>
                                            <p className="text-sm text-muted-foreground">Manage your applications. Applications are the backbone of all the data. <a href="#" className="text-primary hover:underline">Learn More</a>.</p>
                                        </div>
                                        {appData?.description && (
                                            <div className="mb-6 bg-card border border-border rounded-xl p-6 shadow-sm dark:bg-card dark:bg-[#0f0f13] dark:border-border dark:border-[#1f1f23]">
                                                <h3 className="text-sm font-semibold text-foreground dark:text-foreground dark:text-white mb-2">Description</h3>
                                                <p className="text-sm text-muted-foreground dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">{appData.description}</p>
                                            </div>
                                        )}
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            {[
                                                { title: "Total Users", value: "0" },
                                                { title: "Active", value: "0" },
                                                { title: "Paused", value: "0" },
                                                { title: "Active Sessions", value: "0" },
                                            ].map((stat, i) => (
                                                <div key={i} className="relative flex flex-col items-center justify-center text-center bg-card border border-border dark:bg-card dark:bg-[#0f0f13] dark:border-border dark:border-[#1f1f23] px-4 py-6 rounded-xl w-full transition-all duration-300 ease-in-out hover:border-primary/50 hover:shadow-[0_0_15px_3px_rgba(59,130,246,0.15)] cursor-pointer group">
                                                    <p className="text-3xl font-bold text-foreground dark:text-foreground dark:text-white mb-1">{stat.value}</p>
                                                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-col lg:flex-row gap-4 mt-5">
                                            <div className="w-full lg:w-1/3 bg-card rounded-xl border border-border p-6 dark:bg-card dark:bg-[#0f0f13] dark:border-border dark:border-[#1f1f23]">
                                                <h3 className="text-base font-semibold text-foreground dark:text-foreground dark:text-white mb-1">Application Credentials</h3>
                                                <p className="text-xs text-muted-foreground mb-6">Simply replace the placeholder code in the example with these</p>
                                                
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <Switch id="code_config" checked={showCode} onCheckedChange={setShowCode} className="data-[state=checked]:bg-primary" />
                                                        <Label htmlFor="code_config" className="text-sm text-muted-foreground cursor-pointer">Display Code Snippet</Label>
                                                    </div>

                                                    <AnimatePresence mode="wait">
                                                        {!showCode ? (
                                                            <motion.div key="credentials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                                                <div className="relative bg-muted/50 rounded-xl p-4 border border-border dark:bg-muted dark:bg-[#1f1f23]/50 dark:border-border dark:border-[#27272a] group/item">
                                                                <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-primary/50"></div>
                                                                <button onClick={() => copyToClipboard(appData?.name || "", "App Name")} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground dark:hover:text-foreground dark:text-white transition">
                                                                    {copiedField === "App Name" ? <Check className="w-4 h-4 text-green-600 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
                                                                </button>
                                                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-1">Application Name</p>
                                                                <p className="text-sm font-semibold text-foreground dark:text-foreground dark:text-white font-mono select-all truncate pr-8">{appData?.name || "Loading..."}</p>
                                                            </div>
                                                            <div className="relative bg-muted/50 rounded-xl p-4 border border-border dark:bg-muted dark:bg-[#1f1f23]/50 dark:border-border dark:border-[#27272a] group/item">
                                                                <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-primary/50"></div>
                                                                <button onClick={() => copyToClipboard(appData?.id || "", "App ID")} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground dark:hover:text-foreground dark:text-white transition">
                                                                    {copiedField === "App ID" ? <Check className="w-4 h-4 text-green-600 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
                                                                </button>
                                                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-1">Application ID (Use this as 'ownerid' in SDKs)</p>
                                                                <p className="text-sm font-semibold text-foreground dark:text-foreground dark:text-white font-mono select-all truncate pr-8 blur-[3px] hover:blur-none transition-all cursor-pointer">{appData?.id || "Loading..."}</p>
                                                            </div>
                                                            <div className="relative bg-muted/50 rounded-xl p-4 border border-border dark:bg-muted dark:bg-[#1f1f23]/50 dark:border-border dark:border-[#27272a] group/item">
                                                                <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-primary/50"></div>
                                                                <button onClick={() => copyToClipboard(appData?.api_secret || "", "App Secret")} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground dark:hover:text-foreground dark:text-white transition">
                                                                    {copiedField === "App Secret" ? <Check className="w-4 h-4 text-green-600 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
                                                                </button>
                                                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-1">Application Secret (For Server APIs)</p>
                                                                <p className="text-sm font-semibold text-foreground dark:text-foreground dark:text-white font-mono select-all truncate pr-8 blur-[3px] hover:blur-none transition-all cursor-pointer">{appData?.api_secret || "Loading..."}</p>
                                                            </div>
                                                            <div className="relative bg-muted/50 rounded-xl p-4 border border-border dark:bg-muted dark:bg-[#1f1f23]/50 dark:border-border dark:border-[#27272a] group/item">
                                                                <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-primary/50"></div>
                                                                <button onClick={() => copyToClipboard(appData?.version || "", "App Version")} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground dark:hover:text-foreground dark:text-white transition">
                                                                    {copiedField === "App Version" ? <Check className="w-4 h-4 text-green-600 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
                                                                </button>
                                                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-1">Application Version</p>
                                                                <p className="text-sm font-semibold text-foreground dark:text-foreground dark:text-white font-mono select-all truncate pr-8">{appData?.version || "Loading..."}</p>
                                                            </div>
                                                            
                                                            <Button onClick={handleRefreshSecret} variant="outline" className="w-full mt-2 bg-yellow-600/10 text-yellow-700 border-yellow-600/20 hover:bg-yellow-600/20 hover:text-yellow-800 dark:text-yellow-500 dark:hover:text-yellow-400">
                                                                <Activity className="w-4 h-4 mr-2" />
                                                                Refresh Application Secret
                                                            </Button>
                                                            </motion.div>
                                                        ) : (
                                                            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                                                <div className="flex items-center gap-3 mb-4">
                                                                <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Select Language:</Label>
                                                                <select 
                                                                    value={selectedLang}
                                                                    onChange={(e) => setSelectedLang(e.target.value)}
                                                                    className="w-full p-2 bg-muted border border-border text-foreground rounded text-sm outline-none focus:border-primary dark:bg-muted dark:bg-[#1f1f23] dark:border-border dark:border-[#27272a] dark:text-foreground dark:text-white"
                                                                >
                                                                    <option value="csharp">C#</option>
                                                                    <option value="cpp">C++</option>
                                                                    <option value="py">Python</option>
                                                                    <option value="js">JavaScript</option>
                                                                    <option value="php">PHP</option>
                                                                </select>
                                                            </div>
                                                            <div className="relative">
                                                                <pre id="appdetails-code-snippet" className="bg-muted/60 dark:bg-[#1f1f23]/80 text-black dark:text-emerald-400 text-xs p-4 rounded-xl overflow-x-auto border border-border dark:border-[#27272a] font-mono leading-relaxed">
{selectedLang === "csharp" && `public static api DexterAuthApp = new api(
    name: "${appData?.name || 'Loading...'}", 
    ownerid: "${appData?.id || 'Loading...'}", 
    secret: "${appData?.api_secret || 'Loading...'}", 
    version: "${appData?.version || 'Loading...'}" 
);`}
{selectedLang === "cpp" && `std::string name = skCrypt("${appData?.name || 'Loading'}").decrypt(); 
std::string ownerid = skCrypt("${appData?.id || 'Loading'}").decrypt(); 
std::string secret = skCrypt("${appData?.api_secret || 'Loading'}").decrypt(); 
std::string version = skCrypt("${appData?.version || 'Loading'}").decrypt(); 
std::string url = skCrypt("https://${profile?.cloudflareDomain || profile?.nodeIp || 'dexterauth.onrender.com'}/api/v2/client/").decrypt();`}
{selectedLang === "py" && `dexterapp = api(
    name = "${appData?.name || 'Loading'}", 
    ownerid = "${appData?.id || 'Loading'}", 
    client_secret = "${appData?.api_secret || 'Loading'}", 
    version = "${appData?.version || 'Loading'}", 
    hash_to_check = getchecksum()
)`}
{selectedLang === "js" && `const DexterAuthApp = new Dexter Auth({
    name: "${appData?.name || 'Loading'}",
    ownerid: "${appData?.id || 'Loading'}",
    secret: "${appData?.api_secret || 'Loading'}",
    version: "${appData?.version || 'Loading'}",
})`}
{selectedLang === "php" && `$name = "${appData?.name || 'Loading'}";
$ownerid = "${appData?.id || 'Loading'}";
$secret = "${appData?.api_secret || 'Loading'}";`}
                                                                </pre>
                                                                <div className="mt-3 flex gap-2 flex-wrap">
                                                                    <Button onClick={() => {
                                                                        let codeStr = "";
                                                                        if (selectedLang === "csharp") {
                                                                            codeStr = `public static api DexterAuthApp = new api(\n    name: "${appData?.name || 'Loading...'}", ${
                                                                                !isReseller ? `\n    ownerid: "${appData?.id || 'Loading...'}",\n    secret: "${appData?.api_secret || 'Loading...'}",` : ''
                                                                            }\n    version: "${appData?.version || 'Loading...'}"\n);`;
                                                                        } else if (selectedLang === "cpp") {
                                                                            codeStr = `std::string name = skCrypt("${appData?.name || 'Loading'}").decrypt(); ${!isReseller ? `\nstd::string ownerid = skCrypt("${appData?.id || 'Loading'}").decrypt(); \nstd::string secret = skCrypt("${appData?.api_secret || 'Loading'}").decrypt();` : ''}\nstd::string version = skCrypt("${appData?.version || 'Loading'}").decrypt();\nstd::string url = skCrypt("https://${profile.cloudflareDomain || profile.nodeIp || 'dexterauth.onrender.com'}/api/v2/client/").decrypt();`;
                                                                        } else if (selectedLang === "py") {
                                                                            codeStr = `dexterapp = api(\n    name = "${appData?.name || 'Loading'}", ${!isReseller ? `\n    ownerid = "${appData?.id || 'Loading'}",\n    client_secret = "${appData?.api_secret || 'Loading'}",` : ''}\n    version = "${appData?.version || 'Loading'}",\n    hash_to_check = getchecksum()\n)`;
                                                                        } else if (selectedLang === "js") {
                                                                            codeStr = `const DexterAuthApp = new Dexter Auth({\n    name: "${appData?.name || 'Loading'}",${!isReseller ? `\n    ownerid: "${appData?.id || 'Loading'}",\n    secret: "${appData?.api_secret || 'Loading'}",` : ''}\n    version: "${appData?.version || 'Loading'}",\n})`;
                                                                        } else if (selectedLang === "php") {
                                                                            codeStr = `$name = "${appData?.name || 'Loading'}";${!isReseller ? `\n$ownerid = "${appData?.id || 'Loading'}";\n$secret = "${appData?.api_secret || 'Loading'}";` : ''}`;
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
                                            <div className="w-full lg:w-2/3">
                                                <Card className="bg-card border-border dark:bg-card dark:bg-[#0f0f13] dark:border-border dark:border-[#1f1f23] h-full flex flex-col min-h-[300px]">
                                                    <CardHeader>
                                                        <CardTitle>Activity Overview</CardTitle>
                                                        <CardDescription>Recent metrics and activity for this application</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="flex-1 flex items-center justify-center">
                                                        <div className="text-center text-muted-foreground">
                                                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                            <p>Select a metric to view detailed analytics</p>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "licenses" && (
                                    <>
                                        <div className="mb-8 flex justify-between items-end">
                                            <div>
                                                <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white mb-2">Licenses</h1>
                                                <p className="text-muted-foreground">Mint and manage license keys for your application.</p>
                                            </div>
                                        </div>

                                        <Card className="bg-card dark:bg-[#0f0f13] border-border dark:border-[#1f1f23] overflow-hidden">
                                            <div className="h-1 w-full bg-gradient-to-r from-primary to-primary"></div>
                                            <CardHeader>
                                                <CardTitle className="flex items-center"><Key className="w-5 h-5 mr-2 text-primary"/> Key Generator</CardTitle>
                                                <CardDescription>Generate new cryptographically secure license keys in bulk.</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <form onSubmit={handleGenerate} className="space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground font-medium">Amount to Generate</Label>
                                                            <Input 
                                                                type="number" min="1" max="1000" 
                                                                value={amount} onChange={(e) => setAmount(Number(e.target.value))}
                                                                className="bg-muted dark:bg-[#1f1f23] border-border dark:border-[#27272a] focus:border-primary font-mono"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground font-medium">Duration (Days)</Label>
                                                            <Input 
                                                                type="number" min="1" 
                                                                value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                                                                className="bg-muted dark:bg-[#1f1f23] border-border dark:border-[#27272a] focus:border-primary font-mono"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground font-medium">Subscription Level</Label>
                                                            <Input 
                                                                type="text" 
                                                                value={level} onChange={(e) => setLevel(e.target.value)}
                                                                className="bg-muted dark:bg-[#1f1f23] border-border dark:border-[#27272a] focus:border-primary font-mono uppercase"
                                                            />
                                                        </div>
                                                    </div>
                                                    {!appData?.status && (
                                                        <div className="text-amber-500 text-sm flex items-center gap-2 mt-2">
                                                            <AlertTriangle className="w-4 h-4" />
                                                            Cannot mint licenses while application is paused.
                                                        </div>
                                                    )}
                                                    <div className="pt-2">
                                                        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8" disabled={loading || !appData?.status}>
                                                            {loading ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                                                            {loading ? "Minting Keys..." : "Mint Licenses"}
                                                        </Button>
                                                    </div>
                                                </form>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}

                                {activeTab === "users" && (
                                    <>
                                        <div className="mb-8">
                                            <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white mb-2">Users</h1>
                                            <p className="text-muted-foreground">Manage your application's end-users.</p>
                                        </div>

                                        <Card className="bg-card dark:bg-[#0f0f13] border-border dark:border-[#1f1f23]">
                                            <CardHeader>
                                                <CardTitle className="flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-primary"/> Hardware ID Reset</CardTitle>
                                                <CardDescription>Reset the bound Hardware ID for a specific user to allow them to use the app on a new device.</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="max-w-md space-y-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-muted-foreground">User ID</Label>
                                                        <div className="flex gap-2">
                                                            <Input 
                                                                placeholder="Enter User UUID..." 
                                                                className="bg-muted dark:bg-[#1f1f23] border-border dark:border-[#27272a] font-mono flex-1"
                                                                id="hwid-user-id"
                                                            />
                                                            <Button 
                                                                variant="secondary"
                                                                className="bg-muted/50 dark:bg-[#27272a] hover:bg-[#3f3f46] text-foreground dark:text-white border border-[#3f3f46]"
                                                                onClick={async () => {
                                                                    const userId = (document.getElementById('hwid-user-id') as HTMLInputElement).value;
                                                                    if (!userId) {
                                                                        toast.error("Please enter a User ID");
                                                                        return;
                                                                    }
                                                                    try {
                                                                        await devApi.resetUserHwid(userId);
                                                                        toast.success("HWID reset successfully!");
                                                                        (document.getElementById('hwid-user-id') as HTMLInputElement).value = '';
                                                                    } catch (error: any) {
                                                                        toast.error(error.response?.data?.message || "Failed to reset HWID");
                                                                    }
                                                                }}
                                                            >
                                                                Reset HWID
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}

                                {activeTab === "tokens" && (
                                    <div className="animate-in fade-in duration-500">
                                        <div className="mb-8">
                                            <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white mb-2">Tokens</h1>
                                            <p className="text-muted-foreground">Tokens act as access keys. While licenses allow users to login/register. Tokens allow the user to access the program entirely. <a href="#" className="text-primary hover:underline">Learn More</a></p>
                                        </div>

                                        <div className="bg-card dark:bg-[#0f0f13] rounded-xl border border-border dark:border-[#1f1f23] shadow-sm overflow-hidden">
                                            <div className="p-4 border-b border-border dark:border-[#1f1f23] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#09090b]/50">
                                                <div className="relative w-full max-w-sm">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input 
                                                        className="pl-9 bg-muted dark:bg-[#1f1f23] border-border dark:border-[#27272a]" 
                                                        placeholder="Search tokens..." 
                                                        value={tokenSearchQuery}
                                                        onChange={(e) => setTokenSearchQuery(e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <Button variant="outline" className="bg-muted dark:bg-[#1f1f23] border-border dark:border-[#27272a] hover:bg-muted/50 dark:bg-[#27272a]">Toggle Filters</Button>
                                                    <Button variant="outline" className="bg-muted dark:bg-[#1f1f23] border-border dark:border-[#27272a] hover:bg-muted/50 dark:bg-[#27272a]">Toggle View</Button>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left text-muted-foreground">
                                                    <thead className="text-xs text-muted-foreground uppercase bg-[#09090b]/80 border-b border-border dark:border-[#1f1f23]">
                                                        <tr>
                                                            <th className="px-6 py-4 font-medium">Token</th>
                                                            <th className="px-6 py-4 font-medium">Assigned</th>
                                                            <th className="px-6 py-4 font-medium">Type</th>
                                                            <th className="px-6 py-4 font-medium">Status</th>
                                                            <th className="px-6 py-4 font-medium">Banned</th>
                                                            <th className="px-6 py-4 font-medium">Ban Reason</th>
                                                            <th className="px-6 py-4 font-medium">Hash</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#1f1f23]">
                                                        {loadingTokens ? (
                                                            <tr><td colSpan={7} className="px-6 py-8 text-center">Loading tokens...</td></tr>
                                                        ) : tokens.length === 0 ? (
                                                            <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No tokens generated yet.</td></tr>
                                                        ) : (
                                                            tokens
                                                            .filter(t => t.token_hash.toLowerCase().includes(tokenSearchQuery.toLowerCase()) || (t.assigned_to || '').toLowerCase().includes(tokenSearchQuery.toLowerCase()))
                                                            .map((t, i) => (
                                                                <tr key={i} className="hover:bg-muted dark:bg-[#1f1f23]/50 transition-colors">
                                                                    <td className="px-6 py-4 font-mono text-foreground dark:text-white text-xs">{t.token_hash}</td>
                                                                    <td className="px-6 py-4 text-xs">{t.assigned_to || 'N/A'}</td>
                                                                    <td className="px-6 py-4">
                                                                        <Badge variant="outline" className="capitalize text-xs bg-primary/10 text-primary border-primary/20">{t.type}</Badge>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-xs">{t.status || 'N/A'}</td>
                                                                    <td className="px-6 py-4 text-emerald-400 text-xs">Unbanned</td>
                                                                    <td className="px-6 py-4 text-muted-foreground/50 text-xs">N/A</td>
                                                                    <td className="px-6 py-4 text-muted-foreground/50 text-xs">N/A</td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "subscriptions" && (
                                    <>
                                        <div className="mb-8">
                                            <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white mb-2">Subscriptions</h1>
                                            <p className="text-muted-foreground">Manage subscription tiers and levels for your app.</p>
                                        </div>

                                        <Card className="bg-card dark:bg-[#0f0f13] border-border dark:border-[#1f1f23]">
                                            <CardHeader>
                                                <CardTitle className="flex items-center"><CreditCard className="w-5 h-5 mr-2 text-primary"/> Subscription Tiers</CardTitle>
                                                <CardDescription>Define levels (e.g., Basic, Seller, VIP) for your application.</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                                    <CreditCard className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                                    <h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">No subscription tiers</h3>
                                                    <p className="text-sm text-muted-foreground max-w-sm mb-6">Create different subscription levels to offer tiered features to your users.</p>
                                                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">Create Tier</Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}

                                {activeTab === "sessions" && (
                                    <>
                                        <div className="mb-8">
                                            <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white mb-2">Active Sessions</h1>
                                            <p className="text-muted-foreground">Monitor and forcefully kill active client sessions.</p>
                                        </div>

                                        <Card className="bg-card dark:bg-[#0f0f13] border-border dark:border-[#1f1f23]">
                                            <CardHeader>
                                                <CardTitle className="flex items-center"><MonitorPlay className="w-5 h-5 mr-2 text-primary"/> Current Sessions</CardTitle>
                                                <CardDescription>Real-time view of users currently authenticated.</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                                    <MonitorPlay className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                                    <h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">No active sessions</h3>
                                                    <p className="text-sm text-muted-foreground max-w-sm">There are currently no users logged into this application.</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}

                                {activeTab === "settings" && (
                                    <>
                                        <div className="mb-6 flex items-center justify-between">
                                            <div>
                                                <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white mb-1">Configuration</h1>
                                                <p className="text-muted-foreground text-sm">Configure security, access controls, and core properties of your application.</p>
                                            </div>
                                            <Button 
                                                onClick={handleSaveSettings} 
                                                disabled={isSavingSettings}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all h-[42px]"
                                            >
                                                {isSavingSettings ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                            
                                            {/* Left Column */}
                                            <div className="flex flex-col gap-6">
                                                
                                                {/* Access Controls */}
                                                <div className="bg-card dark:bg-[#0f0f13] border border-border dark:border-[#1f1f23] rounded-xl p-6 text-foreground dark:text-white shadow-md w-full">
                                                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border dark:border-[#1f1f23]/50">
                                                        <ChevronRight className="w-5 h-5 text-primary" />
                                                        <h2 className="text-xl font-semibold">Access Controls</h2>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {/* App Status Toggle */}
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm flex items-center justify-between transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <div className="pr-4">
                                                                <h3 className="font-semibold text-[14px]">App Status</h3>
                                                                <p className="text-[12px] text-muted-foreground mt-0.5">Enable or disable the application, preventing users from logging in</p>
                                                            </div>
                                                            <Switch 
                                                                checked={!!settingsState.status} 
                                                                onCheckedChange={(c) => setSettingsState(s => ({...s, status: c}))} 
                                                            />
                                                        </div>

                                                        {/* HWID Lock */}
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm flex items-center justify-between transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <div className="pr-4">
                                                                <h3 className="font-semibold text-[14px]">HWID Lock</h3>
                                                                <p className="text-[12px] text-muted-foreground mt-0.5">Lock users to a device value that only changes upon OS reinstall. Prevents sharing.</p>
                                                            </div>
                                                            <Switch 
                                                                checked={settingsState.hwid_lock} 
                                                                onCheckedChange={(c) => setSettingsState(s => ({...s, hwid_lock: c}))} 
                                                            />
                                                        </div>

                                                        {/* HWID Lock Method */}
                                                        {settingsState.hwid_lock && (
                                                            <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm flex items-center justify-between transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)] animate-in fade-in slide-in-from-top-2">
                                                                <div className="pr-4">
                                                                    <h3 className="font-semibold text-[14px]">Lock Method</h3>
                                                                    <p className="text-[12px] text-muted-foreground mt-0.5">Select how the hardware ID is generated on the client device.</p>
                                                                </div>
                                                                <select 
                                                                    value={settingsState.hwid_method}
                                                                    onChange={(e) => setSettingsState(s => ({...s, hwid_method: e.target.value}))}
                                                                    className="bg-muted dark:bg-[#1f1f23] border border-border dark:border-[#27272a] text-sm text-foreground dark:text-white rounded-md p-2 outline-none focus:border-primary w-[200px]"
                                                                >
                                                                    <option value="windows_user">Windows User (whoami /user)</option>
                                                                    <option value="machine_guid">Permanent Machine Lock</option>
                                                                </select>
                                                            </div>
                                                        )}

                                                        {/* Force HWID */}
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm flex items-center justify-between transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <div className="pr-4">
                                                                <h3 className="font-semibold text-[14px]">Force HWID</h3>
                                                                <p className="text-[12px] text-muted-foreground mt-0.5">Prevent users from logging in with a blank HWID (disable for web-based products).</p>
                                                            </div>
                                                            <Switch 
                                                                checked={settingsState.force_hwid} 
                                                                onCheckedChange={(c) => setSettingsState(s => ({...s, force_hwid: c}))} 
                                                            />
                                                        </div>

                                                        {/* Token Validation */}
                                                        <div className={`bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm flex items-center justify-between transition-shadow duration-300 ${profile?.plan === 'Seller' ? 'hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]' : 'opacity-75'}`}>
                                                            <div className="pr-4">
                                                                <h3 className="font-semibold text-[14px] flex items-center gap-2">
                                                                    Token Validation
                                                                    {profile?.plan !== 'Seller' && (
                                                                        <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px] uppercase">Seller</Badge>
                                                                    )}
                                                                </h3>
                                                                <p className="text-[12px] text-muted-foreground mt-0.5">Require active session tokens for all API requests for maximum security.</p>
                                                            </div>
                                                            <Switch 
                                                                disabled={profile?.plan !== 'Seller'}
                                                                checked={settingsState.token_validation} 
                                                                onCheckedChange={(c) => setSettingsState(s => ({...s, token_validation: c}))} 
                                                            />
                                                        </div>

                                                        {/* Block VPNs */}
                                                        <div className={`bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm flex items-center justify-between transition-shadow duration-300 ${profile?.plan === 'Seller' ? 'hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]' : 'opacity-75'}`}>
                                                            <div className="pr-4">
                                                                <h3 className="font-semibold text-[14px] flex items-center gap-2">
                                                                    Block VPNs
                                                                    {profile?.plan !== 'Seller' && (
                                                                        <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px] uppercase">Seller</Badge>
                                                                    )}
                                                                </h3>
                                                                <p className="text-[12px] text-muted-foreground mt-0.5">Prevent users from logging in from a Virtual Private Network.</p>
                                                            </div>
                                                            <Switch 
                                                                disabled={profile?.plan !== 'Seller'}
                                                                checked={settingsState.block_vpns} 
                                                                onCheckedChange={(c) => setSettingsState(s => ({...s, block_vpns: c}))} 
                                                            />
                                                        </div>

                                                        {/* Hash Check */}
                                                        <div className={`bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm flex items-center justify-between transition-shadow duration-300 ${profile?.plan === 'Seller' ? 'hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]' : 'opacity-75'}`}>
                                                            <div className="pr-4">
                                                                <h3 className="font-semibold text-[14px] flex items-center gap-2">
                                                                    Hash Check
                                                                    {profile?.plan !== 'Seller' && (
                                                                        <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px] uppercase">Seller</Badge>
                                                                    )}
                                                                </h3>
                                                                <p className="text-[12px] text-muted-foreground mt-0.5">Checks whether the application has been modified since the last time you pressed the reset hash button. Used to prevent people from altering/bypassing your application.</p>
                                                            </div>
                                                            <Switch 
                                                                disabled={profile?.plan !== 'Seller'}
                                                                checked={settingsState.hash_check} 
                                                                onCheckedChange={(c) => setSettingsState(s => ({...s, hash_check: c}))} 
                                                            />
                                                        </div>

                                                        {/* Hash Management Buttons (Visible when Hash Check is enabled) */}
                                                        <AnimatePresence>
                                                            {settingsState.hash_check && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                                                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                                                                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm space-y-4 mt-2 mb-2">
                                                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border dark:border-[#1f1f23]/50">
                                                                            <Fingerprint className="w-4 h-4 text-primary" />
                                                                            <h3 className="text-sm font-semibold text-foreground dark:text-white">Hash Management</h3>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div>
                                                                                <h4 className="text-[12px] font-medium text-foreground mb-2">Add New Hash</h4>
                                                                                <Button onClick={handleAddHash} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-9 text-xs">
                                                                                    Add Hash
                                                                                </Button>
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-[12px] font-medium text-foreground mb-2 text-red-400">Danger Zone</h4>
                                                                                <Button onClick={handleResetHashes} variant="destructive" className="w-full bg-red-600/90 hover:bg-red-600 text-white font-medium h-9 text-xs">
                                                                                    Reset All Hashes
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>

                                                        {/* Block Leaked Passwords */}
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm flex items-center justify-between transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <div className="pr-4">
                                                                <h3 className="font-semibold text-[14px]">Block Leaked Passwords</h3>
                                                                <p className="text-[12px] text-muted-foreground mt-0.5">Prevent users from registering using a leaked password.</p>
                                                            </div>
                                                            <Switch 
                                                                checked={settingsState.block_leaked_passwords} 
                                                                onCheckedChange={(c) => setSettingsState(s => ({...s, block_leaked_passwords: c}))} 
                                                            />
                                                        </div>

                                                        {/* Token Validation */}
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm flex items-center justify-between transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <div className="pr-4">
                                                                <h3 className="font-semibold text-[14px]">Token Validation</h3>
                                                                <p className="text-[12px] text-muted-foreground mt-0.5">Require users to authenticate via token to access the application.</p>
                                                            </div>
                                                            <Switch 
                                                                checked={settingsState.token_validation} 
                                                                onCheckedChange={(c) => setSettingsState(s => ({...s, token_validation: c}))} 
                                                            />
                                                        </div>

                                                        {/* Customer Panel Configuration */}
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm flex flex-col justify-between transition-shadow duration-300 relative group">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 rounded-l-lg"></div>
                                                            <div className="flex items-center justify-between w-full mb-4">
                                                                <div>
                                                                    <h3 className="font-semibold text-[14px] flex items-center gap-2 text-foreground dark:text-white">
                                                                        <MonitorPlay className="w-4 h-4 text-primary" />
                                                                        Seller Customer Panel
                                                                    </h3>
                                                                    <p className="text-[12px] text-muted-foreground mt-0.5">Your dedicated web panel for customers to login, register, and reset HWID.</p>
                                                                </div>
                                                                {profile?.plan === 'Free' ? (
                                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                                                                        Seller Only
                                                                    </Badge>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[12px] font-medium text-gray-400">Enable Panel</span>
                                                                        <Switch 
                                                                            checked={settingsState.panel_status} 
                                                                            onCheckedChange={(c) => setSettingsState(s => ({...s, panel_status: c}))} 
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="w-full">
                                                                {profile?.plan === 'Free' ? (
                                                                    <div className="bg-card dark:bg-[#0f0f13] border border-border dark:border-[#27272a] rounded-lg p-3 text-center flex flex-col items-center">
                                                                        <Lock className="w-5 h-5 text-muted-foreground mb-2" />
                                                                        <p className="text-xs text-muted-foreground">The Customer Panel is only available on premium plans. Upgrade to allow your users to manage their accounts online.</p>
                                                                        <Button onClick={() => navigate('/', { state: { scrollToPricing: true } })} variant="outline" className="mt-3 text-xs h-7 border-primary/50 hover:bg-primary/10 hover:text-primary transition font-bold">Upgrade Plan</Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col gap-4">
                                                                        {/* Customer Panel Link */}
                                                                        <div className="relative w-full">
                                                                            <input 
                                                                                type="text" 
                                                                                id="customerPanelLink" 
                                                                                className="block px-2.5 pb-2.5 pt-4 w-full text-sm text-foreground dark:text-white bg-transparent rounded-lg border border-border dark:border-[#27272a] appearance-none focus:outline-none focus:ring-0 focus:border-primary peer" 
                                                                                placeholder=" " 
                                                                                value={`${window.location.origin}/panel/${appData?.owner_username || profile?.username}/${encodeURIComponent(appData?.name || 'app')}`} 
                                                                                readOnly 
                                                                            />
                                                                            <label htmlFor="customerPanelLink" className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-[#15151a] px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1">
                                                                                Customer Panel Link
                                                                            </label>
                                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 bg-[#15151a] pl-2">
                                                                                <Button 
                                                                                    onClick={() => copyToClipboard(`${window.location.origin}/panel/${appData?.owner_username || profile?.username}/${encodeURIComponent(appData?.name || 'app')}`, "Customer Panel URL")}
                                                                                    variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground dark:text-white"
                                                                                >
                                                                                    <Copy className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                                <Button 
                                                                                    onClick={() => window.open(`/panel/${appData?.owner_username || profile?.username}/${encodeURIComponent(appData?.name || 'app')}`, '_blank')}
                                                                                    variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 text-primary hover:text-primary"
                                                                                >
                                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Customer Panel Icon */}
                                                                        <div className="relative w-full">
                                                                            <input 
                                                                                type="url" 
                                                                                id="customerPanelIcon" 
                                                                                className="block px-2.5 pb-2.5 pt-4 w-full text-sm text-foreground dark:text-white bg-transparent rounded-lg border border-border dark:border-[#27272a] appearance-none focus:outline-none focus:ring-0 focus:border-primary peer" 
                                                                                placeholder=" " 
                                                                                value={settingsState.panel_icon}
                                                                                onChange={(e) => setSettingsState(s => ({...s, panel_icon: e.target.value}))}
                                                                            />
                                                                            <label htmlFor="customerPanelIcon" className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-[#15151a] px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1">
                                                                                Customer Panel Icon
                                                                            </label>
                                                                        </div>

                                                                        {/* Customer Panel Color */}
                                                                        <div className="relative w-full flex flex-col sm:flex-row sm:items-center justify-between bg-[#15151a]/50 rounded-lg border border-border dark:border-[#27272a] p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.1)] gap-4 sm:gap-0">
                                                                            <div className="pr-2">
                                                                                <label className="text-sm font-medium text-foreground dark:text-white flex items-center gap-2">Theme Color</label>
                                                                                <p className="text-xs text-muted-foreground mt-0.5">Customize the primary color of your panel.</p>
                                                                            </div>
                                                                            <div className="flex items-center gap-3 shrink-0">
                                                                                <div className="px-3 py-1.5 rounded-md bg-card dark:bg-[#0f0f13] border border-border dark:border-[#27272a] text-xs font-mono text-gray-300">
                                                                                    {settingsState.panel_color || '#8b5cf6'}
                                                                                </div>
                                                                                <div className="relative">
                                                                                    <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                                                                                        <PopoverTrigger asChild>
                                                                                            <button 
                                                                                                type="button"
                                                                                                className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-border dark:border-[#27272a] shadow-sm hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#15151a]"
                                                                                                style={{ backgroundColor: settingsState.panel_color || '#8b5cf6' }}
                                                                                            />
                                                                                        </PopoverTrigger>
                                                                                        <PopoverContent 
                                                                                            className="w-64 bg-card dark:bg-[#0f0f13] border border-border dark:border-[#27272a] rounded-xl p-4 shadow-2xl z-50 flex flex-col"
                                                                                            side="top"
                                                                                            align="end"
                                                                                            sideOffset={8}
                                                                                        >
                                                                                            <Accordion type="single" collapsible className="w-full">
                                                                                                <AccordionItem value="picker" className="border-b-0">
                                                                                                    <AccordionTrigger className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-2 hover:no-underline hover:text-foreground dark:text-white">
                                                                                                        Color Picker
                                                                                                    </AccordionTrigger>
                                                                                                    <AccordionContent className="pt-2">
                                                                                                        <ColorPicker 
                                                                                                            value={settingsState.panel_color || '#8b5cf6'}
                                                                                                            onChange={(color) => {
                                                                                                                if (settingsState.panel_color !== color) {
                                                                                                                    setSettingsState(s => ({ ...s, panel_color: color }));
                                                                                                                }
                                                                                                            }}
                                                                                                        >
                                                                                                            <ColorPickerSelection />
                                                                                                            <div className="flex items-center gap-2 mt-4">
                                                                                                                <ColorPickerHue className="flex-1" />
                                                                                                                <ColorPickerEyeDropper />
                                                                                                            </div>
                                                                                                            <div className="flex items-center gap-2 mt-4">
                                                                                                                <ColorPickerFormat className="flex-1" />
                                                                                                            </div>
                                                                                                        </ColorPicker>
                                                                                                    </AccordionContent>
                                                                                                </AccordionItem>

                                                                                                <AccordionItem value="presets" className="border-b-0 border-t border-border dark:border-[#27272a]/60 mt-1">
                                                                                                    <AccordionTrigger className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-2 hover:no-underline hover:text-foreground dark:text-white">
                                                                                                        Presets
                                                                                                    </AccordionTrigger>
                                                                                                    <AccordionContent className="pt-2">
                                                                                                        <div className="grid grid-cols-5 gap-2">
                                                                                                            {[
                                                                                                                '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4',
                                                                                                                '#14b8a6', '#10b981', '#22c55e', '#eab308', '#f97316',
                                                                                                                '#ef4444', '#f43f5e', '#d946ef', '#ec4899', '#6b7280'
                                                                                                            ].map((color) => (
                                                                                                                <button
                                                                                                                    key={color}
                                                                                                                    type="button"
                                                                                                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 ${
                                                                                                                        (settingsState.panel_color || '#8b5cf6').toLowerCase() === color.toLowerCase() 
                                                                                                                            ? 'border-white shadow-[0_0_8px_rgba(255,255,255,0.25)]' 
                                                                                                                            : 'border-transparent'
                                                                                                                    }`}
                                                                                                                    style={{ backgroundColor: color }}
                                                                                                                    onClick={() => {
                                                                                                                        if (settingsState.panel_color !== color) {
                                                                                                                            setSettingsState(s => ({...s, panel_color: color}));
                                                                                                                        }
                                                                                                                    }}
                                                                                                                />
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </AccordionContent>
                                                                                                </AccordionItem>
                                                                                            </Accordion>
                                                                                        </PopoverContent>
                                                                                    </Popover>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column */}
                                            <div className="flex flex-col gap-6">
                                                
                                                {/* Download & Update */}
                                                <div className="bg-card dark:bg-[#0f0f13] border border-border dark:border-[#1f1f23] rounded-xl p-6 text-foreground dark:text-white shadow-md w-full">
                                                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border dark:border-[#1f1f23]/50">
                                                        <FolderDown className="w-5 h-5 text-primary" />
                                                        <h2 className="text-xl font-semibold">Download & Update</h2>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <Label className="text-xs text-muted-foreground mb-1.5 block">Application Version</Label>
                                                            <Input 
                                                                className="bg-card dark:bg-[#0f0f13] border-border dark:border-[#1f1f23] focus-visible:ring-primary h-[40px]" 
                                                                value={settingsState.version}
                                                                onChange={(e) => setSettingsState(s => ({...s, version: e.target.value}))}
                                                            />
                                                        </div>
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <Label className="text-xs text-muted-foreground mb-1.5 block">Auto-Update Download Link</Label>
                                                            <Input 
                                                                className="bg-card dark:bg-[#0f0f13] border-border dark:border-[#1f1f23] focus-visible:ring-primary h-[40px]" 
                                                                value={settingsState.autoUpdateLink}
                                                                onChange={(e) => setSettingsState(s => ({...s, autoUpdateLink: e.target.value}))}
                                                            />
                                                        </div>
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <Label className="text-xs text-muted-foreground mb-1.5 block">Webloader Download Link</Label>
                                                            <Input 
                                                                className="bg-card dark:bg-[#0f0f13] border-border dark:border-[#1f1f23] focus-visible:ring-primary h-[40px]" 
                                                                value={settingsState.webloaderLink}
                                                                onChange={(e) => setSettingsState(s => ({...s, webloaderLink: e.target.value}))}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Logging & Integration */}
                                                <div className="bg-card dark:bg-[#0f0f13] border border-border dark:border-[#1f1f23] rounded-xl p-6 text-foreground dark:text-white shadow-md w-full">
                                                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border dark:border-[#1f1f23]/50">
                                                        <Blocks className="w-5 h-5 text-primary" />
                                                        <h2 className="text-xl font-semibold">Logging & Integration</h2>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm flex items-center justify-between transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <div className="flex-1 mr-4">
                                                                <Label className="text-xs text-muted-foreground mb-1.5 block">Discord Webhook Link</Label>
                                                                <Input 
                                                                    className="bg-card dark:bg-[#0f0f13] border-border dark:border-[#1f1f23] focus-visible:ring-primary h-[40px] blur-sm hover:blur-none transition-all duration-300" 
                                                                    value={settingsState.discordWebhook}
                                                                    onChange={(e) => setSettingsState(s => ({...s, discordWebhook: e.target.value}))}
                                                                />
                                                            </div>
                                                            <div className="flex flex-col items-center justify-center shrink-0 border-l border-border dark:border-[#1f1f23] pl-4">
                                                                <Label className="text-xs font-semibold mb-2 block">Log IP</Label>
                                                                <Switch 
                                                                    checked={settingsState.logIp} 
                                                                    onCheckedChange={(c) => setSettingsState(s => ({...s, logIp: c}))} 
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Security & User Restriction */}
                                                <div className="bg-card dark:bg-[#0f0f13] border border-border dark:border-[#1f1f23] rounded-xl p-6 text-foreground dark:text-white shadow-md w-full">
                                                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border dark:border-[#1f1f23]/50">
                                                        <ShieldAlert className="w-5 h-5 text-primary" />
                                                        <h2 className="text-xl font-semibold">Security & Restrictions</h2>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <Label className="text-xs text-muted-foreground mb-1.5 block">Minimum HWID Length</Label>
                                                            <Input 
                                                                type="number"
                                                                className="bg-card dark:bg-[#0f0f13] border-border dark:border-[#1f1f23] focus-visible:ring-primary h-[40px]" 
                                                                value={settingsState.min_hwid_length}
                                                                onChange={(e) => setSettingsState(s => ({...s, min_hwid_length: parseInt(e.target.value)}))}
                                                            />
                                                        </div>
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <div className="flex gap-4">
                                                                <div className="flex-1">
                                                                    <Label className="text-xs text-muted-foreground mb-1.5 block">HWID Reset Cooldown Unit</Label>
                                                                    <select 
                                                                        value={cooldownUnit} 
                                                                        onChange={(e) => {
                                                                            const newUnit = e.target.value as 'hours' | 'days';
                                                                            if (newUnit === 'hours' && cooldownUnit === 'days') {
                                                                                setSettingsState(s => ({ ...s, cooldown_duration: s.cooldown_duration * 24 }));
                                                                            } else if (newUnit === 'days' && cooldownUnit === 'hours') {
                                                                                setSettingsState(s => ({ ...s, cooldown_duration: Math.round(s.cooldown_duration / 24) || 1 }));
                                                                            }
                                                                            setCooldownUnit(newUnit);
                                                                        }}
                                                                        className="flex h-[40px] w-full rounded-md border border-border dark:border-[#1f1f23] bg-card dark:bg-[#0f0f13] px-3 py-2 text-sm text-foreground dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                                    >
                                                                        <option value="hours">Hours</option>
                                                                        <option value="days">Days</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <Label className="text-xs text-muted-foreground mb-1.5 block">Cooldown Duration</Label>
                                                                    <Input 
                                                                        type="number"
                                                                        className="bg-card dark:bg-[#0f0f13] border-border dark:border-[#1f1f23] focus-visible:ring-primary h-[40px]" 
                                                                        value={settingsState.cooldown_duration}
                                                                        onChange={(e) => setSettingsState(s => ({...s, cooldown_duration: parseInt(e.target.value)}))}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-[#15151a] border border-border dark:border-[#1f1f23]/50 rounded-lg p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                                            <Label className="text-xs text-muted-foreground mb-1.5 block">Minimum Username Length</Label>
                                                            <Input 
                                                                type="number"
                                                                className="bg-card dark:bg-[#0f0f13] border-border dark:border-[#1f1f23] focus-visible:ring-primary h-[40px]" 
                                                                value={settingsState.minUsernameLength}
                                                                onChange={(e) => setSettingsState(s => ({...s, minUsernameLength: parseInt(e.target.value)}))}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>

                                        <div className="mt-8 rounded-2xl relative overflow-hidden bg-red-500/5 dark:bg-red-950/20 border border-red-500/30 shadow-xl shadow-red-500/5">
                                            {/* Glowing top border */}
                                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0" />
                                            <div className="p-5 sm:p-7 relative z-10">
                                                {/* Header */}
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl text-red-500">
                                                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-lg font-bold text-red-600 dark:text-red-400 tracking-tight">Danger Zone</h2>
                                                        <p className="text-xs text-muted-foreground">Destructive actions that cannot be undone.</p>
                                                    </div>
                                                </div>

                                                <div className="mt-5 border border-red-500/20 rounded-xl overflow-hidden bg-card/60 dark:bg-[#120a0a]/60">
                                                    <div className="p-5 sm:p-6">
                                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                                    <h4 className="font-semibold text-foreground dark:text-red-200 text-sm">Delete Application</h4>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                                    Once you delete <span className="font-semibold text-foreground">{appData?.name || "this application"}</span>, all users, licenses, tokens, and audit logs will be permanently erased.
                                                                </p>
                                                            </div>
                                                            <div className="shrink-0">
                                                                <Button 
                                                                    variant="destructive" 
                                                                    onClick={handleDeleteApp}
                                                                    disabled={isDeleting}
                                                                    className="bg-red-600 hover:bg-red-500 text-white font-semibold h-10 px-6 shadow-lg shadow-red-500/20 transition-all duration-200 whitespace-nowrap"
                                                                >
                                                                    {isDeleting ? (
                                                                        <><Activity className="mr-2 h-4 w-4 animate-spin" /> Terminating...</>
                                                                    ) : (
                                                                        <><Trash2 className="mr-2 h-4 w-4" /> Delete Application</>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-red-500/10 border-t border-red-500/20 px-5 py-3 flex items-center gap-2">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                                        <p className="text-[11px] text-red-600 dark:text-red-300/80 font-medium">This operation is irreversible. Please ensure you have saved any necessary data before deleting.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>

            {createPortal(
                <AnimatePresence>
                    {activeTab === 'settings' && hasChanges && (
                        <div className="fixed inset-x-0 bottom-6 flex justify-center z-[9999] pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="pointer-events-auto bg-[#121216]/95 border border-yellow-500/30 text-foreground dark:text-white px-6 py-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(234,179,8,0.15)] w-[90%] sm:w-auto min-w-[500px] backdrop-blur-md"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-500/20 p-2 rounded-lg text-yellow-500">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-200">Unsaved changes</span>
                                        <span className="text-xs text-muted-foreground font-medium">Click "Save Changes" or press Ctrl+S to apply.</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            if (savedSettingsState) {
                                                setSettingsState({ ...savedSettingsState });
                                            }
                                        }}
                                        className="text-xs hover:bg-neutral-800 text-gray-400 hover:text-white h-9 px-4 rounded-lg"
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveSettings}
                                        disabled={isSavingSettings}
                                        className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold h-9 px-5 shadow-[0_0_15px_rgba(59,130,246,0.25)] rounded-lg text-xs"
                                    >
                                        {isSavingSettings ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #27272a;
                    border-radius: 20px;
                }
            `}</style>
        </div>
    );
}
