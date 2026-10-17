import { useState, useEffect } from "react";
import { User, Mail, Lock, Image as ImageIcon, CheckCircle2, Calendar, RefreshCw, AlertTriangle, Eye, EyeOff, Copy, Check, CreditCard, Crown, QrCode, Sparkles, X, ExternalLink, Loader2, LogOut } from "lucide-react";
import { BadgeIcon } from "../components/Badges";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { motion } from "motion/react";
import { devApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useDialog } from "../hooks/use-dialog";
import { getOptimizedImageUrl, getDefaultAvatarUrl } from "../lib/utils";
import ShinyText from "../components/ui/shiny-text";
import GradientText from "../components/ui/gradient-text";
import { useNavigate } from "react-router-dom";
import { Switch } from "../components/ui/switch";
import { AvatarSwitcher } from "../components/ui/AvatarSwitcher";

interface ProfileProps {
    profile: any;
    setProfile: (p: any) => void;
}

export default function Profile({ profile, setProfile }: ProfileProps) {
    const navigate = useNavigate();
    const [displayName, setDisplayName] = useState(profile.display_name || "");
    const [username, setUsername] = useState(profile.username || "");
    const [email, setEmail] = useState(profile.email || "");
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
    const [bannerUrl, setBannerUrl] = useState(profile.banner_url || "");
    const [bio, setBio] = useState(profile.bio || "");
    const [password, setPassword] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { confirm, prompt } = useDialog();
    const { logout } = useAuth();

    // Sync form fields when profile prop updates (e.g. loaded asynchronously by parent)
    useEffect(() => {
        setDisplayName(profile.display_name || "");
        setUsername(profile.username || "");
        setEmail(profile.email || "");
        setAvatarUrl(profile.avatar_url || "");
        setBannerUrl(profile.banner_url || "");
        setBio(profile.bio || "");
    }, [profile.id, profile.avatar_url, profile.banner_url, profile.display_name, profile.username, profile.email, profile.bio]);


    const [billingLoading, setBillingLoading] = useState(false);
    const [showBillingModal, setShowBillingModal] = useState(false);
    const [billingHistory, setBillingHistory] = useState<any>(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    const handleOpenBillingModal = async () => {
        setShowBillingModal(true);
        try {
            setHistoryLoading(true);
            const res = await devApi.getPaymentHistory();
            if (res.status === "success" && res.data) {
                setBillingHistory(res.data);
            }
        } catch (e: any) {
            toast.error("Failed to load billing history.");
        } finally {
            setHistoryLoading(false);
        }
    };

    const [discordLinked, setDiscordLinked] = useState(false);
    const [discordProfile, setDiscordProfile] = useState<any>(null);
    const [discordLoading, setDiscordLoading] = useState(true);
    const [showSecret, setShowSecret] = useState(false);
    const [copied, setCopied] = useState(false);
    const [updatingPerms, setUpdatingPerms] = useState(false);

    const [botPerms, setBotPerms] = useState({
        bot_can_view_overview: true,
        bot_can_manage_apps: false,
        bot_can_manage_licenses: false,
        bot_can_manage_users: false,
        bot_can_manage_subscriptions: false,
        bot_can_manage_sessions: false,
        bot_can_manage_settings: false,
        bot_can_view_team: false,
    });

    const fetchDiscordProfile = async () => {
        try {
            setDiscordLoading(true);
            const res = await devApi.getDiscordProfile();
            if (res.status === "success") {
                if (res.data.linked) {
                    setDiscordLinked(true);
                    setDiscordProfile(res.data.profile);
                    setBotPerms({
                        bot_can_view_overview: res.data.profile.bot_can_view_overview,
                        bot_can_manage_apps: res.data.profile.bot_can_manage_apps,
                        bot_can_manage_licenses: res.data.profile.bot_can_manage_licenses,
                        bot_can_manage_users: res.data.profile.bot_can_manage_users,
                        bot_can_manage_subscriptions: res.data.profile.bot_can_manage_subscriptions,
                        bot_can_manage_sessions: res.data.profile.bot_can_manage_sessions,
                        bot_can_manage_settings: res.data.profile.bot_can_manage_settings,
                        bot_can_view_team: res.data.profile.bot_can_view_team,
                    });
                } else {
                    setDiscordLinked(false);
                    setDiscordProfile(null);
                }
            }
        } catch (error) {
            console.error("Failed to fetch Discord profile:", error);
        } finally {
            setDiscordLoading(false);
        }
    };

    const handleLinkDiscord = async () => {
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

    const handleUnlinkDiscord = async () => {
        const confirmUnlink = await confirm({
            title: "Unlink Discord Account",
            description: "Are you sure you want to unlink your Discord account? All active bot configurations and access tokens for this account will be permanently revoked.",
            confirmText: "Unlink Account",
            cancelText: "Cancel",
            variant: "destructive"
        });

        if (!confirmUnlink) return;

        try {
            setDiscordLoading(true);
            const res = await devApi.unlinkDiscord();
            if (res.status === "success") {
                toast.success("Discord account unlinked successfully.");
                setDiscordLinked(false);
                setDiscordProfile(null);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to unlink Discord account.");
        } finally {
            setDiscordLoading(false);
        }
    };

    const handleSavePermissions = async () => {
        setUpdatingPerms(true);
        try {
            const res = await devApi.updateDiscordPermissions(botPerms);
            if (res.status === "success") {
                toast.success("Discord bot permissions updated successfully!");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update permissions.");
        } finally {
            setUpdatingPerms(false);
        }
    };

    const copyToClipboard = () => {
        if (!discordProfile?.bot_secret) return;
        navigator.clipboard.writeText(discordProfile.bot_secret);
        setCopied(true);
        toast.success("Secret token copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const linkStatus = params.get("discord_link");
        const reason = params.get("reason");
        if (linkStatus === "success") {
            toast.success("Discord account linked successfully!");
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (linkStatus === "error") {
            toast.error(`Discord linking failed: ${reason || "unknown error"}`);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        fetchDiscordProfile();
    }, []);

    // Plan expiry helpers — plan_expires_at is set for Binance one-time payments
    const planExpiresAt = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
    const daysUntilExpiry = planExpiresAt
        ? Math.ceil((planExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    const isBinancePlan = planExpiresAt !== null; // Binance = has expiry; Stripe = no expiry (managed externally)

    const planExpiryLabel = planExpiresAt
        ? planExpiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : null;

    const handleManageBilling = async () => {
        if (billingLoading) return;
        try {
            setBillingLoading(true);
            const loadingToast = toast.loading("Opening secure customer portal...");
            const res = await devApi.createPortalSession();
            toast.dismiss(loadingToast);
            if (res.status === "success" && res.data?.url) {
                window.location.href = res.data.url;
            } else {
                throw new Error("Failed to redirect to billing portal.");
            }
        } catch (error: any) {
            toast.dismiss();
            toast.error(error.response?.data?.message || error.message || "Billing portal is currently unavailable.");
        } finally {
            setBillingLoading(false);
        }
    };

    const handleRenewPlan = () => {
        navigate(`/checkout/${profile.plan?.toLowerCase()}`);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,100}$/;
        if (!EMAIL_REGEX.test(email)) {
            toast.error("Please enter a valid email address.");
            return;
        }
        if (!USERNAME_REGEX.test(username)) {
            toast.error("Username must be 3-100 characters and contain only letters, numbers, underscores, dots, or hyphens.");
            return;
        }
        if (password && password.length < 8) {
            toast.error("New password must be at least 8 characters long.");
            return;
        }

        setIsSaving(true);
        try {
            const res = await devApi.updateMe({
                display_name: displayName,
                username,
                email,
                avatar_url: avatarUrl,
                banner_url: bannerUrl,
                bio: bio,
                password: password || undefined
            });
            if (res.status === 'success') {
                setProfile({ ...profile, display_name: displayName, username, email, avatar_url: avatarUrl, banner_url: bannerUrl, bio: bio });
                toast.success("Profile updated successfully!");
                setPassword("");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        const passwordInput = await prompt({
            title: "Delete Account",
            description: "WARNING: This action is permanent. All your users, licenses, and data will be deleted forever. Enter your password to confirm:",
            defaultValue: "",
            confirmText: "Delete Forever"
        });

        if (!passwordInput) return;

        setIsDeleting(true);
        try {
            await devApi.deleteProfile(passwordInput);
            toast.success("Account successfully deleted.");
            logout();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete account. Incorrect password?");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto pb-12">
            <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">My Profile</h1>
                <p className="text-neutral-400">Manage your account settings and preferences.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Avatar & Summary */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-1"
                >
                    <div className="bg-card dark:bg-muted/40 border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                        {/* Profile Banner Background */}
                        {profile.banner_url ? (
                            <div className="absolute top-0 left-0 w-full h-32 bg-cover bg-center z-0 opacity-40 blur-sm" style={{ backgroundImage: `url(${getOptimizedImageUrl(profile.banner_url, 600, 200)})` }} />
                        ) : (
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary to-indigo-900 z-0" />
                        )}
                        
                        <div className="w-32 h-32 rounded-full bg-neutral-800 border-4 border-border overflow-hidden flex items-center justify-center text-foreground font-bold shadow-lg mb-4 z-10 relative mt-12">
                            {avatarUrl || profile.avatar_url || profile.email || profile.username ? (
                                <img 
                                    src={getOptimizedImageUrl(avatarUrl || profile.avatar_url || getDefaultAvatarUrl(profile.email, profile.username), 128, 128)} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover" 
                                    loading="lazy" 
                                    decoding="async" 
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        target.onerror = null;
                                        target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile.username || profile.email || 'U')}`;
                                    }}
                                />
                            ) : (
                                <span className="text-4xl bg-gradient-to-br from-primary to-red-600 w-full h-full flex items-center justify-center">
                                    {(profile.display_name || profile.username || "??").substring(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-foreground z-10 flex items-center gap-2">
                            {profile.plan === 'Seller' ? (
                                <>
                                    <ShinyText 
                                        text={profile.display_name || profile.username} 
                                        speed={2} 
                                        color="#94a3b8" 
                                        shineColor="#ffffff" 
                                        className="font-bold text-xl" 
                                    />
                                    <span className="text-[10px] bg-primary/15 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Seller</span>
                                </>
                            ) : profile.plan === 'Developer' ? (
                                <>
                                    <GradientText
                                        colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                        animationSpeed={3}
                                        showBorder={false}
                                        className="font-bold text-xl"
                                    >
                                        {profile.display_name || profile.username}
                                    </GradientText>
                                    <span className="text-[10px] bg-purple-500/15 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Developer</span>
                                </>
                            ) : (
                                profile.display_name || profile.username
                            )}
                            {Array.isArray(profile.badges) && profile.badges.length > 0 && (
                                <div className="flex items-center gap-1">
                                    {profile.badges.map((bId: string) => (
                                        <BadgeIcon key={bId} badgeId={bId} className="w-5 h-5 text-yellow-400" />
                                    ))}
                                </div>
                            )}
                        </h2>
                        <p className="text-sm text-neutral-400 mb-4 z-10">{profile.email}</p>
                        
                        <div className="w-full bg-muted rounded-lg p-3 flex flex-col gap-2.5 border border-border mb-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Role</span>
                                <span className={`text-sm font-semibold flex items-center gap-1.5 ${
                                    profile.role === 'Account Owner' || profile.role === 'Admin' ? 'text-primary' :
                                    profile.role === 'Reseller' ? 'text-purple-400' :
                                    'text-emerald-400'
                                }`}>
                                    <CheckCircle2 className="w-4 h-4" />
                                    {profile.role}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-t border-border pt-2.5">
                                <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Joined</span>
                                <span className="text-sm font-semibold text-neutral-200 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-neutral-400" />
                                    {profile.created_at
                                        ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                        : 'N/A'
                                    }
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-t border-border pt-2.5">
                                <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Subscription Tier</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-semibold ${
                                        profile.plan === 'Developer' ? 'text-purple-400' :
                                        profile.plan === 'Seller' ? 'text-amber-400' :
                                        'text-emerald-400'
                                    }`}>
                                        {profile.plan || 'Free'}
                                    </span>
                                    {/* Status badge for paid plans */}
                                    {profile.plan !== 'Free' && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border shrink-0 ${
                                            isExpired
                                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                                : isExpiringSoon
                                                ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                        }`}>
                                            {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Expiry / Lifetime row */}
                            {profile.plan !== 'Free' && (
                                <div className="flex items-center justify-between border-t border-border pt-2.5">
                                    <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Plan Expiry</span>
                                    <span className="text-sm font-semibold text-neutral-200 flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-neutral-400" />
                                        {planExpiryLabel
                                            ? (isExpired
                                                ? `Expired ${planExpiryLabel}`
                                                : isExpiringSoon
                                                ? `Expires ${planExpiryLabel} (${daysUntilExpiry}d left)`
                                                : planExpiryLabel)
                                            : 'Lifetime / Forever'
                                        }
                                    </span>
                                </div>
                            )}
                            {/* Full-width Action Button Section */}
                            <div className="mt-1 pt-2.5 border-t border-border/40 space-y-2">
                                {profile.plan === 'Free' ? (
                                    <Button
                                        onClick={() => navigate('/pricing')}
                                        size="sm"
                                        className="w-full h-8 text-xs bg-primary hover:bg-primary/95 text-white font-bold"
                                    >
                                        Upgrade Account
                                    </Button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            onClick={handleOpenBillingModal}
                                            size="sm"
                                            variant="outline"
                                            className="w-full h-8 text-xs bg-muted/50 hover:bg-muted text-foreground border-border font-bold"
                                        >
                                            <CreditCard className="w-3 h-3 mr-1 text-primary" />
                                            Billing History
                                        </Button>
                                        <Button
                                            onClick={handleRenewPlan}
                                            disabled={billingLoading}
                                            size="sm"
                                            className={`w-full h-8 text-xs font-bold ${
                                                isExpired || isExpiringSoon
                                                    ? 'bg-yellow-500 hover:bg-yellow-600 text-black shadow-md shadow-yellow-500/10'
                                                    : 'bg-primary hover:bg-primary/90 text-white'
                                            }`}
                                        >
                                            <RefreshCw className="w-3 h-3 mr-1" />
                                            Renew Subscription
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                                {/* Upgrade path: Developer → Seller */}
                                {profile.plan === 'Developer' && (
                                    <button
                                        onClick={() => navigate('/checkout/seller')}
                                        className="w-full flex items-center justify-between text-xs px-2.5 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all group cursor-pointer"
                                    >
                                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                                            Want <span className="font-bold text-amber-400">unlimited</span> apps & users?
                                        </span>
                                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                            Upgrade to Seller
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </span>
                                    </button>
                                )}
                        
                        <Button
                            variant="outline"
                            className="w-full hover:border-primary/40 hover:bg-primary/5 transition-all"
                            onClick={() => {
                                logout();
                                navigate("/login");
                            }}
                        >
                            <LogOut className="w-4 h-4 mr-2" /> Logout
                        </Button>
                    </div>
                </motion.div>

                {/* Right Column: Edit Form */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 space-y-8"
                >
                    <div className="bg-card dark:bg-muted/40 border border-border rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center"><User className="w-5 h-5 mr-2 text-primary" /> Account Details</h3>
                        
                        <form onSubmit={handleSave} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <ImageIcon className="w-3.5 h-3.5" /> Avatar Image URL
                                    </Label>
                                    <Input 
                                        value={avatarUrl} 
                                        onChange={(e) => setAvatarUrl(e.target.value)} 
                                        placeholder="https://example.com/avatar.gif" 
                                        className="bg-background border-border text-foreground focus-visible:ring-primary/50" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <ImageIcon className="w-3.5 h-3.5" /> Banner Image URL
                                    </Label>
                                    <Input 
                                        value={bannerUrl} 
                                        onChange={(e) => setBannerUrl(e.target.value)} 
                                        placeholder="https://example.com/banner.gif" 
                                        className="bg-background border-border text-foreground focus-visible:ring-primary/50" 
                                    />
                                </div>
                            </div>

                            {/* Avatar Switcher */}
                            <AvatarSwitcher
                                currentAvatar={avatarUrl || profile.avatar_url || getDefaultAvatarUrl(profile.email, profile.username)}
                                email={profile.email}
                                username={profile.username}
                                onSelect={(newUrl) => {
                                    setAvatarUrl(newUrl);
                                    toast.success("Avatar selected! Click 'Save Profile' to apply.");
                                }}
                            />

                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Display Name
                                </Label>
                                <Input 
                                    value={displayName} 
                                    onChange={(e) => setDisplayName(e.target.value)} 
                                    placeholder="Display Name" 
                                    className="bg-background border-border text-foreground focus-visible:ring-primary/50" 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Bio / About Me
                                </Label>
                                <Textarea 
                                    value={bio} 
                                    onChange={(e) => setBio(e.target.value)} 
                                    placeholder="Tell us a little bit about yourself..." 
                                    className="bg-background border-border text-foreground focus-visible:ring-primary/50 min-h-[100px] resize-none" 
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5" /> Username
                                    </Label>
                                    <Input 
                                        required
                                        value={username} 
                                        onChange={(e) => setUsername(e.target.value)} 
                                        placeholder="Username" 
                                        className="bg-background border-border text-foreground focus-visible:ring-primary/50" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5" /> Email Address
                                    </Label>
                                    <Input 
                                        required
                                        type="email"
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        placeholder="email@example.com" 
                                        className="bg-background border-border text-foreground focus-visible:ring-primary/50" 
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border mt-2">
                                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center"><Lock className="w-5 h-5 mr-2 text-emerald-500" /> Security</h3>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5" /> New Password
                                    </Label>
                                    <Input 
                                        type="password"
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        placeholder="Leave blank to keep current password" 
                                        className="bg-background border-border text-foreground focus-visible:ring-primary/50" 
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary text-white font-medium shadow-lg hover:shadow-primary/25 transition-all">
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>

                        <div className="mt-12 pt-6 border-t border-red-500/20">
                            <h3 className="text-lg font-semibold text-red-500 mb-2 flex items-center">Danger Zone</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Permanently delete your account. If you are an admin, this will also delete all your applications, users, and licenses. This action cannot be undone.
                            </p>
                            <Button 
                                onClick={handleDeleteAccount} 
                                disabled={isDeleting} 
                                variant="destructive" 
                                className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-foreground border border-red-500/20"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Account'}
                            </Button>
                        </div>
                    </div>

                    {/* Discord Integration Card */}
                    <div className="bg-card dark:bg-muted/40 border border-border rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
                            <div className="p-2 bg-[#5865F2]/10 text-[#5865F2] rounded-lg">
                                <svg className="w-6 h-6 fill-current" viewBox="0 0 127.14 96.36">
                                    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.18,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.71,1.63,1.4,2.52,2a68.1,68.1,0,0,1-10.5,5,78.37,78.37,0,0,0,6.63,10.85,105.48,105.48,0,0,0,31-18.83C129.07,50.12,122.9,27.21,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Discord Bot Integration</h3>
                                <p className="text-xs text-neutral-400">Control and monitor your applications from your Discord server.</p>
                            </div>
                        </div>

                        {discordLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-3">
                                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                                <span className="text-sm text-neutral-400 font-medium">Checking Discord link status...</span>
                            </div>
                        ) : !discordLinked ? (
                            <div className="py-8 flex flex-col items-center text-center max-w-[480px] mx-auto">
                                <div className="w-20 h-20 rounded-full bg-neutral-800 border border-border flex items-center justify-center text-neutral-500 mb-6">
                                    <svg className="w-10 h-10 fill-current opacity-30" viewBox="0 0 127.14 96.36">
                                        <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.18,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.71,1.63,1.4,2.52,2a68.1,68.1,0,0,1-10.5,5,78.37,78.37,0,0,0,6.63,10.85,105.48,105.48,0,0,0,31-18.83C129.07,50.12,122.9,27.21,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                                    </svg>
                                </div>
                                <h4 className="text-base font-semibold text-foreground mb-2">No Discord account linked</h4>
                                <p className="text-sm text-neutral-400 mb-6">
                                    Link your Discord account to get started. You can configure granular execution permissions and copy your Bot Access Token to allow secure API requests from self-hosted bots.
                                </p>
                                <Button 
                                    onClick={handleLinkDiscord}
                                    className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium shadow-md flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 127.14 96.36">
                                        <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.18,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.71,1.63,1.4,2.52,2a68.1,68.1,0,0,1-10.5,5,78.37,78.37,0,0,0,6.63,10.85,105.48,105.48,0,0,0,31-18.83C129.07,50.12,122.9,27.21,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                                    </svg>
                                    Link Discord Account
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Discord Identity Summary */}
                                <div className="border border-border rounded-xl overflow-hidden relative bg-muted/20">
                                    {/* Discord Banner */}
                                    {discordProfile?.discord_banner_url ? (
                                        <div className="h-20 bg-cover bg-center" style={{ backgroundImage: `url(${discordProfile.discord_banner_url})` }} />
                                    ) : (
                                        <div className="h-20 bg-gradient-to-r from-[#5865F2] to-indigo-955" />
                                    )}

                                    {/* Identity Details */}
                                    <div className="p-4 pt-10 relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        {/* Avatar overlapping banner */}
                                        <div className="w-16 h-16 rounded-full bg-neutral-900 border-2 border-border overflow-hidden absolute -top-8 left-4 shadow-md">
                                            {discordProfile?.discord_avatar_url ? (
                                                <img src={discordProfile.discord_avatar_url} alt="Discord Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl font-bold bg-[#5865F2] w-full h-full flex items-center justify-center text-white">
                                                    D
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="text-base font-bold text-foreground flex items-center gap-1.5 mt-1 md:mt-0">
                                                {discordProfile?.discord_username}
                                            </h4>
                                            <p className="text-xs text-neutral-400">Discord ID: {discordProfile?.discord_id}</p>
                                        </div>

                                        <Button
                                            onClick={handleUnlinkDiscord}
                                            variant="destructive"
                                            size="sm"
                                            className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"
                                        >
                                            Unlink Discord
                                        </Button>
                                    </div>
                                </div>

                                {/* Bot Access Token */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                        Bot Access Secret Token
                                    </Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                readOnly
                                                type={showSecret ? "text" : "password"}
                                                value={discordProfile?.bot_secret || ""}
                                                className="bg-background border-border text-foreground font-mono text-xs pr-10 focus-visible:ring-primary/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSecret(!showSecret)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-foreground"
                                            >
                                                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <Button 
                                            type="button"
                                            onClick={copyToClipboard}
                                            className="bg-muted border border-border text-foreground hover:bg-muted/80 shrink-0 font-medium"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-[11px] text-red-400/90 leading-normal flex items-start gap-1">
                                        <span>⚠️</span>
                                        <span>Keep this token secret. Do not share it. Anyone with access to this token can control your application commands on Discord.</span>
                                    </p>
                                </div>

                                {/* Permissions Settings */}
                                <div className="border-t border-border pt-6 space-y-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground">Discord Command Permissions</h4>
                                        <p className="text-xs text-neutral-400">Configure what actions can be triggered via Discord bot commands.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-xs font-semibold text-foreground">App Overview</Label>
                                                <p className="text-[10px] text-neutral-400">View app stats and general status</p>
                                            </div>
                                            <Switch
                                                checked={botPerms.bot_can_view_overview}
                                                onCheckedChange={(checked) => setBotPerms({ ...botPerms, bot_can_view_overview: checked })}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-xs font-semibold text-foreground">Manage Apps</Label>
                                                <p className="text-[10px] text-neutral-400">List applications and switch active app</p>
                                            </div>
                                            <Switch
                                                checked={botPerms.bot_can_manage_apps}
                                                onCheckedChange={(checked) => setBotPerms({ ...botPerms, bot_can_manage_apps: checked })}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-xs font-semibold text-foreground">Manage Licenses</Label>
                                                <p className="text-[10px] text-neutral-400">Generate, view, and delete licenses</p>
                                            </div>
                                            <Switch
                                                checked={botPerms.bot_can_manage_licenses}
                                                onCheckedChange={(checked) => setBotPerms({ ...botPerms, bot_can_manage_licenses: checked })}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-xs font-semibold text-foreground">Manage Users</Label>
                                                <p className="text-[10px] text-neutral-400">Create, edit, reset HWID, or delete clients</p>
                                            </div>
                                            <Switch
                                                checked={botPerms.bot_can_manage_users}
                                                onCheckedChange={(checked) => setBotPerms({ ...botPerms, bot_can_manage_users: checked })}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-xs font-semibold text-foreground">Manage Subscriptions</Label>
                                                <p className="text-[10px] text-neutral-400">Create and modify subscription plans</p>
                                            </div>
                                            <Switch
                                                checked={botPerms.bot_can_manage_subscriptions}
                                                onCheckedChange={(checked) => setBotPerms({ ...botPerms, bot_can_manage_subscriptions: checked })}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-xs font-semibold text-foreground">Manage Sessions</Label>
                                                <p className="text-[10px] text-neutral-400">List and terminate active client sessions</p>
                                            </div>
                                            <Switch
                                                checked={botPerms.bot_can_manage_sessions}
                                                onCheckedChange={(checked) => setBotPerms({ ...botPerms, bot_can_manage_sessions: checked })}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-xs font-semibold text-foreground">Manage Settings</Label>
                                                <p className="text-[10px] text-neutral-400">Modify app settings and file hashes</p>
                                            </div>
                                            <Switch
                                                checked={botPerms.bot_can_manage_settings}
                                                onCheckedChange={(checked) => setBotPerms({ ...botPerms, bot_can_manage_settings: checked })}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-xs font-semibold text-foreground">View Team</Label>
                                                <p className="text-[10px] text-neutral-400">Display team members (View-Only)</p>
                                            </div>
                                            <Switch
                                                checked={botPerms.bot_can_view_team}
                                                onCheckedChange={(checked) => setBotPerms({ ...botPerms, bot_can_view_team: checked })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button
                                            onClick={handleSavePermissions}
                                            disabled={updatingPerms}
                                            className="bg-primary hover:bg-primary/95 text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-primary/20"
                                        >
                                            {updatingPerms ? "Saving..." : "Save Bot Permissions"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Billing History Modal */}
            {showBillingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card dark:bg-zinc-900 border border-border rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
                        <div className="flex items-center justify-between border-b border-border/80 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Billing & Subscription Details</h3>
                                    <p className="text-xs text-muted-foreground">Manage your subscription origin and transaction history.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowBillingModal(false)}
                                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {historyLoading ? (
                            <div className="py-12 text-center space-y-3">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                                <p className="text-xs text-muted-foreground">Loading subscription records...</p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {/* Current Subscription Source Card */}
                                <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subscription Method</span>
                                        {billingHistory?.origin === 'binance' && (
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 flex items-center gap-1.5">
                                                <QrCode className="w-3.5 h-3.5" /> Binance Pay (USDT)
                                            </span>
                                        )}
                                        {billingHistory?.origin === 'admin_grant' && (
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center gap-1.5">
                                                <Crown className="w-3.5 h-3.5" /> Granted by Master Admin
                                            </span>
                                        )}
                                        {billingHistory?.origin === 'stripe' && (
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-1.5">
                                                <CreditCard className="w-3.5 h-3.5" /> Stripe Card
                                            </span>
                                        )}
                                        {billingHistory?.origin === 'free' && (
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground flex items-center gap-1.5">
                                                Free Tier
                                            </span>
                                        )}
                                    </div>

                                    {/* Description text based on origin */}
                                    <div className="text-xs text-muted-foreground leading-relaxed">
                                        {billingHistory?.origin === 'binance' && (
                                            <p>
                                                <span className="font-semibold text-foreground">Non-Auto-Renewing Crypto Plan:</span> Binance Pay is a one-time transaction. Your plan remains active until expiration date and will not automatically charge you.
                                            </p>
                                        )}
                                        {billingHistory?.origin === 'admin_grant' && (
                                            <p>
                                                <span className="font-semibold text-foreground">Admin Assigned Tier:</span> Your current plan was granted directly by the Master Administrator. No recurring billing is active.
                                            </p>
                                        )}
                                        {billingHistory?.origin === 'stripe' && (
                                            <p>
                                                <span className="font-semibold text-foreground">Auto-Renewing Card Subscription:</span> Managed via Stripe gateway. You can open the portal below to modify payment details.
                                            </p>
                                        )}
                                        {billingHistory?.origin === 'free' && (
                                            <p>
                                                You are currently on the Free plan. Upgrade to Developer or Seller to unlock higher user and license limits.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Transaction History Section */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Transaction History</h4>
                                    
                                    {billingHistory?.history && billingHistory.history.length > 0 ? (
                                        <div className="border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                                                    <tr>
                                                        <th className="p-2.5">Date</th>
                                                        <th className="p-2.5">Plan</th>
                                                        <th className="p-2.5">Method</th>
                                                        <th className="p-2.5">Order ID</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/60">
                                                    {billingHistory.history.map((item: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-muted/20">
                                                            <td className="p-2.5 font-mono text-muted-foreground">
                                                                {new Date(item.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td className="p-2.5 font-bold text-foreground">{item.plan}</td>
                                                            <td className="p-2.5 text-yellow-500 font-semibold uppercase">{item.payment_method}</td>
                                                            <td className="p-2.5 font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                                                                {item.order_id}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-4 border border-border/60 rounded-xl bg-muted/10 text-center text-xs text-muted-foreground">
                                            {billingHistory?.origin === 'admin_grant'
                                                ? "No payment transaction history (Granted directly by Master Admin)."
                                                : "No billing transaction records found."}
                                        </div>
                                    )}
                                </div>

                                {/* Modal Actions */}
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    {billingHistory?.origin === 'stripe' && (
                                        <Button
                                            onClick={handleManageBilling}
                                            disabled={billingLoading}
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Stripe Portal
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => setShowBillingModal(false)}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
