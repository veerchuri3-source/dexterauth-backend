import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      expand={true}
      richColors
      closeButton
      duration={4000}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#0F172A] group-[.toaster]:text-white group-[.toaster]:border-[#1E293B] group-[.toaster]:shadow-[0_8px_30px_rgba(0,0,0,0.5)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-[#94A3B8]",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-white group-[.toast]:font-medium group-[.toast]:rounded-lg",
          cancelButton: "group-[.toast]:bg-[#1E293B] group-[.toast]:text-[#94A3B8] group-[.toast]:rounded-lg",
          closeButton: "group-[.toast]:bg-[#1E293B] group-[.toast]:text-[#94A3B8] group-[.toast]:border-[#334155] group-[.toast]:hover:bg-[#334155] group-[.toast]:hover:text-white",
          success: "group-[.toaster]:border-emerald-500/30 group-[.toaster]:text-emerald-400",
          error: "group-[.toaster]:border-red-500/30 group-[.toaster]:text-red-400",
          warning: "group-[.toaster]:border-amber-500/30 group-[.toaster]:text-amber-400",
          info: "group-[.toaster]:border-primary/30 group-[.toaster]:text-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
