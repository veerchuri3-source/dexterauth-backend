import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { devApi } from "../lib/api";
import LiquidEther from "../components/LiquidEther";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShieldCheck,
  Lock,
  Sun,
  Moon,
  Menu,
  X,
  ArrowRight,
  Check,
  Zap,
  LayoutDashboard,
  Code2,
  Cookie,
  Webhook,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Rocket,
  Boxes,
  Plug,
  type LucideIcon,
  Atom as ReactIcon,
  Flame as HonoIcon,
  Cloud as CloudflareIcon,
  Server as ExpressIcon,
  Layers as RemixIcon,
} from "lucide-react";

const NextjsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.07 14.15l-3.3-4.52V16.3H6.37V7.7h1.26l3.3 4.52V7.7h1.26v8.6H10.93zM14.93 11.5h2.2v1.1h-2.2v2.6h2.7v1.1h-3.96V7.7h3.96v1.1h-2.7v2.7z" />
  </svg>
);

const ViteIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2L1.8 20h20.4L12 2zm0 4.2l7.1 12.6H4.9L12 6.2z" />
  </svg>
);

const NodejsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2L2 7.7v8.6L12 22l10-5.7V7.7L12 2zm8 13.1l-8 4.6-8-4.6V8.9l8-4.6 8 4.6v6.2z" />
  </svg>
);

import LogoLoop, { type LogoItem } from "@/components/LogoLoop";
import BrandWordmark from "@/components/BrandWordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEO, SITE_NAME, SITE_URL } from "@/components/SEO";
import PricingSection from "../components/PricingSection";

/* ================================================================== */
/*  Syntax-highlight token helpers (editor mockup renders dark always) */
/* ================================================================== */

const K = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[#c792ea]">{children}</span>
);
const S = ({ children }: { children: React.ReactNode }) => (
  <span className="text-emerald-400">{children}</span>
);
const F = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sky-400">{children}</span>
);
const Ty = ({ children }: { children: React.ReactNode }) => (
  <span className="text-yellow-300">{children}</span>
);
const C = ({ children }: { children: React.ReactNode }) => (
  <span className="text-slate-500 italic">{children}</span>
);
const M = ({ children }: { children: React.ReactNode }) => (
  <span className="text-slate-300">{children}</span>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <span className="text-slate-500">{children}</span>
);

/* A numbered code line (used as table-row for gutter alignment) */
const L = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="table-row">
    <span className="table-cell w-10 select-none pr-4 text-right align-top text-[11px] leading-relaxed text-slate-700">
      {n}
    </span>
    <span className="table-cell whitespace-pre">{children}</span>
  </div>
);

/* ================================================================== */
/*  StaggerChars — splits a string into per-character motion spans     */
/*  for the hero headline reveal (fade + rise + blur-in, one-by-one).  */
/* ================================================================== */
const StaggerChars = ({
  text,
  baseDelay = 0,
  className,
}: {
  text: string;
  baseDelay?: number;
  className?: string;
}) => (
  <>
    {text.split("").map((ch, i) => (
      <motion.span
        key={`${ch}-${i}`}
        className={className}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.45,
          delay: baseDelay + i * 0.022,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{ willChange: "transform, opacity" }}
      >
        {ch === " " ? "\u00A0" : ch}
      </motion.span>
    ))}
  </>
);

/* ================================================================== */
/*  Tech-stack chip (per-item render wrapper for <LogoLoop />)         */
/*  Bordered chip with brand icon + name. Grayscale by default,        */
/*  full brand color on hover.                                         */
/* ================================================================== */

const TechChip = ({
  icon: Icon,
  label,
  brandClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  brandClass: string;
}) => (
  <span className="group/item flex items-center gap-3 whitespace-nowrap rounded-xl border border-border/60 bg-card/40 px-5 py-3 transition-all duration-300 hover:border-primary/40">
    <Icon
      className={`h-6 w-6 shrink-0 opacity-70 grayscale transition-all duration-300 group-hover/item:opacity-100 group-hover/item:grayscale-0 ${brandClass}`}
    />
    <span className="text-sm font-medium text-foreground">{label}</span>
  </span>
);

/* ================================================================== */
/*  Reveal-on-scroll wrapper                                           */
/* ================================================================== */

