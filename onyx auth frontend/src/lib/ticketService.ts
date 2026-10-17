import { invokeEdgeFunction } from "./utils";

// Ticket Service - Uses Edge Functions (TypeScript only, works on Vercel)

export interface Message {
    id: string;
    ticket_id: string;
    sender: "user" | "admin";
    content: string;
    created_at: string;
    read_by_user: boolean;
    read_by_admin: boolean;
}

export interface Ticket {
    id: string;
    user_id: string;
    order_id: string | null;
    status: "pending" | "active" | "approved" | "rejected";
    created_at: string;
    updated_at: string;
    last_message_at: string | null;
    ticket_messages?: Message[];
    // New fields from multi-ticket support
    productName?: string;
    productPrice?: number;
    tierName?: string;
    unreadCount?: number;
    orders?: {
        products?: {
            id: string;
            name: string;
            price: number;
        };
        product_tiers?: {
            id: string;
            name: string;
            price: number;
        };
    };
}

// Create or get existing ticket for a user
export async function createOrGetTicket(userId: string, orderId?: string): Promise<Ticket> {
    const response = await invokeEdgeFunction("ticket-create", {
        user_id: userId,
        order_id: orderId
    });

    if (!response.success) {
        throw new Error(response.error || "Failed to create ticket");
    }

    return response.ticket;
}

// Get all user's tickets with messages
export async function getUserTicket(userId: string): Promise<{
    tickets: Ticket[];
    ticket: Ticket | null;
    unreadCount: number;
    adminProfile?: { nickname: string; avatar_url: string | null };
} | null> {
    const response = await invokeEdgeFunction("ticket-get-user", {
        user_id: userId
    });

    if (!response.success) {
        throw new Error(response.error || "Failed to get tickets");
    }

    // Return in new format with tickets array and admin profile
    return {
        tickets: response.tickets || [],
        ticket: response.ticket || null, // backwards compatibility
        unreadCount: response.unreadCount || 0,
        adminProfile: response.adminProfile || { nickname: "Support", avatar_url: null }
    };
}

// Send a message
export async function sendMessage(ticketId: string, sender: "user" | "admin", content: string): Promise<Message> {
    const response = await invokeEdgeFunction("ticket-send-message", {
        ticket_id: ticketId,
        sender,
        content
    });

    if (!response.success) {
        throw new Error(response.error || "Failed to send message");
    }

    return response.message;
}

// Mark messages as read
export async function markMessagesRead(ticketId: string, reader: "user" | "admin"): Promise<void> {
    await invokeEdgeFunction("ticket-mark-read", {
        ticket_id: ticketId,
        reader
    });
}

// Get all tickets (admin)
export async function getAllTickets(statusFilter?: string | null): Promise<Ticket[]> {
    const response = await invokeEdgeFunction("tickets-get-all", {
        status_filter: statusFilter
    });

    if (!response.success) {
        throw new Error(response.error || "Failed to get tickets");
    }

    return response.tickets || [];
}

// Get single ticket details (admin)
export async function getTicketDetails(ticketId: string): Promise<Ticket> {
    const response = await invokeEdgeFunction("ticket-get-admin", {
        ticket_id: ticketId
    });

    if (!response.success) {
        throw new Error(response.error || "Failed to get ticket details");
    }

    return response.ticket;
}

// Resolve ticket (approve/reject)
export async function resolveTicket(ticketId: string, action: "approve" | "reject"): Promise<{ success: boolean }> {
    const response = await invokeEdgeFunction("ticket-resolve", {
        ticket_id: ticketId,
        action
    });

    if (!response.success) {
        throw new Error(response.error || "Failed to resolve ticket");
    }

    return { success: true };
}

// Get auto message settings
export async function getAutoMessageSettings(): Promise<{ enabled: boolean; message_text: string }> {
    const response = await invokeEdgeFunction("auto-message-settings", {
        action: "get"
    });

    return response.settings || { enabled: false, message_text: "" };
}

// Update auto message settings
export async function updateAutoMessageSettings(enabled: boolean, messageText: string): Promise<{ success: boolean }> {
    const response = await invokeEdgeFunction("auto-message-settings", {
        action: "update",
        enabled,
        message_text: messageText
    });

    if (!response.success) {
        throw new Error(response.error || "Failed to update settings");
    }

    return { success: true };
}
