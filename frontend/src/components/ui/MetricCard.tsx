import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
  subtitle?: string;
}

export default function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  color = "#FF6B6B",
  subtitle,
}: MetricCardProps) {
  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 p-5 transition-colors group">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] sm:text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-black text-white">
        {value}
        {suffix && (
          <span className="text-sm text-zinc-500 font-normal ml-0.5">{suffix}</span>
        )}
      </p>
      {subtitle && (
        <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
