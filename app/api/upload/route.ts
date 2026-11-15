import { getCurrentUser } from "@/lib/auth";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "video/mp4"]);
const MAX = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "غير مصرح" }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return Response.json({ error: "لا يوجد ملف" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return Response.json({ error: "نوع الملف غير مدعوم" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "حجم الملف يتجاوز 8MB" }, { status: 400 });
  const ext = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/api/files/${name}` });
}
