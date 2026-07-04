import Link from "next/link";
import { notFound } from "next/navigation";
import { Orbitron, Playfair_Display, VT323 } from "next/font/google";
import LabScreen from "@/components/lab/LabScreen";
import { VARIANTS } from "@/components/lab/registry";

/* Design lab: the real site structure with dummy data, reskinned. Lab-only
   display fonts load here so the rest of the site never pays for them. */

const vt323 = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt323" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair" });

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LabVariantPage({ params }: PageProps) {
  const { slug } = await params;
  const index = VARIANTS.findIndex((v) => v.slug === slug);
  if (index === -1) notFound();

  const variant = VARIANTS[index]!;
  const prev = VARIANTS[(index + VARIANTS.length - 1) % VARIANTS.length]!;
  const next = VARIANTS[(index + 1) % VARIANTS.length]!;

  return (
    <div data-lab className={`${vt323.variable} ${orbitron.variable} ${playfair.variable}`}>
      <LabScreen slug={slug} />
      {/* floating lab navigator */}
      <nav className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-700 bg-zinc-950/90 px-2 py-1.5 font-mono text-xs text-zinc-300 shadow-2xl backdrop-blur">
        <Link href={`/lab/${prev.slug}`} className="rounded-full px-2.5 py-1 hover:bg-zinc-800" title={prev.name}>
          ←
        </Link>
        <Link href="/lab" className="rounded-full px-3 py-1 hover:bg-zinc-800">
          lab {String(index + 1).padStart(2, "0")}/{VARIANTS.length} · {variant.name}
        </Link>
        <Link href={`/lab/${next.slug}`} className="rounded-full px-2.5 py-1 hover:bg-zinc-800" title={next.name}>
          →
        </Link>
      </nav>
    </div>
  );
}
