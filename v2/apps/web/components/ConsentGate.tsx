"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Consent gate: End User Agreement + Privacy Policy must be accepted before
 * using the site (a Spotify developer-terms requirement). Copy carried over
 * from v1's ConsentModal; the mechanism is new — full legal docs open in a
 * new tab so the modal never has to close and reopen, consent is logged to
 * the server with a localStorage fallback, exactly like v1.
 */

const STORAGE_KEY = "setlistScoutConsent";

const EUA_SUMMARY = [
  "Setlist Scout accesses Spotify data with your permission",
  'We request the "playlist-modify-public" scope to create playlists on your behalf',
  "Spotify is a third-party beneficiary of this agreement",
  "Setlist Scout is solely responsible for its services",
  "You agree not to modify or reverse-engineer Spotify content",
  "You are responsible for maintaining account security",
  "Logging out will remove your data from our system",
];

const PRIVACY_SUMMARY = [
  "We store only the minimum data needed (Spotify User ID, access tokens)",
  'We request only the "playlist-modify-public" scope to create playlists on your behalf',
  "Authentication data is stored in encrypted sessions that expire after 24 hours",
  "We use a session cookie to maintain your login state",
  "Logging out will disconnect your Spotify account and remove your data from our systems",
  "We do not analyze your listening habits or store search history",
];

export default function ConsentGate() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<0 | 1>(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      setOpen(!localStorage.getItem(STORAGE_KEY));
    } catch {
      setOpen(false);
    }
  }, []);

  // legal pages must be readable without consenting
  if (!open || pathname.startsWith("/legal")) return null;

  async function accept() {
    if (!agreedToTerms || !agreedToPrivacy) return;
    setSubmitting(true);

    const consentData = {
      consented: true,
      agreedToTerms: true,
      agreedToPrivacy: true,
      date: new Date().toISOString(),
    };

    let consentId: string | undefined;
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consentData),
      });
      if (res.ok) consentId = ((await res.json()) as { consentId: string }).consentId;
    } catch {
      // server logging failed — localStorage record below still stands
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...consentData, consentId }));
    } catch {
      /* private browsing edge case — let them through regardless */
    }
    setOpen(false);
  }

  const summary = tab === 0 ? EUA_SUMMARY : PRIVACY_SUMMARY;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <h2 className="border-b border-zinc-800 px-6 py-4 text-lg font-semibold">
          Welcome to Setlist Scout
        </h2>

        <div className="overflow-y-auto px-6 py-4">
          <p className="text-sm leading-relaxed text-zinc-300">
            Please consent to our End User Agreement and Privacy Policy. These
            agreements explain how we interact with Spotify&apos;s API on your
            behalf.
          </p>

          <div className="mt-4 inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-1">
            {(["End User Agreement", "Privacy Policy"] as const).map((label, i) => (
              <button
                key={label}
                onClick={() => setTab(i as 0 | 1)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  tab === i ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* capped height so the checkboxes stay in view on phones (v1 did the same) */}
          <div className="mt-3 max-h-36 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 sm:max-h-64">
            <p className="text-sm font-semibold">
              {tab === 0 ? "End User Agreement (Summary)" : "Privacy Policy (Summary)"}
            </p>
            <p className="mt-1.5 text-sm text-zinc-400">
              {tab === 0
                ? "By using Setlist Scout, you agree to this End User Agreement. Key points include:"
                : "We value your privacy. Our Privacy Policy explains how we handle your data:"}
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed text-zinc-300">
              {summary.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
            <a
              href={tab === 0 ? "/legal" : "/legal?tab=1"}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-medium text-indigo-400 hover:underline"
            >
              {tab === 0 ? "Read full agreement ↗" : "Read full policy ↗"}
            </a>
          </div>

          <div className="mt-4 space-y-2.5">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              <span>
                I agree to the{" "}
                <a
                  href="/legal"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  End User Agreement
                </a>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              <span>
                I agree to the{" "}
                <a
                  href="/legal?tab=1"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  Privacy Policy
                </a>
              </span>
            </label>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-zinc-500">
            Spotify is a third-party beneficiary of these agreements and is entitled
            to enforce their terms.
          </p>
        </div>

        <div className="flex justify-end border-t border-zinc-800 px-6 py-4">
          <button
            onClick={accept}
            disabled={!agreedToTerms || !agreedToPrivacy || submitting}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {submitting ? "Saving…" : "I Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
