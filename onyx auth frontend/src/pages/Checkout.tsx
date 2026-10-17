import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { devApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Loader2, ArrowLeft, ShieldCheck, Sparkles, Copy, Check, QrCode, Wrench, ChevronDown, Clock } from "lucide-react";
import { SEO } from "../components/SEO";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import jsQR from "jsqr";
import QRCode from "qrcode";

export default function Checkout() {
    const { planName } = useParams<{ planName: string }>();
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // UI Loading & State
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [pricingCustomization, setPricingCustomization] = useState<any | null>(null);
    
    // Gateway settings
    const [gateways, setGateways] = useState({
        binanceEnabled: false,
        binanceMaintenance: false,
        binancePayId: "",
        binanceQrCodeUrl: "",
        razorpayEnabled: false,
        razorpayMaintenance: false
    });
    const [selectedGateway, setSelectedGateway] = useState<"binance" | "razorpay" | null>(null);
    const [razorpayLoading, setRazorpayLoading] = useState(false);

    // Binance Checkout Flow State (1 = Payment Display, 2 = Verification Form)
    const [binanceStep, setBinanceStep] = useState(1);
    const [binanceOrderId, setBinanceOrderId] = useState("");
    const [showReceiptLightbox, setShowReceiptLightbox] = useState(false);
    const [qrSvg, setQrSvg] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [showQrLightbox, setShowQrLightbox] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(900); // 15 minutes = 900 seconds

    useEffect(() => {
        if (binanceStep !== 2) return;
        setTimerSeconds(900);

        const interval = setInterval(() => {
            setTimerSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [binanceStep]);

    const formatTimer = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const plan = planName ? planName.charAt(0).toUpperCase() + planName.slice(1).toLowerCase() : "";
    const isPlanValid = ["Developer", "Seller"].includes(plan);
    const isMultiGateway = (gateways.binanceEnabled ? 1 : 0) + (gateways.razorpayEnabled ? 1 : 0) > 1;

    const periodParam = searchParams.get("period");
    const billingPeriod = periodParam === "monthly" ? "monthly" : "yearly";

    // Derived pricing values from custom settings or defaults
    let price = "";
    let priceUsdtNum = "";

    if (pricingCustomization) {
        try {
            const parsed = typeof pricingCustomization === 'string'
                ? JSON.parse(pricingCustomization)
                : pricingCustomization;
            const plansList = Array.isArray(parsed) ? parsed : (parsed.plans || []);
            const matchedPlan = plansList.find((p: any) => p.name === plan);
            if (matchedPlan) {
                if (billingPeriod === 'monthly') {
                    price = `${matchedPlan.monthlyPrice || "$2"}/${matchedPlan.monthlyPeriod || "month"}`;
                    const num = parseFloat((matchedPlan.monthlyPrice || "").replace(/[^0-9.]/g, ''));
                    priceUsdtNum = isNaN(num) ? "2.00" : num.toFixed(2);
                } else {
                    price = `${matchedPlan.yearlyPrice || matchedPlan.price || "$15"}/${matchedPlan.yearlyPeriod || matchedPlan.period || "year"}`;
                    const num = parseFloat((matchedPlan.yearlyPrice || matchedPlan.price || "").replace(/[^0-9.]/g, ''));
                    priceUsdtNum = isNaN(num) ? "15.00" : num.toFixed(2);
                }
            }
        } catch (e) {
            console.error("Failed to parse pricing in checkout page:", e);
        }
    }

    if (!price) {
        // Fallback default
        if (plan === "Developer") {
            price = billingPeriod === "monthly" ? "$2/month" : "$15/year";
            priceUsdtNum = billingPeriod === "monthly" ? "2.00" : "15.00";
        } else if (plan === "Seller") {
            price = billingPeriod === "monthly" ? "$6/month" : "$60/year";
            priceUsdtNum = billingPeriod === "monthly" ? "6.00" : "60.00";
        }
    }

    const description = plan === "Developer"
        ? "For growing software that needs more headroom. Supports 7 apps, 500 licenses, VPN blocking, webhooks, and priority support."
        : "Scale with unlimited apps, unlimited users and licenses, team management, and dedicated support.";

    // INR estimate for Razorpay display (1 USD ≈ 85 INR).
    const priceInr = priceUsdtNum ? Math.round(parseFloat(priceUsdtNum) * 85) : 0;

    // Renewal: Binance users can renew within 30 days of expiry
    const userPlanExpiresAt = user?.plan_expires_at ? new Date(user.plan_expires_at) : null;
    const daysUntilUserExpiry = userPlanExpiresAt
        ? Math.ceil((userPlanExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
    const isRenewal = user?.plan === plan && daysUntilUserExpiry !== null && daysUntilUserExpiry <= 30;

    useEffect(() => {
        if (!isPlanValid) {
            setError("Invalid plan selected.");
            setLoading(false);
            return;
        }

        if (user && user.plan === plan && !isRenewal) {
            setError(`You are already subscribed to the ${plan} plan. Renewal is available within 30 days of expiry.`);
            setLoading(false);
            return;
        }

        const fetchGatewayConfig = async () => {
            try {
                setLoading(true);
                const res = await devApi.getPublicPlatformSettings();
                if (res.status === "success" && res.data) {
                    const data = res.data;
                    const binanceActive = !!data.binanceEnabled;
                    const binanceMaint = !!data.binanceMaintenance;

                    setGateways({
                        binanceEnabled: binanceActive,
                        binanceMaintenance: binanceMaint,
                        binancePayId: data.binancePayId || "",
                        binanceQrCodeUrl: data.binanceQrCodeUrl || "",
                        razorpayEnabled: !!data.razorpayEnabled,
                        razorpayMaintenance: !!data.razorpayMaintenance
                    });

                    if (data.pricingCustomization) {
                        setPricingCustomization(data.pricingCustomization);
                    }

                    // Razorpay is the primary gateway; Binance is the fallback.
                    const razorpayCandidate = !!data.razorpayEnabled && !data.razorpayMaintenance;
                    const binanceCandidate = binanceActive && !binanceMaint && (!!data.binancePayId || !!data.binanceQrCodeUrl);

                    if (razorpayCandidate) {
                        setSelectedGateway("razorpay");
                    } else if (binanceCandidate) {
                        setSelectedGateway("binance");
                    } else {
                        setSelectedGateway(null);
                    }
                    setLoading(false);
                } else {
                    throw new Error("Failed to load gateway config.");
                }
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || "Failed to load gateway configurations.");
                setLoading(false);
            }
        };

        fetchGatewayConfig();
    }, [plan, isPlanValid, user]);

    useEffect(() => {
        if (!gateways.binanceQrCodeUrl) {
            setQrSvg(null);
            return;
        }

        const decodeAndGenerateSvg = async () => {
            try {
                setQrLoading(true);
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    try {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) throw new Error("Could not create canvas context");
                        
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, img.width, img.height);
                        const decoded = jsQR(imageData.data, imageData.width, imageData.height);
                        
                        if (decoded) {
                            QRCode.toString(decoded.data, {
                                type: 'svg',
                                errorCorrectionLevel: 'H',
                                margin: 2,
                                color: {
                                    dark: '#1E2329',  // Premium Binance Dark Charcoal
                                    light: '#FFFFFF'  // Pure White Background
                                }
                            }, (err, baseSvg) => {
                                if (err) {
                                    console.error("QR generation error:", err);
                                    setQrSvg(null);
                                    return;
                                }

                                // Inject responsive attributes and local Binance Logo SVG
                                const logoInjection = `
                                    <rect x="38%" y="38%" width="24%" height="24%" fill="white" rx="3" />
                                    <image href="/Binance_Logo.svg" x="40%" y="40%" width="20%" height="20%" preserveAspectRatio="xMidYMid meet" />
                                `;
                                
                                let responsiveSvg = baseSvg;
                                if (!responsiveSvg.includes("viewBox=")) {
                                    responsiveSvg = responsiveSvg.replace("<svg", '<svg viewBox="0 0 256 256"');
                                }
                                responsiveSvg = responsiveSvg
                                    .replace(/width="[^"]*"/g, 'width="100%"')
                                    .replace(/height="[^"]*"/g, 'height="100%"')
                                    .replace("</svg>", logoInjection + "</svg>");
                                
                                setQrSvg(responsiveSvg);
                            });
                        } else {
                            console.warn("Could not find QR Code in image, falling back to direct image");
                            setQrSvg(null);
                        }
                    } catch (innerErr) {
                        console.error("QR decoding inner error:", innerErr);
                        setQrSvg(null);
                    } finally {
                        setQrLoading(false);
                    }
                };
                img.onerror = () => {
                    console.warn("Error loading QR image for decoding, falling back to direct image");
                    setQrSvg(null);
                    setQrLoading(false);
                };
                img.src = gateways.binanceQrCodeUrl;
            } catch (err) {
                console.error("QR decoding error:", err);
                setQrSvg(null);
                setQrLoading(false);
            }
        };

        decodeAndGenerateSvg();
    }, [gateways.binanceQrCodeUrl]);

    const handleCopyBinanceId = () => {
        navigator.clipboard.writeText(gateways.binancePayId);
        setCopied(true);
        toast.success("Binance Pay ID copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRazorpayPayment = async () => {
        setRazorpayLoading(true);
        try {
            const res = await devApi.createRazorpayOrder(plan, billingPeriod);
            if (res.status !== "success" || !res.data?.order_id) {
                throw new Error(res.message || "Failed to create Razorpay order");
            }
            const { order_id, key_id, amount, currency, name } = res.data;
            if (!(window as any).Razorpay) {
                await new Promise<void>((resolve, reject) => {
                    const s = document.createElement("script");
                    s.src = "https://checkout.razorpay.com/v1/checkout.js";
                    s.onload = () => resolve();
                    s.onerror = () => reject(new Error("Could not load Razorpay checkout"));
                    document.head.appendChild(s);
                });
            }
            const options = {
                key: key_id,
                amount,
                currency,
                name,
                description: `${plan} plan (${["year", "yearly", "annual"].includes(String(billingPeriod).toLowerCase()) ? "yearly" : "monthly"})`,
                order_id,
                handler: async (response: any) => {
                    try {
                        const v = await devApi.verifyRazorpayPayment({
                            plan,
                            billingPeriod,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        });
                        if (v.status === "success" && v.data?.verified) {
                            navigate("/checkout/success");
                        } else {
                            throw new Error(v.message || "Payment verification failed");
                        }
                    } catch (err: any) {
                        toast.error(err.message || "Payment could not be verified. Contact support.");
                    }
                },
                modal: { ondismiss: () => setRazorpayLoading(false) },
                theme: { color: "#059669" },
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.on("payment.failed", (response: any) => {
                toast.error("Payment failed: " + ((response?.error?.description) || "Please try again."));
            });
            rzp.open();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Razorpay checkout failed.");
        } finally {
            setRazorpayLoading(false);
        }
    };

    const handleVerifyBinancePayment = async () => {
        if (!binanceOrderId.trim()) {
            toast.error("Please enter your Binance Order ID.");
            return;
        }

        try {
            setVerifying(true);
            const res = await devApi.binanceVerifyPayment(binanceOrderId, plan, billingPeriod);
            if (res.status === "success") {
                if (res.data?.token) {
                    localStorage.setItem("token", res.data.token);
                }
                await refreshUser();
                toast.success(res.message || "Payment verified successfully!");
                navigate("/checkout/success");
            } else {
                throw new Error(res.message || "Verification failed");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Binance payment verification failed.");
        } finally {
            setVerifying(false);
        }
    };

    return (
        <main className="relative min-h-screen bg-background text-foreground font-sans flex flex-col items-center justify-center p-4">
            <SEO title={`Billing & Checkout — Dexter Auth`} description="Complete your Dexter Auth billing setup." path="/checkout" />
            
            {/* Radial glow backdrop */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px] dark:bg-primary/15" />
            </div>

            <div className="w-full max-w-md">
                <Button 
                    onClick={() => navigate(-1)} 
                    variant="ghost" 
                    className="mb-4 text-muted-foreground hover:text-foreground flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </Button>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    <Card className="bg-card/40 border border-border/60 backdrop-blur-md shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-red-500 to-rose-600" />
                        
                        <CardHeader className="text-center pt-8">
                            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-primary">
                                <ShieldCheck className="w-6 h-6 animate-pulse" />
                            </div>
                            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Secure Billing Checkout</CardTitle>
                            <CardDescription className="text-muted-foreground mt-1">
                                {binanceStep === 2 && selectedGateway === "binance" 
                                    ? "Verify your Binance transaction" 
                                    : "Choose your payment gateway and complete checkout"}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pb-8 px-6 space-y-6">
                            {loading && (
                                <div className="space-y-4 py-8 text-center">
                                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                                    <p className="text-sm text-muted-foreground">Configuring payment options...</p>
                                </div>
                            )}

                            {error && (
                                <div className="space-y-6 pt-2">
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                                        <p className="text-sm font-semibold text-red-500 mb-1">Checkout Failed</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
                                    </div>

                                    <div className="space-y-3">
                                        {isPlanValid && (
                                            <Button 
                                                onClick={() => window.location.reload()} 
                                                className="w-full bg-primary hover:bg-primary/90 font-medium"
                                            >
                                                Try Again
                                            </Button>
                                        )}
                                        <Button 
                                            onClick={() => navigate("/dashboard")} 
                                            variant="outline" 
                                            className="w-full border-border text-foreground hover:bg-muted"
                                        >
                                            Go to Developer Dashboard
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {!loading && !error && !gateways.binanceEnabled && !gateways.razorpayEnabled && (
                                <div className="text-center py-8 px-4 space-y-6">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-md">
                                        <Wrench className="w-8 h-8 text-red-500 animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-foreground">Billing System Offline</h3>
                                        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                                            Our subscription checkout channels are currently undergoing scheduled upgrades. We apologize for the temporary inconvenience.
                                        </p>
                                    </div>
                                    <div className="bg-muted/30 border border-border/80 p-4 rounded-xl text-xs text-muted-foreground text-left max-w-sm mx-auto space-y-2">
                                        <p className="font-bold text-foreground flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-primary" /> Alternate Upgrades
                                        </p>
                                        <p>1. Please email our billing support directly at <span className="font-semibold text-primary">business@dexterauth.com</span>.</p>
                                        <p>2. Connect with an administrator on our official Discord server to request manual license validation keys.</p>
                                    </div>
                                    <Button 
                                        onClick={() => navigate("/dashboard")}
                                        className="w-full max-w-xs bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-5 rounded-xl shadow-lg transition-all"
                                    >
                                        Back to Dashboard
                                    </Button>
                                </div>
                            )}

                            {!loading && !error && (gateways.binanceEnabled || gateways.razorpayEnabled) && (
                                <>
                                    {/* Selected Plan Box */}
                                    <div className="border border-border/60 bg-muted/20 p-4 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Selected Plan</p>
                                                <p className="text-base font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                                                    {plan} Plan <Sparkles className="w-3.5 h-3.5 text-primary" />
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Price</p>
                                                <p className="text-base font-bold text-foreground mt-0.5">{price}</p>
                                            </div>
                                        </div>
                                        {/* Renewal notice banner */}
                                        {isRenewal && (
                                            <div className="flex items-center gap-2 text-[10px] text-yellow-400 bg-yellow-500/5 border border-yellow-500/20 px-3 py-2 rounded-lg">
                                                <ChevronDown className="w-3 h-3 rotate-90 shrink-0" />
                                                <span><span className="font-bold">Renewal</span> — Your plan expires soon. This payment extends your subscription by 1 year.</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Method Accordion */}
                                    <div className="space-y-3 pt-2">
                                        {/* Payment Method Selector (Side-by-Side) */}
                                        {isMultiGateway && binanceStep === 1 && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-1">
                                                {/* Razorpay Selector Button */}
                                                {gateways.razorpayEnabled && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedGateway(selectedGateway === "razorpay" ? null : "razorpay")}
                                                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-center gap-2 select-none ${
                                                            selectedGateway === "razorpay"
                                                                ? "border-sky-500 bg-sky-500/5 shadow-md shadow-sky-500/5"
                                                                : "border-border/60 hover:border-border bg-card/25"
                                                        }`}
                                                    >
                                                        <div className="relative flex items-center justify-center">
                                                            <ShieldCheck className={`w-5 h-5 ${selectedGateway === "razorpay" ? "text-sky-500" : "text-muted-foreground"}`} />
                                                            <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-background flex items-center justify-center transition-colors ${
                                                                selectedGateway === "razorpay" ? "bg-sky-500" : "bg-muted-foreground/35"
                                                            }`} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-foreground">Razorpay</p>
                                                            <p className="text-[9px] text-muted-foreground mt-0.5">UPI, Cards, NetBanking</p>
                                                        </div>
                                                    </button>
                                                )}

                                                {/* Binance Selector Button */}
                                                {gateways.binanceEnabled && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedGateway(selectedGateway === "binance" ? null : "binance")}
                                                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-center gap-2 select-none ${
                                                            selectedGateway === "binance"
                                                                ? "border-yellow-500 bg-yellow-500/5 shadow-md shadow-yellow-500/5"
                                                                : "border-border/60 hover:border-border bg-card/25"
                                                        }`}
                                                    >
                                                        <div className="relative flex items-center justify-center">
                                                            <QrCode className={`w-5 h-5 ${selectedGateway === "binance" ? "text-yellow-500" : "text-muted-foreground"}`} />
                                                            <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-background flex items-center justify-center transition-colors ${
                                                                selectedGateway === "binance" ? "bg-yellow-500" : "bg-muted-foreground/35"
                                                            }`} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-foreground">Binance Pay</p>
                                                            <p className="text-[9px] text-muted-foreground mt-0.5">USDT Transfer</p>
                                                        </div>
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Razorpay Gateway Card Details */}
                                        {gateways.razorpayEnabled && (!isMultiGateway || selectedGateway === "razorpay") && binanceStep === 1 && (
                                            <AnimatePresence initial={false}>
                                                {selectedGateway === "razorpay" && (
                                                    <motion.div
                                                        key="razorpay-details"
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                                                        style={{ overflow: "hidden" }}
                                                        className={isMultiGateway ? "border border-sky-500/40 rounded-xl bg-card/10 overflow-hidden" : ""}
                                                    >
                                                        <div className="p-3.5 space-y-3.5">
                                                            {gateways.razorpayMaintenance ? (
                                                                <div className="flex flex-col items-center justify-center text-center py-6 px-3 bg-red-500/5 border border-red-500/10 rounded-xl space-y-3">
                                                                    <Wrench className="w-8 h-8 text-red-500 animate-pulse" />
                                                                    <div>
                                                                        <h4 className="text-sm font-bold text-foreground">Razorpay Under Maintenance</h4>
                                                                        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                                                                            Razorpay payments are currently undergoing scheduled upgrades. Please try another checkout method.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="space-y-0.5 text-center bg-sky-500/5 border border-sky-500/10 p-2 px-3 rounded-xl">
                                                                        <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wider">Pay with Razorpay</p>
                                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                                            Pay {price}{priceInr ? ` / ≈ ₹${priceInr}` : ""} securely with UPI, credit/debit cards or netbanking.
                                                                        </p>
                                                                    </div>
                                                                    <Button
                                                                        onClick={handleRazorpayPayment}
                                                                        disabled={razorpayLoading}
                                                                        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-4.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10 transition-all"
                                                                    >
                                                                        {razorpayLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin text-white" />}
                                                                        {razorpayLoading ? "Opening Razorpay…" : "Pay with Razorpay"}
                                                                        <ShieldCheck className="w-4 h-4" />
                                                                    </Button>
                                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-lg justify-center">
                                                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                                        Your plan activates instantly once payment is confirmed — no manual verification needed.
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        )}

                                        {/* Binance Gateway Card Details */}
                                        {gateways.binanceEnabled && (!isMultiGateway || selectedGateway === "binance") && (
                                            <AnimatePresence initial={false}>
                                                {selectedGateway === "binance" && (
                                                    <motion.div
                                                        key="binance-details"
                                                        initial={isMultiGateway ? { height: 0, opacity: 0 } : false}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                                                        style={{ overflow: "hidden" }}
                                                        className={isMultiGateway ? "border border-yellow-500/40 rounded-xl bg-card/10 overflow-hidden" : ""}
                                                    >
                                                        <div className="p-3.5">
                                                            {gateways.binanceMaintenance ? (
                                                                <div className="flex flex-col items-center justify-center text-center py-6 px-3 bg-red-500/5 border border-red-500/10 rounded-xl space-y-3">
                                                                    <Wrench className="w-8 h-8 text-red-500 animate-pulse" />
                                                                    <div>
                                                                        <h4 className="text-sm font-bold text-foreground">Binance Pay Under Maintenance</h4>
                                                                        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                                                                            Binance USDT transfers are currently undergoing scheduled upgrades. Please try another checkout method.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <AnimatePresence mode="wait">
                                                                    {binanceStep === 1 ? (
                                                                        /* STEP 1: PAYMENT DISPLAY STATE */
                                                                        <motion.div
                                                                            key="binance-step-1"
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: "auto" }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                                                            style={{ overflow: "hidden" }}
                                                                            className="space-y-3.5 pt-2 text-center"
                                                                        >
                                                                            {/* Guard: Binance enabled but PayID not configured */}
                                                                            {!gateways.binancePayId && (
                                                                                <div className="flex flex-col items-center justify-center text-center py-6 px-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl space-y-3">
                                                                                    <Wrench className="w-7 h-7 text-yellow-500 animate-pulse" />
                                                                                    <div>
                                                                                        <h4 className="text-sm font-bold text-foreground">Binance Pay Not Configured</h4>
                                                                                        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                                                                                            The merchant hasn't set up Binance Pay yet. Please contact support or try another payment method.
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {gateways.binancePayId && (<>
                                                                            {/* Binance Pay ID Display */}
                                                                            <div className="space-y-1">
                                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Send Payment to Binance ID</p>
                                                                                <div className="flex items-center justify-between bg-background border border-border/80 rounded-xl p-2.5 max-w-sm mx-auto shadow-inner">
                                                                                    <span className="font-mono text-sm text-foreground font-semibold tracking-wider pl-1">
                                                                                        {gateways.binancePayId}
                                                                                    </span>
                                                                                    <Button
                                                                                        type="button"
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        onClick={handleCopyBinanceId}
                                                                                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                                                                    >
                                                                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                                                    </Button>
                                                                                </div>
                                                                            </div>

                                                                            {/* QR Code Section */}
                                                                            <div className="space-y-1.5">
                                                                                <div 
                                                                                    onClick={() => setShowQrLightbox(true)}
                                                                                    className="mx-auto w-36 h-36 bg-white p-1 rounded-2xl border border-border shadow-lg flex items-center justify-center overflow-hidden cursor-zoom-in hover:border-yellow-500/50 transition-all duration-300 relative group"
                                                                                >
                                                                                    {qrLoading ? (
                                                                                        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
                                                                                    ) : qrSvg ? (
                                                                                        <div 
                                                                                            className="w-full h-full text-black"
                                                                                            dangerouslySetInnerHTML={{ __html: qrSvg }}
                                                                                        />
                                                                                    ) : gateways.binanceQrCodeUrl ? (
                                                                                        <img 
                                                                                            src={gateways.binanceQrCodeUrl} 
                                                                                            alt="Binance Pay QR Code" 
                                                                                            className="w-full h-full object-contain rounded-xl"
                                                                                        />
                                                                                    ) : (
                                                                                        <QrCode className="w-20 h-20 text-zinc-300" />
                                                                                    )}
                                                                                    {(qrSvg || gateways.binanceQrCodeUrl) && (
                                                                                        <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[0.5px]">
                                                                                            <span className="text-[9px] font-bold text-yellow-600 bg-white/95 border border-yellow-500/20 py-0.5 px-2 rounded-md shadow-md">Zoom</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Instructions */}
                                                                            <div className="space-y-0.5 text-center bg-yellow-500/5 border border-yellow-500/10 p-2 px-3 rounded-xl">
                                                                                <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">Instructions</p>
                                                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                                                    Scan QR with Binance app or send via Binance ID.
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                                                                                    Then tap "Confirm payment" below.
                                                                                </p>
                                                                            </div>

                                                                            {/* Confirm Button */}
                                                                            <Button
                                                                                onClick={() => setBinanceStep(2)}
                                                                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10 transition-all"
                                                                            >
                                                                                Confirm payment
                                                                            </Button>
                                                                            </>)}
                                                                        </motion.div>
                                                                    ) : (
                                                                        /* STEP 2: VERIFICATION STATE */
                                                                        <motion.div
                                                                            key="binance-step-2"
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: "auto" }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                                                            style={{ overflow: "hidden" }}
                                                                            className="space-y-3 pt-1"
                                                                        >
                                                                            {/* 15-Minute Countdown Timer Banner */}
                                                                            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                                                                timerSeconds > 180 
                                                                                    ? "bg-yellow-500/10 border-yellow-500/25 text-yellow-600 dark:text-yellow-400" 
                                                                                    : timerSeconds > 0 
                                                                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse" 
                                                                                    : "bg-red-500/15 border-red-500/30 text-red-500"
                                                                            }`}>
                                                                                <div className="flex items-center gap-2 text-left">
                                                                                    <Clock className="w-4 h-4 shrink-0" />
                                                                                    <div>
                                                                                        <p className="font-bold text-foreground">
                                                                                            {timerSeconds > 0 ? "15-Minute Payment Window" : "Payment Window Expired"}
                                                                                        </p>
                                                                                        <p className="text-[10px] text-muted-foreground leading-tight">
                                                                                            {timerSeconds > 0 
                                                                                                ? "Verify within 15 mins. Transactions >15 mins are rejected." 
                                                                                                : "Session time limit reached. Please start a new payment."}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <span className="font-mono text-xs font-extrabold tracking-wider px-2 py-1 rounded bg-background/80 border border-border shrink-0 ml-2">
                                                                                    {formatTimer(timerSeconds)}
                                                                                </span>
                                                                            </div>

                                                                            {/* Summary Block */}
                                                                            <div className="p-2.5 bg-background border border-border/80 rounded-xl space-y-1 text-xs text-muted-foreground">
                                                                                <div className="flex justify-between">
                                                                                    <span>Plan Amount:</span>
                                                                                    <span className="font-bold text-foreground">{priceUsdtNum} USDT</span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span>Merchant ID:</span>
                                                                                    <span className="font-mono text-foreground font-semibold">{gateways.binancePayId}</span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Verification Input */}
                                                                            <div className="space-y-1">
                                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Enter your Binance Order ID</label>
                                                                                <Input
                                                                                    placeholder="ENTER YOUR BINANCE ORDER ID"
                                                                                    value={binanceOrderId}
                                                                                    onChange={(e) => setBinanceOrderId(e.target.value)}
                                                                                    disabled={timerSeconds <= 0}
                                                                                    className="bg-background border-border text-foreground font-mono text-center tracking-widest text-xs uppercase py-2.5 focus-visible:ring-yellow-500/30"
                                                                                />
                                                                            </div>

                                                                            {/* Visual Receipt Guide SVG */}
                                                                            <div className="space-y-1">
                                                                                <p className="text-[9px] text-center text-muted-foreground uppercase tracking-wider font-semibold flex items-center justify-center gap-1">
                                                                                    Receipt Location Reference <span className="text-[8px] text-primary lowercase">(tap to zoom)</span>
                                                                                </p>
                                                                                <div 
                                                                                    onClick={() => setShowReceiptLightbox(true)}
                                                                                    className="cursor-zoom-in group relative overflow-hidden rounded-xl border border-border/80 hover:border-blue-500/50 transition-all duration-300"
                                                                                >
                                                                                    <svg viewBox="0 0 240 190" className="w-full max-w-[170px] mx-auto bg-card/60 p-2 shadow-inner">
                                                                                        {/* Outer Border Mockup */}
                                                                                        <rect x="2" y="2" width="236" height="186" rx="8" fill="none" stroke="currentColor" className="text-border/30" strokeWidth="0.8" />
                                                                                        
                                                                                        {/* Success Checkmark Banner */}
                                                                                        <g transform="translate(120, 24)">
                                                                                            <circle cx="0" cy="0" r="10" fill="rgba(16, 185, 129, 0.12)" />
                                                                                            <circle cx="0" cy="0" r="7" fill="#10b981" />
                                                                                            <path d="M-2.5 0 l1.5 1.5 l3.5 -3.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                                                        </g>
                                                                                        
                                                                                        <text x="120" y="44" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor" className="text-muted-foreground/80">Payment Successful</text>
                                                                                        <text x="120" y="58" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" className="text-foreground">{priceUsdtNum} <tspan fontSize="8" fontWeight="normal" className="text-muted-foreground">USDT</tspan></text>
                                                                                        
                                                                                        <text x="120" y="68" textAnchor="middle" fontSize="4.5" fill="currentColor" className="text-muted-foreground/60">The recipient can check the balance in the funding wallet.</text>
                                                                                        <line x1="12" y1="76" x2="228" y2="76" stroke="currentColor" className="text-border/40" strokeWidth="0.5" strokeDasharray="1.5 1.5" />

                                                                                        {/* Content Fields */}
                                                                                        <text x="16" y="90" fontSize="6.5" fill="currentColor" className="text-muted-foreground">To</text>
                                                                                        <text x="224" y="90" textAnchor="end" fontSize="6.5" fontWeight="semibold" fill="currentColor" className="text-foreground">Dexter Auth Merchant</text>
                                                                                        
                                                                                        {/* Highlighted Order ID */}
                                                                                        <g transform="translate(12, 100)">
                                                                                            <rect x="0" y="0" width="216" height="20" rx="3.5" fill="rgba(59, 130, 246, 0.05)" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
                                                                                            <text x="8" y="12" fontSize="7.5" fontWeight="bold" fill="currentColor" className="text-blue-500">Order ID</text>
                                                                                            <text x="192" y="12" textAnchor="end" fontSize="7.5" fontWeight="bold" fill="currentColor" className="text-blue-500">928374928374</text>
                                                                                            <rect x="198" y="6" width="3" height="5" rx="0.5" stroke="#3b82f6" strokeWidth="0.8" fill="none" />
                                                                                            <rect x="200.5" y="8" width="3" height="5" rx="0.5" stroke="#3b82f6" strokeWidth="0.8" fill="none" />
                                                                                        </g>

                                                                                        <text x="16" y="142" fontSize="6.5" fill="currentColor" className="text-muted-foreground">Payment Method</text>
                                                                                        <text x="224" y="142" textAnchor="end" fontSize="6.5" fontWeight="semibold" fill="currentColor" className="text-foreground">Spot Wallet</text>
                                                                                        
                                                                                        <text x="16" y="158" fontSize="6.5" fill="currentColor" className="text-muted-foreground">Paid With</text>
                                                                                        <text x="224" y="158" textAnchor="end" fontSize="6.5" fontWeight="semibold" fill="currentColor" className="text-foreground">{priceUsdtNum} USDT</text>
                                                                                    </svg>
                                                                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[0.5px]">
                                                                                        <span className="text-[10px] font-bold text-primary bg-background/80 border border-primary/20 py-1 px-2.5 rounded-lg shadow-md">Click to Zoom</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Instructions */}
                                                                            <div className="space-y-0.5 text-center bg-muted/20 border border-border/40 p-2 rounded-xl">
                                                                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                                                    Copy the Order ID from your Binance payment receipt.
                                                                                </p>
                                                                                <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
                                                                                    Paste it above and tap "Verify payment".
                                                                                </p>
                                                                            </div>

                                                                            {/* Action Buttons */}
                                                                            <div className="space-y-2">
                                                                                {timerSeconds > 0 ? (
                                                                                    <Button
                                                                                        type="button"
                                                                                        onClick={handleVerifyBinancePayment}
                                                                                        disabled={verifying}
                                                                                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10 transition-all"
                                                                                    >
                                                                                        {verifying && <Loader2 className="w-4 h-4 mr-1 animate-spin text-black" />}
                                                                                        Verify payment
                                                                                    </Button>
                                                                                ) : (
                                                                                    <Button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setBinanceStep(1);
                                                                                            setBinanceOrderId("");
                                                                                        }}
                                                                                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/10 transition-all text-xs"
                                                                                    >
                                                                                        Session Expired — Restart Payment
                                                                                    </Button>
                                                                                )}
                                                                                <Button
                                                                                    type="button"
                                                                                    onClick={() => setBinanceStep(1)}
                                                                                    variant="ghost"
                                                                                    className="w-full text-muted-foreground hover:text-foreground text-xs py-1.5 h-auto"
                                                                                >
                                                                                    Go back to QR code display
                                                                                </Button>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Receipt Guide Lightbox Modal */}
            <AnimatePresence>
                {showReceiptLightbox && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowReceiptLightbox(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 cursor-zoom-out"
                    >
                        <motion.div
                            initial={{ scale: 0.93, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.93, y: 15 }}
                            transition={{ type: "spring", damping: 25, stiffness: 350 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-sm bg-card border border-border p-5 rounded-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200"
                        >
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <span className="text-sm font-bold text-foreground">Binance Receipt Guide</span>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setShowReceiptLightbox(false)}
                                    className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
                                >
                                    ✕
                                </Button>
                            </div>
                            
                            {/* Large High-Fidelity SVG mockup matching image */}
                            <svg viewBox="0 0 240 200" className="w-full bg-card p-4 rounded-xl border border-border/80 shadow-inner">
                                {/* Background card border */}
                                <rect x="3" y="3" width="234" height="194" rx="8" fill="none" stroke="currentColor" className="text-border/25" strokeWidth="0.8" />
                                
                                {/* Header Success Checkmark (green circle with stars) */}
                                <g transform="translate(120, 26)">
                                    <circle cx="0" cy="0" r="13" fill="rgba(16, 185, 129, 0.12)" />
                                    <circle cx="0" cy="0" r="10" fill="rgba(16, 185, 129, 0.25)" />
                                    <circle cx="0" cy="0" r="7.5" fill="#10b981" />
                                    <path d="M-2.5 0 l1.5 1.5 l3.5 -3.5" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                    
                                    {/* Little green sparks */}
                                    <circle cx="-11" cy="-7" r="0.8" fill="#10b981" />
                                    <circle cx="11" cy="7" r="0.8" fill="#10b981" />
                                    <circle cx="-9" cy="7" r="0.5" fill="#10b981" />
                                    <circle cx="10" cy="-6" r="0.5" fill="#10b981" />
                                </g>
                                
                                {/* "Payment Successful" Label */}
                                <text x="120" y="47" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="currentColor" className="text-muted-foreground/90">Payment Successful</text>
                                
                                {/* Amount text */}
                                <text x="120" y="63" textAnchor="middle" fontSize="13" fontWeight="bold" fill="currentColor" className="text-foreground">{priceUsdtNum} <tspan fontSize="8.5" fontWeight="normal" className="text-muted-foreground">USDT</tspan></text>
                                
                                {/* Small caption text */}
                                <text x="120" y="73" textAnchor="middle" fontSize="4.5" fill="currentColor" className="text-muted-foreground/60">The recipient can check the balance in the funding wallet.</text>
                                
                                {/* Divider line */}
                                <line x1="12" y1="82" x2="228" y2="82" stroke="currentColor" className="text-border/40" strokeWidth="0.5" strokeDasharray="1.5 1.5" />

                                {/* Content Rows */}
                                <text x="16" y="96" fontSize="6.5" fill="currentColor" className="text-muted-foreground">To</text>
                                <text x="224" y="96" textAnchor="end" fontSize="6.5" fontWeight="semibold" fill="currentColor" className="text-foreground">Dexter Auth Merchant</text>
                                
                                {/* Order ID Blue Highlight Box */}
                                <g transform="translate(12, 106)">
                                    <rect x="0" y="0" width="216" height="22" rx="4" fill="rgba(59, 130, 246, 0.05)" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
                                    <text x="8" y="14" fontSize="7.5" fontWeight="bold" fill="currentColor" className="text-blue-500">Order ID</text>
                                    <text x="190" y="14" textAnchor="end" fontSize="7.5" fontWeight="bold" fill="currentColor" className="text-blue-500">928374928374</text>
                                    
                                    <rect x="196" y="7" width="3" height="5" rx="0.5" stroke="#3b82f6" strokeWidth="0.8" fill="none" />
                                    <rect x="199.5" y="9" width="3" height="5" rx="0.5" stroke="#3b82f6" strokeWidth="0.8" fill="none" />
                                </g>

                                <text x="16" y="148" fontSize="6.5" fill="currentColor" className="text-muted-foreground">Payment Method</text>
                                <text x="224" y="148" textAnchor="end" fontSize="6.5" fontWeight="semibold" fill="currentColor" className="text-foreground">Spot Wallet</text>
                                
                                <text x="16" y="164" fontSize="6.5" fill="currentColor" className="text-muted-foreground">Paid With</text>
                                <text x="224" y="164" textAnchor="end" fontSize="6.5" fontWeight="semibold" fill="currentColor" className="text-foreground">{priceUsdtNum} USDT</text>
                            </svg>
                            
                            <p className="text-[11px] text-muted-foreground text-center">
                                Copy the <strong className="text-blue-500">Order ID</strong> highlighted in blue on your Binance transaction details page.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR Code Zoom Lightbox Modal */}
            <AnimatePresence>
                {showQrLightbox && (qrSvg || gateways.binanceQrCodeUrl) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowQrLightbox(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 cursor-zoom-out"
                    >
                        <motion.div
                            initial={{ scale: 0.93, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.93, y: 15 }}
                            transition={{ type: "spring", damping: 25, stiffness: 350 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-sm bg-card border border-border p-6 rounded-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200"
                        >
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <span className="text-sm font-bold text-foreground">Scan QR Code</span>
                                <Button 
                                    type="button"
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setShowQrLightbox(false)}
                                    className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
                                >
                                    ✕
                                </Button>
                            </div>
                            
                            <div className="mx-auto w-64 h-64 bg-white p-2.5 rounded-2xl border border-border shadow-lg flex items-center justify-center overflow-hidden">
                                {qrSvg ? (
                                    <div 
                                        className="w-full h-full text-black"
                                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                                    />
                                ) : (
                                    <img 
                                        src={gateways.binanceQrCodeUrl} 
                                        alt="Binance Pay QR Code" 
                                        className="w-full h-full object-contain rounded-xl"
                                    />
                                )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground text-center">
                                Scan the QR code using your Binance application to send {priceUsdtNum} USDT.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
