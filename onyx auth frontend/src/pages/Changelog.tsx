import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Zap, Wrench, Shield, Bug, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';
import LiquidEther from '@/components/LiquidEther';
import { devApi } from '../lib/api';

const LIQUID_ETHER_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];

type BadgeType = 'feature' | 'improvement' | 'fix' | 'security';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: { type: BadgeType; text: string }[];
}

const entries: ChangelogEntry[] = [
  {
    version: 'v2.0.0',
    date: 'July 26, 2026',
    title: 'Advanced Anti-Tamper & V2 API Release',
    description: 'Introducing the V2 API Architecture featuring the Signed Response Protocol (SRP), Enriched Ban Monitoring, and In-Memory Session Caching. All Official SDKs have been upgraded.',
    changes: [
      { type: 'security', text: 'Implemented Signed Response Protocol (SRP) in all SDKs to prevent MITM tampering.' },
      { type: 'security', text: 'Enriched /verify-session payload for instant ban revocation monitoring.' },
      { type: 'security', text: 'Enabled cryptographic SHA-256 hashing for all active session tokens.' },
      { type: 'improvement', text: 'Added in-memory caching to reduce database load by 95% on active sessions.' },
      { type: 'feature', text: 'Deployed strict 10req/min Rate Limiting on all Auth routes to stop credential stuffing.' }
    ]
  },
  {
    version: 'v1.1.0',
    date: 'June 20, 2026',
    title: 'Developer Dashboard & Admin Enhancements',
    description: 'A major update to the Developer Dashboard, introducing the new Support Modal, improved routing, and dynamic platform settings configuration from the Admin Panel.',
    changes: [
      { type: 'feature', text: 'Added dynamic Help & Support modal in the Developer Dashboard.' },
      { type: 'feature', text: 'Public platform settings endpoint for dynamic homepage contact details.' },
      { type: 'improvement', text: 'Refactored Team Invite logic to handle existing users seamlessly.' },
      { type: 'improvement', text: 'Overhauled the Documentation and Changelog pages.' },
      { type: 'fix', text: 'Fixed Cloudflare Turnstile zero-height animation bug on Login page.' }
    ]
  },
  {
    version: 'v1.0.0',
    date: 'June 10, 2026',
    title: 'Initial Public Launch',
    description: 'Dexter Auth is officially live! Our hosted authentication platform is now available to help developers secure their JavaScript, C++, and C# applications without writing JWT glue code.',
    changes: [
      { type: 'feature', text: 'Released Core API with JWT sessions and Bcrypt hashing.' },
      { type: 'feature', text: 'Released Developer Dashboard for App and License management.' },
      { type: 'feature', text: 'Released Customer Web Panel for end-user HWID resets.' },
      { type: 'security', text: 'Implemented strict rate limiting and HWID locking by default.' }
    ]
  }
];

const getBadgeIcon = (type: BadgeType) => {
  switch (type) {
    case 'feature': return <Zap className="w-3 h-3 mr-1" />;
    case 'improvement': return <Wrench className="w-3 h-3 mr-1" />;
    case 'fix': return <Bug className="w-3 h-3 mr-1" />;
    case 'security': return <Shield className="w-3 h-3 mr-1" />;
  }
};

const getBadgeStyle = (type: BadgeType) => {
  switch (type) {
    case 'feature': return 'bg-primary/10 text-primary border-primary/20';
    case 'improvement': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'fix': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'security': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  }
};

const Changelog: React.FC = () => {
  const [activeEntries, setActiveEntries] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    devApi.getChangelog()
      .then((res: any) => {
        if (res.status === 'success' && Array.isArray(res.data?.changelog)) {
          setActiveEntries([...res.data.changelog, ...entries]);
        } else {
          setActiveEntries(entries);
        }
      })
      .catch(() => {
        setActiveEntries(entries);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground relative isolate">
      <SEO
        title="Changelog | Dexter Auth"
        description="Stay up to date with the latest features, improvements, and bug fixes in Dexter Auth."
        path="/changelog"
        jsonLd={{
          "@type": "SoftwareSourceCode",
          "@id": "https://dexterauth.com/changelog",
          "name": "Dexter Auth API Changelog",
          "description": "Repository versioning records capturing recent API releases, SDK latency optimizations, and stack validation parameters.",
          "programmingLanguage": "C++, C#, TypeScript",
          "codeRepository": "https://github.com/shivapatel2/DexterAuth"
        }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 hidden md:block">
        <LiquidEther
          colors={LIQUID_ETHER_COLORS}
          mouseForce={15}
          cursorSize={80}
          isViscous={false}
          viscous={30}
          iterationsViscous={6}
          iterationsPoisson={8}
          resolution={0.3}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.3}
          autoIntensity={1.0}
        />
      </div>
      {/* Mobile fallback gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 block bg-gradient-to-b from-primary/5 to-background md:hidden" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border h-16 flex items-center px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </Link>
        <div className="ml-8 flex items-center space-x-2 text-primary">
          <Clock className="w-5 h-5" />
          <span className="font-bold text-lg">Changelog</span>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-[clamp(6rem,12vw,8rem)] pb-[clamp(4rem,10vw,6rem)] px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-[clamp(2.5rem,6vw,4rem)]">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ willChange: "transform, opacity" }}
            className="text-[clamp(2.25rem,5vw+1rem,3.5rem)] font-bold tracking-tight mb-4"
          >
            What's new in Dexter Auth
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ willChange: "transform, opacity" }}
            className="text-[clamp(1.125rem,2vw+0.5rem,1.25rem)] text-muted-foreground max-w-2xl mx-auto"
          >
            New updates and improvements to our hosted authentication platform.
          </motion.p>
        </div>

        <div className="space-y-16 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {activeEntries.map((entry, idx) => (
            <motion.div 
              key={entry.version}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              style={{ willChange: "transform, opacity" }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
            >
              {/* Timeline dot */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <div className="w-3 h-3 rounded-full bg-background" />
              </div>
              
              {/* Card */}
              <article className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-[clamp(1.5rem,4vw,2rem)] rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm shadow-xl shadow-black/5 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[clamp(1.125rem,2vw+0.5rem,1.25rem)] font-bold text-foreground">{entry.version}</h3>
                  <time className="text-sm font-mono text-muted-foreground">{entry.date}</time>
                </div>
                <h4 className="text-lg font-semibold text-primary mb-3">{entry.title}</h4>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {entry.description}
                </p>
                <div className="space-y-3">
                  {entry.changes.map((change, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Badge variant="outline" className={`shrink-0 capitalize mt-0.5 \${getBadgeStyle(change.type)}`}>
                        {getBadgeIcon(change.type)}
                        {change.type}
                      </Badge>
                      <span className="text-sm text-foreground/90">{change.text}</span>
                    </div>
                  ))}
                </div>
              </article>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Changelog;
