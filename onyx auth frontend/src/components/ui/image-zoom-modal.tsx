import { useState } from "react";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface ImageZoomModalProps {
    src: string;
    onClose: () => void;
}

export function ImageZoomModal({ src, onClose }: ImageZoomModalProps) {
    const [isZoomed, setIsZoomed] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 }); // Percentage

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isZoomed) return;
        const width = window.innerWidth;
        const height = window.innerHeight;
        setMousePos({
            x: (e.clientX / width) * 100,
            y: (e.clientY / height) * 100
        });
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="max-w-[100vw] h-[100vh] p-0 bg-transparent border-none shadow-none flex items-center justify-center overflow-hidden focus:outline-none"
                onClick={(e) => {
                    // Start closing unless zoomed
                    if (!isZoomed) onClose();
                }}
                onPointerDownOutside={(e) => {
                    // Prevent closing of underlying dialogs
                    e.preventDefault();
                }}
            >
                <DialogTitle className="sr-only">Zoomed Image</DialogTitle>

                <div
                    className="fixed inset-0 bg-black/90 pointer-events-none -z-10"
                    aria-hidden="true"
                />

                <div
                    className={cn(
                        "relative transition-transform duration-200 ease-out",
                        isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                    )}
                    style={{
                        width: isZoomed ? '100vw' : 'auto',
                        height: isZoomed ? '100vh' : 'auto',
                        maxWidth: isZoomed ? 'none' : '95vw',
                        maxHeight: isZoomed ? 'none' : '95vh',
                        transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
                        transformOrigin: `${mousePos.x}% ${mousePos.y}%`
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isZoomed) {
                            const width = window.innerWidth;
                            const height = window.innerHeight;
                            setMousePos({
                                x: (e.clientX / width) * 100,
                                y: (e.clientY / height) * 100
                            });
                        }
                        setIsZoomed(!isZoomed);
                    }}
                    onMouseMove={handleMouseMove}
                >
                    <img
                        src={src}
                        alt="Zoomed"
                        className="w-full h-full object-contain select-none pointer-events-none"
                        draggable={false}
                    />
                </div>

                {!isZoomed && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm z-50">
                        Click to zoom • Click background to close
                    </div>
                )}

                <button
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors z-50 pointer-events-auto"
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                >
                    <XCircle className="h-6 w-6" />
                </button>
            </DialogContent>
        </Dialog>
    );
}
