import type { Metadata } from "next";
import { connection } from "next/server";
import { StudioClient } from "@/components/StudioClient";

export const metadata: Metadata = {
  title: "Studio kamera",
  description:
    "Terjemahkan ejaan jari SIBI menjadi teks secara real-time langsung di browser. Tanpa upload video.",
};

export default async function StudioPage() {
  await connection();
  return <StudioClient aiEnabled={Boolean(process.env.OPENAI_API_KEY)} />;
}
