import React, { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import "../styles/AdminPanel.css";

const API = "/api";

export default function MailsAdminPage({ me }) {
  const adminId = me?.id;
  const adminEmail = me?.email;

  const [users, setUsers] = useState([]);
  const [sent, setSent] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    toUserId: "",
    subject: "",
    body: "",
  });

  const fetchUsers = useCallback(async () => {
    const res = await authFetch(`${API}/admin/users`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, []);

  const fetchSent = useCallback(async () => {
    if (!adminId) return [];
    const url = `${API}/mails/sent/${adminId}`;
    console.log("📩 Fetching sent from:", url);

    const res = await authFetch(url);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, [adminId]);

  const load = useCallback(async () => {
    if (!adminId) return;

    setLoading(true);
    setError("");

    // load users (don't block sent if users fails)
    try {
      const u = await fetchUsers();
      setUsers(u);
    } catch (e) {
      console.error("fetchUsers failed:", e);
      setUsers([]);
    }

    // load sent
    try {
      const s = await fetchSent();
      console.log("✅ Sent count:", s.length);
      setSent(s);
    } catch (e) {
      console.error("fetchSent failed:", e);
      setSent([]);
      setError(e?.message || "Failed to load sent mails");
    } finally {
      setLoading(false);
    }
  }, [adminId, fetchUsers, fetchSent]);

  useEffect(() => {
    if (!adminId) return;
    load();
  }, [adminId, load]);

  const send = async () => {
    try {
      setError("");

      if (!adminId || !adminEmail) {
        setError("Admin account not loaded yet. Please refresh.");
        return;
      }

      if (!form.toUserId || !form.subject.trim() || !form.body.trim()) {
        setError("To, Subject, and Message are required");
        return;
      }

      const payload = {
        fromEmail: adminEmail, // ✅ matches backend
        toUserId: Number(form.toUserId),
        subject: form.subject.trim(),
        body: form.body.trim(),
      };

      const res = await authFetch(`${API}/admin/mails`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Send failed");
      }

      setForm({ toUserId: "", subject: "", body: "" });
      await load(); // ✅ refresh sent list
    } catch (e) {
      setError(e?.message || "Error");
    }
  };

  const toOptions = useMemo(() => {
    return users.filter((u) => u.id !== adminId && u.status === "ACTIVE");
  }, [users, adminId]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Internal Mails</h2>
          <p className="muted">Send messages inside the system</p>
          <p className="muted" style={{ marginTop: 6 }}>
            Logged as: <b>{me?.fullName || "..."}</b> — ID:{" "}
            <b>{adminId ?? "..."}</b> — {adminEmail || "..."}
          </p>
        </div>
        <button className="btn" onClick={load} disabled={!adminId || loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="two-col">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Compose</h3>

          <label>
            To User
            <select
              value={form.toUserId}
              onChange={(e) => setForm({ ...form, toUserId: e.target.value })}
            >
              <option value="">Select user</option>
              {toOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </label>

          <label>
            Subject
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </label>

          <label>
            Message
            <textarea
              rows={6}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </label>

          <button className="btn" onClick={send} disabled={!adminId}>
            Send
          </button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Sent</h3>

          <div className="mail-list">
            {sent.map((m) => (
              <div key={m.id} className="mail-item">
                <div className="mail-top">
                  <div className="mail-subject">{m.subject}</div>
                  <div className="pill">{m.status}</div>
                </div>
                <div className="mail-meta">
                  To: <b>{m.toName}</b>
                </div>
                <div className="mail-body">{m.body}</div>
              </div>
            ))}

            {!loading && sent.length === 0 && (
              <div className="muted" style={{ padding: 10 }}>
                No sent messages.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
