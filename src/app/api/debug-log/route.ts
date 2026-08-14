import { appendFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const line = body.trim();
    if (!line) return NextResponse.json({ ok: false }, { status: 400 });
    const file = path.join(process.cwd(), "debug-362d99.log");
    await appendFile(file, `${line}\n`, "utf8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
