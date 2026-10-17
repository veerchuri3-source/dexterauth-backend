import React, { useState, useEffect } from "react";
import { devApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ChevronRight, Search, Key, Copy, Check,
    Download, Trash2, MoreHorizontal, Plus, ChevronLeft,
    Loader2, PackageOpen, AlertCircle
} from "lucide-react";
import { CheckboxAnimated } from "../components/ui/checkbox-animated";
import { SelectAnimated } from "../components/ui/select-animated";
import { SellerTable, SellerTableRow } from "../components/ui/premium-data-table";

interface License {
    id: string;
    key: string;
    status: string;
    created_at: string;
    created_by: string;
    note: string;
    duration: string;
    used_by: string;
    used_on: string;
    subscription_level?: string;
    created_by_username?: string;
    used_by_username?: string;
    used_at?: string;
    expiry_duration: number;
    ban_reason?: string;
    ban_expires?: string;
    owner_username?: string;
}

interface Subscription {
    id: string;
    level: string;
    name: string;
    status: string;
}

interface LicensesProps {
    appId: string;
    appName: string;
    isPaused?: boolean;
}

import { useDialog } from "../hooks/use-dialog";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

export default function Licenses({ appId, appName, isPaused }: LicensesProps) {
    const { confirm, prompt } = useDialog();
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectAll, setSelectAll] = useState(false);
    const [selectedLicenses, setSelectedLicenses] = useState<Set<string>>(new Set());
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Ban Modal States
    const [selectedBanLicense, setSelectedBanLicense] = useState<License | null>(null);
    const [isBanActionModalOpen, setIsBanActionModalOpen] = useState(false);
    const [banReasonInput, setBanReasonInput] = useState("");
    const [banDurationInput, setBanDurationInput] = useState("315576000");
    const [statusFilter, setStatusFilter] = useState("all");
    const [creatorFilter, setCreatorFilter] = useState<string>("all");

    const formatExpiry = (seconds: number) => {
        if (!seconds && seconds !== 0) return "N/A";
        if (seconds >= 315360000) return "Lifetime";
        if (seconds >= 31536000) return `${Math.floor(seconds / 31536000)} Year(s)`;
        if (seconds >= 2592000) return `${Math.floor(seconds / 2592000)} Month(s)`;
        if (seconds >= 604800) return `${Math.floor(seconds / 604800)} Week(s)`;
        if (seconds >= 86400) return `${Math.floor(seconds / 86400)} Day(s)`;
        if (seconds >= 3600) return `${Math.floor(seconds / 3600)} Hour(s)`;
        if (seconds >= 60) return `${Math.floor(seconds / 60)} Minute(s)`;
        return `${seconds} Second(s)`;
    };

    // Generate Modal State
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [genAmount, setGenAmount] = useState("1");
    const [genMask, setGenMask] = useState("XXXX-XXXX-XXXX-XXXX");
    const [genLowercase, setGenLowercase] = useState(false);
    const [genUppercase, setGenUppercase] = useState(false);
    const [genLevel, setGenLevel] = useState("");
    const [genNote, setGenNote] = useState("");
    const [genExpiryPreset, setGenExpiryPreset] = useState("1 Day");
    const [customExpiryDate, setCustomExpiryDate] = useState("");
    const [autoAppendMask, setAutoAppendMask] = useState(true);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [profile, setProfile] = useState<any>(null);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Context menu
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    useEffect(() => {
        if (appId) { fetchLicenses(); fetchSubscriptions(); fetchProfile(); }
    }, [appId]);

    const fetchProfile = async () => {
        try {
            const data = await devApi.getMe();
            if (data.status === "success") setProfile(data.data.user);
        } catch (error) { console.error("Failed to fetch profile", error); }
    };

    const fetchSubscriptions = async () => {
        try {
            const data = await devApi.getSubscriptions(appId);
            if (data.status === "success") {
                const subs = data.data.subscriptions || [];
                setSubscriptions(subs);
                if (subs.length > 0 && !genLevel) setGenLevel(subs[0].name);
            }
        } catch (error) { console.error("Failed to fetch subscriptions", error); }
    };

    const fetchLicenses = async () => {
        setLoading(true);
        try {
            const data = await devApi.getLicenses(appId);
            if (data.status === "success") setLicenses(data.data.licenses || []);
        } catch (error) {
            console.error("Failed to fetch licenses", error);
            setLicenses([]);
        } finally { setLoading(false); }
    };

    const handleSelectAll = () => {
        if (selectAll) { setSelectedLicenses(new Set()); setSelectAll(false); }
        else { setSelectedLicenses(new Set(filteredLicenses.map(l => l.id))); setSelectAll(true); }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedLicenses);
        if (newSet.has(id)) { newSet.delete(id); setSelectAll(false); }
        else { newSet.add(id); if (newSet.size === filteredLicenses.length) setSelectAll(true); }
        setSelectedLicenses(newSet);
    };

    const handleDelete = async (id: string) => {
        if (!await confirm({ title: "Delete License", description: "Are you sure you want to delete this license?", variant: "destructive" })) return;
        try { await devApi.deleteLicense(id); toast.success("License deleted."); fetchLicenses(); }
        catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete license."); }
    };

    const handleBulkDelete = async () => {
        if (selectedLicenses.size === 0) return toast.error("No licenses selected.");
        if (!await confirm({ title: "Delete Licenses", description: `Are you sure you want to delete ${selectedLicenses.size} licenses?`, variant: "destructive" })) return;
        try {
            await Promise.all(Array.from(selectedLicenses).map(id => devApi.deleteLicense(id)));
            toast.success(`${selectedLicenses.size} licenses deleted.`);
            setSelectedLicenses(new Set()); setSelectAll(false); fetchLicenses();
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete some licenses."); fetchLicenses(); }
    };

    const handleBulkCopy = () => {
        if (selectedLicenses.size === 0) return toast.error("No licenses selected.");
        const keysToCopy = licenses
            .filter(l => selectedLicenses.has(l.id))
            .map(l => l.key)
            .join('\n');
        
        navigator.clipboard.writeText(keysToCopy);
        toast.success(`${selectedLicenses.size} license key(s) copied to clipboard!`);
    };

    const getNormalizedMask = (mask: string) => {
        const trimmed = mask.trim();
        if (autoAppendMask && trimmed && !/X/i.test(trimmed)) {
            return `${trimmed}-XXXX-XXXX-XXXX`;
        }
        return trimmed;
    };

    const getMaskPreview = (mask: string, lowercase: boolean, uppercase: boolean) => {
        if (!mask) return "";
        let preview = "";
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const lowerChars = "abcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < mask.length; i++) {
            const char = mask[i];
            if (char.toUpperCase() === 'X') {
                const pool = lowercase ? lowerChars : (uppercase ? chars.toUpperCase() : chars);
                const idx = (i * 7 + 3) % pool.length;
                preview += pool[idx];
            } else {
                preview += char;
            }
        }
        return preview;
    };

    const handleMaskBlur = () => {
        if (!autoAppendMask) return;
        const normalized = getNormalizedMask(genMask);
        if (normalized !== genMask) {
            setGenMask(normalized);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appId || isGenerating) return;

        const normalizedMask = getNormalizedMask(genMask);
        const checkExists = normalizedMask && licenses.some(l => 
            l.key.toLowerCase() === normalizedMask.toLowerCase() ||
            l.key.toLowerCase() === genMask.trim().toLowerCase()
        );

        if (checkExists) {
            toast.error("This license key/mask already exists!");
            return;
        }

        setIsGenerating(true);

        try {
            const getExpiryAndDuration = (preset: string) => {
                switch (preset) {
                    case '1 Day': return { expiry: 86400, duration: 1 };
                    case '1 Week': return { expiry: 604800, duration: 1 };
                    case '1 Month': return { expiry: 2629743, duration: 1 };
                    case '2 Month': return { expiry: 2629743, duration: 2 };
                    case '3 Month': return { expiry: 2629743, duration: 3 };
                    case '6 Month': return { expiry: 2629743, duration: 6 };
                    case '1 Year': return { expiry: 31556926, duration: 1 };
                    case '1 Lifetime': return { expiry: 315569260, duration: 1 };
                    case 'Custom': {
                        if (!customExpiryDate) {
                            throw new Error("Please select a custom expiry date.");
                        }
                        const selectedTime = new Date(customExpiryDate).getTime();
                        const diffSeconds = Math.floor((selectedTime - Date.now()) / 1000);
                        if (diffSeconds <= 0) {
                            throw new Error("Expiry date must be in the future.");
                        }
                        return { expiry: diffSeconds, duration: 1 };
                    }
                    default: return { expiry: 86400, duration: 1 };
                }
            };

            const { expiry, duration } = getExpiryAndDuration(genExpiryPreset);

            const data = await devApi.generateLicenses(
                appId, 
                parseInt(genAmount), 
                normalizedMask,
                genLowercase,
                genUppercase,
                genLevel,
                genNote,
                expiry,
                duration
            );
            if (data.status === "success") {
                toast.success(`Generated ${genAmount} license(s)!`);
                fetchLicenses();
                fetchProfile(); // Update balance
                setIsGenerateModalOpen(false);
            }
        } catch (error: any) { 
            toast.error(error.response?.data?.message || "Failed to generate licenses."); 
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEditNote = async (id: string, currentNote: string) => {
        const newNote = await prompt({
            title: "Edit Note",
            description: "Enter new note for this license:",
            defaultValue: currentNote || ""
        });
        if (newNote !== null && newNote !== currentNote) {
            try {
                await devApi.updateLicense(id, { note: newNote });
                toast.success("Note updated.");
                fetchLicenses();
            } catch (error: any) { toast.error(error.response?.data?.message || "Failed to update note."); }
        }
    };

    const handleToggleBan = async (lic: any) => {
        const isBanning = lic.status !== 'banned';
        
        if (isBanning) {
            setSelectedBanLicense(lic);
            setBanReasonInput("");
            setBanDurationInput("315576000");
            setIsBanActionModalOpen(true);
            return;
        } else {
            if (!await confirm({ title: "Unban License", description: `Are you sure you want to unban the license ${lic.key}?`, confirmText: "Unban" })) return;
        }

        const newStatus = (lic.used_by ? 'used' : 'unused');
        try {
            await devApi.updateLicense(lic.id, { status: newStatus, ban_reason: null, ban_expires: null });
            toast.success(`License unbanned.`);
            fetchLicenses();
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to unban license."); }
    };

    const handleBanLicenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBanLicense) return;
        try {
            const seconds = parseInt(banDurationInput);
            const ban_expires = new Date(Date.now() + seconds * 1000).toISOString();
            const updateData = { 
                status: 'banned', 
                ban_reason: banReasonInput || undefined,
                ban_expires 
            };
            await devApi.updateLicense(selectedBanLicense.id, updateData);
            toast.success(`License banned successfully.`);
            setIsBanActionModalOpen(false);
            fetchLicenses();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to ban license.");
        }
    };



    const handleExport = () => {
        if (filteredLicenses.length === 0) return toast.error("No licenses to export.");
        const keys = filteredLicenses.map(l => l.key).join('\n');
        const blob = new Blob([keys], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `licenses_${appName}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        toast.success("Licenses exported.");
    };

    // --- Bulk Actions ---
    const handleBulkDeleteUsedLicenses = async () => {
        if (!await confirm({ title: "Delete All Used Licenses", description: "Are you sure you want to delete ALL used licenses for this app? This action cannot be undone.", variant: "destructive" })) return;
        try {
            const res = await devApi.deleteUsedLicenses(appId);
            toast.success(res.message || "Used licenses deleted.");
            fetchLicenses();
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete used licenses"); }
    };

    const handleBulkDeleteUnusedLicenses = async () => {
        if (!await confirm({ title: "Delete All Unused Licenses", description: "Are you sure you want to delete ALL unused licenses for this app? This action cannot be undone.", variant: "destructive" })) return;
        try {
            const res = await devApi.deleteUnusedLicenses(appId);
            toast.success(res.message || "Unused licenses deleted.");
            fetchLicenses();
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete unused licenses"); }
    };

    const handleBulkAddTimeToUnusedLicenses = async () => {
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
            const res = await devApi.addTimeToUnusedLicenses(appId, seconds);
            toast.success(res.message || "Time added to unused licenses.");
            fetchLicenses();
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to add time"); }
    };

    const copyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'used') return <Badge className="bg-muted/15 text-muted-foreground border-border/25 text-[10px] font-semibold uppercase tracking-wider">Used</Badge>;
        if (s === 'banned') return <Badge className="bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400 text-[10px] font-semibold uppercase tracking-wider">Banned</Badge>;
        if (s === 'expired') return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wider">Expired</Badge>;
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">Unused</Badge>;
    };

    const checkNormalizedMask = getNormalizedMask(genMask);
    const isKeyExisting = !!(genMask.trim() && licenses.some(l => 
        l.key.toLowerCase() === checkNormalizedMask.toLowerCase() ||
        l.key.toLowerCase() === genMask.trim().toLowerCase()
    ));

    const filteredLicenses = licenses.filter(l => {
        const keyMatch = l.key.toLowerCase().includes(searchQuery.toLowerCase());
        const usedByMatch = (l.used_by_username || "").toLowerCase().includes(searchQuery.toLowerCase());
        const creatorMatch = (l.created_by_username || l.owner_username || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSearch = keyMatch || usedByMatch || creatorMatch;
        const matchesStatus = statusFilter === "all" || l.status.toLowerCase() === statusFilter;
        
        let passesCreator = true;
        if (creatorFilter !== "all") {
            const creatorName = l.created_by_username || l.owner_username;
            passesCreator = creatorName === creatorFilter;
        }

        return matchesSearch && matchesStatus && passesCreator;
    });

    const uniqueCreators = Array.from(new Set(licenses.map((l: any) => l.created_by_username || l.owner_username).filter(Boolean)));
    const totalPages = Math.ceil(filteredLicenses.length / itemsPerPage) || 1;
    const paginatedLicenses = filteredLicenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const usedCount = licenses.filter(l => l.status.toLowerCase() === 'used').length;
    const unusedCount = licenses.filter(l => l.status.toLowerCase() !== 'used' && l.status.toLowerCase() !== 'banned').length;
    const bannedCount = licenses.filter(l => l.status.toLowerCase() === 'banned').length;

    const getBalanceForPreset = (preset: string) => {
        if (!profile) return 0;
        if (profile.role === 'admin' || profile.is_unlimited_reseller) return 'Unlimited';
        switch (preset) {
            case '1 Day': return profile.balance_day || 0;
            case '1 Week': return profile.balance_week || 0;
            case '1 Month': return profile.balance_month || 0;
            case '2 Month': return profile.balance_month || 0; // uses monthly balance pool
            case '3 Month': return profile.balance_three_month || 0;
            case '6 Month': return profile.balance_six_month || 0;
            case '1 Year': return profile.balance_year || 0;
            case '1 Lifetime': return profile.balance_lifetime || 0;
            default: return 'N/A';
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto h-full flex flex-col">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 shrink-0">
                <nav className="flex mb-3" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1 text-sm text-muted-foreground">
                        <li className="hover:text-foreground transition-colors cursor-pointer">Manage Apps</li>
                        <li><ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/60" /></li>
                        <li className="text-foreground font-medium">{appName}</li>
                        <li><ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/60" /></li>
                        <li className="text-foreground font-medium">Licenses</li>
                    </ol>
                </nav>
            </motion.div>
            {/* Seller Table */}
            <SellerTable
                title="Licenses"
                description="Manage license keys for user registration and authentication."
                data={loading ? [] as License[] : paginatedLicenses}
                searchQuery={searchQuery}
                onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
                searchPlaceholder="Search by key..."
                primaryAction={{
                    label: "Generate Keys",
                    icon: <Plus className="w-4 h-4 mr-2" />,
                    onClick: () => setIsGenerateModalOpen(true),
                    disabled: isPaused
                }}
                actions={
                    <>
                            <SelectAnimated 
                                value={statusFilter} 
                                onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }} 
                                options={[
                                    { value: "all", label: "All Status" },
                                    { value: "unused", label: "Unused" },
                                    { value: "used", label: "Used" },
                                    { value: "banned", label: "Banned" }
                                ]}
                                className="w-full sm:w-36 shrink-0"
                            />
                        {uniqueCreators.length > 0 && (
                            <SelectAnimated 
                                value={creatorFilter} 
                                onChange={(val) => { setCreatorFilter(val); setCurrentPage(1); }}
                                options={[
                                    { value: "all", label: "All Creators" },
                                    ...uniqueCreators.map((creator: any) => ({ value: creator, label: creator }))
                                ]}
                                className="w-full sm:w-36 shrink-0"
                            />
                        )}
                        {/* Desktop: Export Button */}
                        <Button variant="outline" onClick={handleExport} className="hidden sm:flex bg-muted/50 border-border/50 text-foreground/80 hover:bg-muted hover:text-foreground h-10 px-4 text-sm rounded-xl shrink-0 snap-start">
                            <Download className="w-4 h-4 mr-2" /> Export
                        </Button>

                        {/* Actions Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto bg-muted/50 border-border/50 text-foreground/80 hover:bg-muted hover:text-foreground dark:bg-neutral-800/50 dark:border-neutral-700/50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 h-10 px-4 text-sm rounded-xl shrink-0">
                                    <MoreHorizontal className="w-4 h-4 mr-2" /> Actions
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300">
                                {/* Mobile Only Items */}
                                <div className="sm:hidden">
                                    <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
                                        <Download className="w-4 h-4 mr-2" /> Export All
                                    </DropdownMenuItem>
                                    {selectedLicenses.size > 0 && (
                                        <>
                                            <DropdownMenuItem onClick={handleBulkCopy} className="cursor-pointer text-primary focus:text-primary dark:text-primary dark:focus:text-primary">
                                                <Copy className="w-4 h-4 mr-2" /> Copy Selected ({selectedLicenses.size})
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleBulkDelete} className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400">
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selectedLicenses.size})
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    <DropdownMenuSeparator className="bg-border dark:bg-neutral-800" />
                                </div>

                                <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border dark:bg-neutral-800" />
                                <DropdownMenuItem onClick={handleBulkAddTimeToUnusedLicenses} className="cursor-pointer hover:bg-muted focus:bg-muted dark:hover:bg-neutral-800 dark:focus:bg-neutral-800">
                                    Add Time to Unused
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border dark:bg-neutral-800" />
                                <DropdownMenuItem onClick={handleBulkDeleteUsedLicenses} className="cursor-pointer text-red-600 focus:bg-red-500/10 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400">
                                    Delete All Used
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleBulkDeleteUnusedLicenses} className="cursor-pointer text-red-600 focus:bg-red-500/10 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400">
                                    Delete All Unused
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Desktop: Selected Actions */}
                        <AnimatePresence>
                            {selectedLicenses.size > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "auto" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="hidden sm:block overflow-hidden shrink-0"
                                >
                                    <div className="flex items-center gap-2 w-max pr-1">
                                        <Button variant="outline" onClick={handleBulkCopy} className="bg-primary/10 border-primary/25 text-primary hover:bg-primary/20 hover:text-primary dark:text-primary dark:hover:text-primary h-10 px-4 text-sm rounded-xl shrink-0 whitespace-nowrap">
                                            <Copy className="w-4 h-4 mr-2" /> Copy ({selectedLicenses.size})
                                        </Button>
                                        <Button variant="outline" onClick={handleBulkDelete} className="bg-red-500/10 border-red-500/25 text-red-600 hover:bg-red-500/20 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 h-10 px-4 text-sm rounded-xl shrink-0 whitespace-nowrap">
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete ({selectedLicenses.size})
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                }
                columns={
                    <>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 w-10 font-semibold"><CheckboxAnimated checked={selectAll} onCheckedChange={handleSelectAll} /></th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">LICENSE KEY</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">STATUS</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">CREATED</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">EXPIRES</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">GENERATED BY</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">USED BY</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">NOTE</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">USED ON</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap w-12">ACTIONS</th>
                    </>
                }
                renderRow={(lic, idx) => (
                    <SellerTableRow key={lic.id} index={idx} className={selectedLicenses.has(lic.id) ? 'bg-primary/5' : ''}>
                        <td className="px-2 sm:px-4 py-2 sm:py-3" onClick={(e) => e.stopPropagation()}>
                            <CheckboxAnimated checked={selectedLicenses.has(lic.id)} onCheckedChange={() => toggleSelect(lic.id)} />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <code className="text-[11px] sm:text-[13px] font-mono text-foreground/80 tracking-wide">{lic.key}</code>
                                <button onClick={(e) => { e.stopPropagation(); copyKey(lic.key); }} className="text-muted-foreground/60 hover:text-foreground transition-colors p-1 rounded hover:bg-muted" title="Copy key">
                                    {copiedKey === lic.key ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">{getStatusBadge(lic.status)}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">{new Date(lic.created_at).toLocaleString()}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">{formatExpiry(lic.expiry_duration)}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">{lic.created_by_username || lic.owner_username || 'Admin'}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">{lic.used_by_username || 'N/A'}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-muted-foreground/70 text-[10px] sm:text-xs truncate max-w-[80px] sm:max-w-[120px]">{lic.note || 'N/A'}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">{lic.used_at ? new Date(lic.used_at).toLocaleString() : 'Not used'}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 relative" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="text-muted-foreground/60 hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted outline-none">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36 bg-popover border-border text-popover-foreground dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300 shadow-2xl">
                                    <DropdownMenuItem onClick={() => handleEditNote(lic.id, lic.note)} className="cursor-pointer text-xs flex items-center gap-2 hover:bg-muted focus:bg-muted dark:hover:bg-neutral-800 dark:focus:bg-neutral-800">
                                        Edit Note
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleBan(lic)} className="cursor-pointer text-xs flex items-center gap-2 text-amber-600 dark:text-amber-400 focus:bg-amber-500/10 focus:text-amber-600 dark:focus:text-amber-400">
                                        {lic.status === 'banned' ? 'Unban' : 'Ban'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(lic.id)} className="cursor-pointer text-xs flex items-center gap-2 text-red-600 dark:text-red-400 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-400">
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </td>
                    </SellerTableRow>
                )}
                footer={
                    !loading && filteredLicenses.length > 0 && (
                        <div className="flex items-center justify-between w-full">
                            <p className="text-xs text-muted-foreground/70">
                                Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredLicenses.length)} of {filteredLicenses.length}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground h-8 w-8 p-0 rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></Button>
                                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                    const page = i + 1;
                                    return <Button key={page} variant="outline" size="sm" onClick={() => setCurrentPage(page)} className={`h-8 w-8 p-0 rounded-lg text-xs font-medium ${currentPage === page ? 'bg-primary border-primary text-white hover:bg-primary hover:text-white' : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{page}</Button>;
                                })}
                                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground h-8 w-8 p-0 rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    )
                }
            />

            {/* Generate Modal */}
            <AnimatePresence>
                {isGenerateModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => !isGenerating && setIsGenerateModalOpen(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl shadow-black/40 p-6 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"><Key className="w-5 h-5 text-primary dark:text-primary" /></div>
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">Generate Licenses</h2>
                                    <p className="text-xs text-muted-foreground/70">Create new license keys for your application.</p>
                                </div>
                            </div>
                            <form onSubmit={handleGenerate} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">License Amount <span className="text-red-500">*</span></label>
                                    <Input type="number" min="1" max="100" value={genAmount} onChange={(e) => setGenAmount(e.target.value)} className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" required />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-muted-foreground font-medium">License Mask <span className="text-red-500">*</span></label>
                                        <label className="flex items-center space-x-1.5 cursor-pointer">
                                            <CheckboxAnimated id="autoAppend" checked={autoAppendMask} onCheckedChange={(val) => setAutoAppendMask(val === true)} />
                                            <span className="text-[10px] text-muted-foreground select-none">Auto-append placeholders</span>
                                        </label>
                                    </div>
                                    <Input 
                                        type="text" 
                                        maxLength={49} 
                                        placeholder="*****-*****-*****" 
                                        value={genMask} 
                                        onChange={(e) => setGenMask(e.target.value)} 
                                        onBlur={handleMaskBlur}
                                        className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg font-mono" 
                                        required 
                                    />
                                    {genMask && (
                                        <div className="mt-1.5 space-y-1">
                                            <p className="text-[11px] text-muted-foreground">
                                                <span className="font-semibold">Format Preview:</span> <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary text-[10px]">{getMaskPreview(checkNormalizedMask, genLowercase, genUppercase)}</code>
                                            </p>
                                            {isKeyExisting && (
                                                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                                    The same key already exists!
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <CheckboxAnimated checked={genLowercase} onCheckedChange={(val) => setGenLowercase(val === true)} />
                                        <span className="text-xs text-muted-foreground">Lowercase Letters</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <span className="text-xs text-muted-foreground">Uppercase Letters</span>
                                        <CheckboxAnimated checked={genUppercase} onCheckedChange={(val) => setGenUppercase(val === true)} />
                                    </label>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Subscription <span className="text-red-500">*</span></label>
                                    <SelectAnimated 
                                        value={genLevel} 
                                        onChange={(val) => setGenLevel(val)} 
                                        options={subscriptions.length > 0 ? subscriptions.map(sub => ({ value: sub.name, label: `${sub.name} (Level ${sub.level})` })) : [{ value: "Default", label: "Default Subscription" }]}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">License Note</label>
                                    <Input type="text" maxLength={69} placeholder="Note" value={genNote} onChange={(e) => setGenNote(e.target.value)} className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" />
                                </div>
                                <div className={profile?.role === 'admin' || profile?.is_unlimited_reseller ? "grid grid-cols-1" : "grid grid-cols-2 gap-4"}>
                                    <div className="relative">
                                        <label className="text-xs text-muted-foreground font-medium mb-1.5 block" htmlFor="expiry">License Expiry <span className="text-red-500">*</span></label>
                                        <div className="flex items-center">
                                            <select id="expiry" name="expiry" value={genExpiryPreset} onChange={(e) => setGenExpiryPreset(e.target.value)} className="bg-background border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 h-[42px] focus:outline-none">
                                                <option value="1 Day">1 Day</option>
                                                <option value="1 Week">1 Week</option>
                                                <option value="1 Month">1 Month</option>
                                                <option value="2 Month">2 Months</option>
                                                <option value="3 Month">3 Months</option>
                                                <option value="6 Month">6 Months</option>
                                                <option value="1 Year">1 Year</option>
                                                <option value="1 Lifetime">Lifetime</option>
                                                <option value="Custom">Custom Date</option>
                                            </select>
                                        </div>
                                    </div>
                                    {profile?.role !== 'admin' && !profile?.is_unlimited_reseller && (
                                        <div className="relative">
                                            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Current Balance</label>
                                            <div className="px-3 py-2 w-full text-sm text-foreground bg-background rounded-lg border border-border h-[42px] flex items-center">
                                                <p className="font-semibold text-primary dark:text-primary">{getBalanceForPreset(genExpiryPreset)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {genExpiryPreset === "Custom" && (
                                    <div className="space-y-1.5 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <label className="text-xs text-muted-foreground font-medium">Select Expiry Date & Time <span className="text-red-500">*</span></label>
                                        <Input 
                                            type="datetime-local" 
                                            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} 
                                            value={customExpiryDate} 
                                            onChange={(e) => setCustomExpiryDate(e.target.value)} 
                                            className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg h-[42px] w-full" 
                                            required 
                                        />
                                    </div>
                                )}
                                <div className="flex justify-end gap-3 pt-3 border-t border-border relative z-10">
                                    <Button type="button" variant="ghost" disabled={isGenerating} onClick={() => setIsGenerateModalOpen(false)} className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg">Cancel</Button>
                                    <Button type="submit" disabled={isGenerating || isKeyExisting} className="bg-primary hover:bg-primary text-white font-medium rounded-lg shadow-lg shadow-primary/20 active:scale-95 transition-all">
                                        {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate"}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        {/* Ban License Modal */}
        <AnimatePresence>
            {isBanActionModalOpen && selectedBanLicense && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setIsBanActionModalOpen(false)}>
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card dark:bg-muted/40 border border-border rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                            <div><h2 className="text-lg font-bold text-foreground">Ban License</h2><p className="text-xs text-muted-foreground/70">Ban {selectedBanLicense.key} from accessing the application.</p></div>
                        </div>
                        <form onSubmit={handleBanLicenseSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground font-medium">Ban Reason</label>
                                <Input value={banReasonInput} onChange={(e) => setBanReasonInput(e.target.value)} maxLength={69} placeholder="e.g. Terms of Service Violation" className="bg-background border-border text-foreground focus-visible:ring-red-600/50 rounded-lg" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground font-medium">Ban Duration <span className="text-red-500">*</span></label>
                                <SelectAnimated value={banDurationInput} onChange={(val) => setBanDurationInput(val)} options={[
                                    { value: "315576000", label: "Indefinite (Permanent)" },
                                    { value: "300", label: "5 Minutes" },
                                    { value: "900", label: "15 Minutes" },
                                    { value: "1800", label: "30 Minutes" },
                                    { value: "3600", label: "1 Hour" },
                                    { value: "7200", label: "2 Hours" },
                                    { value: "21600", label: "6 Hours" },
                                    { value: "43200", label: "12 Hours" },
                                    { value: "86400", label: "1 Day" },
                                    { value: "259200", label: "3 Days" },
                                    { value: "604800", label: "1 Week" },
                                    { value: "1209600", label: "2 Weeks" },
                                    { value: "2629743", label: "1 Month" },
                                    { value: "7889229", label: "3 Months" },
                                    { value: "15778458", label: "6 Months" },
                                    { value: "31556926", label: "1 Year" },
                                ]} />
                            </div>
                            <div className="flex justify-end gap-3 pt-3 border-t border-border">
                                <Button type="button" variant="ghost" onClick={() => setIsBanActionModalOpen(false)} className="text-muted-foreground">Cancel</Button>
                                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">Ban License</Button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        </div>
    );
}
