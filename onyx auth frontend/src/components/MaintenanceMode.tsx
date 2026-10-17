import React from 'react';
import { Hammer, ShieldAlert, ExternalLink } from 'lucide-react';

interface MaintenanceModeProps {
  message?: string;
  contactEmail?: string;
  discordInvite?: string;
}

export const MaintenanceMode: React.FC<MaintenanceModeProps> = ({
  message = "We are currently executing a system upgrade. We expect to be fully operational shortly.",
  contactEmail = "business@dexterauth.com",
  discordInvite = "https://discord.gg/fnbuFSDjqJ"
}) => {
  return (
    <div className="min-h-screen bg-[#090D16] text-[#E2E8F0] flex flex-col items-center justify-center p-6 relative overflow-hidden select-none font-sans">
      {/* Visual background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main glassmorphism card */}
      <div className="w-full max-w-xl bg-[#111827]/40 border border-border/40 backdrop-blur-xl rounded-2xl p-8 sm:p-10 shadow-2xl relative z-10 flex flex-col items-center text-center">
        {/* Glowing Icon Container */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-red-600 p-0.5 shadow-lg shadow-primary/20 mb-6 flex items-center justify-center animate-pulse">
          <div className="w-full h-full bg-[#0D131F] rounded-[14px] flex items-center justify-center">
            <Hammer className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-3">
          Platform Scheduled Maintenance
        </h1>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold mb-6">
          <ShieldAlert className="w-3.5 h-3.5" />
          Platform Lockdown Active
        </div>

        {/* Custom Maintenance Message */}
        <p className="text-muted-foreground text-base leading-relaxed mb-8">
          {message}
        </p>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mb-8" />

        {/* Links */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          {discordInvite && (
            <a
              href={discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 w-full sm:w-auto"
            >
              Join Our Discord
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1F2937]/50 border border-border/40 hover:bg-[#1F2937]/80 text-foreground font-medium rounded-xl transition-all w-full sm:w-auto"
            >
              Email Support
            </a>
          )}
        </div>
      </div>

      {/* Footer copyright */}
      <span className="text-xs text-muted-foreground/60 mt-10 relative z-10">
        © {new Date().getFullYear()} Dexter Auth. All rights reserved.
      </span>
    </div>
  );
};
