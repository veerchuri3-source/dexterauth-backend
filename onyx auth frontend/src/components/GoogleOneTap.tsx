import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { devApi } from "../lib/api";
import { toast } from "sonner";

export default function GoogleOneTap() {
    const { login, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) return;
        if (window.location.pathname === "/login" || window.location.pathname === "/register") return;

        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
        if (!googleClientId) return;

        // Check if script is already loaded
        let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement;
        const wasScriptCreated = !script;

        if (!script) {
            script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        const initializeOneTap = () => {
            const g = (window as any).google;
            if (g && g.accounts && g.accounts.id) {
                g.accounts.id.initialize({
                    client_id: googleClientId,
                    use_fedcm_for_prompt: true,
                    callback: async (response: any) => {
                        try {
                            const idToken = response.credential;
                            const res = await devApi.googleLogin(idToken);
                            if (res.status === "success" && res.data?.token) {
                                login(res.data.token);
                                toast.success("Welcome to Dexter Auth!");
                            } else {
                                throw new Error(res.message || "Google authentication failed");
                            }
                        } catch (err: any) {
                            toast.error(err.response?.data?.message || err.message || "Google authentication failed");
                        }
                    },
                    cancel_on_tap_outside: false
                });

                // Display the One Tap prompt
                g.accounts.id.prompt((notification: any) => {
                    if (notification.isNotDisplayed()) {
                        console.log("Google One Tap not displayed:", notification.getNotDisplayedReason());
                    } else if (notification.isSkippedMoment()) {
                        console.log("Google One Tap skipped:", notification.getSkippedReason());
                    } else if (notification.isDismissedMoment()) {
                        console.log("Google One Tap dismissed:", notification.getDismissedReason());
                    }
                });
            }
        };

        if (wasScriptCreated) {
            script.onload = initializeOneTap;
        } else {
            const timer = setTimeout(initializeOneTap, 150);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, login]);

    return null;
}
