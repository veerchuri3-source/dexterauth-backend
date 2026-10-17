import { useState, useEffect } from "react";
import { devApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ChevronRight, Search, Trash2, Ban, ChevronLeft, Shield, PackageOpen, ShieldOff } from "lucide-react";
import { CheckboxAnimated } from "../components/ui/checkbox-animated";
import { SellerTable, SellerTableRow } from "../components/ui/premium-data-table";

interface Token { id: string; token_string: string; assigned_to: string; type: string; status: string; banned: boolean; ban_reason?: string; }
interface TokensProps { appId: string; appName: string; }

import { useDialog } from "../hooks/use-dialog";

export default function Tokens({ appId, appName }: TokensProps) {
    const { confirm, prompt } = useDialog();
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectAll, setSelectAll] = useState(false);
    const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => { if (appId) fetchTokens(); }, [appId]);

    const fetchTokens = async () => {
        setLoading(true);
        try { const d = await devApi.getTokens(appId); if (d.status === "success") setTokens(d.data.tokens || []); } catch { setTokens([]); } finally { setLoading(false); }
    };

    const handleSelectAll = () => { if (selectAll) { setSelectedTokens(new Set()); setSelectAll(false); } else { setSelectedTokens(new Set(filteredTokens.map(t => t.id))); setSelectAll(true); } };
    const toggleSelect = (id: string) => { const s = new Set(selectedTokens); if (s.has(id)) { s.delete(id); setSelectAll(false); } else { s.add(id); if (s.size === filteredTokens.length) setSelectAll(true); } setSelectedTokens(s); };

    const handleBan = async (id: string) => {
        const reason = await prompt({ title: "Ban Token", description: "Please enter a reason for banning this token:", placeholder: "e.g. abuse" });
        if (!reason) return;
        try { await devApi.updateToken(id, { status: 'Banned', ban_reason: reason }); toast.success("Token banned."); fetchTokens(); } 
        catch (error: any) { toast.error(error.response?.data?.message || "Failed to ban token."); }
    };
    const handleUnban = async (id: string) => { 
        try { await devApi.updateToken(id, { status: 'Active' }); toast.success("Token unbanned."); fetchTokens(); } 
        catch (error: any) { toast.error(error.response?.data?.message || "Failed to unban token."); } 
    };
    const handleDelete = async (id: string) => { 
        if (!await confirm({ title: "Delete Token", description: "Are you sure you want to delete this token?", variant: "destructive" })) return; 
        try { await devApi.deleteToken(id); toast.success("Token deleted."); fetchTokens(); } 
        catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete token."); } 
    };
    const handleBulkDelete = async () => { 
        if (selectedTokens.size === 0) return; 
        if (!await confirm({ title: "Delete Tokens", description: `Are you sure you want to delete ${selectedTokens.size} tokens?`, variant: "destructive" })) return; 
        try { 
            await Promise.all(Array.from(selectedTokens).map(id => devApi.deleteToken(id))); 
            toast.success(`${selectedTokens.size} tokens deleted.`); 
            setSelectedTokens(new Set()); 
            setSelectAll(false); 
            fetchTokens(); 
        } catch (error: any) { 
            toast.error(error.response?.data?.message || "Failed to delete tokens."); 
            fetchTokens(); 
        } 
    };

    const filteredTokens = tokens.filter(t => (t.token_string || "").toLowerCase().includes(searchQuery.toLowerCase()) || (t.assigned_to || "").toLowerCase().includes(searchQuery.toLowerCase()));
    const totalPages = Math.ceil(filteredTokens.length / itemsPerPage) || 1;
    const paginatedTokens = filteredTokens.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const bannedCount = tokens.filter(t => t.banned).length;

    return (
        <div className="max-w-[1400px] mx-auto h-full flex flex-col">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 shrink-0">
                <nav className="flex mb-3" aria-label="Breadcrumb"><ol className="inline-flex items-center space-x-1 text-sm text-muted-foreground"><li className="hover:text-foreground transition-colors cursor-pointer">Manage Apps</li><li><ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/60" /></li><li className="text-foreground font-medium">{appName}</li><li><ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/60" /></li><li className="text-foreground font-medium">Tokens</li></ol></nav>
            </motion.div>
            <SellerTable
                title="Tokens"
                description="Tokens act as access keys allowing users to access the program. Tokens are auto-generated."
                data={loading ? [] : paginatedTokens}
                searchQuery={searchQuery}
                onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
                searchPlaceholder="Search tokens..."
                actions={
                    <>
                        {selectedTokens.size > 0 && (
                            <Button variant="outline" onClick={handleBulkDelete} className="bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20 hover:text-red-300 h-10 rounded-xl">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete ({selectedTokens.size})
                            </Button>
                        )}
                    </>
                }
                columns={
                    <>
                        <th className="px-4 py-3 w-10 font-semibold"><CheckboxAnimated checked={selectAll} onCheckedChange={handleSelectAll} /></th>
                        <th className="px-4 py-3 font-semibold">TOKEN</th>
                        <th className="px-4 py-3 font-semibold">ASSIGNED TO</th>
                        <th className="px-4 py-3 font-semibold">TYPE</th>
                        <th className="px-4 py-3 font-semibold">STATUS</th>
                        <th className="px-4 py-3 font-semibold hidden lg:table-cell">BAN REASON</th>
                        <th className="px-4 py-3 font-semibold w-28">ACTIONS</th>
                    </>
                }
                renderRow={(token, idx) => (
                    <SellerTableRow key={token.id} index={idx} className={selectedTokens.has(token.id) ? 'bg-primary/5' : ''}>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <CheckboxAnimated checked={selectedTokens.has(token.id)} onCheckedChange={() => toggleSelect(token.id)} />
                        </td>
                        <td className="px-4 py-3"><code className="text-[13px] font-mono text-foreground/80 tracking-wide">{token.token_string?.substring(0, 24)}...</code></td>
                        <td className="px-4 py-3 text-muted-foreground">{token.assigned_to || "—"}</td>
                        <td className="px-4 py-3"><Badge className="bg-primary/15 text-primary border-primary/25 text-[10px] font-semibold uppercase tracking-wider">{token.type || "license"}</Badge></td>
                        <td className="px-4 py-3">
                            <Badge className={`text-[10px] font-semibold uppercase tracking-wider ${token.banned ? 'bg-red-500/15 text-red-400 border-red-500/25' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'}`}>
                                {token.banned ? 'Banned' : 'Active'}
                            </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground/70 text-xs hidden lg:table-cell truncate max-w-[150px]">{token.ban_reason || "—"}</td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {token.banned ? (
                                    <button onClick={() => handleUnban(token.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 text-muted-foreground/60 hover:text-emerald-400 transition-colors" title="Unban"><Shield className="w-3.5 h-3.5" /></button>
                                ) : (
                                    <button onClick={() => handleBan(token.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-500/10 text-muted-foreground/60 hover:text-amber-400 transition-colors" title="Ban"><Ban className="w-3.5 h-3.5" /></button>
                                )}
                                <button onClick={() => handleDelete(token.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground/60 hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </td>
                    </SellerTableRow>
                )}
                footer={
                    !loading && filteredTokens.length > 0 && (
                        <div className="flex items-center justify-between w-full">
                            <p className="text-xs text-muted-foreground/70">Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredTokens.length)} of {filteredTokens.length}</p>
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
