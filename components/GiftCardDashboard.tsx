"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clipboard,
  Eye,
  EyeOff,
  Gift,
  LogOut,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GiftCard = {
  id: string;
  code: string;
  pin: string;
  value: number;
  currency: string;
  status: "available" | "used";
  batch_label: string | null;
  recipient: string | null;
  note: string | null;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
};

type ParsedCard = {
  code: string;
  pin: string;
};

const supabase = createClient();

export default function GiftCardDashboard({
  userEmail,
}: {
  userEmail: string;
}) {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "used">("all");
  const [showUpload, setShowUpload] = useState(false);
  const [useCard, setUseCard] = useState<GiftCard | null>(null);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "viewer">("viewer");

  async function loadCards() {
    setLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .single();
    if (profile?.role) setRole(profile.role);
    const { data, error } = await supabase
      .from("gift_cards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setMessage(error.message);
    setCards((data as GiftCard[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCards();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesFilter = filter === "all" || card.status === filter;
      const matchesQuery =
        !q ||
        card.code.toLowerCase().includes(q) ||
        card.currency.toLowerCase().includes(q) ||
        (card.recipient ?? "").toLowerCase().includes(q) ||
        (card.batch_label ?? "").toLowerCase().includes(q) ||
        (card.note ?? "").toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [cards, query, filter]);

  const available = cards.filter((c) => c.status === "available").length;
  const used = cards.filter((c) => c.status === "used").length;

  const valuesByCurrency = useMemo(() => {
    const map: Record<string, { available: number; total: number }> = {};
    for (const c of cards) {
      map[c.currency] ??= { available: 0, total: 0 };
      map[c.currency].total += Number(c.value);
      if (c.status === "available") map[c.currency].available += Number(c.value);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [cards]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function restore(card: GiftCard) {
    if (!window.confirm("Mark this gift card as available again?")) return;
    const { error } = await supabase
      .from("gift_cards")
      .update({
        status: "available",
        recipient: null,
        note: null,
        used_at: null,
        used_by: null,
      })
      .eq("id", card.id);
    if (error) return setMessage(error.message);
    await loadCards();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard");
    window.setTimeout(() => setMessage(""), 1400);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">GIFT CARD MANAGEMENT · INTERNAL</p>
          <h1>Gift Card Manager</h1>
        </div>
        <div className="user-area">
          <span className="user-email">{userEmail} · {role}</span>
          {role === "admin" && (
            <a className="ghost" href="/admin/audit">Audit log</a>
          )}
          <button className="ghost" onClick={logout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Available cards</span>
          <strong>{available}</strong>
          <small>Ready to issue</small>
        </article>
        <article className="stat-card">
          <span>Used cards</span>
          <strong>{used}</strong>
          <small>Recorded as issued</small>
        </article>
        <article className="stat-card wide">
          <span>Available value</span>
          <div className="currency-totals">
            {valuesByCurrency.length === 0 ? (
              <strong>—</strong>
            ) : (
              valuesByCurrency.map(([currency, amounts]) => (
                <strong key={currency}>
                  {amounts.available.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {currency}
                </strong>
              ))
            )}
          </div>
          <small>Never combine different currencies</small>
        </article>
      </section>

      <section className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search code, recipient, batch…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="segmented">
          {(["all", "available", "used"] as const).map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "available" ? "Available" : "Used"}
            </button>
          ))}
        </div>
        {role !== "viewer" && (
          <button className="primary" onClick={() => setShowUpload(true)}>
            <Plus size={18} /> Add gift cards
          </button>
        )}
      </section>

      {message && <div className="notice">{message}</div>}

      <section className="table-card">
        {loading ? (
          <div className="empty">Loading gift cards…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <Gift size={30} />
            <strong>No gift cards found</strong>
            <span>Add a batch or change the current filter.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Code</th>
                  <th>PIN</th>
                  <th>Value</th>
                  <th>Batch</th>
                  <th>Recipient / Vendor</th>
                  <th>Used</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((card) => (
                  <tr key={card.id}>
                    <td>
                      <span className={`status ${card.status}`}>
                        {card.status === "available" ? "Available" : "Used"}
                      </span>
                    </td>
                    <td>
                      <div className="secret-row">
                        <code>{card.code}</code>
                        <button
                          className="icon-btn"
                          title="Copy code"
                          onClick={() => copy(card.code)}
                        >
                          <Clipboard size={15} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="secret-row">
                        <code>
                          {visiblePins[card.id] ? card.pin : "••••"}
                        </code>
                        <button
                          className="icon-btn"
                          title="Show or hide PIN"
                          onClick={() =>
                            setVisiblePins((s) => ({
                              ...s,
                              [card.id]: !s[card.id],
                            }))
                          }
                        >
                          {visiblePins[card.id] ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>
                        {visiblePins[card.id] && (
                          <button
                            className="icon-btn"
                            title="Copy PIN"
                            onClick={() => copy(card.pin)}
                          >
                            <Clipboard size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="nowrap">
                      {Number(card.value).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      {card.currency}
                    </td>
                    <td>{card.batch_label || "—"}</td>
                    <td>
                      <div>{card.recipient || "—"}</div>
                      {card.note && <small>{card.note}</small>}
                    </td>
                    <td className="nowrap">
                      {card.used_at
                        ? new Date(card.used_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="actions">
                      {role === "viewer" ? (
                        <span className="user-email">Read only</span>
                      ) : card.status === "available" ? (
                        <button
                          className="small-primary"
                          onClick={() => setUseCard(card)}
                        >
                          <CheckCircle2 size={15} /> Mark used
                        </button>
                      ) : (
                        <button className="link-btn" onClick={() => restore(card)}>
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSaved={async () => {
            setShowUpload(false);
            await loadCards();
          }}
        />
      )}

      {useCard && (
        <UseModal
          card={useCard}
          userEmail={userEmail}
          onClose={() => setUseCard(null)}
          onSaved={async () => {
            setUseCard(null);
            await loadCards();
          }}
        />
      )}
    </main>
  );
}

function UploadModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [value, setValue] = useState("750");
  const [currency, setCurrency] = useState("CHF");
  const [batch, setBatch] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseGiftCards(raw), [raw]);

  function importFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function save() {
    setError("");
    if (!parsed.length) return setError("No valid code / PIN pairs found.");
    if (!value || Number(value) <= 0) return setError("Enter a valid value.");
    if (!/^[A-Za-z]{3}$/.test(currency))
      return setError("Currency must be a 3-letter code such as CHF, EUR or GBP.");

    setSaving(true);

    const rows = parsed.map((card) => ({
      code: card.code,
      pin: card.pin,
      value: Number(value),
      currency: currency.toUpperCase(),
      batch_label: batch.trim() || null,
      status: "available",
    }));

    const { error } = await supabase.from("gift_cards").insert(rows);

    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        setError("At least one gift card code already exists.");
      } else {
        setError(error.message);
      }
      return;
    }

    onSaved();
  }

  return (
    <div className="modal-backdrop">
      <section className="modal large-modal">
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <p className="eyebrow">NEW BATCH</p>
        <h2>Add gift cards</h2>
        <p className="muted">
          Paste the lines you receive from the gift card request, or upload a
          TXT/CSV file. Each row must contain a code followed by its PIN.
        </p>

        <div className="two-col">
          <label>
            Value per card
            <input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <label>
            Currency
            <input
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="CHF"
            />
          </label>
        </div>

        <label>
          Batch name <span className="optional">(optional)</span>
          <input
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="e.g. Aug 2026 · Gift Card Management suppliers"
          />
        </label>

        <label>
          Codes and PINs
          <textarea
            rows={8}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"638889001467108225188    2717\n638889001595108225194    2412"}
          />
        </label>

        <div className="upload-line">
          <label className="file-button">
            <Upload size={16} /> Upload TXT / CSV
            <input
              hidden
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              onChange={(e) => importFile(e.target.files?.[0])}
            />
          </label>
          <span>
            {parsed.length
              ? `${parsed.length} valid card${parsed.length === 1 ? "" : "s"} detected`
              : "No cards detected yet"}
          </span>
        </div>

        {parsed.length > 0 && (
          <div className="preview">
            {parsed.slice(0, 5).map((p) => (
              <div key={p.code}>
                <code>{p.code}</code>
                <span>PIN {p.pin}</span>
              </div>
            ))}
            {parsed.length > 5 && <small>+ {parsed.length - 5} more</small>}
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : `Add ${parsed.length || ""} gift cards`}
          </button>
        </div>
      </section>
    </div>
  );
}

function UseModal({
  card,
  userEmail,
  onClose,
  onSaved,
}: {
  card: GiftCard;
  userEmail: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!recipient.trim()) return setError("Please enter the recipient or vendor.");

    setSaving(true);
    const { error } = await supabase
      .from("gift_cards")
      .update({
        status: "used",
        recipient: recipient.trim(),
        note: note.trim() || null,
        used_at: new Date().toISOString(),
        used_by: userEmail,
      })
      .eq("id", card.id)
      .eq("status", "available");

    setSaving(false);
    if (error) return setError(error.message);
    onSaved();
  }

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <p className="eyebrow">ISSUE GIFT CARD</p>
        <h2>Mark as used</h2>

        <div className="card-summary">
          <div><span>Code</span><code>{card.code}</code></div>
          <div><span>Value</span><strong>{card.value} {card.currency}</strong></div>
        </div>

        <label>
          Recipient / vendor
          <input
            autoFocus
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="e.g. Tsebo / Supplier name"
          />
        </label>

        <label>
          Note <span className="optional">(optional)</span>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason, Jira ticket, contact person…"
          />
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Confirm used"}
          </button>
        </div>
      </section>
    </div>
  );
}

function parseGiftCards(input: string): ParsedCard[] {
  const seen = new Set<string>();
  const rows: ParsedCard[] = [];

  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Supports tab, spaces, comma or semicolon between code and PIN.
    const match = trimmed.match(/^["']?(\d{8,})["']?[\s,;]+["']?(\d{3,8})["']?/);
    if (!match) continue;

    const code = match[1];
    const pin = match[2];
    if (seen.has(code)) continue;
    seen.add(code);
    rows.push({ code, pin });
  }

  return rows;
}
