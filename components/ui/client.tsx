"use client";

import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { Alert, Button, cn } from "./index";
import type { ActionState } from "@/actions/auth";

export function ActionForm({ action, children, className, submitLabel = "حفظ", resetOnSuccess }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; children: ReactNode; className?: string; submitLabel?: string; resetOnSuccess?: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [k, setK] = useState(0);
  useEffect(() => { if (resetOnSuccess && state?.success) setK((x) => x + 1); }, [state, resetOnSuccess]);
  return (
    <form action={formAction} className={cn("space-y-4", className)} key={k}>
      <Alert state={state} />
      {children}
      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ..." : submitLabel}
      </Button>
    </form>
  );
}

export function ConfirmButton({ onConfirm, children, message = "هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.", variant = "danger", size = "sm", className }: { onConfirm: () => Promise<unknown> | void; children: ReactNode; message?: string; variant?: "danger" | "outline" | "ghost" | "primary" | "secondary"; size?: "sm" | "md"; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm(message)) start(async () => { await onConfirm(); });
      }}
    >
      {pending ? "..." : children}
    </Button>
  );
}

export function ActionButton({ onClick, children, variant = "outline", size = "sm", className }: { onClick: () => Promise<unknown> | void; children: ReactNode; variant?: "danger" | "outline" | "ghost" | "primary" | "secondary"; size?: "sm" | "md"; className?: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <Button variant={variant} size={size} className={className} disabled={pending} onClick={() => start(async () => { const r = (await onClick()) as { error?: string; success?: string } | undefined; if (r?.error || r?.success) { setMsg(r.error ?? r.success ?? null); setTimeout(() => setMsg(null), 3000); } })}>
        {pending ? "..." : children}
      </Button>
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </span>
  );
}

export function ImageUploader({ name, label, defaultValue, multiple, hint }: { name: string; label: string; defaultValue?: string | string[] | null; multiple?: boolean; hint?: string }) {
  const init = Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [];
  const [urls, setUrls] = useState<string[]>(init);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    const next = multiple ? [...urls] : [];
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (j.url) next.push(j.url);
      else setErr(j.error ?? "فشل الرفع");
    }
    setUrls(next);
    setBusy(false);
  }
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input type="hidden" name={name} value={urls.join("\n")} />
      <div className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => setUrls(urls.filter((_, j) => j !== i))} className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs text-white group-hover:flex">حذف</button>
          </div>
        ))}
        <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-teal-500 hover:text-teal-600">
          <span className="text-xl">{busy ? "⏳" : "+"}</span>
          <span>{busy ? "رفع..." : "رفع"}</span>
          <input type="file" accept="image/*,application/pdf,video/mp4" multiple={multiple} className="hidden" onChange={(e) => upload(e.target.files)} />
        </label>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <input type="url" placeholder="أو الصق رابط صورة ثم Enter" className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { setUrls(multiple ? [...urls, v] : [v]); (e.target as HTMLInputElement).value = ""; } } }} />
      </div>
      {(hint || err) && <span className={cn("mt-1 block text-xs", err ? "text-rose-600" : "text-slate-400")}>{err ?? hint}</span>}
    </div>
  );
}

export function SearchBox({ placeholder = "بحث...", param = "q", extra }: { placeholder?: string; param?: string; extra?: ReactNode }) {
  return (
    <form className="flex flex-wrap items-center gap-2" method="get">
      <input name={param} placeholder={placeholder} defaultValue={typeof window !== "undefined" ? new URLSearchParams(window.location.search).get(param) ?? "" : ""} className="w-full max-w-xs rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-teal-500" />
      {extra}
      <Button type="submit" variant="outline" size="md">بحث</Button>
    </form>
  );
}

export function Tabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t, idx) => (
          <button key={idx} type="button" onClick={() => setI(idx)} className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition", i === idx ? "bg-white text-teal-700 shadow" : "text-slate-500 hover:text-slate-800")}>{t.label}</button>
        ))}
      </div>
      {tabs[i].content}
    </div>
  );
}

export function Modal({ trigger, title, children }: { trigger: ReactNode; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{title}</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
