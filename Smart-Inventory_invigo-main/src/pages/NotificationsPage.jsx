import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "@/lib/api";
import "../styles/NotificationsPage.css";

const API = "/api";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [mails, setMails] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const me = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || localStorage.getItem("currentUser") || "null");
    } catch {
      return null;
    }
  }, []);

  const load = async () => {
    if (!me?.id) return;
    try {
      setLoading(true);
      setError("");
      const res = await authFetch(`${API}/mails/inbox/${me.id}`);
      if (!res.ok) throw new Error("Failed to load notifications");
      const data = await res.json();
      setMails(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (me) {
      load();
    }
    // eslint-disable-next-line
  }, [me]);

  const unreadCount = useMemo(
    () => mails.filter((m) => String(m.status || "").toUpperCase() !== "READ").length,
    [mails]
  );

  const markRead = async (mailId) => {
    try {
      setError("");
      const res = await authFetch(`${API}/mails/${mailId}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark as read");
      await load();
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const del = async (mailId) => {
    const ok = window.confirm("Delete this message?");
    if (!ok) return;

    try {
      setError("");
      const res = await authFetch(`${API}/mails/${mailId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await load();
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  return (
    <div className="noti-wrap">
      <div className="noti-head">
        <div>
          <h2>Notifications</h2>
          <p className="muted">
            Unread: <b>{unreadCount}</b> • Total: <b>{mails.length}</b>
          </p>
        </div>

        <div className="noti-actions">
          <button className="btn ghost" onClick={() => window.history.back()}>
            Back
          </button>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="noti-list">
        {mails.map((m) => {
          const isRead = String(m.status || "").toUpperCase() === "READ";
          return (
            <div key={m.id} className={isRead ? "noti-card" : "noti-card unread"}>
              <div className="noti-top">
                <div className="noti-title">{m.subject}</div>
                <span className={isRead ? "pill" : "pill warn"}>{m.status}</span>
              </div>

              <div className="noti-meta">
                From: <b>{m.fromName}</b>
              </div>

              <div className="noti-body">{m.body}</div>

              <div className="noti-row">
                {!isRead && (
                  <button className="btn small" onClick={() => markRead(m.id)}>
                    Mark as read
                  </button>
                )}
                <button className="btn small danger" onClick={() => del(m.id)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {mails.length === 0 && !loading && (
          <div className="empty">
            No notifications yet.
          </div>
        )}
      </div>
    </div>
  );
}
