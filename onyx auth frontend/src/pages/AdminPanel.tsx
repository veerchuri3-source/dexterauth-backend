import { useState, useEffect } from "react";
import { adminApi, devApi } from "../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { SEO } from "../components/SEO";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { 
    Loader2, UserX, UserCheck, Trash2, ChevronDown, ChevronUp, 
    Settings2, Edit, Search, Users, Globe, Megaphone, LogIn,
    Activity, AlertTriangle, ShieldCheck, DollarSign, Plus, X, Bell, Clock, Zap, CalendarDays
} from "lucide-react";
import { Calendar } from "../components/ui/calendar";
import { useDialog } from "../hooks/use-dialog";
import { Badge } from "../components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { getDefaultAvatarUrl } from "../lib/utils";
import { Textarea } from "../components/ui/textarea";
import { BADGES, BadgeIcon } from '../components/Badges';

interface AdminUser {
    id: string;
    username: string;
    email: string;
    role: string;
    plan: string;
    status: string;
    app_count: number;
    license_count: number;
    team_count: number;
    created_at: string;
    avatar_url?: string;
    banner_url?: string;
    bio?: string;
    badges?: string[];
    plan_expires_at?: string | null;
}

export default function AdminPanel() {
    const { confirm } = useDialog();
    const { login, logout } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<AdminUser[]>([]);
    
    const getTabTitle = (tab: string) => {
        switch (tab) {
            case "overview": return "Admin Overview";
            case "users": return "Users Management";
            case "broadcasts": return "System Broadcasts";
            case "marketing": return "Marketing & Affiliates";
            case "pricing": return "Pricing Plans";
            case "infra": return "Infrastructure Settings";
            default: return "Admin Panel";
        }
    };
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
    const [hasMoreUsers, setHasMoreUsers] = useState(false);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalApps, setTotalApps] = useState(0);
    const [totalLicenses, setTotalLicenses] = useState(0);
    const loading = loadingSettings || loadingUsers;
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
    const [platformSettings, setPlatformSettings] = useState({ 
        registration_paused: false,
        cloudflare_domain: '',
        contact_email: '',
        discord_invite: '',
        stripe_publishable_key: '',
        stripe_secret_key: '',
        stripe_webhook_secret: '',
        stripe_enabled: 1,
        binance_enabled: 0,
        binance_pay_id: '',
        binance_qr_code_url: '',
        binance_api_key: '',
        binance_api_secret: ''
    });
    const [editContactEmail, setEditContactEmail] = useState("");
    const [editDiscordInvite, setEditDiscordInvite] = useState("");
    const [binanceEnabled, setBinanceEnabled] = useState(false);
    const [binanceMaintenance, setBinanceMaintenance] = useState(false);
    const [binancePayId, setBinancePayId] = useState("");
    const [binanceQrCodeUrl, setBinanceQrCodeUrl] = useState("");
    const [binanceApiKey, setBinanceApiKey] = useState("");
    const [binanceApiSecret, setBinanceApiSecret] = useState("");
    const [razorpayEnabled, setRazorpayEnabled] = useState(false);
    const [razorpayMaintenance, setRazorpayMaintenance] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Pricing customization states
    const [pricingMonthlyEnabled, setPricingMonthlyEnabled] = useState(true);
    const [pricingYearlyEnabled, setPricingYearlyEnabled] = useState(true);
    const [pricingDiscountBadge, setPricingDiscountBadge] = useState("Save up to 70%");

    const [freePrice, setFreePrice] = useState("$0");
    const [freePeriod, setFreePeriod] = useState("forever");
    const [freeFeatures, setFreeFeatures] = useState("");
    const [freeDesc, setFreeDesc] = useState("Everything you need to test the waters.");
    const [freeFeatured, setFreeFeatured] = useState(false);

    const [devPriceMonthly, setDevPriceMonthly] = useState("$2");
    const [devOriginalPriceMonthly, setDevOriginalPriceMonthly] = useState("$5");
    const [devPeriodMonthly, setDevPeriodMonthly] = useState("per month");
    const [devPriceYearly, setDevPriceYearly] = useState("$15");
    const [devOriginalPriceYearly, setDevOriginalPriceYearly] = useState("$49");
    const [devPeriodYearly, setDevPeriodYearly] = useState("per year");
    const [devFeatures, setDevFeatures] = useState("");
    const [devDesc, setDevDesc] = useState("For growing software that needs more headroom.");
    const [devFeatured, setDevFeatured] = useState(true);

    const [sellerPriceMonthly, setSellerPriceMonthly] = useState("$6");
    const [sellerOriginalPriceMonthly, setSellerOriginalPriceMonthly] = useState("$10");
    const [sellerPeriodMonthly, setSellerPeriodMonthly] = useState("per month");
    const [sellerPriceYearly, setSellerPriceYearly] = useState("$60");
    const [sellerOriginalPriceYearly, setSellerOriginalPriceYearly] = useState("$199");
    const [sellerPeriodYearly, setSellerPeriodYearly] = useState("per year");
    const [sellerFeatures, setSellerFeatures] = useState("");
    const [sellerDesc, setSellerDesc] = useState("Scale with unlimited users and team features.");
    const [sellerFeatured, setSellerFeatured] = useState(false);

    // Global Maintenance Mode
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceMessage, setMaintenanceMessage] = useState("");

    // Health Overrides
    const [healthOverrideApiGateway, setHealthOverrideApiGateway] = useState("auto");
    const [healthReasonApiGateway, setHealthReasonApiGateway] = useState("");
    const [healthOverrideMysqlDatabase, setHealthOverrideMysqlDatabase] = useState("auto");
    const [healthReasonMysqlDatabase, setHealthReasonMysqlDatabase] = useState("");

    // Urgent Dashboard Banner
    const [dashboardBannerActive, setDashboardBannerActive] = useState(false);
    const [dashboardBannerText, setDashboardBannerText] = useState("");
    const [dashboardBannerTheme, setDashboardBannerTheme] = useState("info");

    // Landing Page Top Banner
    const [bannerActive, setBannerActive] = useState(false);
    const [bannerBadge, setBannerBadge] = useState("");
    const [bannerText, setBannerText] = useState("");
    const [bannerLink, setBannerLink] = useState("");
    const [bannerTheme, setBannerTheme] = useState("primary");

    // Hero Stats overrides
    const [statRealtime, setStatRealtime] = useState(true);
    const [statOverride1Val, setStatOverride1Val] = useState("");
    const [statOverride1Lbl, setStatOverride1Lbl] = useState("");
    const [statOverride2Val, setStatOverride2Val] = useState("");
    const [statOverride2Lbl, setStatOverride2Lbl] = useState("");
    const [statOverride3Val, setStatOverride3Val] = useState("");
    const [statOverride3Lbl, setStatOverride3Lbl] = useState("");
    const [statOverride4Val, setStatOverride4Val] = useState("");
    const [statOverride4Lbl, setStatOverride4Lbl] = useState("");

    // Changelog CMS
    const [changelog, setChangelog] = useState<any[]>([]);
    const [loadingChangelog, setLoadingChangelog] = useState(false);
    const [newChangelogVersion, setNewChangelogVersion] = useState("");
    const [newChangelogDate, setNewChangelogDate] = useState("");
    const [newChangelogTitle, setNewChangelogTitle] = useState("");
    const [newChangelogDescription, setNewChangelogDescription] = useState("");
    const [newChangelogBullets, setNewChangelogBullets] = useState<string[]>([]);
    const [newBulletText, setNewBulletText] = useState("");
    const [isSavingChangelog, setIsSavingChangelog] = useState(false);

    // Cloudflare Form State
    const [cfToken, setCfToken] = useState("");
    const [cfDomain, setCfDomain] = useState("");
    const [cfIp, setCfIp] = useState("");
    const [cfPort, setCfPort] = useState("");
    const [linkingCf, setLinkingCf] = useState(false);
    const [unlinkingCf, setUnlinkingCf] = useState(false);
    const [cfExpanded, setCfExpanded] = useState(false);
    const [binanceConfigExpanded, setBinanceConfigExpanded] = useState(false);

    // Team Members state for expanded user
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [loadingTeam, setLoadingTeam] = useState(false);

    // Edit Role State
    const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null);
    const [editRole, setEditRole] = useState("admin");
    const [editPlan, setEditPlan] = useState("Free");
    const [editBadges, setEditBadges] = useState<string[]>([]);
    const [editPlanExpiresAt, setEditPlanExpiresAt] = useState<Date | null>(null);
    const [showExpiryCalendar, setShowExpiryCalendar] = useState(false);
    const [isSavingRole, setIsSavingRole] = useState(false);

    // Announcements states
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newType, setNewType] = useState("Information");
    const [publishing, setPublishing] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "users" | "broadcasts" | "marketing" | "pricing" | "infra">("overview");
    const [selectedPlan, setSelectedPlan] = useState<string>("all");

    const loadAnnouncementsList = async () => {
        try {
            setLoadingAnnouncements(true);
            const res = await devApi.getNotifications();
            if (res.data?.announcements) {
                setAnnouncements(res.data.announcements);
            }
        } catch (error: any) {
            toast.error("Failed to load announcements");
        } finally {
            setLoadingAnnouncements(false);
        }
    };

    const loadSettings = async () => {
        try {
            setLoadingSettings(true);
            const settingsRes = await adminApi.getSettings();
            if (settingsRes.data?.settings) {
                const s = settingsRes.data.settings;
                setPlatformSettings(s);
                if (s.cloudflare_api_token) setCfToken(s.cloudflare_api_token);
                if (s.cloudflare_domain) setCfDomain(s.cloudflare_domain);
                if (s.cloudflare_node_ip) setCfIp(s.cloudflare_node_ip);
                if (s.cloudflare_node_port) setCfPort(String(s.cloudflare_node_port));
                if (s.contact_email) setEditContactEmail(s.contact_email);
                if (s.discord_invite) setEditDiscordInvite(s.discord_invite);
                setBinanceEnabled(!!s.binance_enabled);
                setBinanceMaintenance(!!s.binance_maintenance);
                if (s.binance_pay_id) setBinancePayId(s.binance_pay_id);
                if (s.binance_qr_code_url) setBinanceQrCodeUrl(s.binance_qr_code_url);
                if (s.binance_api_key) setBinanceApiKey(s.binance_api_key);
                if (s.binance_api_secret) setBinanceApiSecret(s.binance_api_secret);
                setRazorpayEnabled(s.razorpay_enabled === undefined ? false : !!s.razorpay_enabled);
                setRazorpayMaintenance(!!s.razorpay_maintenance);

                // --- BIND NEW MASTER ADMIN FIELDS ---
                setMaintenanceMode(!!s.maintenance_mode);
                setMaintenanceMessage(s.maintenance_message || "");
                setHealthOverrideApiGateway(s.health_override_api_gateway || "auto");
                setHealthReasonApiGateway(s.health_reason_api_gateway || "");
                setHealthOverrideMysqlDatabase(s.health_override_mysql_database || "auto");
                setHealthReasonMysqlDatabase(s.health_reason_mysql_database || "");
                setDashboardBannerActive(!!s.dashboard_banner_active);
                setDashboardBannerText(s.dashboard_banner_text || "");
                setDashboardBannerTheme(s.dashboard_banner_theme || "info");
                setBannerActive(!!s.banner_active);
                setBannerBadge(s.banner_badge || "");
                setBannerText(s.banner_text || "");
                setBannerLink(s.banner_link || "");
                setBannerTheme(s.banner_theme || "primary");
                setStatRealtime(!!s.stat_realtime);
                setStatOverride1Val(s.stat_override_1_val || "");
                setStatOverride1Lbl(s.stat_override_1_lbl || "");
                setStatOverride2Val(s.stat_override_2_val || "");
                setStatOverride2Lbl(s.stat_override_2_lbl || "");
                setStatOverride3Val(s.stat_override_3_val || "");
                setStatOverride3Lbl(s.stat_override_3_lbl || "");
                setStatOverride4Val(s.stat_override_4_val || "");
                setStatOverride4Lbl(s.stat_override_4_lbl || "");

                // --- BIND PRICING CUSTOMIZATION ---
                if (s.pricing_customization) {
                    try {
                        const parsed = typeof s.pricing_customization === 'string'
                            ? JSON.parse(s.pricing_customization)
                            : s.pricing_customization;
                        
                        const modes = parsed.billingModes || { monthly: true, yearly: true, discountBadge: "Save up to 70%" };
                        setPricingMonthlyEnabled(!!modes.monthly);
                        setPricingYearlyEnabled(!!modes.yearly);
                        setPricingDiscountBadge(modes.discountBadge || "Save up to 70%");

                        const plansList = parsed.plans || [];
                        const free = plansList.find((p: any) => p.name === 'Free');
                        const dev = plansList.find((p: any) => p.name === 'Developer');
                        const seller = plansList.find((p: any) => p.name === 'Seller');

                        if (free) {
                            setFreePrice(free.monthlyPrice || free.price || "$0");
                            setFreePeriod(free.monthlyPeriod || free.period || "forever");
                            setFreeDesc(free.desc || "");
                            setFreeFeatures(Array.isArray(free.features) ? free.features.join("\n") : "");
                            setFreeFeatured(!!free.featured);
                        }
                        if (dev) {
                            setDevPriceMonthly(dev.monthlyPrice || "$2");
                            setDevOriginalPriceMonthly(dev.monthlyOriginalPrice || "$5");
                            setDevPeriodMonthly(dev.monthlyPeriod || "per month");

                            setDevPriceYearly(dev.yearlyPrice || dev.price || "$15");
                            setDevOriginalPriceYearly(dev.yearlyOriginalPrice || dev.originalPrice || "$49");
                            setDevPeriodYearly(dev.yearlyPeriod || dev.period || "per year");

                            setDevDesc(dev.desc || "");
                            setDevFeatures(Array.isArray(dev.features) ? dev.features.join("\n") : "");
                            setDevFeatured(!!dev.featured);
                        }
                        if (seller) {
                            setSellerPriceMonthly(seller.monthlyPrice || "$6");
                            setSellerOriginalPriceMonthly(seller.originalPrice || "$10");
                            setSellerPeriodMonthly(seller.monthlyPeriod || "per month");

                            setSellerPriceYearly(seller.yearlyPrice || seller.price || "$60");
                            setSellerOriginalPriceYearly(seller.yearlyOriginalPrice || seller.originalPrice || "$199");
                            setSellerPeriodYearly(seller.yearlyPeriod || seller.period || "per year");

                            setSellerDesc(seller.desc || "");
                            setSellerFeatures(Array.isArray(seller.features) ? seller.features.join("\n") : "");
                            setSellerFeatured(!!seller.featured);
                        }
                    } catch (err) {
                        console.error("Failed to parse pricing customization:", err);
                    }
                } else {
                    // Default values fallback
                    setPricingMonthlyEnabled(true);
                    setPricingYearlyEnabled(true);
                    setPricingDiscountBadge("Save up to 70%");

                    setFreePrice("$0");
                    setFreePeriod("forever");
                    setFreeDesc("Everything you need to test the waters.");
                    setFreeFeatures("3 Applications\n70 Users per App\nHardware ID Locking\nEmail + password login\nCommunity support");
                    setFreeFeatured(false);

                    setDevPriceMonthly("$2");
                    setDevOriginalPriceMonthly("$5");
                    setDevPeriodMonthly("per month");
                    setDevPriceYearly("$15");
                    setDevOriginalPriceYearly("$49");
                    setDevPeriodYearly("per year");
                    setDevDesc("For growing software that needs more headroom.");
                    setDevFeatures("7 Applications\n500 Users per App\nAdvanced VPN Blocking\nAudit logs & webhooks\n99.9% uptime\nPriority email support");
                    setDevFeatured(true);

                    setSellerPriceMonthly("$6");
                    setSellerOriginalPriceMonthly("$10");
                    setSellerPeriodMonthly("per month");
                    setSellerPriceYearly("$60");
                    setSellerOriginalPriceYearly("$199");
                    setSellerPeriodYearly("per year");
                    setSellerDesc("Scale with unlimited users and team features.");
                    setSellerFeatures("Unlimited Applications\nUnlimited Users & Licenses\nTeam Management & Chat\nDedicated support\n99.9% uptime\nAudit logs & webhooks");
                    setSellerFeatured(false);
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to load platform settings.");
        } finally {
            setLoadingSettings(false);
        }
    };

    const loadChangelog = async () => {
        try {
            setLoadingChangelog(true);
            const res = await adminApi.getChangelog();
            if (res.data?.changelog) {
                setChangelog(res.data.changelog);
            }
        } catch (error: any) {
            toast.error("Failed to load changelog list");
        } finally {
            setLoadingChangelog(false);
        }
    };

    const loadUsers = async (offset = 0, searchVal = searchQuery, planVal = selectedPlan) => {
        try {
            if (offset === 0) {
                setLoadingUsers(true);
            } else {
                setLoadingMoreUsers(true);
            }
            const res = await adminApi.getOverview(50, offset, searchVal.trim(), planVal);
            if (res.data) {
                if (offset === 0) {
                    setUsers(res.data.users || []);
                } else {
                    setUsers(prev => [...prev, ...(res.data.users || [])]);
                }
                setHasMoreUsers(!!res.data.hasMore);
                setTotalUsers(res.data.total || 0);
                setTotalApps(res.data.totalApps || 0);
                setTotalLicenses(res.data.totalLicenses || 0);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to load users list.");
            if (error.response?.status === 401 || error.response?.status === 403) {
                logout();
                navigate("/login");
            }
        } finally {
            setLoadingUsers(false);
            setLoadingMoreUsers(false);
        }
    };

    const loadData = async () => {
        if (activeTab === "overview") {
            await Promise.all([loadSettings(), loadUsers(0, searchQuery, selectedPlan)]);
        } else if (activeTab === "users") {
            await loadUsers(0, searchQuery, selectedPlan);
        } else if (activeTab === "broadcasts") {
            await loadAnnouncementsList();
        } else if (activeTab === "marketing") {
            await Promise.all([loadSettings(), loadChangelog()]);
        } else if (activeTab === "pricing" || activeTab === "infra") {
            await loadSettings();
        }
    };

    const handleImpersonateUser = async (userId: string) => {
        if (impersonatingId) return;
        try {
            setImpersonatingId(userId);
            const toastId = toast.loading("Impersonating user...");
            const res = await adminApi.impersonateUser(userId);
            toast.dismiss(toastId);
            if (res.status === "success" && res.data?.token) {
                const currentToken = localStorage.getItem("dev_token");
                if (currentToken) {
                    localStorage.setItem("admin_token", currentToken);
                }
                toast.success("Logged in as user successfully");
                login(res.data.token);
                navigate("/dashboard");
            } else {
                throw new Error("Failed to impersonate user.");
            }
        } catch (error: any) {
            toast.dismiss();
            toast.error(error.response?.data?.message || error.message || "Failed to impersonate user.");
        } finally {
            setImpersonatingId(null);
        }
    };

    useEffect(() => {
        if (activeTab === "overview") {
            loadSettings();
            loadUsers(0, searchQuery, selectedPlan);
        } else if (activeTab === "users") {
            loadUsers(0, searchQuery, selectedPlan);
        } else if (activeTab === "broadcasts") {
            loadAnnouncementsList();
        } else if (activeTab === "marketing") {
            loadSettings();
            loadChangelog();
        } else if (activeTab === "pricing" || activeTab === "infra") {
            loadSettings();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== "users" && activeTab !== "overview") return;
        const delayDebounceFn = setTimeout(() => {
            loadUsers(0, searchQuery, selectedPlan);
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, selectedPlan]);

    const handlePublishAnnouncement = async () => {
        if (!newTitle.trim() || !newContent.trim()) {
            return toast.error("Title and content are required.");
        }
        
        setPublishing(true);
        try {
            await adminApi.createAnnouncement(newTitle.trim(), newContent.trim(), newType);
            toast.success("Announcement published successfully!");
            setNewTitle("");
            setNewContent("");
            setNewType("Information");
            await loadAnnouncementsList();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to publish announcement.");
        } finally {
            setPublishing(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!await confirm({
            title: "Delete Announcement",
            description: "Are you sure you want to delete this announcement? This action cannot be undone.",
            variant: "destructive"
        })) return;

        try {
            await adminApi.deleteAnnouncement(id);
            toast.success("Announcement deleted successfully.");
            await loadAnnouncementsList();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete announcement.");
        }
    };

    const handleExpandUser = async (userId: string) => {
        if (expandedUser === userId) {
            setExpandedUser(null);
            setTeamMembers([]);
            return;
        }
        
        setExpandedUser(userId);
        setTeamMembers([]);
        const user = users.find(u => u.id === userId);
        
        if (user && user.team_count > 0) {
            setLoadingTeam(true);
            try {
                const res = await adminApi.getAdminTeam(userId);
                if (res.data?.team) {
                    setTeamMembers(res.data.team);
                }
            } catch (error: any) {
                toast.error("Failed to load team members");
            } finally {
                setLoadingTeam(false);
            }
        }
    };

    const handleSaveSettings = async (updatedFields: any, successMessage = "Settings updated successfully.") => {
        try {
            setSavingSettings(true);
            const payload = {
                registration_paused: platformSettings.registration_paused,
                contact_email: editContactEmail,
                discord_invite: editDiscordInvite,
                binance_enabled: binanceEnabled ? 1 : 0,
                binance_maintenance: binanceMaintenance ? 1 : 0,
                binance_pay_id: binancePayId,
                binance_qr_code_url: binanceQrCodeUrl,
                binance_api_key: binanceApiKey,
                binance_api_secret: binanceApiSecret,
                razorpay_enabled: razorpayEnabled ? 1 : 0,
                razorpay_maintenance: razorpayMaintenance ? 1 : 0,

                // --- NEW MASTER ADMIN FIELDS ---
                maintenance_mode: maintenanceMode ? 1 : 0,
                maintenance_message: maintenanceMessage,
                health_override_api_gateway: healthOverrideApiGateway,
                health_reason_api_gateway: healthReasonApiGateway,
                health_override_mysql_database: healthOverrideMysqlDatabase,
                health_reason_mysql_database: healthReasonMysqlDatabase,
                dashboard_banner_active: dashboardBannerActive ? 1 : 0,
                dashboard_banner_text: dashboardBannerText,
                dashboard_banner_theme: dashboardBannerTheme,
                banner_active: bannerActive ? 1 : 0,
                banner_badge: bannerBadge,
                banner_text: bannerText,
                banner_link: bannerLink,
                banner_theme: bannerTheme,
                stat_realtime: statRealtime ? 1 : 0,
                stat_override_1_val: statOverride1Val,
                stat_override_1_lbl: statOverride1Lbl,
                stat_override_2_val: statOverride2Val,
                stat_override_2_lbl: statOverride2Lbl,
                stat_override_3_val: statOverride3Val,
                stat_override_3_lbl: statOverride3Lbl,
                stat_override_4_val: statOverride4Val,
                stat_override_4_lbl: statOverride4Lbl,
                
                ...updatedFields
            };

            await adminApi.updateSettings(payload);
            setPlatformSettings(prev => ({ ...prev, ...payload }));
            toast.success(successMessage);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update platform settings.");
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSavePricingCustomization = async () => {
        if (!pricingMonthlyEnabled && !pricingYearlyEnabled) {
            toast.error("You must enable at least one billing period (Monthly or Yearly).");
            return;
        }

        const payload = {
            billingModes: {
                monthly: pricingMonthlyEnabled,
                yearly: pricingYearlyEnabled,
                discountBadge: pricingDiscountBadge
            },
            plans: [
                {
                    name: "Free",
                    desc: freeDesc,
                    featured: freeFeatured,
                    features: freeFeatures.split("\n").map(f => f.trim()).filter(Boolean),
                    monthlyPrice: freePrice,
                    monthlyPeriod: freePeriod,
                    yearlyPrice: freePrice,
                    yearlyPeriod: freePeriod
                },
                {
                    name: "Developer",
                    desc: devDesc,
                    featured: devFeatured,
                    features: devFeatures.split("\n").map(f => f.trim()).filter(Boolean),
                    monthlyPrice: devPriceMonthly,
                    monthlyOriginalPrice: devOriginalPriceMonthly,
                    monthlyPeriod: devPeriodMonthly,
                    yearlyPrice: devPriceYearly,
                    yearlyOriginalPrice: devOriginalPriceYearly,
                    yearlyPeriod: devPeriodYearly
                },
                {
                    name: "Seller",
                    desc: sellerDesc,
                    featured: sellerFeatured,
                    features: sellerFeatures.split("\n").map(f => f.trim()).filter(Boolean),
                    monthlyPrice: sellerPriceMonthly,
                    monthlyOriginalPrice: sellerOriginalPriceMonthly,
                    monthlyPeriod: sellerPeriodMonthly,
                    yearlyPrice: sellerPriceYearly,
                    yearlyOriginalPrice: sellerOriginalPriceYearly,
                    yearlyPeriod: sellerPeriodYearly
                }
            ]
        };

        const extraFields = {
            pricing_customization: payload
        };

        await handleSaveSettings(extraFields, "Pricing plans customization saved successfully!");
    };

    const handleToggleRegistration = async () => {
        const newValue = !platformSettings.registration_paused;
        if (!await confirm({ 
            title: newValue ? "Pause Signups" : "Resume Signups", 
            description: newValue ? "This will globally block anyone from creating a new developer account. Are you sure?" : "This will reopen signups for the platform.", 
            variant: newValue ? "destructive" : "default" 
        })) return;
        await handleSaveSettings({ registration_paused: newValue }, `Signups are now ${newValue ? 'paused' : 'open'}.`);
    };

    const handleToggleBinanceEnabled = async () => {
        const newValue = !binanceEnabled;
        setBinanceEnabled(newValue);
        await handleSaveSettings({ binance_enabled: newValue ? 1 : 0 }, `Binance Pay is now ${newValue ? 'enabled' : 'disabled'}.`);
    };

    const handleToggleBinanceMaintenance = async () => {
        const newValue = !binanceMaintenance;
        setBinanceMaintenance(newValue);
        await handleSaveSettings({ binance_maintenance: newValue ? 1 : 0 }, `Binance maintenance mode is now ${newValue ? 'enabled' : 'disabled'}.`);
    };

    const handleToggleRazorpayEnabled = async () => {
        const newValue = !razorpayEnabled;
        setRazorpayEnabled(newValue);
        await handleSaveSettings({ razorpay_enabled: newValue ? 1 : 0 }, `Razorpay gateway is now ${newValue ? 'enabled' : 'disabled'}.`);
    };

    const handleToggleRazorpayMaintenance = async () => {
        const newValue = !razorpayMaintenance;
        setRazorpayMaintenance(newValue);
        await handleSaveSettings({ razorpay_maintenance: newValue ? 1 : 0 }, `Razorpay maintenance mode is now ${newValue ? 'enabled' : 'disabled'}.`);
    };

    const handleAddChangelogBullet = () => {
        if (!newBulletText.trim()) return;
        setNewChangelogBullets(prev => [...prev, newBulletText.trim()]);
        setNewBulletText("");
    };

    const handleRemoveChangelogBullet = (index: number) => {
        setNewChangelogBullets(prev => prev.filter((_, i) => i !== index));
    };

    const handlePublishChangelog = async () => {
        if (!newChangelogVersion.trim() || !newChangelogTitle.trim() || !newChangelogDescription.trim()) {
            return toast.error("Version, Title, and Description are required.");
        }
        try {
            setIsSavingChangelog(true);
            const res = await adminApi.createChangelog({
                version: newChangelogVersion.trim(),
                releaseDate: newChangelogDate.trim() || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
                title: newChangelogTitle.trim(),
                description: newChangelogDescription.trim(),
                changes: newChangelogBullets
            });
            if (res.status === "success") {
                toast.success("Changelog published successfully!");
                setNewChangelogVersion("");
                setNewChangelogDate("");
                setNewChangelogTitle("");
                setNewChangelogDescription("");
                setNewChangelogBullets([]);
                loadChangelog();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to publish changelog.");
        } finally {
            setIsSavingChangelog(false);
        }
    };

    const handleDeleteChangelog = async (id: string) => {
        if (!await confirm({
            title: "Delete Changelog Entry",
            description: "Are you sure you want to delete this changelog entry?",
            variant: "destructive"
        })) return;
        try {
            await adminApi.deleteChangelog(id);
            toast.success("Changelog deleted.");
            loadChangelog();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete changelog.");
        }
    };

    const handleAction = async (action: 'pause' | 'resume' | 'wipe', userId: string) => {
        if (action === 'wipe') {
            if (!await confirm({ title: "Wipe Account", description: "Are you sure you want to permanently wipe this user and all their apps, licenses, and data?", variant: "destructive" })) return;
        } else if (action === 'pause') {
            if (!await confirm({ title: "Freeze Account", description: "This will pause the user's account AND automatically pause all applications owned by them. Proceed?", variant: "destructive" })) return;
        }

        try {
            if (action === 'pause') {
                await adminApi.pauseAdmin(userId);
                toast.success("User frozen and apps paused successfully.");
            } else if (action === 'resume') {
                await adminApi.resumeAdmin(userId);
                toast.success("User resumed successfully.");
            } else if (action === 'wipe') {
                await adminApi.wipeAdmin(userId);
                toast.success("User wiped successfully.");
            }
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to ${action} user.`);
        }
    };

    const handleSaveRole = async (userId: string) => {
        setIsSavingRole(true);
        try {
            const expiresIso = editPlanExpiresAt ? editPlanExpiresAt.toISOString() : null;
            await adminApi.updateAdminRole(userId, editRole, editPlan, editBadges, expiresIso);
            toast.success("User role & plan updated!");
            setEditingRoleUserId(null);
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update role.");
        } finally {
            setIsSavingRole(false);
        }
    };

    const handleLinkCloudflare = async () => {
        if (!cfToken || !cfDomain || !cfIp || !cfPort) {
            return toast.error("Please fill in all Cloudflare fields");
        }
        setLinkingCf(true);
        try {
            await adminApi.linkCloudflare(
                cfToken, 
                cfDomain, 
                cfIp, 
                parseInt(cfPort) 
            );
            toast.success("Domain beautifully linked and secured via Cloudflare!");
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to link Cloudflare");
        } finally {
            setLinkingCf(false);
        }
    };

    const handleUnlinkCloudflare = async () => {
        setUnlinkingCf(true);
        try {
            await adminApi.unlinkCloudflare();
            toast.success("Cloudflare domain successfully unlinked.");
            setCfToken("");
            setCfDomain("");
            setCfIp("");
            setCfPort("");
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to unlink Cloudflare");
        } finally {
            setUnlinkingCf(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const filteredUsers = users.filter(u => 
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.includes(searchQuery)
    );

    return (
        <div className="bg-background selection:bg-primary/30 font-sans">
            <SEO title={getTabTitle(activeTab)} path="/admin" indexable={false} />
            <div className="w-full max-w-7xl mx-auto px-4 pt-2 pb-16 space-y-8">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Master Admin</h1>
                        <p className="text-muted-foreground text-lg">Platform ecosystem and developer management.</p>
                    </div>
                    <Button onClick={handleLogout} variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500/10">
                        Sign Out
                    </Button>
                </div>

                {/* Tab Switcher */}
                <div className="relative mb-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1 rounded-xl border border-border/60 bg-muted/20 p-1">
                    {[
                        { key: "overview", label: "Platform Overview" },
                        { key: "users", label: "Developer Accounts" },
                        { key: "broadcasts", label: "Broadcasts & Alerts" },
                        { key: "marketing", label: "Marketing & CMS" },
                        { key: "pricing", label: "Gateways & Pricing" },
                        { key: "infra", label: "Infrastructure & Domain" }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className="relative rounded-lg px-2 py-2 text-xs md:text-sm font-medium transition-colors"
                        >
                            {activeTab === tab.key && (
                                <motion.span
                                    layoutId="admin-active-tab"
                                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                                    className="absolute inset-0 rounded-lg border border-primary/40 bg-primary/10 shadow-sm"
                                />
                            )}
                            <span
                                className={`relative font-semibold ${
                                    activeTab === tab.key ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-8"
                    >
                        {activeTab === "overview" && (
                            <>
                                {/* Telemetry stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="bg-gradient-to-br from-primary/10 via-transparent to-transparent border-primary/30 relative overflow-hidden shadow-lg hover:shadow-primary/5 transition-all">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <Users className="w-4 h-4 text-primary" /> Total Registered Developers
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-extrabold text-foreground">{totalUsers}</div>
                                            <p className="text-xs text-muted-foreground/80 mt-1">Ecosystem-wide registered accounts</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-purple-500/10 via-transparent to-transparent border-purple-500/30 relative overflow-hidden shadow-lg hover:shadow-purple-500/5 transition-all">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-purple-400" /> Active Applications
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-extrabold text-foreground">{totalApps}</div>
                                            <p className="text-xs text-muted-foreground/80 mt-1">Total software projects secured</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border-emerald-500/30 relative overflow-hidden shadow-lg hover:shadow-emerald-500/5 transition-all">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Issued Licenses
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-extrabold text-foreground">{totalLicenses}</div>
                                            <p className="text-xs text-muted-foreground/80 mt-1">HWID-locked developer licenses</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Global Maintenance Mode */}
                                <Card className="bg-muted/40 border-border">
                                    <CardHeader className="pb-3 border-b border-border">
                                        <CardTitle className="text-foreground flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" /> Global Maintenance Locker
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground font-sans">
                                            Instantly lock down the entire ecosystem and restrict client access. When active, all API routes return 503.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                                            <div>
                                                <h3 className="text-foreground font-medium mb-1">Maintenance Status</h3>
                                                <p className="text-sm text-muted-foreground">Force-toggle maintenance mode across all public pages.</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge className={maintenanceMode ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"}>
                                                    Status: {maintenanceMode ? "Locked" : "Operational"}
                                                </Badge>
                                                <Button 
                                                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                                                    variant={maintenanceMode ? "default" : "outline"}
                                                    className={maintenanceMode ? "bg-red-600 hover:bg-red-500 text-white" : "border-border text-foreground hover:bg-muted"}
                                                >
                                                    {maintenanceMode ? "Deactivate Maintenance" : "Activate Maintenance"}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">Custom Maintenance Message</label>
                                            <Input
                                                placeholder="e.g. We are performing scheduled database upgrades. Back online shortly."
                                                value={maintenanceMessage}
                                                onChange={(e) => setMaintenanceMessage(e.target.value)}
                                                className="bg-background border-border text-foreground"
                                            />
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <Button 
                                                onClick={() => handleSaveSettings({ maintenance_mode: maintenanceMode ? 1 : 0, maintenance_message: maintenanceMessage }, "Global maintenance settings updated successfully.")} 
                                                disabled={savingSettings || loading}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                            >
                                                {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Save Maintenance State
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Service Health overrides */}
                                <Card className="bg-muted/40 border-border">
                                    <CardHeader className="pb-3 border-b border-border">
                                        <CardTitle className="text-foreground flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-primary" /> Service Status Overrides
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Override status values on the public /status page. Set custom warnings and reason details.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* API Gateway override */}
                                            <div className="space-y-4 bg-background/45 p-5 rounded-xl border border-border">
                                                <h3 className="text-foreground font-semibold flex items-center gap-2"><Globe className="w-4.5 h-4.5 text-primary" /> API Gateway</h3>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Override</label>
                                                    <Select value={healthOverrideApiGateway} onValueChange={setHealthOverrideApiGateway}>
                                                        <SelectTrigger className="w-full bg-background border-border text-foreground h-10">
                                                            <SelectValue placeholder="Auto-Detect (Ping)" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-background border-border text-foreground">
                                                            <SelectItem value="auto">Auto-Detect (Ping Checks)</SelectItem>
                                                            <SelectItem value="operational">Operational</SelectItem>
                                                            <SelectItem value="degraded">Degraded Performance</SelectItem>
                                                            <SelectItem value="outage">Major Outage</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason / Announcement</label>
                                                    <Input
                                                        placeholder="Leave blank for automatic stats"
                                                        value={healthReasonApiGateway}
                                                        onChange={(e) => setHealthReasonApiGateway(e.target.value)}
                                                        className="bg-background border-border text-foreground"
                                                    />
                                                </div>
                                            </div>

                                            {/* Database override */}
                                            <div className="space-y-4 bg-background/45 p-5 rounded-xl border border-border">
                                                <h3 className="text-foreground font-semibold flex items-center gap-2"><Activity className="w-4.5 h-4.5 text-purple-400" /> MySQL Core Database</h3>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Override</label>
                                                    <Select value={healthOverrideMysqlDatabase} onValueChange={setHealthOverrideMysqlDatabase}>
                                                        <SelectTrigger className="w-full bg-background border-border text-foreground h-10">
                                                            <SelectValue placeholder="Auto-Detect (Ping)" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-background border-border text-foreground">
                                                            <SelectItem value="auto">Auto-Detect (Ping Checks)</SelectItem>
                                                            <SelectItem value="operational">Operational</SelectItem>
                                                            <SelectItem value="degraded">Degraded Performance</SelectItem>
                                                            <SelectItem value="outage">Major Outage</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason / Announcement</label>
                                                    <Input
                                                        placeholder="Leave blank for automatic stats"
                                                        value={healthReasonMysqlDatabase}
                                                        onChange={(e) => setHealthReasonMysqlDatabase(e.target.value)}
                                                        className="bg-background border-border text-foreground"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <Button 
                                                onClick={() => handleSaveSettings({
                                                    health_override_api_gateway: healthOverrideApiGateway,
                                                    health_reason_api_gateway: healthReasonApiGateway,
                                                    health_override_mysql_database: healthOverrideMysqlDatabase,
                                                    health_reason_mysql_database: healthReasonMysqlDatabase
                                                }, "Service override status settings successfully synced.")} 
                                                disabled={savingSettings || loading}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                            >
                                                {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Save Health Overrides
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {activeTab === "users" && (
                            <>
                                {/* Developer Accounts Table */}
                                <Card className="bg-muted/40 border-border">
                                    <CardHeader className="pb-3 border-b border-border">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <CardTitle className="text-foreground">Developer Accounts</CardTitle>
                                                <CardDescription className="text-muted-foreground">Manage and control registered developers inside the database.</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-64">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                                                    <Input
                                                        placeholder="Search username or email..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="pl-9 pr-8 bg-background border-border text-foreground focus-visible:ring-primary/50"
                                                    />
                                                    {searchQuery && (
                                                        <button 
                                                            onClick={() => setSearchQuery("")}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-0.5 rounded transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="w-36">
                                                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                                        <SelectTrigger className="w-full bg-background border-border text-foreground h-9">
                                                            <SelectValue placeholder="All Plans" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-background border-border text-foreground">
                                                            <SelectItem value="all">All Plans</SelectItem>
                                                            <SelectItem value="Free">Free</SelectItem>
                                                            <SelectItem value="Developer">Developer</SelectItem>
                                                            <SelectItem value="Seller">Seller</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <Badge className="bg-primary/10 text-primary border border-primary/20 h-9 px-3 flex items-center">
                                                    {loadingUsers ? <Loader2 className="h-4.5 w-4.5 animate-spin mr-1.5" /> : null}
                                                    {totalUsers} Developers
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {loadingUsers && users.length === 0 ? (
                                            <div className="flex justify-center p-16">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        ) : users.length === 0 ? (
                                            <div className="text-center p-16 text-muted-foreground">
                                                {searchQuery ? 'No developers found matching your search.' : 'No developers found.'}
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-[#1E293B]">
                                                {users.map((user) => (
                                                    <div key={user.id} className="flex flex-col">
                                                        <div 
                                                            className={`flex items-center p-4 hover:bg-muted/50 transition-colors cursor-pointer ${expandedUser === user.id ? 'bg-muted/30' : ''}`}
                                                            onClick={() => handleExpandUser(user.id)}
                                                        >
                                                            <div className="flex-1 flex items-center gap-4">
                                                                {user.avatar_url || user.email || user.username ? (
                                                                    <img 
                                                                        src={user.avatar_url || getDefaultAvatarUrl(user.email, user.username)} 
                                                                        alt="avatar" 
                                                                        className="w-10 h-10 rounded-full border border-border object-cover" 
                                                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-red-600 flex items-center justify-center text-foreground font-bold text-sm shadow">
                                                                        {(user.username || "?")[0].toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                                                                            {user.username}
                                                                            {Array.isArray(user.badges) && user.badges.length > 0 && (
                                                                                <div className="flex items-center gap-0.5 ml-1">
                                                                                    {user.badges.map(bId => (
                                                                                        <BadgeIcon key={bId} badgeId={bId} className="w-4 h-4" />
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground/70 font-mono">{user.id.substring(0, 8)}</span>
                                                                    </div>
                                                                    <span className="text-sm text-muted-foreground">{user.email}</span>
                                                                    {user.plan && user.plan !== 'Free' && (
                                                                        <div className="flex items-center gap-1.5 text-[11px] text-purple-400 font-medium mt-1">
                                                                            <CalendarDays className="w-3 h-3" />
                                                                            <span>
                                                                                Tier: {user.plan} • {user.plan_expires_at
                                                                                    ? `Expires: ${new Date(user.plan_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
                                                                                    : 'Lifetime / Forever'
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="w-48 hidden sm:block">
                                                                <Badge className="bg-muted text-foreground/80 border-border mr-2">
                                                                    {user.role}
                                                                </Badge>
                                                                <Badge className={`border ${
                                                                    user.status === 'active' 
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                }`}>
                                                                    {user.status === 'active' ? 'Active' : 'Frozen'}
                                                                </Badge>
                                                            </div>
                                                            <div className="w-12 flex justify-end text-muted-foreground/70">
                                                                {expandedUser === user.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                            </div>
                                                        </div>

                                                        <AnimatePresence>
                                                            {expandedUser === user.id && (
                                                                <motion.div 
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="overflow-hidden bg-background border-t border-b border-border"
                                                                >
                                                                    <div className="p-6">
                                                                        {/* Rich Profile Banner */}
                                                                        <div className="mb-6 relative rounded-xl overflow-hidden border border-border bg-muted/40">
                                                                            {user.banner_url ? (
                                                                                <div className="w-full h-32 bg-cover bg-center opacity-50" style={{ backgroundImage: `url(${user.banner_url})` }} />
                                                                            ) : (
                                                                                <div className="w-full h-32 bg-gradient-to-r from-primary/50 to-red-900/50" />
                                                                            )}
                                                                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-[#0F172A] to-transparent" />
                                                                            
                                                                            <div className="absolute bottom-4 left-6 flex items-end gap-4">
                                                                                {user.avatar_url || user.email || user.username ? (
                                                                                    <img 
                                                                                        src={user.avatar_url || getDefaultAvatarUrl(user.email, user.username)} 
                                                                                        alt="avatar" 
                                                                                        className="w-16 h-16 rounded-full border-2 border-border object-cover shadow-lg" 
                                                                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                                                    />
                                                                                ) : (
                                                                                    <div className="w-16 h-16 rounded-full border-2 border-border bg-gradient-to-br from-primary to-red-600 flex items-center justify-center text-foreground font-bold text-2xl shadow-lg">
                                                                                        {(user.username || "?")[0].toUpperCase()}
                                                                                    </div>
                                                                                )}
                                                                                <div className="mb-1">
                                                                                    <h3 className="text-xl font-bold text-foreground leading-none mb-1">{user.username}</h3>
                                                                                    <p className="text-muted-foreground text-sm leading-none">{user.email}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {user.bio && (
                                                                            <div className="mb-6 bg-muted/40 border border-border rounded-xl p-4">
                                                                                <h4 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">About / Bio</h4>
                                                                                <p className="text-foreground/80 whitespace-pre-wrap text-sm">{user.bio}</p>
                                                                            </div>
                                                                        )}

                                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                                            {/* Stats */}
                                                                            <div className="space-y-4 col-span-1 lg:col-span-2">
                                                                                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">Account Statistics</h4>
                                                                                <div className="grid grid-cols-3 gap-4">
                                                                                    <div className="bg-muted/40 border border-border rounded-xl p-4">
                                                                                        <p className="text-muted-foreground/70 text-xs font-medium mb-1">Apps Created</p>
                                                                                        <p className="text-2xl font-bold text-foreground">{user.app_count}</p>
                                                                                    </div>
                                                                                    <div className="bg-muted/40 border border-border rounded-xl p-4">
                                                                                        <p className="text-muted-foreground/70 text-xs font-medium mb-1">Licenses</p>
                                                                                        <p className="text-2xl font-bold text-foreground">{user.license_count}</p>
                                                                                    </div>
                                                                                    <div className="bg-muted/40 border border-border rounded-xl p-4">
                                                                                        <p className="text-muted-foreground/70 text-xs font-medium mb-1">Team Members</p>
                                                                                        <p className="text-2xl font-bold text-foreground">{user.team_count}</p>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Impersonation Option */}
                                                                                <div className="pt-2">
                                                                                    <Button 
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleImpersonateUser(user.id);
                                                                                        }}
                                                                                        disabled={!!impersonatingId}
                                                                                        className="w-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-2 border border-primary/20 shadow-md shadow-primary/10"
                                                                                    >
                                                                                        {impersonatingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                                                                                        Login As Developer
                                                                                    </Button>
                                                                                </div>
                                                                            </div>

                                                                            {/* Role Management */}
                                                                            <div className="space-y-4">
                                                                                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2 flex justify-between items-center">
                                                                                    Role & Plan
                                                                                    {editingRoleUserId !== user.id && (
                                                                                        <button 
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setEditRole(user.role);
                                                                                                setEditPlan(user.plan);
                                                                                                setEditBadges(user.badges || []);
                                                                                                setEditPlanExpiresAt(user.plan_expires_at ? new Date(user.plan_expires_at) : null);
                                                                                                setShowExpiryCalendar(false);
                                                                                                setEditingRoleUserId(user.id);
                                                                                            }} 
                                                                                            className="text-primary hover:text-primary p-1"
                                                                                        >
                                                                                            <Edit className="w-4 h-4" />
                                                                                        </button>
                                                                                    )}
                                                                                </h4>
                                                                                
                                                                                <AnimatePresence mode="wait">
                                                                                    {editingRoleUserId === user.id ? (
                                                                                        <motion.div 
                                                                                            key="editing"
                                                                                            initial={{ opacity: 0, height: 0 }}
                                                                                            animate={{ opacity: 1, height: 'auto' }}
                                                                                            exit={{ opacity: 0, height: 0 }}
                                                                                            transition={{ duration: 0.2 }}
                                                                                            className="bg-muted/40 border border-border rounded-xl p-4 space-y-3 overflow-hidden"
                                                                                        >
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-xs font-medium text-muted-foreground/70">Role</label>
                                                                                                <Select value={editRole} onValueChange={setEditRole}>
                                                                                                    <SelectTrigger className="w-full bg-muted/40 border-border text-foreground h-10">
                                                                                                        <SelectValue placeholder="Select a role" />
                                                                                                    </SelectTrigger>
                                                                                                    <SelectContent className="bg-muted/40 border-border text-foreground">
                                                                                                        <SelectItem value="admin" className="focus:bg-primary/20 focus:text-foreground cursor-pointer hover:bg-primary/20 hover:text-foreground">Admin (App Owner)</SelectItem>
                                                                                                        <SelectItem value="reseller" className="focus:bg-primary/20 focus:text-foreground cursor-pointer hover:bg-primary/20 hover:text-foreground">Reseller</SelectItem>
                                                                                                        <SelectItem value="manager" className="focus:bg-primary/20 focus:text-foreground cursor-pointer hover:bg-primary/20 hover:text-foreground">Manager</SelectItem>
                                                                                                    </SelectContent>
                                                                                                </Select>
                                                                                            </div>
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-xs font-medium text-muted-foreground/70">Subscription Tier</label>
                                                                                                <Select value={editPlan} onValueChange={(v) => { setEditPlan(v); if (v === 'Free') { setEditPlanExpiresAt(null); setShowExpiryCalendar(false); } }}>
                                                                                                    <SelectTrigger className="w-full bg-muted/40 border-border text-foreground h-10">
                                                                                                        <SelectValue placeholder="Select a plan" />
                                                                                                    </SelectTrigger>
                                                                                                    <SelectContent className="bg-muted/40 border-border text-foreground">
                                                                                                        <SelectItem value="Free" className="focus:bg-primary/20 focus:text-foreground cursor-pointer hover:bg-primary/20 hover:text-foreground">Free</SelectItem>
                                                                                                        <SelectItem value="Developer" className="focus:bg-primary/20 focus:text-foreground cursor-pointer hover:bg-primary/20 hover:text-foreground">Developer</SelectItem>
                                                                                                        <SelectItem value="Seller" className="focus:bg-primary/20 focus:text-foreground cursor-pointer hover:bg-primary/20 hover:text-foreground">Seller</SelectItem>
                                                                                                    </SelectContent>
                                                                                                </Select>
                                                                                            </div>
                                                                                            {/* Plan Expiry Date Picker — only shown for paid plans */}
                                                                                            {editPlan !== 'Free' && (
                                                                                               <div className="space-y-1">
                                                                                                   <label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1">
                                                                                                       <CalendarDays className="w-3 h-3" /> Plan Expiry Date
                                                                                                   </label>
                                                                                                   <Popover open={showExpiryCalendar} onOpenChange={setShowExpiryCalendar}>
                                                                                                       <PopoverTrigger asChild>
                                                                                                           <button
                                                                                                               onClick={(e) => e.stopPropagation()}
                                                                                                               className={`w-full flex items-center justify-between px-3 h-10 rounded-md border text-sm transition-colors ${
                                                                                                                   editPlanExpiresAt
                                                                                                                   ? 'border-primary/50 bg-primary/10 text-foreground'
                                                                                                                   : 'border-border bg-muted/40 text-muted-foreground'
                                                                                                               }`}
                                                                                                           >
                                                                                                               <span className="flex items-center gap-2">
                                                                                                                   <CalendarDays className="w-4 h-4 shrink-0" />
                                                                                                                   {editPlanExpiresAt
                                                                                                                       ? editPlanExpiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                                                                                       : 'No Expiry (Lifetime)'
                                                                                                                   }
                                                                                                               </span>
                                                                                                               {editPlanExpiresAt && (
                                                                                                                   <span
                                                                                                                       role="button"
                                                                                                                       onClick={(e) => { e.stopPropagation(); setEditPlanExpiresAt(null); setShowExpiryCalendar(false); }}
                                                                                                                       className="text-muted-foreground hover:text-foreground ml-1"
                                                                                                                   >
                                                                                                                       <X className="w-3.5 h-3.5" />
                                                                                                                   </span>
                                                                                                               )}
                                                                                                           </button>
                                                                                                       </PopoverTrigger>
                                                                                                       <PopoverContent
                                                                                                           className="w-auto p-0 bg-popover border border-border shadow-xl z-50"
                                                                                                           align="start"
                                                                                                           onClick={(e) => e.stopPropagation()}
                                                                                                       >
                                                                                                           <Calendar
                                                                                                               mode="single"
                                                                                                               selected={editPlanExpiresAt ?? undefined}
                                                                                                               onSelect={(d) => { setEditPlanExpiresAt(d ?? null); setShowExpiryCalendar(false); }}
                                                                                                               disabled={{ before: new Date() }}
                                                                                                               initialFocus
                                                                                                           />
                                                                                                       </PopoverContent>
                                                                                                   </Popover>
                                                                                                   <p className="text-[10px] text-muted-foreground/60 mt-0.5">Leave blank for lifetime access. Set a date to auto-downgrade on expiry.</p>
                                                                                               </div>
                                                                                            )}
                                                                                            <div className="space-y-2">
                                                                                                <label className="text-xs font-medium text-muted-foreground/70">Assigned Badges</label>
                                                                                                <div className="flex flex-wrap gap-2 p-3 bg-background rounded-lg border border-border">
                                                                                                    {BADGES.map(badge => {
                                                                                                        const isActive = editBadges.includes(badge.id);
                                                                                                        return (
                                                                                                            <button
                                                                                                                key={badge.id}
                                                                                                                onClick={(e) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    setEditBadges(prev => 
                                                                                                                        isActive ? prev.filter(id => id !== badge.id) : [...prev, badge.id]
                                                                                                                    );
                                                                                                                }}
                                                                                                                className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                                                                                                                    isActive 
                                                                                                                    ? 'bg-primary/30 border border-primary shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                                                                                                                    : 'bg-muted/40 border border-border opacity-50 hover:opacity-100 hover:border-border'
                                                                                                                }`}
                                                                                                                title={badge.name}
                                                                                                            >
                                                                                                                <BadgeIcon badgeId={badge.id} className="w-5 h-5" />
                                                                                                            </button>
                                                                                                        )
                                                                                                    })}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex gap-2 pt-2">
                                                                                                <Button size="sm" variant="outline" className="w-full" onClick={() => setEditingRoleUserId(null)}>Cancel</Button>
                                                                                                <Button size="sm" className="w-full bg-primary hover:bg-primary text-white" disabled={isSavingRole} onClick={() => handleSaveRole(user.id)}>Save</Button>
                                                                                            </div>
                                                                                        </motion.div>
                                                                                    ) : (
                                                                                        <motion.div 
                                                                                            key="viewing"
                                                                                            initial={{ opacity: 0, height: 0 }}
                                                                                            animate={{ opacity: 1, height: 'auto' }}
                                                                                            exit={{ opacity: 0, height: 0 }}
                                                                                            transition={{ duration: 0.2 }}
                                                                                            className="bg-muted/40 border border-border rounded-xl p-4 space-y-2 overflow-hidden"
                                                                                        >
                                                                                            <div className="flex justify-between text-sm">
                                                                                                <span className="text-muted-foreground/70">System Role:</span>
                                                                                                <span className="text-foreground font-medium capitalize">{user.role}</span>
                                                                                            </div>
                                                                                            <div className="flex justify-between text-sm">
                                                                                                <span className="text-muted-foreground/70">Plan/Tier:</span>
                                                                                                <span className="text-emerald-400 font-medium">{user.plan || 'Free'}</span>
                                                                                            </div>
                                                                                            {user.plan !== 'Free' && (
                                                                                                <div className="flex justify-between text-sm border-t border-border/40 pt-1 mt-1">
                                                                                                    <span className="text-muted-foreground/70">Plan Expiry:</span>
                                                                                                    <span className="text-purple-400 font-medium text-xs flex items-center gap-1">
                                                                                                        <CalendarDays className="w-3.5 h-3.5" />
                                                                                                        {user.plan_expires_at
                                                                                                            ? new Date(user.plan_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                                                                            : 'Lifetime / Forever'
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="flex justify-between text-sm">
                                                                                                <span className="text-muted-foreground/70">Joined:</span>
                                                                                                <span className="text-foreground font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
                                                                                            </div>
                                                                                        </motion.div>
                                                                                    )}
                                                                                </AnimatePresence>
                                                                            </div>

                                                                            {/* Actions */}
                                                                            <div className="space-y-4">
                                                                                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">Danger Zone</h4>
                                                                                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
                                                                                    {user.status === 'active' ? (
                                                                                        <Button 
                                                                                            variant="outline" 
                                                                                            className="w-full border-red-500/30 text-red-400 hover:bg-red-500 hover:text-foreground"
                                                                                            onClick={() => handleAction('pause', user.id)}
                                                                                        >
                                                                                            <UserX className="w-4 h-4 mr-2" /> Freeze Account
                                                                                        </Button>
                                                                                    ) : (
                                                                                        <Button 
                                                                                            variant="outline" 
                                                                                            className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-foreground"
                                                                                            onClick={() => handleAction('resume', user.id)}
                                                                                        >
                                                                                            <UserCheck className="w-4 h-4 mr-2" /> Resume Account
                                                                                        </Button>
                                                                                    )}
                                                                                    
                                                                                    <Button 
                                                                                        variant="destructive" 
                                                                                        className="w-full bg-red-600 hover:bg-red-500 text-white"
                                                                                        onClick={() => handleAction('wipe', user.id)}
                                                                                    >
                                                                                        <Trash2 className="w-4 h-4 mr-2" /> Wipe Everything
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Team Members Section */}
                                                                        {user.team_count > 0 && (
                                                                            <div className="mt-8">
                                                                                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                                                                    <Users className="w-4 h-4" /> Team Members & Sub-Accounts
                                                                                </h4>
                                                                                {loadingTeam ? (
                                                                                    <div className="flex justify-center p-8 bg-muted/40 border border-border rounded-xl">
                                                                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                                                    </div>
                                                                                ) : teamMembers.length === 0 ? (
                                                                                    <div className="text-center p-8 bg-muted/40 border border-border rounded-xl text-muted-foreground">
                                                                                        Could not load team members.
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                                        {teamMembers.map(member => (
                                                                                            <div key={member.id} className="bg-muted/40 border border-border rounded-xl p-4 flex gap-4">
                                                                                                {member.avatar_url || member.email || member.username ? (
                                                                                                    <img 
                                                                                                        src={member.avatar_url || getDefaultAvatarUrl(member.email, member.username)} 
                                                                                                        alt="avatar" 
                                                                                                        className="w-10 h-10 rounded-full border border-border object-cover" 
                                                                                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                                                                    />
                                                                                                ) : (
                                                                                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm">
                                                                                                        {(member.username || "?")[0].toUpperCase()}
                                                                                                    </div>
                                                                                                )}
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="flex justify-between items-center mb-1">
                                                                                                        <p className="text-foreground font-medium text-sm truncate">{member.username}</p>
                                                                                                        <Badge className="bg-muted text-foreground/80 text-[10px] px-1.5 py-0">
                                                                                                            {member.role}
                                                                                                        </Badge>
                                                                                                    </div>
                                                                                                    {member.bio ? (
                                                                                                        <p className="text-xs text-muted-foreground line-clamp-1">{member.bio}</p>
                                                                                                    ) : (
                                                                                                        <p className="text-xs text-muted-foreground/70">No bio provided.</p>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Paginated Load More Control */}
                                        {hasMoreUsers && (
                                            <div className="flex justify-center p-4 border-t border-border bg-background/25">
                                                <Button 
                                                    onClick={() => loadUsers(users.length)} 
                                                    disabled={loadingMoreUsers}
                                                    variant="outline"
                                                    className="border-border text-foreground hover:bg-muted font-medium w-full sm:w-auto"
                                                >
                                                    {loadingMoreUsers && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    Load More Developers
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {activeTab === "broadcasts" && (
                            <>
                                {/* Urgent Dashboard Banner settings */}
                                <Card className="bg-muted/40 border-border">
                                    <CardHeader className="pb-3 border-b border-border">
                                        <CardTitle className="text-foreground flex items-center gap-2">
                                            <Bell className="w-5 h-5 text-yellow-500 animate-pulse" /> Urgent Dashboard Ribbon Alert
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Enable a prominent banner at the very top of all developers' portals to warn them of server degraded states, maintenance, or high-priority incidents.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                                            <div>
                                                <h3 className="text-foreground font-medium mb-1">Status Switch</h3>
                                                <p className="text-sm text-muted-foreground font-sans">Toggle user portal dashboard-wide alert ribbon.</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge className={dashboardBannerActive ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-muted text-muted-foreground border-border"}>
                                                    Status: {dashboardBannerActive ? "Visible" : "Hidden"}
                                                </Badge>
                                                <Button 
                                                    onClick={() => setDashboardBannerActive(!dashboardBannerActive)}
                                                    variant="outline"
                                                    className="border-border text-foreground hover:bg-muted"
                                                >
                                                    {dashboardBannerActive ? "Disable Alert" : "Enable Alert"}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-sm font-medium text-muted-foreground">Alert Message Text</label>
                                                <Input
                                                    placeholder="e.g. Stripe is experiencing payments degradation. Re-verification might take up to 5 minutes."
                                                    value={dashboardBannerText}
                                                    onChange={(e) => setDashboardBannerText(e.target.value)}
                                                    className="bg-background border-border text-foreground"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-muted-foreground">Ribbon Severity Theme</label>
                                                <Select value={dashboardBannerTheme} onValueChange={setDashboardBannerTheme}>
                                                    <SelectTrigger className="w-full bg-background border-border text-foreground h-10">
                                                        <SelectValue placeholder="Info (Blue)" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-background border-border text-foreground">
                                                        <SelectItem value="info">Info (Blue)</SelectItem>
                                                        <SelectItem value="warning">Warning (Yellow)</SelectItem>
                                                        <SelectItem value="critical">Critical (Red)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <Button 
                                                onClick={() => handleSaveSettings({
                                                    dashboard_banner_active: dashboardBannerActive ? 1 : 0,
                                                    dashboard_banner_text: dashboardBannerText,
                                                    dashboard_banner_theme: dashboardBannerTheme
                                                }, "Urgent dashboard banner configurations saved.")} 
                                                disabled={savingSettings || loading}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                            >
                                                {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Save Banner Settings
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Announcements Management */}
                                <Card className="bg-muted/40 border-border">
                                    <CardHeader className="pb-3 border-b border-border">
                                        <CardTitle className="text-foreground flex items-center gap-2">
                                            <Megaphone className="w-5 h-5 text-primary" /> Platform Announcements
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Publish, broadcast, or remove platform-wide announcements for all users.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Create Announcement Form */}
                                            <div className="space-y-4 bg-background/50 p-5 rounded-xl border border-border">
                                                <h3 className="text-foreground font-semibold text-lg">New Announcement</h3>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Announcement Title</label>
                                                    <Input 
                                                        placeholder="e.g. Scheduled Maintenance, New Features Released"
                                                        value={newTitle}
                                                        onChange={e => setNewTitle(e.target.value)}
                                                        className="bg-background border-border text-foreground"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                                                    <Select value={newType} onValueChange={setNewType}>
                                                        <SelectTrigger className="w-full bg-background border-border text-foreground h-10">
                                                             <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-background border-border text-foreground">
                                                            <SelectItem value="Information">Information</SelectItem>
                                                            <SelectItem value="Update">Update</SelectItem>
                                                            <SelectItem value="Critical">Critical</SelectItem>
                                                            <SelectItem value="Complete">Complete (Fix)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Announcement Content</label>
                                                    <textarea
                                                        placeholder="Type the message body here... Markdown is supported."
                                                        value={newContent}
                                                        onChange={e => setNewContent(e.target.value)}
                                                        className="w-full h-32 rounded-md bg-background border border-border text-foreground p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    />
                                                </div>
                                                <div className="flex justify-end pt-2">
                                                    <Button 
                                                        onClick={handlePublishAnnouncement}
                                                        disabled={publishing || !newTitle.trim() || !newContent.trim()}
                                                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all font-medium"
                                                    >
                                                        {publishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        Publish Announcement
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Announcements List */}
                                            <div className="space-y-4">
                                                <h3 className="text-foreground font-semibold text-lg flex items-center justify-between">
                                                    <span>Active Broadcasts</span>
                                                    <Badge className="bg-primary/10 text-primary border border-primary/20">
                                                        {announcements.length} Published
                                                    </Badge>
                                                </h3>

                                                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                                                    {loadingAnnouncements ? (
                                                        <div className="flex justify-center p-8">
                                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                        </div>
                                                    ) : announcements.length === 0 ? (
                                                        <div className="text-center p-8 bg-background/30 border border-border rounded-xl text-muted-foreground text-sm">
                                                            No active announcements.
                                                        </div>
                                                    ) : (
                                                        announcements.map((ann) => (
                                                            <div key={ann.id} className="bg-background/50 border border-border rounded-xl p-4 flex justify-between gap-4">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <h4 className="text-foreground font-semibold text-sm truncate">{ann.title}</h4>
                                                                        <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-4 border ${
                                                                            ann.type === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                            ann.type === 'Update' ? 'bg-primary/10 text-primary border-primary/20' :
                                                                            ann.type === 'Complete' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                            'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                                        }`}>
                                                                            {ann.type || 'Information'}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground/70 mb-2">{new Date(ann.created_at).toLocaleString()}</p>
                                                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{ann.content}</p>
                                                                </div>
                                                                <div className="flex items-start">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                                        onClick={() => handleDeleteAnnouncement(ann.id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {activeTab === "marketing" && (
                            <>
                                {/* Landing page ribbon top banner */}
                                <Card className="bg-muted/40 border-border">
                                    <CardHeader className="pb-3 border-b border-border">
                                        <CardTitle className="text-foreground flex items-center gap-2">
                                            <Settings2 className="w-5 h-5 text-primary" /> Landing Page Top Announcement Banner
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Manage the micro-announcement ribbon visible at the top of the homepage (e.g. "OAuth providers now live").
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                                            <div>
                                                <h3 className="text-foreground font-medium mb-1">Banner Ribbon State</h3>
                                                <p className="text-sm text-muted-foreground">Toggle the ribbon announcement visible to all guests.</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge className={bannerActive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"}>
                                                    Status: {bannerActive ? "Active" : "Disabled"}
                                                </Badge>
                                                <Button 
                                                    onClick={() => setBannerActive(!bannerActive)}
                                                    variant="outline"
                                                    className="border-border text-foreground hover:bg-muted"
                                                >
                                                    {bannerActive ? "Pause Banner" : "Activate Banner"}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-muted-foreground">Badge Label</label>
                                                <Input
                                                    placeholder="e.g. New"
                                                    value={bannerBadge}
                                                    onChange={(e) => setBannerBadge(e.target.value)}
                                                    className="bg-background border-border text-foreground"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-muted-foreground">Redirect Link Destination URL</label>
                                                <Input
                                                    placeholder="e.g. /pricing or https://discord.gg/invite"
                                                    value={bannerLink}
                                                    onChange={(e) => setBannerLink(e.target.value)}
                                                    className="bg-background border-border text-foreground"
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-sm font-medium text-muted-foreground">Ribbon Text Message</label>
                                                <Input
                                                    placeholder="OAuth providers are now active and ready"
                                                    value={bannerText}
                                                    onChange={(e) => setBannerText(e.target.value)}
                                                    className="bg-background border-border text-foreground"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <Button 
                                                onClick={() => handleSaveSettings({
                                                    banner_active: bannerActive ? 1 : 0,
                                                    banner_badge: bannerBadge,
                                                    banner_text: bannerText,
                                                    banner_link: bannerLink,
                                                    banner_theme: bannerTheme
                                                }, "Homepage ribbon banner configuration successfully saved.")} 
                                                disabled={savingSettings || loading}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                            >
                                                {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Save Micro-Banner
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Landing Page Stats Strip */}
                                <Card className="bg-muted/40 border-border">
                                    <CardHeader className="pb-3 border-b border-border">
                                        <CardTitle className="text-foreground flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-primary" /> Landing Page Hero Stats Override
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Configure whether the homepage hero statistics strip displays live real-time database totals or manually customized marketing content.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                                            <div>
                                                <h3 className="text-foreground font-medium mb-1">Ecosystem Statistics Mode</h3>
                                                <p className="text-sm text-muted-foreground">Control real-time counters vs custom promotional tags.</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge className={statRealtime ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}>
                                                    Mode: {statRealtime ? "Real-time Counts" : "Manual Overrides"}
                                                </Badge>
                                                <Button 
                                                    onClick={() => setStatRealtime(!statRealtime)}
                                                    variant="outline"
                                                    className="border-border text-foreground hover:bg-muted"
                                                >
                                                    {statRealtime ? "Switch to Manual" : "Switch to Real-time"}
                                                </Button>
                                            </div>
                                        </div>

                                        {!statRealtime && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border/80 bg-background/30 rounded-xl">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Stat 1 Value</label>
                                                    <Input placeholder="4 lines" value={statOverride1Val} onChange={e => setStatOverride1Val(e.target.value)} className="bg-background" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Stat 1 Description Label</label>
                                                    <Input placeholder="to secure software" value={statOverride1Lbl} onChange={e => setStatOverride1Lbl(e.target.value)} className="bg-background" />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Stat 2 Value</label>
                                                    <Input placeholder="~2 min" value={statOverride2Val} onChange={e => setStatOverride2Val(e.target.value)} className="bg-background" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Stat 2 Description Label</label>
                                                    <Input placeholder="to generate licenses" value={statOverride2Lbl} onChange={e => setStatOverride2Lbl(e.target.value)} className="bg-background" />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Stat 3 Value</label>
                                                    <Input placeholder="100%" value={statOverride3Val} onChange={e => setStatOverride3Val(e.target.value)} className="bg-background" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Stat 3 Description Label</label>
                                                    <Input placeholder="HWID enforcement" value={statOverride3Lbl} onChange={e => setStatOverride3Lbl(e.target.value)} className="bg-background" />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Stat 4 Value</label>
                                                    <Input placeholder="0" value={statOverride4Val} onChange={e => setStatOverride4Val(e.target.value)} className="bg-background" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Stat 4 Description Label</label>
                                                    <Input placeholder="leaked passwords" value={statOverride4Lbl} onChange={e => setStatOverride4Lbl(e.target.value)} className="bg-background" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-2">
                                            <Button 
                                                onClick={() => handleSaveSettings({
                                                    stat_realtime: statRealtime ? 1 : 0,
                                                    stat_override_1_val: statOverride1Val,
                                                    stat_override_1_lbl: statOverride1Lbl,
                                                    stat_override_2_val: statOverride2Val,
                                                    stat_override_2_lbl: statOverride2Lbl,
                                                    stat_override_3_val: statOverride3Val,
                                                    stat_override_3_lbl: statOverride3Lbl,
                                                    stat_override_4_val: statOverride4Val,
                                                    stat_override_4_lbl: statOverride4Lbl
                                                }, "Hero section analytics configuration updated.")} 
                                                disabled={savingSettings || loading}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                            >
                                                {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Save Hero Overrides
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Dynamic Releases CMS */}
                                <Card className="bg-muted/40 border-border">
                                    <CardHeader className="pb-3 border-b border-border">
                                        <CardTitle className="text-foreground flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-primary" /> Chronological Release Log Manager
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Create, edit, or delete platform release logs that render dynamically in /changelog route.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Create Entry Form */}
                                            <div className="space-y-4 bg-background/50 p-5 rounded-xl border border-border">
                                                <h3 className="text-foreground font-semibold text-lg">Publish Release Notes</h3>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-muted-foreground">Version Tag</label>
                                                        <Input 
                                                            placeholder="e.g. v1.2.0"
                                                            value={newChangelogVersion}
                                                            onChange={e => setNewChangelogVersion(e.target.value)}
                                                            className="bg-background"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-muted-foreground">Date Label</label>
                                                        <Input 
                                                            placeholder="e.g. July 10, 2026"
                                                            value={newChangelogDate}
                                                            onChange={e => setNewChangelogDate(e.target.value)}
                                                            className="bg-background"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Release Headline Title</label>
                                                    <Input 
                                                        placeholder="e.g. Stability Updates & Security patches"
                                                        value={newChangelogTitle}
                                                        onChange={e => setNewChangelogTitle(e.target.value)}
                                                        className="bg-background"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">General Summary Description</label>
                                                    <textarea
                                                        placeholder="Brief overview of changes..."
                                                        value={newChangelogDescription}
                                                        onChange={e => setNewChangelogDescription(e.target.value)}
                                                        className="w-full h-20 rounded-md bg-background border border-border text-foreground p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    />
                                                </div>

                                                {/* Changelog Bullet Creator */}
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Release Change Log Bullet Points</label>
                                                    <div className="flex gap-2">
                                                        <Input 
                                                            placeholder="Add specific detail point..."
                                                            value={newBulletText}
                                                            onChange={e => setNewBulletText(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChangelogBullet())}
                                                            className="bg-background"
                                                        />
                                                        <Button onClick={handleAddChangelogBullet} variant="outline" className="border-border text-foreground hover:bg-muted">
                                                            <Plus className="w-4.5 h-4.5" />
                                                        </Button>
                                                    </div>
                                                    
                                                    {newChangelogBullets.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 p-2 bg-background border border-border rounded-lg mt-2 max-h-[120px] overflow-y-auto">
                                                            {newChangelogBullets.map((bullet, idx) => (
                                                                <Badge key={idx} variant="secondary" className="pr-1.5 py-0.5 flex items-center gap-1.5 text-xs text-muted-foreground font-sans">
                                                                    <span className="truncate max-w-[180px]">{bullet}</span>
                                                                    <button onClick={() => handleRemoveChangelogBullet(idx)} className="text-red-500 hover:text-red-400 p-0.5 rounded-full hover:bg-red-500/10">
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-end pt-2">
                                                    <Button 
                                                        onClick={handlePublishChangelog}
                                                        disabled={isSavingChangelog || !newChangelogVersion.trim() || !newChangelogTitle.trim()}
                                                        className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium"
                                                    >
                                                        {isSavingChangelog && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        Publish Release
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Historical Logs List */}
                                            <div className="space-y-4">
                                                <h3 className="text-foreground font-semibold text-lg">Historical Logs</h3>
                                                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                                                    {loadingChangelog ? (
                                                        <div className="flex justify-center p-8">
                                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                        </div>
                                                    ) : changelog.length === 0 ? (
                                                        <div className="text-center p-8 bg-background/30 border border-border rounded-xl text-muted-foreground text-sm">
                                                            No database release logs found. Falls back to frontend JSON array.
                                                        </div>
                                                    ) : (
                                                        changelog.map((entry) => (
                                                            <div key={entry.id} className="bg-background/50 border border-border rounded-xl p-4 flex justify-between gap-4 hover:border-border/85 transition-colors">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <Badge className="bg-primary/10 text-primary border border-primary/20">{entry.version}</Badge>
                                                                        <h4 className="text-foreground font-semibold text-sm truncate">{entry.title}</h4>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground/60 mb-2">{entry.release_date || entry.releaseDate}</p>
                                                                    <p className="text-xs text-muted-foreground/80 mb-2">{entry.description}</p>
                                                                    
                                                                    {Array.isArray(entry.changes) && entry.changes.length > 0 && (
                                                                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                                                                            {entry.changes.map((c: string, cIdx: number) => (
                                                                                <li key={cIdx} className="truncate">{c}</li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-start">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                                        onClick={() => handleDeleteChangelog(entry.id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {activeTab === "pricing" && (
                            <>
                                {/* Billing & Payment Gateways Configuration */}
                                <Card className="bg-muted/40 border-border">
                                    <CardHeader className="pb-3 border-b border-border">
                                        <CardTitle className="text-foreground flex items-center gap-2">
                                            <Settings2 className="w-5 h-5 text-primary" /> Billing & Payment Gateways
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Enable or disable payment gateways and configure their credentials, prices, and personal Pay IDs.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        {/* Gateway Status Toggles */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gateway Statuses</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Binance Switch Card */}
                                                <div 
                                                    onClick={handleToggleBinanceEnabled}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all select-none cursor-pointer ${
                                                        binanceEnabled 
                                                            ? "bg-yellow-500/5 border-yellow-500/40 shadow-lg shadow-yellow-500/5" 
                                                            : "bg-background/40 border-border hover:border-border/80"
                                                    }`}
                                                >
                                                    <div className="flex flex-col pr-2">
                                                        <span className="text-sm font-semibold text-foreground">Binance Pay</span>
                                                        <span className="text-[11px] text-muted-foreground mt-0.5">Manual USDT ID & QR transfers</span>
                                                    </div>
                                                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${binanceEnabled ? "bg-yellow-500" : "bg-muted-foreground/30"}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform duration-200 ${binanceEnabled ? "translate-x-4" : "translate-x-0"}`} />
                                                    </div>
                                                </div>

                                                {/* Razorpay Switch Card (Primary) */}
                                                <div 
                                                    onClick={handleToggleRazorpayEnabled}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all select-none cursor-pointer ${
                                                        razorpayEnabled 
                                                            ? "bg-sky-500/5 border-sky-500/40 shadow-lg shadow-sky-500/5" 
                                                            : "bg-background/40 border-border hover:border-border/80"
                                                    }`}
                                                >
                                                    <div className="flex flex-col pr-2">
                                                        <span className="text-sm font-semibold text-foreground">Razorpay (Primary)</span>
                                                        <span className="text-[11px] text-muted-foreground mt-0.5">UPI / cards / netbanking (auto verify)</span>
                                                    </div>
                                                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${razorpayEnabled ? "bg-sky-500" : "bg-muted-foreground/30"}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform duration-200 ${razorpayEnabled ? "translate-x-4" : "translate-x-0"}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gateway Maintenance Toggles */}
                                        <div className="space-y-3 pt-2">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gateway Maintenance Modes</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Binance Maintenance Switch Card */}
                                                <div 
                                                    onClick={handleToggleBinanceMaintenance}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all select-none cursor-pointer ${
                                                        binanceMaintenance 
                                                            ? "bg-red-500/5 border-red-500/40 shadow-lg shadow-red-500/5" 
                                                            : "bg-background/40 border-border hover:border-border/80"
                                                    }`}
                                                >
                                                    <div className="flex flex-col pr-2">
                                                        <span className="text-sm font-semibold text-foreground">Binance Maintenance</span>
                                                        <span className="text-[11px] text-muted-foreground mt-0.5">Show "Coming Soon" & block API verification</span>
                                                    </div>
                                                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${binanceMaintenance ? "bg-red-500" : "bg-muted-foreground/30"}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform duration-200 ${binanceMaintenance ? "translate-x-4" : "translate-x-0"}`} />
                                                    </div>
                                                </div>

                                                {/* Razorpay Maintenance Switch Card */}
                                                <div 
                                                    onClick={handleToggleRazorpayMaintenance}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all select-none cursor-pointer ${
                                                        razorpayMaintenance 
                                                            ? "bg-red-500/5 border-red-500/40 shadow-lg shadow-red-500/5" 
                                                            : "bg-background/40 border-border hover:border-border/80"
                                                    }`}
                                                >
                                                    <div className="flex flex-col pr-2">
                                                        <span className="text-sm font-semibold text-foreground">Razorpay Maintenance</span>
                                                        <span className="text-[11px] text-muted-foreground mt-0.5">Show "Coming Soon" & block checkout</span>
                                                    </div>
                                                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${razorpayMaintenance ? "bg-red-500" : "bg-muted-foreground/30"}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform duration-200 ${razorpayMaintenance ? "translate-x-4" : "translate-x-0"}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Binance Pay Settings Section */}
                                        {binanceEnabled && (
                                            <div className="border border-border/60 rounded-xl bg-background/20 mt-4 overflow-hidden">
                                                <div 
                                                    className="p-4 cursor-pointer hover:bg-muted/10 transition-colors flex items-center justify-between select-none"
                                                    onClick={() => setBinanceConfigExpanded(!binanceConfigExpanded)}
                                                >
                                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-yellow-500" /> Binance Personal Gateway
                                                    </h3>
                                                    <div className="p-1 rounded-md hover:bg-muted transition-colors">
                                                        {binanceConfigExpanded ? <ChevronUp className="w-4.5 h-4.5 text-muted-foreground" /> : <ChevronDown className="w-4.5 h-4.5 text-muted-foreground" />}
                                                    </div>
                                                </div>
                                                <AnimatePresence initial={false}>
                                                    {binanceConfigExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                                            style={{ overflow: "hidden" }}
                                                        >
                                                            <div className="p-4 pt-0 border-t border-border/30 space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                                                    <div className="space-y-2">
                                                                        <label className="text-sm font-medium text-muted-foreground">Binance Pay ID / User ID</label>
                                                                        <Input
                                                                            placeholder="Enter your Binance Pay ID"
                                                                            value={binancePayId}
                                                                            onChange={(e) => setBinancePayId(e.target.value)}
                                                                            className="bg-background border-border text-foreground"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <label className="text-sm font-medium text-muted-foreground">QR Code Image URL</label>
                                                                        <Input
                                                                            placeholder="https://example.com/binance-qr.png"
                                                                            value={binanceQrCodeUrl}
                                                                            onChange={(e) => setBinanceQrCodeUrl(e.target.value)}
                                                                            className="bg-background border-border text-foreground"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <label className="text-sm font-medium text-muted-foreground">Binance API Key (Read-Only)</label>
                                                                        <Input
                                                                            placeholder="Binance API Key"
                                                                            value={binanceApiKey}
                                                                            onChange={(e) => setBinanceApiKey(e.target.value)}
                                                                            className="bg-background border-border text-foreground"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <label className="text-sm font-medium text-muted-foreground">Binance Secret Key</label>
                                                                        <Input
                                                                            type="password"
                                                                            placeholder="Binance Secret Key"
                                                                            value={binanceApiSecret}
                                                                            onChange={(e) => setBinanceApiSecret(e.target.value)}
                                                                            className="bg-background border-border text-foreground blur-sm hover:blur-none focus:blur-none transition-all duration-300"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-2">
                                            <Button 
                                                onClick={() => handleSaveSettings({
                                                    binance_pay_id: binancePayId,
                                                    binance_qr_code_url: binanceQrCodeUrl,
                                                    binance_api_key: binanceApiKey,
                                                    binance_api_secret: binanceApiSecret
                                                }, "Payment gateway credentials updated successfully.")} 
                                                disabled={savingSettings || loading}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                            >
                                                {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Save Gateway Credentials
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Pricing Plans Customization Editor Card */}
                                <Card className="bg-muted/40 border-border mt-6">
                                    <CardHeader className="pb-3 border-b border-border">
                                        <CardTitle className="text-foreground flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-primary" /> Pricing Plans Customization
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Customize the display prices, taglines, billing modes, and feature lists shown on the public pricing page.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        {/* Billing Modes Configuration */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Billing Periods</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Monthly Enabled Switch Card */}
                                                <div 
                                                    onClick={() => setPricingMonthlyEnabled(prev => !prev)}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all select-none cursor-pointer ${
                                                        pricingMonthlyEnabled 
                                                            ? "bg-primary/5 border-primary/40 shadow-lg shadow-primary/5" 
                                                            : "bg-background/40 border-border hover:border-border/80"
                                                    }`}
                                                >
                                                    <div className="flex flex-col pr-2">
                                                        <span className="text-sm font-semibold text-foreground">Monthly Billing Mode</span>
                                                        <span className="text-[11px] text-muted-foreground mt-0.5">Allow users to pay month-to-month</span>
                                                    </div>
                                                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${pricingMonthlyEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform duration-200 ${pricingMonthlyEnabled ? "translate-x-4" : "translate-x-0"}`} />
                                                    </div>
                                                </div>

                                                {/* Yearly Enabled Switch Card */}
                                                <div 
                                                    onClick={() => setPricingYearlyEnabled(prev => !prev)}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all select-none cursor-pointer ${
                                                        pricingYearlyEnabled 
                                                            ? "bg-primary/5 border-primary/40 shadow-lg shadow-primary/5" 
                                                            : "bg-background/40 border-border hover:border-border/80"
                                                    }`}
                                                >
                                                    <div className="flex flex-col pr-2">
                                                        <span className="text-sm font-semibold text-foreground">Yearly Billing Mode</span>
                                                        <span className="text-[11px] text-muted-foreground mt-0.5">Allow users to pay annually (e.g. discounted)</span>
                                                    </div>
                                                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${pricingYearlyEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}>
                                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform duration-200 ${pricingYearlyEnabled ? "translate-x-4" : "translate-x-0"}`} />
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Yearly Discount Badge input */}
                                            {pricingYearlyEnabled && (
                                                <div className="space-y-2 mt-4 max-w-sm">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Yearly Discount Badge Text</label>
                                                    <Input 
                                                        value={pricingDiscountBadge} 
                                                        onChange={(e) => setPricingDiscountBadge(e.target.value)} 
                                                        placeholder="e.g. Save up to 70%"
                                                        className="bg-background border-border text-foreground" 
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Free Plan Column */}
                                            <div className="space-y-4 p-4 border border-border/60 rounded-xl bg-background/25">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-sm text-foreground">Free Plan</h4>
                                                    <Badge className="bg-muted text-foreground border border-border">Tier 1</Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground">Display Price</label>
                                                    <Input value={freePrice} onChange={(e) => setFreePrice(e.target.value)} className="bg-background border-border" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground">Billing Period Label</label>
                                                    <Input value={freePeriod} onChange={(e) => setFreePeriod(e.target.value)} className="bg-background border-border" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground">Tagline Description</label>
                                                    <Input value={freeDesc} onChange={(e) => setFreeDesc(e.target.value)} className="bg-background border-border" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground">Features (One per line)</label>
                                                    <Textarea value={freeFeatures} onChange={(e) => setFreeFeatures(e.target.value)} rows={6} className="bg-background border-border text-xs leading-relaxed" />
                                                </div>
                                                <div className="flex items-center gap-2 pt-2">
                                                    <input type="checkbox" id="freeFeatured" checked={freeFeatured} onChange={(e) => {
                                                        setFreeFeatured(e.target.checked);
                                                        if (e.target.checked) {
                                                            setDevFeatured(false);
                                                            setSellerFeatured(false);
                                                        }
                                                    }} className="accent-primary h-4 w-4 rounded" />
                                                    <label htmlFor="freeFeatured" className="text-xs font-medium text-foreground cursor-pointer select-none">Mark as Featured</label>
                                                </div>
                                            </div>

                                            {/* Developer Plan Column */}
                                            <div className="space-y-4 p-4 border border-border/60 rounded-xl bg-background/25">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-sm text-foreground">Developer Plan</h4>
                                                    <Badge className="bg-primary/20 text-primary border border-primary/30">Tier 2</Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground">Tagline Description</label>
                                                    <Input value={devDesc} onChange={(e) => setDevDesc(e.target.value)} className="bg-background border-border" />
                                                </div>
                                                <div className="border border-border/40 p-3 rounded-lg space-y-3 bg-background/20">
                                                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">Monthly Option</span>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-muted-foreground">Price</label>
                                                            <Input value={devPriceMonthly} onChange={(e) => setDevPriceMonthly(e.target.value)} className="bg-background border-border h-8 text-xs" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-muted-foreground">Original Price</label>
                                                            <Input value={devOriginalPriceMonthly} onChange={(e) => setDevOriginalPriceMonthly(e.target.value)} className="bg-background border-border h-8 text-xs" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="border border-border/40 p-3 rounded-lg space-y-3 bg-background/20">
                                                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">Yearly Option</span>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-muted-foreground">Price</label>
                                                            <Input value={devPriceYearly} onChange={(e) => setDevPriceYearly(e.target.value)} className="bg-background border-border h-8 text-xs" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-muted-foreground">Original Price</label>
                                                            <Input value={devOriginalPriceYearly} onChange={(e) => setDevOriginalPriceYearly(e.target.value)} className="bg-background border-border h-8 text-xs" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground">Features (One per line)</label>
                                                    <Textarea value={devFeatures} onChange={(e) => setDevFeatures(e.target.value)} rows={6} className="bg-background border-border text-xs leading-relaxed" />
                                                </div>
                                                <div className="flex items-center gap-2 pt-2">
                                                    <input type="checkbox" id="devFeatured" checked={devFeatured} onChange={(e) => {
                                                        setDevFeatured(e.target.checked);
                                                        if (e.target.checked) {
                                                            setFreeFeatured(false);
                                                            setSellerFeatured(false);
                                                        }
                                                    }} className="accent-primary h-4 w-4 rounded" />
                                                    <label htmlFor="devFeatured" className="text-xs font-medium text-foreground cursor-pointer select-none">Mark as Featured</label>
                                                </div>
                                            </div>

                                            {/* Seller Plan Column */}
                                            <div className="space-y-4 p-4 border border-border/60 rounded-xl bg-background/25">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-sm text-foreground">Seller Plan</h4>
                                                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Tier 3</Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground">Tagline Description</label>
                                                    <Input value={sellerDesc} onChange={(e) => setSellerDesc(e.target.value)} className="bg-background border-border" />
                                                </div>
                                                <div className="border border-border/40 p-3 rounded-lg space-y-3 bg-background/20">
                                                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Monthly Option</span>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-muted-foreground">Price</label>
                                                            <Input value={sellerPriceMonthly} onChange={(e) => setSellerPriceMonthly(e.target.value)} className="bg-background border-border h-8 text-xs" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-muted-foreground">Original Price</label>
                                                            <Input value={sellerOriginalPriceMonthly} onChange={(e) => setSellerOriginalPriceMonthly(e.target.value)} className="bg-background border-border h-8 text-xs" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="border border-border/40 p-3 rounded-lg space-y-3 bg-background/20">
                                                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Yearly Option</span>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-muted-foreground">Price</label>
                                                            <Input value={sellerPriceYearly} onChange={(e) => setSellerPriceYearly(e.target.value)} className="bg-background border-border h-8 text-xs" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-muted-foreground">Original Price</label>
                                                            <Input value={sellerOriginalPriceYearly} onChange={(e) => setSellerOriginalPriceYearly(e.target.value)} className="bg-background border-border h-8 text-xs" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground">Features (One per line)</label>
                                                    <Textarea value={sellerFeatures} onChange={(e) => setSellerFeatures(e.target.value)} rows={6} className="bg-background border-border text-xs leading-relaxed" />
                                                </div>
                                                <div className="flex items-center gap-2 pt-2">
                                                    <input type="checkbox" id="sellerFeatured" checked={sellerFeatured} onChange={(e) => {
                                                        setSellerFeatured(e.target.checked);
                                                        if (e.target.checked) {
                                                            setFreeFeatured(false);
                                                            setDevFeatured(false);
                                                        }
                                                    }} className="accent-primary h-4 w-4 rounded" />
                                                    <label htmlFor="sellerFeatured" className="text-xs font-medium text-foreground cursor-pointer select-none">Mark as Featured</label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4 border-t border-border/50">
                                            <Button 
                                                onClick={handleSavePricingCustomization}
                                                disabled={savingSettings || loading}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                            >
                                                {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Save Pricing Display Customization
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {activeTab === "infra" && (
                            <>
                                {/* Global Developer signups locker */}
                                <Card className="bg-muted/40 border-border">
                                    <CardHeader className="pb-3 border-b border-border">
                                        <CardTitle className="text-foreground flex items-center gap-2">
                                            <Settings2 className="w-5 h-5 text-primary" /> Signups & Platform Registrations
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Allow or block new developers from signing up to the platform.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                                            <div>
                                                <h3 className="text-foreground font-medium mb-1">Developer Registrations</h3>
                                                <p className="text-sm text-muted-foreground font-sans">Toggle platform signups window.</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge className={platformSettings.registration_paused ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"}>
                                                    Status: {platformSettings.registration_paused ? "Paused" : "Open"}
                                                </Badge>
                                                <Button 
                                                    onClick={handleToggleRegistration} 
                                                    disabled={savingSettings || loading}
                                                    variant="outline"
                                                    className="border-border text-foreground hover:bg-muted"
                                                >
                                                    {platformSettings.registration_paused ? "Resume Signups" : "Pause Signups"}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-6 border-t border-border pt-6 space-y-4">
                                            <div>
                                                <h3 className="text-foreground font-medium mb-1">Support & Branding Contact</h3>
                                                <p className="text-sm text-muted-foreground mb-4">Set the support contact email and official Discord server invitation link.</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Contact Email</label>
                                                    <Input
                                                        placeholder="business@dexterauth.com"
                                                        value={editContactEmail}
                                                        onChange={(e) => setEditContactEmail(e.target.value)}
                                                        className="bg-background border-border text-foreground"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Discord Invite URL</label>
                                                    <Input
                                                        placeholder="https://discord.gg/fnbuFSDjqJ"
                                                        value={editDiscordInvite}
                                                        onChange={(e) => setEditDiscordInvite(e.target.value)}
                                                        className="bg-background border-border text-foreground"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-2">
                                                <Button 
                                                    onClick={() => handleSaveSettings({ contact_email: editContactEmail, discord_invite: editDiscordInvite }, "Support and contact branding settings updated.")} 
                                                    disabled={savingSettings || loading}
                                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                                >
                                                    {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    Update Support Info
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Cloudflare Domains Setup */}
                                <Card className="bg-muted/40 border-border">
                                    <CardHeader 
                                        className="pb-3 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => setCfExpanded(!cfExpanded)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-foreground flex items-center gap-2">
                                                    <Globe className="w-5 h-5 text-orange-500" /> Professional Domain Integration
                                                </CardTitle>
                                                <CardDescription className="text-muted-foreground">
                                                    Mask your Pterodactyl IP behind Cloudflare with Free SSL, CDN, and DDoS Protection.
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {platformSettings.cloudflare_domain && (
                                                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 text-sm font-medium">
                                                        Linked: {platformSettings.cloudflare_domain}
                                                    </Badge>
                                                )}
                                                {cfExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <AnimatePresence>
                                        {cfExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <CardContent className="pt-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Cloudflare API Token</label>
                                                                <Input 
                                                                    type="password"
                                                                    placeholder="Enter your Cloudflare API Token..." 
                                                                    value={cfToken}
                                                                    onChange={e => setCfToken(e.target.value)}
                                                                    className="bg-background border-border text-foreground blur-sm hover:blur-none focus:blur-none transition-all duration-300"
                                                                />
                                                                <p className="text-xs text-muted-foreground/70 mt-1">Requires <b>Zone {'>'} DNS {'>'} Edit</b> and <b>Zone {'>'} Origin Rules {'>'} Edit</b> permissions.</p>
                                                            </div>
                                                            <div>
                                                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Full Domain Name</label>
                                                                <Input 
                                                                    placeholder="dexterauth.com"
                                                                    value={cfDomain}
                                                                    onChange={e => setCfDomain(e.target.value)}
                                                                    className="bg-background border-border text-foreground"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Pterodactyl Node IP</label>
                                                                <Input 
                                                                    placeholder="82.197.70.119" 
                                                                    value={cfIp}
                                                                    onChange={e => setCfIp(e.target.value)}
                                                                    className="bg-background border-border text-foreground font-mono"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Pterodactyl Node Port</label>
                                                                <Input 
                                                                    placeholder="27047" 
                                                                    type="number"
                                                                    value={cfPort}
                                                                    onChange={e => setCfPort(e.target.value)}
                                                                    className="bg-background border-border text-foreground font-mono"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-6 flex justify-end gap-3">
                                                        {platformSettings.cloudflare_domain && (
                                                            <Button 
                                                                onClick={handleUnlinkCloudflare} 
                                                                disabled={unlinkingCf || linkingCf}
                                                                variant="outline"
                                                                className="border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                                                            >
                                                                {unlinkingCf && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                                {unlinkingCf ? "Unlinking..." : "Unlink Domain"}
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            onClick={handleLinkCloudflare} 
                                                            disabled={linkingCf || unlinkingCf}
                                                            className="bg-orange-500 hover:bg-orange-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all"
                                                        >
                                                            {linkingCf && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                            {linkingCf ? "Provisioning..." : (platformSettings.cloudflare_domain ? "Update Link" : "Link Domain via Cloudflare")}
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
