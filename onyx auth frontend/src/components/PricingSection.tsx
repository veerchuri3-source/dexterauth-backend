import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Zap, Check, ArrowRight } from "lucide-react";
import { devApi } from "../lib/api";

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

const pricing = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Everything you need to test the waters.",
    cta: "Start free",
    featured: false,
    features: [
      "3 Applications",
      "70 Users per App",
      "Hardware ID Locking",
      "Email + password login",
      "Community support",
    ],
  },
  {
    name: "Developer",
    price: "$15",
    originalPrice: "$49",
    period: "per year",
    desc: "For growing software that needs more headroom.",
    cta: "Start free",
    featured: true,
    features: [
      "7 Applications",
      "500 Users per App",
      "Advanced VPN Blocking",
      "Audit logs & webhooks",
      "99.9% uptime",
      "Priority email support",
    ],
  },
  {
    name: "Seller",
    price: "$60",
    originalPrice: "$199",
    period: "per year",
    desc: "Scale with unlimited users and team features.",
    cta: "Start free",
    featured: false,
    features: [
      "Unlimited Applications",
      "Unlimited Users & Licenses",
      "Team Management & Chat",
      "Dedicated support",
      "99.9% uptime",
      "Audit logs & webhooks",
    ],
  },
];

export default function PricingSection() {
  const { isAuthenticated, user } = useAuth();
  const [plans, setPlans] = useState<any[]>(pricing);
  const [billingModes, setBillingModes] = useState({ monthly: true, yearly: true, discountBadge: "Save up to 70%" });
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  useEffect(() => {
    devApi.getPublicPlatformSettings()
      .then((res: any) => {
        if (res.status === 'success' && res.data?.pricingCustomization) {
          const p = res.data.pricingCustomization;
          if (p.plans && Array.isArray(p.plans)) {
            setPlans(p.plans);
            setBillingModes(p.billingModes || { monthly: true, yearly: true, discountBadge: "Save up to 70%" });
            // Default to monthly if only monthly is enabled
            if (p.billingModes && !p.billingModes.yearly && p.billingModes.monthly) {
              setBillingPeriod('monthly');
            }
          } else if (Array.isArray(p) && p.length > 0) {
            setPlans(p);
            setBillingModes({ monthly: false, yearly: true, discountBadge: "" });
            setBillingPeriod('yearly');
          }
        }
      })
      .catch(() => {});
  }, []);

  const getPlanCta = (planName: string) => {
    if (!isAuthenticated) {
      return {
        text: planName === "Free" ? "Start free" : "Buy Now",
        link: "/register",
        disabled: false
      };
    }
    
    const currentPlan = user?.plan || "Free";
    
    if (currentPlan === planName) {
      return {
        text: "Current Plan",
        link: "#",
        disabled: true
      };
    }
    
    if (planName === "Free") {
      return {
        text: "Default Tier",
        link: "#",
        disabled: true
      };
    }
    
    if (currentPlan === "Developer") {
      if (planName === "Seller") {
        return {
          text: "Upgrade",
          link: "/checkout/seller",
          disabled: false
        };
      }
    }
    
    if (currentPlan === "Seller") {
      if (planName === "Developer") {
        return {
          text: "Downgrade",
          link: "#",
          disabled: true
        };
      }
    }
    
    return {
      text: "Upgrade",
      link: `/checkout/${planName.toLowerCase()}`,
      disabled: false
    };
  };

  return (
    <section id="pricing" className="scroll-mt-20 py-[clamp(4rem,10vw,6rem)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="Start free. Scale when you need to."
          subtitle="No credit card required. Upgrade anytime."
        />

        {/* Sliding Billing Switch Toggle */}
        {billingModes.monthly && billingModes.yearly && (
          <div className="flex justify-center items-center mb-16">
            <div className="relative flex rounded-full bg-muted/40 p-1 border border-border/65 backdrop-blur-sm select-none">
              <button
                type="button"
                onClick={() => setBillingPeriod('monthly')}
                className={`relative rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none ${
                  billingPeriod === 'monthly' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {billingPeriod === 'monthly' && (
                  <motion.div
                    layoutId="active-billing-period"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-primary/10 border border-primary/20 shadow-sm"
                  />
                )}
                <span className="relative z-10">Monthly</span>
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('yearly')}
                className={`relative rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none flex items-center gap-2 ${
                  billingPeriod === 'yearly' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {billingPeriod === 'yearly' && (
                  <motion.div
                    layoutId="active-billing-period"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-primary/10 border border-primary/20 shadow-sm"
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <span>Yearly</span>
                  {billingModes.discountBadge && (
                    <span className="inline-flex items-center rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/30">
                      {billingModes.discountBadge}
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="grid items-stretch gap-[clamp(1.5rem,3vw,2rem)] grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          {plans.map((p, i) => {
            const ctaInfo = getPlanCta(p.name);
            const isFree = p.name === "Free";

            // Map pricing and billing text depending on switcher state
            const priceDisplay = isFree
              ? (p.monthlyPrice || p.price || "$0")
              : (billingPeriod === 'monthly' ? (p.monthlyPrice || "$2") : (p.yearlyPrice || p.price || "$15"));
            
            const originalPriceDisplay = isFree
              ? null
              : (billingPeriod === 'monthly' ? (p.monthlyOriginalPrice || null) : (p.yearlyOriginalPrice || p.originalPrice || null));

            const periodDisplay = isFree
              ? (p.monthlyPeriod || p.period || "forever")
              : (billingPeriod === 'monthly' ? (p.monthlyPeriod || "per month") : (p.yearlyPeriod || p.period || "per year"));

            // Append chosen billing period query param to redirect URLs
            const targetLink = !isFree && ctaInfo.link !== "#"
              ? `${ctaInfo.link}?period=${billingPeriod}`
              : ctaInfo.link;

            return (
              <Reveal key={p.name} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`flex h-full flex-col rounded-2xl border p-7 backdrop-blur transition-colors ${
                    p.featured
                      ? "border-primary/50 bg-primary/[0.05] shadow-xl shadow-primary/10"
                      : "border-border/60 bg-card/40 hover:border-primary/30"
                  }`}
                >
                  {p.featured && (
                    <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      <Zap className="h-3 w-3" /> Most popular
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground animate-none">
                      {priceDisplay}
                    </span>
                    {originalPriceDisplay && (
                      <span className="text-xl font-medium tracking-tight text-muted-foreground line-through ml-1 decoration-primary/50 decoration-2">
                        {originalPriceDisplay}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground ml-1">/ {periodDisplay}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>

                  <ul className="mt-6 flex-1 space-y-3">
                    {(p.features || []).map((f: string) => (
                      <li
                        key={f}
                        className="flex items-center gap-2.5 text-sm text-foreground"
                      >
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {ctaInfo.disabled ? (
                    <Button
                      className="mt-7 w-full gap-1.5 opacity-60 cursor-default"
                      variant="outline"
                      disabled
                    >
                      {ctaInfo.text}
                    </Button>
                  ) : (
                    <Link to={targetLink} state={ctaInfo.link === "/register" && !isFree ? { from: `/checkout/${p.name.toLowerCase()}` } : undefined} className="mt-7 w-full">
                      <Button
                        className={`w-full gap-1.5 ${
                          p.featured
                            ? "bg-gradient-to-r from-primary to-primary/70 shadow-lg shadow-primary/30"
                            : ""
                        }`}
                        variant={p.featured ? "default" : "outline"}
                      >
                        {ctaInfo.text}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
