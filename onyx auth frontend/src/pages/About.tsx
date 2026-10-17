import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ShieldCheck, Zap, Globe, Users } from "lucide-react";
import { SEO } from "../components/SEO";
import BrandWordmark from "../components/BrandWordmark";

export default function About() {

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/30 flex flex-col font-sans">
            <SEO
                title="About Dexter Auth | Next-Gen Authentication"
                description="Learn more about Dexter Auth, the next-generation authentication and licensing platform built for modern developers."
                path="/about"
                jsonLd={{
                    "@type": "AboutPage",
                    "@id": "https://dexterauth.com/about",
                    "name": "About Dexter Auth System Capabilities",
                    "description": "Dexter Auth defines modern system capabilities, launch vectors, and operational focus areas within cryptographic HWID locking and zero-cost authentication API distribution.",
                    "mainEntity": {
                        "@type": "Organization",
                        "name": "Dexter Auth Infrastructure",
                        "description": "Provider of edge-distributed C++ and ImGui authentication logic."
                    }
                }}
            />
            {/* Header / Nav */}
            <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <Link to="/" className="group flex items-center gap-2.5">
                        <img src="/RDX.png" alt="Dexter Auth" className="h-9 w-9 rounded-xl object-cover border border-primary/20 shadow-lg shadow-primary/30" />
                        <span className="text-lg">
                            <BrandWordmark animated={false} />
                        </span>
                    </Link>
                    <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                        <ChevronLeft className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl w-full space-y-12 text-center">
                    
                    {/* Hero Section */}
                    <div className="space-y-6">
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
                            Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary">Developers.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                            Dexter Auth is a developer-first authentication and licensing platform designed to eliminate the boilerplate of building secure login flows, session management, and software licensing.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <section aria-labelledby="features-heading" className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mt-16">
                        <h2 id="features-heading" className="sr-only">Our Core Values</h2>
                        <article className="p-6 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                                <ShieldCheck className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Secure by Default</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                We handle HTTP-only cookies, robust rate limiting, and Turnstile integrations so you don't have to worry about XSS or bot attacks.
                            </p>
                        </article>
                        <article className="p-6 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                                <Zap className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Operating on the edge, Dexter Auth ensures ultra-low latency authentication checks and seamless session management worldwide.
                            </p>
                        </article>
                        <article className="p-6 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                                <Globe className="w-6 h-6 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Global Infrastructure</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Our distributed architecture ensures high availability, guaranteeing your authentication layer never becomes a single point of failure.
                            </p>
                        </article>
                        <article className="p-6 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Built for Teams</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Multi-tenant architecture allows you to easily manage multiple applications, user roles, and team members from a single dashboard.
                            </p>
                        </article>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Dexter Auth. All rights reserved.</p>
            </footer>
        </div>
    );
}
