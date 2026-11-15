import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Kamu adalah editor teks Bahasa Indonesia yang teliti.
Input pengguna adalah hasil ejaan jari (fingerspelling) dari bahasa isyarat SIBI, sehingga sering berupa huruf terpisah tanpa spasi yang benar.
Tugasmu:
1. Susun ulang menjadi 1-3 kalimat Bahasa Indonesia yang wajar dan mudah dibaca.
2. Jangan menambah fakta baru, jangan menjawab pertanyaan, jangan memberi komentar atau penjelasan.
3. Jika input sudah berupa kata atau kalimat yang jelas, rapikan ejaan dan tanda bacanya saja.
4. Pertahankan makna asli. Kalau ambigu, pilih tafsiran paling sederhana.
Balas HANYA dengan teks hasil akhir, tanpa tanda kutip dan tanpa awalan seperti "Hasil:".`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Fitur rapikan belum aktif. Tambahkan OPENAI_API_KEY di environment (opsional, tidak wajib untuk memakai aplikasi).",
      },
      { status: 501 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON." }, { status: 400 });
  }

  const rawText = (payload as { text?: unknown })?.text;
  const text = typeof rawText === "string" ? rawText.trim().slice(0, 1500) : "";
  if (!text) {
    return NextResponse.json({ error: "Teks kosong." }, { status: 400 });
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 240,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Layanan LLM menolak permintaan (HTTP ${response.status}).` },
        { status: 502 },
      );
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const result = json.choices?.[0]?.message?.content?.trim();
    if (!result) {
      return NextResponse.json({ error: "LLM tidak mengembalikan teks." }, { status: 502 });
    }

    return NextResponse.json({ text: result });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "Permintaan ke LLM melebihi 20 detik." : "Gagal menghubungi layanan LLM." },
      { status: 504 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
