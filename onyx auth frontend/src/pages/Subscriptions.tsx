import { useState, useEffect } from "react";
import { devApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ChevronRight, Search, Plus, Trash2, Edit3, CreditCard, PackageOpen, Layers } from "lucide-react";
import { SellerTable, SellerTableRow } from "../components/ui/premium-data-table";
import { useDialog } from "../hooks/use-dialog";

interface Subscription { id: string; name: string; level: number | string; status?: string; app_id?: string; }
interface SubscriptionsProps { appId: string; appName: string; isPaused?: boolean; }

export default function Subscriptions({ appId, appName, isPaused }: SubscriptionsProps) {
    const { confirm } = useDialog();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newLevel, setNewLevel] = useState("1");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editLevel, setEditLevel] = useState("");

    useEffect(() => { if (appId) fetchSubscriptions(); }, [appId]);

    const fetchSubscriptions = async () => {
        setLoading(true);
        try { const d = await devApi.getSubscriptions(appId); if (d.status === "success") setSubscriptions(d.data.subscriptions || []); } catch { setSubscriptions([]); } finally { setLoading(false); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return toast.error("Name is required.");
        try { await devApi.createSubscription(appId, { subname: newName, level: parseInt(newLevel) }); toast.success("Subscription created!"); setIsCreateOpen(false); setNewName(""); setNewLevel("1"); fetchSubscriptions(); }
        catch (err: any) { toast.error(err.response?.data?.message || "Failed to create subscription."); }
    };

    const handleUpdate = async (id: string) => {
        try { await devApi.updateSubscription(id, { name: editName, level: parseInt(editLevel) }); toast.success("Subscription updated."); setEditingId(null); fetchSubscriptions(); }
        catch (err: any) { toast.error(err.response?.data?.message || "Failed to update subscription."); }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm({ title: "Delete Subscription", description: "Are you sure you want to delete this subscription?", variant: "destructive" })) return;
        try { await devApi.deleteSubscription(id); toast.success("Subscription deleted."); fetchSubscriptions(); }
        catch (err: any) { toast.error(err.response?.data?.message || "Failed to delete subscription."); }
    };

    const startEdit = (sub: Subscription) => { setEditingId(sub.id); setEditName(sub.name); setEditLevel(String(sub.level)); };

    const filtered = subscriptions.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="max-w-[1400px] mx-auto h-full flex flex-col">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 shrink-0">
                <nav className="flex mb-3" aria-label="Breadcrumb"><ol className="inline-flex items-center space-x-1 text-sm text-muted-foreground"><li className="hover:text-foreground transition-colors cursor-pointer">Manage Apps</li><li><ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/60" /></li><li className="text-foreground font-medium">{appName}</li><li><ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/60" /></li><li className="text-foreground font-medium">Subscriptions</li></ol></nav>
            </motion.div>
            <SellerTable
                title="Subscriptions"
                description="Manage subscription tiers for your application."
                data={loading ? [] : filtered}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search subscriptions..."
                primaryAction={{
                    label: "New Subscription",
                    icon: <Plus className="w-4 h-4 mr-2" />,
                    onClick: () => setIsCreateOpen(true),
                    disabled: isPaused
                }}
                columns={
                    <>
                        <th className="px-4 py-3 font-semibold">NAME</th>
                        <th className="px-4 py-3 font-semibold">LEVEL</th>
                        <th className="px-4 py-3 font-semibold w-32">ACTIONS</th>
                    </>
                }
                renderRow={(sub, idx) => (
                    <SellerTableRow key={sub.id} index={idx}>
                        <td className="px-4 py-3">
                            {editingId === sub.id ? <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-background border-border text-foreground h-8 rounded-lg w-48" autoFocus />
                            : <span className="font-medium text-foreground/80">{sub.name}</span>}
                        </td>
                        <td className="px-4 py-3">
                            {editingId === sub.id ? <Input type="number" min="1" value={editLevel} onChange={(e) => setEditLevel(e.target.value)} className="bg-background border-border text-foreground h-8 rounded-lg w-20" />
                            : <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/25 dark:text-purple-400 text-[10px] font-semibold uppercase tracking-wider">Level {sub.level}</Badge>}
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                {editingId === sub.id ? (
                                    <>
                                        <Button size="sm" onClick={() => handleUpdate(sub.id)} className="h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-foreground text-xs rounded-lg shadow-lg">Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 px-3 text-muted-foreground hover:text-foreground text-xs rounded-lg">Cancel</Button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => startEdit(sub)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground/60 hover:text-primary dark:hover:text-primary transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDelete(sub.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground/60 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </>
                                )}
                            </div>
                        </td>
                    </SellerTableRow>
                )}
            />

            {/* Create Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setIsCreateOpen(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md bg-card dark:bg-muted/40 border border-border rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-pink-600/15 flex items-center justify-center"><CreditCard className="w-5 h-5 text-pink-600 dark:text-pink-400" /></div>
                                <div><h2 className="text-lg font-bold text-foreground">New Subscription</h2><p className="text-xs text-muted-foreground/70">Create a new subscription tier.</p></div>
                            </div>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Name <span className="text-red-500">*</span></label><Input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Seller" className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" /></div>
                                <div className="space-y-1.5"><label className="text-xs text-muted-foreground font-medium">Level</label><Input type="number" min="1" value={newLevel} onChange={(e) => setNewLevel(e.target.value)} className="bg-background border-border text-foreground focus-visible:ring-primary/50 rounded-lg" /></div>
                                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                                    <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg">Cancel</Button>
                                    <Button type="submit" className="bg-primary hover:bg-primary text-white font-medium rounded-lg shadow-lg shadow-primary/20">Create</Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
