import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ShieldCheck } from "lucide-react";

interface LegalModalProps {
  isOpen: boolean;
  type: "terms" | "privacy" | null;
  onClose: () => void;
}

export default function LegalModal({ isOpen, type, onClose }: LegalModalProps) {
  return (
    <AnimatePresence>
      {isOpen && type && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border dark:bg-[#0b1020] dark:border-white/10 p-6 sm:p-8 shadow-2xl text-card-foreground dark:text-slate-300 custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 transition-all"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {type === "terms" ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="border-b border-border dark:border-white/10 pb-4 pr-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30">
                      <ShieldCheck className="h-4 w-4 text-white" />
                    </span>
                    <span className="font-bold text-foreground dark:text-white tracking-tight">Dexter Auth</span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground dark:text-white">Terms of Service</h2>
                  <p className="text-xs text-muted-foreground dark:text-slate-400">Last updated: June 19, 2026</p>
                </div>

                {/* Callout */}
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <strong className="text-foreground dark:text-white">Summary:</strong> These Terms govern your use of Dexter Auth. Dexter Auth helps developers add authentication & licensing to their applications. You are responsible for your own use and end-users. The service is provided "as is".
                </div>

                {/* Body Text */}
                <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  <h3 className="font-bold text-foreground dark:text-white text-base">1. Acceptance of Terms</h3>
                  <p>Welcome to Dexter Auth. By accessing our dashboard, integrating our SDK, or using any part of the service, you agree to be bound by these Terms of Service. If you do not agree, you must not use the Service.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">2. Definitions</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>"Dexter Auth"</strong> refers to the operator of the Service.</li>
                    <li><strong>"Customer" or "you"</strong> refers to the developer/organization creating an account.</li>
                    <li><strong>"End-User"</strong> refers to your application's users.</li>
                  </ul>

                  <h3 className="font-bold text-foreground dark:text-white text-base">3. Eligibility</h3>
                  <p>You must be at least 16 years of age to use the Service. If you are under 18, you represent that your parent or guardian has reviewed and agreed to these Terms.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">4. Accounts</h3>
                  <p>You are responsible for keeping your credentials and API keys secure. All activities occurring under your account are your responsibility.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">5. License to Use Dexter Auth</h3>
                  <p>Dexter Auth grants you a limited, non-exclusive, revocable license to access the Service solely to develop, test, and operate your Applications.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">6. Acceptable Use</h3>
                  <p>You agree not to build or distribute malware, bypass rate limits, overload the infrastructure, reverse engineer the platform, or violate any applicable laws.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">7. Your Applications &amp; End-Users</h3>
                  <p>You are the data controller for your end-users, and Dexter Auth acts as the data processor. You must provide a privacy policy and comply with consumer and data protection laws.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">8. Fees &amp; Billing</h3>
                  <p>Dexter Auth offers a free tier. Paid subscriptions are billed in advance and are non-refundable except where required by law.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">9. Intellectual Property</h3>
                  <p>The Service, design, logo, and documentation are owned by us. You retain all rights to your own application and customer data.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">10. Data &amp; Privacy</h3>
                  <p>Your use of the Service is also governed by our Privacy Policy, which describes how we collect and protect information.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">11. Suspension &amp; Termination</h3>
                  <p>We may suspend or terminate your account if you violate these terms, if your use poses a security risk, or if we are legally required to do so.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">12. Disclaimers</h3>
                  <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">13. Limitation of Liability</h3>
                  <p>OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS WILL NOT EXCEED THE GREATER OF THE AMOUNTS PAID BY YOU IN THE PRECEDING TWELVE MONTHS OR USD $100.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">14. Contact</h3>
                  <p>For questions regarding these Terms, please email <a href="mailto:legal@dexterauth.com" className="text-primary hover:underline">legal@dexterauth.com</a>.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="border-b border-border dark:border-white/10 pb-4 pr-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30">
                      <ShieldCheck className="h-4 w-4 text-white" />
                    </span>
                    <span className="font-bold text-foreground dark:text-white tracking-tight">Dexter Auth</span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground dark:text-white">Privacy Policy</h2>
                  <p className="text-xs text-muted-foreground dark:text-slate-400">Last updated: June 19, 2026</p>
                </div>

                {/* Callout */}
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <strong className="text-foreground dark:text-white">Summary:</strong> We collect minimal data needed to run authentication & licensing. We use Supabase for storage and don't sell your data.
                </div>

                {/* Body Text */}
                <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  <h3 className="font-bold text-foreground dark:text-white text-base">1. Who This Applies To</h3>
                  <p>This policy applies to Customers (developers integrating our SDK) and Visitors of dexterauth.com. We act as a data controller for account data and data processor for your end-user data.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">2. Data We Collect</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Account Credentials:</strong> Email, username, and hashed passwords.</li>
                    <li><strong>Application Config:</strong> App name, license keys, and subscription details.</li>
                    <li><strong>End-User Auth Data:</strong> Session cookies, IP addresses, and hardware IDs (HWID) used for validation.</li>
                    <li><strong>Technical Logs:</strong> Browser user-agent and request metadata for security.</li>
                  </ul>

                  <h3 className="font-bold text-foreground dark:text-white text-base">3. How &amp; Why We Use Data</h3>
                  <p>We process data to provide the Service, secure the platform, prevent fraud, respond to support inquiries, and comply with legal obligations.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">4. Third Parties &amp; Sub-Processors</h3>
                  <p>We use Supabase for database hosting, Discord webhooks for operational alerts, and standard cloud servers. We never sell your data.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">5. Data Retention</h3>
                  <p>Account data is kept while active. Logs are purged or anonymized automatically after troubleshooting requirements are met.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">6. Security</h3>
                  <p>We implement strict security measures including hashed passwords, secure HTTPS transport, database isolation, and HTTP-only cookie scopes.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">7. Your Rights (GDPR &amp; CCPA)</h3>
                  <p>Depending on your jurisdiction, you have the right to access, correct, delete, port, or object to the processing of your data. Contact us to exercise these rights.</p>

                  <h3 className="font-bold text-foreground dark:text-white text-base">8. Contact</h3>
                  <p>For privacy queries, please contact <a href="mailto:privacy@dexterauth.com" className="text-primary hover:underline">privacy@dexterauth.com</a>.</p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
