/**
 * Kamus SIBI (Sistem Isyarat Bahasa Indonesia) untuk alfabet + kosakata dasar.
 *
 * Catatan penting: deskripsi di sini adalah panduan bentuk umum, bukan standar
 * baku mutlak. Variasi antar-daerah dan antar-penutur itu normal. Karena itu
 * aplikasi ini memakai pendekatan "rekam contohmu sendiri" — model meniru
 * bentuk tanganmu, bukan memaksa kamu meniru gambar.
 */

export type LetterEntry = {
  label: string;
  hint: string;
  /** Didukung oleh mesin cepat berbasis aturan geometri (tanpa data latih). */
  quick: boolean;
};

export const LETTERS: LetterEntry[] = [
  { label: "A", hint: "Kepal tangan, ibu jari menempel di sisi telunjuk.", quick: true },
  { label: "B", hint: "Empat jari rapat tegak, ibu jari dilipat ke telapak.", quick: true },
  { label: "C", hint: "Jari-jari melengkung membentuk huruf C.", quick: false },
  { label: "D", hint: "Telunjuk tegak, ujung ibu jari menyentuh ujung jari tengah.", quick: true },
  { label: "E", hint: "Jari-jari dilipat, ujung ibu jari masuk ke bawah jari.", quick: false },
  { label: "F", hint: "Ujung ibu jari dan telunjuk menyentuh, tiga jari lain tegak.", quick: false },
  { label: "G", hint: "Telunjuk dan ibu jari sejajar menunjuk ke samping.", quick: false },
  { label: "H", hint: "Telunjuk dan jari tengah rapat menunjuk ke samping.", quick: false },
  { label: "I", hint: "Kelingking tegak, jari lain mengepal.", quick: true },
  { label: "J", hint: "Seperti I, lalu kelingking digerakkan membentuk huruf J.", quick: false },
  { label: "K", hint: "Telunjuk dan jari tengah tegak, ibu jari di antaranya.", quick: false },
  { label: "L", hint: "Telunjuk dan ibu jari membentuk sudut L.", quick: true },
  { label: "M", hint: "Tiga jari dilipat menutupi ibu jari.", quick: false },
  { label: "N", hint: "Dua jari dilipat menutupi ibu jari.", quick: false },
  { label: "O", hint: "Semua ujung jari menyentuh ibu jari membentuk O.", quick: true },
  { label: "P", hint: "Seperti K, tangan diputar menghadap ke bawah.", quick: false },
  { label: "Q", hint: "Telunjuk dan ibu jari menunjuk ke bawah.", quick: false },
  { label: "R", hint: "Telunjuk dan jari tengah menyilang.", quick: false },
  { label: "S", hint: "Kepal, ibu jari melintang di depan jari-jari.", quick: false },
  { label: "T", hint: "Ibu jari diselipkan di antara telunjuk dan jari tengah.", quick: false },
  { label: "U", hint: "Telunjuk dan jari tengah rapat tegak.", quick: false },
  { label: "V", hint: "Telunjuk dan jari tengah tegak membentuk V.", quick: true },
  { label: "W", hint: "Telunjuk, jari tengah, dan jari manis tegak.", quick: true },
  { label: "X", hint: "Telunjuk ditekuk seperti kait.", quick: false },
  { label: "Y", hint: "Ibu jari dan kelingking terbuka, jari lain mengepal.", quick: true },
  { label: "Z", hint: "Telunjuk menulis pola Z di udara.", quick: false },
];

export const QUICK_LABELS = new Set([
  "A",
  "B",
  "D",
  "I",
  "L",
  "O",
  "V",
  "W",
  "Y",
  "SPASI",
]);

export const QUICK_HELP: Record<string, string> = {
  A: "Kepal, ibu jari terbuka di samping.",
  B: "Empat jari rapat tegak, ibu jari terlipat.",
  D: "Telunjuk tegak, ibu jari menyentuh jari tengah.",
  I: "Hanya kelingking yang tegak.",
  L: "Telunjuk + ibu jari membentuk L.",
  O: "Semua ujung jari menyentuh ibu jari.",
  V: "Telunjuk + jari tengah terbuka.",
  W: "Telunjuk + tengah + manis terbuka.",
  Y: "Ibu jari + kelingking terbuka.",
  SPASI: "Telapak terbuka lebar (lima jari).",
};

export type WordEntry = {
  label: string;
  hint: string;
};

/** Kosakata dasar untuk mode "kata" (perlu kamu rekam sendiri). */
export const WORDS: WordEntry[] = [
  { label: "HALO", hint: "Melambaikan tangan terbuka di dekat kepala." },
  { label: "TERIMA KASIH", hint: "Ujung jari menyentuh dagu lalu bergerak ke depan." },
  { label: "MAAF", hint: "Tangan mengepal diputar melingkar di dada." },
  { label: "TOLONG", hint: "Telapak terbuka diangkat ke depan." },
  { label: "YA", hint: "Kepalan tangan mengangguk seperti memberi izin." },
  { label: "TIDAK", hint: "Telunjuk dan jari tengah menyilang lalu digoyang." },
  { label: "SAYA", hint: "Telunjuk menunjuk ke dada sendiri." },
  { label: "KAMU", hint: "Telunjuk menunjuk ke arah lawan bicara." },
  { label: "NAMA", hint: "Dua jari mengetuk dua kali di depan dada." },
  { label: "APA", hint: "Kedua telapak terbuka diangkat, ekspresi bertanya." },
  { label: "KABAR", hint: "Telapak di depan dada bergerak memutar." },
  { label: "PAHAM", hint: "Telunjuk menyentuh pelipis lalu dibuka." },
  { label: "BELAJAR", hint: "Telapak dibuka dari kepala ke depan." },
  { label: "KERJA", hint: "Dua kepalan tangan saling memukul pelan." },
  { label: "MAKAN", hint: "Ujung jari mengumpul ke arah mulut." },
  { label: "MINUM", hint: "Tangan seperti memegang gelas ke arah mulut." },
  { label: "RUMAH", hint: "Dua telapak membentuk atap rumah." },
  { label: "TIDUR", hint: "Telapak menempel di samping kepala, mata menutup." },
  { label: "DUDUK", hint: "Dua jari bertumpuk seperti kaki duduk." },
  { label: "BERDIRI", hint: "Dua jari berdiri tegak di telapak tangan." },
  { label: "CINTA", hint: "Kedua tangan menyilang di dada." },
  { label: "SELAMAT", hint: "Telapak menempel lalu bergerak ke depan." },
  { label: "PAGI", hint: "Tangan bergerak naik seperti matahari terbit." },
  { label: "MALAM", hint: "Telapak menutup ke arah bawah seperti menutup." },
  { label: "TULI", hint: "Telunjuk menyentuh telinga lalu mulut." },
  { label: "ISYARAT", hint: "Kedua telunjuk berputar saling mengelilingi." },
];

export const FRIENDLY_WORD_POOL = ["HALO", "TERIMA KASIH", "MAAF", "TOLONG", "YA", "TIDAK"];

export function letterHint(label: string): string {
  if (label === "SPASI") return QUICK_HELP.SPASI;
  return LETTERS.find((l) => l.label === label)?.hint ?? QUICK_HELP[label] ?? "";
}