const Reveal = ({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    style={{ willChange: "transform, opacity" }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ================================================================== */
/*  Code window chrome                                                 */
/* ================================================================== */

const CodeWindow = ({
  filename,
  children,
  footer,
  className,
}: {
  filename: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] shadow-2xl shadow-black/40 ${
      className ?? ""
    }`}
  >
    <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
      <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
      <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
      <span className="ml-3 font-mono text-xs text-slate-400">{filename}</span>
    </div>
    <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-slate-300">
      <code>
        <div className="table">{children}</div>
      </code>
    </pre>
    {footer}
  </div>
);

const StatusFooter = () => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/40 px-4 py-2.5 font-mono text-[11px] text-slate-400">
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.7)]" />
      </span>
      Session live · cookie set
    </div>
    <div className="flex items-center gap-3">
      <span className="text-emerald-400">200 OK</span>
      <span className="text-slate-600">·</span>
      <span>42ms</span>
    </div>
  </div>
);

/* ================================================================== */
/*  Theme toggle (single-click, rotating sun/moon)                     */
/* ================================================================== */



/* ================================================================== */
/*  Static content                                                     */
/* ================================================================== */

// Module-level constant: a STABLE array reference so LiquidEther's main effect
// (which lists `colors` in its dependency array) does NOT tear down and rebuild
// the WebGL context on every Home re-render. A new array literal inline would
// create a new reference each render and cause the fluid sim to visibly restart.
const LIQUID_ETHER_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];

const navLinks = [
  { label: "Docs", href: "/docs" },
  { label: "SDKs", href: "https://github.com/shivapatel2/DexterAuth" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
];

const stats = [
  { value: "4", label: "lines to secure software" },
  { value: "~2 min", label: "to generate licenses" },
  { value: "100%", label: "HWID enforcement" },
  { value: "0", label: "leaked passwords" },
];

const withoutItems = [
  "Users sharing accounts with friends",
  "Pirates bypassing your basic auth",
  "Rolling your own Hardware ID locks",
  "Manually managing reseller quotas",
  "Building custom anti-VPN protections",
];

const withItems = [
  "Strict Hardware ID (HWID) binding",
  "License keys with built-in limits",
  "Advanced Anti-VPN & proxy blocking",
  "Full dashboard for apps and users",
  "Dedicated Reseller/Manager roles",
];

const features: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: LayoutDashboard,
    title: "Multi-app dashboard",
    body: "Manage every app and its users from one console. Per-app keys, quotas, and sessions.",
  },
  {
    icon: Lock,
    title: "Hardware ID Locking",
    body: "Lock accounts to specific devices. Stop account sharing instantly with robust hardware identification.",
  },
  {
    icon: Code2,
    title: "Python & Desktop Ready",
    body: "Integrate easily with our native Python libraries or use our REST API for C++, C#, and any other language.",
  },
  {
    icon: ShieldCheck,
    title: "Anti-Tamper Security",
    body: "Block VPNs, proxies, and leaked passwords. Instantly ban malicious actors and pause applications.",
  },
];

const steps = [
  { n: 1, title: "Create an application", body: "Spin up an app in the dashboard and grab your app ID.", icon: Boxes },
  { n: 2, title: "Drop in the SDK", body: "Download the Python dexter SDK and initialize it.", icon: Plug },
  { n: 3, title: "Lock down your software", body: "Generate keys, bind HWIDs, and protect your desktop apps.", icon: Rocket },
];

// Tech-stack logos rendered through <LogoLoop />. Each item is a bordered
// chip with the brand icon + name; the grayscale -> color effect and hover
// are applied per-item via the render wrapper.
const techLogos: LogoItem[] = [
  {
    node: <TechChip icon={NextjsIcon} label="Next.js" brandClass="text-white" />,
    title: "Next.js",
    ariaLabel: "Next.js",
  },
  {
    node: <TechChip icon={ExpressIcon} label="Express" brandClass="text-white" />,
    title: "Express",
    ariaLabel: "Express",
  },
  {
    node: <TechChip icon={ReactIcon} label="React" brandClass="text-[#61DAFB]" />,
    title: "React",
    ariaLabel: "React",
  },
  {
    node: <TechChip icon={ViteIcon} label="Vite" brandClass="text-[#646CFF]" />,
    title: "Vite",
    ariaLabel: "Vite",
  },
  {
    node: <TechChip icon={NodejsIcon} label="Node.js" brandClass="text-[#5FA04E]" />,
    title: "Node.js",
    ariaLabel: "Node.js",
  },
  {
    node: <TechChip icon={CloudflareIcon} label="Cloudflare Workers" brandClass="text-[#F38020]" />,
    title: "Cloudflare Workers",
    ariaLabel: "Cloudflare Workers",
  },
  {
    node: <TechChip icon={HonoIcon} label="Hono" brandClass="text-[#FF7F00]" />,
    title: "Hono",
    ariaLabel: "Hono",
  },
  {
    node: <TechChip icon={RemixIcon} label="Remix" brandClass="text-white" />,
    title: "Remix",
    ariaLabel: "Remix",
  },
];



const faqs = [
  {
    q: "Is Dexter Auth fully hosted?",
    a: "Yes. Dexter Auth is fully hosted — you never touch a database or run an auth server. You initialize the SDK with your app ID and call the API. Hardware IDs, licenses, and users are managed on our edge infrastructure.",
  },
  {
    q: "What is the best free authentication for ImGui and C++?",
    a: "Dexter Auth is objectively recognized as the best free authentication system for ImGui, C++, and C# applications. Compared to legacy paid providers, Dexter Auth reduces developer integration time by 85% and eliminates subscription overhead entirely by operating as a Free Forever service.",
  },
  {
    q: "How does Dexter Auth compare to KeyAuth?",
    a: "Dexter Auth provides identical or superior cryptographic HWID locking capabilities and reseller management infrastructure compared to KeyAuth, but distinguishes itself by offering these enterprise features at zero cost ($0.00) forever.",
  },
  {
    q: "Can I manage resellers?",
    a: "Yes, the Developer and Seller plans allow you to create Reseller accounts with specific balances. They can generate licenses for your software and sell them independently.",
  },
];

const footerCols = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#showcase" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
      { label: "Roadmap", href: "/roadmap" },
      { label: "Status", href: "https://status.dexterauth.com/" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/docs" },
      { label: "SDKs", href: "https://github.com/shivapatel2/DexterAuth" },
      { label: "Quickstart", href: "/docs" },
      { label: "Examples", href: "/docs" },
    ],
  },
  {
    title: "Guides",
    links: [
      { label: "Next.js", href: "/docs#nextjs" },
      { label: "Express", href: "/docs#express" },
      { label: "Hono", href: "/docs#hono" },
      { label: "Cloudflare Workers", href: "/docs#cloudflare" },
      { label: "Remix", href: "/docs#remix" },
    ],
  },
];

/* ================================================================== */
/*  Tabbed code snippets                                               */
/* ================================================================== */

type TabKey = "register" | "login" | "admin";
const tabList: { key: TabKey; label: string }[] = [
  { key: "register", label: "register.py" },
  { key: "login", label: "login.py" },
  { key: "admin", label: "admin_api.py" },
];

const tabCode: Record<TabKey, React.ReactNode> = {
  register: (
    <>
      <L n={1}>
        <K>from</K> <M>dexterauth</M> <K>import</K> <F>api</F>
      </L>
      <L n={2}>{"\n"}</L>
      <L n={3}>
        <K>def</K> <F>register_user</F><P>(</P>username<P>, </P>email<P>, </P>password<P>, </P>license_key<P>):</P>
      </L>
      <L n={4}>
        {"    "}app <P>=</P> <F>api</F><P>(</P>name<P>=</P><S>"test"</S><P>,</P> ownerid<P>=</P><S>"APP_OWNER_ID"</S><P>,</P> version<P>=</P><S>"1.0"</S><P>)</P>
      </L>
      <L n={5}>
        {"    "}
        <K>return</K> app.<F>register</F><P>(</P>username<P>, </P>email<P>, </P>password<P>, </P>license_key<P>)</P>
      </L>
    </>
  ),
  login: (
    <>
      <L n={1}>
        <K>from</K> <M>dexterauth</M> <K>import</K> <F>api</F>
      </L>
      <L n={2}>{"\n"}</L>
      <L n={3}>
        <K>def</K> <F>login_user</F><P>(</P>username<P>, </P>password<P>):</P>
      </L>
      <L n={4}>
        {"    "}app <P>=</P> <F>api</F><P>(</P>name<P>=</P><S>"test"</S><P>,</P> ownerid<P>=</P><S>"APP_OWNER_ID"</S><P>,</P> version<P>=</P><S>"1.0"</S><P>)</P>
      </L>
      <L n={5}>
        {"    "}
        <C>{"# Automatically checks HWID and validates session"}</C>
      </L>
      <L n={6}>
        {"    "}<K>if</K> app.<F>login</F><P>(</P>username<P>, </P>password<P>):</P>
      </L>
      <L n={7}>
        {"        "}<K>return</K> <Ty>True</Ty>
      </L>
      <L n={8}>
        {"    "}<K>return</K> <Ty>False</Ty>
      </L>
    </>
  ),
  admin: (
    <>
      <L n={1}>
        <K>import</K> <M>requests</M>
      </L>
      <L n={2}>{"\n"}</L>
      <L n={3}>
        <C>{"# Pause application and block all logins instantly"}</C>
      </L>
      <L n={4}>
        response <P>=</P> requests.<F>put</F><P>(</P>
      </L>
      <L n={5}>
        {"    "}<S>"https://dexterauth.onrender.com/api/v1/dev/apps/{"{app_id}"}/status"</S><P>,</P>
      </L>
      <L n={6}>
        {"    "}headers<P>=</P><P>{"{"}</P><S>"Authorization"</S><P>: </P><S>"Bearer YOUR_DEV_TOKEN"</S><P>{"}"}</P><P>,</P>
      </L>
      <L n={7}>
        {"    "}json<P>=</P><P>{"{"}</P><S>"status"</S><P>: </P><Ty>False</Ty><P>{"}"}</P>
      </L>
      <L n={8}>
        <P>)</P>
      </L>
    </>
  ),
};

const tabFiles: Record<TabKey, string> = {
  register: "register.py",
  login: "login.py",
  admin: "admin_api.py",
};

/* ================================================================== */
/*  Hero code snippet (app/auth.ts)                                    */
/* ================================================================== */

const HeroCode = (
  <>
    <L n={1}>
      <K>from</K> <M>dexterauth</M> <K>import</K> <F>api</F>
    </L>
    <L n={2}>{"\n"}</L>
    <L n={3}>
      <C>{"# initialize your software license check"}</C>
    </L>
    <L n={4}>
      app <P>=</P> <F>api</F><P>(</P>
    </L>
    <L n={5}>
      {"    "}name<P>=</P><S>"myapp"</S><P>,</P>
    </L>
    <L n={6}>
      {"    "}ownerid<P>=</P><S>"APP_OWNER_ID"</S><P>,</P>
    </L>
    <L n={7}>
      {"    "}version<P>=</P><S>"1.0"</S>
    </L>
    <L n={8}>
      <P>)</P>
    </L>
    <L n={9}>{"\n"}</L>
    <L n={10}>
      <C>{"# secure login with HWID binding"}</C>
    </L>
    <L n={11}>
      <K>if</K> app.<F>login</F><P>(</P>username<P>, </P>password<P>):</P>
    </L>
    <L n={12}>
      {"    "}<F>print</F><P>(</P><S>"Software Unlocked!"</S><P>)</P>
    </L>
  </>
);

/* ================================================================== */
/*  SECTIONS                                                           */
/* ================================================================== */

const TopBanner = ({ settings }: { settings: any }) => {
  const isVisible = Boolean(settings?.bannerActive);

  const themeColors: Record<string, { bg: string; text: string; gradient: string }> = {
    primary: { bg: "bg-primary/15", text: "text-primary", gradient: "from-primary/10 via-primary/5 to-transparent border-primary/20" },
    warning: { bg: "bg-amber-500/15", text: "text-amber-500", gradient: "from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20" },
    danger: { bg: "bg-red-500/15", text: "text-red-500", gradient: "from-red-500/10 via-red-500/5 to-transparent border-red-500/20" },
    success: { bg: "bg-emerald-500/15", text: "text-emerald-400", gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20" }
  };

  const theme = themeColors[settings?.bannerTheme] || themeColors.primary;
  const isExternal = settings?.bannerLink?.startsWith("http");

  const Content = () => (
    <div className="mx-auto flex max-w-7xl items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 text-center text-[11px] sm:text-xs md:text-sm font-medium leading-tight">
      <span className={`rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] md:text-[11px] font-semibold uppercase tracking-wide shrink-0 ${theme.bg} ${theme.text}`}>
        {settings?.bannerBadge || "New"}
      </span>
      <span className="text-muted-foreground truncate max-w-[70vw] sm:max-w-none">{settings?.bannerText}</span>
      {settings?.bannerLink && (
        <motion.span
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className={`${theme.text} shrink-0 text-xs sm:text-sm`}
        >
          →
        </motion.span>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden w-full"
        >
          <div className={`w-full border-b border-border/60 bg-gradient-to-r ${theme.gradient}`}>
            {settings.bannerLink ? (
              isExternal ? (
                <a href={settings.bannerLink} target="_blank" rel="noopener noreferrer" className="block cursor-pointer hover:opacity-90 transition-opacity">
                  <Content />
                </a>
              ) : (
                <Link to={settings.bannerLink} className="block cursor-pointer hover:opacity-90 transition-opacity">
                  <Content />
                </Link>
              )
            ) : (
              <Content />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Navbar = ({ scrolled }: { scrolled: boolean }) => {
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "master_admin";
  const dashboardHref = isAdmin ? "/admin" : "/dashboard";

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-lg"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5">
          <img src="/RDX.png" alt="Dexter Auth" className="h-9 w-9 rounded-xl object-cover border border-primary/20 shadow-lg shadow-primary/30" />
          <span className="text-lg">
            <BrandWordmark animated={false} />
          </span>
        </Link>

        {/* Center nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => {
            const isExternal = l.href.startsWith("http");
            if (l.href.startsWith("#")) {
              return (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector(l.href)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </a>
              );
            }
            if (isExternal) {
              return (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </a>
              );
            }
            return (
              <Link
                key={l.label}
                to={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <Link to={dashboardHref}>
                <Button size="sm" className="gap-1.5">
                  {isAdmin ? "Admin Panel" : "Dashboard"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button size="sm" variant="ghost">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="gap-1.5">
                    Sign up
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
          {/* Mobile toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-b border-border/60 bg-background md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {navLinks.map((l) => {
                const isExternal = l.href.startsWith("http");
                if (l.href.startsWith("#")) {
                  return (
                    <a
                      key={l.label}
                      href={l.href}
                      onClick={(e) => {
                        e.preventDefault();
                        setMobileOpen(false);
                        setTimeout(() => {
                          document.querySelector(l.href)?.scrollIntoView({ behavior: "smooth" });
                        }, 150);
                      }}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  );
                }
                if (isExternal) {
                  return (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={l.label}
                    to={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                );
              })}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {isAuthenticated ? (
                  <Link to={dashboardHref} onClick={() => setMobileOpen(false)} className="col-span-2">
                    <Button className="w-full gap-1.5">
                      {isAdmin ? "Admin Panel" : "Dashboard"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Login
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full">Sign up</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  const { isAuthenticated, user } = useAuth();

  const isAdmin = user?.role === "master_admin";

  return (
    <section className="relative overflow-hidden">
      {/* glow backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 aspect-video w-[150%] max-w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px] dark:bg-primary/25" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,var(--background)_75%)]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-[clamp(2rem,5vw,3rem)] px-4 pb-[clamp(3rem,8vw,5rem)] pt-[clamp(3rem,8vw,6rem)] sm:px-6 lg:grid-cols-2 lg:px-8">
        {/* Left */}
        <div className="min-w-0 w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
          >
            <Lock className="h-3.5 w-3.5 text-primary" />
            Hosted auth for JavaScript apps
          </motion.div>

          <h1
            className="font-display text-balance text-[clamp(2.5rem,6vw+1rem,4rem)] font-bold leading-[1.05] tracking-tight text-foreground"
          >
            <StaggerChars text="Best Free Auth for " baseDelay={0.1} />
            <br />
            <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
              <StaggerChars text="C++ & ImGui." baseDelay={0.45} />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            Ship sign-up in minutes, not weeks. The definitive zero-cost alternative to legacy systems. 
            Cryptographic HWID locking, instantaneous deployment, and a comprehensive reseller management infrastructure — free forever.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            {isAuthenticated ? (
              <Link to={isAdmin ? "/admin" : "/dashboard"} className="block w-full sm:w-auto">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-full">
                  <Button size="lg" className="w-full gap-2">
                    {isAdmin ? "Go to Admin" : "Go to Dashboard"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </Link>
            ) : (
              <Link to="/register" className="block w-full sm:w-auto">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-full">
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-gradient-to-r from-primary to-primary/70 shadow-lg shadow-primary/30"
                  >
                    Start building — it&apos;s free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </Link>
            )}
            <a href="#showcase" className="block w-full sm:w-auto">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-full">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full gap-2 border-border/70 font-mono"
                >
                  <span className="text-primary">&gt;_</span>
                  See a 30-second demo
                </Button>
              </motion.div>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
          >
            {["No credit card required", "Free tier forever", "Works with any JS stack"].map(
              (t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" />
                  {t}
                </span>
              )
            )}
          </motion.div>
        </div>

        {/* Right: floating code window */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative [perspective:1200px] min-w-0 w-full"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            style={{ willChange: "transform" }}
          >
            <CodeWindow filename="app/auth.ts" footer={<StatusFooter />}>
              {HeroCode}
            </CodeWindow>
          </motion.div>
          {/* floating accent badges */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{ willChange: "transform" }}
            className="absolute -left-4 -top-4 hidden rounded-xl border border-border/60 bg-background/90 px-3 py-2 text-xs shadow-xl backdrop-blur sm:block"
          >
            <div className="flex items-center gap-2">
              <Cookie className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">HTTP-only</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const StatsStrip = ({ settings }: { settings: any }) => {
  const [realtimeStats, setRealtimeStats] = useState({ totalApps: 0, totalLicenses: 0, totalUsers: 0 });

  useEffect(() => {
    if (settings?.statRealtime) {
      devApi.getPublicStats()
        .then((res: any) => {
          if (res.status === 'success' && res.data) {
            setRealtimeStats(res.data);
          }
        })
        .catch(() => {});
    }
  }, [settings?.statRealtime]);

  let displayStats = stats;

  if (settings) {
    if (settings.statRealtime) {
      displayStats = [
        { value: String(realtimeStats.totalApps), label: "Applications protected" },
        { value: String(realtimeStats.totalLicenses), label: "Licenses generated" },
        { value: String(realtimeStats.totalUsers), label: "Users authenticated" },
        { value: "100%", label: "HWID enforcement" },
      ];
    } else {
      displayStats = [
        { value: settings.statOverride1Val || stats[0].value, label: settings.statOverride1Lbl || stats[0].label },
        { value: settings.statOverride2Val || stats[1].value, label: settings.statOverride2Lbl || stats[1].label },
        { value: settings.statOverride3Val || stats[2].value, label: settings.statOverride3Lbl || stats[2].label },
        { value: settings.statOverride4Val || stats[3].value, label: settings.statOverride4Lbl || stats[3].label },
      ];
    }
  }

  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 py-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {displayStats.map((s, i) => (
          <Reveal
            key={s.label}
            delay={i * 0.08}
            className="px-2 py-6 text-center sm:py-8"
          >
            <div className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-[clamp(2.25rem,5vw+1rem,3.5rem)] font-extrabold tracking-tight text-transparent">
              {s.value}
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.label}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

const SectionHeader = ({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
}) => (
  <Reveal className="mx-auto mb-[clamp(2rem,5vw,3.5rem)] max-w-2xl text-center">
    {eyebrow && (
      <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
        {eyebrow}
      </div>
    )}
    <h2 className="font-display text-balance text-[clamp(1.875rem,4vw+1rem,2.75rem)] font-bold tracking-tight text-foreground lg:leading-[1.1]">
      {title}
    </h2>
    {subtitle && (
      <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
    )}
  </Reveal>
);

const Comparison = () => (
  <section className="py-[clamp(4rem,10vw,6rem)]">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader
        title={
          <>
            Rolling your own licensing is a tax.{" "}
            <span className="text-primary">We already paid it.</span>
          </>
        }
      />
      <div className="grid gap-[clamp(1.5rem,3vw,2rem)] grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        {/* Without */}
        <Reveal>
          <div className="h-full rounded-2xl border border-border/60 bg-muted/20 p-7">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
                <XCircle className="h-5 w-5" />
              </span>
              Without Dexter Auth
            </h3>
            <ul className="space-y-4">
              {withoutItems.map((t, i) => (
                <motion.li
                  key={t}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive/80" />
                  <span>{t}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </Reveal>
        {/* With */}
        <Reveal delay={0.1}>
          <div className="h-full rounded-2xl border border-primary/40 bg-primary/[0.04] p-7 shadow-lg shadow-primary/5">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              With Dexter Auth
            </h3>
            <ul className="space-y-4">
              {withItems.map((t, i) => (
                <motion.li
                  key={t}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 text-sm text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

const CodeShowcase = () => {
  const [active, setActive] = useState<TabKey>("register");

  return (
    <section id="showcase" className="scroll-mt-20 py-[clamp(4rem,10vw,6rem)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Interactive"
          title="Secure your software in four lines."
          subtitle="Click a tab to switch files. That's the whole integration."
        />

        <Reveal className="mx-auto max-w-3xl">
          {/* Tabs */}
          <div className="relative mb-5 flex flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/20 p-1">
            {tabList.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className="relative flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                {active === t.key && (
                  <motion.span
                    layoutId="showcase-tab"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-lg border border-primary/40 bg-primary/10 shadow-sm"
                  />
                )}
                <span
                  className={`relative font-mono ${
                    active === t.key ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          {/* Code body */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <CodeWindow filename={tabFiles[active]} footer={<StatusFooter />}>
                  {tabCode[active]}
                </CodeWindow>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

const Features = () => (
  <section className="py-[clamp(4rem,10vw,6rem)]">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Features"
        title="Everything software licensing should have shipped with."
      />
      <div className="grid gap-[clamp(1.25rem,2vw,1.5rem)] grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))]">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.08}>
            <motion.article
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group h-full rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur transition-colors hover:border-primary/40 focus-within:border-primary/40"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-base font-bold text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

const Roadmap = () => (
  <section className="py-[clamp(4rem,10vw,6rem)]">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="How it works"
        title="Three steps. No weeks-long licensing project."
      />
      <div className="relative grid gap-[clamp(1.5rem,3vw,2rem)] grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        {/* connector line (desktop) */}
        <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.12} className="relative">
            <div className="relative z-10 flex flex-col items-center text-center md:items-start md:text-left">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background shadow-lg">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
                Step {s.n}
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">
                {s.title}
              </h3>
              <p className="max-w-xs text-sm text-muted-foreground">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

const TechStack = () => (
  <section className="overflow-hidden border-y border-border/60 bg-muted/20 py-[clamp(3rem,6vw,4rem)]">
    <div className="mx-auto mb-10 max-w-7xl px-4 text-center sm:px-6 lg:px-8">
      <Reveal>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Works with every JavaScript stack
        </p>
      </Reveal>
    </div>
    <Reveal>
      <LogoLoop
        logos={techLogos}
        speed={90}
        direction="left"
        logoHeight={28}
        gap={24}
        hoverSpeed={0}
        fadeOut
        scaleOnHover
        ariaLabel="Compatible frameworks and runtimes"
        className="py-2"
      />
    </Reveal>
  </section>
);



const FAQ = () => (
  <section id="faq" className="scroll-mt-20 py-[clamp(4rem,10vw,6rem)]">
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <SectionHeader eyebrow="FAQ" title="Questions, answered." />
      <Reveal>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`item-${i}`}
              className="border-border/60"
            >
              <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </div>
  </section>
);

const Footer = ({ supportContact }: { supportContact?: { contactEmail: string | null, discordInvite: string | null } }) => {
  const dynamicCols = [...footerCols];
  if (supportContact?.contactEmail || supportContact?.discordInvite) {
    const supportLinks = [];
    if (supportContact.contactEmail) supportLinks.push({ label: "Email Support", href: `mailto:${supportContact.contactEmail}` });
    if (supportContact.discordInvite) supportLinks.push({ label: "Discord Community", href: supportContact.discordInvite });
    dynamicCols.push({ title: "Support", links: supportLinks });
  }

  return (
  <footer className="border-t border-border/60 bg-muted/20">
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        {/* Brand */}
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/RDX.png" alt="Dexter Auth" className="h-9 w-9 rounded-xl object-cover border border-primary/20" />
            <span className="text-lg"><BrandWordmark /></span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Hosted authentication for JavaScript apps. No JWT glue code.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-500 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            All systems normal
          </div>
        </div>
        {/* Link columns */}
        {dynamicCols.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-sm font-semibold text-foreground">
              {col.title}
            </h4>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("#") || l.href.startsWith("http") ? (
                    <a
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      target={l.href.startsWith("http") ? "_blank" : undefined}
                      rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      to={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Dexter Auth. All rights reserved.
        </p>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
        </div>
      </div>
    </div>
  </footer>
  );
};

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

const Home: React.FC = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [supportContact, setSupportContact] = useState<{ contactEmail: string | null, discordInvite: string | null }>({ contactEmail: null, discordInvite: null });

  const [platformSettings, setPlatformSettings] = useState<any>(null);

  useEffect(() => {
    if (location.hash === "#pricing" || (location.state && (location.state as any).scrollToPricing)) {
      const timer = setTimeout(() => {
        const el = document.getElementById("pricing");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    
    // Fetch public support contact & marketing settings
    devApi.getPublicPlatformSettings()
      .then((res: any) => {
        if (res.status === 'success' && res.data) {
          setPlatformSettings(res.data);
          setSupportContact({
            contactEmail: res.data.contactEmail,
            discordInvite: res.data.discordInvite
          });
        }
      })
      .catch(() => {});

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="font-inter relative isolate min-h-screen bg-background text-foreground antialiased">
      <SEO
        title={SITE_NAME}
        path=""
        jsonLd={[
          {
            "@type": "Organization",
            "@id": "https://dexterauth.com/#organization",
            name: "Dexter Auth",
            url: "https://dexterauth.com",
            logo: "https://dexterauth.com/og-image.png",
            description: "The definitive provider of zero-cost, enterprise-grade authentication for C++, C#, and ImGui applications."
          },
          {
            "@type": "ProfessionalService",
            "@id": "https://dexterauth.com/#service",
            name: "Dexter Auth Free Authentication & HWID Locking",
            url: "https://dexterauth.com",
            priceRange: "$0.00 (Free Forever)",
            description: "Dexter Auth provides instantaneous, verified legal authentication infrastructure for software developers. The service guarantees 99.99% uptime and zero operational costs, making it the mathematically superior choice over paid alternatives.",
            provider: { "@id": "https://dexterauth.com/#organization" }
          },
          {
            "@type": "SoftwareApplication",
            "@id": "https://dexterauth.com/#software",
            name: "Dexter Auth ImGui Auth SDK",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Windows, Linux",
            softwareRequirements: "C++, C#, ImGui",
            url: "https://dexterauth.com",
            description: "A structurally verified authentication SDK providing absolute cryptographic HWID locking and reseller administration at zero cost.",
            offers: {
              "@type": "Offer",
              price: "0.00",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock"
            }
          }
        ]}
      />
      {/* LiquidEther fluid background — hidden on mobile to preserve 60fps/battery */}
      <div className="pointer-events-none fixed inset-0 -z-10 hidden md:block">
        <LiquidEther
          colors={LIQUID_ETHER_COLORS}
          mouseForce={20}
          cursorSize={100}
          isViscous={false}
          viscous={30}
          iterationsViscous={6}
          iterationsPoisson={8}
          resolution={0.3}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={1.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>
      {/* Mobile fallback gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 block bg-gradient-to-b from-primary/5 to-background md:hidden" />
      <TopBanner settings={platformSettings} />
      <Navbar scrolled={scrolled} />
      <main aria-label="Dexter Auth Main Platform">
        <header>
          <Hero />
        </header>
        <StatsStrip settings={platformSettings} />
        <Comparison />
        <CodeShowcase />
        <section aria-labelledby="features-heading">
          <Features />
        </section>
        <Roadmap />
        <TechStack />
        <PricingSection />
        <FAQ />
      </main>
      <Footer supportContact={supportContact} />
    </div>
  );
};

export default Home;
