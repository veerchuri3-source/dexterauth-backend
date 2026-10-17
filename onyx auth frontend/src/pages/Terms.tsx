import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { SEO } from "../components/SEO";

export default function Terms() {
    return (
        <div className="min-h-screen bg-background text-foreground dark:bg-[#0b1020] dark:text-[#e6ebf5] selection:bg-primary/20 selection:text-foreground dark:selection:text-white">
            <SEO title="Terms of Service" description="Dexter Auth is a free, enterprise-grade authentication and software licensing API for native C++, C#, and ImGui applications." path="/terms" />
            
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
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground dark:text-white tracking-tight mb-2">Terms of Service</h1>
                        <p className="text-sm text-muted-foreground dark:text-slate-400">Last updated: June 19, 2026</p>
                    </div>

                    {/* Summary Box */}
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        <strong className="text-foreground dark:text-white">Plain-language summary:</strong> These Terms govern your use of Dexter Auth. Dexter Auth is provided to help developers add authentication and licensing to their applications. You are responsible for how you use it and for your own end-users. The service is provided "as is" — please read the full terms below, especially the sections on acceptable use, disclaimers, and limitation of liability.
                    </div>

                    {/* Contents Links */}
                    <div className="border border-border dark:border-white/5 bg-muted/40 dark:bg-white/[0.02] rounded-xl p-6">
                        <h2 className="text-xs uppercase tracking-wider text-muted-foreground dark:text-slate-400 font-semibold mb-4">Contents</h2>
                        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <li><a href="#acceptance" className="text-primary hover:underline">1. Acceptance of Terms</a></li>
                            <li><a href="#definitions" className="text-primary hover:underline">2. Definitions</a></li>
                            <li><a href="#eligibility" className="text-primary hover:underline">3. Eligibility</a></li>
                            <li><a href="#accounts" className="text-primary hover:underline">4. Accounts</a></li>
                            <li><a href="#license" className="text-primary hover:underline">5. License to Use Dexter Auth</a></li>
                            <li><a href="#acceptable-use" className="text-primary hover:underline">6. Acceptable Use</a></li>
                            <li><a href="#customer-responsibilities" className="text-primary hover:underline">7. Your Applications & End-Users</a></li>
                            <li><a href="#payment" className="text-primary hover:underline">8. Fees & Billing</a></li>
                            <li><a href="#ip" className="text-primary hover:underline">9. Intellectual Property</a></li>
                            <li><a href="#data" className="text-primary hover:underline">10. Data & Privacy</a></li>
                            <li><a href="#termination" className="text-primary hover:underline">11. Suspension & Termination</a></li>
                            <li><a href="#disclaimers" className="text-primary hover:underline">12. Disclaimers</a></li>
                            <li><a href="#liability" className="text-primary hover:underline">13. Limitation of Liability</a></li>
                            <li><a href="#indemnity" className="text-primary hover:underline">14. Indemnification</a></li>
                            <li><a href="#changes" className="text-primary hover:underline">15. Changes to Terms</a></li>
                            <li><a href="#law" className="text-primary hover:underline">16. Governing Law</a></li>
                            <li><a href="#contact" className="text-primary hover:underline">17. Contact</a></li>
                        </ol>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-10 max-w-none text-slate-600 dark:text-slate-300 text-[15px] leading-relaxed">
                        
                        <section id="acceptance" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">1. Acceptance of Terms</h2>
                            <p>Welcome to Dexter Auth. By creating an account, accessing our dashboard, integrating our SDK, or otherwise using the Dexter Auth service, website, or application programming interface (collectively, the <strong>"Service"</strong>), you agree to be bound by these Terms of Service ("<strong>Terms</strong>"). If you are using the Service on behalf of a company or other entity, you represent that you have the authority to bind that entity to these Terms.</p>
                            <p className="mt-2">If you do not agree to these Terms, you must not access or use the Service.</p>
                        </section>

                        <section id="definitions" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">2. Definitions</h2>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>"Dexter Auth," "we," "us," or "our"</strong> refers to the operator of the Dexter Auth Service.</li>
                                <li><strong>"Customer" or "you"</strong> refers to the developer or organization that creates an Dexter Auth account and integrates the Service into their application.</li>
                                <li><strong>"End-User"</strong> refers to the users of <em>your</em> application who authenticate through Dexter Auth.</li>
                                <li><strong>"SDK"</strong> refers to the software development kits and libraries Dexter Auth provides (including JavaScript, C++, C#, and Python examples).</li>
                                <li><strong>"Application"</strong> refers to the software product you build that integrates Dexter Auth.</li>
                            </ul>
                        </section>

                        <section id="eligibility" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">3. Eligibility</h2>
                            <p>You must be at least 16 years of age (or the age of digital consent in your jurisdiction) to use the Service. If you are under 18, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf. You must not use the Service if you are prohibited from doing so under applicable law.</p>
                        </section>

                        <section id="accounts" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">4. Accounts</h2>
                            <p>To use the Service you must register an account using a valid email address and a username, and you must choose a strong password. You are responsible for:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>Maintaining the confidentiality and security of your account credentials and any Application Secrets and API keys issued to you;</li>
                                <li>All activity that occurs under your account;</li>
                                <li>Promptly notifying us of any unauthorized access or security breach.</li>
                            </ul>
                            <p className="mt-2">We use HTTP-only cookies and session tokens to authenticate your dashboard sessions. You are responsible for logging out of shared devices.</p>
                        </section>

                        <section id="license" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">5. License to Use Dexter Auth</h2>
                            <p>Subject to your ongoing compliance with these Terms, Dexter Auth grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Service and SDK solely to develop, test, and operate your Applications. This license does not include any right to resell, sublicense, or white-label the Service unless you hold an active reseller agreement with us.</p>
                        </section>

                        <section id="acceptable-use" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">6. Acceptable Use</h2>
                            <p>You agree <strong>not</strong> to:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>Use the Service to build, host, or distribute malware, ransomware, cheats for online games, credential-stuffing tools, or any software designed to harm, deceive, or exploit others;</li>
                                <li>Use the Service to process data about children under 16 without verifiable parental consent;</li>
                                <li>Attempt to reverse engineer, decompile, bypass, or circumvent any rate limit, licensing check, security, or access-control mechanism of the Service;</li>
                                <li>Abuse, overload, or stress the Service (including denial-of-service activity, scraping, or automated load not related to legitimate use of the SDK);</li>
                                <li>Use the Service to send spam, phishing, or unsolicited communications;</li>
                                <li>Resell or redistribute access to the Service without authorization;</li>
                                <li>Violate any applicable law, regulation, or third-party right.</li>
                            </ul>
                            <p className="mt-2">Because Dexter Auth is commonly used to protect software from piracy and unauthorized access, we recognize that some customers operate in security-sensitive domains. Security research conducted in good faith and within the law is not a violation; malicious activity is.</p>
                        </section>

                        <section id="customer-responsibilities" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">7. Your Applications &amp; End-Users</h2>
                            <p>You are solely responsible for your Applications and for your End-Users. Specifically:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>You are the data controller for your End-Users' data, and Dexter Auth acts as your data processor. You must provide your own End-Users with a privacy policy and obtain any consent required by law (including under the GDPR).</li>
                                <li>You must comply with all laws applicable to your Application, including consumer-protection, export-control, and data-protection laws.</li>
                                <li>You are responsible for configuring licenses, hardware-ID (HWID) binding, subscriptions, and token policies appropriately for your product.</li>
                                <li>You must not use Dexter Auth in a manner that could damage our reputation or the Service.</li>
                            </ul>
                        </section>

                        <section id="payment" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">8. Fees &amp; Billing</h2>
                            <p>Dexter Auth currently offers a free tier. If and when we introduce paid plans, the following will apply:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>Fees, usage limits, and billing cycles will be described on our pricing page and agreed at the time you subscribe to a paid plan.</li>
                                <li>Paid fees are billed in advance and are generally non-refundable except where required by law.</li>
                                <li>We may change our fees upon reasonable notice. Fee changes will not apply to a then-current billing cycle that has already been paid.</li>
                                <li>Where a payment processor is used, that processor's terms also apply, and we never receive or store your raw card details.</li>
                            </ul>
                            <p className="mt-2">You authorize us to charge the agreed fees to your designated payment method. Overdue amounts may accrue interest at the maximum rate permitted by law and may result in suspension of the Service.</p>
                        </section>

                        <section id="ip" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">9. Intellectual Property</h2>
                            <p>The Service, including the Dexter Auth name, logo, software, documentation, and design, is owned by us and protected by intellectual-property laws. These Terms do not grant you any right to use our trademarks, brand, or trade dress except as expressly permitted.</p>
                            <p className="mt-2">You retain all rights in your Applications and your End-User data.</p>
                        </section>

                        <section id="data" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">10. Data &amp; Privacy</h2>
                            <p>Your use of the Service is also governed by our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which describes how we collect, use, and protect information. By using the Service you consent to the data practices described there.</p>
                        </section>

                        <section id="termination" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">11. Suspension &amp; Termination</h2>
                            <p>You may close your account at any time by discontinuing use and contacting us.</p>
                            <p className="mt-2">We may suspend or terminate your access to the Service, without prior notice, if: (a) you breach these Terms; (b) we reasonably believe your use poses a security, legal, or reputational risk; or (c) we are required to do so by law.</p>
                            <p className="mt-2">Upon termination, your right to use the Service ends immediately. We may delete your account data after a reasonable period, except where we are required to retain it for legal, accounting, or security purposes.</p>
                        </section>

                        <section id="disclaimers" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">12. Disclaimers</h2>
                            <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR THAT DEFECTS WILL BE CORRECTED.</p>
                            <p className="mt-2">YOU ARE SOLELY RESPONSIBLE FOR ANY DECISIONS MADE BASED ON THE SERVICE, AND FOR INDEPENDENT VERIFICATION OF RESULTS.</p>
                        </section>

                        <section id="liability" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">13. Limitation of Liability</h2>
                            <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL DEXTER AUTH BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE, WHETHER IN CONTRACT, TORT, OR ANY OTHER THEORY.</p>
                            <p className="mt-2">OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU HAVE PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) USD $100. Because the Service may currently be provided free of charge, this means that, in many cases, our liability will be limited to USD $100.</p>
                        </section>

                        <section id="indemnity" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">14. Indemnification</h2>
                            <p>You agree to indemnify, defend, and hold harmless Dexter Auth and its affiliates from and against any claims, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) your Applications or End-Users; (b) your breach of these Terms; or (c) your violation of any law or third-party right.</p>
                        </section>

                        <section id="changes" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">15. Changes to Terms</h2>
                            <p>We may update these Terms from time to time. If we make material changes, we will notify you by email or a notice within the Service and update the "Last updated" date above. Your continued use of the Service after the effective date constitutes acceptance of the revised Terms.</p>
                        </section>

                        <section id="law" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">16. Governing Law &amp; Disputes</h2>
                            <p>These Terms are governed by the laws applicable to the jurisdiction in which Dexter Auth operates, without regard to conflict-of-law principles. You and we agree to attempt to resolve any dispute informally first. Any claim or dispute that cannot be resolved informally will be brought in the courts of competent jurisdiction. Where you are a consumer with a statutory right to bring a claim in your country of residence, nothing in this section overrides that right.</p>
                            <p className="mt-2">For users in the European Union, United Kingdom, and European Economic Area: you retain the mandatory rights provided to you under applicable local law, including the rights referred to in Article 19 of EU Regulation No. 524/2013, which allows submitting complaints to the European Online Dispute Resolution platform.</p>
                        </section>

                        <section id="contact" className="scroll-mt-6">
                            <h2 className="text-lg font-bold text-foreground dark:text-white mb-3">17. Contact</h2>
                            <p>If you have any questions about these Terms, please contact us at <a href="mailto:legal@dexterauth.com" className="text-primary hover:underline">legal@dexterauth.com</a>.</p>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border dark:border-white/10 pt-8 flex flex-wrap gap-4 items-center justify-between text-sm text-muted-foreground dark:text-slate-400">
                        <span>© {new Date().getFullYear()} Dexter Auth. All rights reserved.</span>
                        <div className="flex gap-4">
                            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                            <Link to="/" className="text-primary hover:underline">Back to home</Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
