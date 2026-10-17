import React, { useState, useContext } from 'react';
import { CustomerPanelContext } from './CustomerPanel';
import { customerApi } from '../../lib/customerApi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Key, User, Shield, Lock, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const FloatingInput = ({ id, type, label, icon: Icon, value, onChange, required = true }: any) => (
    <div className="relative z-0 w-full mb-6 group">
        <input
            type={type}
            name={id}
            id={id}
            className="block py-3 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-700 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer transition-colors"
            placeholder=" "
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
        />
        <label
            htmlFor={id}
            className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 flex items-center gap-2"
        >
            <Icon className="w-4 h-4" />
            {label}
        </label>
    </div>
);

const CustomerAuth = () => {
    const { appInfo } = useContext(CustomerPanelContext);
    const navigate = useNavigate();
    const [view, setView] = useState<'login' | 'register' | 'upgrade'>('login');
    const [loginMode, setLoginMode] = useState<'credentials' | 'license'>('credentials');
    const [loading, setLoading] = useState(false);

    // Form states
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [license, setLicense] = useState('');
    const [tfa, setTfa] = useState('');
    const [requiresTfa, setRequiresTfa] = useState(false);

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (view === 'login') {
                if (loginMode === 'credentials') {
                    const res = await customerApi.loginUser(appInfo.app_id, { username, password, tfa });
                    if (res.status === 'success') {
                        localStorage.setItem('customer_token', res.data.token);
                        toast.success('Logged in successfully!');
                        navigate('../dashboard');
                    }
                } else {
                    const res = await customerApi.loginLicense(appInfo.app_id, { license, tfa });
                    if (res.status === 'success') {
                        localStorage.setItem('customer_token', res.data.token);
                        toast.success('Logged in successfully!');
                        navigate('../dashboard');
                    }
                }
            } else if (view === 'register') {
                const res = await customerApi.register(appInfo.app_id, { username, password, license });
                if (res.status === 'success') {
                    if (res.data && res.data.token) {
                        localStorage.setItem('customer_token', res.data.token);
                        toast.success('Account registered! Logged in successfully.');
                        navigate('../dashboard');
                    } else {
                        toast.success('Account registered! You can now log in.');
                        setView('login');
                    }
                }
            } else if (view === 'upgrade') {
                const res = await customerApi.upgrade(appInfo.app_id, { username, license });
                if (res.status === 'success') {
                    toast.success('Account upgraded successfully!');
                    setView('login');
                }
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Authentication failed';
            if (msg === 'Two-factor authentication code required') {
                setRequiresTfa(true);
                toast.error('Please enter your 2FA code to continue.');
            } else {
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-[#09090b]">
            <div className="w-full max-w-md">
                
                {/* Header / Logo */}
                <div className="flex flex-col items-center mb-8">
                    {appInfo?.panel_icon ? (
                        <img src={appInfo.panel_icon} alt="Panel Icon" className="w-16 h-16 rounded-2xl mb-4 shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-primary/30 object-cover" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            <Activity className="w-8 h-8 text-primary" />
                        </div>
                    )}
                    <h2 className="text-2xl font-bold tracking-tight text-white">{appInfo?.app_name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">Seller Customer Panel</p>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0f0f13] border border-[#1f1f23] rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
                >
                    {/* Background glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-primary/50 blur-[2px]"></div>

                    <form onSubmit={handleAction}>
                        
                        {/* Dynamic Title */}
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-white">
                                {view === 'login' ? 'Welcome Back' : view === 'register' ? 'Create Account' : 'Upgrade Account'}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">
                                {view === 'login' ? 'Sign in to access your premium features.' : 
                                 view === 'register' ? 'Register your license key to an account.' : 
                                 'Redeem a new license key.'}
                            </p>
                        </div>

                        {/* Login Mode Tabs */}
                        {view === 'login' && (
                            <div className="relative flex bg-[#1f1f23]/50 p-1 rounded-xl mb-8 border border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setLoginMode('credentials')}
                                    className={`flex-1 relative z-10 py-2 text-sm font-medium transition-colors ${loginMode === 'credentials' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    User / Pass
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLoginMode('license')}
                                    className={`flex-1 relative z-10 py-2 text-sm font-medium transition-colors ${loginMode === 'license' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    License Only
                                </button>
                                {/* Animated Slider */}
                                <motion.div
                                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary/20 border border-primary/30 rounded-lg shadow-sm"
                                    initial={false}
                                    animate={{ left: loginMode === 'credentials' ? '4px' : 'calc(50% + 0px)' }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${view}-${loginMode}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-2"
                            >
                                {/* Input Fields based on View/Mode */}
                                {(view === 'register' || view === 'upgrade' || (view === 'login' && loginMode === 'credentials')) && (
                                    <FloatingInput id="username" type="text" label="Username" icon={User} value={username} onChange={setUsername} />
                                )}

                                {(view === 'register' || (view === 'login' && loginMode === 'credentials')) && (
                                    <FloatingInput id="password" type="password" label="Password" icon={Lock} value={password} onChange={setPassword} />
                                )}

                                {(view === 'register' || view === 'upgrade' || (view === 'login' && loginMode === 'license')) && (
                                    <FloatingInput id="license" type="text" label="License Key" icon={Key} value={license} onChange={setLicense} />
                                )}

                                {view === 'login' && requiresTfa && (
                                    <FloatingInput id="tfa" type="text" label="2FA Code" icon={Shield} value={tfa} onChange={setTfa} required={true} />
                                )}
                            </motion.div>
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                view === 'login' ? 'Sign In' : view === 'register' ? 'Complete Registration' : 'Apply Upgrade'
                            )}
                        </button>
                    </form>
                </motion.div>

                <div className="mt-8 flex justify-center gap-4 text-sm font-medium">
                    {view !== 'login' && (
                        <button onClick={() => { setView('login'); setRequiresTfa(false); }} className="text-gray-400 hover:text-white transition-colors">Sign in</button>
                    )}
                    {view !== 'register' && (
                        <button onClick={() => { setView('register'); setRequiresTfa(false); }} className="text-gray-400 hover:text-white transition-colors">Sign up</button>
                    )}
                    {view !== 'upgrade' && (
                        <button onClick={() => { setView('upgrade'); setRequiresTfa(false); }} className="text-gray-400 hover:text-white transition-colors">Upgrade Now</button>
                    )}
                </div>
                
            </div>
        </div>
    );
};

export default CustomerAuth;
