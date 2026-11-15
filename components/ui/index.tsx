import Link from "next/link";
import type { ReactNode } from "react";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-sm", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-800">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone = "teal" }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; tone?: "teal" | "amber" | "indigo" | "rose" | "emerald" | "slate" }) {
  const tones: Record<string, string> = {
    teal: "from-teal-500 to-emerald-600",
    amber: "from-amber-400 to-orange-500",
    indigo: "from-indigo-500 to-violet-600",
    rose: "from-rose-500 to-pink-600",
    emerald: "from-emerald-500 to-green-600",
    slate: "from-slate-600 to-slate-800",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className={cn("absolute -left-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-10", tones[tone])} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {icon && <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-xl text-white shadow", tones[tone])}>{icon}</div>}
      </div>
    </div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", className ?? "bg-slate-100 text-slate-700")}>{children}</span>;
}

type BtnProps = { children: ReactNode; href?: string; variant?: "primary" | "secondary" | "danger" | "ghost" | "outline"; size?: "sm" | "md" | "lg"; className?: string; type?: "button" | "submit"; disabled?: boolean; onClick?: () => void; formAction?: (fd: FormData) => void | Promise<void> };
export function Button({ children, href, variant = "primary", size = "md", className, type = "button", disabled, onClick, formAction }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-700 shadow-sm",
    secondary: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost: "text-slate-700 hover:bg-slate-100",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const cls = cn(base, variants[variant], sizes[size], className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick} formAction={formAction}>
      {children}
    </button>
  );
}

export function Input({ label, name, type = "text", defaultValue, placeholder, required, step, hint, className, min, max }: { label?: string; name: string; type?: string; defaultValue?: string | number | null; placeholder?: string; required?: boolean; step?: string; hint?: string; className?: string; min?: number; max?: number }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</span>}
      <input name={name} type={type} defaultValue={defaultValue ?? undefined} placeholder={placeholder} required={required} step={step} min={min} max={max} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
export function Textarea({ label, name, defaultValue, placeholder, rows = 3, hint, className }: { label?: string; name: string; defaultValue?: string | null; placeholder?: string; rows?: number; hint?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <textarea name={name} rows={rows} defaultValue={defaultValue ?? undefined} placeholder={placeholder} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
export function Select({ label, name, defaultValue, options, className, required }: { label?: string; name: string; defaultValue?: string | number | null; options: { value: string | number; label: string }[]; className?: string; required?: boolean }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <select name={name} defaultValue={defaultValue ?? undefined} required={required} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
export function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
      {label}
    </label>
  );
}

export function Table({ headers, children, empty }: { headers: string[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-start">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}
export function EmptyState({ title, description, action, icon = "📦" }: { title: string; description?: string; action?: ReactNode; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 text-5xl">{icon}</div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}
export function Alert({ state }: { state?: { error?: string; success?: string } }) {
  if (!state?.error && !state?.success) return null;
  return (
    <div className={cn("rounded-xl px-4 py-3 text-sm font-medium", state.error ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200")}>
      {state.error ?? state.success}
    </div>
  );
}

/** Simple SVG bar chart, no external deps */
export function BarChart({ data, height = 180, color = "#0d9488", formatter }: { data: { label: string; value: number }[]; height?: number; color?: string; formatter?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <div className="py-10 text-center text-sm text-slate-400">لا توجد بيانات</div>;
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-1.5" style={{ height, minWidth: data.length * 28 }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
            <div className="w-full rounded-t-md transition-all group-hover:opacity-80" style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: color }} />
            <div className="pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white group-hover:block">{formatter ? formatter(d.value) : d.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5" style={{ minWidth: data.length * 28 }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 truncate text-center text-[10px] text-slate-400">{d.label}</div>
        ))}
      </div>
    </div>
  );
}
export function LineChart({ data, height = 180, color = "#f59e0b" }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  if (data.length < 2) return <div className="py-10 text-center text-sm text-slate-400">لا توجد بيانات كافية</div>;
  const w = 600;
  const max = Math.max(1, ...data.map((d) => d.value));
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${height - (d.value / max) * (height - 10) - 5}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="3" points={pts} strokeLinejoin="round" strokeLinecap="round" />
      <polygon fill={color} fillOpacity="0.1" points={`0,${height} ${pts} ${w},${height}`} />
    </svg>
  );
}
