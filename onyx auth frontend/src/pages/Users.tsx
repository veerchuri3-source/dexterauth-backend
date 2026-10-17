import React, { useState, useEffect } from "react";
import { devApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { 
  ChevronRight, Search, UserPlus, Download, Trash2, Shield, Ban,
  Filter, AlertTriangle, Grid, List, Upload, Clock, History, RotateCcw,
  AlertCircle, X, Loader2
} from "lucide-react";
import { SelectAnimated } from "../components/ui/select-animated";
import { CheckboxAnimated } from "../components/ui/checkbox-animated";
import { useDialog } from "../hooks/use-dialog";
import { IntelligentUserCard } from "../components/ui/IntelligentUserCard";
import { UserDetailsModal } from "../components/ui/UserDetailsModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export interface User { 
  id: string; 
  username: string; 
  email: string; 
  status: string; 
  hwid: string; 
  hwid_affected?: boolean;
  additional_hwid?: string;
  subscription_level: string; 
  created_at: string; 
  expiration_date: string; 
  is_banned?: boolean; 
  created_by_username?: string;
  is_2fa_enabled?: boolean;
  last_login_at?: string;
  last_ip?: string;
  ban_reason?: string;
  ban_expires?: string;
}

interface UsersProps { appId: string; appName: string; isPaused?: boolean; profile?: any; }

