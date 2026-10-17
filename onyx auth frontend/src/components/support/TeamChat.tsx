import { useState, useEffect, useRef } from "react";
import { devApi } from "../../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, Send, X, Loader2, User as UserIcon, Shield, Briefcase, ExternalLink, Key, Clock, Settings, Users2, Ticket, Copy, Check } from "lucide-react";
import { BadgeIcon } from "../Badges";
import { Button } from "../ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import ShinyText from "../ui/shiny-text";
import GradientText from "../ui/gradient-text";
import { UserProfileModal } from "../ui/UserProfileModal";

interface TeamChatProps {
    appId: string;
    appName: string;
    userRole: string;
    currentUsername?: string;
}

interface UserProfile {
    username: string;
    display_name?: string;
    avatar_url?: string;
    banner_url?: string;
    bio?: string;
    role: string;
    badges?: string[];
    plan?: string;
}

// Helper to pre-process Discord markdown into HTML tags so rehype-raw can parse them into React components
const preprocessDiscordMarkdown = (text: string) => {
    let processed = text;
    // Spoilers: ||hidden|| -> <spoiler>hidden</spoiler>
    processed = processed.replace(/\|\|(.*?)\|\|/g, '<spoiler>$1</spoiler>');
    // Mentions: @user -> <mention>user</mention>
    processed = processed.replace(/@(\w+)/g, '<mention>$1</mention>');
    // Tab Links: #Settings -> <tablink>Settings</tablink>
    processed = processed.replace(/#([a-zA-Z0-9_]+)/g, '<tablink>$1</tablink>');
    // Timestamps: <t:timestamp:format> -> <timestamp time="timestamp" format="format"></timestamp>
    processed = processed.replace(/<t:(\d+):?([a-zA-Z])?>/g, (match, time, format) => {
        return `<timestamp time="${time}" format="${format || 'F'}"></timestamp>`;
    });
    return processed;
};

// Custom CodeBlock Component with Copy Button
const CodeBlockWithCopy = ({ children, className }: any) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        // Extract raw text from children (which is a string array or a single string)
        const text = Array.isArray(children) ? children.join('') : children;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group">
            <button 
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white hover:bg-slate-700 focus:outline-none focus:opacity-100 z-10 shadow-sm border border-slate-700/50"
                title="Copy code"
            >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {/* The pre block is passed via children */}
            <div className="overflow-x-auto rounded-lg">
                <pre className={className}>{children}</pre>
            </div>
        </div>
    );
};

const formatMessageDate = (timestamp: string | number | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Check if it's today
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
                    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
                        date.getMonth() === yesterday.getMonth() &&
                        date.getFullYear() === yesterday.getFullYear();

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
        return `Today at ${timeString}`;
    } else if (isYesterday) {
        return `Yesterday at ${timeString}`;
    } else {
        return `${date.toLocaleDateString()} at ${timeString}`;
    }
};

