import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { devApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "motion/react";
import { ShieldCheck, ArrowRight, Loader2, Lock, Check, XCircle } from "lucide-react";
import { Turnstile } from '@marsidev/react-turnstile';
import SplashCursor from "../components/SplashCursor";
import BrandWordmark from "../components/BrandWordmark";
import { SEO } from "../components/SEO";
import LegalModal from "../components/ui/LegalModal";
import { ThemeToggle } from "../components/ThemeToggle";
import { getDefaultAvatarUrl } from "../lib/utils";

export default function Register() {
    const location = useLocation();
    const from = (location.state as any)?.from || "/dashboard";

    const [email, setEmail] = useState("");
    const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [isDark, setIsDark] = useState(true);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [turnstileToken, setTurnstileToken] = useState("");
    const [captchaCompleted, setCaptchaCompleted] = useState(false);
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

    const [emailStatus, setEmailStatus] = useState<{ state: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'; message?: string }>({ state: 'idle' });
    const [usernameStatus, setUsernameStatus] = useState<{ state: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'; message?: string }>({ state: 'idle' });

    const emailCache = useRef<Map<string, any>>(new Map());
    const usernameCache = useRef<Map<string, any>>(new Map());

    // Debounced real-time email check (only when user stops typing for 500ms on valid email format)
    useEffect(() => {
        const val = email.trim().toLowerCase();
        if (!val) { setEmailStatus({ state: 'idle' }); return; }

        const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!EMAIL_REGEX.test(val)) {
            setEmailStatus({ state: 'invalid', message: 'Enter a valid email address (e.g. user@example.com)' });
            return;
        }

        if (emailCache.current.has(val)) {
            setEmailStatus(emailCache.current.get(val));
            return;
        }

        const timer = setTimeout(async () => {
            setEmailStatus({ state: 'checking' });
            try {
                const res = await devApi.verifyUser(val, undefined, 'signup');
                if (res.status === 'success') {
                    const st = res.data.available
                        ? { state: 'available' as const, message: 'Email is available' }
                        : { state: 'taken' as const, message: 'Email is already registered' };
                    emailCache.current.set(val, st);
                    setEmailStatus(st);
                }
            } catch (err: any) {
                if (!axios.isCancel(err)) {
                    setEmailStatus({ state: 'idle' });
                }
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [email]);

    // Debounced real-time username check (only when user stops typing for 500ms on valid format)
    useEffect(() => {
        const val = username.trim().toLowerCase();
        if (!val) { setUsernameStatus({ state: 'idle' }); return; }

        const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{2,30}$/;
        if (!USERNAME_REGEX.test(val)) {
            setUsernameStatus({ state: 'invalid', message: 'Username must be 2-30 chars (alphanumeric, _, ., -)' });
            return;
        }

        if (usernameCache.current.has(val)) {
            setUsernameStatus(usernameCache.current.get(val));
            return;
        }

        const timer = setTimeout(async () => {
            setUsernameStatus({ state: 'checking' });
            try {
                const res = await devApi.verifyUser(val, undefined, 'signup');
                if (res.status === 'success') {
                    const st = res.data.available
                        ? { state: 'available' as const, message: 'Username is available' }
                        : { state: 'taken' as const, message: 'Username is already taken' };
                    usernameCache.current.set(val, st);
                    setUsernameStatus(st);
                }
            } catch (err: any) {
                if (!axios.isCancel(err)) {
                    setUsernameStatus({ state: 'idle' });
                }
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username]);

    useEffect(() => {
        const sync = () => setIsDark(document.documentElement.classList.contains("dark"));
        sync();
        const obs = new MutationObserver(sync);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            navigate(from);
        }
    }, [isAuthenticated, navigate, from]);

    useEffect(() => {
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
        if (!googleClientId) return;

        // Load Google Identity Services script
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        script.onload = () => {
            const g = (window as any).google;
            if (g) {
                g.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: async (response: any) => {
                        setLoading(true);
                        try {
                            const idToken = response.credential;
                            const res = await devApi.googleLogin(idToken);
                            if (res.status === "success" && res.data?.token) {
                                login(res.data.token);
                                toast.success("Welcome to Dexter Auth!");
                                navigate(from);
                            } else {
                                throw new Error(res.message || "Google authentication failed");
                            }
                        } catch (err: any) {
                            toast.error(err.response?.data?.message || err.message || "Google authentication failed");
                        } finally {
                            setLoading(false);
                        }
                    },
                });

                const btnContainer = document.getElementById("google-signup-btn");
                if (btnContainer) {
                    g.accounts.id.renderButton(
                        btnContainer,
                        {
                            theme: "dark",
                            size: "large",
                            width: 380,
                            shape: "rectangular"
                        }
                    );
                }
            }
        };

        return () => {
            try {
                document.head.removeChild(script);
            } catch(e) {}
        };
    }, [navigate, from, login]);

    const handleDiscordLogin = async () => {
        setLoading(true);
        try {
            const res = await devApi.getDiscordLoginUrl();
            if (res.status === "success" && res.data?.url) {
                window.location.href = res.data.url;
            } else {
                throw new Error("Failed to get Discord authorization URL");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Failed to initiate Discord login");
            setLoading(false);
        }
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (step === 2 && countdown > 0) {
            timer = setInterval(() => setCountdown(c => c - 1), 1000);
        } else if (countdown === 0 && step === 2) {
            setCanResend(true);
        }
        return () => clearInterval(timer);
    }, [step, countdown]);

    const handleRegister = async (e: React.FormEvent) => {
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
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters long.");
            return;
        }

        if (siteKey && !turnstileToken) {
            toast.error("Please complete the CAPTCHA.");
            return;
        }

        setLoading(true);
        try {
            const avatarUrl = getDefaultAvatarUrl(email, username);
            const res = await devApi.register(email, username, password, turnstileToken, avatarUrl);
            if (res.data?.token) {
                login(res.data.token);
                try {
                    await devApi.updateMe({ avatar_url: avatarUrl });
                } catch (_) {}
                toast.success("Account created — welcome to Dexter Auth!");
                navigate(from);
                return;
            }
            toast.success("Verification code sent to your email!");
            setStep(2);
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || "Failed to register");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const avatarUrl = getDefaultAvatarUrl(email, username);
            const data = await devApi.verifyRegistration(email, otp, avatarUrl);
            toast.success("Account verified and created successfully!");
            if (data.data?.token) {
                login(data.data.token);
                try {
                    await devApi.updateMe({ avatar_url: avatarUrl });
                } catch (_) {}
                navigate(from);
            } else {
                navigate("/login", { state: { from } });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || "Failed to verify OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setResendLoading(true);
        try {
            const avatarUrl = getDefaultAvatarUrl(email, username);
            await devApi.register(email, username, password, undefined, avatarUrl);
            toast.success("New code sent!");
            setCountdown(300); // 5 mins cooldown
            setCanResend(false);
        } catch (e: any) {
            toast.error(e.response?.data?.message || e.message || "Failed to resend code");
            if (e.response?.status === 429) {
                setCountdown(300);
                setCanResend(false);
            }
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <main aria-label="Sign Up for Dexter Auth" className="relative min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground overflow-hidden px-4 select-none">
            <SEO
                title="Registration only takes a minute!"
                description="Dexter Auth is a free, enterprise-grade authentication and software licensing API for native C++, C#, and ImGui applications."
                path="/register"
                jsonLd={{
                    "@type": "ProfilePage",
                    "@id": "https://dexterauth.com/register",
                    "name": "Dexter Auth Account Registration",
                    "description": "Secure account provisioning portal.",
                    "isPartOf": { "@id": "https://dexterauth.com/#website" }
                }}
            />

            {/* Theme Toggle in Top Right */}
            <div className="absolute top-6 right-6 z-20">
                <ThemeToggle />
            </div>

            {/* Fluid cursor effect */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 hidden md:block">
                <SplashCursor DENSITY_DISSIPATION={4} VELOCITY_DISSIPATION={2.5} SPLAT_RADIUS={0.15} CURL={2} />
            </div>

            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mb-7 z-10"
            >
                <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                    <img src="/RDX.png" alt="Dexter Auth" className="w-8 h-8 rounded-[9px] object-cover border border-primary/20 shadow-sm" />
                    <span className="text-lg font-semibold tracking-tight text-foreground">
                        <BrandWordmark />
                    </span>
                </Link>
            </motion.div>

            {/* Card */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-[420px] z-10"
            >
                <div className="w-full rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/60 px-3 py-1 mb-5 text-xs text-muted-foreground font-medium">
                        <Lock className="h-3 w-3 text-primary" />
                        <span>Free forever · No credit card</span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-1">
                        {step === 1 ? "Create your account" : "Verify your email"}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-6">
                        {step === 1 ? "Ship auth in minutes, not weeks." : `We sent a code to ${email}`}
                    </p>

                    {step === 1 ? (
                        <>
                            <form onSubmit={handleRegister}>
                                {/* Email */}
                                <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                                <div className="relative mb-3">
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className={`w-full bg-muted/40 border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 transition-all pr-10 ${
                                            emailStatus.state === 'available'
                                                ? 'border-emerald-500/60 focus:ring-emerald-500/20'
                                                : emailStatus.state === 'taken' || emailStatus.state === 'invalid'
                                                ? 'border-red-500/60 focus:ring-red-500/20'
                                                : 'border-border/70 focus:border-primary focus:ring-primary/20'
                                        }`}
                                    />
                                    <div className="absolute right-3.5 inset-y-0 flex items-center pointer-events-none">
                                        {emailStatus.state === 'checking' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                                        {emailStatus.state === 'available' && <Check className="w-4 h-4 text-emerald-400" />}
                                        {(emailStatus.state === 'taken' || emailStatus.state === 'invalid') && <XCircle className="w-4 h-4 text-red-400" />}
                                    </div>
                                </div>
                                {emailStatus.state === 'available' && <p className="text-[11px] text-emerald-400 mb-3 -mt-1.5 flex items-center gap-1"><Check className="w-3 h-3" /> Email is available</p>}
                                {emailStatus.state === 'taken' && <p className="text-[11px] text-red-400 mb-3 -mt-1.5 flex items-center gap-1"><XCircle className="w-3 h-3" /> Email is already registered</p>}
                                {emailStatus.state === 'invalid' && <p className="text-[11px] text-red-400/80 mb-3 -mt-1.5">{emailStatus.message}</p>}

                                {/* Username */}
                                <label htmlFor="username" className="block text-xs font-medium text-muted-foreground mb-1.5">Username</label>
                                <div className="relative mb-3">
                                    <input
                                        id="username"
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className={`w-full bg-muted/40 border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 transition-all pr-10 ${
                                            usernameStatus.state === 'available'
                                                ? 'border-emerald-500/60 focus:ring-emerald-500/20'
                                                : usernameStatus.state === 'taken' || usernameStatus.state === 'invalid'
                                                ? 'border-red-500/60 focus:ring-red-500/20'
                                                : 'border-border/70 focus:border-primary focus:ring-primary/20'
                                        }`}
                                    />
                                    <div className="absolute right-3.5 inset-y-0 flex items-center pointer-events-none">
                                        {usernameStatus.state === 'checking' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                                        {usernameStatus.state === 'available' && <Check className="w-4 h-4 text-emerald-400" />}
                                        {(usernameStatus.state === 'taken' || usernameStatus.state === 'invalid') && <XCircle className="w-4 h-4 text-red-400" />}
                                    </div>
                                </div>
                                {usernameStatus.state === 'available' && <p className="text-[11px] text-emerald-400 mb-3 -mt-1.5 flex items-center gap-1"><Check className="w-3 h-3" /> Username is available</p>}
                                {usernameStatus.state === 'taken' && <p className="text-[11px] text-red-400 mb-3 -mt-1.5 flex items-center gap-1"><XCircle className="w-3 h-3" /> Username is already taken</p>}
                                {usernameStatus.state === 'invalid' && <p className="text-[11px] text-red-400/80 mb-3 -mt-1.5">{usernameStatus.message}</p>}

                                {/* Password */}
                                <label htmlFor="reg-password" className="block text-xs font-medium text-muted-foreground mb-1.5">Password</label>
                                <div className="mb-4">
                                    <RegPasswordInput
                                        id="reg-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Turnstile */}
                                {siteKey && (
                                    <motion.div
                                        initial={false}
                                        animate={{
                                            opacity: captchaCompleted ? 0 : 1,
                                            height: captchaCompleted ? 0 : 65,
                                            marginBottom: captchaCompleted ? 0 : 18,
                                        }}
                                        transition={{ duration: 0.4, ease: "easeInOut" }}
                                        className="overflow-hidden flex justify-center"
                                    >
                                        <Turnstile
                                            siteKey={siteKey}
                                            onSuccess={(token) => {
                                                setTurnstileToken(token);
                                                setTimeout(() => setCaptchaCompleted(true), 800);
                                            }}
                                            onExpire={() => { setTurnstileToken(""); setCaptchaCompleted(false); }}
                                            onError={() => { setTurnstileToken(""); setCaptchaCompleted(false); }}
                                            options={{ theme: isDark ? "dark" : "light" }}
                                        />
                                    </motion.div>
                                )}

                                {/* Submit */}
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    whileHover={{ opacity: loading ? 1 : 0.92 }}
                                    whileTap={{ scale: loading ? 1 : 0.98 }}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Sending verification...</>
                                    ) : (
                                        <>Start building — it&apos;s free <ArrowRight className="h-[15px] w-[15px]" /></>
                                    )}
                                </motion.button>
                            </form>

                            {/* OAuth */}
                            {(import.meta.env.VITE_GOOGLE_CLIENT_ID || true) && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }}>
                                    <div className="my-5 flex items-center gap-3">
                                        <div className="h-px flex-1 bg-border/60" />
                                        <span className="text-xs text-muted-foreground">or continue with</span>
                                        <div className="h-px flex-1 bg-border/60" />
                                    </div>
                                    <div className="flex flex-col gap-2.5 mb-5">
                                        {/* Google */}
                                        <div
                                            className="w-full relative flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/60 p-2.5 text-sm font-medium text-foreground transition-colors cursor-pointer overflow-hidden"
                                        >
                                            <GoogleIcon className="w-4 h-4" />
                                            Sign up with Google
                                            <div
                                                id="google-signup-btn"
                                                style={{ position: "absolute", inset: 0, opacity: 0.01, transform: "scale(1.5)", transformOrigin: "center", cursor: "pointer" }}
                                            />
                                        </div>
                                        {/* Discord */}
                                        <button
                                            type="button"
                                            onClick={handleDiscordLogin}
                                            disabled={loading}
                                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/60 p-2.5 text-sm font-medium text-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            <DiscordIcon className="w-4 h-4 text-[#7289da]" />
                                            Discord
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Footer */}
                            <div className="border-t border-border/60 pt-3.5 text-center">
                                <span className="text-xs text-muted-foreground">Already have an account?{" "}</span>
                                <Link
                                    to="/login"
                                    state={{ from }}
                                    className="text-xs font-medium text-primary hover:underline transition-all"
                                >
                                    Sign in instead
                                </Link>
                            </div>
                        </>
                    ) : (
                        <form onSubmit={handleVerify}>
                            {/* OTP */}
                            <label htmlFor="otp" className="block text-xs font-medium text-muted-foreground mb-1.5">Verification Code</label>
                            <input
                                id="otp"
                                type="text"
                                placeholder="XXXXXX"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                maxLength={6}
                                className="w-full bg-muted/40 border border-border/70 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all mb-2 tracking-[4px]"
                            />
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs text-muted-foreground">Code expires in 15 minutes</span>
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={!canResend || resendLoading}
                                    className="text-xs font-medium text-primary hover:underline bg-none border-none cursor-pointer p-0 disabled:text-muted-foreground disabled:no-underline disabled:cursor-default"
                                >
                                    {resendLoading ? "Sending..." : canResend ? "Resend Code" : `Resend in ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`}
                                </button>
                            </div>

                            {/* Submit */}
                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={{ opacity: loading ? 1 : 0.92 }}
                                whileTap={{ scale: loading ? 1 : 0.98 }}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all mb-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                                ) : (
                                    <>Complete Registration <Check className="h-[15px] w-[15px]" /></>
                                )}
                            </motion.button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors bg-none border-none cursor-pointer p-0"
                                >
                                    ← Change email address
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>

            {/* Legal */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-muted-foreground mt-5 mb-4 text-center"
            >
                By registering you agree to our{" "}
                <button type="button" onClick={() => setLegalModal("terms")} className="text-muted-foreground hover:text-foreground underline underline-offset-2 bg-none border-none cursor-pointer p-0">Terms</button>
                {" and "}
                <button type="button" onClick={() => setLegalModal("privacy")} className="text-muted-foreground hover:text-foreground underline underline-offset-2 bg-none border-none cursor-pointer p-0">Privacy Policy</button>.
            </motion.p>

            <LegalModal isOpen={!!legalModal} type={legalModal} onClose={() => setLegalModal(null)} />
        </main>
    );
}

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 127.14 96.36" fill="currentColor" {...props}>
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.89-.65,1.76-1.34,2.58-2.07a75.48,75.48,0,0,0,72.9,0c.82.73,1.69,1.42,2.58,2.07a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.06-18.83C129.87,48.24,123.6,25.44,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
  </svg>
);

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
    <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.6H24v9h11.9c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.9 6.5-9.6 6.5-16.6z"/>
    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41 15.4 46 24 46z"/>
    <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.2-3 .7-4.3v-5.7H4.5C3 16.9 2 20.3 2 24s1 7.1 2.5 10l7.3-5.7z"/>
    <path fill="#EA4335" d="M24 10.8c3.2 0 6 1.1 8.3 3.2l6.2-6.2C34.9 4.4 29.9 2 24 2 15.4 2 8.1 7 4.5 14l7.3 5.7c1.7-5.2 6.5-8.9 12.2-8.9z"/>
  </svg>
);

function RegPasswordInput({ id, value, onChange, required }: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        placeholder="••••••••"
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-muted/40 border border-border/70 rounded-xl px-3 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
      />
      <button
        type="button" tabIndex={-1}
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
      >
        {show ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        )}
      </button>
    </div>
  );
}
