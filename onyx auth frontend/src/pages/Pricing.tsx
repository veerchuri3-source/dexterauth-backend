import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { SEO } from '@/components/SEO';
import LiquidEther from '@/components/LiquidEther';
import PricingSection from '../components/PricingSection';

const LIQUID_ETHER_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];

const PricingPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-background text-foreground relative isolate"
    >
      <SEO
        title="Pricing | Dexter Auth"
        description="Choose the right plan to scale your software security. Dexter Auth offers a generous Free tier forever with flat-rate developer and seller plans."
        path="/pricing"
        jsonLd={{
          "@type": "Product",
          "@id": "https://dexterauth.com/pricing",
          "name": "Dexter Auth Subscription Plans",
          "description": "Hosted authentication plans for C++, C#, and desktop applications. Free tier forever, Developer plan, and Seller plan with reseller support.",
          "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "USD",
            "lowPrice": "0.00",
            "highPrice": "60.00",
            "offerCount": "3",
            "priceRange": "$0.00 - $60.00"
          }
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
          <Tag className="w-5 h-5" />
          <span className="font-bold text-lg">Pricing</span>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-[clamp(5rem,10vw,6rem)] pb-12">
        <PricingSection />
      </main>
    </motion.div>
  );
};

export default PricingPage;
