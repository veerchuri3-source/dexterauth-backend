import { useState, useEffect } from "react";
import { devApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ChevronRight, Search, Trash2, ChevronLeft, MonitorPlay, PackageOpen, RefreshCw, Wifi } from "lucide-react";
import { SellerTable, SellerTableRow } from "../components/ui/premium-data-table";

interface Session { id: string; user_id?: string; username?: string; ip?: string; device?: string; created_at: string; expires_at?: string; }
interface SessionsProps { appId: string; appName: string; }

import { useDialog } from "../hooks/use-dialog";

export default function Sessions({ appId, appName }: SessionsProps) {
    const { confirm } = useDialog();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => { if (appId) fetchSessions(); }, [appId]);

    const fetchSessions = async () => {
        setLoading(true);
        try { const d = await devApi.getSessions(appId); if (d.status === "success") setSessions(d.data.sessions || []); } catch { setSessions([]); } finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm({ title: "Kill Session", description: "Are you sure you want to terminate this session?", variant: "destructive" })) return;
        try { await devApi.deleteSession(id); toast.success("Session terminated."); fetchSessions(); } 
        catch (error: any) { toast.error(error.response?.data?.message || "Failed to terminate session."); }
    };

    const handleKillAll = async () => {
        if (sessions.length === 0) return;
        if (!await confirm({ title: "Kill All Sessions", description: `Are you sure you want to kill all ${sessions.length} sessions?`, variant: "destructive" })) return;
        try { await Promise.all(sessions.map(s => devApi.deleteSession(s.id))); toast.success("All sessions terminated."); fetchSessions(); } 
        catch (error: any) { toast.error(error.response?.data?.message || "Failed to terminate all sessions."); fetchSessions(); }
    };

    const filtered = sessions.filter(s => (s.username || "").toLowerCase().includes(searchQuery.toLowerCase()) || (s.ip || "").toLowerCase().includes(searchQuery.toLowerCase()));
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="max-w-[1400px] mx-auto h-full flex flex-col">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 shrink-0">
                <nav className="flex mb-3" aria-label="Breadcrumb"><ol className="inline-flex items-center space-x-1 text-sm text-muted-foreground"><li className="hover:text-foreground transition-colors cursor-pointer">Manage Apps</li><li><ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/60" /></li><li className="text-foreground font-medium">{appName}</li><li><ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/60" /></li><li className="text-foreground font-medium">Sessions</li></ol></nav>
            </motion.div>
            <SellerTable
                title="Sessions"
                description="Monitor and manage active user sessions."
                data={loading ? [] : paginated}
                searchQuery={searchQuery}
                onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
                searchPlaceholder="Search by username or IP..."
                primaryAction={{
                    label: "Refresh",
                    icon: <RefreshCw className="w-4 h-4 mr-2" />,
                    onClick: fetchSessions
                }}
                actions={
                    <>
                        {sessions.length > 0 && (
                            <Button onClick={handleKillAll} className="bg-red-600 hover:bg-red-500 text-white font-medium h-10 px-4 rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-[0.97]">
                                <Trash2 className="w-4 h-4 mr-2 text-white" /> Kill All
                            </Button>
                        )}
                    </>
                }
                columns={
                    <>
                        <th className="px-4 py-3 font-semibold">USER</th>
                        <th className="px-4 py-3 font-semibold hidden md:table-cell">IP ADDRESS</th>
                        <th className="px-4 py-3 font-semibold">STATUS</th>
                        <th className="px-4 py-3 font-semibold hidden lg:table-cell">STARTED</th>
                        <th className="px-4 py-3 font-semibold w-20">ACTION</th>
                    </>
                }
                renderRow={(session, idx) => (
                    <SellerTableRow key={session.id} index={idx}>
                        <td className="px-4 py-3 font-medium text-foreground/80">{session.username || session.user_id?.substring(0, 8) || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell">{session.ip || "—"}</td>
                        <td className="px-4 py-3"><Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px] font-semibold uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse" />Active</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{new Date(session.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3">
                            <button onClick={() => handleDelete(session.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground/60 hover:text-red-400 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100" title="Kill Session"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                    </SellerTableRow>
                )}
                footer={
                    !loading && filtered.length > 0 && (
                        <div className="flex items-center justify-between w-full">
                            <p className="text-xs text-muted-foreground/70">Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}</p>
                            <div className="flex items-center gap-1.5">
                                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground h-8 w-8 p-0 rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></Button>
                                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (<Button key={i+1} variant="outline" size="sm" onClick={() => setCurrentPage(i+1)} className={`h-8 w-8 p-0 rounded-lg text-xs font-medium ${currentPage === i+1 ? 'bg-primary border-primary text-white hover:bg-primary hover:text-white' : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{i+1}</Button>))}
                                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground h-8 w-8 p-0 rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    )
                }
            />
        </div>
    );
}
