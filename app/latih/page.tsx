import type { Metadata } from "next";
import { TrainClient } from "@/components/TrainClient";

export const metadata: Metadata = {
  title: "Latih isyarat",
  description:
    "Rekam contoh isyarat SIBI di browser, simpan profil, dan gunakan untuk pengenalan real-time.",
};

export default function LatihPage() {
  return <TrainClient />;
}
