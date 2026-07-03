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
    <nav className="mt-5 inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
      {sections.map((section) => (
        <Link
          key={section.key}
          href={section.href}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            active === section.key
              ? "bg-indigo-600 text-white"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
