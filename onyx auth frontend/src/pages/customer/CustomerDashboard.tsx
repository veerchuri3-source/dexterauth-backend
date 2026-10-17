import React, { useEffect, useState, useContext } from 'react';
import { CustomerPanelContext } from './CustomerPanel';
import { customerApi } from '../../lib/customerApi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Search, LogOut, Clock, ShieldCheck, Cpu, Key, Database, RefreshCw, Smartphone, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

const CustomerDashboard = () => {
    const { appInfo } = useContext(CustomerPanelContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isResetting, setIsResetting] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [profileData, setProfileData] = useState<any>(null);
    const [accountVariables, setAccountVariables] = useState<any[]>([]);
    const [clientStatus, setClientStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    // Polling Localhost Handshake
    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        const handshake = async () => {
            try {
                // Fetching from a locally running app that the customer has open
                const res = await fetch('http://localhost:1337/handshake', { method: 'GET', mode: 'cors' });
                if (res.ok) {
                    setClientStatus('connected');
                } else {
                    setClientStatus('disconnected');
                }
            } catch (err) {
                setClientStatus('disconnected');
            }
        };

        handshake(); // initial
        interval = setInterval(handshake, 5000); // Poll every 5s

        return () => clearInterval(interval);
    }, []);

    // Load Profile and Variables
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const res = await customerApi.getProfile();
                if (res.status === 'success') {
                    setProfileData(res.data);
                }
                const varsRes = await customerApi.getVariables();
                if (varsRes.status === 'success') {
                    setAccountVariables(varsRes.data.variables || []);
                }
            } catch (err: any) {
                toast.error("Session expired. Please log in again.");
                navigate('../auth');
            } finally {
                setLoading(false);
            }
        };
        
        loadProfile();
    }, [navigate]);

    const handleLogout = async () => {
        await customerApi.logout();
        localStorage.removeItem('customer_token');
        navigate('../auth');
    };

    const handleResetHwid = async () => {
        setIsResetting(true);
        try {
            const res = await customerApi.resetHwid();
            if (res.status === 'success') {
                toast.success("Hardware ID Reset Successfully");
                // Reload profile to get new cooldown if applicable
                const profileRes = await customerApi.getProfile();
                setProfileData(profileRes.data);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to reset HWID");
        } finally {
            setIsResetting(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 4) {
            toast.error("Password must be at least 4 characters.");
            return;
        }
        setIsChangingPassword(true);
        try {
            await customerApi.updateCredentials({ password: newPassword });
            toast.success("Password changed successfully!");
            setNewPassword("");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to change password");
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (loading || !profileData) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    const { profile, app_version } = profileData;

    // Calculate Expiration
    const expiresAt = new Date(profile.subscriptions?.[0]?.expiry || Date.now());
    const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    return (
        <div className="min-h-screen bg-[#09090b] flex flex-col items-center">
            
            {/* Top Navigation */}
            <header className="w-full max-w-6xl mt-4 sm:mt-6 px-4 mb-6 sm:mb-8">
                <div className="bg-[#0f0f13] border border-[#1f1f23] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                            type="text" 
                            disabled 
                            placeholder="Search disabled..."
                            className="w-full bg-[#1f1f23] border border-[#27272a] text-white text-sm rounded-lg pl-9 py-2 focus:outline-none opacity-50 cursor-not-allowed"
                        />
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 text-sm font-medium">
                        {/* Status */}
                        <div className="hidden md:flex items-center bg-[#1f1f23] rounded-full px-4 py-1.5 border border-[#27272a]">
                            <span className="text-gray-400 mr-2">Expires in:</span>
                            <span className="text-white font-mono">{daysLeft} Day(s)</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <span className="text-white bg-primary/20 text-primary px-3 py-1.5 rounded-full border border-primary/30">
                                {profile.username}
                            </span>
                        </div>

                        <button onClick={handleLogout} className="flex items-center text-red-400 hover:text-red-300 transition-colors sm:ml-2">
                            <LogOut className="w-4 h-4 mr-1.5" />
                            Log Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full max-w-6xl px-4 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                
                {/* Column 1: Account Info */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    <div className="bg-[#0f0f13] border border-[#1f1f23] rounded-2xl p-4 sm:p-6 shadow-md relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                            <ShieldCheck className="w-5 h-5 mr-2 text-primary" />
                            Account Information
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-[#15151a] border border-[#1f1f23] rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <Clock className="w-4 h-4 text-gray-400 mr-3" />
                                    <span className="text-sm text-gray-400">Account Created</span>
                                </div>
                                <span className="text-sm font-medium text-white">{new Date(profile.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="bg-[#15151a] border border-[#1f1f23] rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <Cpu className="w-4 h-4 text-gray-400 mr-3" />
                                    <span className="text-sm text-gray-400">HWID Bound</span>
                                </div>
                                <span className="text-sm font-medium text-white">{profile.hwid ? 'Yes' : 'No'}</span>
                            </div>

                            <div className="bg-[#15151a] border border-[#1f1f23] rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <Smartphone className="w-4 h-4 text-gray-400 mr-3" />
                                    <span className="text-sm text-gray-400">2FA Status</span>
                                </div>
                                <span className="text-sm font-medium text-white">{profile.is_2fa_enabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            
                            <div className="bg-[#15151a] border border-[#1f1f23] rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <Key className="w-4 h-4 text-gray-400 mr-3" />
                                    <span className="text-sm text-gray-400">Subscription Tier</span>
                                </div>
                                <span className="text-sm font-medium text-primary uppercase">{profile.subscriptions?.[0]?.subscription_level || 'Default'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0f0f13] border border-[#1f1f23] rounded-2xl p-4 sm:p-6 shadow-md relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                            <Database className="w-5 h-5 mr-2 text-primary" />
                            Account Variables
                        </h3>
                        {accountVariables.length > 0 ? (
                            <div className="bg-[#15151a] border border-[#1f1f23] rounded-xl overflow-hidden divide-y divide-[#1f1f23]">
                                {accountVariables.map((v, idx) => (
                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-[#1a1a20] transition-colors">
                                        <div className="flex items-center space-x-3 truncate">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                                                <Database className="w-4 h-4" />
                                            </div>
                                            <div className="truncate flex flex-col items-start gap-1">
                                                <p className="text-sm font-semibold text-white truncate">{v.name}</p>
                                                {v.is_readonly ? (
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Read-Only</span>
                                                ) : (
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">Modifiable</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-4 shrink-0 max-w-[50%]">
                                            <div className="px-3 py-1.5 bg-[#0a0a0c] border border-[#2a2a32] rounded-md font-mono text-xs text-gray-300 truncate shadow-inner" title={v.data}>
                                                {v.data}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#15151a] border border-[#1f1f23] rounded-xl p-8 flex flex-col items-center justify-center text-center">
                                <Database className="w-8 h-8 text-gray-600 mb-3" />
                                <p className="text-sm text-gray-400">No account variables are currently configured for this application.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Management & Status */}
                <div className="space-y-4 sm:space-y-6">
                    {/* Desktop Client Sync */}
                    <div className="bg-[#0f0f13] border border-[#1f1f23] rounded-2xl p-4 sm:p-6 shadow-md">
                        <h3 className="text-lg font-bold text-white mb-4">Client Sync</h3>
                        <div className={`flex items-center justify-between p-3 rounded-lg border ${clientStatus === 'connected' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <div className="flex items-center">
                                <div className={`w-2.5 h-2.5 rounded-full mr-3 ${clientStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                <span className={`text-sm font-medium ${clientStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                                    {clientStatus === 'connected' ? 'Client Detected' : 'Client Not Found'}
                                </span>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">127.0.0.1:1337</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                            The panel attempts to communicate with your locally running software client for 1-click logins and deep integration.
                        </p>
                    </div>

                    {/* Hardware ID Reset */}
                    <div className="bg-[#0f0f13] border border-[#1f1f23] rounded-2xl p-4 sm:p-6 shadow-md">
                        <h3 className="text-lg font-bold text-white mb-2">Hardware ID</h3>
                        <p className="text-xs text-gray-400 mb-4">
                            If you've changed your computer or upgraded your hardware, you need to reset your HWID to continue using the software.
                        </p>
                        <button 
                            onClick={handleResetHwid}
                            disabled={isResetting}
                            className="w-full bg-[#1f1f23] hover:bg-[#27272a] disabled:opacity-50 text-white border border-[#3f3f46] transition-colors py-2.5 rounded-xl text-sm font-medium flex items-center justify-center"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
                            {isResetting ? 'Resetting...' : 'Reset HWID'}
                        </button>
                    </div>

                    {/* Change Password */}
                    <div className="bg-[#0f0f13] border border-[#1f1f23] rounded-2xl p-4 sm:p-6 shadow-md">
                        <h3 className="text-lg font-bold text-white mb-2">Change Password</h3>
                        <p className="text-xs text-gray-400 mb-4">
                            Update your account password securely.
                        </p>
                        <div className="flex flex-col gap-3">
                            <input 
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-[#15151a] text-sm text-white px-3 py-2 rounded-xl border border-[#1f1f23] focus:border-primary focus:outline-none"
                            />
                            <button 
                                onClick={handleChangePassword}
                                disabled={isChangingPassword}
                                className="w-full bg-[#1f1f23] hover:bg-[#27272a] disabled:opacity-50 text-white border border-[#3f3f46] transition-colors py-2.5 rounded-xl text-sm font-medium flex items-center justify-center"
                            >
                                <Key className="w-4 h-4 mr-2" />
                                {isChangingPassword ? 'Changing...' : 'Change Password'}
                            </button>
                        </div>
                    </div>

                    {/* Version Check */}
                    <div className="bg-[#0f0f13] border border-[#1f1f23] rounded-2xl p-4 sm:p-6 shadow-md">
                        <h3 className="text-lg font-bold text-white mb-4">Version Status</h3>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Current App Version</span>
                            <span className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">v{app_version}</span>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default CustomerDashboard;
