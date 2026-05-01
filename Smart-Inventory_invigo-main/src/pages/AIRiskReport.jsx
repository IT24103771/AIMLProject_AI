import React, { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API = "/api";

const RISK_CONFIG = {
  HIGH:   { label: "HIGH",   code: 1, bg: "#FEE2E2", color: "#DC2626", dot: "#EF4444" },
  LOW:    { label: "LOW",    code: 0, bg: "#D1FAE5", color: "#059669", dot: "#10B981" },
};

const RiskBadge = ({ label }) => {
  const cfg = RISK_CONFIG[label] || RISK_CONFIG.LOW;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: "3px 10px", borderRadius: "999px",
      fontSize: "11px", fontWeight: 900,
      letterSpacing: "0.08em", textTransform: "uppercase",
      display: "inline-flex", alignItems: "center", gap: "5px"
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
};

const AIRiskReport = () => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("ALL");   // ALL | HIGH | LOW
  const [groupBy, setGroupBy] = useState(false);
  const [sortField, setSortField]   = useState("daysLeft");
  const [sortAsc, setSortAsc]       = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await authFetch(`${API}/reports/ai-risk`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (e) {
      setError(e.message || "Failed to load AI risk report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleSort = (field) => {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let rows = [...data];
    if (filter !== "ALL") rows = rows.filter(r => r.riskLabel === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.productName?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.batchNumber?.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      let av = a[sortField] ?? "", bv = b[sortField] ?? "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return rows;
  }, [data, filter, search, sortField, sortAsc]);

  const grouped = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map();
    filtered.forEach(r => {
      const cat = r.category || "Uncategorised";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupBy]);

  const counts = useMemo(() => ({
    total:  data.length,
    high:   data.filter(r => r.riskLabel === "HIGH").length,
    low:    data.filter(r => r.riskLabel === "LOW").length,
  }), [data]);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("AI Expiry Risk Report", 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Product", "Category", "Batch", "Qty", "Expiry", "Days Left", "Risk", "Discount %"]],
      body: filtered.map(r => [
        r.productName,
        r.category,
        r.batchNumber,
        r.quantity,
        r.expiryDate,
        r.daysLeft,
        r.riskLabel,
        r.suggestedDiscount > 0 ? `${r.suggestedDiscount.toFixed(1)}%` : "-",
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
      bodyStyles: { textColor: [30, 30, 30] },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 6) {
          const val = d.cell.raw;
          if (val === "HIGH")   d.cell.styles.fillColor = [254, 226, 226];
          else if (val === "NORMAL") d.cell.styles.fillColor = [254, 243, 199];
          else d.cell.styles.fillColor = [209, 250, 229];
        }
      },
    });
    doc.save(`AI_Risk_Report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const SortArrow = ({ field }) => (
    <span style={{ marginLeft: 4, opacity: sortField === field ? 1 : 0.3 }}>
      {sortField === field ? (sortAsc ? "↑" : "↓") : "↕"}
    </span>
  );

  const TableRow = ({ r }) => {
    const cfg = RISK_CONFIG[r.riskLabel] || RISK_CONFIG.LOW;
    const urgent = r.daysLeft <= 3;
    return (
      <tr style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <td style={td}>{r.productName}</td>
        <td style={td}><span style={catPill}>{r.category}</span></td>
        <td style={td}><code style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 6px", borderRadius: 6 }}>{r.batchNumber}</code></td>
        <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{r.quantity?.toLocaleString()}</td>
        <td style={td}>{r.expiryDate}</td>
        <td style={{ ...td, textAlign: "center" }}>
          <span style={{ fontWeight: 800, color: urgent ? "#DC2626" : r.daysLeft <= 7 ? "#D97706" : "#059669", fontSize: 13 }}>
            {r.daysLeft < 0 ? "Expired" : `${r.daysLeft}d`}
          </span>
        </td>
        <td style={{ ...td, textAlign: "center" }}><RiskBadge label={r.riskLabel} /></td>
        <td style={{ ...td, textAlign: "center" }}>
          {r.suggestedDiscount > 0
            ? <span style={{ background: "#D1FAE5", color: "#059669", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900 }}>
                {r.suggestedDiscount.toFixed(1)}% OFF
              </span>
            : <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>}
        </td>
      </tr>
    );
  };

  const th = { padding: "12px 14px", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" };
  const td = { padding: "13px 14px", fontSize: 13, fontWeight: 600, color: "#0f172a" };
  const catPill = { background: "#e0e7ff", color: "#4338ca", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 };

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", margin: 0 }}>🤖 AI Expiry Risk Report</h1>
          <p style={{ color: "#64748b", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>
            Detailed AI-classified inventory analysis
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={ghostBtn}>↻ Refresh</button>
          <button onClick={exportPDF} style={primaryBtn}>⬇ Export PDF</button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Batches", value: counts.total, bg: "#e0e7ff", col: "#4338ca" },
          { label: "High Risk",    value: counts.high,   bg: "#FEE2E2", col: "#DC2626" },
          { label: "Low Risk",     value: counts.low,    bg: "#D1FAE5", col: "#059669" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 20, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", cursor: "pointer", transition: "transform 0.2s" }}
               onClick={() => setFilter(k.label === "Total Batches" ? "ALL" : k.label.split(" ")[0])}
               onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
               onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: k.col }}>{k.value}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA", padding: "12px 16px", borderRadius: 12, marginBottom: 20, fontWeight: 700 }}>{error}</div>}

      {/* Controls */}
      <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <input
          placeholder="Search product, category, batch…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, height: 40, border: "1px solid #e2e8f0", borderRadius: 12, padding: "0 14px", fontSize: 13, fontWeight: 600, outline: "none" }}
        />
        {["ALL","HIGH","LOW"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "8px 18px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 12, letterSpacing: "0.05em",
              background: filter === f ? (f === "HIGH" ? "#EF4444" : f === "LOW" ? "#10B981" : "#0f172a") : "#f8fafc",
              color: filter === f ? "#fff" : "#64748b", transition: "all 0.2s" }}>
            {f === "ALL" ? "All" : f}
          </button>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 12, color: "#64748b", cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={groupBy} onChange={e => setGroupBy(e.target.checked)} style={{ width: 16, height: 16 }} />
          Group by Category
        </label>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontWeight: 700 }}>
            <div style={{ width: 36, height: 36, border: "4px solid #e2e8f0", borderTopColor: "#007A5E", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            Loading AI Risk Data…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontWeight: 700 }}>No batches match your filters.</div>
        ) : groupBy && grouped ? (
          grouped.map(([cat, rows]) => (
            <div key={cat}>
              <div style={{ background: "#f8fafc", padding: "10px 20px", fontWeight: 900, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#007A5E", display: "inline-block" }} />
                {cat}
                <span style={{ fontWeight: 600, color: "#94a3b8", fontSize: 11 }}>({rows.length} batch{rows.length !== 1 ? "es" : ""})</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>{rows.map((r, i) => <TableRow key={i} r={r} />)}</tbody>
              </table>
            </div>
          ))
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc", borderBottom: "2px solid #f1f5f9" }}>
              <tr>
                {[["productName","Product"],["category","Category"],["batchNumber","Batch"],["quantity","Qty"],["expiryDate","Expiry"],["daysLeft","Days Left"],["riskLabel","Risk"],["suggestedDiscount","Discount"]].map(([f,l]) => (
                  <th key={f} style={{ ...th, textAlign: ["quantity","daysLeft","suggestedDiscount"].includes(f) ? "center" : "left" }} onClick={() => toggleSort(f)}>
                    {l}<SortArrow field={f} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{filtered.map((r, i) => <TableRow key={i} r={r} />)}</tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8", fontWeight: 600, textAlign: "right" }}>
        Showing {filtered.length} of {data.length} batches
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const primaryBtn = { padding: "10px 22px", borderRadius: 14, background: "#007A5E", color: "#fff", border: "none", fontWeight: 900, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,122,94,0.3)", transition: "all 0.2s" };
const ghostBtn   = { padding: "10px 22px", borderRadius: 14, background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", fontWeight: 900, fontSize: 13, cursor: "pointer", transition: "all 0.2s" };

export default AIRiskReport;
