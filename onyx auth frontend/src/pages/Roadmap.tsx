import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, Clock, Loader2, Sparkles, Server, Zap, Shield, CreditCard, Activity } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";

type TimelineItem = {
  id: string;
  quarter: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "planned" | "future";
  icon: React.ReactNode;
  tags: string[];
};

const timelineData: TimelineItem[] = [
  {
    id: "q2-2026",
    quarter: "Q2 2026",
    title: "Core API & Hardware ID Locking",
    description: "Launch of the core REST API handling applications, user sessions, and hardware ID constraints. Released initial Python and C# SDKs.",
    status: "completed",
    icon: <Server className="w-5 h-5 text-emerald-500" />,
    tags: ["Core", "API", "Desktop"],
  },
  {
    id: "q3-2026",
    quarter: "Q3 2026",
    title: "Edge Framework Guides & SDKs",
    description: "Expanding documentation with comprehensive guides for Next.js, Cloudflare Workers, Express, Hono, and Remix.",
    status: "in-progress",
    icon: <Zap className="w-5 h-5 text-primary" />,
    tags: ["Documentation", "Web", "Edge"],
  },
  {
    id: "q4-2026",
    quarter: "Q4 2026",
    title: "Stripe Reseller Integrations",
    description: "Native Stripe integration allowing your resellers to automatically purchase license generation credits and quotas.",
    status: "planned",
    icon: <CreditCard className="w-5 h-5 text-purple-500" />,
    tags: ["Billing", "Resellers"],
  },
  {
    id: "q1-2027",
    quarter: "Q1 2027",
    title: "AI Threat Detection",
    description: "Automated flagging of credential stuffing and proxy networks using edge-level ML models.",
    status: "future",
    icon: <Shield className="w-5 h-5 text-red-400" />,
    tags: ["Security", "AI"],
  },
  {
    id: "q2-2027",
    quarter: "Q2 2027",
    title: "Advanced Analytics Dashboard",
    description: "Deep insights into user behavior, session durations, and HWID reset frequencies across your applications.",
    status: "future",
    icon: <Activity className="w-5 h-5 text-orange-400" />,
    tags: ["Analytics", "Dashboard"],
  },
];

const StatusBadge = ({ status }: { status: TimelineItem["status"] }) => {
  switch (status) {
    case "completed":
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
    case "in-progress":
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> In Progress</Badge>;
    case "planned":
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20"><Clock className="w-3 h-3 mr-1" /> Planned</Badge>;
    case "future":
      return <Badge variant="outline" className="bg-muted text-muted-foreground"><Circle className="w-3 h-3 mr-1" /> Future</Badge>;
  }
};

const Roadmap: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground dark selection:bg-primary/30">
      <SEO
        title="Dexter Auth Roadmap"
        description="See what we're building next at Dexter Auth. From edge SDKs to AI threat detection."
        path="/roadmap"
        jsonLd={{
          "@type": "WebPage",
          "@id": "https://dexterauth.com/roadmap",
          "name": "Dexter Auth Product Roadmap",
          "description": "Tracking upcoming Dexter Auth features including OAuth integration, edge network scalability, and enhanced C++ anti-tamper vectors.",
          "isPartOf": { "@id": "https://dexterauth.com/#website" }
        }}
      />
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border h-16 flex items-center px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </Link>
        <div className="ml-8 flex items-center space-x-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <span className="font-bold text-lg">Roadmap</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-[clamp(6rem,12vw,8rem)] pb-[clamp(4rem,10vw,6rem)] px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-[clamp(2.5rem,6vw,4rem)]">
          <h1 className="text-[clamp(2.25rem,5vw+1rem,3.5rem)] font-bold tracking-tight mb-4">
            Building the future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-red-400">auth & licensing</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We move fast. Here's a look at what we've recently shipped and what we're working on right now to make Dexter Auth the best licensing platform in the world.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative border-l border-border ml-4 md:ml-8 space-y-12">
          {timelineData.map((item, index) => (
            <div key={item.id} className="relative pl-8 md:pl-12 group animate-in slide-in-from-bottom-4 fade-in duration-500 fill-mode-both" style={{ animationDelay: `${index * 100}ms` }}>
              {/* Timeline Node */}
              <div className="absolute -left-4 top-1 flex items-center justify-center w-8 h-8 rounded-full bg-background border-2 border-border group-hover:border-primary transition-colors z-10">
                {item.icon}
              </div>

              {/* Content Card */}
              <article className="bg-card/40 border border-border/60 hover:border-primary/40 transition-colors rounded-xl p-[clamp(1.5rem,4vw,2rem)] backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[clamp(1.125rem,2vw+0.5rem,1.25rem)] font-semibold text-foreground">{item.title}</h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md shrink-0 w-fit">
                    {item.quarter}
                  </span>
                </div>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-secondary/50 hover:bg-secondary/80">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </article>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Roadmap;
