import React, { useState, useEffect } from "react";
import { authFetch } from "@/lib/api";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API = "/api";

export default function AdminAlertsPage() {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [invRes, prodRes] = await Promise.all([
        authFetch(`${API}/inventory`),
        authFetch(`${API}/products`)
      ]);
      
      if (!invRes.ok) throw new Error("Failed to load inventory data");
      
      const invData = await invRes.json();
      const prodData = prodRes.ok ? await prodRes.json() : [];
      
      const prodMap = {};
      prodData.forEach(p => {
        prodMap[p.id || p.productId] = p.riskLevel || "LOW";
      });
      setProducts(prodMap);
      
      const sorted = (Array.isArray(invData) ? invData : []).sort((a, b) => {
        return new Date(a.expiryDate) - new Date(b.expiryDate);
      });
      
      setInventory(sorted);
    } catch (e) {
      setError("Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getRiskBadgeInfo = (riskLevel) => {
    if (riskLevel === "HIGH") return { label: "High Risk", class: "bg-red-100 text-red-600" };
    if (riskLevel === "MEDIUM") return { label: "Medium Risk", class: "bg-orange-100 text-orange-600" };
    return { label: "Low Risk", class: "bg-emerald-100 text-emerald-600" };
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Risk Control</h2>
          <p className="text-[#0F172A]/50 font-bold uppercase tracking-widest text-[10px] mt-1">Expiry Management & Alerts</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-2xl flex items-center gap-3 border border-red-100 text-red-600 font-bold text-sm">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <Card className="card-premium p-0 border-none shadow-premium overflow-hidden">
        <CardHeader className="p-8 border-b border-[#0F172A]/5">
          <CardTitle className="font-black text-xl">Expiry Status Monitor</CardTitle>
          <CardDescription className="font-bold">Track and observe near-expiry batches</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#0F172A]/[0.02]">
              <TableRow className="border-[#0F172A]/5">
                <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest">Product / Batch</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Expiry Date</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Qty</TableHead>
                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">AI Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-[#0F172A]/40 font-bold uppercase tracking-widest text-[10px]">
                    Scanning Inventory...
                  </TableCell>
                </TableRow>
              ) : inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-[#0F172A]/40 font-bold text-sm">
                    No active inventory batches found.
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => {
                  const aiRisk = products[item.productId] || "LOW";
                  const riskBadge = getRiskBadgeInfo(aiRisk);
                  
                  return (
                    <TableRow key={item.id} className="border-[#0F172A]/5 hover:bg-primary/[0.03] transition-colors">
                      <TableCell className="px-8 py-4">
                        <p className="font-black text-[#0F172A]">{item.productName}</p>
                        <p className="text-[10px] font-bold text-black/30 uppercase">Batch: {item.batchNumber}</p>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-bold text-sm text-[#0F172A]/80">{item.expiryDate}</span>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-black text-sm">{item.quantity}</span>
                      </TableCell>
                      
                      <TableCell className="text-right px-8">
                        <Badge className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest border-none ${riskBadge.class}`}>
                          {riskBadge.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
