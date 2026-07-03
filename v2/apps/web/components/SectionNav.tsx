import Link from "next/link";

interface SectionNavProps {
  mbid: string;
  name: string;
  active: "predict" | "relive";
}

/** The site's two halves: predict the future set, or relive a past one. */
export default function SectionNav({ mbid, name, active }: SectionNavProps) {
  const query = `?name=${encodeURIComponent(name)}`;
  const sections = [
    { key: "predict", label: "Predict my set", href: `/artist/${mbid}${query}` },
    { key: "relive", label: "Relive a set", href: `/artist/${mbid}/tours${query}` },
  ] as const;

  return (
    <nav className="mt-5 inline-flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
      {sections.map((section) => (
        <Link
          key={section.key}
          href={section.href}
          className={`rounded-lg px-5 py-2 font-display text-sm font-semibold uppercase tracking-wider ${
            active === section.key
              ? "bg-indigo-600 text-white shadow-[0_0_16px_rgba(99,102,241,0.45)]"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
