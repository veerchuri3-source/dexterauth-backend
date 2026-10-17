import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Get the current authentication token from localStorage
 * Checks both user and owner tokens
 */
export function getAuthToken(): string | null {
  // Priority: ownerToken > userToken (owner has higher privilege)
  return localStorage.getItem("ownerToken") || localStorage.getItem("userToken") || null;
}

/**
 * Get the current user ID from localStorage
 * Extracts from userData or returns null
 */
export function getCurrentUserId(): string | null {
  const userData = localStorage.getItem("userData");
  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      return parsed.id || null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

interface EdgeFunctionOptions {
  /** If true, automatically attach Authorization header with session token */
  requireAuth?: boolean;
  /** If true, don't throw on non-2xx responses, just return the data */
  noThrow?: boolean;
  /** Custom timeout in milliseconds (default: 30000) */
  timeout?: number;
}

interface EdgeFunctionResponse<T = any> {
  success: boolean;
  error?: string;
  code?: string;
  retry_after?: number;
  data?: T;
  [key: string]: any;
}

/**
 * Invoke a Supabase Edge Function with proper authentication
 * 
 * @param functionName - The Edge Function name
 * @param body - Request body (will be JSON stringified)
 * @param options - Configuration options
 * @returns Promise with the response data
 * 
 * @example
 * // Public endpoint (no auth required)
 * const products = await invokeEdgeFunction("get-products", {});
 * 
 * // Protected endpoint (requires auth)
 * const profile = await invokeEdgeFunction("update-profile", { nickname: "test" }, { requireAuth: true });
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: any,
  options: EdgeFunctionOptions = {}
): Promise<EdgeFunctionResponse<T>> {
  const { requireAuth = false, noThrow = false, timeout = 30000 } = options;

  if (import.meta.env.DEV) {
    console.log(`[EdgeFunction] Invoking: ${functionName}`, { requireAuth });
  }

  if (!SUPABASE_URL) {
    const msg = "Missing API URL. Please set VITE_SUPABASE_URL in Environment Variables.";
    console.error(msg);
    if (!noThrow) throw new Error(msg);
    return { success: false, error: msg, code: "CONFIG_ERROR" } as EdgeFunctionResponse<T>;
  }

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Get auth token and add to Authorization header
  const authToken = getAuthToken();

  if (requireAuth && !authToken) {
    // If auth is required but no token, return error immediately
    const error = { success: false, error: "Authentication required", code: "AUTH_REQUIRED" };
    if (!noThrow) {
      throw new Error("Authentication required");
    }
    return error as EdgeFunctionResponse<T>;
  }

  // Always add Authorization header if we have a token
  // For protected endpoints: uses session token
  // For public endpoints: uses anon key as fallback
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  } else {
    headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (import.meta.env.DEV) {
      console.log(`[EdgeFunction] ${functionName} response:`, response.status);
    }

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 429) {
        return {
          success: false,
          error: data.error || "Too many requests. Please try again later.",
          code: "RATE_LIMITED",
          retry_after: data.retry_after
        } as EdgeFunctionResponse<T>;
      }

      if (response.status === 401) {
        // Clear invalid auth tokens
        if (requireAuth) {
          console.warn("[EdgeFunction] Auth token rejected, clearing stored tokens");
          localStorage.removeItem("userToken");
          localStorage.removeItem("ownerToken");
          // Dispatch event so AuthContext can react
          window.dispatchEvent(new Event("auth-invalid"));
        }
        return {
          success: false,
          error: data.error || "Authentication failed",
          code: "AUTH_FAILED"
        } as EdgeFunctionResponse<T>;
      }

      if (response.status === 403) {
        return {
          success: false,
          error: data.error || "Permission denied",
          code: "FORBIDDEN"
        } as EdgeFunctionResponse<T>;
      }

      if (!noThrow) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
    }

    return data as EdgeFunctionResponse<T>;
  } catch (error: any) {
    console.error(`[EdgeFunction] Error invoking ${functionName}:`, error);

    if (error.name === 'AbortError') {
      const timeoutError = { success: false, error: "Request timed out", code: "TIMEOUT" };
      if (!noThrow) throw new Error("Request timed out");
      return timeoutError as EdgeFunctionResponse<T>;
    }

    if (!noThrow) {
      if (error.message === "Failed to fetch") {
        throw new Error(`Connection failed to ${SUPABASE_URL}. Check Vercel Env Vars for quotes.`);
      }
      throw error;
    }
    return { success: false, error: error.message, code: "NETWORK_ERROR" } as EdgeFunctionResponse<T>;
  }
}

/**
 * Invoke a protected Edge Function (requires authentication)
 * Shorthand for invokeEdgeFunction with requireAuth: true
 */
export async function invokeProtectedEdgeFunction<T = any>(
  functionName: string,
  body: any,
  options: Omit<EdgeFunctionOptions, 'requireAuth'> = {}
): Promise<EdgeFunctionResponse<T>> {
  return invokeEdgeFunction<T>(functionName, body, { ...options, requireAuth: true });
}

/**
 * Invoke an owner-only Edge Function
 * Checks for owner token specifically
 */
export async function invokeOwnerEdgeFunction<T = any>(
  functionName: string,
  body: any,
  options: Omit<EdgeFunctionOptions, 'requireAuth'> = {}
): Promise<EdgeFunctionResponse<T>> {
  const ownerToken = localStorage.getItem("ownerToken");
  if (!ownerToken) {
    return { success: false, error: "Owner authentication required", code: "OWNER_AUTH_REQUIRED" } as EdgeFunctionResponse<T>;
  }
  return invokeEdgeFunction<T>(functionName, body, { ...options, requireAuth: true });
}

/**
 * Optimizes external image URLs (avatars, banners) using a free, fast global CDN proxy (weserv.nl)
 * to automatically resize, convert to WebP, compress, and cache them.
 *
 * Skips optimization for:
 *  - Discord CDN (already on Cloudflare global edge — proxy adds no benefit and breaks animated URLs)
 *  - GIF files (animation would be lost on WebP conversion)
 *  - Base64 / SVG / local assets
 *  - Any non-http URL
 */
export function getOptimizedImageUrl(url: string | null | undefined, width: number, height: number): string {
  if (!url) return "";

  // Always return raw URL for these cases
  if (
    url.startsWith("data:") ||
    url.startsWith("/") ||
    url.endsWith(".svg") ||
    url.endsWith(".gif") ||
    url.includes(".svg") ||
    url.includes("/svg") ||
    url.includes("dicebear.com") ||
    url.includes("unavatar.io") ||
    url.includes("ui-avatars.com") ||
    url.includes("gravatar.com") ||
    url.includes("api.dicebear.com") ||
    !url.startsWith("http")
  ) {
    return url;
  }

  // Discord & Google CDNs are already on global edges — proxying breaks them or is unnecessary
  if (
    url.includes("cdn.discordapp.com") ||
    url.includes("media.discordapp.net") ||
    url.includes("discord.com/assets") ||
    url.includes("googleusercontent.com")
  ) {
    return url;
  }

  // Remove protocol to feed to weserv
  const cleanUrl = url.replace(/^https?:\/\//, "");

  // w: width, h: height, fit: cover, output: webp, q: 80
  return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&h=${height}&fit=cover&output=webp&q=80`;
}

/**
 * Generates an avatar URL for users who create their account through email using an avatar API.
 * Uses DiceBear 9.x SVG avatar generator for instant, ultra-reliable, deterministic avatars.
 */
export function getDefaultAvatarUrl(identifier?: string | null, username?: string | null): string {
  const cleanId = (identifier || "").trim().toLowerCase();
  const cleanUser = (username || "").trim();
  const seed = encodeURIComponent(cleanId || cleanUser || "developer");

  return `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}`;
}
