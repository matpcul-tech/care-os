import { NextRequest, NextResponse } from "next/server";
import { decryptGCM } from "@/lib/vault-crypto";
import { authVaultForFile } from "@/lib/vault-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const BUCKET = "care-circle-vault";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authVaultForFile(req, params.id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/vault_files?id=eq.${encodeURIComponent(params.id)}&select=storage_path,iv,filename,mime_type&limit=1`,
    {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      cache: "no-store",
    },
  );
  if (!r.ok) {
    return NextResponse.json({ error: "lookup failed" }, { status: 502 });
  }
  const rows = (await r.json()) as Array<{
    storage_path: string;
    iv: string;
    filename: string;
    mime_type: string;
  }>;
  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const file = rows[0];

  const dl = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${file.storage_path}`,
    {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      cache: "no-store",
    },
  );
  if (!dl.ok) {
    return NextResponse.json({ error: `storage ${dl.status}` }, { status: 502 });
  }
  const enc = Buffer.from(await dl.arrayBuffer());

  let plain: Buffer;
  try {
    plain = decryptGCM(enc, file.iv);
  } catch {
    return NextResponse.json({ error: "decrypt failed" }, { status: 500 });
  }

  const safeName = file.filename.replace(/"/g, "");
  return new NextResponse(new Uint8Array(plain), {
    status: 200,
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
