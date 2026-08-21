"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useUser, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const LANG_CODES = [
  "EN", "ES", "FR", "DE", "JA", "ZH", "AR", "HI",
  "PT", "KO", "RU", "TR", "VI", "TH",
];

const STEPS = [
  {
    num: "01",
    title: "Create a session",
    body: "One click opens a private room.",
  },
  {
    num: "02",
    title: "Pick your language",
    body: "Everyone independently chooses the language they speak and hear.",
  },
  {
    num: "03",
    title: "Talk — translation is automatic",
    body: "Real-time audio translation starts the moment people with different languages join.",
  },
];

/** Generate a 6-char random alphanumeric suffix */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Build the public session ID from the creator's email.
 *
 * LiveKit room name:  "jesse@company.com-a3f9b2"
 * Public session ID:  base64url of that string   e.g. "amVzc2VAY29tcGFueS5jb20tYTNmOWIy"
 *
 * The token API reverses this: base64url-decode → LiveKit room name.
 * The email is never visible in the browser URL.
 */
function buildSessionId(email: string): string {
  const roomName = `${email}-${randomSuffix()}`;
  // btoa works on ASCII; email + suffix are always ASCII-safe
  return btoa(roomName)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export default function Home() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [loading, setLoading] = useState(false);

  function createSession() {
    if (!isSignedIn || !user) return;
    setLoading(true);
    const email =
      user.primaryEmailAddress?.emailAddress ?? user.id;
    const sessionId = buildSessionId(email);
    router.push(`/session/${sessionId}`);
  }

  return (
    <div className="home-page">

      {/* ── Main content: two columns on desktop, stacked on mobile ── */}
      <main className="home-main">

        {/* LEFT: hero text + CTA */}
        <div className="home-left">

          <div className="home-hero-logo enter">
            <Image
              src="/logo.png"
              alt="Mednaath AiOnPhone"
              width={88}
              height={88}
              priority
              className="home-logo-img"
            />
          </div>

          <h1 className="display home-title enter-d1">
            Speak any language.<br />
            <em>Understand everyone.</em>
          </h1>

          <p className="body home-subtitle enter-d2">
            Multi-language video calls with real-time translation.
            Every participant picks their language — the rest is automatic.
          </p>

          {/* Language strip */}
          <div className="home-langs enter-d2">
            <div className="lang-strip home-lang-strip">
              {LANG_CODES.map((c) => (
                <span key={c} className="lang-tag">{c}</span>
              ))}
              <span className="lang-tag lang-tag-more">+64</span>
            </div>
            <span className="mono home-langs-label">78 languages supported</span>
          </div>

          {/* CTA */}
          <div className="home-cta enter-d3">
            {!isLoaded ? (
              /* Still loading Clerk — show a neutral spinner */
              <div className="spinner" style={{ margin: "10px 0" }} />
            ) : isSignedIn ? (
              /* Signed in — show avatar + start button */
              <>
                <button
                  className="btn btn-dark home-btn-primary"
                  onClick={createSession}
                  disabled={loading}
                  id="create-session-btn"
                >
                  {loading ? (
                    <><span className="spinner" /> Creating…</>
                  ) : (
                    "Start a session"
                  )}
                </button>
                <UserButton />
              </>
            ) : (
              /* Not signed in — show sign-in / sign-up buttons */
              <>
                <SignInButton mode="modal">
                  <button className="btn btn-dark home-btn-primary">
                    Sign in to start
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="btn btn-outline">
                    Create account
                  </button>
                </SignUpButton>
              </>
            )}

            {isSignedIn && (
              <span className="home-cta-note">
                Signed in as {user.primaryEmailAddress?.emailAddress}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT: How it works steps */}
        <div className="home-right enter-d3">
          <p className="home-steps-heading">How it works</p>
          <div className="home-steps">
            {STEPS.map((s) => (
              <div key={s.num} className="home-step">
                <span className="home-step-num">{s.num}</span>
                <div className="home-step-body">
                  <p className="home-step-title">{s.title}</p>
                  <p className="home-step-text">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="home-footer enter-d4">
        {/* Brand row */}
        <div className="home-footer-brand">
          <Image
            src="/logo.png"
            alt=""
            width={18}
            height={18}
            aria-hidden
            style={{ borderRadius: "50%", opacity: 0.5, flexShrink: 0 }}
          />
          <span className="mono">Powered by Mednaath Technology</span>
        </div>

        {/* Links row */}
        <div className="home-footer-links">
          <Link href="/terms" className="home-footer-link">
            Terms of Service
          </Link>
          <span className="home-footer-sep" aria-hidden>·</span>
          <Link href="/privacy" className="home-footer-link">
            Privacy Policy
          </Link>
          <span className="home-footer-sep" aria-hidden>·</span>
          <a
            href="mailto:team@mednaath.com"
            className="home-footer-link"
          >
            Contact
          </a>
        </div>
      </footer>

    </div>
  );
}
