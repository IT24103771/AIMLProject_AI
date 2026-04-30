import React, { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import "../styles/Inventory.css";

const API = "/api";

const InventoryPage = ({ role = "Staff" }) => {
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    productId: "",
    batchNumber: "",
    quantity: "",
    expiryDate: "",
  });

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(form.productId)),
    [products, form.productId]
  );

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [pRes, iRes] = await Promise.all([
        authFetch(`${API}/products`),
        authFetch(`${API}/inventory`),
      ]);

      if (!pRes.ok || !iRes.ok) {
        throw new Error("Failed to load data");
      }

      const pData = await pRes.json();
      const iData = await iRes.json();

      setProducts((Array.isArray(pData) ? pData : []).map(p => ({
        ...p,
        id: p.id ?? p.productId,
        name: p.name ?? p.productName,
        category: p.category ?? p.mainCategory,
      })));
      setRows(Array.isArray(iData) ? iData : []);
    } catch (e) {
      setError("Failed to load inventory/products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const reset = () => {
    setForm({
      productId: "",
      batchNumber: "",
      quantity: "",
      expiryDate: "",
    });
    setEditingId(null);
    setError("");
  };

  const validate = () => {
    if (!form.productId) return "Select a product.";
    if (!form.batchNumber.trim()) return "Batch number is required.";
    if (form.batchNumber.trim().length < 2) return "Batch number must be at least 2 characters.";

    const q = Number(form.quantity);
    if (!form.quantity || Number.isNaN(q) || q < 1) {
      return "Quantity must be 1 or more.";
    }
    if (!Number.isInteger(q)) {
      return "Quantity must be a whole number.";
    }

    if (!form.expiryDate) return "Expiry date is required.";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(form.expiryDate + "T00:00:00");
    if (expiry < today) {
      return "Expiry date must be today or in the future.";
    }

    return "";
  };

  const submit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    try {
      setError("");

      const payload = {
        productId: Number(form.productId),
        batchNumber: form.batchNumber.trim(),
        quantity: Number(form.quantity),
        expiryDate: form.expiryDate,
      };

      const url = editingId ? `${API}/inventory/${editingId}` : `${API}/inventory`;
      const method = editingId ? "PUT" : "POST";

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Failed to save inventory batch.";
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch { }
        throw new Error(msg);
      }

      await load();
      reset();
    } catch (e) {
      setError(e.message || "Failed to save inventory batch.");
    }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setError("");
    setForm({
      productId: String(r.productId),
      batchNumber: r.batchNumber,
      quantity: String(r.quantity),
      expiryDate: r.expiryDate,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this inventory batch?")) return;

    try {
      setError("");

      const res = await authFetch(`${API}/inventory/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        let msg = "Failed to delete.";
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch { }
        throw new Error(msg);
      }

      if (editingId === id) reset();
      await load();
    } catch (e) {
      setError(e.message || "Failed to delete.");
    }
  };

  return (
    <div className="inv-page">
      <div className="inv-head">
        <div>
          <h1>Inventory</h1>
          <p className="muted">
            Add stock batches with expiry dates (batches expire, products don’t).
          </p>
        </div>
      </div>

      {error && <div className="banner">{error}</div>}

      <div className="inv-grid">
        <div className="card">
          <div className="card-title">
            <h2>{editingId ? "Edit Batch" : "Add Batch"}</h2>
            <span className="muted">{rows.length} batches</span>
          </div>

          <div className="form">
            <div className="field">
              <label>Product</label>
              <select name="productId" value={form.productId} onChange={onChange}>
                <option value="">-- Select product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.category ? `• ${p.category}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="preview">
                <strong>{selectedProduct.name}</strong>
                <span className="muted">
                  {selectedProduct.category || "No category"}
                </span>
              </div>
            )}

            <div className="row2">
              <div className="field">
                <label>Batch Number</label>
                <input
                  name="batchNumber"
                  value={form.batchNumber}
                  onChange={onChange}
                  placeholder="e.g. B001"
                />
              </div>

              <div className="field">
                <label>Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={onChange}
                  placeholder="e.g. 50"
                />
              </div>
            </div>

            <div className="field">
              <label>Expiry Date</label>
              <input
                name="expiryDate"
                type="date"
                value={form.expiryDate}
                onChange={onChange}
              />
            </div>

            <div className="actions">
              <button className="btn btn-primary" onClick={submit}>
                {editingId ? "Update Batch" : "Save Batch"}
              </button>
              <button className="btn btn-ghost" onClick={reset}>
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <h2>Stock Batches</h2>
            <span className="muted">Sorted by expiry</span>
          </div>

          {loading ? (
            <div className="muted">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="muted">No inventory batches yet.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Batch</th>
                    <th className="right">Qty</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    {role === "Admin" && <th className="right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.productName}</td>
                      <td>{r.batchNumber}</td>
                      <td className="right">{r.quantity}</td>
                      <td>{r.expiryDate}</td>
                      <td>
                        <span className={`pill ${r.status.replace(" ", "-").toLowerCase()}`}>
                          {r.status}
                        </span>
                      </td>
                      {role === "Admin" && (
                        <td className="right">
                          <button className="btn btn-small" onClick={() => startEdit(r)}>
                            Edit
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() => remove(r.id)}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;