import React, { useEffect, useState } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { customerApi } from '../../lib/customerApi';
import CustomerAuth from './CustomerAuth';
import CustomerDashboard from './CustomerDashboard';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '../../components/SEO';

export const CustomerPanelContext = React.createContext<any>(null);

const CustomerPanel = () => {
    const { ownerUsername, appName } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [appInfo, setAppInfo] = useState<{ app_id: string; app_name: string; panel_icon?: string; panel_color?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            if (!ownerUsername || !appName) {
                setError("Invalid Panel URL");
                setLoading(false);
                return;
            }

            try {
                const res = await customerApi.lookupApp(ownerUsername, appName);
                if (res.status === 'success') {
                    setAppInfo(res.data);
                } else {
                    setError("Application not found.");
                }
            } catch (err: any) {
                setError(err.response?.data?.message || "Failed to load application.");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [ownerUsername, appName]);

    // Apply dark theme globally for the panel and dynamic primary color
    useEffect(() => {
        document.documentElement.classList.add('dark');
        
        if (appInfo?.panel_color) {
            // Convert Hex to HSL for the --primary variable which tailwind expects as "H S% L%"
            const hexToHSL = (hex: string) => {
                let r = 0, g = 0, b = 0;
                if (hex.length === 4) {
                    r = parseInt("0x" + hex[1] + hex[1]);
                    g = parseInt("0x" + hex[2] + hex[2]);
                    b = parseInt("0x" + hex[3] + hex[3]);
                } else if (hex.length === 7) {
                    r = parseInt("0x" + hex[1] + hex[2]);
                    g = parseInt("0x" + hex[3] + hex[4]);
                    b = parseInt("0x" + hex[5] + hex[6]);
                }
                r /= 255; g /= 255; b /= 255;
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                let h = 0, s = 0, l = (max + min) / 2;
                if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h /= 6;
                }
                return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
            };
            
            const hslColor = hexToHSL(appInfo.panel_color);
            document.documentElement.style.setProperty('--primary', hslColor);
        }

        return () => {
            document.documentElement.style.removeProperty('--primary');
        };
    }, [appInfo]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (error || !appInfo) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-white">
                <h1 className="text-4xl font-bold text-red-500 mb-2">404</h1>
                <p className="text-muted-foreground">{error}</p>
            </div>
        );
    }

    return (
        <CustomerPanelContext.Provider value={{ appInfo, ownerUsername }}>
            <SEO
                title={`${appInfo.app_name} - Customer Portal | Dexter Auth`}
                description={`Secure customer authentication and license management portal for ${appInfo.app_name}. Powered by Dexter Auth.`}
                path={`/p/${ownerUsername}/${appName}`}
                jsonLd={{
                    "@type": "WebApplication",
                    "name": `${appInfo.app_name} Customer Portal`,
                    "description": `Authentication and license portal for ${appInfo.app_name}, running on Dexter Auth infrastructure.`,
                    "applicationCategory": "SecurityApplication",
                    "operatingSystem": "Any",
                    "provider": {
                        "@type": "Organization",
                        "name": "Dexter Auth",
                        "url": "https://dexterauth.com"
                    }
                }}
            />
            <div className="min-h-screen bg-custom-back text-white font-sans selection:bg-primary/30">
                <Routes>
                    <Route path="/auth" element={<CustomerAuth />} />
                    <Route path="/dashboard" element={<CustomerDashboard />} />
                    <Route path="*" element={<Navigate to="auth" replace />} />
                </Routes>
            </div>
        </CustomerPanelContext.Provider>
    );
};

export default CustomerPanel;
