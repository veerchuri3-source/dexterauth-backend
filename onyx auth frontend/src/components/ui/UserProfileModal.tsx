import { motion, AnimatePresence } from "motion/react";
import { X, Shield, User as UserIcon } from "lucide-react";
import ShinyText from "./shiny-text";
import GradientText from "./gradient-text";
import { BadgeIcon } from "../Badges";
import { getDefaultAvatarUrl } from "../../lib/utils";

export interface UserProfile {
    username: string;
    display_name?: string;
    avatar_url?: string;
    email?: string;
    banner_url?: string;
    bio?: string;
    role: string;
    badges?: string[];
    plan?: string;
}

interface UserProfileModalProps {
    profile: UserProfile | null;
    onClose: () => void;
}

export function UserProfileModal({ profile, onClose }: UserProfileModalProps) {
    return (
        <AnimatePresence>
            {profile && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="w-full max-w-sm bg-[#0F172A] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Profile Header & Background */}
                        {profile.banner_url ? (
                            <div className="h-32 bg-cover bg-center relative" style={{ backgroundImage: `url(${profile.banner_url})` }}>
                                <button 
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors backdrop-blur-sm"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="h-32 bg-gradient-to-r from-primary/80 to-primary/40 relative">
                                <button 
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        
                        {/* Avatar (Overlapping) */}
                        <div className="px-6 relative flex justify-between items-end -mt-12 mb-4">
                            <div className="w-24 h-24 rounded-full border-4 border-[#0F172A] bg-[#1E293B] shadow-xl overflow-hidden flex items-center justify-center flex-shrink-0 z-10">
                                {profile.avatar_url || profile.email || profile.username ? (
                                    <img 
                                        src={profile.avatar_url || getDefaultAvatarUrl(profile.email, profile.username)} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <span className="text-4xl font-bold text-white">
                                        {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className={`px-3 py-1 mb-2 rounded-full text-xs font-bold uppercase tracking-wider ${
                                profile.role === 'admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                profile.role === 'manager' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                                {profile.role}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="px-6 pb-6">
                            <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                                {profile.plan === 'Seller' ? (
                                    <>
                                        <ShinyText 
                                            text={profile.display_name || profile.username} 
                                            speed={2} 
                                            color="#94a3b8" 
                                            shineColor="#ffffff" 
                                            className="font-bold text-2xl" 
                                        />
                                        <span className="text-[10px] bg-primary/15 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Seller</span>
                                    </>
                                ) : profile.plan === 'Developer' ? (
                                    <>
                                        <GradientText
                                            colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                            animationSpeed={3}
                                            showBorder={false}
                                            className="font-bold text-2xl"
                                        >
                                            {profile.display_name || profile.username}
                                        </GradientText>
                                        <span className="text-[10px] bg-purple-500/15 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Developer</span>
                                    </>
                                ) : (
                                    profile.display_name || profile.username
                                )}
                                {Array.isArray(profile.badges) && profile.badges.length > 0 && (
                                    <div className="flex items-center gap-1">
                                        {profile.badges.map((bId: string) => (
                                            <BadgeIcon key={bId} badgeId={bId} className="w-5 h-5 text-yellow-400" />
                                        ))}
                                    </div>
                                )}
                            </h3>
                            <p className="text-sm text-slate-400 mb-6 flex items-center gap-1">
                                <UserIcon className="w-4 h-4" />
                                @{profile.username}
                            </p>

                            <div className="space-y-4">
                                {profile.bio && (
                                    <div className="bg-[#1E293B] rounded-xl p-4 border border-slate-700/50">
                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <UserIcon className="w-3.5 h-3.5" />
                                            About Me
                                        </h4>
                                        <p className="text-sm text-slate-200 whitespace-pre-wrap">{profile.bio}</p>
                                    </div>
                                )}
                                <div className="bg-[#1E293B] rounded-xl p-4 border border-slate-700/50">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Shield className="w-3.5 h-3.5" />
                                        System Role
                                    </h4>
                                    <p className="text-sm text-slate-200 capitalize font-medium">{profile.role}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
