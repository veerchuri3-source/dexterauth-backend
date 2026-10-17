import React, { useEffect } from "react";
import { SEO } from "../components/SEO";

export default function SystemHealth() {
    useEffect(() => {
        window.location.replace("https://status.dexterauth.com/");
    }, []);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center selection:bg-primary/20">
            <SEO
                title="Dexter Auth Server Status"
                description="Check the real-time server status, uptime, and health of Dexter Auth systems."
                path="/status"
            />
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
        </div>
    );
}