export default function UsersView({ appId, appName, isPaused, profile }: UsersProps) {
    const isStandardReseller = profile?.role?.toLowerCase() === 'reseller' && !profile?.is_unlimited_reseller;
    const { confirm } = useDialog();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    // View & Filter States
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [aiFilters, setAIFilters] = useState({ suspicious: false, expiringSoon: false, no2fa: false, multipleDevices: false });
    const [creatorFilter, setCreatorFilter] = useState<string>("all");

    // Selection State
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
    const [isSubtractModalOpen, setIsSubtractModalOpen] = useState(false);
    const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
    const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
    const [selectedBanUser, setSelectedBanUser] = useState<User | null>(null);
    const [isBanActionModalOpen, setIsBanActionModalOpen] = useState(false);
    const [isBanInfoModalOpen, setIsBanInfoModalOpen] = useState(false);
    const [banReasonInput, setBanReasonInput] = useState("");
    const [banDurationInput, setBanDurationInput] = useState("315576000");

    // Form States
    const [newUsername, setNewUsername] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newExpiry, setNewExpiry] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        const tzoffset = d.getTimezoneOffset() * 60000;
        return (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    });
    const [newAdditionalHwid, setNewAdditionalHwid] = useState("");
    
    const getCurrentDateTimeLocal = () => {
        const tzoffset = new Date().getTimezoneOffset() * 60000;
        return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    };
    const [newHwidLock, setNewHwidLock] = useState(true);
    const [availableSubscriptions, setAvailableSubscriptions] = useState<any[]>([]);
    const [newSub, setNewSub] = useState("");
    const [timeAmount, setTimeAmount] = useState<number>(1);
    const [timeUnit, setTimeUnit] = useState<string>("days");
    const [importData, setImportData] = useState("");
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => { if (appId) { fetchUsers(); fetchSubscriptions(); } }, [appId]);

    const fetchSubscriptions = async () => {
        try { 
            const d = await devApi.getSubscriptions(appId); 
            if (d.status === "success") {
                const subs = d.data.subscriptions || [];
                setAvailableSubscriptions(subs); 
                if (subs.length > 0 && !newSub) setNewSub(subs[0].name);
            }
        } catch {}
    };

    const fetchUsers = async () => {
        setLoading(true);
        try { 
            const d = await devApi.getUsers(appId); 
            if (d.status === "success") setUsers(d.data.users || []); 
        } catch { setUsers([]); } 
        finally { setLoading(false); }
    };

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length && filteredUsers.length > 0) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const toggleSelectUser = (id: string) => {
        const newSet = new Set(selectedUsers);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedUsers(newSet);
    };

    // Actions
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUsername) return toast.error("Username is required.");
        
        const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{1,30}$/;
        if (newEmail && !EMAIL_REGEX.test(newEmail)) {
            toast.error("Please enter a valid email address.");
            return;
        }
        if (!USERNAME_REGEX.test(newUsername)) {
            toast.error("Username must be 1-30 characters and contain only letters, numbers, underscores, dots, or hyphens.");
            return;
        }

        // Convert the local datetime selected by the user into an absolute UTC timestamp
        const utcExpiry = newExpiry ? new Date(newExpiry).toISOString() : undefined;
        
        try {
            await devApi.createUser(appId, { username: newUsername, email: newEmail, password: newPassword, sub: newSub, expiry: utcExpiry, hwidAffected: newHwidLock });
            toast.success("User created!"); setIsAddModalOpen(false); setNewUsername(""); setNewEmail(""); setNewPassword(""); setNewHwidLock(true); fetchUsers();
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to create user."); }
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserForEdit) return;

        const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{1,30}$/;
        if (newEmail && !EMAIL_REGEX.test(newEmail)) {
            toast.error("Please enter a valid email address.");
            return;
        }
        if (newUsername && !USERNAME_REGEX.test(newUsername)) {
            toast.error("Username must be 1-30 characters and contain only letters, numbers, underscores, dots, or hyphens.");
            return;
        }
        
        // Convert the local datetime selected by the user into an absolute UTC timestamp
        const utcExpiry = newExpiry ? new Date(newExpiry).toISOString() : undefined;
        
        try {
            await devApi.updateUser(selectedUserForEdit.id, { 
                username: newUsername || undefined, 
                email: newEmail || undefined, 
                subscription_level: newSub || undefined, 
                expiration_date: utcExpiry,
                password: newPassword || undefined,
                additional_hwid: newAdditionalHwid || undefined,
                hwid_affected: newHwidLock
            });
            toast.success("User updated!"); 
            setIsEditModalOpen(false); 
            fetchUsers();
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to update user."); }
    };

    const handleDeleteUser = async (id: string, e?: React.MouseEvent) => { 
        if (e) e.stopPropagation();
        if (!await confirm({ title: "Delete User", description: "Are you sure you want to delete this user?", variant: "destructive" })) return; 
        try { 
            await devApi.deleteUser(id); 
            toast.success("User deleted."); 
            if (selectedUserForDetails?.id === id) setSelectedUserForDetails(null);
            fetchUsers(); 
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete user."); } 
    };

    const handleResetHwid = async (id: string, e?: React.MouseEvent) => { 
        if (e) e.stopPropagation();
        try { 
            await devApi.resetUserHwid(id); 
            toast.success("HWID reset successful."); 
            fetchUsers(); 
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to reset HWID."); } 
    };

    const handleToggleStatus = async (user: User, status: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        if (status === 'banned') {
            setSelectedBanUser(user);
            setBanReasonInput("");
            setBanDurationInput("315576000");
            setIsBanActionModalOpen(true);
            return;
        }

        if (!await confirm({ title: "Change Status", description: `Are you sure you want to change status to ${status}?` })) return;
        try {
            let updateData: any = { status };
            // Clear ban fields if they are unbanned
            if (status === 'active') {
                updateData.ban_reason = null;
                updateData.ban_expires = null;
            }
            await devApi.updateUser(user.id, updateData);
            toast.success(`User status updated to ${status}.`);
            fetchUsers();
        } catch (error: any) { toast.error(error.response?.data?.message || `Failed to update status.`); }
    };

    const handleBanUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBanUser) return;
        try {
            const seconds = parseInt(banDurationInput);
            const ban_expires = new Date(Date.now() + seconds * 1000).toISOString();
            const updateData = { 
                status: 'banned', 
                ban_reason: banReasonInput || undefined,
                ban_expires 
            };
            await devApi.updateUser(selectedBanUser.id, updateData);
            toast.success(`User banned successfully.`);
            setIsBanActionModalOpen(false);
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to ban user.");
        }
    };

    // Bulk Actions
    const handleBulkDelete = async () => {
        if (selectedUsers.size === 0) return toast.error("No users selected.");
        if (!await confirm({ title: "Delete Selected Users", description: `Are you sure you want to delete ${selectedUsers.size} users?`, variant: "destructive" })) return;
        try {
            await Promise.all(Array.from(selectedUsers).map(id => devApi.deleteUser(id)));
            toast.success(`${selectedUsers.size} users deleted.`);
            setSelectedUsers(new Set());
            fetchUsers();
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete some users."); fetchUsers(); }
    };

    const handleGlobalResetHwids = async () => {
        if (!await confirm({ title: "Reset All HWIDs", description: "Are you sure you want to reset HWIDs for ALL users? This will require everyone to re-bind.", variant: "destructive" })) return;
        try {
            const res = await devApi.resetAllUserHwids(appId);
            toast.success(res.message || "All HWIDs reset.");
            fetchUsers();
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to reset HWIDs."); }
    };

    const handleBulkTimeUpdate = async (isAdd: boolean) => {
        if (selectedUsers.size === 0) return toast.error("No users selected.");
        let seconds = timeAmount;
        if (timeUnit === 'days') seconds *= 86400;
        if (timeUnit === 'weeks') seconds *= 604800;
        if (timeUnit === 'months') seconds *= 2592000;
        if (timeUnit === 'years') seconds *= 31536000;

        try {
            const userIds = Array.from(selectedUsers);
            const res = isAdd 
                ? await devApi.bulkAddUserTime(appId, userIds, seconds)
                : await devApi.bulkSubtractUserTime(appId, userIds, seconds);
            toast.success(res.message || `Time updated for ${userIds.length} users.`);
            setIsExtendModalOpen(false);
            setIsSubtractModalOpen(false);
            fetchUsers();
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed to update time."); }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const parsed = JSON.parse(content);
                setImportData(JSON.stringify(parsed, null, 2));
                toast.success("File loaded successfully.");
            } catch (error) {
                toast.error("Invalid JSON file.");
            }
        };
        reader.readAsText(file);
    };

    const handleImportUsers = async () => {
        try {
            setIsImporting(true);
            const parsed = JSON.parse(importData);
            if (typeof parsed !== 'object') throw new Error("Import data must be a JSON object or array.");
            const res = await devApi.importUsers(appId, parsed);
            toast.success(res.message || "Users imported successfully.");
            setIsImportModalOpen(false);
            setImportData("");
            fetchUsers();
        } catch (e: any) {
            toast.error(e.message || e.response?.data?.message || "Invalid JSON or import failed.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleExport = () => {
        if (filteredUsers.length === 0) return toast.error("No users to export.");
        const dataStr = JSON.stringify(filteredUsers, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `users_${appName}_export.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        toast.success("Users exported as JSON.");
    };

    // Filter logic
    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.username || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (u.hwid || "").toLowerCase().includes(searchQuery.toLowerCase());
        
        let passesAIFilter = true;
        if (aiFilters.suspicious || aiFilters.expiringSoon || aiFilters.no2fa || aiFilters.multipleDevices) {
            let passedThisUser = false;
            if (aiFilters.suspicious && u.status === 'banned') passedThisUser = true; // Simplified for real data
            if (aiFilters.no2fa && !u.is_2fa_enabled) passedThisUser = true;
            if (aiFilters.expiringSoon) {
                const days = Math.ceil((new Date(u.expiration_date).getTime() - Date.now()) / (1000 * 3600 * 24));
                if (days <= 3 && days > 0) passedThisUser = true;
            }
            if (aiFilters.multipleDevices && u.hwid) passedThisUser = true; // Fallback mock meaning
            passesAIFilter = passedThisUser;
        }

        let passesCreator = true;
        if (creatorFilter !== "all") {
            passesCreator = u.created_by_username === creatorFilter || (creatorFilter === "admin" && !u.created_by_username);
        }

        return matchesSearch && passesAIFilter && passesCreator;
    });

    const uniqueCreators = Array.from(new Set(users.map((u: any) => u.created_by_username).filter(Boolean)));

    return (
        <div className="max-w-[1600px] mx-auto h-full flex flex-col px-2 sm:px-0 relative">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 shrink-0">
                <nav className="flex mb-3" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1 text-sm text-muted-foreground">
                        <li className="hover:text-foreground transition-colors cursor-pointer">Manage Apps</li>
                        <li><ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/60" /></li>
                        <li className="text-foreground font-medium">{appName}</li>
                        <li><ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/60" /></li>
                        <li className="text-foreground font-medium">User Management</li>
                    </ol>
                </nav>
            </motion.div>

            {/* Global User Management Toolbar */}
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 mb-6 shrink-0 bg-muted/60 backdrop-blur-md border border-border p-3 rounded-2xl">
                
                {/* Top Row: Search & View Toggles */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 w-full flex-1">
                        <div className="relative w-full">
                            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/70" />
                            <Input 
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search users..." 
                                className="pl-8 sm:pl-9 bg-background border-border text-foreground h-8 sm:h-10 text-xs sm:text-sm rounded-lg sm:rounded-xl w-full"
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`h-8 w-8 sm:h-10 sm:w-auto px-0 sm:px-3 rounded-lg sm:rounded-xl border shrink-0 flex items-center justify-center ${showFilters ? 'bg-primary/10 border-primary/30 text-primary dark:text-primary' : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'}`}
                        >
                            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" /> <span className="hidden sm:inline">Filters</span>
                        </Button>
                        <div className="flex items-center gap-1 bg-muted/40 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-border shrink-0 h-8 sm:h-10">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            >
                                <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button 
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-colors ${viewMode === 'table' ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            >
                                <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                        </div>
                    </div>

                    {uniqueCreators.length > 0 && (
                        <select 
                            value={creatorFilter} 
                            onChange={(e) => setCreatorFilter(e.target.value)}
                            className="h-8 sm:h-10 px-2 sm:px-3 bg-background border border-border text-foreground/80 rounded-lg sm:rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-auto shrink-0"
                        >
                            <option value="all">All Creators</option>
                            <option value="admin">You (Admin)</option>
                            {uniqueCreators.map((creator: any) => (
                                <option key={creator} value={creator}>{creator}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Optional Filters Row */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border mt-1">
                                <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mr-2">Quick Filters:</span>
                                <FilterButton label="Suspicious" active={aiFilters.suspicious} onClick={() => setAIFilters(f => ({ ...f, suspicious: !f.suspicious }))} colorClass="amber" />
                                <FilterButton label="Expiring Soon" active={aiFilters.expiringSoon} onClick={() => setAIFilters(f => ({ ...f, expiringSoon: !f.expiringSoon }))} colorClass="blue" />
                                <FilterButton label="No 2FA" active={aiFilters.no2fa} onClick={() => setAIFilters(f => ({ ...f, no2fa: !f.no2fa }))} colorClass="red" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Row: Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                    {/* Desktop Actions */}
                    <div className="hidden sm:flex items-center gap-4 flex-wrap w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            {!isStandardReseller && (
                                <>
                                    <Button onClick={() => {
                                        setNewUsername("");
                                        setNewEmail("");
                                        setNewPassword("");
                                        const d = new Date();
                                        d.setMonth(d.getMonth() + 1);
                                        const tzoffset = d.getTimezoneOffset() * 60000;
                                        setNewExpiry((new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16));
                                        setNewAdditionalHwid("");
                                        setNewHwidLock(true);
                                        setIsAddModalOpen(true);
                                    }} className="bg-primary hover:bg-primary text-white h-9 px-3 rounded-lg text-sm shadow-sm">
                                        <UserPlus className="w-4 h-4 mr-1.5" /> Create
                                    </Button>
                                    <Button onClick={() => setIsImportModalOpen(true)} variant="outline" className="h-9 px-3 rounded-lg text-sm bg-muted/40 border-border text-foreground/80 hover:text-foreground hover:bg-muted">
                                        <Upload className="w-4 h-4 mr-1.5" /> Import
                                    </Button>
                                </>
                            )}
                            <Button onClick={handleExport} variant="outline" className="h-9 px-3 rounded-lg text-sm bg-muted/40 border-border text-foreground/80 hover:text-foreground hover:bg-muted">
                                <Download className="w-4 h-4 mr-1.5" /> Export
                            </Button>
                        </div>

                        <div className={`flex items-center gap-2 transition-opacity duration-300 ${selectedUsers.size > 0 ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <div className="h-6 w-px bg-muted mx-1"></div>
                            <Button onClick={() => setIsExtendModalOpen(true)} variant="outline" className="h-9 px-3 rounded-lg text-sm bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
                                <Clock className="w-4 h-4 mr-1.5" /> Extend
                            </Button>
                            <Button onClick={() => setIsSubtractModalOpen(true)} variant="outline" className="h-9 px-3 rounded-lg text-sm bg-amber-500/10 border-amber-500/20 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300">
                                <History className="w-4 h-4 mr-1.5" /> Subtract
                            </Button>
                            <Button onClick={handleBulkDelete} variant="outline" className="h-9 px-3 rounded-lg text-sm bg-red-500/10 border-red-500/20 text-red-600 hover:bg-red-500/20 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                <Trash2 className="w-4 h-4 mr-1.5" /> Delete ({selectedUsers.size})
                            </Button>
                        </div>
                    </div>

                    {/* Desktop Security Actions */}
                    <div className="hidden sm:block">
                        <Button onClick={handleGlobalResetHwids} variant="outline" className="h-9 px-3 rounded-lg text-sm bg-muted/40 border-border text-foreground/80 hover:text-foreground hover:bg-muted">
                            <RotateCcw className="w-4 h-4 mr-1.5 text-primary dark:text-primary" /> Reset All HWIDs
                        </Button>
                    </div>

                    {/* Mobile Actions Dropdown */}
                    <div className="sm:hidden w-full">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full bg-muted/40 border-border text-foreground/80 hover:text-foreground hover:bg-muted h-10 rounded-xl justify-center">
                                    <MoreHorizontal className="w-4 h-4 mr-2" /> Actions
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 bg-popover border-border text-popover-foreground dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300 max-h-[70vh] overflow-y-auto">
                                {!isStandardReseller && (
                                    <>
                                        <DropdownMenuItem onClick={() => {
                                            setNewUsername(""); setNewEmail(""); setNewPassword("");
                                            const d = new Date(); d.setMonth(d.getMonth() + 1);
                                            const tzoffset = d.getTimezoneOffset() * 60000;
                                            setNewExpiry((new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16));
                                            setNewAdditionalHwid(""); setNewHwidLock(true); setIsAddModalOpen(true);
                                        }} className="cursor-pointer text-primary dark:text-primary focus:text-primary focus:bg-primary/10">
                                            <UserPlus className="w-4 h-4 mr-2" /> Create User
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer">
                                            <Upload className="w-4 h-4 mr-2" /> Import Users
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
                                    <Download className="w-4 h-4 mr-2" /> Export Users
                                </DropdownMenuItem>

                                {selectedUsers.size > 0 && (
                                    <>
                                        <DropdownMenuSeparator className="bg-border dark:bg-neutral-800" />
                                        <DropdownMenuLabel>Selected ({selectedUsers.size})</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setIsExtendModalOpen(true)} className="cursor-pointer text-emerald-600 focus:text-emerald-600 focus:bg-emerald-500/10 dark:text-emerald-400">
                                            <Clock className="w-4 h-4 mr-2" /> Extend Expiry
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsSubtractModalOpen(true)} className="cursor-pointer text-amber-600 focus:text-amber-600 focus:bg-amber-500/10 dark:text-amber-400">
                                            <History className="w-4 h-4 mr-2" /> Subtract Expiry
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleBulkDelete} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-500/10 dark:text-red-400">
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                                        </DropdownMenuItem>
                                    </>
                                )}

                                <DropdownMenuSeparator className="bg-border dark:bg-neutral-800" />
                                <DropdownMenuItem onClick={handleGlobalResetHwids} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-500/10 dark:text-red-400">
                                    <RotateCcw className="w-4 h-4 mr-2" /> Reset All HWIDs
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </motion.div>

            {/* List Header (Selection) */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center p-1 cursor-pointer" onClick={toggleSelectAll}>
                        <CheckboxAnimated checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0} onCheckedChange={toggleSelectAll} />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                        {selectedUsers.size > 0 ? `${selectedUsers.size} selected` : 'Select All'}
                    </span>
                </div>
                <span className="text-xs text-muted-foreground/70">{filteredUsers.length} Users</span>
            </div>

            {/* Main Area */}
            <div className="flex-1 overflow-y-auto chat-scrollbar pb-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/70 bg-muted/40/50 rounded-2xl border border-border border-dashed">
                        <Search className="w-10 h-10 mb-3 text-muted-foreground/60 opacity-50" />
                        <p className="font-medium text-muted-foreground">No users found.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-1 lg:px-2">
                        <AnimatePresence>
                            {filteredUsers.map((user) => (
                                <IntelligentUserCard 
                                    key={user.id} 
                                    user={user} 
                                    isSelected={selectedUsers.has(user.id)}
                                    onToggleSelect={() => toggleSelectUser(user.id)}
                                    onClick={() => setSelectedUserForDetails(user)}
                                    onEdit={(e) => { 
                                        e.stopPropagation(); 
                                        setSelectedUserForEdit(user);
                                        setNewUsername(user.username);
                                        setNewEmail(user.email || "");
                                        setNewSub(user.subscription_level);
                                        const d = new Date(user.expiration_date);
                                        const tzoffset = d.getTimezoneOffset() * 60000;
                                        setNewExpiry(new Date(d.getTime() - tzoffset).toISOString().slice(0, 16));
                                        setNewPassword("");
                                        setNewAdditionalHwid(user.additional_hwid || "");
                                        setNewHwidLock(user.hwid_affected !== false);
                                        setIsEditModalOpen(true);
                                    }}
                                    onToggleStatus={(s) => handleToggleStatus(user, s)}
                                    onResetHwid={(e) => handleResetHwid(user.id, e)}
                                    onDelete={(e) => handleDeleteUser(user.id, e)}
                                    onViewBanReason={() => {
                                        setSelectedBanUser(user);
                                        setIsBanInfoModalOpen(true);
                                    }}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    // Simple Table View for dense data
                    <div className="bg-muted/40 border border-border rounded-xl overflow-x-auto">
                        <table className="w-full text-left text-sm text-foreground/80 whitespace-nowrap min-w-max">
                            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 w-10"></th>
                                    <th className="px-4 py-3 font-medium">Username</th>
                                    <th className="px-4 py-3 font-medium">Email</th>
                                    <th className="px-4 py-3 font-medium">Plan</th>
                                    <th className="px-4 py-3 font-medium">Creator</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">HWID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border dark:divide-[#1E293B]">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-muted/30 cursor-pointer ${selectedUsers.has(user.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`} onClick={() => setSelectedUserForDetails(user)}>
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            <CheckboxAnimated checked={selectedUsers.has(user.id)} onCheckedChange={() => toggleSelectUser(user.id)} />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-foreground">{user.username}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{user.email || '-'}</td>
                                        <td className="px-4 py-3 text-primary dark:text-primary">{user.subscription_level || 'Default'}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{user.created_by_username || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground/70">{user.hwid ? 'Bound' : 'Free'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            <UserDetailsModal user={selectedUserForDetails} onClose={() => setSelectedUserForDetails(null)} />

            {/* Extend / Subtract Time Modal */}
            <AnimatePresence>
                {(isExtendModalOpen || isSubtractModalOpen) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm bg-card dark:bg-muted/40 border border-border rounded-2xl shadow-2xl p-6">
                            <h2 className="text-lg font-bold text-foreground mb-2">{isExtendModalOpen ? 'Extend' : 'Subtract'} Expiration Time</h2>
                            <p className="text-xs text-muted-foreground mb-5">Affecting {selectedUsers.size} selected users.</p>
                            
                            <div className="flex gap-3 mb-6">
                                <Input type="number" min="1" value={timeAmount} onChange={e => setTimeAmount(parseInt(e.target.value) || 1)} className="bg-background border-border text-foreground flex-1" />
                                <SelectAnimated value={timeUnit} onChange={setTimeUnit} options={[
                                    { value: 'days', label: 'Days' },
                                    { value: 'weeks', label: 'Weeks' },
                                    { value: 'months', label: 'Months' },
                                    { value: 'years', label: 'Years' }
                                ]} className="w-32" />
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => { setIsExtendModalOpen(false); setIsSubtractModalOpen(false); }} className="text-muted-foreground">Cancel</Button>
                                <Button onClick={() => handleBulkTimeUpdate(isExtendModalOpen)} className="bg-primary hover:bg-primary text-white">Apply</Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Import Users Modal */}
            <AnimatePresence>
                {isImportModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-lg bg-card dark:bg-muted/40 border border-border rounded-2xl shadow-2xl p-6 flex flex-col max-h-[80vh]">
                            <h2 className="text-lg font-bold text-foreground mb-2">Import Users</h2>
                            <p className="text-xs text-muted-foreground mb-4">Paste a JSON array of user objects or a KeyAuth JSON file to bulk import.</p>
                            
                            <div className="pb-4">
                                <div className="relative flex items-center justify-center w-full px-4 py-6 bg-muted/20 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition">
                                    <span className="text-sm text-muted-foreground pointer-events-none flex items-center gap-2">
                                        <Upload className="w-4 h-4" /> Click or drag file to this area to upload JSON
                                    </span>
                                    <input type="file" accept=".json" onChange={handleFileUpload} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                                </div>
                            </div>
                            
                            <textarea 
                                value={importData}
                                onChange={e => setImportData(e.target.value)}
                                placeholder={`[\n  {\n    "username": "Username",\n    "email": "user@ex.com",\n    "subscription_level": "Seller"\n  }\n]`}
                                className="w-full flex-1 min-h-[200px] bg-background border border-border rounded-xl p-3 text-foreground/80 font-mono text-xs focus:ring-1 focus:ring-primary outline-none chat-scrollbar resize-none mb-4"
                            />

                            <div className="flex justify-end gap-3 shrink-0">
                                <Button variant="ghost" onClick={() => setIsImportModalOpen(false)} className="text-muted-foreground" disabled={isImporting}>Cancel</Button>
                                <Button onClick={handleImportUsers} className="bg-primary hover:bg-primary text-white" disabled={isImporting}>
                                    {isImporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</> : "Import"}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add User Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setIsAddModalOpen(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card dark:bg-muted/40 border border-border rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"><UserPlus className="w-5 h-5 text-primary dark:text-primary" /></div>
                                <div><h2 className="text-lg font-bold text-foreground">Create User</h2><p className="text-xs text-muted-foreground/70">Manually add an authenticated user.</p></div>
                            </div>
                            <form onSubmit={handleAddUser} className="space-y-4" autoComplete="off">
                                <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Username <span className="text-red-500">*</span></label><Input required value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. shadow" className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" autoComplete="new-username" /></div>
                                <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Email</label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="optional@example.com" className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" autoComplete="off" /></div>
                                <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Password</label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="optional" className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" autoComplete="new-password" /></div>
                                <div className={`grid ${isStandardReseller ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                                    <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Subscription</label><SelectAnimated value={newSub} onChange={(val) => setNewSub(val)} options={availableSubscriptions.length > 0 ? availableSubscriptions.map(s => ({ value: s.name, label: s.name })) : [{ value: "", label: "No Subscriptions" }]} /></div>
                                    {!isStandardReseller && (
                                        <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Expiry (Local Time)</label><Input type="datetime-local" value={newExpiry} min={getCurrentDateTimeLocal()} onChange={(e) => setNewExpiry(e.target.value)} className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" /></div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                                    <div className="flex items-center gap-2">
                                        <span className="text-foreground text-sm font-medium">HWID Affected</span>
                                        <div className="group relative inline-flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary hover:text-primary dark:text-primary dark:hover:text-primary cursor-pointer transition-colors duration-200">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <path d="M12 16v-4"></path>
                                                <path d="M12 8h.01"></path>
                                            </svg>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-popover-foreground bg-popover border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 dark:text-white dark:bg-gray-900/95 dark:border-white/10">
                                                Only 1 HWID per user is allowed.
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border dark:border-t-gray-900/95" />
                                            </div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={newHwidLock} onChange={(e) => setNewHwidLock(e.target.checked)} />
                                        <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                                    <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground">Cancel</Button>
                                    <Button type="submit" className="bg-primary text-white">Create User</Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit User Modal */}
            <AnimatePresence>
                {isEditModalOpen && selectedUserForEdit && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setIsEditModalOpen(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card dark:bg-muted/40 border border-border rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-6">
                                <div><h2 className="text-lg font-bold text-foreground">Edit User</h2><p className="text-xs text-muted-foreground/70">Update details for {selectedUserForEdit.username}.</p></div>
                            </div>
                            <form onSubmit={handleEditUser} className="space-y-4" autoComplete="off">
                                <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Username</label><Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" autoComplete="new-username" /></div>
                                <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Email</label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" autoComplete="off" /></div>
                                <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Additional HWID (Optional)</label><Input type="text" value={newAdditionalHwid} onChange={(e) => setNewAdditionalHwid(e.target.value)} placeholder="Comma separated HWIDs if multiple" className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" /></div>
                                <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Change Password (Leave blank to keep current)</label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" autoComplete="new-password" /></div>
                                <div className={`grid ${isStandardReseller ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                                    <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Subscription</label><SelectAnimated value={newSub} onChange={(val) => setNewSub(val)} options={availableSubscriptions.length > 0 ? availableSubscriptions.map(s => ({ value: s.name, label: s.name })) : [{ value: "", label: "No Subscriptions" }]} /></div>
                                    {!isStandardReseller && (
                                        <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Expiry (Local Time)</label><Input type="datetime-local" value={newExpiry} min={getCurrentDateTimeLocal()} onChange={(e) => setNewExpiry(e.target.value)} className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" /></div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                                    <div className="flex items-center gap-2">
                                        <span className="text-foreground text-sm font-medium">HWID Affected</span>
                                        <div className="group relative inline-flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary hover:text-primary dark:text-primary dark:hover:text-primary cursor-pointer transition-colors duration-200">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <path d="M12 16v-4"></path>
                                                <path d="M12 8h.01"></path>
                                            </svg>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-popover-foreground bg-popover border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 dark:text-white dark:bg-gray-900/95 dark:border-white/10">
                                                Only 1 HWID per user is allowed.
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border dark:border-t-gray-900/95" />
                                            </div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={newHwidLock} onChange={(e) => setNewHwidLock(e.target.checked)} />
                                        <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                                    <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="text-muted-foreground">Cancel</Button>
                                    <Button type="submit" className="bg-primary text-white">Update User</Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ban User Modal */}
            <AnimatePresence>
                {isBanActionModalOpen && selectedBanUser && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setIsBanActionModalOpen(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card dark:bg-muted/40 border border-border rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-6">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                                <div><h2 className="text-lg font-bold text-foreground">Ban User</h2><p className="text-xs text-muted-foreground/70">Ban {selectedBanUser.username} from accessing the application.</p></div>
                            </div>
                            <form onSubmit={handleBanUserSubmit} className="space-y-4">
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
                                    <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">Ban User</Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ban Info Modal */}
            <AnimatePresence>
                {isBanInfoModalOpen && selectedBanUser && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setIsBanInfoModalOpen(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card dark:bg-muted/40 border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="border-b border-border px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-foreground">Ban Information</h3>
                                    <button onClick={() => setIsBanInfoModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                                <div className="mb-4">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Username</p>
                                    <p className="text-sm text-foreground font-mono">{selectedBanUser.username}</p>
                                </div>
                                <div className="border-t border-border my-4"></div>
                                <div className="mb-6">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Ban Reason</p>
                                    <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
                                        <p className="text-sm text-foreground/80 break-words">{selectedBanUser.ban_reason || 'No reason provided.'}</p>
                                    </div>
                                </div>
                                <div className="border-t border-border my-4"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Duration</p>
                                        <p className="text-sm text-foreground">
                                            {selectedBanUser.ban_expires && (new Date(selectedBanUser.ban_expires).getTime() - Date.now() > 50 * 365 * 24 * 60 * 60 * 1000) ? 'Permanent' : 'Temporary'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Expires</p>
                                        <p className="text-sm text-foreground">{selectedBanUser.ban_expires ? new Date(selectedBanUser.ban_expires).toLocaleString() : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-border px-6 py-3 bg-muted/20">
                                <Button type="button" variant="outline" onClick={() => setIsBanInfoModalOpen(false)} className="w-full text-sm">Close</Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

function FilterButton({ label, active, onClick, colorClass }: any) {
    const colorMap: any = {
        amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
        blue: 'bg-primary/10 text-primary dark:text-primary border-primary/30 hover:bg-primary/20',
        red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20',
    };
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                active ? colorMap[colorClass] : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
            }`}
        >
            {active && <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            {label}
        </button>
    );
}
