import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import FuzzyText from "../components/ui/fuzzy-text";
import { SEO } from "../components/SEO";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#09090b] text-foreground flex flex-col items-center justify-center relative overflow-hidden px-4">
            <SEO title="Page Not Found" indexable={false} />
            {/* Visual background details */}
            <div className="absolute inset-0 z-0 opacity-30">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[128px] animate-pulse" />
                {/* Clean tech grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            <div className="z-10 flex flex-col items-center text-center max-w-lg">
                {/* Custom FuzzyText Component for the 404 number */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="mb-2 cursor-pointer selection:bg-transparent"
                >
                    <FuzzyText 
                        baseIntensity={0.2} 
                        hoverIntensity={0.6} 
                        enableHover={true}
                        color="#ef4444" // Sleek red color matching the theme
                        fontSize="clamp(4rem, 15vw, 12rem)"
                        fontWeight={900}
                    >
                        404
                    </FuzzyText>
                </motion.div>

                {/* Warning message */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-center gap-2 text-primary font-semibold tracking-wider uppercase text-sm">
                        <FileQuestion className="w-4 h-4 animate-bounce" />
                        <span>Lost in the Void</span>
                    </div>
                    
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        Page Not Found
                    </h1>
                    
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                        The requested URL could not be found, or you do not have permission to access it.
                    </p>
                </motion.div>

                {/* Back Home Button */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
                >
                    <Link to="/">
                        <Button className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 transition-all">
                            <Home className="w-4 h-4" />
                            Go Back Home
                        </Button>
                    </Link>
                    <Button 
                        variant="outline" 
                        onClick={() => window.history.back()}
                        className="w-full sm:w-auto gap-2 border-border hover:bg-muted/40 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Previous Page
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
