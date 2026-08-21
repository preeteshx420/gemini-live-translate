import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Privacy Policy — AiOnPhone by Mednaath Inc",
  description: "Privacy Policy for AiOnPhone live translation service by Mednaath Inc.",
};

const LAST_UPDATED = "August 18, 2025";

export default function PrivacyPage() {
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
            <h1 className="legal-title">Privacy Policy</h1>
            <p className="legal-meta">Last updated: {LAST_UPDATED}</p>
          </header>

          <div className="legal-body">
            <section className="legal-section">
              <p>
                Mednaath Inc (&ldquo;Mednaath&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the
                AiOnPhone real-time translation service at{" "}
                <a href="https://video.aionphone.com" className="legal-link">
                  video.aionphone.com
                </a>
                . This Privacy Policy explains how we collect, use, and protect information
                about you when you use our service.
              </p>
              <p>
                By using AiOnPhone, you agree to the collection and use of information in
                accordance with this policy.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">1. Information We Collect</h2>

              <h3 className="legal-h3">Account Information</h3>
              <p>
                When you sign up as a host, we collect your email address and any profile
                information you provide during registration, including your name and email address.
                We do not store passwords — authentication is handled securely by our
                identity provider.
              </p>

              <h3 className="legal-h3">Session Data</h3>
              <p>
                When you start or join a session we collect:
              </p>
              <ul className="legal-list">
                <li>Your display name (entered by you before joining)</li>
                <li>Your chosen language preference for the session</li>
                <li>Session identifiers (the room name, derived from your email and a random suffix)</li>
                <li>Participant connection metadata (join/leave times) for operational purposes</li>
              </ul>

              <h3 className="legal-h3">Audio Data</h3>
              <p>
                Your audio is transmitted in real time over encrypted connections for the purpose
                of translation. Audio is processed transiently by our AI translation pipeline.{" "}
                <strong>We do not permanently store audio recordings of your calls.</strong>{" "}
                Audio data exists only for the duration of live processing and is not retained
                after your session ends.
              </p>

              <h3 className="legal-h3">Technical Data</h3>
              <p>
                We may collect standard technical data including IP addresses, browser type,
                device information, and usage logs for operational and security purposes.
                This data is used to maintain service reliability and to detect abuse.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="legal-list">
                <li>Provide and operate the AiOnPhone translation service</li>
                <li>Authenticate you and manage your account</li>
                <li>Process real-time audio translation during active sessions</li>
                <li>Generate and manage session invite links</li>
                <li>Maintain service security and detect fraudulent or abusive activity</li>
                <li>Respond to your support enquiries</li>
                <li>Improve and develop the service</li>
              </ul>
              <p>
                We do not sell your personal information to third parties.
                We do not use your audio content for advertising purposes.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">3. Third-Party Service Providers</h2>
              <p>
                AiOnPhone relies on third-party infrastructure and service providers to deliver
                core functionality, including secure authentication, real-time audio transport,
                and AI translation processing. These providers process data on our behalf and
                are contractually obligated to protect your information. We do not share your
                personal data with third parties for their own marketing or advertising purposes.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">4. Cookies and Local Storage</h2>
              <p>
                AiOnPhone uses browser <strong>sessionStorage</strong> (not persistent cookies) to
                remember your display name and language preference within a single browser session.
                This data is cleared automatically when you close your browser tab.
              </p>
              <p>
                Our authentication system may set cookies strictly necessary for maintaining
                your signed-in session. These are essential for the service to function and
                cannot be disabled while using the service.
              </p>
              <p>
                We do not use third-party advertising cookies or tracking pixels.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">5. Data Retention</h2>
              <p>
                <strong>Audio:</strong> Not retained. Processed transiently in real time and
                discarded after translation.
              </p>
              <p>
                <strong>Account information:</strong> Retained for as long as your account is
                active. You may request deletion of your account by contacting us at{" "}
                <a href="mailto:team@mednaath.com" className="legal-link">team@mednaath.com</a>.
              </p>
              <p>
                <strong>Session metadata:</strong> Retained for a limited period for operational
                and security purposes, then deleted.
              </p>
              <p>
                <strong>Technical logs:</strong> Retained for a limited period (typically up to
                90 days) for security and debugging, then deleted.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">6. Your Rights</h2>
              <p>
                Depending on your location, you may have certain rights regarding your personal
                data, including the right to:
              </p>
              <ul className="legal-list">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (&ldquo;right to be forgotten&rdquo;)</li>
                <li>Object to or restrict processing of your data</li>
                <li>Data portability (receive your data in a machine-readable format)</li>
              </ul>
              <p>
                To exercise any of these rights, please contact us at{" "}
                <a href="mailto:team@mednaath.com" className="legal-link">team@mednaath.com</a>.
                We will respond within a reasonable timeframe.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">7. Children&rsquo;s Privacy</h2>
              <p>
                AiOnPhone is not directed at children under the age of 13. We do not knowingly
                collect personal information from children under 13. If you believe a child has
                provided us with personal information, please contact us and we will take steps
                to delete it.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">8. Security</h2>
              <p>
                We implement reasonable technical and organisational measures to protect your
                personal data against unauthorised access, loss, or misuse. All audio data is
                transmitted over encrypted connections. Account access is protected by
                industry-standard authentication practices.
              </p>
              <p>
                No method of transmission over the Internet is 100% secure. We cannot guarantee
                absolute security, but we take your privacy seriously and work continuously to
                protect your data.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will indicate the date
                of the most recent revision at the top of this page. Your continued use of the
                service after any changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-h2">10. Contact Us</h2>
              <p>
                If you have any questions, concerns, or requests relating to this Privacy Policy
                or your personal data, please contact us at:
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
            <Link href="/terms" className="legal-link">Terms of Service</Link>
            <span className="legal-footer-sep">·</span>
            <Link href="/" className="legal-link">Back to AiOnPhone</Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
