import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { devApi } from "../lib/api";
import { toast } from "sonner";
import { motion } from "motion/react";
import { ShieldCheck, ArrowRight, Loader2, Lock } from "lucide-react";
import { Turnstile } from '@marsidev/react-turnstile';
import SplashCursor from "../components/SplashCursor";
import BrandWordmark from "../components/BrandWordmark";
import { SEO } from "../components/SEO";
import LegalModal from "../components/ui/LegalModal";
import { ThemeToggle } from "../components/ThemeToggle";

export default function Login() {
    const location = useLocation();
    const from = (location.state as any)?.from || "/dashboard";

    const [username, setUsername] = useState("");
    const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);
    const [password, setPassword] = useState("");
    const [turnstileToken, setTurnstileToken] = useState("");
    const [captchaCompleted, setCaptchaCompleted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isDark, setIsDark] = useState(true);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

    useEffect(() => {
        const sync = () => setIsDark(document.documentElement.classList.contains("dark"));
        sync();
        const obs = new MutationObserver(sync);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            const token = localStorage.getItem('dev_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.role === 'master_admin') {
                        navigate("/admin");
                        return;
                    }
                } catch(e) {}
            }
            navigate(from);
        }
    }, [isAuthenticated, navigate, from]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const discordToken = params.get("discord_token");
        const discordLink = params.get("discord_link");
        const reason = params.get("reason");

        if (discordToken) {
            login(discordToken);
            toast.success("Welcome back!");
            try {
                const payload = JSON.parse(atob(discordToken.split('.')[1]));
                if (payload.role === 'master_admin') {
                    navigate("/admin");
                } else {
                    navigate(from);
                }
            } catch {
                navigate(from);
            }
        } else if (discordLink === "error") {
            if (reason === "no_matching_email") {
                toast.error("No dashboard account matches your Discord email. Please register first.");
            } else if (reason === "account_paused") {
                toast.error("Your account has been paused. Please contact support.");
            } else {
                toast.error(`Discord login failed: ${reason || "unknown error"}`);
            }
            navigate(location.pathname, { replace: true });
        }
    }, [location.search, navigate, from, login, location.pathname]);

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
                    use_fedcm_for_prompt: true,
                    callback: async (response: any) => {
                        setLoading(true);
                        try {
                            const idToken = response.credential;
                            const res = await devApi.googleLogin(idToken);
                            if (res.status === "success" && res.data?.token) {
                                login(res.data.token);
                                toast.success("Welcome back!");
                                if (res.data.role === 'master_admin') {
                                    navigate("/admin");
                                } else {
                                    navigate(from);
                                }
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

                const btnContainer = document.getElementById("google-signin-btn");
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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;
        
        if (siteKey && !turnstileToken) {
            toast.error("Please complete the CAPTCHA.");
            return;
        }

        setLoading(true);
        try {
            // FIX: Call the actual backend login API instead of the local auth context function
            const res = await devApi.login(username, password, turnstileToken);
            if (res.status === "success" && res.data?.token) {
                login(res.data.token);
                toast.success("Welcome back!");
                if (res.data.role === 'master_admin') {
                    navigate("/admin");
                } else {
                    navigate(from);
                }
            } else {
                throw new Error(res.message || "Invalid credentials");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main aria-label="Sign In to Dexter Auth" className="relative min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground overflow-hidden px-4 select-none">
            <SEO
                title="Login"
                description="Dexter Auth is a free, enterprise-grade authentication and software licensing API for native C++, C#, and ImGui applications."
                path="/login"
                jsonLd={{
                    "@type": "ProfilePage",
                    "@id": "https://dexterauth.com/login",
                    "name": "Dexter Auth Secure Login",
                    "description": "Secure portal access.",
                    "isPartOf": { "@id": "https://dexterauth.com/#website" }
                }}
            />

            {/* Theme Toggle in Top Right */}
            <div className="absolute top-6 right-6 z-20">
                <ThemeToggle />
            </div>

            {/* Splash Cursor */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 hidden md:block">
                <SplashCursor 
                    DENSITY_DISSIPATION={4} 
                    SPLAT_RADIUS={0.15}
                    CURL={40}
                    PRESSURE={0.2}
                />
            </div>

            {/* Subtle ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none -z-10"
                style={{ background: "radial-gradient(circle, rgba(107,92,230,0.07) 0%, transparent 70%)" }}
            />

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
                        <span>Developer Portal</span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-1">Welcome back</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-6">Sign in to your Dexter Auth developer account.</p>

                    <form onSubmit={handleLogin}>
                        {/* Username */}
                        <label htmlFor="username" className="block text-xs font-medium text-muted-foreground mb-1.5">
                            Username or email
                        </label>
                        <input
                            id="username"
                            type="text"
                            placeholder="name@company.com"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full bg-muted/40 border border-border/70 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all mb-4"
                        />

                        {/* Password */}
                        <label htmlFor="password" className="block text-xs font-medium text-muted-foreground mb-1.5">
                            Password
                        </label>
                        <div className="relative mb-2">
                            <PasswordInput
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="text-right mb-4">
                            <Link
                                to="/forgot-password"
                                className="text-xs font-medium text-primary hover:underline transition-all"
                            >
                                Forgot password?
                            </Link>
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
                                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                            ) : (
                                <>Sign in <ArrowRight className="h-[15px] w-[15px]" /></>
                            )}
                        </motion.button>
                    </form>

                    {/* OAuth */}
                    {(import.meta.env.VITE_GOOGLE_CLIENT_ID || true) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                        >
                            {/* Divider */}
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
                                    Sign in with Google
                                    <div
                                        id="google-signin-btn"
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

                    {/* Footer — New to Dexter Auth */}
                    <div className="border-t border-border/60 pt-3.5 text-center">
                        <span className="text-xs text-muted-foreground">New to Dexter Auth?{" "}</span>
                        <Link
                            to="/register"
                            state={{ from }}
                            className="text-xs font-medium text-primary hover:underline transition-all"
                        >
                            Create a free account
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* Legal */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-muted-foreground mt-5 text-center"
            >
                By signing in you agree to our{" "}
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

function PasswordInput({ id, value, onChange, required }: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  const [show, setShow] = React.useState(false);
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
        type="button"
        tabIndex={-1}
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
