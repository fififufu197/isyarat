import type { Metadata } from "next";
import { connection } from "next/server";
import { UploadClient } from "@/components/UploadClient";

export const metadata: Metadata = {
  title: "Upload video",
  description: "Analisis rekaman bahasa isyarat menjadi transkrip teks, diproses lokal di browser.",
};

export default async function UploadPage() {
  await connection();
  return <UploadClient aiEnabled={Boolean(process.env.OPENAI_API_KEY)} />;
}
