import Link from "next/link";

/**
 * Legal page: End User Agreement + Privacy Policy.
 * Copy ported verbatim from v1 (frontend/src/pages/Legal.jsx) — only the
 * presentation is new. Supports ?tab=1 deep links like v1 did.
 */

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-8 text-xl font-semibold">{children}</h2>
);
const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-5 text-base font-semibold">{children}</h3>
);
const P = ({ children, bold }: { children: React.ReactNode; bold?: boolean }) => (
  <p className={`mt-3 text-sm leading-relaxed ${bold ? "font-semibold text-zinc-200" : "text-zinc-300"}`}>
    {children}
  </p>
);
const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="mt-3 space-y-1.5 pl-4 text-sm leading-relaxed text-zinc-300">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);
const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
    {children} ↗
  </a>
);

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LegalPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab = sp.tab === "1" ? 1 : 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Legal Information</h1>
      <p className="mt-2 text-sm text-zinc-500">Effective Date: May 13, 2025</p>

      <nav className="mt-6 inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
        {["Terms of Service", "Privacy Policy"].map((label, i) => (
          <Link
            key={label}
            href={i === 0 ? "/legal" : "/legal?tab=1"}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              tab === i ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === 0 ? (
        <article className="pb-10">
          <H2>End User Agreement for Setlist Scout</H2>

          <H2>Introduction and Acceptance</H2>
          <P>
            Welcome to Setlist Scout! This End User Agreement (&quot;Agreement&quot;) is a
            legally binding contract between you and Setlist Scout regarding your use
            of our service.
          </P>
          <P bold>
            By accessing or using Setlist Scout, you agree to be bound by this
            Agreement. If you do not agree to this Agreement, you must not access or
            use our service.
          </P>
          <P>
            Setlist Scout is a tool designed to help concert-goers prepare for
            upcoming shows by providing insights into what songs their favorite
            artists are playing on tour.
          </P>

          <H2>Service Description</H2>
          <P>Setlist Scout allows you to:</P>
          <UL
            items={[
              "Search for artists and view their recent setlists",
              "See which songs artists have been playing on tour and their frequency",
              "Create Spotify playlists from these song lists when logged in with Spotify",
            ]}
          />

          <H2>Third-Party Services</H2>
          <H3>Spotify Integration</H3>
          <P>
            Setlist Scout integrates with Spotify&apos;s API to provide music
            information and playlist creation capabilities. By using these features:
          </P>
          <UL
            items={[
              <>
                You agree to comply with{" "}
                <Ext href="https://www.spotify.com/us/legal/end-user-agreement/">
                  Spotify&apos;s Terms of Use
                </Ext>
              </>,
              'You authorize Setlist Scout to access your Spotify account with the permissions you approve (specifically the "playlist-modify-public" scope, which allows us to create public playlists on your behalf)',
              "You acknowledge that Spotify is a third-party beneficiary of this Agreement and is entitled to directly enforce this Agreement",
              "You understand that your use of Spotify features is also governed by Spotify's Privacy Policy",
            ]}
          />

          <H3>Setlist.fm Integration</H3>
          <P>
            We use data from Setlist.fm to provide setlist information. Your use of
            our service is also subject to Setlist.fm&apos;s terms.
          </P>

          <H2>User Accounts and Security</H2>
          <P>When you connect your Spotify account:</P>
          <UL
            items={[
              "You are responsible for maintaining the confidentiality of your credentials",
              "You agree not to share your login information with others",
              "You must notify us of any unauthorized use of your account",
            ]}
          />

          <H2>Data Usage and Privacy</H2>
          <P>
            Your use of Setlist Scout is also subject to our Privacy Policy, which
            explains how we collect, use, and protect your personal information. By
            using Setlist Scout, you consent to the data practices described in the
            Privacy Policy.
          </P>

          <H2>User Conduct</H2>
          <P>When using Setlist Scout, you agree not to:</P>
          <UL
            items={[
              "Violate any applicable laws or regulations",
              "Interfere with or disrupt the service or servers",
              "Attempt to gain unauthorized access to any part of the service",
              "Use the service for any commercial purpose without our consent",
              "Engage in any activity that could harm other users or our service",
              "Modify or create derivative works based on the Spotify Platform, Spotify Service or Spotify Content",
              "Decompile, reverse-engineer, disassemble, or otherwise reduce the Spotify Platform, Spotify Service, and Spotify Content to source code or other human-perceivable form",
            ]}
          />

          <H2>Intellectual Property</H2>
          <P>
            The content, organization, graphics, design, and other matters related to
            Setlist Scout are protected by applicable copyrights and other
            proprietary rights. We respect the intellectual property of others and
            expect users to do the same.
          </P>

          <H2>Disclaimer of Warranties</H2>
          <P bold>
            SETLIST SCOUT IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
            WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL
            WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
          </P>
          <P bold>
            WITH RESPECT TO THE SPOTIFY PLATFORM, SPOTIFY SERVICE, AND SPOTIFY
            CONTENT, WE MAKE NO WARRANTIES OR REPRESENTATIONS ON BEHALF OF SPOTIFY AND
            EXPRESSLY DISCLAIM ALL IMPLIED WARRANTIES WITH RESPECT TO THE SPOTIFY
            PLATFORM, SPOTIFY SERVICE AND SPOTIFY CONTENT, INCLUDING THE IMPLIED
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
            NON-INFRINGEMENT.
          </P>

          <H2>Responsibility and Limitation of Liability</H2>
          <P>
            Setlist Scout is solely responsible for its products and services.
            Spotify and any other third-party services integrated into Setlist Scout
            are not responsible for Setlist Scout or its operation.
          </P>
          <P bold>
            TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL SETLIST SCOUT BE
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
            DAMAGES ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE.
          </P>
          <P bold>
            SPOTIFY AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY DAMAGES OR LOSSES
            ARISING FROM YOUR USE OF THE SPOTIFY PLATFORM, SPOTIFY SERVICE, OR SPOTIFY
            CONTENT, OR YOUR USE OF SETLIST SCOUT. SPOTIFY PROVIDES THE SPOTIFY
            PLATFORM, SPOTIFY SERVICE, AND SPOTIFY CONTENT &quot;AS IS&quot; WITHOUT
            ANY WARRANTY OR REPRESENTATION.
          </P>

          <H2>Termination</H2>
          <P>
            We may terminate or suspend your access to Setlist Scout at any time,
            without prior notice or liability, for any reason.
          </P>

          <H2>Changes to this Agreement</H2>
          <P>
            We may modify this Agreement at any time. If we make material changes, we
            will notify you by email or by posting a notice on our website before the
            changes become effective. Your continued use of Setlist Scout after any
            changes indicates your acceptance of the modified Agreement.
          </P>

          <H2>Governing Law</H2>
          <P>
            This Agreement shall be governed by the laws of the jurisdiction in which
            Setlist Scout operates, without regard to its conflict of law provisions.
          </P>

          <H2>Contact Information</H2>
          <P>
            If you have any questions about this Agreement, please contact us at:
            setlistscout@gmail.com
          </P>

          <P bold>
            Spotify is a third-party beneficiary of this End User Agreement and is
            entitled to directly enforce its terms.
          </P>
        </article>
      ) : (
        <article className="pb-10">
          <H2>Privacy Policy for Setlist Scout</H2>

          <H2>Introduction</H2>
          <P>
            Your privacy is important to us. This Privacy Policy explains how Setlist
            Scout (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) collects, uses,
            and protects your personal information when you use our website and
            services.
          </P>
          <P>
            Setlist Scout is a tool designed to help concert-goers prepare for
            upcoming shows by providing insights into what songs their favorite
            artists are playing on tour.
          </P>

          <H2>Information We Collect</H2>
          <H3>Information You Provide</H3>
          <P>When you use Setlist Scout, we collect the following information:</P>
          <UL
            items={[
              <>
                <strong>Spotify User ID</strong>: Stored temporarily to identify your
                account when creating playlists
              </>,
              <>
                <strong>Spotify Access Tokens</strong>: Stored securely to perform
                authorized actions on your behalf
              </>,
              <>
                <strong>Session Information</strong>: Stored in encrypted server-side
                sessions
              </>,
              <>
                <strong>Spotify API Scopes</strong>: We request only the
                &quot;playlist-modify-public&quot; scope, which allows us to create
                public playlists on your behalf
              </>,
            ]}
          />

          <H3>Information Collected Automatically</H3>
          <P>
            We also collect certain information automatically when you use our
            service:
          </P>
          <UL
            items={[
              <>
                <strong>Usage Data</strong>: Information about how you interact with
                our service
              </>,
              <>
                <strong>Device Information</strong>: Browser type, operating system,
                and device type
              </>,
              <>
                <strong>IP Address</strong>: Used for service operation and security
                purposes
              </>,
            ]}
          />

          <H3>Cookies and Similar Technologies</H3>
          <P>
            Our service uses a session cookie to maintain your logged-in state. This
            cookie is deleted when you log out or expires after 24 hours.
          </P>
          <P>
            When you authenticate with Spotify, their authentication service may
            place cookies on your browser during the authentication process on their
            domain.
          </P>

          <H2>How We Use Your Information</H2>
          <P>We use the information we collect to:</P>
          <UL
            items={[
              "Provide and maintain our service",
              "Create Spotify playlists based on your artist selections",
              "Maintain your login session",
              "Improve and personalize your experience",
              "Ensure the security of our service",
            ]}
          />

          <H2>Data Sharing and Disclosure</H2>
          <P>We share your information only in the following circumstances:</P>
          <UL
            items={[
              <>
                <strong>With Spotify</strong>: To authenticate your account and
                create playlists
              </>,
              <>
                <strong>Service Providers</strong>: Third-party companies that help
                us deliver our service (such as hosting providers)
              </>,
              <>
                <strong>Legal Requirements</strong>: When required by law or to
                protect our rights
              </>,
            ]}
          />
          <P bold>We do NOT:</P>
          <UL
            items={[
              "Analyze your listening habits",
              "Store your search history",
              "Track your application usage",
              "Share your data with unauthorized third parties",
            ]}
          />

          <H2>Data Retention</H2>
          <P>
            All authentication data is stored in encrypted sessions that expire after
            24 hours. We do not maintain databases of user information or activity.
            You can delete your session data at any time by logging out.
          </P>
          <P>
            <strong>Important</strong>: Logging out of Setlist Scout will disconnect
            your Spotify account and remove your data from our systems.
          </P>

          <H2>Your Privacy Rights and Choices</H2>
          <P>You have the right to:</P>
          <UL
            items={[
              <>
                <strong>Access</strong>: Request information about the personal data
                we have about you
              </>,
              <>
                <strong>Delete</strong>: Request deletion of your personal data
              </>,
              <>
                <strong>Disconnect</strong>: Disconnect your Spotify account from our
                service at any time by logging out
              </>,
              <>
                <strong>Opt-Out</strong>: Control cookie settings through your
                browser
              </>,
            ]}
          />
          <P>To exercise these rights, you can:</P>
          <UL
            items={[
              <>
                <strong>Log out</strong> from our application using the
                &quot;Logout&quot; button in the navigation bar (this will disconnect
                your Spotify account and delete your session data)
              </>,
              "Email us at setlistscout@gmail.com",
            ]}
          />

          <H2>Children&apos;s Privacy</H2>
          <P>
            Our service is not directed to children under the age of 13. We do not
            knowingly collect personal information from children under 13. If you are
            a parent or guardian and believe we have collected information from your
            child, please contact us.
          </P>

          <H2>Changes to This Privacy Policy</H2>
          <P>
            We may update our Privacy Policy from time to time. We will notify you of
            any changes by posting the new Privacy Policy on this page and updating
            the &quot;Effective Date&quot; at the top.
          </P>

          <H2>Third-Party Services</H2>
          <H3>Spotify</H3>
          <P>When you connect your Spotify account to Setlist Scout:</P>
          <UL
            items={[
              "We request only the minimum permissions needed (playlist-modify-public)",
              <>
                Your use of Spotify through our service is also subject to{" "}
                <Ext href="https://www.spotify.com/us/legal/privacy-policy/">
                  Spotify&apos;s Privacy Policy
                </Ext>
              </>,
              "You will be prompted to authorize specific permissions before we access your Spotify account",
            ]}
          />
          <H3>Setlist.fm</H3>
          <P>
            We use Setlist.fm to retrieve artist setlist information. We do not share
            your personal information with Setlist.fm.
          </P>

          <H2>User Consent</H2>
          <P bold>
            By using Setlist Scout, you consent to our collection, use, and sharing
            of your information as described in this Privacy Policy. If you do not
            agree with this policy, please do not use our service.
          </P>

          <H2>Contact Us</H2>
          <P>
            If you have any questions about this Privacy Policy, please contact us
            at: setlistscout@gmail.com
          </P>

          <P bold>
            Spotify is a third-party beneficiary of this Privacy Policy and is
            entitled to directly enforce its terms.
          </P>
        </article>
      )}
    </main>
  );
}
