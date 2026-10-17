import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn, invokeEdgeFunction } from "@/lib/utils";
import { getUserTicket, sendMessage as sendTicketMessage, markMessagesRead } from "@/lib/ticketService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
    MessageCircle,
    X,
    Send,
    Loader2,
    ChevronDown,
    Package,
    User,
    Shield,
    Volume2,
    VolumeX,
    RefreshCw,
    Check,
    CheckCheck,
    Clock,
    ImagePlus,
    Download,
    Copy,
    ExternalLink
} from "lucide-react";
import { ImageZoomModal } from "@/components/ui/image-zoom-modal";
import { FormattedMessage } from "@/components/ui/formatted-message";

interface Message {
    id: string;
    sender: "user" | "admin";
    content: string;
    created_at: string;
    read_by_admin?: boolean;
    read_by_user?: boolean;
    // For optimistic UI
    pending?: boolean;
    failed?: boolean;
}

interface Ticket {
    id: string;
    status: string;
    productName: string;
    productPrice: number;
    tierName?: string;
    ticket_messages: Message[];
    unreadCount: number;
    orders?: {
        products?: {
            name: string;
            price: number;
        };
        product_tiers?: {
            name: string;
            price: number;
        };
    };
}

export default function SupportChatBubble() {
    const location = useLocation();
    const { user, isAuthenticated } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [totalUnread, setTotalUnread] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const prevMessageCountRef = useRef<number>(0);

    // Admin profile for display in chat messages
    const [adminProfile, setAdminProfile] = useState<{ nickname: string, avatar_url: string | null }>({
        nickname: "Support",
        avatar_url: null
    });

    // User profile for display in chat messages (from DB, not localStorage)
    const [userProfile, setUserProfile] = useState<{ nickname: string | null, avatar_url: string | null }>({
        nickname: null,
        avatar_url: null
    });

    // State for link confirmation dialog
    const [pendingLink, setPendingLink] = useState<string | null>(null);

    // URL regex pattern for detecting links
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    // State for image zoom and context menu
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; url: string } | null>(null);

    // Close context menu on global click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Function to render message content with clickable links and images
    const renderMessageContent = (content: string) => {
        // Check if content is a direct image URL (from our uploader)
        if (isImageUrl(content)) {
            return (
                <div
                    className="relative group cursor-pointer inline-block"
                    onClick={(e) => {
                        e.stopPropagation();
                        setZoomedImage(content);
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({ x: e.clientX, y: e.clientY, url: content });
                    }}
                >
                    <img
                        src={content}
                        alt="Shared image"
                        className="max-w-[240px] max-h-[240px] rounded-lg object-cover border border-border/50 transition-all hover:brightness-110 shadow-sm"
                        loading="lazy"
                    />
                </div>
            );
        }

        return <FormattedMessage content={content} onLinkClick={(url) => setPendingLink(url)} />;
    };

    // Image upload state
    const [uploading, setUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // Check if content is an image URL
    const isImageUrl = (content: string) => {
        return content.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) ||
            content.includes('ik.imagekit.io');
    };

    // Upload image to ImageKit
    const uploadImage = async (file: File) => {
        if (!selectedTicketId) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", "/chat");

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-image`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: formData,
                }
            );

            const result = await response.json();
            if (result.success && result.url) {
                // Send image URL as message
                await sendTicketMessage(selectedTicketId, "user", result.url);

                // Track image for cleanup (will implement in edge function)
                await invokeEdgeFunction("track-ticket-image", {
                    ticket_id: selectedTicketId,
                    image_url: result.url,
                    file_id: result.fileId
                });

                // Refresh messages
                fetchTickets();
            } else {
                console.error("Upload failed:", result.error);
            }
        } catch (error) {
            console.error("Image upload error:", error);
        } finally {
            setUploading(false);
        }
    };

    // Handle file input change
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadImage(file);
        }
        // Reset input
        if (imageInputRef.current) {
            imageInputRef.current.value = "";
        }
    };

    // Handle paste event for images
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith("image/")) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    uploadImage(file);
                }
                break;
            }
        }
    };

    // Sound notification state (persisted to localStorage)
    const [soundEnabled, setSoundEnabled] = useState(() => {
        const saved = localStorage.getItem("chat-sound-enabled");
        return saved !== "false"; // Default to true
    });
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const prevUnreadRef = useRef<number>(0);

    // Initialize audio on mount
    useEffect(() => {
        audioRef.current = new Audio("/sounds/message-notify.wav");
        audioRef.current.volume = 0.5;
    }, []);

    // Play notification sound when new messages arrive
    const playNotificationSound = useCallback(() => {
        if (soundEnabled && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {
                // Ignore autoplay errors (browser policy)
            });
        }
    }, [soundEnabled]);

    // Track unread changes and play sound when new messages arrive
    useEffect(() => {
        if (totalUnread > prevUnreadRef.current) {
            playNotificationSound();
        }
        prevUnreadRef.current = totalUnread;
    }, [totalUnread, playNotificationSound]);

    // Toggle sound and persist
    const toggleSound = () => {
        setSoundEnabled(prev => {
            const newValue = !prev;
            localStorage.setItem("chat-sound-enabled", String(newValue));
            return newValue;
        });
    };

    const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const lastTopTicketIdRef = useRef<string | null>(null);

    const fetchTickets = useCallback(async () => {
        if (!import.meta.env.VITE_SUPABASE_URL) return;
        if (!user?.id) return;
        if (sending) return;

        try {
            const result = await getUserTicket(user.id);

            // Set admin profile from API response
            if (result?.adminProfile) {
                setAdminProfile(result.adminProfile);
            }

            if (result?.tickets && result.tickets.length > 0) {
                const currentTopTicketId = result.tickets[0].id;
                const isNewTopTicket = lastTopTicketIdRef.current && lastTopTicketIdRef.current !== currentTopTicketId;

                // Update refs
                lastTopTicketIdRef.current = currentTopTicketId;

                setTickets(result.tickets);
                setTotalUnread(result.unreadCount || 0);

                // Logic to select ticket:
                // 1. If nothing selected, select the first one.
                // 2. If a NEW top ticket appeared (e.g. new purchase), switch to it.
                if (!selectedTicketId || isNewTopTicket) {
                    setSelectedTicketId(currentTopTicketId);
                    setMessages(result.tickets[0].ticket_messages || []);
                } else {
                    // Update messages for currently selected ticket if it still exists
                    const currentTicket = result.tickets.find((t: Ticket) => t.id === selectedTicketId);
                    if (currentTicket) {
                        setMessages(prev => {
                            const pending = prev.filter(m => m.pending || m.failed);
                            return [...(currentTicket.ticket_messages || []), ...pending];
                        });
                    }
                }
            } else {
                setTickets([]);
                setSelectedTicketId(null);
                lastTopTicketIdRef.current = null;
            }
        } catch (error) {
            console.error("Failed to fetch tickets:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, selectedTicketId, sending]);

    // Fetch user's own profile from DB for display in chat
    useEffect(() => {
        if (!import.meta.env.VITE_SUPABASE_URL) return;
        const fetchUserProfile = async () => {
            if (!user?.id) return;

            try {
                const response = await invokeEdgeFunction("get-user-profile", {
                    user_id: user.id
                });

                if (response.success && response.user) {
                    setUserProfile({
                        nickname: response.user.nickname || null,
                        avatar_url: response.user.avatar_url || null
                    });
                }
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            }
        };

        fetchUserProfile();
    }, [user?.id]);

    // Auto-scroll to bottom only when NEW messages arrive or chat first opens
    useEffect(() => {
        const shouldScroll =
            messages.length > prevMessageCountRef.current || // New messages arrived
            (isOpen && prevMessageCountRef.current === 0);   // Chat just opened

        if (shouldScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }

        prevMessageCountRef.current = messages.length;
    }, [messages.length, isOpen]);

    // Initial fetch
    useEffect(() => {
        if (!import.meta.env.VITE_SUPABASE_URL) return;
        if (isAuthenticated && user?.id) {
            fetchTickets();
        }
    }, [isAuthenticated, user?.id, fetchTickets]);

    // ALWAYS poll for messages - slower to avoid rate limiting
    useEffect(() => {
        if (!import.meta.env.VITE_SUPABASE_URL) return;
        if (!isAuthenticated || !user?.id) return;

        // Poll interval: 30s when open, 60s when closed (background)
        const interval = isOpen ? 30000 : 60000;
        pollIntervalRef.current = setInterval(fetchTickets, interval);

        // Immediate fetch when opening chat
        if (isOpen) {
            fetchTickets();
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [isOpen, isAuthenticated, user?.id, fetchTickets]);

    // Mark messages as read when chat is opened or ticket changes
    useEffect(() => {
        if (!import.meta.env.VITE_SUPABASE_URL) return;
        if (isOpen && selectedTicket?.id && selectedTicket.unreadCount > 0) {
            markMessagesRead(selectedTicket.id, "user").then(() => {
                setTickets(prev => prev.map(t =>
                    t.id === selectedTicket.id ? { ...t, unreadCount: 0 } : t
                ));
                setTotalUnread(prev => Math.max(0, prev - selectedTicket.unreadCount));
            });
        }
    }, [isOpen, selectedTicket?.id, selectedTicket?.unreadCount]);

    // Auto-scroll when messages change
    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, scrollToBottom]);

    // Update messages when ticket selection changes
    useEffect(() => {
        if (selectedTicketId) {
            const ticket = tickets.find(t => t.id === selectedTicketId);
            if (ticket) {
                setMessages(ticket.ticket_messages || []);
            }
        }
    }, [selectedTicketId, tickets]);

    const handleSendMessage = async (retryContent?: string, retryTempId?: string) => {
        const content = retryContent || message.trim();
        if (!content || !selectedTicket?.id || (sending && !retryContent)) return;

        if (!retryContent) {
            setMessage("");
        }
        setSending(true);

        // Create or reuse temp message
        const tempId = retryTempId || `temp-${Date.now()}`;
        const tempMessage: Message = {
            id: tempId,
            sender: "user",
            content,
            created_at: new Date().toISOString(),
            pending: true,
            failed: false
        };

        if (!retryContent) {
            setMessages(prev => [...prev, tempMessage]);
        } else {
            // Mark as pending again for retry
            setMessages(prev => prev.map(m =>
                m.id === tempId ? { ...m, pending: true, failed: false } : m
            ));
        }
        scrollToBottom();

        // Auto-retry logic (3 attempts with exponential backoff)
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const newMessage = await sendTicketMessage(selectedTicket.id, "user", content);

                if (newMessage) {
                    // Replace temp message with real one
                    setMessages(prev => prev.map(m =>
                        m.id === tempId ? { ...newMessage, pending: false, failed: false } : m
                    ));
                    setSending(false);
                    return; // Success!
                }
            } catch (error) {
                attempts++;
                console.error(`Send attempt ${attempts} failed:`, error);

                if (attempts < maxAttempts) {
                    // Wait before retry (exponential backoff: 1s, 2s)
                    await new Promise(r => setTimeout(r, attempts * 1000));
                }
            }
        }

        // All retries failed - mark message as failed
        setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, pending: false, failed: true } : m
        ));
        setSending(false);
    };

    // Retry a failed message
    const retryMessage = (msg: Message) => {
        handleSendMessage(msg.content, msg.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const getProductDisplay = (ticket: Ticket) => {
        const name = ticket.productName || ticket.orders?.products?.name || 'Product';
        const tier = ticket.tierName || ticket.orders?.product_tiers?.name;
        return tier ? `${name} (${tier})` : name;
    };

    // Get date label for message grouping
    const getDateLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return "Today";
        if (isYesterday) return "Yesterday";
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    // Check if message is first of its date group
    const isNewDateGroup = (index: number) => {
        if (index === 0) return true;
        const current = new Date(messages[index].created_at).toDateString();
        const previous = new Date(messages[index - 1].created_at).toDateString();
        return current !== previous;
    };

    // Get user initials for avatar fallback
    const getUserInitials = () => {
        if (user?.nickname) return user.nickname.charAt(0).toUpperCase();
        if (user?.email) return user.email.charAt(0).toUpperCase();
        return "U";
    };

    // Don't render if not authenticated, loading, or on admin panel
    const isAdminPanel = location.pathname.startsWith('/owner');
    if (!import.meta.env.VITE_SUPABASE_URL || !isAuthenticated || loading || isAdminPanel) return null;

    const hasTickets = tickets.length > 0;

    return (
        <>
            {/* Chat Bubble */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-20 lg:bottom-6 right-4 z-50 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                    <MessageCircle className="h-6 w-6" />
                    {totalUnread > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
                        >
                            {totalUnread > 9 ? "9+" : totalUnread}
                        </Badge>
                    )}
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 w-[360px] sm:w-[420px] max-h-[70vh] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <MessageCircle className="h-5 w-5 flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                                <h3 className="font-semibold text-sm truncate">Support Chat</h3>
                                {selectedTicket && (
                                    <span className="text-xs opacity-80 truncate flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        {getProductDisplay(selectedTicket)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Sound Toggle */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary-foreground hover:bg-white/20 flex-shrink-0"
                                onClick={toggleSound}
                                title={soundEnabled ? "Mute notifications" : "Enable notifications"}
                            >
                                {soundEnabled ? (
                                    <Volume2 className="h-4 w-4" />
                                ) : (
                                    <VolumeX className="h-4 w-4 opacity-50" />
                                )}
                            </Button>
                            {/* Close Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary-foreground hover:bg-white/20 flex-shrink-0"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Ticket Selector - Only show if multiple tickets */}
                    {tickets.length > 1 && (
                        <div className="px-3 py-2 border-b border-border bg-muted/30">
                            <Select
                                value={selectedTicketId || undefined}
                                onValueChange={(value) => setSelectedTicketId(value)}
                            >
                                <SelectTrigger className="w-full h-9 text-sm">
                                    <SelectValue placeholder="Select ticket" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* Active & Pending Tickets */}
                                    {tickets.filter(t => t.status === 'active' || t.status === 'pending').map((ticket) => (
                                        <SelectItem key={ticket.id} value={ticket.id}>
                                            <div className="flex items-center gap-2">
                                                <Package className="h-3 w-3 text-muted-foreground" />
                                                <span className="truncate max-w-[120px]">{getProductDisplay(ticket)}</span>
                                                {ticket.unreadCount > 0 && (
                                                    <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                                                        {ticket.unreadCount}
                                                    </Badge>
                                                )}
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "ml-auto text-[10px] px-1 h-4",
                                                        ticket.status === 'active' && "bg-primary/10 text-primary",
                                                        ticket.status === 'pending' && "bg-yellow-500/10 text-yellow-500"
                                                    )}
                                                >
                                                    {ticket.status}
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}

                                    {/* History/Closed Tickets */}
                                    {tickets.filter(t => t.status !== 'active' && t.status !== 'pending').length > 0 && (
                                        <>
                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                                                History (Read Only)
                                            </div>
                                            {tickets.filter(t => t.status !== 'active' && t.status !== 'pending').slice(0, 5).map((ticket) => (
                                                <SelectItem key={ticket.id} value={ticket.id} className="opacity-80">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="h-3 w-3" />
                                                        <span className="truncate max-w-[120px]">{getProductDisplay(ticket)}</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "ml-auto text-[10px] px-1 h-4",
                                                                ticket.status === 'approved' && "bg-green-500/10 text-green-500",
                                                                ticket.status === 'rejected' && "bg-red-500/10 text-red-500"
                                                            )}
                                                        >
                                                            {ticket.status}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Messages - Scrollable Container */}
                    <div className="flex-1 h-[400px] overflow-y-auto p-4 chat-scrollbar">
                        <div className="space-y-3">
                            {!hasTickets ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-medium">No Active Tickets</p>
                                    <p className="text-xs">Place an order to start a support conversation</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No messages yet</p>
                                    <p className="text-xs">Send a message to get support</p>
                                </div>
                            ) : (
                                messages.map((msg, index) => (
                                    <div key={msg.id}>
                                        {/* Date Group Header */}
                                        {isNewDateGroup(index) && (
                                            <div className="flex items-center justify-center my-4">
                                                <div className="text-[10px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                                                    {getDateLabel(msg.created_at)}
                                                </div>
                                            </div>
                                        )}
                                        {/* Message with Avatar */}
                                        <div
                                            className={cn(
                                                "flex gap-2 animate-in slide-in-from-bottom-2 duration-300",
                                                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                                            )}
                                        >
                                            {/* Avatar */}
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium overflow-hidden",
                                                msg.sender === "user"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-gradient-to-br from-red-500 to-primary text-white"
                                            )}>
                                                {msg.sender === "user" ? (
                                                    userProfile.avatar_url ? (
                                                        <img src={userProfile.avatar_url} alt="You" className="w-full h-full object-cover" />
                                                    ) : (
                                                        getUserInitials()
                                                    )
                                                ) : (
                                                    adminProfile.avatar_url ? (
                                                        <img src={adminProfile.avatar_url} alt={adminProfile.nickname} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Shield className="h-4 w-4" />
                                                    )
                                                )}
                                            </div>
                                            {/* Message Bubble */}
                                            <div className={cn(
                                                "flex flex-col max-w-[75%]",
                                                msg.sender === "user" ? "items-end" : "items-start"
                                            )}>
                                                {/* Sender Label with Nickname */}
                                                <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                                                    {msg.sender === "user"
                                                        ? (userProfile.nickname || "You")
                                                        : adminProfile.nickname
                                                    }
                                                </span>
                                                <div
                                                    className={cn(
                                                        "rounded-2xl px-4 py-2 text-sm shadow-sm",
                                                        msg.sender === "user"
                                                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                            : "bg-muted text-foreground rounded-tl-sm"
                                                    )}
                                                >
                                                    {renderMessageContent(msg.content)}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                                                    {formatTime(msg.created_at)}
                                                    {/* Read Receipt Icons for User Messages */}
                                                    {msg.sender === "user" && (
                                                        msg.pending ? (
                                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                                        ) : msg.read_by_admin ? (
                                                            <CheckCheck className="h-3 w-3 text-primary" />
                                                        ) : (
                                                            <Check className="h-3 w-3 text-muted-foreground" />
                                                        )
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input - Only show if there are tickets */}
                    {!hasTickets ? (
                        <div className="p-3 border-t border-border text-center">
                            <p className="text-xs text-muted-foreground">Order a product to get support</p>
                        </div>
                    ) : selectedTicket?.status !== 'approved' && selectedTicket?.status !== 'rejected' ? (
                        <div className="p-3 border-t border-border">
                            <div className="flex items-center gap-2">
                                {/* Hidden File Input */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={imageInputRef}
                                    className="hidden"
                                    onChange={handleImageSelect}
                                />

                                {/* Upload Button */}
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={sending || uploading}
                                >
                                    {uploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ImagePlus className="h-4 w-4" />
                                    )}
                                </Button>

                                <Input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onPaste={handlePaste}
                                    placeholder="Type a message..."
                                    className="flex-1"
                                    disabled={sending || uploading}
                                />
                                <Button
                                    size="icon"
                                    onClick={() => handleSendMessage()}
                                    disabled={!message.trim() || sending}
                                >
                                    {sending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 border-t border-border text-center">
                            <Badge className={selectedTicket?.status === 'approved' ? "bg-green-500" : "bg-red-500"}>
                                Ticket {selectedTicket?.status}
                            </Badge>
                        </div>
                    )}
                </div>
            )}

            {/* Link Confirmation Dialog */}
            <AlertDialog open={!!pendingLink} onOpenChange={(open) => !open && setPendingLink(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Open External Link?</AlertDialogTitle>
                        <AlertDialogDescription className="break-all">
                            Do you want to open this link in a new tab?
                            <br />
                            <span className="text-primary font-mono text-xs mt-2 block">{pendingLink}</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingLink(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingLink) {
                                    window.open(pendingLink, "_blank", "noopener,noreferrer");
                                }
                                setPendingLink(null);
                            }}
                        >
                            Open Link
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Image Zoom Modal */}
            {zoomedImage && (
                <ImageZoomModal
                    src={zoomedImage}
                    onClose={() => setZoomedImage(null)}
                />
            )}

            {/* Custom Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-[70] w-56 bg-white dark:bg-zinc-900 border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <div className="p-1 flex flex-col gap-0.5">
                        <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted rounded-md transition-colors"
                            onClick={() => {
                                window.open(contextMenu.url, "_blank");
                                setContextMenu(null);
                            }}
                        >
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            Open Link
                        </button>
                        <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted rounded-md transition-colors"
                            onClick={() => {
                                navigator.clipboard.writeText(contextMenu.url);
                                setContextMenu(null);
                            }}
                        >
                            <Copy className="h-4 w-4 text-muted-foreground" />
                            Copy Link
                        </button>
                        <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted rounded-md transition-colors"
                            onClick={async () => {
                                try {
                                    const response = await fetch(contextMenu.url);
                                    const blob = await response.blob();
                                    await navigator.clipboard.write([
                                        new ClipboardItem({ [blob.type]: blob })
                                    ]);
                                } catch (err) { }
                                setContextMenu(null);
                            }}
                        >
                            <ImagePlus className="h-4 w-4 text-muted-foreground" />
                            Copy Image
                        </button>
                        <a
                            href={contextMenu.url}
                            download
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted rounded-md transition-colors text-foreground decoration-0"
                            onClick={() => setContextMenu(null)}
                        >
                            <Download className="h-4 w-4 text-muted-foreground" />
                            Save Image
                        </a>
                    </div>
                </div>
            )}
        </>
    );
}
