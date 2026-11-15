import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", pdf: "application/pdf", mp4: "video/mp4" };

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-z0-9.-]+$/i.test(name) || name.includes("..")) return new Response("Bad request", { status: 400 });
  try {
    const buf = await readFile(path.join(process.cwd(), "uploads", name));
    const ext = name.split(".").pop() || "";
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
