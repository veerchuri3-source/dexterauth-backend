import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { SEO } from "../components/SEO";

export default function Privacy() {
    return (
        <div className="min-h-screen bg-background text-foreground dark:bg-[#0b1020] dark:text-[#e6ebf5] selection:bg-primary/20 selection:text-foreground dark:selection:text-white">
            <SEO title="Privacy Policy" description="Dexter Auth is a free, enterprise-grade authentication and software licensing API for native C++, C#, and ImGui applications." path="/privacy" />
            
            <div className="max-w-[820px] mx-auto px-6 py-16 sm:py-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-8"
                >
                    {/* Header */}
                    <div className="border-b border-border dark:border-white/10 pb-8">
                        <Link to="/" className="inline-flex items-center gap-2 group mb-8">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
                                <ShieldCheck className="h-5 w-5 text-white" />
                            </span>
                            <span className="text-lg font-bold text-foreground dark:text-white tracking-tight">Dexter Auth</span>
                        </Link>
                        
                        <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">Legal</p>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground dark:text-white tracking-tight mb-2">Privacy Policy</h1>
                        <p className="text-sm text-muted-foreground dark:text-slate-400">Last updated: June 19, 2026</p>
                    </div>

                    {/* Summary Box */}
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        <strong className="text-foreground dark:text-white">In short:</strong> Dexter Auth collects the minimum data needed to run authentication and licensing for your applications — your account email and username, your end-users' sign-in data, hardware identifiers you bind to licenses, and basic technical logs. We use Supabase for data storage and Discord webhooks for operational alerts. We don't sell your data. This policy explains everything in detail and your rights under the GDPR and CCPA.
                    </div>

                    {/* Contents Links */}
                    <div className="border border-border dark:border-white/5 bg-muted/40 dark:bg-white/[0.02] rounded-xl p-6">
                        <h2 className="text-xs uppercase tracking-wider text-muted-foreground dark:text-slate-400 font-semibold mb-4">Contents</h2>
                        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <li><a href="#who" className="text-primary hover:underline">1. Who This Applies To</a></li>
                            <li><a href="#data" className="text-primary hover:underline">2. Data We Collect</a></li>
                            <li><a href="#why" className="text-primary hover:underline">3. How &amp; Why We Use Data</a></li>
                            <li><a href="#legal-basis" className="text-primary hover:underline">4. Legal Basis (GDPR)</a></li>
                            <li><a href="#processors" className="text-primary hover:underline">5. Third Parties &amp; Processors</a></li>
                            <li><a href="#sharing" className="text-primary hover:underline">6. When We Share Data</a></li>
                            <li><a href="#retention" className="text-primary hover:underline">7. Data Retention</a></li>
                            <li><a href="#security" className="text-primary hover:underline">8. Security</a></li>
                            <li><a href="#cookies" className="text-primary hover:underline">9. Cookies</a></li>
                            <li><a href="#rights-gdpr" className="text-primary hover:underline">10. Your Rights (GDPR/UK GDPR)</a></li>
                            <li><a href="#rights-ccpa" className="text-primary hover:underline">11. Your Rights (CCPA/US)</a></li>
                            <li><a href="#children" className="text-primary hover:underline">12. Children</a></li>
                            <li><a href="#international" className="text-primary hover:underline">13. International Transfers</a></li>
                            <li><a href="#changes" className="text-primary hover:underline">14. Changes</a></li>
                            <li><a href="#contact" className="text-primary hover:underline">15. Contact &amp; DPO</a></li>
                        </ol>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-10 max-w-none text-slate-600 dark:text-slate-300 text-[15px] leading-relaxed">
                        
                        <section id="who" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">1. Who This Applies To</h2>
                            <p>This Privacy Policy applies to two groups:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li><strong>Customers</strong> — developers and companies who create an Dexter Auth account and integrate our SDK. You are the <em>data controller</em> for your account data and for your end-users' data; Dexter Auth is your <em>data processor</em>.</li>
                                <li><strong>Visitors</strong> — anyone who visits dexterauth.com. We collect only minimal technical data described below.</li>
                            </ul>
                            <p className="mt-2">If you are an <strong>End-User</strong> of a customer's application (not an Dexter Auth customer yourself), your data is controlled by that customer. Please direct privacy requests about end-user data to the application's operator. Dexter Auth will assist our customers in fulfilling legitimate requests.</p>
                        </section>

                        <section id="data" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">2. Data We Collect</h2>
                            <h3 className="font-bold text-foreground dark:text-white mt-4 mb-2">2.1 Data you provide</h3>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Account data:</strong> email address, username, and a salted/hashed password when you register. We never store passwords in plain text.</li>
                                <li><strong>Profile data:</strong> optional details you add to your account (for example, a nickname or avatar).</li>
                                <li><strong>Application data you configure:</strong> application names, versions, owner IDs, license keys, subscription tiers, tokens, and reseller settings you create in the dashboard.</li>
                                <li><strong>Support communications:</strong> the contents of messages you send us (for example, support tickets or emails).</li>
                            </ul>

                            <h3 className="font-bold text-foreground dark:text-white mt-6 mb-2">2.2 Data collected automatically</h3>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>End-user authentication data:</strong> when your application authenticates a user through Dexter Auth, we process the credentials and session data necessary to issue an HTTP-only session cookie and validate the session. This may include the end-user's email/username and an IP address.</li>
                                <li><strong>Hardware identifiers (HWID):</strong> if you enable hardware-ID binding on a license, we process the device identifier your application sends so the license can be validated against that device.</li>
                                <li><strong>Technical/log data:</strong> IP address, browser/user-agent, approximate location (country-level), timestamps, and request logs used for security, abuse prevention, and reliability.</li>
                            </ul>

                            <h3 className="font-bold text-foreground dark:text-white mt-6 mb-2">2.3 Summary Table</h3>
                            <table className="w-full border-collapse border border-border dark:border-white/10 text-sm mt-3">
                                <thead>
                                    <tr className="bg-muted dark:bg-white/5">
                                        <th className="border border-border dark:border-white/10 p-3 text-left text-foreground dark:text-slate-300">Data category</th>
                                        <th className="border border-border dark:border-white/10 p-3 text-left text-foreground dark:text-slate-300">Examples</th>
                                        <th className="border border-border dark:border-white/10 p-3 text-left text-foreground dark:text-slate-300">Source</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-border dark:border-white/10 p-3">Account credentials</td>
                                        <td className="border border-border dark:border-white/10 p-3">Email, username, hashed password</td>
                                        <td className="border border-border dark:border-white/10 p-3">You (Customer)</td>
                                    </tr>
                                    <tr className="bg-muted/30 dark:bg-white/[0.02]">
                                        <td className="border border-border dark:border-white/10 p-3">Application config</td>
                                        <td className="border border-border dark:border-white/10 p-3">App name, license keys, subscriptions, tokens</td>
                                        <td className="border border-border dark:border-white/10 p-3">You (Customer)</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-border dark:border-white/10 p-3">End-user auth data</td>
                                        <td className="border border-border dark:border-white/10 p-3">End-user email/username, session, IP</td>
                                        <td className="border border-border dark:border-white/10 p-3">Your Application</td>
                                    </tr>
                                    <tr className="bg-muted/30 dark:bg-white/[0.02]">
                                        <td className="border border-border dark:border-white/10 p-3">Hardware identifiers</td>
                                        <td className="border border-border dark:border-white/10 p-3">Device HWID bound to a license</td>
                                        <td className="border border-border dark:border-white/10 p-3">Your Application</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-border dark:border-white/10 p-3">Technical/log data</td>
                                        <td className="border border-border dark:border-white/10 p-3">IP, user-agent, timestamps, request logs</td>
                                        <td className="border border-border dark:border-white/10 p-3">Automatic</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section id="why" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">3. How &amp; Why We Use Data</h2>
                            <p>We use personal data only for specific, legitimate purposes:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li><strong>To provide the Service:</strong> create accounts, issue and validate sessions, manage licenses, subscriptions, tokens, and HWID binding, and operate your dashboard.</li>
                                <li><strong>To secure the Service:</strong> detect, prevent, and respond to fraud, abuse, unauthorized access, and security incidents.</li>
                                <li><strong>To communicate with you:</strong> service notices, account-related emails, and responses to your support requests.</li>
                                <li><strong>To comply with legal obligations:</strong> meet record-keeping requirements.</li>
                            </ul>
                        </section>

                        <section id="legal-basis" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">4. Legal Basis for Processing (GDPR)</h2>
                            <p>For users in the EU/UK/EEA, we rely on the following lawful bases under Article 6 of the GDPR:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li><strong>Performance of a contract (Art. 6(1)(b)):</strong> processing necessary to provide the Service you signed up for.</li>
                                <li><strong>Legal obligation (Art. 6(1)(c)):</strong> where we must retain data to comply with the law.</li>
                                <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> security, fraud prevention, network integrity, and Service improvement.</li>
                            </ul>
                        </section>

                        <section id="processors" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">5. Third Parties &amp; Sub-Processors</h2>
                            <p>We rely on trusted third parties to operate the Service. They process data on our behalf under written agreements:</p>
                            <table className="w-full border-collapse border border-border dark:border-white/10 text-sm mt-3">
                                <thead>
                                    <tr className="bg-muted dark:bg-white/5">
                                        <th className="border border-border dark:border-white/10 p-3 text-left text-foreground dark:text-slate-300">Provider</th>
                                        <th className="border border-border dark:border-white/10 p-3 text-left text-foreground dark:text-slate-300">Purpose</th>
                                        <th className="border border-border dark:border-white/10 p-3 text-left text-foreground dark:text-slate-300">Data involved</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-border dark:border-white/10 p-3">Supabase</td>
                                        <td className="border border-border dark:border-white/10 p-3">Database hosting and serverless edge functions</td>
                                        <td className="border border-border dark:border-white/10 p-3">Account, application, end-user, and log data</td>
                                    </tr>
                                    <tr className="bg-muted/30 dark:bg-white/[0.02]">
                                        <td className="border border-border dark:border-white/10 p-3">Discord (webhooks)</td>
                                        <td className="border border-border dark:border-white/10 p-3">Operational alerts and logging</td>
                                        <td className="border border-border dark:border-white/10 p-3">Limited event metadata (no raw passwords)</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-border dark:border-white/10 p-3">Cloud infrastructure</td>
                                        <td className="border border-border dark:border-white/10 p-3">Serving the website and API</td>
                                        <td className="border border-border dark:border-white/10 p-3">Technical/log data</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p className="mt-3">We do not sell personal data to any third party.</p>
                        </section>

                        <section id="sharing" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">6. When We Share Data</h2>
                            <p>We may disclose personal data only:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>To our sub-processors, as described above;</li>
                                <li>To comply with a legal obligation or lawful request from an authority;</li>
                                <li>To protect our rights, property, or safety.</li>
                            </ul>
                        </section>

                        <section id="retention" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">7. Data Retention</h2>
                            <p>We keep personal data only as long as necessary for the purposes described here:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li><strong>Account data</strong> is retained while your account is active and deleted within a reasonable period after closure.</li>
                                <li><strong>End-user and licensing data</strong> is retained for as long as your application uses the Service.</li>
                            </ul>
                        </section>

                        <section id="security" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">8. Security</h2>
                            <p>We take reasonable technical and organizational measures to protect personal data, including: hashed passwords (never plain text), HTTP-only session cookies, transport encryption (HTTPS), access controls, and isolation between customers' data.</p>
                        </section>

                        <section id="cookies" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">9. Cookies</h2>
                            <p>Dexter Auth uses a minimal set of cookies and similar technologies:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li><strong>Essential (session) cookies:</strong> the HTTP-only cookie that keeps you signed in.</li>
                                <li><strong>Preference cookies:</strong> to remember your choices (for example, theme).</li>
                            </ul>
                        </section>

                        <section id="rights-gdpr" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">10. Your Rights (GDPR / UK GDPR)</h2>
                            <p>If you are in the EU, UK, or EEA, you have the following rights over your personal data:</p>
                            <div className="grid grid-cols-1 gap-3 mt-3">
                                <div className="bg-muted/30 dark:bg-white/[0.02] border border-border dark:border-white/5 rounded-lg p-4">
                                    <strong className="text-primary block mb-1">Access &amp; Rectification</strong>
                                    <span>Right to receive a copy of your data and correct any inaccuracies.</span>
                                </div>
                                <div className="bg-muted/30 dark:bg-white/[0.02] border border-border dark:border-white/5 rounded-lg p-4">
                                    <strong className="text-primary block mb-1">Erasure &amp; Portability</strong>
                                    <span>Request deletion of your data or export it in a structured machine-readable format.</span>
                                </div>
                                <div className="bg-muted/30 dark:bg-white/[0.02] border border-border dark:border-white/5 rounded-lg p-4">
                                    <strong className="text-primary block mb-1">Objection &amp; Restriction</strong>
                                    <span>Object to processing based on legitimate interests or limit how we process it.</span>
                                </div>
                            </div>
                        </section>

                        <section id="rights-ccpa" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">11. Your Rights (CCPA / US State Laws)</h2>
                            <p>If you are a California resident, you have the right to Know what personal data we collect, request Deletion, correct inaccuracies, and Opt Out of the "sale" or "sharing" of personal data. <em>Dexter Auth does not sell personal data.</em></p>
                        </section>

                        <section id="children" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">12. Children</h2>
                            <p>The Service is not directed to children under 16, and we do not knowingly collect personal data from them.</p>
                        </section>

                        <section id="international" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">13. International Transfers</h2>
                            <p>Because Dexter Auth and its sub-processors process data in countries outside your own — including the United States — your data may be subject to the laws of those countries. We use Standard Contractual Clauses where applicable.</p>
                        </section>

                        <section id="changes" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">14. Changes</h2>
                            <p>We may update this Privacy Policy from time to time. We will change the "Last updated" date above and notify you of any material changes.</p>
                        </section>

                        <section id="contact" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">15. Contact &amp; DPO</h2>
                            <p>For any privacy question, request, or complaint, contact us at: <a href="mailto:privacy@dexterauth.com" className="text-primary hover:underline">privacy@dexterauth.com</a>.</p>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border dark:border-white/10 pt-8 flex flex-wrap gap-4 items-center justify-between text-sm text-muted-foreground dark:text-slate-400">
                        <span>© {new Date().getFullYear()} Dexter Auth. All rights reserved.</span>
                        <div className="flex gap-4">
                            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                            <Link to="/" className="text-primary hover:underline">Back to home</Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
