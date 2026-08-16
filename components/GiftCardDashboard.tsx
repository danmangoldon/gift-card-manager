"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Gift,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  Users,
  X,
  Archive,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

type Role = "admin" | "user";
type ViewStatus = "available" | "partial" | "used";

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
  remaining_balance: number | null;
  last_balance_check: string | null;
};

type ParsedCard = {
  code: string;
  pin: string;
  value?: number;
  currency?: string;
  batch?: string;
};

const supabase = createClient();
const BALANCE_CHECK_URL =
  "https://wwws-uk2.givex.com/merchant_balcheck/300000171_en/";

const STATUS_PRIORITY: Record<ViewStatus, number> = {
  available: 0,
  partial: 1,
  used: 2,
};

function effectiveBalance(card: GiftCard) {
  if (card.status === "used") return 0;
  return card.remaining_balance == null
    ? Number(card.value)
    : Number(card.remaining_balance);
}

function effectiveStatus(card: GiftCard): ViewStatus {
  if (card.status === "used") return "used";

  const balance = effectiveBalance(card);
  const original = Number(card.value);

  if (balance <= 0) return "used";
  if (balance < original) return "partial";
  return "available";
}

function formatMoney(value: number) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export default function GiftCardDashboard({
  userEmail,
}: {
  userEmail: string;
}) {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ViewStatus>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [useCard, setUseCard] = useState<GiftCard | null>(null);
  const [editCard, setEditCard] = useState<GiftCard | null>(null);
  const [balanceCard, setBalanceCard] = useState<GiftCard | null>(null);
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

    return cards
      .filter((card) => {
        const status = effectiveStatus(card);
        const matchesFilter = filter === "all" || status === filter;

        const matchesQuery =
          !q ||
          card.code.toLowerCase().includes(q) ||
          card.currency.toLowerCase().includes(q) ||
          (card.recipient ?? "").toLowerCase().includes(q) ||
          (card.batch_label ?? "").toLowerCase().includes(q) ||
          (card.note ?? "").toLowerCase().includes(q);

        return matchesFilter && matchesQuery;
      })
      .sort((a, b) => {
        const statusA = effectiveStatus(a);
        const statusB = effectiveStatus(b);

        const byStatus =
          STATUS_PRIORITY[statusA] - STATUS_PRIORITY[statusB];

        if (byStatus !== 0) return byStatus;

        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      });
  }, [cards, query, filter]);

  const available = cards.filter(
    (c) => effectiveStatus(c) === "available"
  ).length;

  const partial = cards.filter(
    (c) => effectiveStatus(c) === "partial"
  ).length;

  const used = cards.filter(
    (c) => effectiveStatus(c) === "used"
  ).length;

  const valuesByCurrency = useMemo(() => {
    const map: Record<string, number> = {};

    for (const card of cards) {
      const balance = effectiveBalance(card);
      if (balance <= 0) continue;

      map[card.currency] = (map[card.currency] ?? 0) + balance;
    }

    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [cards]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function restore(card: GiftCard) {
    if (role !== "admin") return;

    const { error } = await supabase
      .from("gift_cards")
      .update({
        status: "available",
        recipient: null,
        note: null,
        used_at: null,
        used_by: null,
        remaining_balance: Number(card.value),
      })
      .eq("id", card.id);

    if (error) return setMessage(error.message);

    await loadCards();

    setMessage("Gift card restored");
    window.setTimeout(() => setMessage(""), 1400);
  }

  async function deleteCard(card: GiftCard) {
    if (role !== "admin") return;

    const { error } = await supabase
      .from("gift_cards")
      .delete()
      .eq("id", card.id);

    if (error) return setMessage(error.message);

    await loadCards();

    setMessage("Gift card deleted");
    window.setTimeout(() => setMessage(""), 1400);
  }

  function copyGiftCard(card: GiftCard) {
    const packet = [
      "Gift Card",
      `Code: ${card.code}`,
      `PIN: ${card.pin}`,
      `Value: ${formatMoney(Number(card.value))} ${card.currency}`,
    ].join("\n");

    navigator.clipboard.writeText(packet);

    setMessage("Gift card details copied");
    window.setTimeout(() => setMessage(""), 1400);
  }

  return (
    <main className="lean-shell">
      <aside className="lean-sidebar">
        <div className="lean-brand">on</div>

        <nav className="lean-nav">
          <a className="active" href="/">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </a>

          <a href="#gift-cards">
            <Gift size={18} />
            <span>Gift cards</span>
          </a>

          <a href="#gift-cards">
            <Archive size={18} />
            <span>Batches</span>
          </a>

          {role === "admin" && (
            <>
              <a href="/admin/audit">
                <FileText size={18} />
                <span>Audit log</span>
              </a>

              <a href="/admin/users">
                <Users size={18} />
                <span>Users</span>
              </a>

              <a href="/admin/users">
                <Settings size={18} />
                <span>Settings</span>
              </a>
            </>
          )}
        </nav>

        <div className="lean-profile">
          <div className="lean-avatar">
            {userEmail.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{userEmail.split("@")[0]}</strong>
            <small>{role === "admin" ? "Admin" : "User"}</small>
          </div>
        </div>
      </aside>

      <section className="lean-content">
        <header className="lean-header">
          <div>
            <p className="eyebrow">GIFT CARD MANAGEMENT · INTERNAL</p>
            <h1>Dashboard</h1>
          </div>

          <div className="lean-header-actions">
            <span className="lean-user-meta">
              {userEmail} · {role}
            </span>

            {role === "admin" && (
              <>
                <a className="lean-icon-button" href="/admin/users" title="Users">
                  <Users size={17} />
                </a>
                <a className="lean-icon-button" href="/admin/audit" title="Audit log">
                  <FileText size={17} />
                </a>
              </>
            )}

            <button className="lean-signout" onClick={logout}>
              <LogOut size={17} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <section className="lean-stats">
          <article className="lean-stat available-stat">
            <div className="lean-stat-icon">
              <Gift size={21} />
            </div>
            <div>
              <span>Available cards</span>
              <strong>{available}</strong>
              <small>Full balance available</small>
            </div>
          </article>

          <article className="lean-stat partial-stat">
            <div className="lean-stat-icon">◔</div>
            <div>
              <span>Partially used</span>
              <strong>{partial}</strong>
              <small>Remaining balance available</small>
            </div>
          </article>

          <article className="lean-stat used-stat">
            <div className="lean-stat-icon">
              <CheckCircle2 size={21} />
            </div>
            <div>
              <span>Used cards</span>
              <strong>{used}</strong>
              <small>No remaining balance</small>
            </div>
          </article>

          <article className="lean-value-card">
            <div className="lean-value-title">
              Available value <span>(latest balances)</span>
            </div>

            <div className="lean-currency-values">
              {valuesByCurrency.length === 0 ? (
                <strong>—</strong>
              ) : (
                valuesByCurrency.map(([currency, amount]) => (
                  <div key={currency}>
                    <strong>{formatMoney(amount)}</strong>
                    <span>{currency}</span>
                  </div>
                ))
              )}
            </div>

            <small>Values are kept separate by currency</small>
          </article>
        </section>

        <section className="lean-toolbar">
          <div className="lean-search">
            <Search size={18} />
            <input
              placeholder="Search code, recipient, batch..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="lean-filters">
            {(["all", "available", "partial", "used"] as const).map((f) => (
              <button
                key={f}
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f === "all"
                  ? "All"
                  : f === "available"
                  ? "Available"
                  : f === "partial"
                  ? "Partially used"
                  : "Used"}
              </button>
            ))}
          </div>

          {role === "admin" && (
            <button className="lean-add" onClick={() => setShowUpload(true)}>
              <Plus size={18} />
              Add gift card
            </button>
          )}
        </section>

        {message && <div className="notice">{message}</div>}

        <section className="lean-table-card" id="gift-cards">
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
            <div className="table-wrap responsive-gift-table lean-table-wrap">
              <table className="lean-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Code</th>
                    <th>PIN</th>
                    <th>Original</th>
                    <th>Remaining</th>
                    <th>Currency</th>
                    <th>Batch</th>
                    <th>Recipient / Vendor</th>
                    <th>Last check</th>
                    <th>Used</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((card) => {
                    const viewStatus = effectiveStatus(card);
                    const isUsed = viewStatus === "used";
                    const remaining = effectiveBalance(card);

                    return (
                      <tr
                        key={card.id}
                        className={
                          viewStatus === "used"
                            ? "used-row"
                            : viewStatus === "partial"
                            ? "partial-row"
                            : ""
                        }
                      >
                        <td data-label="Status">
                          <span className={`status ${viewStatus}`}>
                            {viewStatus === "used"
                              ? "Used"
                              : viewStatus === "partial"
                              ? "Partially used"
                              : "Available"}
                          </span>
                        </td>

                        <td data-label="Code">
                          <div className="secret-row">
                            <code>{card.code}</code>

                            {!isUsed && (
                              <button
                                className="icon-btn"
                                title="Copy code, PIN and value"
                                onClick={() => copyGiftCard(card)}
                              >
                                <Clipboard size={14} />
                              </button>
                            )}
                          </div>
                        </td>

                        <td data-label="PIN">
                          {isUsed ? (
                            <code className="used-secret">••••</code>
                          ) : (
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
                                  <EyeOff size={14} />
                                ) : (
                                  <Eye size={14} />
                                )}
                              </button>
                            </div>
                          )}
                        </td>

                        <td data-label="Original">
                          {formatMoney(Number(card.value))}
                        </td>

                        <td data-label="Remaining">
                          <strong className={`balance-value ${viewStatus}`}>
                            {formatMoney(remaining)}
                          </strong>
                        </td>

                        <td data-label="Currency">{card.currency}</td>

                        <td data-label="Batch">{card.batch_label || "—"}</td>

                        <td data-label="Recipient / Vendor">
                          <div>{card.recipient || "—"}</div>
                          {card.note && <small>{card.note}</small>}
                        </td>

                        <td data-label="Last check">
                          {card.last_balance_check
                            ? new Date(card.last_balance_check).toLocaleString(
                                undefined,
                                {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }
                              )
                            : "—"}
                        </td>

                        <td data-label="Used">
                          {card.used_at
                            ? new Date(card.used_at).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>

                        <td data-label="Actions" className="actions">
                          <div className="lean-actions">
                            {!isUsed ? (
                              <button
                                className="lean-check-button"
                                title="Check balance"
                                onClick={() => setBalanceCard(card)}
                              >
                                <span>Check</span>
                                <ExternalLink size={13} />
                              </button>
                            ) : role === "admin" ? (
                              <button
                                className="lean-restore"
                                onClick={() => restore(card)}
                              >
                                Restore
                              </button>
                            ) : (
                              <span className="used-lock">Used</span>
                            )}

                            {role === "admin" && !isUsed && (
                              <button
                                className="lean-icon-action"
                                title="Edit gift card"
                                onClick={() => setEditCard(card)}
                              >
                                <Pencil size={14} />
                              </button>
                            )}

                            {role === "admin" && (
                              <button
                                className="lean-icon-action"
                                title="Delete gift card"
                                onClick={() => deleteCard(card)}
                              >
                                <Trash2 size={14} />
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

      {balanceCard && (
        <BalanceCheckModal
          card={balanceCard}
          onClose={() => setBalanceCard(null)}
          onSaved={async () => {
            setBalanceCard(null);
            await loadCards();
            setMessage("Balance updated");
            window.setTimeout(() => setMessage(""), 1400);
          }}
        />
      )}
    </main>
  );
}

function BalanceCheckModal({
  card,
  onClose,
  onSaved,
}: {
  card: GiftCard;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [remaining, setRemaining] = useState(
    String(effectiveBalance(card))
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function openBalanceCheck() {
    await navigator.clipboard.writeText(card.code);
    window.open(BALANCE_CHECK_URL, "_blank", "noopener,noreferrer");
  }

  async function saveBalance() {
    setError("");

    const value = Number(remaining);
    const original = Number(card.value);

    if (Number.isNaN(value) || value < 0) {
      return setError("Enter a valid remaining balance.");
    }

    if (value > original) {
      return setError(
        "Remaining balance cannot be higher than the original value."
      );
    }

    setSaving(true);

    const updates: Record<string, unknown> = {
      remaining_balance: value,
      last_balance_check: new Date().toISOString(),
    };

    if (value === 0) {
      updates.status = "used";
      updates.used_at = card.used_at ?? new Date().toISOString();
    }

    const { error } = await supabase
      .from("gift_cards")
      .update(updates)
      .eq("id", card.id);

    setSaving(false);

    if (error) return setError(error.message);

    onSaved();
  }

  return (
    <div className="modal-backdrop">
      <section className="modal balance-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <p className="eyebrow">BALANCE CHECK</p>
        <h2>Check gift card balance</h2>

        <p className="muted">
          Only the gift card code is required. The code will be copied
          automatically.
        </p>

        <div className="card-summary">
          <div>
            <span>Code</span>
            <code>{card.code}</code>
          </div>

          <div>
            <span>Original value</span>
            <strong>
              {formatMoney(Number(card.value))} {card.currency}
            </strong>
          </div>
        </div>

        <button className="primary full" onClick={openBalanceCheck}>
          <ExternalLink size={17} />
          Open official balance check
        </button>

        <div className="balance-help">
          Complete the “I’m not a robot” check on the external page, enter
          the copied code, then return here and save the displayed balance.
        </div>

        <label>
          Remaining balance

          <div className="money-input">
            <input
              type="number"
              min="0"
              max={card.value}
              step="0.01"
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
            />
            <span>{card.currency}</span>
          </div>
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>

          <button
            className="primary"
            onClick={saveBalance}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save balance"}
          </button>
        </div>
      </section>
    </div>
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
      const fallback = parseGiftCards(text);

      setFileCards(structured.length ? structured : fallback);

      if (!(structured.length || fallback.length)) {
        setError("No valid code / PIN pairs found in the file.");
      }
    } catch {
      setFileCards([]);
      setError(
        "The file could not be read. Please use CSV, XLSX, XLS or TXT."
      );
    }
  }

  async function save() {
    setError("");

    if (!parsed.length) return setError("No valid gift cards detected.");

    const defaultValue = Number(value);

    if ((!defaultValue || defaultValue <= 0) && parsed.some((c) => !c.value)) {
      return setError("Enter a valid default value per card.");
    }

    if (
      !/^[A-Za-z]{3}$/.test(currency) &&
      parsed.some((c) => !c.currency)
    ) {
      return setError(
        "Currency must be a 3-letter code such as CHF, EUR or GBP."
      );
    }

    const normalizedRows = parsed.map((card) => {
      const cardValue = Number(card.value ?? defaultValue);

      return {
        code: card.code.trim(),
        pin: card.pin.trim(),
        value: cardValue,
        currency: String(card.currency ?? currency)
          .toUpperCase()
          .trim(),
        batch_label: (card.batch ?? batch).trim() || null,
        status: "available" as const,
        remaining_balance: cardValue,
      };
    });

    if (normalizedRows.some((r) => !r.value || r.value <= 0)) {
      return setError("Every card requires a value greater than zero.");
    }

    if (normalizedRows.some((r) => !/^[A-Z]{3}$/.test(r.currency))) {
      return setError(
        "Every card requires a valid 3-letter currency."
      );
    }

    setSaving(true);

    const { error } = await supabase
      .from("gift_cards")
      .insert(normalizedRows);

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        setError(
          "At least one gift card code already exists. Nothing was imported."
        );
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
          Paste code and PIN pairs directly, or upload CSV / Excel.
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
                "638889001467108225188    2717\n638889001595108225194    2412"
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
                accept=".csv,.txt,.xlsx,.xls"
                onChange={(e) => importFile(e.target.files?.[0])}
              />
            </label>

            <span>{fileName || "No file selected"}</span>

            <small>
              Recommended columns: <code>code</code>, <code>pin</code>,{" "}
              <code>value</code>, <code>currency</code>, <code>batch</code>.
            </small>
          </div>
        )}

        <div className="import-summary">
          <strong>
            {parsed.length} valid card{parsed.length === 1 ? "" : "s"} detected
          </strong>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>

          <button
            className="primary"
            onClick={save}
            disabled={saving || !parsed.length}
          >
            {saving
              ? "Importing…"
              : `Import ${parsed.length || ""} gift cards`}
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

    setSaving(true);

    const { error } = await supabase
      .from("gift_cards")
      .update({
        status: "used",
        recipient: recipient.trim(),
        note: note.trim() || null,
        used_at: new Date().toISOString(),
        used_by: userEmail,
        remaining_balance: 0,
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

        <div className="card-summary">
          <div>
            <span>Code</span>
            <code>{card.code}</code>
          </div>

          <div>
            <span>Value</span>
            <strong>
              {card.value} {card.currency}
            </strong>
          </div>
        </div>

        <label>
          Recipient / vendor
          <input
            autoFocus
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </label>

        <label>
          Note <span className="optional">(optional)</span>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>

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
      return setError(
        "Currency must be a 3-letter code such as CHF, EUR or GBP."
      );
    }

    const currentRemaining = effectiveBalance(card);

    const newRemaining =
      card.remaining_balance == null ||
      currentRemaining === Number(card.value)
        ? numericValue
        : Math.min(currentRemaining, numericValue);

    setSaving(true);

    const { error } = await supabase
      .from("gift_cards")
      .update({
        code: code.trim(),
        pin: pin.trim(),
        value: numericValue,
        currency: normalizedCurrency,
        batch_label: batch.trim() || null,
        remaining_balance: newRemaining,
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
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>

          <button
            className="primary"
            onClick={save}
            disabled={saving}
          >
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

function parseStructuredRows(
  rows: Record<string, unknown>[]
): ParsedCard[] {
  const seen = new Set<string>();
  const output: ParsedCard[] = [];

  for (const row of rows) {
    const normalized: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(row)) {
      normalized[normalizeKey(key)] = val;
    }

    const code = String(
      normalized.code ??
        normalized.giftcardcode ??
        normalized.cardcode ??
        ""
    ).trim();

    const pin = String(
      normalized.pin ??
        normalized.pincode ??
        normalized.giftcardpin ??
        ""
    ).trim();

    if (!code || !pin || seen.has(code)) continue;

    const rawValue =
      normalized.value ??
      normalized.amount ??
      normalized.cardvalue;

    const numericValue =
      rawValue === undefined || rawValue === ""
        ? undefined
        : Number(
            String(rawValue)
              .replace(/[^\d.,-]/g, "")
              .replace(",", ".")
          );

    const rawCurrency = String(
      normalized.currency ??
        normalized.curr ??
        ""
    )
      .trim()
      .toUpperCase();

    const rawBatch = String(
      normalized.batch ??
        normalized.batchlabel ??
        normalized.description ??
        ""
    ).trim();

    seen.add(code);

    output.push({
      code,
      pin,
      value:
        numericValue && numericValue > 0
          ? numericValue
          : undefined,
      currency: /^[A-Z]{3}$/.test(rawCurrency)
        ? rawCurrency
        : undefined,
      batch: rawBatch || undefined,
    });
  }

  return output;
}

function parseCsvOrDelimited(input: string): ParsedCard[] {
  const lines = input.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) return [];

  const delimiter = lines[0].includes("\t")
    ? "\t"
    : lines[0].includes(";")
    ? ";"
    : ",";

  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.replace(/^["']|["']$/g, "").trim());

  const rows = lines.slice(1).map((line) => {
    const cells = line
      .split(delimiter)
      .map((c) => c.replace(/^["']|["']$/g, "").trim());

    return Object.fromEntries(
      headers.map((h, i) => [h, cells[i] ?? ""])
    );
  });

  return parseStructuredRows(rows);
}
