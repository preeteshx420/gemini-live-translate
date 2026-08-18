import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Terms of Service — AiOnPhone by Mednaath Inc",
  description: "Terms of Service for AiOnPhone live translation service by Mednaath Inc.",
};

const LAST_UPDATED = "August 18, 2025";

export default function TermsPage() {
  return (
    <div className="legal-page">
      {/* ── Nav bar ── */}
      <nav className="legal-nav">
        <Link href="/" className="legal-nav-brand">
          <Image
            src="/logo.png"
            alt="AiOnPhone"
            width={28}
            height={28}
            style={{ borderRadius: "50%" }}
          />
          <span className="legal-nav-name">AiOnPhone</span>
        </Link>
        <Link href="/" className="legal-nav-back">← Back to home</Link>
      </nav>

      <main className="legal-main">
        <div className="legal-container">
          {/* Header */}
          <header className="legal-header">
            <p className="legal-eyebrow">Legal</p>
            <h1 className="legal-title">Terms of Service</h1>
            <p className="legal-meta">Last updated: {LAST_UPDATED}</p>
          </header>

          <div className="legal-body">
            <section className="legal-section">
              <p>
                These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of AiOnPhone,
                a real-time multi-language video calling and translation service operated by
                Mednaath Inc (&ldquo;Mednaath&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
                By accessing or using AiOnPhone, you agree to be bound by these Terms.
                If you do not agree, please do not use the service.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">1. Use of the Service</h2>
              <p>
                AiOnPhone allows signed-in users (&ldquo;hosts&rdquo;) to create real-time translation
                sessions and share invite links with other participants (&ldquo;guests&rdquo;).
                You may use the service only for lawful purposes and in accordance with these Terms.
              </p>
              <p>You agree not to:</p>
              <ul className="legal-list">
                <li>Use the service to transmit unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable content.</li>
                <li>Attempt to gain unauthorised access to any portion of the service or its related systems.</li>
                <li>Interfere with or disrupt the integrity or performance of the service.</li>
                <li>Use the service to infringe on any intellectual property rights of any party.</li>
                <li>Reverse-engineer, decompile, or disassemble any part of the service.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">2. Accounts</h2>
              <p>
                Hosts must create an account to start sessions.
                You are responsible for maintaining the confidentiality of your account credentials
                and for all activities that occur under your account. You must notify us immediately
                at{" "}
                <a href="mailto:team@mednaath.com" className="legal-link">team@mednaath.com</a>
                {" "}of any unauthorised use of your account.
              </p>
              <p>
                Guests (participants who join via an invite link) do not require an account.
                Guest participation is subject to these Terms.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">3. Sessions and Data</h2>
              <p>
                Sessions are created on-demand and processed in real time via our secure
                media infrastructure. Audio and translation data are processed transiently;
                we do not permanently store recordings of your calls unless otherwise explicitly stated.
              </p>
              <p>
                Session invite links are persistent identifiers for your session room. You are
                responsible for controlling who you share your invite link with. Anyone with the
                link may join your session when it is active.
              </p>
              <p>
                Sessions may be automatically closed after a period of inactivity (currently
                19 minutes of no user interaction) to protect resource usage and your privacy.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">4. AI Translation</h2>
              <p>
                AiOnPhone uses AI-powered real-time translation. Translation is provided &ldquo;as is&rdquo;
                and may not be perfectly accurate in all cases. You should not rely solely on
                AI-generated translations for safety-critical, legal, or medical communications.
                Mednaath Inc disclaims all liability for errors or omissions in AI-generated
                translation output.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">5. Intellectual Property</h2>
              <p>
                The AiOnPhone service, including its design, code, branding, and content, is owned
                by Mednaath Inc and protected by applicable intellectual property laws.
                You may not copy, modify, distribute, or create derivative works without our
                prior written consent.
              </p>
              <p>
                You retain ownership of any content you transmit through the service. By using
                the service, you grant Mednaath Inc a limited, non-exclusive licence to
                process your content solely to provide the service to you.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">6. Third-Party Services</h2>
              <p>
                AiOnPhone relies on third-party infrastructure and service providers to deliver
                core functionality including authentication, real-time media transport, and
                AI translation processing. Your use of the service is also subject to the
                terms and privacy policies of these underlying providers.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">7. Disclaimers</h2>
              <p>
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY
                KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                MEDNAATH INC DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
                ERROR-FREE, OR SECURE.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">8. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MEDNAATH INC SHALL NOT
                BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
                DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF WE HAVE
                BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">9. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your access to the service at our
                sole discretion, without notice, for conduct that we believe violates these Terms
                or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">10. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time. We will indicate the date of the
                most recent revision at the top of this page. Your continued use of the service
                after any changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">11. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with applicable laws.
                Any disputes arising from these Terms or your use of the service shall be subject
                to the exclusive jurisdiction of the courts of the applicable jurisdiction.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">12. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="legal-contact-card">
                <p><strong>Mednaath Inc</strong></p>
                <p>
                  Email:{" "}
                  <a href="mailto:team@mednaath.com" className="legal-link">
                    team@mednaath.com
                  </a>
                </p>
              </div>
            </section>
          </div>

          {/* Footer links */}
          <footer className="legal-footer">
            <Link href="/privacy" className="legal-link">Privacy Policy</Link>
            <span className="legal-footer-sep">·</span>
            <Link href="/" className="legal-link">Back to AiOnPhone</Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
