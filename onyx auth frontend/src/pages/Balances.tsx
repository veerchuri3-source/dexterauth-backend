import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";

interface BalancesProps {
    profile: any;
}

export default function BalancesView({ profile }: BalancesProps) {
    return (
        <div className="max-w-[1400px] mx-auto h-full flex flex-col">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <nav className="flex mb-2" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1 md:space-x-2 text-sm">
                        <li className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            My Account
                        </li>
                        <li>
                            <div className="flex items-center text-muted-foreground">
                                <ChevronRight className="w-4 h-4 mx-1" />
                                <span className="text-foreground font-medium ml-1">Balances</span>
                            </div>
                        </li>
                    </ol>
                </nav>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">License Balances</h1>
                <p className="text-muted-foreground text-sm mt-1">View your remaining license generation limits.</p>
            </motion.div>

            <motion.div 
                className="p-6 flex flex-col bg-card dark:bg-muted/40 border border-border rounded-2xl shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {[
                        { title: "Day Keys", value: profile?.balance_day || 0 },
                        { title: "Week Keys", value: profile?.balance_week || 0 },
                        { title: "Month Keys", value: profile?.balance_month || 0 },
                        { title: "3 Month Keys", value: profile?.balance_three_month || 0 },
                        { title: "6 Month Keys", value: profile?.balance_six_month || 0 },
                        { title: "Year Keys", value: profile?.balance_year || 0 },
                    ].map((item, idx) => (
                        <div key={idx} className="relative flex flex-col items-center justify-center text-center bg-card border border-border px-6 py-8 rounded-xl transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                            <p className="text-xl font-bold text-foreground mb-2">{item.title}</p>
                            <p className="text-4xl font-black bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent mb-6">{item.value}</p>

                            <button type="button" disabled className="flex items-center justify-center w-full text-muted-foreground bg-muted/50 cursor-not-allowed font-medium rounded-lg text-sm px-5 py-3 border border-border transition-colors">
                                <span className="whitespace-nowrap">Restock not available</span>
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-6 relative flex flex-col items-center justify-center text-center bg-gradient-to-br from-card to-background border border-emerald-500/20 px-6 py-8 rounded-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10">
                    <div className="absolute inset-0 bg-emerald-500/5 rounded-xl"></div>
                    <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
                        <p className="text-2xl font-bold text-foreground mb-2">Lifetime Keys</p>
                        <p className="text-5xl font-black text-emerald-400 mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">{profile?.balance_lifetime || 0}</p>

                        <button type="button" disabled className="flex items-center justify-center w-full text-emerald-400/50 bg-emerald-500/5 cursor-not-allowed font-medium rounded-lg text-sm px-5 py-3 border border-emerald-500/10 transition-colors">
                            <span className="whitespace-nowrap">Restock not available</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
