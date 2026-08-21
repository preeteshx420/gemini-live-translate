"use client";

/**
 * InvitePhoneModal — multi-number SIP dial-out modal.
 *
 * Shown when the host clicks the "📞 Call in" button in the header chrome.
 * Lets the host add multiple phone numbers (each with its own language), then
 * dials them all in parallel via POST /api/sip/invite.
 *
 * Per-number status feedback:
 *   ⏳ Dialing…  — request in flight
 *   ✅ Dialing   — success (LiveKit is calling the number)
 *   ❌ Failed    — error (bad number, SIP trunk issue, etc.)
 *
 * The modal closes automatically 1.5s after all requests settle successfully.
 */

import { useCallback, useState } from "react";
import { PICKER_LANGUAGES, NATIVE_OPTION } from "@/lib/languages";
import { NATIVE_LANG } from "@/lib/config";

// "No translation" first, then all real languages — for the phone modal only.
// A phone caller with lang="none" hears the room audio without any translation.
const PHONE_LANGUAGES = [
  NATIVE_OPTION,
  ...PICKER_LANGUAGES.filter((l) => l.code !== NATIVE_LANG),
];

// ── Types ────────────────────────────────────────────────────────────────────

type RowStatus = "idle" | "dialing" | "ok" | "error";

interface PhoneEntry {
  id:     string;
  phone:  string;
  lang:   string;
  status: RowStatus;
  error:  string;
}

function makeEntry(): PhoneEntry {
  return {
    id:     Math.random().toString(36).slice(2),
    phone:  "",
    lang:   "en",
    status: "idle",
    error:  "",
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === "dialing") {
    return <span className="ipm-status ipm-status--dialing" aria-label="Dialing">⏳</span>;
  }
  if (status === "ok") {
    return <span className="ipm-status ipm-status--ok" aria-label="Connected">✅</span>;
  }
  if (status === "error") {
    return <span className="ipm-status ipm-status--error" aria-label="Failed">❌</span>;
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InvitePhoneModal({
  roomName,
  onClose,
}: {
  roomName: string;
  onClose:  () => void;
}) {
  const [entries, setEntries] = useState<PhoneEntry[]>([makeEntry()]);
  const [busy, setBusy]       = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const updateEntry = useCallback(
    (id: string, patch: Partial<PhoneEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [],
  );

  const addRow = useCallback(() => {
    setEntries((prev) => [...prev, makeEntry()]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setEntries((prev) => {
      if (prev.length === 1) return prev;   // keep at least one row
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  // ── Dial all ─────────────────────────────────────────────────────────────────

  const handleCallAll = useCallback(async () => {
    const targets = entries.filter((e) => e.phone.trim());
    if (targets.length === 0) return;

    setBusy(true);

    // Mark all non-empty rows as "dialing"
    setEntries((prev) =>
      prev.map((e) =>
        e.phone.trim() ? { ...e, status: "dialing" as RowStatus, error: "" } : e,
      ),
    );

    // Fire all requests in parallel; collect results per-entry-id
    const results = await Promise.allSettled(
      targets.map(async (entry) => {
        const res = await fetch("/api/sip/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: entry.phone.trim(),
            lang:  entry.lang,
            room:  roomName,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
        }
        return entry.id;
      }),
    );

    // Apply per-row status
    const idToResult = new Map<string, PromiseSettledResult<string>>();
    results.forEach((r, i) => idToResult.set(targets[i].id, r));

    setEntries((prev) =>
      prev.map((e) => {
        const result = idToResult.get(e.id);
        if (!result) return e;
        if (result.status === "fulfilled") {
          return { ...e, status: "ok" as RowStatus, error: "" };
        }
        return {
          ...e,
          status: "error" as RowStatus,
          error:  result.reason instanceof Error ? result.reason.message : "Failed",
        };
      }),
    );

    setBusy(false);

    // Auto-close 1.5s after all calls succeed
    const allOk = results.every((r) => r.status === "fulfilled");
    if (allOk) {
      setTimeout(onClose, 1500);
    }
  }, [entries, roomName, onClose]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const hasValidEntry = entries.some((e) => e.phone.trim());

  return (
    /* Backdrop */
    <div className="ipm-backdrop" onClick={onClose}>
      {/* Modal card — stop click propagation so clicking inside doesn't close */}
      <div
        className="ipm-card"
        role="dialog"
        aria-modal="true"
        aria-label="Invite by phone"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ipm-header">
          <div className="ipm-header-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                fill="currentColor"
              />
            </svg>
            <h2 className="ipm-title">Invite by phone</h2>
          </div>
          <button className="ipm-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Column headings */}
        <div className="ipm-col-headings">
          <span className="ipm-col-label">Phone number (E.164)</span>
          <span className="ipm-col-label">Language</span>
        </div>

        {/* Entry rows */}
        <div className="ipm-rows">
          {entries.map((entry, idx) => (
            <div key={entry.id} className="ipm-row">
              {/* Phone input */}
              <div className="ipm-phone-wrap">
                <input
                  className={`ipm-phone-input${entry.status === "error" ? " ipm-phone-input--error" : ""}`}
                  type="tel"
                  placeholder="+1 (415) 555-1234"
                  value={entry.phone}
                  onChange={(e) => updateEntry(entry.id, { phone: e.target.value, status: "idle", error: "" })}
                  disabled={busy}
                  aria-label={`Phone number ${idx + 1}`}
                  autoComplete="tel"
                />
                <StatusIcon status={entry.status} />
              </div>

              {/* Language picker */}
              <select
                className="ipm-lang-select"
                value={entry.lang}
                onChange={(e) => updateEntry(entry.id, { lang: e.target.value })}
                disabled={busy}
                aria-label={`Language for caller ${idx + 1}`}
              >
                {PHONE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code === "none"
                      ? "👂 No translation (plain call)"
                      : `${l.flag} ${l.name}`}
                  </option>
                ))}
              </select>

              {/* Remove row button (only show when >1 row) */}
              {entries.length > 1 && (
                <button
                  className="ipm-remove-row"
                  onClick={() => removeRow(entry.id)}
                  disabled={busy}
                  aria-label={`Remove row ${idx + 1}`}
                  title="Remove"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}

              {/* Per-row error message */}
              {entry.status === "error" && entry.error && (
                <p className="ipm-row-error">{entry.error}</p>
              )}
            </div>
          ))}
        </div>

        {/* Add another number */}
        <button
          className="ipm-add-row"
          onClick={addRow}
          disabled={busy}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Add another number
        </button>

        {/* Footer */}
        <div className="ipm-footer">
          <button className="ipm-cancel" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="ipm-call-btn"
            onClick={handleCallAll}
            disabled={busy || !hasValidEntry}
          >
            {busy ? (
              <>
                <span className="ipm-spinner" aria-hidden />
                Dialing…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                    fill="currentColor"
                  />
                </svg>
                {entries.filter((e) => e.phone.trim()).length > 1
                  ? `Call ${entries.filter((e) => e.phone.trim()).length} numbers`
                  : "Call"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
