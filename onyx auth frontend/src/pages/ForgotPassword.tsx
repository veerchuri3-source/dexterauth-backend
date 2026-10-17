import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { devApi } from "../lib/api";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Turnstile } from '@marsidev/react-turnstile';
import { ShieldCheck, ArrowRight, Loader2, Check, ArrowLeft } from "lucide-react";
import SplashCursor from "../components/SplashCursor";
import { AnimatedInput } from "../components/ui/AnimatedInput";
import BrandWordmark from "../components/BrandWordmark";
import { useSEO } from "../hooks/use-seo";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState("");
    const [captchaCompleted, setCaptchaCompleted] = useState(false);
    const navigate = useNavigate();
    
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
    useSEO({
        title: "Reset your password securely",
        description: "Recover your account access in seconds. Request a verification code to safely reset your Dexter Auth developer dashboard credentials.",
        path: "/forgot-password",
    });

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (step === 2 && countdown > 0) {
            timer = setInterval(() => setCountdown(c => c - 1), 1000);
        } else if (countdown === 0 && step === 2) {
            setCanResend(true);
        }
        return () => clearInterval(timer);
    }, [step, countdown]);

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (siteKey && !turnstileToken) {
            toast.error("Please complete the CAPTCHA.");
            return;
        }

        setLoading(true);
        try {
            await devApi.forgotPassword(email, turnstileToken);
            toast.success("If that email exists, a reset code was sent.");
            setStep(2);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send reset code");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters long.");
            return;
        }
        setLoading(true);
        try {
            await devApi.resetPassword(email, otp, newPassword);
            toast.success("Password successfully reset! You can now sign in.");
            navigate("/login");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setResendLoading(true);
        try {
            await devApi.forgotPassword(email);
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
        <div className="relative min-h-screen bg-background text-foreground font-sans antialiased flex flex-col items-center justify-center overflow-hidden p-4">
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <SplashCursor DENSITY_DISSIPATION={4} VELOCITY_DISSIPATION={2.5} SPLAT_RADIUS={0.15} CURL={2} />
            </div>

            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px] dark:bg-primary/25" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,var(--background)_75%)]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute top-6 left-6 z-10"
            >
                <Link to="/" className="flex items-center gap-2.5 group">
                    <img src="/RDX.png" alt="Dexter Auth" className="h-9 w-9 rounded-xl object-cover border border-primary/20 shadow-lg shadow-primary/30" />
                    <span className="text-lg"><BrandWordmark /></span>
                </Link>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-md mt-12 mb-6"
            >
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/30 via-transparent to-primary/10 blur-sm" />

                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/80 backdrop-blur-xl shadow-2xl shadow-black/30 px-8 py-10">
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-1">
                        {step === 1 ? "Reset your password" : "Enter verification code"}
                    </h1>
                    <p className="text-sm text-muted-foreground mb-6">
                        {step === 1 ? "We'll send you a verification code to reset your password." : `Code sent to ${email}`}
                    </p>

                    {step === 1 ? (
                        <form onSubmit={handleSendOTP} className="space-y-4">
                            <AnimatedInput
                                id="email"
                                type="email"
                                label="Email address"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                delay={0.08}
                            />

                            {siteKey ? (
                                <motion.div
                                    initial={false}
                                    animate={{ 
                                        opacity: captchaCompleted ? 0 : 1, 
                                        height: captchaCompleted ? 0 : 65,
                                        marginTop: captchaCompleted ? 0 : 8,
                                        marginBottom: captchaCompleted ? 0 : 8
                                    }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className="flex justify-center overflow-hidden"
                                >
                                    <Turnstile 
                                        siteKey={siteKey} 
                                        onSuccess={(token) => {
                                            setTurnstileToken(token);
                                            setTimeout(() => setCaptchaCompleted(true), 800);
                                        }}
                                        onExpire={() => {
                                            setTurnstileToken("");
                                            setCaptchaCompleted(false);
                                        }}
                                        onError={() => {
                                            setTurnstileToken("");
                                            setCaptchaCompleted(false);
                                        }}
                                        options={{ theme: 'dark' }}
                                    />
                                </motion.div>
                            ) : (
                                <div className="p-3 my-2 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                                    <p className="text-xs text-red-400 font-bold">⚠️ VITE_TURNSTILE_SITE_KEY is missing!</p>
                                    <p className="text-[10px] text-red-400/80 mt-1">Please add it to your frontend .env file and rebuild.</p>
                                </div>
                            )}

                            <motion.button
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, delay: 0.16, ease: [0.215, 0.61, 0.355, 1] }}
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: loading ? 1 : 1.02 }}
                                whileTap={{ scale: loading ? 1 : 0.98 }}
                                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-opacity disabled:opacity-60"
                            >
                                {loading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                                ) : (
                                    <>Send reset code <ArrowRight className="h-4 w-4" /></>
                                )}
                            </motion.button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-1.5">
                                <AnimatedInput
                                    id="otp"
                                    type="text"
                                    label="Verification Code"
                                    placeholder="XXXXXX"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                    delay={0.08}
                                />
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[11px] text-muted-foreground/70 font-medium tracking-wide">
                                        Code expires in 15 minutes
                                    </span>
                                </div>
                            </div>

                            {/* Resend */}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={!canResend || resendLoading}
                                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {resendLoading ? "Sending..." : canResend ? "Resend Code" : `Resend in ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`}
                                </button>
                            </div>

                            <AnimatedInput
                                id="newPassword"
                                label="New Password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                showPasswordToggle
                                delay={0.16}
                            />

                            <motion.button
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, delay: 0.24, ease: [0.215, 0.61, 0.355, 1] }}
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: loading ? 1 : 1.02 }}
                                whileTap={{ scale: loading ? 1 : 0.98 }}
                                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-opacity disabled:opacity-60"
                            >
                                {loading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</>
                                ) : (
                                    <>Reset password <Check className="h-4 w-4" /></>
                                )}
                            </motion.button>
                            
                            <div className="text-center pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setStep(1)} 
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
                                >
                                    Use a different email
                                </button>
                            </div>
                        </form>
                    )}

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.45, delay: 0.4 }}
                        className="my-7 flex items-center gap-3"
                    >
                        <div className="h-px flex-1 bg-border/60" />
                        <span className="text-xs text-muted-foreground">Or</span>
                        <div className="h-px flex-1 bg-border/60" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.48, ease: [0.215, 0.61, 0.355, 1] }}
                    >
                        <Link to="/login">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 text-primary" /> Back to sign in
                            </motion.div>
                        </Link>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
