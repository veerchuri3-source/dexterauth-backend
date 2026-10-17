import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Sparkles, ShieldCheck, Home } from "lucide-react";
import { SEO } from "../components/SEO";

export default function CheckoutSuccess() {
    const { refreshUser, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        refreshUser();
    }, []);

    const plan = user?.plan || "Developer";

    return (
        <main className="relative min-h-screen bg-background text-foreground font-sans flex flex-col items-center justify-center p-4">
            <SEO title="Payment Successful — Dexter Auth" description="Your Dexter Auth subscription is active." path="/checkout/success" />
            
            {/* Radial glow backdrop */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-500/15" />
            </div>

            <div className="w-full max-w-md">
                <Card className="bg-card/40 border border-border/60 backdrop-blur-md shadow-2xl relative overflow-hidden text-center">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                    
                    <CardHeader className="pt-8">
                        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <Sparkles className="w-8 h-8 animate-bounce" />
                        </div>
                        <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground">Payment Successful!</CardTitle>
                        <CardDescription className="text-muted-foreground mt-1.5">
                            Thank you for supporting Dexter Auth.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-8 px-6 space-y-6">
                        <div className="border border-emerald-500/20 bg-emerald-500/5 p-5 rounded-xl space-y-3">
                            <p className="text-sm font-semibold text-emerald-400">
                                Subscription Activated Successfully
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Your developer account has been upgraded to the <span className="font-bold text-foreground">{plan}</span> plan. Your new feature limits, SDK locking systems, and priority resources are now active and ready to scale.
                            </p>
                            {/* Show expiry for Binance one-time payments */}
                            {user?.plan_expires_at && (
                                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-semibold border-t border-emerald-500/20 pt-3 mt-2">
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                    Active until {new Date(user.plan_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Button 
                                onClick={() => navigate("/dashboard")} 
                                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 font-medium text-foreground shadow-lg shadow-emerald-500/20 border border-emerald-500/30"
                            >
                                Open Dashboard
                            </Button>
                            <Button 
                                onClick={() => navigate("/")} 
                                variant="outline" 
                                className="w-full border-border text-foreground hover:bg-muted"
                            >
                                <Home className="w-4 h-4 mr-2" /> Back to Home Page
                            </Button>
                        </div>

                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            Billing handled securely
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