export default function TeamChat({ appId, appName, userRole, currentUsername }: TeamChatProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [hasTeam, setHasTeam] = useState(false);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
    const [cooldown, setCooldown] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [mentionState, setMentionState] = useState<{ type: '@' | '#', query: string, startIdx: number } | null>(null);

    const TAB_SUGGESTIONS = ['Overview', 'Manage_Apps', 'Licenses', 'Users', 'Settings', 'Resellers'];

    // Get unique team members from chat history and actual team list
    const getTeamSuggestions = () => {
        const users = new Set(messages.map(m => m.sender_username));
        teamMembers.forEach(tm => users.add(tm.username));
        
        // Remove currently logged in user from suggesting to themselves? No, it's fine.
        return Array.from(users).filter(u => u && u.toLowerCase().includes((mentionState?.query || '').toLowerCase()));
    };

    const getTabSuggestions = () => {
        return TAB_SUGGESTIONS.filter(t => t.toLowerCase().includes((mentionState?.query || '').toLowerCase()));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewMessage(val);
        
        const cursorPosition = e.target.selectionStart || 0;
        const textBeforeCursor = val.slice(0, cursorPosition);
        
        // Match @ or # followed by word characters up to cursor
        const match = textBeforeCursor.match(/([@#])([a-zA-Z0-9_]*)$/);
        
        if (match) {
            setMentionState({
                type: match[1] as '@' | '#',
                query: match[2],
                startIdx: match.index!
            });
        } else {
            setMentionState(null);
        }
    };

    const handleAutocomplete = (suggestion: string) => {
        if (!mentionState || !inputRef.current) return;
        const before = newMessage.slice(0, mentionState.startIdx);
        const after = newMessage.slice(inputRef.current.selectionStart || 0);
        const prefix = mentionState.type;
        const insert = prefix + suggestion + " ";
        
        setNewMessage(before + insert + after);
        setMentionState(null);
        
        // Refocus and put cursor after insertion
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.selectionStart = inputRef.current.selectionEnd = before.length + insert.length;
            }
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (mentionState) {
            const suggestions = mentionState.type === '@' ? getTeamSuggestions() : getTabSuggestions();
            if (e.key === 'Enter' && suggestions.length > 0) {
                e.preventDefault();
                handleAutocomplete(suggestions[0]);
                return;
            }
            if (e.key === 'Escape') {
                setMentionState(null);
                return;
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    useEffect(() => {
        const checkEligibility = async () => {
            setHasTeam(true); // Always allow access
            try {
                const res = await devApi.getTeamMembers();
                if (res.status === 'success' && res.data.teamMembers) {
                    setTeamMembers(res.data.teamMembers);
                }
            } catch {
                setTeamMembers([]);
            }
            setLoading(false);
        };
        if (appId) {
            checkEligibility();
        }
    }, [appId, userRole]);

    useEffect(() => {
        let interval: any;
        if (hasTeam) {
            fetchMessages();
            // Poll for messages every 3 seconds
            interval = setInterval(fetchMessages, 3000);
        }
        return () => clearInterval(interval);
    }, [hasTeam]);

    const fetchMessages = async () => {
        // Prevent polling if tab is not focused/visible to save resources and rate limits
        if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
        try {
            const res = await devApi.getChatMessages(appId);
            if (res.status === 'success') {
                setMessages(res.data.messages);
                scrollToBottom();
            }
        } catch (error) {
            console.error("Failed to fetch messages");
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSend = async () => {
        if (cooldown || !newMessage.trim()) return;
        
        // Slow mode: 2 seconds cooldown
        setCooldown(true);
        setTimeout(() => setCooldown(false), 2000);

        const tempMsg = newMessage;
        setNewMessage("");
        try {
            await devApi.sendChatMessage(appId, tempMsg);
            fetchMessages();
        } catch {
            console.error("Failed to send message");
            setNewMessage(tempMsg);
        }
    };

    const handleAvatarClick = (msg: any) => {
        setSelectedProfile({
            username: msg.sender_username,
            display_name: msg.sender_display_name,
            avatar_url: msg.sender_avatar_url,
            banner_url: msg.sender_banner_url,
            role: msg.sender_role,
            bio: msg.sender_bio,
            badges: msg.sender_badges,
            plan: msg.sender_plan
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p>Loading Team Chat...</p>
            </div>
        );
    }
    
    if (!hasTeam) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground dark:text-slate-500 bg-background dark:bg-[#0F172A] rounded-2xl border border-border dark:border-[#1E293B]">
                <MessageCircle className="w-16 h-16 opacity-20 mb-4" />
                <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">Team Chat Disabled</h2>
                <p>You must add team members to this application before you can use the team chat.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-background dark:bg-[#0B1120] rounded-2xl border border-border dark:border-[#1E293B] shadow-2xl overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-muted/30 dark:bg-[#0F172A] border-b border-border dark:border-[#1E293B]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/20">
                        <MessageCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground dark:text-white tracking-tight">Team Chat</h2>
                        <p className="text-xs text-slate-400 font-medium">Internal discussion for {appName}</p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background dark:bg-[#0B1120] chat-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground dark:text-slate-500 gap-3">
                        <MessageCircle className="w-12 h-12 opacity-30" />
                        <p className="text-sm font-medium">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const displayName = msg.sender_display_name || msg.sender_username;
                        const initial = displayName.charAt(0).toUpperCase();
                        
                        return (
                            <div key={msg.id || idx} className="flex items-start gap-4 group">
                                {/* Avatar */}
                                <button 
                                    onClick={() => handleAvatarClick(msg)}
                                    className="relative flex-shrink-0 mt-1 transition-transform hover:scale-105 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-full focus:outline-none"
                                >
                                    {msg.sender_avatar_url ? (
                                        <img src={msg.sender_avatar_url} alt={displayName} className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-inner border border-primary/30">
                                            {initial}
                                        </div>
                                    )}
                                </button>
                                
                                {/* Message Content */}
                                <div className="flex flex-col min-w-0 max-w-[80%]">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <button 
                                            onClick={() => handleAvatarClick(msg)}
                                            className="text-sm font-bold text-foreground dark:text-white hover:underline focus:outline-none truncate"
                                        >
                                            {msg.sender_plan === 'Seller' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <ShinyText 
                                                        text={displayName} 
                                                        speed={2} 
                                                        color="#94a3b8" 
                                                        shineColor="#ffffff" 
                                                        className="font-bold text-sm" 
                                                    />
                                                    <span className="text-[8px] bg-primary/15 text-primary border border-primary/20 px-1 py-0.2 rounded font-bold uppercase tracking-wider scale-90">Seller</span>
                                                </div>
                                            ) : msg.sender_plan === 'Developer' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <GradientText
                                                        colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                                        animationSpeed={3}
                                                        showBorder={false}
                                                        className="font-bold text-sm"
                                                    >
                                                        {displayName}
                                                    </GradientText>
                                                    <span className="text-[8px] bg-purple-500/15 text-purple-400 border border-purple-500/20 px-1 py-0.2 rounded font-bold uppercase tracking-wider scale-90">Developer</span>
                                                </div>
                                            ) : (
                                                displayName
                                            )}
                                        </button>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                                            msg.sender_role === 'admin' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                            msg.sender_role === 'manager' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }`}>
                                            {msg.sender_role}
                                        </span>
                                        <span className="text-xs text-slate-500 ml-2">
                                            {formatMessageDate(msg.timestamp)}
                                        </span>
                                    </div>
                                    <div className="bg-muted dark:bg-[#1E293B] px-4 py-3 rounded-2xl rounded-tl-none text-sm text-foreground dark:text-slate-200 break-words border border-border dark:border-slate-700/50 shadow-md">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]} 
                                            rehypePlugins={[rehypeRaw]}
                                            components={{
                                                // Handle Code Blocks with Custom Languages
                                                code({node, inline, className, children, ...props}: any) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    const lang = match ? match[1].toLowerCase() : '';
                                                    
                                                    if (!inline) {
                                                        // Custom Cheat Code Blocks
                                                        if (lang === 'hacklog') {
                                                            return <CodeBlockWithCopy className="bg-black text-green-500 font-mono text-xs p-3 rounded border border-green-500/30 overflow-x-auto shadow-[0_0_10px_rgba(34,197,94,0.1)]">{children}</CodeBlockWithCopy>;
                                                        }
                                                        if (lang === 'diff') {
                                                            return <div className="relative group">
                                                                <button onClick={() => { navigator.clipboard.writeText(String(children)); }} className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white hover:bg-slate-700 z-10"><Copy className="w-3.5 h-3.5" /></button>
                                                                <pre className="bg-[#0d1117] text-slate-300 font-mono text-xs p-3 rounded border border-slate-700 overflow-x-auto">
                                                                    {String(children).split('\n').map((line, i) => (
                                                                        <div key={i} className={line.startsWith('+') ? 'text-green-400 bg-green-500/10 px-1' : line.startsWith('-') ? 'text-red-400 bg-red-500/10 px-1' : 'px-1'}>
                                                                            {line}
                                                                        </div>
                                                                    ))}
                                                                </pre>
                                                            </div>;
                                                        }
                                                        if (lang === 'ini') {
                                                            return <div className="relative group">
                                                                <button onClick={() => { navigator.clipboard.writeText(String(children)); }} className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white hover:bg-slate-700 z-10"><Copy className="w-3.5 h-3.5" /></button>
                                                                <pre className="bg-[#1e1e1e] text-orange-400 font-mono text-xs p-3 rounded border border-slate-700 overflow-x-auto">
                                                                    {String(children).split('\n').map((line, i) => (
                                                                        <div key={i} className={line.startsWith('[') ? 'text-primary font-bold' : line.includes('=') ? 'text-slate-300' : ''}>
                                                                            {line.split('=').map((part, j) => j === 0 && line.includes('=') ? <span key={j} className="text-orange-400">{part}=</span> : <span key={j}>{part}</span>)}
                                                                        </div>
                                                                    ))}
                                                                </pre>
                                                            </div>;
                                                        }
                                                        if (lang === 'fix') {
                                                            return <CodeBlockWithCopy className="bg-[#2b2210] text-yellow-400 font-mono text-xs p-3 rounded border border-yellow-600/50 overflow-x-auto shadow-inner">{children}</CodeBlockWithCopy>;
                                                        }
                                                        // Default Code Block
                                                        return <CodeBlockWithCopy className="bg-[#0f111a] text-primary font-mono text-xs p-3 rounded border border-slate-700 overflow-x-auto">{children}</CodeBlockWithCopy>;
                                                    }
                                                    // Inline Code
                                                    return <code className="bg-slate-800 text-primary px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>;
                                                },
                                                // Handle Blockquotes
                                                blockquote({children}: any) {
                                                    return <blockquote className="border-l-4 border-primary pl-3 py-0.5 text-slate-400 italic bg-primary/5 rounded-r">{children}</blockquote>;
                                                },
                                                // Custom Elements (parsed via rehype-raw)
                                                spoiler: ({children}: any) => (
                                                    <span className="bg-slate-900 text-slate-900 hover:text-slate-200 cursor-pointer rounded px-1.5 transition-colors duration-200">{children}</span>
                                                ),
                                                mention: ({children}: any) => {
                                                    const isMe = currentUsername && children[0] === currentUsername;
                                                    return (
                                                        <span className={`px-1.5 rounded font-medium cursor-pointer transition-colors ${isMe ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}>
                                                            @{children}
                                                        </span>
                                                    );
                                                },
                                                tablink: ({children}: any) => (
                                                    <span className="bg-purple-500/20 text-purple-400 px-1.5 rounded font-medium hover:bg-purple-500/30 cursor-pointer transition-colors inline-flex items-center gap-1">
                                                        <ExternalLink className="w-3 h-3" /> {children}
                                                    </span>
                                                ),
                                                timestamp: ({time, format}: any) => {
                                                    const date = new Date(parseInt(time) * 1000);
                                                    const formatted = format === 'R' ? 'Relative time' : date.toLocaleString(); // Simplified for now
                                                    return <span className="bg-slate-800 text-slate-300 px-1.5 rounded text-xs" title={date.toLocaleString()}>{formatted}</span>;
                                                }
                                            }}
                                        >
                                            {preprocessDiscordMarkdown(msg.content)}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-muted/30 dark:bg-[#0F172A] border-t border-border dark:border-[#1E293B] relative">
                {/* Autocomplete Dropdown */}
                <AnimatePresence>
                    {mentionState && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full left-4 mb-2 w-64 max-h-48 overflow-y-auto bg-popover dark:bg-[#1E293B] border border-border dark:border-slate-700 rounded-xl shadow-2xl z-20 py-1 chat-scrollbar"
                        >
                            <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground dark:text-slate-500 uppercase tracking-wider bg-muted/50 dark:bg-[#0F172A]/50 border-b border-border dark:border-slate-700/50 sticky top-0 z-10">
                                {mentionState.type === '@' ? 'Members' : 'Tabs'}
                            </div>
                            {(mentionState.type === '@' ? getTeamSuggestions() : getTabSuggestions()).map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAutocomplete(suggestion)}
                                    className="w-full text-left px-4 py-2 text-sm text-foreground dark:text-slate-300 hover:bg-muted dark:hover:bg-slate-700 transition-colors focus:bg-muted dark:focus:bg-slate-700 focus:outline-none flex items-center gap-2"
                                >
                                    {mentionState.type === '@' ? <UserIcon className="w-3.5 h-3.5 text-primary" /> : <ExternalLink className="w-3.5 h-3.5 text-purple-400" />}
                                    {suggestion}
                                </button>
                            ))}
                            {(mentionState.type === '@' ? getTeamSuggestions() : getTabSuggestions()).length === 0 && (
                                <div className="px-4 py-3 text-sm text-slate-500 text-center italic">No matches found</div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-3 max-w-5xl mx-auto">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Message your team... (Type @ to mention, # for tabs)"
                        className="flex-1 bg-background dark:bg-[#1E293B] border border-border dark:border-slate-700 focus:border-primary rounded-xl px-5 h-12 text-sm text-foreground dark:text-white focus:ring-1 focus:ring-primary placeholder:text-muted-foreground dark:placeholder:text-slate-500 transition-all shadow-inner"
                        maxLength={1000}
                    />
                    <Button 
                        onClick={handleSend}
                        disabled={cooldown || !newMessage.trim()}
                        className={`h-12 w-12 rounded-xl flex items-center justify-center p-0 transition-all shadow-lg ${
                            cooldown ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                        }`}
                        title={cooldown ? "Slow mode active (2s)" : "Send Message"}
                    >
                        {cooldown ? <Clock className="w-5 h-5 text-slate-400" /> : <Send className="w-5 h-5 text-white ml-1" />}
                    </Button>
                </div>
            </div>

            {/* Profile Modal */}
            <UserProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
        </div>
    );
}
