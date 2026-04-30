import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
    Plus, Trash2, Edit2, ShoppingCart, FileText, X, CheckCircle, Ban,
    Download, Eye, Search, Filter, RefreshCw,
} from "lucide-react";

import {
    getProducts,
    getBatchesByProduct,
    getDiscountLookup,
    getSales,
    createSale,
    updateSale,
    deleteSale,
    getBills,
    getBill,
    createBill,
    updateDraft,
    finalizeBill as finalizeBillApi,
    voidBill as voidBillApi,
    deleteDraft,
    getReceiptPdf,
} from "@/lib/salesApi";

const todayStr = () => new Date().toISOString().split("T")[0];
const money = (v) => `Rs ${(Number(v) || 0).toFixed(2)}`;
const uid = () => `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const STATUS_COLORS = {
    DRAFT: "bg-blue-100 text-blue-800 border-blue-300",
    FINALIZED: "bg-emerald-100 text-emerald-800 border-emerald-300",
    VOIDED: "bg-red-100 text-red-800 border-red-300",
};

export default function SalesModule({ role }) {
    const isAdmin = role === "Admin";
    const isStaff = role === "Staff";
    const { toast } = useToast();

    // ── Theme
    const textValue = isStaff ? "text-[#3E2723]" : "text-[#0F172A]";
    const textLabel = isStaff ? "text-[#4E342E]/60" : "text-[#334155]";
    const inputBg = isStaff ? "bg-[#EFEBE9] border-[#4E342E]/10" : "";
    const cardBg = isStaff ? "bg-[#FFF8F0] border-[#4E342E]/10" : "";

    // ── Data
    const [products, setProducts] = useState([]);
    const [batchesByProduct, setBatchesByProduct] = useState({});

    // ── History data - works with EITHER bills API or legacy sales API
    const [historyItems, setHistoryItems] = useState([]);  // normalized rows
    const [useBillsApi, setUseBillsApi] = useState(true);  // whether new API is available

    // ── Form state
    const [tab, setTab] = useState("record"); // record | history
    const [saleDate, setSaleDate] = useState(todayStr());
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState([{ id: uid(), productId: "", batchId: "", quantity: "", discountPercent: 0, discountNote: "" }]);
    const [editingBillId, setEditingBillId] = useState(null);
    const [editingLegacySaleId, setEditingLegacySaleId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const idempotencyRef = useRef(uid());

    // ── History filters
    const [statusFilter, setStatusFilter] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // ── Dialogs
    const [billDetailOpen, setBillDetailOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [voidDialogOpen, setVoidDialogOpen] = useState(false);
    const [voidBillId, setVoidBillId] = useState(null);
    const [voidReason, setVoidReason] = useState("");
    const [voiding, setVoiding] = useState(false);

    // ── Loading
    const [loading, setLoading] = useState(true);

    // ── Convert legacy sale to normalized bill-like row ──────────────────────────

    const legacySaleToBillRow = (sale) => ({
        id: sale.id,
        billNumber: sale.billNumber || `SALE-${sale.id}`,
        saleDate: sale.saleDate,
        status: sale.status || "FINALIZED",
        billTotal: sale.totalAmount || 0,
        createdBy: sale.createdBy || "-",
        createdAt: sale.createdAt,
        isLegacy: true,
        lines: [{
            id: sale.id,
            productId: sale.productId,
            productName: sale.productName,
            batchId: sale.batchId,
            batchNumber: sale.batchNumber,
            expiryDate: sale.expiryDate,
            quantity: sale.quantity,
            originalUnitPrice: sale.originalUnitPrice,
            discountPercent: sale.discountPercent,
            discountedUnitPrice: sale.discountedUnitPrice,
            totalAmount: sale.totalAmount,
            discountNote: sale.discountNote,
        }],
    });

    const billToBillRow = (bill) => ({
        id: bill.id,
        billNumber: bill.billNumber,
        saleDate: bill.saleDate,
        status: bill.status,
        billTotal: bill.billTotal || 0,
        createdBy: bill.createdBy || "-",
        createdAt: bill.createdAt,
        finalizedAt: bill.finalizedAt,
        finalizedBy: bill.finalizedBy,
        voidedAt: bill.voidedAt,
        voidedBy: bill.voidedBy,
        voidReason: bill.voidReason,
        notes: bill.notes,
        isLegacy: false,
        lines: bill.lines || [],
    });

    // ── Fetch data ──────────────────────────────────────────────────────────────

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);

            // Always fetch products
            try {
                const prods = await getProducts();
                setProducts(Array.isArray(prods) ? prods : []);
            } catch (err) {
                toast({ title: "Error", description: err.message || "Failed to fetch products", variant: "destructive" });
            }

            // Try bills API first, fall back to legacy sales API
            let gotBills = false;
            try {
                const billsData = await getBills(statusFilter || undefined);
                if (Array.isArray(billsData)) {
                    setHistoryItems(billsData.map(billToBillRow));
                    setUseBillsApi(true);
                    gotBills = true;
                }
            } catch {
                // Bills API not available
            }

            if (!gotBills) {
                // Fall back to legacy sales
                try {
                    const salesData = await getSales();
                    if (Array.isArray(salesData)) {
                        let rows = salesData.map(legacySaleToBillRow);
                        // Apply status filter for legacy sales
                        if (statusFilter) {
                            rows = rows.filter((r) => r.status === statusFilter);
                        }
                        setHistoryItems(rows);
                    } else {
                        setHistoryItems([]);
                    }
                    setUseBillsApi(false);
                } catch {
                    setHistoryItems([]);
                    setUseBillsApi(false);
                }
            }
        } finally {
            setLoading(false);
        }
    }, [statusFilter, toast]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const ensureBatchesLoaded = async (productId) => {
        if (!productId || batchesByProduct[productId]) return;
        try {
            const data = await getBatchesByProduct(productId);
            setBatchesByProduct((prev) => ({ ...prev, [productId]: Array.isArray(data) ? data : [] }));
        } catch { /* ignore */ }
    };

    // ── Line item handlers ──────────────────────────────────────────────────────

    const addItem = () => setItems((prev) => [...prev, { id: uid(), productId: "", batchId: "", quantity: "", discountPercent: 0, discountNote: "" }]);

    const removeItem = (itemId) => {
        if (items.length <= 1) return;
        setItems((prev) => prev.filter((i) => i.id !== itemId));
    };

    const handleProductChange = async (itemId, productId) => {
        await ensureBatchesLoaded(productId);
        setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, productId, batchId: "", quantity: "", discountPercent: 0, discountNote: "" } : i));
    };

    const handleBatchChange = async (itemId, productId, batchId) => {
        setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, batchId, quantity: "", discountPercent: 0, discountNote: "" } : i));
        if (productId && batchId) {
            try {
                const data = await getDiscountLookup(productId, batchId);
                setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, discountPercent: Number(data.discountPercent || 0), discountNote: data.note || "" } : i));
            } catch { /* ignore */ }
        }
    };

    const handleQtyChange = (itemId, value) => {
        setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, quantity: value } : i));
    };

    // ── Validation ──────────────────────────────────────────────────────────────

    const validateForm = () => {
        if (!saleDate) throw new Error("Sale date is required.");
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(`${saleDate}T00:00:00`) > today) throw new Error("Sale date cannot be in the future.");

        const validItems = items.filter((i) => i.productId || i.batchId || i.quantity);
        if (validItems.length === 0) throw new Error("Add at least one line item.");

        for (const item of validItems) {
            if (!item.productId) throw new Error("Please select a product for every line.");
            if (!item.batchId) throw new Error("Please select a batch for every line.");
            const qty = Number(item.quantity);
            if (!qty || qty < 1) throw new Error("Quantity must be at least 1.");
            if (!Number.isInteger(qty)) throw new Error("Quantity must be a whole number.");

            const batch = (batchesByProduct[item.productId] || []).find((b) => String(b.id) === String(item.batchId));
            if (batch) {
                if (qty > (batch.quantity || 0)) throw new Error(`Not enough stock. Available: ${batch.quantity}`);
                if (batch.expiryDate && new Date(`${batch.expiryDate}T00:00:00`) < new Date(`${saleDate}T00:00:00`))
                    throw new Error("Cannot sell from an expired batch.");
            }
        }

        return validItems;
    };

    // ── Form submit ─────────────────────────────────────────────────────────────

    const resetForm = () => {
        setItems([{ id: uid(), productId: "", batchId: "", quantity: "", discountPercent: 0, discountNote: "" }]);
        setSaleDate(todayStr());
        setNotes("");
        setEditingBillId(null);
        setEditingLegacySaleId(null);
        idempotencyRef.current = uid();
    };

    const handleSaveDraft = async () => {
        let validItems;
        try { validItems = validateForm(); } catch (err) {
            toast({ title: "Validation", description: err.message, variant: "destructive" }); return;
        }
        if (!useBillsApi) {
            toast({ title: "Not Available", description: "Save Draft requires the new backend. Please rebuild your backend first.", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                saleDate,
                notes: notes || null,
                idempotencyKey: idempotencyRef.current,
                finalize: false,
                lines: validItems.map((i) => ({
                    productId: Number(i.productId),
                    batchId: Number(i.batchId),
                    quantity: Number(i.quantity),
                })),
            };
            if (editingBillId) {
                await updateDraft(editingBillId, payload);
                toast({ title: "Draft updated" });
            } else {
                await createBill(payload);
                toast({ title: "Draft saved" });
            }
            resetForm();
            await fetchAll();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally { setSubmitting(false); }
    };

    const handleFinalize = async () => {
        let validItems;
        try { validItems = validateForm(); } catch (err) {
            toast({ title: "Validation", description: err.message, variant: "destructive" }); return;
        }
        setSubmitting(true);
        try {
            if (editingBillId && useBillsApi) {
                // Update and finalize existing draft via bill API
                const payload = {
                    saleDate, notes: notes || null, finalize: false,
                    lines: validItems.map((i) => ({ productId: Number(i.productId), batchId: Number(i.batchId), quantity: Number(i.quantity) })),
                };
                await updateDraft(editingBillId, payload);
                await finalizeBillApi(editingBillId);
            } else if (editingLegacySaleId) {
                // Editing a legacy sale — use legacy update
                const item = validItems[0];
                await updateSale(editingLegacySaleId, {
                    productId: Number(item.productId),
                    batchId: Number(item.batchId),
                    quantity: Number(item.quantity),
                    saleDate,
                });
            } else {
                // New sale — try bills API first, fall back to legacy
                let success = false;
                if (useBillsApi) {
                    try {
                        const payload = {
                            saleDate, notes: notes || null,
                            idempotencyKey: idempotencyRef.current,
                            finalize: true,
                            lines: validItems.map((i) => ({ productId: Number(i.productId), batchId: Number(i.batchId), quantity: Number(i.quantity) })),
                        };
                        await createBill(payload);
                        success = true;
                    } catch { /* fall through to legacy */ }
                }
                if (!success) {
                    // Legacy: create one sale per line item
                    for (const item of validItems) {
                        await createSale({
                            productId: Number(item.productId),
                            batchId: Number(item.batchId),
                            quantity: Number(item.quantity),
                            saleDate,
                        });
                    }
                }
            }
            toast({ title: "Sale finalized", description: "Stock has been deducted." });
            resetForm();
            await fetchAll();
        } catch (err) {
            toast({ title: "Finalization failed", description: err.message, variant: "destructive" });
        } finally { setSubmitting(false); }
    };

    // ── Edit (works with both legacy sales and bills) ───────────────────────────

    const openEdit = async (row) => {
        if (row.isLegacy) {
            // Legacy sale — load single line into form
            const line = row.lines[0];
            if (line?.productId) await ensureBatchesLoaded(String(line.productId));
            setItems([{
                id: uid(),
                productId: String(line?.productId || ""),
                batchId: String(line?.batchId || ""),
                quantity: String(line?.quantity || ""),
                discountPercent: line?.discountPercent || 0,
                discountNote: line?.discountNote || "",
            }]);
            setSaleDate(row.saleDate || todayStr());
            setNotes("");
            setEditingLegacySaleId(row.id);
            setEditingBillId(null);
            setTab("record");
        } else {
            // New bill — load from bills API
            try {
                const detail = await getBill(row.id);
                for (const line of detail.lines || []) {
                    await ensureBatchesLoaded(String(line.productId));
                }
                setItems(
                    (detail.lines || []).map((l) => ({
                        id: uid(),
                        productId: String(l.productId),
                        batchId: String(l.batchId),
                        quantity: String(l.quantity),
                        discountPercent: l.discountPercent || 0,
                        discountNote: l.discountNote || "",
                    }))
                );
                setSaleDate(detail.saleDate || todayStr());
                setNotes(detail.notes || "");
                setEditingBillId(detail.id);
                setEditingLegacySaleId(null);
                setTab("record");
            } catch (err) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
            }
        }
    };

    // ── Finalize existing draft (bills API only) ────────────────────────────────

    const handleFinalizeDraft = async (billId) => {
        setSubmitting(true);
        try {
            await finalizeBillApi(billId);
            toast({ title: "Bill finalized", description: "Stock has been deducted." });
            await fetchAll();
        } catch (err) {
            toast({ title: "Finalization failed", description: err.message, variant: "destructive" });
        } finally { setSubmitting(false); }
    };

    // ── Delete (works with both legacy sales and bills) ─────────────────────────

    const handleDelete = async (row) => {
        try {
            if (row.isLegacy) {
                await deleteSale(row.id);
            } else {
                await deleteDraft(row.id);
            }
            toast({ title: row.isLegacy ? "Sale deleted" : "Draft deleted" });
            if (editingBillId === row.id || editingLegacySaleId === row.id) resetForm();
            await fetchAll();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    // ── Void bill (bills API only) ──────────────────────────────────────────────

    const openVoidDialog = (billId) => {
        setVoidBillId(billId);
        setVoidReason("");
        setVoidDialogOpen(true);
    };

    const handleVoid = async () => {
        if (!voidReason || voidReason.trim().length < 5) {
            toast({ title: "Validation", description: "Void reason must be at least 5 characters.", variant: "destructive" }); return;
        }
        setVoiding(true);
        try {
            await voidBillApi(voidBillId, voidReason.trim());
            toast({ title: "Bill voided", description: "Stock has been restored." });
            setVoidDialogOpen(false);
            await fetchAll();
        } catch (err) {
            toast({ title: "Void failed", description: err.message, variant: "destructive" });
        } finally { setVoiding(false); }
    };

    // ── View detail ─────────────────────────────────────────────────────────────

    const openDetail = (row) => {
        setSelectedBill(row);
        setBillDetailOpen(true);
    };

    // ── Download PDF (bills API only) ───────────────────────────────────────────

    const handleDownloadPdf = async (billId, billNumber) => {
        try {
            const blob = await getReceiptPdf(billId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `receipt-${billNumber}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast({ title: "PDF failed", description: err.message, variant: "destructive" });
        }
    };

    // ── Filtered rows ───────────────────────────────────────────────────────────

    const filteredRows = historyItems.filter((r) => {
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            const matchBill = r.billNumber?.toLowerCase().includes(s);
            const matchProduct = r.lines?.some((l) => l.productName?.toLowerCase().includes(s));
            const matchDate = r.saleDate?.includes(s);
            if (!matchBill && !matchProduct && !matchDate) return false;
        }
        return true;
    });

    // ── Get product display price from item ─────────────────────────────────────

    const getItemPrice = (item) => {
        const prod = products.find((p) => String(p.productId ?? p.id) === String(item.productId));
        if (!prod) return 0;
        const unitPrice = prod.sellingPrice || prod.displayPrice || 0;
        const disc = Number(item.discountPercent || 0);
        return unitPrice * (1 - disc / 100);
    };

    const getItemTotal = (item) => {
        const qty = Number(item.quantity) || 0;
        return getItemPrice(item) * qty;
    };

    const billFormTotal = items.reduce((sum, item) => sum + getItemTotal(item), 0);

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════

    return (
        <div className="space-y-6">
            {/* ─── Tab Bar ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
                <Button variant={tab === "record" ? "default" : "ghost"} onClick={() => setTab("record")} className="rounded-2xl gap-2">
                    <ShoppingCart className="h-4 w-4" /> {editingBillId || editingLegacySaleId ? "Edit Sale" : "New Sale"}
                </Button>
                <Button variant={tab === "history" ? "default" : "ghost"} onClick={() => setTab("history")} className="rounded-2xl gap-2">
                    <FileText className="h-4 w-4" /> Sales History
                </Button>
                {(editingBillId || editingLegacySaleId) && (
                    <Button variant="ghost" size="sm" onClick={resetForm} className="ml-auto gap-1 text-orange-600">
                        <X className="h-3 w-3" /> Cancel Edit
                    </Button>
                )}
            </div>

            {/* ═══ RECORD TAB ═══════════════════════════════════════════════ */}
            {tab === "record" && (
                <Card className={`rounded-3xl shadow-xl ${cardBg}`}>
                    <CardHeader>
                        <CardTitle className={`text-xl ${textValue}`}>
                            {editingBillId ? `Editing Draft #${editingBillId}` : editingLegacySaleId ? `Editing Sale #${editingLegacySaleId}` : "Record New Sale"}
                        </CardTitle>
                        <CardDescription className={textLabel}>Add products, select batches, then save as draft or finalize.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Date & Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className={`font-bold text-xs uppercase tracking-widest ${textLabel}`}>Sale Date</Label>
                                <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} max={todayStr()} className={`rounded-2xl h-10 ${inputBg}`} />
                            </div>
                            <div className="space-y-2">
                                <Label className={`font-bold text-xs uppercase tracking-widest ${textLabel}`}>Notes (optional)</Label>
                                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bill notes..." className={`rounded-2xl h-10 ${inputBg}`} />
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className={`font-bold text-xs uppercase tracking-widest ${textLabel}`}>Line Items</Label>
                                {!editingLegacySaleId && (
                                    <Button type="button" variant="outline" size="sm" onClick={addItem} className="rounded-2xl gap-1">
                                        <Plus className="h-3 w-3" /> Add Line
                                    </Button>
                                )}
                            </div>

                            {items.map((item, idx) => (
                                <div key={item.id} className={`p-4 rounded-2xl border ${isStaff ? "border-[#4E342E]/10 bg-[#EFEBE9]/50" : "border-gray-200 bg-gray-50/50"} space-y-3`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-black uppercase tracking-widest ${textLabel}`}>Line #{idx + 1}</span>
                                        {items.length > 1 && !editingLegacySaleId && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-6 w-6">
                                                <Trash2 className="h-3 w-3 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        {/* Product */}
                                        <Select value={item.productId} onValueChange={(val) => handleProductChange(item.id, val)}>
                                            <SelectTrigger className={`rounded-2xl h-10 ${inputBg}`}><SelectValue placeholder="Product..." /></SelectTrigger>
                                            <SelectContent>
                                                {products.map((p) => (
                                                    <SelectItem key={p.productId ?? p.id} value={String(p.productId ?? p.id)}>
                                                        {p.productName ?? p.name} — {money(p.sellingPrice ?? p.displayPrice ?? p.price)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {/* Batch */}
                                        <Select value={item.batchId} onValueChange={(val) => handleBatchChange(item.id, item.productId, val)}>
                                            <SelectTrigger className={`rounded-2xl h-10 ${inputBg}`}><SelectValue placeholder="Batch..." /></SelectTrigger>
                                            <SelectContent>
                                                {(batchesByProduct[item.productId] || []).map((b) => (
                                                    <SelectItem key={b.id} value={String(b.id)}>
                                                        {b.batchNumber} • Exp: {b.expiryDate} • Qty: {b.quantity}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {/* Quantity */}
                                        <Input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => handleQtyChange(item.id, e.target.value)} className={`rounded-2xl h-10 ${inputBg}`} />
                                        {/* Line total */}
                                        <div className="flex items-center">
                                            <span className={`font-bold text-sm ${textValue}`}>{money(getItemTotal(item))}</span>
                                            {item.discountPercent > 0 && (
                                                <Badge variant="outline" className="ml-2 text-[9px] text-[#007A5E] border-[#007A5E] bg-[#007A5E]/10 px-1 py-0 h-4">
                                                    {item.discountPercent}% OFF
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Form Total & Buttons */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200/70">
                            <div>
                                <span className={`text-xs font-black uppercase tracking-widest ${textLabel}`}>Bill Total</span>
                                <span className={`text-2xl font-black ml-3 ${textValue}`}>{money(billFormTotal)}</span>
                            </div>
                            <div className="flex gap-2">
                                {!editingLegacySaleId && useBillsApi && (
                                    <Button variant="outline" onClick={handleSaveDraft} disabled={submitting} className="rounded-2xl gap-1">
                                        <FileText className="h-4 w-4" /> {editingBillId ? "Update Draft" : "Save Draft"}
                                    </Button>
                                )}
                                <Button onClick={handleFinalize} disabled={submitting} className="rounded-2xl gap-1">
                                    <CheckCircle className="h-4 w-4" /> {editingLegacySaleId ? "Update Sale" : "Finalize & Deduct Stock"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══ HISTORY TAB ══════════════════════════════════════════════ */}
            {tab === "history" && (
                <Card className={`rounded-3xl shadow-xl ${cardBg}`}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className={`text-xl ${textValue}`}>Sales History</CardTitle>
                                <CardDescription className={textLabel}>
                                    {useBillsApi ? "View, finalize, or void bills." : "View and manage recorded sales."}
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Filters */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search sale/product/date..." className={`pl-10 rounded-2xl h-10 ${inputBg}`} />
                            </div>
                            {useBillsApi && (
                                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
                                    <SelectTrigger className={`w-[160px] rounded-2xl h-10 ${inputBg}`}>
                                        <Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Statuses</SelectItem>
                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                        <SelectItem value="FINALIZED">Finalized</SelectItem>
                                        <SelectItem value="VOIDED">Voided</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Sales Table */}
                        <div className="rounded-2xl border border-gray-200/70 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest">{useBillsApi ? "Bill #" : "Sale #"}</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Product</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Qty</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Total</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                                        <TableHead className="text-right px-6 font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-12"><p className={`${textLabel} font-bold text-sm`}>Loading...</p></TableCell></TableRow>
                                    ) : filteredRows.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-12"><p className={`${textLabel} font-bold text-sm`}>No sales found.</p></TableCell></TableRow>
                                    ) : (
                                        filteredRows.map((row) => {
                                            const firstLine = row.lines?.[0];
                                            const productNames = row.lines?.map((l) => l.productName).filter(Boolean).join(", ") || "-";
                                            const totalQty = row.lines?.reduce((sum, l) => sum + (l.quantity || 0), 0) || 0;

                                            return (
                                                <TableRow key={`${row.isLegacy ? "s" : "b"}-${row.id}`} className="hover:bg-primary/[0.02] transition-colors">
                                                    <TableCell className="px-6 py-4">
                                                        <button type="button" onClick={() => openDetail(row)} className="text-left">
                                                            <p className={`font-black text-[11px] ${textValue} hover:underline`}>{row.billNumber}</p>
                                                        </button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className={`font-bold text-sm ${textValue} truncate max-w-[200px]`}>{productNames}</p>
                                                        {row.lines?.length > 1 && (
                                                            <span className="text-xs text-gray-400">({row.lines.length} items)</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className={`font-bold text-sm ${textLabel}`}>{row.saleDate}</TableCell>
                                                    <TableCell className="font-bold text-sm">{totalQty}</TableCell>
                                                    <TableCell className="font-bold text-sm">{money(row.billTotal)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`text-[9px] font-black ${STATUS_COLORS[row.status] || ""}`}>
                                                            {row.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right px-6">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => openDetail(row)} title="View">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>

                                                            {/* Edit & Delete for legacy sales and DRAFT bills */}
                                                            {(row.isLegacy || row.status === "DRAFT") && (
                                                                <>
                                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit">
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" onClick={() => { if (window.confirm("Delete this sale?")) handleDelete(row); }} title="Delete">
                                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                                    </Button>
                                                                </>
                                                            )}

                                                            {/* Finalize button for DRAFT bills only */}
                                                            {!row.isLegacy && row.status === "DRAFT" && (
                                                                <Button variant="ghost" size="icon" onClick={() => handleFinalizeDraft(row.id)} disabled={submitting} title="Finalize">
                                                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                                                </Button>
                                                            )}

                                                            {/* PDF download, Edit, Delete, and Void for FINALIZED bills — admin only for edit/delete/void */}
                                                            {!row.isLegacy && row.status === "FINALIZED" && (
                                                                <>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(row.id, row.billNumber)} title="Download PDF">
                                                                        <Download className="h-4 w-4" />
                                                                    </Button>
                                                                    {isAdmin && (
                                                                        <>
                                                                            <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit Sale">
                                                                                <Edit2 className="h-4 w-4 text-blue-500" />
                                                                            </Button>
                                                                            <Button variant="ghost" size="icon" onClick={() => { if (window.confirm("Are you sure you want to delete this sale? Stock will be restored.")) handleDelete(row); }} title="Delete Sale">
                                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                                            </Button>
                                                                            <Button variant="ghost" size="icon" onClick={() => openVoidDialog(row.id)} title="Void">
                                                                                <Ban className="h-4 w-4 text-red-500" />
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══ DETAIL DIALOG ════════════════════════════════════════════ */}
            <Dialog open={billDetailOpen} onOpenChange={setBillDetailOpen}>
                <DialogContent className="rounded-[2rem] max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Sale Details — {selectedBill?.billNumber}</DialogTitle>
                        <DialogDescription>
                            {selectedBill && (
                                <span className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className={`text-[9px] font-black ${STATUS_COLORS[selectedBill.status] || ""}`}>
                                        {selectedBill.status}
                                    </Badge>
                                    <span>Date: {selectedBill.saleDate}</span>
                                    <span>By: {selectedBill.createdBy || "-"}</span>
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBill && (
                        <div className="space-y-4">
                            {selectedBill.notes && (
                                <p className={`text-sm ${textLabel} italic`}>Notes: {selectedBill.notes}</p>
                            )}

                            {selectedBill.status === "VOIDED" && selectedBill.voidReason && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                                    <p className="text-xs font-bold text-red-800 uppercase">Voided</p>
                                    <p className="text-sm text-red-700">Reason: {selectedBill.voidReason}</p>
                                    <p className="text-xs text-red-500 mt-1">
                                        By {selectedBill.voidedBy} on {selectedBill.voidedAt ? new Date(selectedBill.voidedAt).toLocaleString() : "-"}
                                    </p>
                                </div>
                            )}

                            <div className="rounded-2xl border border-gray-200/70 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Product</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Batch</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Qty</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Unit Price</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Disc</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(selectedBill.lines || []).map((line, idx) => (
                                            <TableRow key={line.id || idx}>
                                                <TableCell className="px-4">
                                                    <p className={`font-black ${textValue}`}>{line.productName}</p>
                                                </TableCell>
                                                <TableCell className="font-bold text-sm">{line.batchNumber || "-"}</TableCell>
                                                <TableCell className="font-bold text-sm">{line.quantity}</TableCell>
                                                <TableCell className="font-bold text-sm">
                                                    {line.discountPercent > 0 ? (
                                                        <>
                                                            <span className="line-through text-red-500 block text-xs">{money(line.originalUnitPrice)}</span>
                                                            {money(line.discountedUnitPrice)}
                                                        </>
                                                    ) : money(line.originalUnitPrice)}
                                                </TableCell>
                                                <TableCell>
                                                    {line.discountPercent > 0 ? (
                                                        <Badge variant="outline" className="text-[9px] text-[#007A5E] border-[#007A5E] bg-[#007A5E]/10 px-1 py-0 h-4">
                                                            {line.discountPercent}% {line.discountNote ? `(${line.discountNote})` : ""}
                                                        </Badge>
                                                    ) : "-"}
                                                </TableCell>
                                                <TableCell className="font-bold text-sm">{money(line.totalAmount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-200/70">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Total</span>
                                <span className={`text-2xl font-black ${textValue}`}>{money(selectedBill.billTotal)}</span>
                            </div>

                            {selectedBill.finalizedAt && (
                                <p className={`text-xs ${textLabel}`}>
                                    Finalized by {selectedBill.finalizedBy} on {new Date(selectedBill.finalizedAt).toLocaleString()}
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter className="pt-4 gap-2">
                        {selectedBill && !selectedBill.isLegacy && selectedBill.status === "FINALIZED" && (
                            <Button variant="outline" className="rounded-2xl gap-1" onClick={() => handleDownloadPdf(selectedBill.id, selectedBill.billNumber)}>
                                <Download className="h-4 w-4" /> Download PDF
                            </Button>
                        )}
                        <Button variant="ghost" onClick={() => setBillDetailOpen(false)} className="rounded-2xl">Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ VOID DIALOG ══════════════════════════════════════════════ */}
            <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
                <DialogContent className="rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle>Void Bill</DialogTitle>
                        <DialogDescription>This will restore stock for all line items. This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-xs uppercase tracking-widest">Reason for voiding (required)</Label>
                            <Textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Enter reason (min 5 characters)..." className="rounded-2xl min-h-[80px]" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setVoidDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleVoid} disabled={voiding || voidReason.trim().length < 5} className="rounded-2xl gap-1">
                            <Ban className="h-4 w-4" /> Void Bill
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}