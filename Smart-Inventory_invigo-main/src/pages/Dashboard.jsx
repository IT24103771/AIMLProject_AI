import React, { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { AlertTriangle, TrendingDown, Activity, PieChart as LucidePieChart, BarChart2, ShieldAlert, Package, Layers, Database, Clock, Flame, TrendingUp, Tag } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCurrentUser } from "@/lib/auth";
import { authFetch } from "@/lib/api";
import "../styles/Dashboard.css";

const API = "/api";

const Dashboard = () => {
  const [summary, setSummary] = useState(null);

  // Keep these for tables/charts (optional but useful)
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);

  const [error, setError] = useState("");

  // ✅ report status UI
  const [reportMsg, setReportMsg] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportVisibility, setReportVisibility] = useState("Admin Only");

  const load = async () => {
    try {
      setError("");

      const sumRes = await authFetch(`${API}/dashboard/summary`).catch(() => null);
      const iRes = await authFetch(`${API}/inventory`).catch(() => null);
      const sRes = await authFetch(`${API}/sales`).catch(() => null);
      const pRes = await authFetch(`${API}/products`).catch(() => null);

      let sumData = null, iData = [], sData = [], pData = [];
      let errMsgs = [];

      if (sumRes && sumRes.ok) sumData = await sumRes.json();
      else errMsgs.push(`Summary: ${sumRes ? await sumRes.text() : 'fail'}`);

      if (iRes && iRes.ok) iData = await iRes.json();
      else errMsgs.push(`Inventory: ${iRes ? await iRes.text() : 'fail'}`);

      if (sRes && sRes.ok) sData = await sRes.json();
      else errMsgs.push(`Sales: ${sRes ? await sRes.text() : 'fail'}`);

      if (pRes && pRes.ok) pData = await pRes.json();
      else errMsgs.push(`Products: ${pRes ? await pRes.text() : 'fail'}`);

      if (errMsgs.length > 0) {
        setError(`Partial data loaded. Errors: ${errMsgs.join(" | ")}`);
      }

      setSummary(sumData || null);
      setInventory(Array.isArray(iData) ? iData : []);
      setSales(Array.isArray(sData) ? sData : []);
      setProducts(Array.isArray(pData) ? pData : []);
    } catch (e) {
      setError(e.message || "Failed to connect to backend.");
    }
  };

  // ✅ Generate report (PDF download) + show report id
  const generateReport = async () => {
    try {
      setReportLoading(true);
      setReportMsg("");
      setError("");

      await new Promise(r => setTimeout(r, 600));

      const requestBody = {
        reportTitle: "Dashboard Summary Export",
        reportType: "INVENTORY",
        startDate: null,
        endDate: null,
        visibility: reportVisibility || "ADMIN"
      };

      const res = await authFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      
      if (!res.ok) {
          throw new Error("Failed to register dashboard report on backend");
      }
      const data = await res.json();
      setReportMsg(`Report generated successfully! Report ID: ${data.id}`);
      
    } catch (e) {
      setReportMsg("");
      setError(e?.message || "Report generation failed.");
    } finally {
      setReportLoading(false);
    }
  };

  // ✅ Sync AI Risk manually
  const syncAiRisk = async () => {
    try {
      setReportLoading(true);
      setError("");
      
      const res = await authFetch(`${API}/dashboard/sync-ai-risk`, {
        method: "POST"
      });
      
      if (!res.ok) {
        throw new Error(`Failed to sync AI risk (Status: ${res.status})`);
      }
      
      setReportMsg("AI Risk Sync completed! Refreshing data...");
      setTimeout(load, 1500); // refresh after a short delay
      
    } catch (e) {
      setError(e.message || "AI sync failed.");
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Near-expiry list from inventory endpoint (still ok)
  const nearExpiryList = useMemo(() => {
    return inventory
      .filter((x) => {
        const st = (x.status || "").toLowerCase();
        return st.includes("expiring") || st.includes("expired");
      })
      .slice()
      .sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)))
      .slice(0, 12);
  }, [inventory]);

  // Movers from sales endpoint (still ok)
  const movers = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);

    const map = new Map(); // productName -> qty
    sales.forEach((s) => {
      const d = new Date(s.saleDate);
      if (Number.isNaN(d.getTime())) return;
      if (d < cutoff) return;

      const name = s.productName || "Unknown";
      map.set(name, (map.get(name) || 0) + Number(s.quantity || 0));
    });

    const rows = Array.from(map.entries()).map(([productName, qty]) => ({
      productName,
      qty,
    }));

    rows.sort((a, b) => b.qty - a.qty);

    return {
      fast: rows.slice(0, 5),
      slow: rows.slice(-5).reverse(),
    };
  }, [sales]);

  // Monthly expiry loss (still from inventory table)
  const monthlyExpiryLoss = useMemo(() => {
    const expired = inventory.filter((x) =>
      (x.status || "").toLowerCase().includes("expired")
    );

    const byMonth = new Map(); // YYYY-MM -> qty
    expired.forEach((row) => {
      const month = String(row.expiryDate || "").slice(0, 7) || "Unknown";
      byMonth.set(month, (byMonth.get(month) || 0) + Number(row.quantity || 0));
    });

    return Array.from(byMonth.entries())
      .map(([month, qty]) => ({ month, qty }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [inventory]);

  const maxQty = useMemo(() => {
    return Math.max(1, ...monthlyExpiryLoss.map((x) => x.qty));
  }, [monthlyExpiryLoss]);

  // AI Risk Data
  const [filterHighRisk, setFilterHighRisk] = useState(false);

  const aiRiskData = useMemo(() => {
    const byCategory = new Map();

    products.forEach(p => {
      const cat = p.mainCategory || "Unknown";
      const risk = p.riskLevel || "LOW";
      
      if (!byCategory.has(cat)) {
        byCategory.set(cat, { category: cat, HIGH: 0, MEDIUM: 0, LOW: 0 });
      }
      
      const stats = byCategory.get(cat);
      if (risk === "HIGH") stats.HIGH += 1;
      else if (risk === "MEDIUM") stats.MEDIUM += 1;
      else stats.LOW += 1;
    });

    let data = Array.from(byCategory.values());
    if (filterHighRisk) {
      data = data.filter(d => d.HIGH > 0);
    }
    return data;
  }, [products, filterHighRisk]);

  return (
    <div className="dash-page">
      {/* ✅ VIDEO BACKGROUND */}
      <video
        className="dash-bg-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/video/background.mp4" type="video/mp4" />
      </video>

      {/* ✅ DARK/BLUR OVERLAY for readability */}
      <div className="dash-bg-overlay" />

      {/* ✅ CONTENT */}
      <div className="dash-content">
        <div className="dash-header">
          <div>
            <h1>Dashboard</h1>
            <p className="subtitle">
              Summary cards are loaded from backend. Tables/charts use inventory
              & sales.
            </p>
          </div>

          <div className="dash-actions">
            {/* ✅ NEW: report button and visibility */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={reportVisibility}
                onChange={(e) => setReportVisibility(e.target.value)}
                className="btn"
                style={{ 
                  appearance: 'auto', 
                  backgroundColor: '#FFFFFF', 
                  color: '#000000',
                  border: '1px solid #E2E8F0',
                  paddingRight: '32px'
                }}
                title="Select Report Audience"
              >
                <option value="ADMIN">Admin Only</option>
                <option value="STAFF">Staff</option>
                <option value="ALL">All</option>
              </select>
              <button
                className="btn"
                onClick={generateReport}
                disabled={reportLoading}
                title="Download dashboard summary report"
              >
                {reportLoading ? "Generating..." : "Generate Report"}
              </button>

              <button
                className="btn"
                style={{ backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }}
                onClick={syncAiRisk}
                disabled={reportLoading}
                title="Trigger AI prediction sync for all products"
              >
                {reportLoading ? "Syncing..." : "Sync AI"}
              </button>
            </div>

            <button className="btn btn-ghost" onClick={load}>
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {reportMsg && <div className="banner banner-success">{reportMsg}</div>}

        {/* KPI Cards (FROM BACKEND SUMMARY) */}
        <div className="kpi-grid">
          <div className="kpi">
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}>
              <Package size={20} />
            </div>
            <div>
              <div className="kpi-label">Total Products</div>
              <div className="kpi-value">{summary?.totalProducts ?? "-"}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#F3E8FF', color: '#9333EA' }}>
              <Layers size={20} />
            </div>
            <div>
              <div className="kpi-label">Total Inventory Batches</div>
              <div className="kpi-value">{summary?.totalBatches ?? "-"}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#E0E7FF', color: '#4F46E5' }}>
              <Database size={20} />
            </div>
            <div>
              <div className="kpi-label">Total Stock Qty</div>
              <div className="kpi-value">{summary?.totalStockQty ?? "-"}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="kpi-label">Low Stock Batches</div>
              <div className="kpi-value">{summary?.lowStockBatches ?? "-"}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#FFEDD5', color: '#EA580C' }}>
              <Clock size={20} />
            </div>
            <div>
              <div className="kpi-label">Expiring Soon (≤ 7 days)</div>
              <div className="kpi-value">{summary?.expiringSoonBatches ?? "-"}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              <Flame size={20} />
            </div>
            <div>
              <div className="kpi-label">Expired Batches</div>
              <div className="kpi-value">{summary?.expiredBatches ?? "-"}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="kpi-label">Sales Today (Qty)</div>
              <div className="kpi-value">{summary?.salesTodayQty ?? "-"}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#FCE7F3', color: '#DB2777' }}>
              <Tag size={20} />
            </div>
            <div>
              <div className="kpi-label">Active Discounts</div>
              <div className="kpi-value">{summary?.activeDiscounts ?? "-"}</div>
            </div>
          </div>
        </div>

        <div className="dash-grid">
          {/* Near Expiry List */}
          <div className="card">
            <div className="card-title">
              <h2><AlertTriangle size={20} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: '#F59E0B' }} /> Near-Expiry Product List</h2>
              <span className="muted">Expired + Expiring Soon</span>
            </div>

            {nearExpiryList.length === 0 ? (
              <div className="empty">No near-expiry items 🎉</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th className="right">Qty</th>
                      <th className="right">Status</th>
                      <th className="right">AI Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nearExpiryList.map((x) => (
                      <tr key={x.id}>
                        <td>{x.productName}</td>
                        <td>{x.batchNumber}</td>
                        <td>{x.expiryDate}</td>
                        <td className="right">{x.quantity}</td>
                        <td className="right">
                          <span
                            className={
                              "pill " +
                              ((x.status || "").toLowerCase().includes("expired")
                                ? "pill-bad"
                                : "pill-warn")
                            }
                          >
                            {x.status}
                          </span>
                        </td>
                        <td className="right">
                          <span
                            className={
                              "pill " +
                              (x.riskLevel === "HIGH" ? "pill-bad" : 
                               x.riskLevel === "MEDIUM" ? "pill-warn" : "pill-good")
                            }
                            title={x.riskProbability ? `Probability: ${Math.round(x.riskProbability * 100)}%` : ""}
                          >
                            {x.riskLevel || "LOW"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="muted note">Showing first 12 items…</div>
              </div>
            )}
          </div>

          {/* Monthly Expiry Loss */}
          <div className="card">
            <div className="card-title">
              <h2><TrendingDown size={20} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: '#EF4444' }} /> Monthly Expiry (Expired Qty)</h2>
              <span className="muted">Bar chart (simple)</span>
            </div>

            {monthlyExpiryLoss.length === 0 ? (
              <div className="empty">No expired data yet.</div>
            ) : (
              <div className="bars">
                {monthlyExpiryLoss.map((x) => {
                  const pct = Math.round((x.qty / maxQty) * 100);
                  return (
                    <div className="bar-row" key={x.month}>
                      <div className="bar-month">{x.month}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="bar-val">{x.qty} qty</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fast vs Slow Moving */}
          <div className="card">
            <div className="card-title">
              <h2><Activity size={20} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: '#10B981' }} /> Fast vs Slow Moving (Last 30 days)</h2>
              <span className="muted">Based on sales quantity</span>
            </div>

            <div className="two-col">
              <div>
                <div className="mini-head">Fast</div>
                {movers.fast.length === 0 ? (
                  <div className="empty small">No sales data yet.</div>
                ) : (
                  <ul className="list">
                    {movers.fast.map((r, idx) => (
                      <li key={idx}>
                        <span>{r.productName}</span>
                        <b>{r.qty}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="mini-head">Slow</div>
                {movers.slow.length === 0 ? (
                  <div className="empty small">No sales data yet.</div>
                ) : (
                  <ul className="list">
                    {movers.slow.map((r, idx) => (
                      <li key={idx}>
                        <span>{r.productName}</span>
                        <b>{r.qty}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="muted note">
              (Later you’ll combine this with expiry to show “Sales vs Expiry
              comparison”.)
            </div>
          </div>

          {/* NEW: AI Risk Pie Chart */}
          <div className="card">
            <div className="card-title">
              <h2><LucidePieChart size={20} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: '#8B5CF6' }} /> Risk Distribution</h2>
              <span className="muted">Total product risk ratio</span>
            </div>
            
            <div style={{ width: "100%", height: 250, marginTop: "20px" }}>
              {products.length === 0 ? (
                <div className="empty">No data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "High Risk", value: products.filter(p => p.riskLevel === "HIGH").length, color: "#EF4444" },
                        { name: "Medium Risk", value: products.filter(p => p.riskLevel === "MEDIUM").length, color: "#F59E0B" },
                        { name: "Low Risk", value: products.filter(p => !p.riskLevel || p.riskLevel === "LOW").length, color: "#10B981" }
                      ].filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={50}
                      paddingAngle={5}
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={false}
                    >
                      {
                        [
                          { name: "High Risk", value: products.filter(p => p.riskLevel === "HIGH").length, color: "#EF4444" },
                          { name: "Medium Risk", value: products.filter(p => p.riskLevel === "MEDIUM").length, color: "#F59E0B" },
                          { name: "Low Risk", value: products.filter(p => !p.riskLevel || p.riskLevel === "LOW").length, color: "#10B981" }
                        ].filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
                        ))
                      }
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* AI Risk Chart */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2><BarChart2 size={20} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: '#3B82F6' }} /> AI Expiry Risk Overview</h2>
                <span className="muted">Predicted risk per category</span>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={filterHighRisk} 
                    onChange={e => setFilterHighRisk(e.target.checked)} 
                  />
                  Show High Risk Only
                </label>
              </div>
            </div>
            <div style={{ width: "100%", height: 300, marginTop: "20px" }}>
              {aiRiskData.length === 0 ? (
                <div className="empty">No AI risk data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aiRiskData}>
                    <XAxis dataKey="category" stroke="#fff" tick={{ fill: '#aaa' }} />
                    <YAxis stroke="#fff" tick={{ fill: '#aaa' }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="HIGH" name="High Risk" stackId="a" fill="#EF4444" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="MEDIUM" name="Medium Risk" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="LOW" name="Low Risk" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;