"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clipboard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Gift,
  LogOut,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

type Role = "admin" | "user";

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
  value?: number;
  currency?: string;
  batch?: string;
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
  const [editCard, setEditCard] = useState<GiftCard | null>(null);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<Role>("user");

  async function loadCards() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) setMessage(profileError.message);
      if (profile?.role) setRole(profile.role as Role);
    }

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
    const map: Record<string, number> = {};
    for (const c of cards) {
      if (c.status !== "available") continue;
      map[c.currency] = (map[c.currency] ?? 0) + Number(c.value);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [cards]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function restore(card: GiftCard) {
    if (role !== "admin") return;
    if (
      !window.confirm(
        `Restore gift card ${card.code} to Available?\n\nThis action will be recorded in the audit log.`
      )
    ) return;

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

  async function deleteCard(card: GiftCard) {
    if (role !== "admin") return;

    if (
      !window.confirm(
        `Delete gift card ${card.code}?\n\nThis removes the card from the active list. The deletion remains recorded in the audit log.`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("gift_cards")
      .delete()
      .eq("id", card.id);

    if (error) return setMessage(error.message);
    await loadCards();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard");
    window.setTimeout(() => setMessage(""), 1400);
  }

  function copyGiftCard(card: GiftCard) {
    const packet = [
      "Gift Card",
      `Code: ${card.code}`,
      `PIN: ${card.pin}`,
      `Value: ${Number(card.value).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })} ${card.currency}`,
    ].join("\n");

    navigator.clipboard.writeText(packet);
    setMessage("Gift card details copied");
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
            <>
              <a className="ghost" href="/admin/users">
                <Users size={16} /> Users
              </a>
              <a className="ghost" href="/admin/audit">Audit log</a>
            </>
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
          <small>Already issued</small>
        </article>
        <article className="stat-card wide">
          <span>Available value</span>
          <div className="currency-totals">
            {valuesByCurrency.length === 0 ? (
              <strong>—</strong>
            ) : (
              valuesByCurrency.map(([currency, amount]) => (
                <strong key={currency}>
                  {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                </strong>
              ))
            )}
          </div>
          <small>Values are kept separate by currency</small>
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

        {role === "admin" && (
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
            <span>
              {role === "admin"
                ? "Add a batch or change the current filter."
                : "No cards are available in the current view."}
            </span>
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
                {filtered.map((card) => {
                  const isUsed = card.status === "used";
                  return (
                    <tr key={card.id} className={isUsed ? "used-row" : ""}>
                      <td>
                        <span className={`status ${card.status}`}>
                          {isUsed ? "Used" : "Available"}
                        </span>
                      </td>
                      <td>
                        <div className="secret-row">
                          <code>{card.code}</code>
                          {!isUsed && (
                            <button
                              className="icon-btn"
                              title="Copy code, PIN and value"
                              onClick={() => copyGiftCard(card)}
                            >
                              <Clipboard size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        {isUsed ? (
                          <code className="used-secret">••••</code>
                        ) : (
                          <div className="secret-row">
                            <code>{visiblePins[card.id] ? card.pin : "••••"}</code>
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
                              {visiblePins[card.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        )}
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
                          ? new Date(card.used_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                        {card.used_by && <small>{card.used_by}</small>}
                      </td>
                      <td className="actions">
                        <div className="action-group">
                          {!isUsed ? (
                            <button
                              className="small-primary"
                              onClick={() => setUseCard(card)}
                            >
                              <CheckCircle2 size={15} /> Mark used
                            </button>
                          ) : role === "admin" ? (
                            <button className="link-btn" onClick={() => restore(card)}>
                              Restore
                            </button>
                          ) : (
                            <span className="used-lock">Used</span>
                          )}

                          {role === "admin" && !isUsed && (
                            <button
                              className="icon-action"
                              title="Edit gift card"
                              onClick={() => setEditCard(card)}
                            >
                              <Pencil size={15} />
                            </button>
                          )}

                          {role === "admin" && (
                            <button
                              className="icon-action danger-action"
                              title="Delete gift card"
                              onClick={() => deleteCard(card)}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {editCard && (
        <EditModal
          card={editCard}
          onClose={() => setEditCard(null)}
          onSaved={async () => {
            setEditCard(null);
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
  const [fileCards, setFileCards] = useState<ParsedCard[]>([]);
  const [fileName, setFileName] = useState("");
  const [value, setValue] = useState("750");
  const [currency, setCurrency] = useState("CHF");
  const [batch, setBatch] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"paste" | "file">("paste");

  const pastedCards = useMemo(() => parseGiftCards(raw), [raw]);
  const parsed = mode === "paste" ? pastedCards : fileCards;

  async function importFile(file?: File) {
    if (!file) return;
    setError("");
    setFileName(file.name);

    try {
      const lower = file.name.toLowerCase();

      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
          raw: false,
        });
        const cards = parseStructuredRows(rows);
        setFileCards(cards);
        if (!cards.length) {
          setError("No valid rows found. Use columns named code and pin.");
        }
        return;
      }

      const text = await file.text();
      const structured = parseCsvOrDelimited(text);
      setFileCards(structured.length ? structured : parseGiftCards(text));
      if (!(structured.length || parseGiftCards(text).length)) {
        setError("No valid code / PIN pairs found in the file.");
      }
    } catch {
      setFileCards([]);
      setError("The file could not be read. Please use CSV, XLSX, XLS or TXT.");
    }
  }

  async function save() {
    setError("");
    if (!parsed.length) return setError("No valid gift cards detected.");

    const defaultValue = Number(value);
    if ((!defaultValue || defaultValue <= 0) && parsed.some((c) => !c.value)) {
      return setError("Enter a valid default value per card.");
    }

    if (!/^[A-Za-z]{3}$/.test(currency) && parsed.some((c) => !c.currency)) {
      return setError("Currency must be a 3-letter code such as CHF, EUR or GBP.");
    }

    const normalizedRows = parsed.map((card) => ({
      code: card.code.trim(),
      pin: card.pin.trim(),
      value: Number(card.value ?? defaultValue),
      currency: String(card.currency ?? currency).toUpperCase().trim(),
      batch_label: (card.batch ?? batch).trim() || null,
      status: "available" as const,
    }));

    if (normalizedRows.some((r) => !r.value || r.value <= 0)) {
      return setError("Every card requires a value greater than zero.");
    }
    if (normalizedRows.some((r) => !/^[A-Z]{3}$/.test(r.currency))) {
      return setError("Every card requires a valid 3-letter currency.");
    }

    setSaving(true);
    const { error } = await supabase.from("gift_cards").insert(normalizedRows);
    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        setError("At least one gift card code already exists. Nothing was imported.");
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
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <p className="eyebrow">NEW BATCH</p>
        <h2>Add gift cards</h2>
        <p className="muted">
          Paste code and PIN pairs directly, or upload CSV / Excel. You can set
          one value and currency for the whole batch or provide them as file columns.
        </p>

        <div className="import-tabs">
          <button
            className={mode === "paste" ? "active" : ""}
            onClick={() => setMode("paste")}
          >
            <Clipboard size={16} /> Paste codes
          </button>
          <button
            className={mode === "file" ? "active" : ""}
            onClick={() => setMode("file")}
          >
            <FileSpreadsheet size={16} /> CSV / Excel
          </button>
        </div>

        <div className="two-col">
          <label>
            Default value per card
            <input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <label>
            Default currency
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
            placeholder="e.g. Supplier gifts · August 2026"
          />
        </label>

        {mode === "paste" ? (
          <label>
            Codes and PINs
            <textarea
              rows={9}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={
                "638889001467108225188    2717\n638889001595108225194    2412\n638889001452108225205    2895"
              }
            />
          </label>
        ) : (
          <div className="file-drop">
            <label className="file-button file-button-large">
              <Upload size={18} /> Choose CSV / Excel file
              <input
                hidden
                type="file"
                accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => importFile(e.target.files?.[0])}
              />
            </label>
            <span>{fileName || "No file selected"}</span>
            <small>
              Recommended columns: <code>code</code>, <code>pin</code>, <code>value</code>,{" "}
              <code>currency</code>, <code>batch</code>. Only code and pin are required.
            </small>
          </div>
        )}

        <div className="import-summary">
          <strong>
            {parsed.length} valid card{parsed.length === 1 ? "" : "s"} detected
          </strong>
          {parsed.length > 0 && (
            <span>
              {parsed.every((p) => p.value && p.currency)
                ? "Using values and currencies from the file where provided."
                : `Default: ${value || "—"} ${currency || "—"} per card`}
            </span>
          )}
        </div>

        {parsed.length > 0 && (
          <div className="preview">
            <div className="preview-header">
              <span>Code</span><span>PIN</span><span>Value</span>
            </div>
            {parsed.slice(0, 6).map((p) => (
              <div key={p.code}>
                <code>{p.code}</code>
                <span>{p.pin}</span>
                <span>{p.value ?? value} {p.currency ?? currency}</span>
              </div>
            ))}
            {parsed.length > 6 && <small>+ {parsed.length - 6} more</small>}
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save} disabled={saving || !parsed.length}>
            {saving ? "Importing…" : `Import ${parsed.length || ""} gift cards`}
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
    if (!recipient.trim()) {
      return setError("Please enter the recipient or vendor.");
    }

    if (
      !window.confirm(
        `Mark this ${card.value} ${card.currency} gift card as used for ${recipient.trim()}?\n\nIt will be removed from the available balance.`
      )
    ) return;

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
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <p className="eyebrow">ISSUE GIFT CARD</p>
        <h2>Mark as used</h2>
        <p className="muted">
          Used cards are greyed out and excluded from the available balance.
        </p>

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


function EditModal({
  card,
  onClose,
  onSaved,
}: {
  card: GiftCard;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(card.code);
  const [pin, setPin] = useState(card.pin);
  const [value, setValue] = useState(String(card.value));
  const [currency, setCurrency] = useState(card.currency);
  const [batch, setBatch] = useState(card.batch_label ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setError("");

    if (!code.trim() || !pin.trim()) {
      return setError("Code and PIN are required.");
    }

    const numericValue = Number(value);
    if (!numericValue || numericValue <= 0) {
      return setError("Enter a valid value greater than zero.");
    }

    const normalizedCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      return setError("Currency must be a 3-letter code such as CHF, EUR or GBP.");
    }

    setSaving(true);
    const { error } = await supabase
      .from("gift_cards")
      .update({
        code: code.trim(),
        pin: pin.trim(),
        value: numericValue,
        currency: normalizedCurrency,
        batch_label: batch.trim() || null,
      })
      .eq("id", card.id)
      .eq("status", "available");

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        return setError("This gift card code already exists.");
      }
      return setError(error.message);
    }

    onSaved();
  }

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <p className="eyebrow">ADMIN</p>
        <h2>Edit gift card</h2>
        <p className="muted">
          Changes are written to the audit log. Used cards must be restored before editing.
        </p>

        <label>
          Code
          <input value={code} onChange={(e) => setCode(e.target.value)} />
        </label>

        <label>
          PIN
          <input value={pin} onChange={(e) => setPin(e.target.value)} />
        </label>

        <div className="two-col">
          <label>
            Value
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
            />
          </label>
        </div>

        <label>
          Batch <span className="optional">(optional)</span>
          <input value={batch} onChange={(e) => setBatch(e.target.value)} />
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
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

    const match = trimmed.match(
      /^["']?([A-Za-z0-9_-]{8,})["']?[\s,;]+["']?([A-Za-z0-9_-]{3,12})["']?/
    );
    if (!match) continue;

    const code = match[1];
    const pin = match[2];
    if (seen.has(code)) continue;
    seen.add(code);
    rows.push({ code, pin });
  }

  return rows;
}

function normalizeKey(key: string) {
  return key.toLowerCase().trim().replace(/[\s_-]+/g, "");
}

function parseStructuredRows(rows: Record<string, unknown>[]): ParsedCard[] {
  const seen = new Set<string>();
  const output: ParsedCard[] = [];

  for (const row of rows) {
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      normalized[normalizeKey(key)] = val;
    }

    const code = String(
      normalized.code ?? normalized.giftcardcode ?? normalized.cardcode ?? ""
    ).trim();
    const pin = String(
      normalized.pin ?? normalized.pincode ?? normalized.giftcardpin ?? ""
    ).trim();

    if (!code || !pin || seen.has(code)) continue;

    const rawValue = normalized.value ?? normalized.amount ?? normalized.cardvalue;
    const numericValue =
      rawValue === undefined || rawValue === ""
        ? undefined
        : Number(String(rawValue).replace(/[^\d.,-]/g, "").replace(",", "."));

    const rawCurrency = String(
      normalized.currency ?? normalized.curr ?? ""
    ).trim().toUpperCase();

    const rawBatch = String(
      normalized.batch ?? normalized.batchlabel ?? normalized.description ?? ""
    ).trim();

    seen.add(code);
    output.push({
      code,
      pin,
      value: numericValue && numericValue > 0 ? numericValue : undefined,
      currency: /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : undefined,
      batch: rawBatch || undefined,
    });
  }

  return output;
}

function parseCsvOrDelimited(input: string): ParsedCard[] {
  const lines = input.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delimiter =
    lines[0].includes("\t") ? "\t" :
    lines[0].includes(";") ? ";" : ",";

  const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, "").trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, "").trim());
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });

  return parseStructuredRows(rows);
}
