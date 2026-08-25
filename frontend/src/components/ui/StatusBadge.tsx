type Variant = "success" | "warning" | "error" | "neutral";

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  pulse?: boolean;
  className?: string;
}

const styles: Record<Variant, string> = {
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  neutral: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

const pulseColors: Record<Variant, string> = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  neutral: "bg-zinc-500",
};

export default function StatusBadge({
  children,
  variant = "neutral",
  pulse = false,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full text-xs px-2.5 py-1 border font-medium ${styles[variant]} ${className}`}
    >
      {pulse && (
        <span
          className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${pulseColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
}
