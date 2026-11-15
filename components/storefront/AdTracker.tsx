"use client";
import { useEffect } from "react";

function visitorId() {
  let v = localStorage.getItem("ms_vid");
  if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("ms_vid", v); }
  return v;
}
export function AdTracker({ campaignId }: { campaignId: number }) {
  useEffect(() => {
    const vid = visitorId();
    fetch("/api/track", { method: "POST", body: JSON.stringify({ campaignId, type: "view", visitorId: vid }), headers: { "Content-Type": "application/json" } }).catch(() => {});
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest(`[data-campaign="${campaignId}"]`);
      if (a) { sessionStorage.setItem("ms_campaign", String(campaignId)); fetch("/api/track", { method: "POST", body: JSON.stringify({ campaignId, type: "click", visitorId: vid }), headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {}); }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [campaignId]);
  return null;
}
