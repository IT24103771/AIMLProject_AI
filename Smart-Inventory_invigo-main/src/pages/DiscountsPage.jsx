import React, { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import "../styles/Discounts.css";

const API_BASE = "/api";

const DiscountsPage = ({ role = "Staff" }) => {
  const [products, setProducts] = useState([]);
  const [discounts, setDiscounts] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingDiscounts, setLoadingDiscounts] = useState(true);
  const [error, setError] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState("");

  const [discountPercent, setDiscountPercent] = useState("");
  const [note, setNote] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editDiscountPercent, setEditDiscountPercent] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editActive, setEditActive] = useState(true);

  const [inventory, setInventory] = useState([]);
  const [discardedIds, setDiscardedIds] = useState(() => {
    try {
      const saved = localStorage.getItem("ai_discarded_suggestions");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [applyingId, setApplyingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Persist discarded IDs across page refreshes
  useEffect(() => {
    try {
      localStorage.setItem("ai_discarded_suggestions", JSON.stringify(discardedIds));
    } catch { }
  }, [discardedIds]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(selectedProductId));
  }, [products, selectedProductId]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        setError("");

        const res = await authFetch(`${API_BASE}/products`);
        if (!res.ok) throw new Error("Failed to load products");

        const data = await res.json();
        setProducts((Array.isArray(data) ? data : []).map(p => ({
          ...p,
          id: p.id ?? p.productId,
          name: p.name ?? p.productName,
          category: p.category ?? p.mainCategory,
        })));
      } catch (e) {
        setError(e.message || "Something went wrong loading products");
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  const loadDiscounts = async () => {
    try {
      setLoadingDiscounts(true);
      setError("");

      const res = await authFetch(`${API_BASE}/discounts`);
      if (!res.ok) throw new Error("Failed to load discounts");

      const data = await res.json();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Could not load discounts");
      setDiscounts([]);
    } finally {
      setLoadingDiscounts(false);
    }
  };

  useEffect(() => {
    loadDiscounts();
  }, []);

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const res = await authFetch(`${API_BASE}/inventory`);
        if (!res.ok) return;
        const data = await res.json();
        setInventory(Array.isArray(data) ? data : []);
      } catch { }
    };
    loadInventory();
  }, []);

  // Batch IDs that already have a discount applied (active or inactive)
  const discountedBatchIds = useMemo(() => {
    return new Set(discounts.map((d) => d.batchId).filter(Boolean));
  }, [discounts]);

  const discountSuggestions = useMemo(() => {
    return inventory.filter(
      (x) =>
        x.riskLevel === "HIGH" &&
        x.suggestedDiscount &&
        x.suggestedDiscount > 0 &&
        !discardedIds.includes(x.id) &&
        !discountedBatchIds.has(x.id)   // hide if discount already exists for this batch
    ).sort((a, b) => b.suggestedDiscount - a.suggestedDiscount);
  }, [inventory, discardedIds, discountedBatchIds]);

  const handleApplySuggestion = async (item) => {
    setApplyingId(item.id);
    setError("");
    setSuccessMsg("");
    try {
      const payload = {
        productId: Number(item.productId),
        batchId: Number(item.id),
        discountPercent: Math.round(item.suggestedDiscount),
        note: `AI suggested – ${Math.round(item.suggestedDiscount)}% off (HIGH RISK, expires ${item.expiryDate})`,
        active: true,
      };
      const res = await authFetch(`${API_BASE}/discounts`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = "Failed to apply discount";
        try { const d = await res.json(); msg = d.message || msg; } catch { }
        throw new Error(msg);
      }
      const created = await res.json();
      setDiscounts((prev) => [created, ...prev]);
      setDiscardedIds((prev) => [...prev, item.id]);
      setSuccessMsg(`Discount of ${Math.round(item.suggestedDiscount)}% applied to ${item.productName} (Batch ${item.batchNumber})!`);
    } catch (e) {
      setError(e.message || "Could not apply discount");
    } finally {
      setApplyingId(null);
    }
  };

  const handleDiscardSuggestion = (id) => {
    setDiscardedIds((prev) => [...prev, id]);
  };

  useEffect(() => {
    if (!selectedProductId) {
      setBatches([]);
      setSelectedBatchId("");
      return;
    }

    const loadBatches = async () => {
      try {
        setLoadingBatches(true);
        const res = await authFetch(`${API_BASE}/inventory/by-product/${selectedProductId}`);
        if (!res.ok) throw new Error("Failed to load batches");
        const data = await res.json();
        setBatches(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "Something went wrong loading batches");
        setBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    };

    loadBatches();
  }, [selectedProductId]);

  const validate = () => {
    if (!selectedProductId) return "Please select a product.";
    if (!selectedBatchId) return "Please select an inventory batch.";
    const pct = Number(discountPercent);
    if (!discountPercent || Number.isNaN(pct)) return "Please enter a valid discount %.";
    if (!Number.isInteger(pct)) return "Discount % must be a whole number.";
    if (pct <= 0 || pct > 90) return "Discount must be between 1 and 90%.";
    return "";
  };

  const validateEdit = () => {
    const pct = Number(editDiscountPercent);
    if (!editDiscountPercent || Number.isNaN(pct)) return "Please enter a valid discount %.";
    if (!Number.isInteger(pct)) return "Discount % must be a whole number.";
    if (pct <= 0 || pct > 90) return "Discount must be between 1 and 90%.";
    return "";
  };

  const handleApplyDiscount = async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    try {
      setError("");

      const payload = {
        productId: Number(selectedProductId),
        batchId: Number(selectedBatchId),
        discountPercent: Number(discountPercent),
        note: note?.trim() || null,
        active: true,
      };

      const res = await authFetch(`${API_BASE}/discounts`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Failed to apply discount";
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch { }
        throw new Error(msg);
      }

      const created = await res.json();
      setDiscounts((prev) => [created, ...prev]);

      setDiscountPercent("");
      setNote("");
      setSelectedProductId("");
      setSelectedBatchId("");
    } catch (e) {
      setError(e.message || "Could not apply discount");
    }
  };

  const startEdit = (d) => {
    setError("");
    setEditingId(d.id);
    setEditDiscountPercent(String(d.discountPercent ?? ""));
    setEditNote(d.note ?? "");
    setEditActive(Boolean(d.active));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDiscountPercent("");
    setEditNote("");
    setEditActive(true);
  };

  const handleSaveEdit = async (d) => {
    const msg = validateEdit();
    if (msg) {
      setError(msg);
      return;
    }

    try {
      setError("");

      const payload = {
        productId: Number(d.productId),
        batchId: Number(d.batchId),
        discountPercent: Number(editDiscountPercent),
        note: editNote?.trim() || null,
        active: editActive,
      };

      const res = await authFetch(`${API_BASE}/discounts/${d.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Failed to update discount";
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch { }
        throw new Error(msg);
      }

      const updated = await res.json();
      setDiscounts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      cancelEdit();
    } catch (e) {
      setError(e.message || "Could not update discount");
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this discount?");
    if (!ok) return;

    try {
      setError("");

      const res = await authFetch(`${API_BASE}/discounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        let msg = "Failed to delete discount";
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch { }
        throw new Error(msg);
      }

      setDiscounts((prev) => prev.filter((d) => d.id !== id));
      if (editingId === id) cancelEdit();
    } catch (e) {
      setError(e.message || "Could not delete discount");
    }
  };

  const toggleActive = async (d) => {
    try {
      setError("");
      const newValue = !d.active;

      const res = await authFetch(`${API_BASE}/discounts/${d.id}/active?value=${newValue}`, {
        method: "PATCH",
      });

      if (!res.ok) {
        let msg = "Failed to update active status";
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch { }
        throw new Error(msg);
      }

      const updated = await res.json();
      setDiscounts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setError(e.message || "Could not update status");
    }
  };

  return (
    <div className="discounts-page">
      <div className="page-header">
        <h1>Discounts</h1>
        <p>Apply discounts only to products already added in the system.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="section-card">
        <div className="section-title">
          <h2>Apply Discount</h2>
          <span className="muted">Select a product → set discount % → apply</span>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Product</label>
            {loadingProducts ? (
              <div className="skeleton">Loading products…</div>
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">-- Select product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.category ? `• ${p.category}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label>Inventory Batch</label>
            {loadingBatches ? (
              <div className="skeleton">Loading batches…</div>
            ) : (
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                disabled={!selectedProductId}
              >
                <option value="">-- Select batch --</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} (Qty: {b.quantity}, Exp: {b.expiryDate || "N/A"})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label>Discount %</label>
            <input
              type="number"
              min="1"
              max="90"
              placeholder="e.g. 10"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
            />
          </div>

          <div className="field field-wide">
            <label>Note (optional)</label>
            <input
              type="text"
              placeholder="e.g. Near expiry stock promotion"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {selectedProduct && (
          <div className="preview-row">
            <div className="preview-card">
              <div className="preview-name">{selectedProduct.name}</div>
              <div className="preview-meta">
                <span>{selectedProduct.category || "No category"}</span>
                {selectedBatchId && batches.find(b => String(b.id) === String(selectedBatchId)) && (
                  <span style={{ marginLeft: "10px", color: "var(--brand-accent)" }}>
                    Batch: {batches.find(b => String(b.id) === String(selectedBatchId)).batchNumber}
                  </span>
                )}
              </div>
            </div>

            <button className="btn-primary" onClick={handleApplyDiscount}>
              Apply Discount
            </button>
          </div>
        )}

        {!loadingProducts && products.length === 0 && (
          <div className="empty">
            No products found. Add products first, then come back to apply discounts.
          </div>
        )}
      </div>

      {successMsg && <div className="banner-success">{successMsg}</div>}

      {/* AI Discount Suggestions – Admin only */}
      {role === "Admin" && (
        <div className="section-card" style={{ borderLeft: "4px solid #EF4444" }}>
          <div className="section-title">
            <h2 style={{ color: "#EF4444" }}>🤖 AI Discount Suggestions</h2>
            <span className="muted">HIGH RISK batches – apply before they expire to avoid losses</span>
          </div>

          {discountSuggestions.length === 0 ? (
            <div className="empty">No AI suggestions right now. Sync AI risk from the Dashboard.</div>
          ) : (
            <div className="list">
              {discountSuggestions.map((item) => {
                const daysLeft = Math.max(0, Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000));
                const isBusy = applyingId === item.id;
                return (
                  <div className="list-item" key={item.id} style={{ borderLeft: "3px solid #EF4444" }}>
                    <div className="li-left">
                      <div className="li-title">{item.productName}</div>
                      <div className="li-sub">
                        Batch: <b>{item.batchNumber}</b> &nbsp;|&nbsp;
                        Qty: <b>{item.quantity}</b> &nbsp;|&nbsp;
                        Expires: <b style={{ color: daysLeft <= 3 ? "#DC2626" : "inherit" }}>{item.expiryDate} ({daysLeft}d left)</b> &nbsp;|&nbsp;
                        Price: <b>Rs.{item.sellingPrice?.toFixed(2)}</b> &nbsp;|&nbsp;
                        Cost: <b>Rs.{item.costPrice?.toFixed(2)}</b>
                      </div>
                    </div>
                    <div className="li-right">
                      <span className="pill" style={{ background: "#FEE2E2", color: "#DC2626" }}>HIGH RISK</span>
                      <span className="pill" style={{ background: "#D1FAE5", color: "#059669", fontSize: "13px" }}>
                        {item.suggestedDiscount?.toFixed(1)}% OFF
                      </span>
                      <div className="actions">
                        <button
                          className="btn-primary"
                          disabled={isBusy}
                          onClick={() => handleApplySuggestion(item)}
                          title="Apply this AI-suggested discount"
                        >
                          {isBusy ? "Applying…" : "✓ Apply"}
                        </button>
                        <button
                          className="btn-danger"
                          disabled={isBusy}
                          onClick={() => handleDiscardSuggestion(item.id)}
                          title="Dismiss this suggestion"
                        >
                          ✕ Discard
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="section-card">
        <div className="section-title">
          <h2>Existing Discounts</h2>
          <span className="muted">Saved discounts linked to products</span>
        </div>

        {loadingDiscounts ? (
          <div className="skeleton">Loading discounts…</div>
        ) : discounts.length === 0 ? (
          <div className="empty">No discounts created yet.</div>
        ) : (
          <div className="list">
            {discounts.map((d) => {
              const isEditing = editingId === d.id;

              return (
                <div className="list-item" key={d.id}>
                  <div className="li-left">
                    <div className="li-title">
                      {d.productName || `Product #${d.productId}`} 
                      <span style={{ fontSize: "0.85em", color: "#666", marginLeft: "8px" }}>
                        (Batch {d.batchNumber || `#${d.batchId}`})
                      </span>
                    </div>

                    {!isEditing ? (
                      <div className="li-sub">
                        {d.note || "No note"}
                        {d.expiryDate && <span style={{ marginLeft: "10px" }}>Exp: {d.expiryDate}</span>}
                      </div>
                    ) : (
                      <div className="edit-box">
                        <div className="edit-row">
                          <label className="edit-label">Discount %</label>
                          <input
                            className="edit-input"
                            type="number"
                            min="1"
                            max="90"
                            value={editDiscountPercent}
                            onChange={(e) => setEditDiscountPercent(e.target.value)}
                          />
                        </div>

                        <div className="edit-row">
                          <label className="edit-label">Note</label>
                          <input
                            className="edit-input"
                            type="text"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                          />
                        </div>

                        <div className="edit-row">
                          <label className="edit-label">Active</label>
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="li-right">
                    <span className="pill">{d.discountPercent}% OFF</span>

                    <span
                      className={`status ${d.active ? "active" : "inactive"}`}
                      style={{ cursor: role === "Admin" ? "pointer" : "default" }}
                      title={role === "Admin" ? "Click to toggle" : ""}
                      onClick={() => role === "Admin" && toggleActive(d)}
                    >
                      {d.active ? "Active" : "Inactive"}
                    </span>

                    {role === "Admin" && (
                      !isEditing ? (
                        <div className="actions">
                          <button className="btn-outline" onClick={() => startEdit(d)}>
                            Edit
                          </button>
                          <button className="btn-danger" onClick={() => handleDelete(d.id)}>
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div className="actions">
                          <button className="btn-primary" onClick={() => handleSaveEdit(d)}>
                            Save
                          </button>
                          <button className="btn-outline" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscountsPage;