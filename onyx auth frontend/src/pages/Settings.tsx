import { useState, useEffect, useRef } from "react";
import { devApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ToggleAnimated } from "../components/ui/toggle-animated";
import { SelectAnimated } from "../components/ui/select-animated";
import { toast } from "sonner";
import { 
    Settings as SettingsIcon, Save, Activity, Trash2, 
    ShieldCheck, ShieldAlert, Key, Globe, Lock, Network, BookOpen, MonitorPlay, Copy, ExternalLink,
    AlertTriangle, Bell, Send, User, Image, Loader2, AlertOctagon, ChevronRight, Info
} from "lucide-react";
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
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";

interface SettingsProps {
    appId: string;
    appName: string;
}

export default function Settings({ appId, appName }: SettingsProps) {
    const { confirm } = useDialog();
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isTestingWebhook, setIsTestingWebhook] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const [settingsState, setSettingsState] = useState({
        status: true,
        hwid_lock: false,
        force_hwid: false,
        block_vpns: false,
        hash_check: false,
        block_leaked_passwords: false,
        token_validation: false,
        version: '1.0.0',
        min_hwid_length: 20,
        cooldown_duration: 24,
        autoUpdateLink: '',
        webloaderLink: '',
        discordWebhook: '',
        discordWebhookUsername: '',
        discordWebhookAvatar: '',
        logIp: true,
        minUsernameLength: 1,
        panel_status: true,
        panel_icon: 'https://cdn.keyauth.cc/front/assets/img/favicon.png',
        panel_color: '#8b5cf6',
        owner_username: 'admin'
    });

    const [savedSettingsState, setSavedSettingsState] = useState<any>(null);
    const [cooldownUnit, setCooldownUnit] = useState<'hours' | 'days'>('hours');
    const [savedCooldownUnit, setSavedCooldownUnit] = useState<'hours' | 'days'>('hours');

    useEffect(() => {
        if (!appId) return;
        const fetchApp = async () => {
            try {
                const res = await devApi.getApp(appId);
                if (res.status === 'success') {
                    const appData = res.data.app;
                    
                    const dbDuration = appData.cooldown_duration ?? 24;
                    const unit = (dbDuration % 24 === 0 && dbDuration > 0) ? 'days' : 'hours';
                    const displayDuration = unit === 'days' ? dbDuration / 24 : dbDuration;
                    
                    setCooldownUnit(unit);
                    setSavedCooldownUnit(unit);

                    const initial = {
                        status: appData.status !== undefined ? Boolean(appData.status) : true,
                        hwid_lock: Boolean(appData.hwid_lock),
                        force_hwid: Boolean(appData.force_hwid),
                        block_vpns: Boolean(appData.block_vpns),
                        hash_check: Boolean(appData.hash_check),
                        block_leaked_passwords: Boolean(appData.block_leaked_passwords),
                        token_validation: Boolean(appData.token_validation),
                        version: appData.version || '1.0.0',
                        min_hwid_length: appData.min_hwid_length || 20,
                        cooldown_duration: displayDuration,
                        autoUpdateLink: appData.auto_update_link || '',
                        webloaderLink: appData.webloader_link || '',
                        discordWebhook: appData.discord_webhook || '',
                        discordWebhookUsername: appData.discord_webhook_username || '',
                        discordWebhookAvatar: appData.discord_webhook_avatar || '',
                        logIp: appData.log_ip !== undefined ? Boolean(appData.log_ip) : true,
                        minUsernameLength: appData.min_username_length || 1,
                        panel_status: appData.panel_status !== undefined ? Boolean(appData.panel_status) : true,
                        panel_icon: appData.panel_icon || 'https://cdn.keyauth.cc/front/assets/img/favicon.png',
                        panel_color: appData.panel_color || '#8b5cf6',
                        owner_username: appData.owner_username || 'admin'
                    };
                    setSettingsState(initial);
                    setSavedSettingsState(initial);
                }
            } catch (error) {
                console.error("Failed to fetch app data", error);
            }
        };
        fetchApp();
    }, [appId]);

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

    const isDiscordWebhookUrl = (url: string) => {
        if (!url || !url.trim()) return true;
        return /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/i.test(url.trim());
    };

    const handleSaveSettings = async () => {
        if (!appId) return;
        
        const versionRegex = /^\d+(\.\d+)*$/;
        if (!versionRegex.test(settingsState.version)) {
            toast.error("Invalid version format. Examples: 1.0, 1.0.0");
            return;
        }

        if (settingsState.discordWebhook && !isDiscordWebhookUrl(settingsState.discordWebhook)) {
            toast.error("Invalid Discord Webhook URL. Please paste a valid URL (e.g., https://discord.com/api/webhooks/...)");
            return;
        }

        setIsSavingSettings(true);
        try {
            const payload = {
                status: settingsState.status,
                hwid_lock: settingsState.hwid_lock,
                force_hwid: settingsState.force_hwid,
                block_vpns: settingsState.block_vpns,
                hash_check: settingsState.hash_check,
                block_leaked_passwords: settingsState.block_leaked_passwords,
                token_validation: settingsState.token_validation,
                version: settingsState.version,
                min_hwid_length: settingsState.min_hwid_length,
                cooldown_duration: settingsState.cooldown_duration * (cooldownUnit === 'days' ? 24 : 1),
                auto_update_link: settingsState.autoUpdateLink,
                webloader_link: settingsState.webloaderLink,
                discord_webhook: settingsState.discordWebhook,
                discord_webhook_username: settingsState.discordWebhookUsername,
                discord_webhook_avatar: settingsState.discordWebhookAvatar,
                log_ip: settingsState.logIp,
                min_username_length: settingsState.minUsernameLength,
                panel_status: settingsState.panel_status,
                panel_icon: settingsState.panel_icon,
                panel_color: settingsState.panel_color
            };
            await devApi.updateApp(appId, payload);
            setSavedSettingsState({ ...settingsState });
            setSavedCooldownUnit(cooldownUnit);
            toast.success("Settings saved securely!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save settings");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleTestWebhook = async () => {
        if (!appId) return;
        if (!settingsState.discordWebhook) {
            toast.error("Please enter a Discord Webhook URL first.");
            return;
        }
        if (!isDiscordWebhookUrl(settingsState.discordWebhook)) {
            toast.error("Invalid Discord Webhook URL. Please paste a valid URL (e.g., https://discord.com/api/webhooks/...)");
            return;
        }
        setIsTestingWebhook(true);
        try {
            await devApi.testWebhook(
                appId,
                settingsState.discordWebhook,
                settingsState.discordWebhookUsername || undefined,
                settingsState.discordWebhookAvatar || undefined
            );
            toast.success("Test Webhook sent successfully! Check your Discord channel.");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send test webhook.");
        } finally {
            setIsTestingWebhook(false);
        }
    };

    useEffect(() => {
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
    }, [hasChanges, handleSaveSettings]);

    const handleDeleteApp = async () => {
        if (!appId) return;
        if (deleteConfirmText !== appName) return;
        
        setIsDeleting(true);
        try {
            await devApi.deleteApp(appId);
            toast.success("Application deleted successfully");
            window.location.href = '/dashboard';
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete app");
            setDeleteConfirmText('');
            setIsDeleting(false);
        }
    };

    const handleAddHash = async () => {
        if (!appId) return;
        const hashVal = window.prompt("Enter the application hash to whitelist:");
        if (!hashVal) return;
        try {
            await devApi.addHash(appId, hashVal);
            toast.success("Hash added successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add hash");
        }
    };

    const handleResetHashes = async () => {
        if (!appId) return;
        if (!await confirm({ 
            title: "Reset All Hashes", 
            description: "Are you sure you want to delete all hashes? Users will need to authenticate again with valid hashes to auto-whitelist.", 
            variant: "destructive" 
        })) return;
        
        try {
            await devApi.resetHashes(appId);
            toast.success("All hashes reset successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to reset hashes");
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Application Configuration</h1>
                    <p className="text-muted-foreground">Configure security policies, integrity checks, and application behavior.</p>
                </div>
                <Button 
                    onClick={handleSaveSettings} 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-[0_0_15px_3px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_5px_rgba(59,130,246,0.3)] transition-all"
                    disabled={isSavingSettings}
                >
                    {isSavingSettings ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {isSavingSettings ? "Saving Changes..." : "Save Settings"}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left Column: General Configuration + Security & Restrictions */}
                <div className="space-y-6">
                    {/* General Settings */}
                    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 text-foreground shadow-md w-full">
                        <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border/50">
                            <SettingsIcon className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-semibold">General configuration</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-muted/40 border border-border/50 rounded-lg p-3 sm:p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Application Version</Label>
                                <Input 
                                    className="bg-card border-border focus-visible:ring-primary h-[40px]" 
                                    value={settingsState.version}
                                    onChange={(e) => setSettingsState(s => ({...s, version: e.target.value}))}
                                />
                            </div>
                            <div className="bg-muted/40 border border-border/50 rounded-lg p-3 sm:p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Webloader Link</Label>
                                <Input 
                                    className="bg-card border-border focus-visible:ring-primary h-[40px]" 
                                    value={settingsState.webloaderLink}
                                    onChange={(e) => setSettingsState(s => ({...s, webloaderLink: e.target.value}))}
                                />
                            </div>
                            <div className="flex items-center justify-between bg-muted/40 border border-border/50 p-3 sm:p-4 rounded-lg shadow-sm transition-colors duration-300 hover:border-primary/50">
                                <div className="space-y-0.5 flex-1 pr-4">
                                    <Label className="text-sm font-medium text-foreground flex items-center"><Activity className="w-4 h-4 mr-2 text-primary" /> App Status</Label>
                                    <p className="text-xs text-muted-foreground">Enable or disable the application, preventing users from logging in.</p>
                                </div>
                                <ToggleAnimated checked={settingsState.status} onChange={(c) => setSettingsState(s => ({...s, status: c}))} />
                            </div>
                        </div>
                    </div>

                    {/* Security & Restrictions */}
                    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 text-foreground shadow-md w-full">
                        <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border/50">
                            <ShieldAlert className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-semibold">Security & Restrictions</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-muted/40 border border-border/50 rounded-lg p-3 sm:p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Minimum HWID Length</Label>
                                <Input 
                                    type="number" 
                                    className="bg-card border-border focus-visible:ring-primary h-[40px]" 
                                    value={settingsState.min_hwid_length}
                                    onChange={(e) => setSettingsState(s => ({...s, min_hwid_length: parseInt(e.target.value)}))}
                                />
                            </div>
                            <div className="bg-muted/40 border border-border/50 rounded-lg p-3 sm:p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <Label className="text-xs text-muted-foreground mb-1.5 block">HWID Reset Cooldown Unit</Label>
                                        <SelectAnimated 
                                            value={cooldownUnit}
                                            onChange={(val) => {
                                                const newUnit = val as 'hours' | 'days';
                                                if (newUnit === 'hours' && cooldownUnit === 'days') {
                                                    setSettingsState(s => ({ ...s, cooldown_duration: s.cooldown_duration * 24 }));
                                                } else if (newUnit === 'days' && cooldownUnit === 'hours') {
                                                    setSettingsState(s => ({ ...s, cooldown_duration: Math.round(s.cooldown_duration / 24) || 1 }));
                                                }
                                                setCooldownUnit(newUnit);
                                            }}
                                            options={[
                                                { value: "hours", label: "Hours" },
                                                { value: "days", label: "Days" }
                                            ]}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs text-muted-foreground mb-1.5 block">Cooldown Duration</Label>
                                        <Input 
                                            type="number" 
                                            className="bg-card border-border focus-visible:ring-primary h-[40px]" 
                                            value={settingsState.cooldown_duration}
                                            onChange={(e) => setSettingsState(s => ({...s, cooldown_duration: parseInt(e.target.value)}))}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/40 border border-border/50 rounded-lg p-3 sm:p-4 shadow-sm transition-shadow duration-300 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.15)]">
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Minimum Username Length</Label>
                                <Input 
                                    type="number" 
                                    className="bg-card border-border focus-visible:ring-primary h-[40px]" 
                                    value={settingsState.minUsernameLength}
                                    onChange={(e) => setSettingsState(s => ({...s, minUsernameLength: parseInt(e.target.value)}))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Access Controls + Hash Management & Logging */}
                <div className="space-y-6">
                    {/* Access Controls */}
                    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 text-foreground shadow-md w-full">
                        <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border/50">
                            <Lock className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-semibold">Access Controls</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-muted/40 border border-border/50 p-3 sm:p-4 rounded-lg shadow-sm transition-colors duration-300 hover:border-primary/50">
                                <div className="space-y-0.5 flex-1 pr-4">
                                    <Label className="text-sm font-medium text-foreground flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" /> HWID Lock</Label>
                                    <p className="text-xs text-muted-foreground">Lock users to a value from your user's device which only changes if they reinstall their operating system. Use this to prevent people from sharing your product.</p>
                                </div>
                                <ToggleAnimated checked={settingsState.hwid_lock} onChange={(c) => setSettingsState(s => ({...s, hwid_lock: c}))} />
                            </div>
                            <div className="flex items-center justify-between bg-muted/40 border border-border/50 p-3 sm:p-4 rounded-lg shadow-sm transition-colors duration-300 hover:border-primary/50">
                                <div className="space-y-0.5 flex-1 pr-4">
                                    <Label className="text-sm font-medium text-foreground flex items-center"><Key className="w-4 h-4 mr-2 text-primary" /> Force HWID</Label>
                                    <p className="text-xs text-muted-foreground">Prevent users from logging in with a blank HWID (disable this for web based products, i.e. PHP).</p>
                                </div>
                                <ToggleAnimated checked={settingsState.force_hwid} onChange={(c) => setSettingsState(s => ({...s, force_hwid: c}))} />
                            </div>
                            <div className="flex items-center justify-between bg-muted/40 border border-border/50 p-3 sm:p-4 rounded-lg shadow-sm transition-colors duration-300 hover:border-primary/50">
                                <div className="space-y-0.5 flex-1 pr-4">
                                    <Label className="text-sm font-medium text-foreground flex items-center"><ShieldAlert className="w-4 h-4 mr-2 text-rose-500" /> Block VPNs</Label>
                                    <p className="text-xs text-muted-foreground">Deny access from known VPN IP ranges.</p>
                                </div>
                                <ToggleAnimated checked={settingsState.block_vpns} onChange={(c) => setSettingsState(s => ({...s, block_vpns: c}))} />
                            </div>
                            <div className="flex items-center justify-between bg-muted/40 border border-border/50 p-3 sm:p-4 rounded-lg shadow-sm transition-colors duration-300 hover:border-primary/50">
                                <div className="space-y-0.5 flex-1 pr-4">
                                    <Label className="text-sm font-medium text-foreground flex items-center"><Lock className="w-4 h-4 mr-2 text-amber-500" /> Token Validation</Label>
                                    <p className="text-xs text-muted-foreground">Require valid tokens for session persistence.</p>
                                </div>
                                <ToggleAnimated checked={settingsState.token_validation} onChange={(c) => setSettingsState(s => ({...s, token_validation: c}))} />
                            </div>
                        </div>
                    </div>

                    {/* Hash Checking & Logging */}
                    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 text-foreground shadow-md w-full">
                        <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border/50">
                            <BookOpen className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-semibold">Hash Management & Logging</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-muted/40 border border-border/50 p-3 sm:p-4 rounded-lg shadow-sm transition-colors duration-300 hover:border-primary/50">
                                <div className="space-y-0.5 flex-1 pr-4">
                                    <Label className="text-sm font-medium text-foreground flex items-center"><Key className="w-4 h-4 mr-2 text-indigo-500" /> Hash Check</Label>
                                    <p className="text-xs text-muted-foreground">Validate client executable hash.</p>
                                </div>
                                <ToggleAnimated checked={settingsState.hash_check} onChange={(c) => setSettingsState(s => ({...s, hash_check: c}))} />
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
                                        <div className="bg-muted/40 border border-border/50 rounded-lg p-4 shadow-sm space-y-4 mt-2 mb-2">
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                                                <Key className="w-4 h-4 text-primary" />
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
                            <div className="flex items-center justify-between bg-muted/40 border border-border/50 p-3 sm:p-4 rounded-lg shadow-sm transition-colors duration-300 hover:border-primary/50">
                                <div className="space-y-0.5 flex-1 pr-4">
                                    <Label className="text-sm font-medium text-foreground flex items-center"><Lock className="w-4 h-4 mr-2 text-rose-500" /> Block Leaked Passwords</Label>
                                    <p className="text-xs text-muted-foreground">Reject known compromised passwords.</p>
                                </div>
                                <ToggleAnimated checked={settingsState.block_leaked_passwords} onChange={(c) => setSettingsState(s => ({...s, block_leaked_passwords: c}))} />
                            </div>
                            <div className="flex items-center justify-between bg-muted/40 border border-border/50 p-3 sm:p-4 rounded-lg shadow-sm transition-colors duration-300 hover:border-primary/50">
                                <div className="space-y-0.5 flex-1 pr-4">
                                    <Label className="text-sm font-medium text-foreground flex items-center"><Globe className="w-4 h-4 mr-2 text-primary" /> Log IP Addresses</Label>
                                    <p className="text-xs text-muted-foreground">Store client IPs on successful login.</p>
                                </div>
                                <ToggleAnimated checked={settingsState.logIp} onChange={(c) => setSettingsState(s => ({...s, logIp: c}))} />
                            </div>

                            {/* Customer Panel Configuration */}
                            <div className="bg-muted/40 border border-border/50 rounded-lg p-3 sm:p-4 shadow-sm flex flex-col justify-between transition-shadow duration-300 relative group mt-4">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 rounded-l-lg"></div>
                                <div className="flex items-center justify-between w-full mb-4">
                                    <div>
                                        <h3 className="font-semibold text-[14px] flex items-center gap-2 text-foreground">
                                            <MonitorPlay className="w-4 h-4 text-primary" />
                                            Seller Customer Panel
                                        </h3>
                                        <p className="text-[12px] text-muted-foreground mt-0.5">Your dedicated web panel for customers to login, register, and reset HWID.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12px] font-medium text-gray-400">Enable Panel</span>
                                        <ToggleAnimated 
                                            checked={settingsState.panel_status} 
                                            onChange={(c) => setSettingsState(s => ({...s, panel_status: c}))} 
                                        />
                                    </div>
                                </div>
                                
                                <div className="w-full">
                                    <div className="flex flex-col gap-4">
                                        {/* Customer Panel Link */}
                                        <div className="relative w-full">
                                            <input 
                                                type="text" 
                                                id="customerPanelLink" 
                                                className="block px-2.5 pb-2.5 pt-4 w-full text-sm text-foreground bg-transparent rounded-lg border border-border appearance-none focus:outline-none focus:ring-0 focus:border-primary peer" 
                                                placeholder=" " 
                                                value={`${window.location.origin}/panel/${settingsState.owner_username}/${encodeURIComponent(appName)}`} 
                                                readOnly 
                                            />
                                            <label htmlFor="customerPanelLink" className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-muted/40 px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1">
                                                Customer Panel Link
                                            </label>
                                        </div>

                                        {/* Customer Panel Icon */}
                                        <div className="relative w-full">
                                            <input 
                                                type="url" 
                                                id="customerPanelIcon" 
                                                className="block px-2.5 pb-2.5 pt-4 w-full text-sm text-foreground bg-transparent rounded-lg border border-border appearance-none focus:outline-none focus:ring-0 focus:border-primary peer" 
                                                placeholder=" " 
                                                value={settingsState.panel_icon}
                                                onChange={(e) => setSettingsState(s => ({...s, panel_icon: e.target.value}))}
                                            />
                                            <label htmlFor="customerPanelIcon" className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-muted/40 px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1">
                                                Customer Panel Icon
                                            </label>
                                        </div>

                                        {/* Customer Panel Color */}
                                        <div className="relative w-full flex flex-col sm:flex-row sm:items-center justify-between bg-muted/40/50 rounded-lg border border-border p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_15px_2px_rgba(59,130,246,0.1)] gap-4 sm:gap-0">
                                            <div className="pr-2">
                                                <label className="text-sm font-medium text-foreground flex items-center gap-2">Theme Color</label>
                                                <p className="text-xs text-muted-foreground mt-0.5">Customize the primary color of your panel.</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="px-3 py-1.5 rounded-md bg-card border border-border text-xs font-mono text-gray-300">
                                                    {settingsState.panel_color || '#8b5cf6'}
                                                </div>
                                                <div className="relative">
                                                    <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                                                        <PopoverTrigger asChild>
                                                            <button 
                                                                type="button"
                                                                className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-border shadow-sm hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#15151a]"
                                                                style={{ backgroundColor: settingsState.panel_color || '#8b5cf6' }}
                                                            />
                                                        </PopoverTrigger>
                                                        <PopoverContent 
                                                            className="w-64 bg-card border border-border rounded-xl p-4 shadow-2xl z-50 flex flex-col"
                                                            side="top"
                                                            align="end"
                                                            sideOffset={8}
                                                        >
                                                            <Accordion type="single" collapsible className="w-full">
                                                                <AccordionItem value="picker" className="border-b-0">
                                                                    <AccordionTrigger className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-2 hover:no-underline hover:text-foreground">
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

                                                                <AccordionItem value="presets" className="border-b-0 border-t border-border/60 mt-1">
                                                                    <AccordionTrigger className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-2 hover:no-underline hover:text-foreground">
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
                                                                                            ? 'border-border shadow-[0_0_8px_rgba(255,255,255,0.25)]' 
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
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Discord Webhook Logging ──────────────────────────────── */}
            <div className="mt-6 bg-card border border-border rounded-xl p-4 sm:p-6 text-foreground shadow-md relative overflow-hidden">
                {/* Accent bar */}
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl" />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-4 border-b border-border/50">
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-500/15 p-2.5 rounded-lg mt-0.5">
                            <Bell className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">Discord Webhook Notifications</h2>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                                Receive real-time Discord alerts whenever users are created, deleted, banned, or perform key actions. Customize the bot name and avatar that appear in your channel.
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        onClick={handleTestWebhook}
                        disabled={isTestingWebhook || !settingsState.discordWebhook}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-9 text-xs px-4 flex items-center gap-2 shrink-0"
                    >
                        {isTestingWebhook ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                        ) : (
                            <><Send className="w-3.5 h-3.5" /> Test Webhook</>
                        )}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                    {/* Left: Form fields (3/5 width on large screens) */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Webhook URL */}
                        <div className="bg-muted/40 border border-border/50 rounded-lg p-4 shadow-sm">
                            <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                                <Network className="w-3.5 h-3.5 text-primary" />
                                Discord Webhook URL
                            </Label>
                            <Input
                                className="bg-card border-border focus-visible:ring-indigo-500 h-[40px] font-mono text-xs"
                                value={settingsState.discordWebhook}
                                placeholder="https://discord.com/api/webhooks/..."
                                onChange={(e) => setSettingsState(s => ({ ...s, discordWebhook: e.target.value }))}
                            />
                            <p className="text-[11px] text-muted-foreground mt-1.5">Copy from Discord: Server Settings → Integrations → Webhooks.</p>
                        </div>

                        {/* Bot Name */}
                        <div className="bg-muted/40 border border-border/50 rounded-lg p-4 shadow-sm">
                            <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-indigo-400" />
                                Bot Display Name <span className="ml-1 text-[10px] opacity-60">(optional)</span>
                            </Label>
                            <Input
                                className="bg-card border-border focus-visible:ring-indigo-500 h-[40px] text-sm"
                                value={settingsState.discordWebhookUsername}
                                placeholder="Default: Dexter Auth"
                                onChange={(e) => setSettingsState(s => ({ ...s, discordWebhookUsername: e.target.value }))}
                            />
                            <p className="text-[11px] text-muted-foreground mt-1.5">Leave blank to use default bot name ("Dexter Auth").</p>
                        </div>

                        {/* Avatar URL */}
                        <div className="bg-muted/40 border border-border/50 rounded-lg p-4 shadow-sm">
                            <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                                <Image className="w-3.5 h-3.5 text-indigo-400" />
                                Bot Avatar URL <span className="ml-1 text-[10px] opacity-60">(optional)</span>
                            </Label>
                            <Input
                                className="bg-card border-border focus-visible:ring-indigo-500 h-[40px] text-xs font-mono"
                                value={settingsState.discordWebhookAvatar}
                                placeholder="https://dexterauth.onrender.com/assets/images/logo.png"
                                onChange={(e) => setSettingsState(s => ({ ...s, discordWebhookAvatar: e.target.value }))}
                            />
                            <p className="text-[11px] text-muted-foreground mt-1.5">Leave blank to use default Dexter Auth logo (https://dexterauth.onrender.com/assets/images/logo.png). Direct link to any PNG/JPG/GIF image.</p>
                        </div>
                    </div>

                    {/* Right: Live Discord Embed Preview (2/5 width on large screens) */}
                    <div className="lg:col-span-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Live Preview
                        </p>
                        {/* Discord-style dark message preview */}
                        <div className="rounded-lg bg-[#313338] p-4 border border-[#202225]/60 shadow-xl">
                            {/* Bot message header */}
                            <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center border-2 border-[#202225]">
                                    <img
                                        key={settingsState.discordWebhookAvatar || 'default-avatar'}
                                        src={
                                            !settingsState.discordWebhookAvatar || !settingsState.discordWebhookAvatar.trim()
                                                ? 'https://dexterauth.onrender.com/assets/images/logo.png'
                                                : settingsState.discordWebhookAvatar.trim()
                                        }
                                        alt="Bot avatar"
                                        className="w-full h-full object-cover"
                                        onError={(e) => { 
                                            const imgEl = e.target as HTMLImageElement;
                                            if (imgEl.src.includes('logo.png')) {
                                                imgEl.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                            } else if (imgEl.src !== 'https://dexterauth.onrender.com/assets/images/logo.png') {
                                                imgEl.src = 'https://dexterauth.onrender.com/assets/images/logo.png';
                                            }
                                        }}
                                    />
                                </div>
                                {/* Name + timestamp */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-white">
                                            {settingsState.discordWebhookUsername || appName || 'Dexter Auth'}
                                        </span>
                                        <span className="text-[10px] text-[#87898c] font-medium bg-indigo-600/80 px-1.5 py-0.5 rounded text-white">BOT</span>
                                        <span className="text-[11px] text-[#87898c]">Today at 12:00 PM</span>
                                    </div>
                                    {/* Embed card */}
                                    <div className="mt-2 bg-[#2b2d31] rounded-md border-l-4 border-indigo-500 p-3 shadow">
                                        <p className="text-[11px] font-semibold text-indigo-300 mb-1">🔑 Key Generation History</p>
                                        <p className="text-[11px] text-[#dbdee1]"><span className="text-indigo-300 font-medium">5 license key(s)</span> generated for this application.</p>
                                        <div className="mt-2 pt-2 border-t border-[#3f4147] grid grid-cols-2 gap-1">
                                            <div>
                                                <p className="text-[10px] text-[#87898c]">Quantity</p>
                                                <p className="text-[11px] text-[#dbdee1] font-medium">5 Keys</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-[#87898c]">Subscription</p>
                                                <p className="text-[11px] text-[#dbdee1] font-medium">Level 1</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-[#87898c] mt-2">{new Date().toUTCString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {!settingsState.discordWebhook && (
                            <p className="text-[11px] text-amber-400/80 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                No webhook URL set — notifications disabled.
                            </p>
                        )}
                        {settingsState.discordWebhook && (
                            <p className="text-[11px] text-emerald-400/80 mt-2 flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Webhook configured — real-time logging active.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Danger Zone ─────────────────────────────────────────── */}
            <div className="mt-8 rounded-2xl relative overflow-hidden bg-red-500/5 dark:bg-red-950/20 border border-red-500/30 shadow-xl shadow-red-500/5">
                {/* Glowing top border */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0" />
                <div className="p-5 sm:p-7 relative z-10">

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl text-red-500">
                            <AlertOctagon className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-red-600 dark:text-red-400 tracking-tight">Danger Zone</h2>
                            <p className="text-xs text-muted-foreground">Irreversible and destructive application actions.</p>
                        </div>
                    </div>

                    <div className="mt-5 border border-red-500/20 rounded-xl overflow-hidden bg-card/60 dark:bg-[#120a0a]/60">
                        {/* Action row */}
                        <div className="p-5 sm:p-6">
                            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                                {/* Left: description */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                        <h4 className="font-semibold text-foreground dark:text-red-200 text-sm">Delete this application</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                        Permanently deletes <span className="font-semibold text-foreground">{appName}</span> and all associated data. This operation cannot be undone.
                                    </p>
                                    {/* Consequences list */}
                                    <div className="space-y-2 bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                                        {[
                                            'All app users and their sessions will be deleted',
                                            'All license keys will be permanently removed',
                                            'All application logs and audit history will be erased',
                                            'Webhook configurations and settings will be lost',
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <ChevronRight className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                                                <span className="text-xs text-muted-foreground font-medium">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: confirmation + button */}
                                <div className="lg:w-72 shrink-0">
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Type <span className="font-mono font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 select-all">{appName}</span> to confirm deletion:
                                        </p>
                                        <input
                                            type="text"
                                            id="deleteConfirmInput"
                                            className="w-full bg-card border border-red-500/30 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all font-mono"
                                            placeholder={`Type "${appName}"…`}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            value={deleteConfirmText}
                                        />
                                        <Button
                                            variant="destructive"
                                            onClick={handleDeleteApp}
                                            disabled={isDeleting || deleteConfirmText !== appName}
                                            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold h-10 shadow-lg shadow-red-500/20 transition-all duration-200"
                                        >
                                            {isDeleting ? (
                                                <><Activity className="w-4 h-4 mr-2 animate-spin" /> Deleting…</>
                                            ) : (
                                                <><Trash2 className="w-4 h-4 mr-2" /> Delete Application</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Warning footer strip */}
                        <div className="bg-red-500/10 border-t border-red-500/20 px-5 py-3 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <p className="text-[11px] text-red-600 dark:text-red-300/80 font-medium">This action is permanent and cannot be reversed. Please make sure you have backed up any critical data before proceeding.</p>
                        </div>
                    </div>
                </div>
            </div>

            {createPortal(
                <AnimatePresence>
                    {hasChanges && (
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
        </div>
    );
}
