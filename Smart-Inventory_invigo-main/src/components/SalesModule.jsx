import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Clock, AlertTriangle, Edit2, Trash2, Plus, CheckCircle2, FileText, Search, X, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
    getProducts, getAvailableQuantity, getSalesHistory, recordPosSale,
    voidSale, editSaleQuantity, updateBill, finalizeDraft, checkDuplicate,
    getBatchesByProduct
} from "@/lib/salesApi";

const getSessionUser = () => {
    try { return JSON.parse(localStorage.getItem("invigo_user") || "{}"); } catch { return {}; }
};

const SalesModule = ({ role, canEdit = false }) => {
    const { toast } = useToast();

    // ── Data state ──────────────────────────────────────────────────────────
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [stockMap, setStockMap] = useState({});
    const [batchesMap, setBatchesMap] = useState({});

    // ── POS form state ───────────────────────────────────────────────────────
    const [items, setItems] = useState([{ id: "1", productId: "", batchId: "", quantity: "" }]);
    const [amountGiven, setAmountGiven] = useState("");
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
    const [notes, setNotes] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [sendReceipt, setSendReceipt] = useState(false);

    // ── Product picker state ──────────────────────────────────────────────────
    const [productPickerOpen, setProductPickerOpen] = useState(false);
    const [productPickerLineId, setProductPickerLineId] = useState(null);
    const [productPickerMode, setProductPickerMode] = useState("pos"); // "pos" | "edit"
    const [productPickerSearch, setProductPickerSearch] = useState("");

    // ── Duplicate warning state ──��───────────────────────────────────────────
    const [dupWarnOpen, setDupWarnOpen] = useState(false);
    const [dupPendingPayload, setDupPendingPayload] = useState(null);

    // ── Void dialog state ────���───────────────────────────────────────────────
    const [voidDialogOpen, setVoidDialogOpen] = useState(false);
    const [voidTargetId, setVoidTargetId] = useState(null);
    const [voidReason, setVoidReason] = useState("");
    const [voidSaving, setVoidSaving] = useState(false);

    // ── Single-line edit modal (legacy) ──────���───────────────────────────────
    const [editOpen, setEditOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    // ── Bill detail / invoice state ──────��───────────────────────────────────
    const [billOpen, setBillOpen] = useState(false);
    const [selectedBillId, setSelectedBillId] = useState(null);

    // ── Full bill edit state ───────────────────────────────��─────────────────
    const [fullEditOpen, setFullEditOpen] = useState(false);
    const [editBillGroupId, setEditBillGroupId] = useState(null);
    const [editBillItems, setEditBillItems] = useState([{ id: "1", productId: "", batchId: "", quantity: "" }]);
    const [editBillDate, setEditBillDate] = useState(new Date().toISOString().split("T")[0]);
    const [editBillNotes, setEditBillNotes] = useState("");
    const [editBillCustomerName, setEditBillCustomerName] = useState("");
    const [editBillCustomerEmail, setEditBillCustomerEmail] = useState("");
    const [editBillSendReceipt, setEditBillSendReceipt] = useState(false);
    const [editBillReason, setEditBillReason] = useState("");
    const [editBillSaving, setEditBillSaving] = useState(false);

    // ── Sales tab state ──────────────────────────────────────────────────────
    const [salesTab, setSalesTab] = useState((role === "Admin" || canEdit) ? "all" : "mine"); // "mine" | "all"

    // ── Filter / sort state ──────────────────────────────────────────────────
    const [filterSearch, setFilterSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [filterDateError, setFilterDateError] = useState("");
    const [sortBy, setSortBy] = useState("NEWEST");

    // ── Initial load ──────────────────────────────────────────────────────────
    useEffect(() => { refreshData(); }, []);

    const refreshData = async () => {
        try {
            const fetchedProducts = await getProducts();
            setProducts(fetchedProducts);
            const fetchedSales = await getSalesHistory();
            setSales(fetchedSales);
            const newStockMap = {};
            await Promise.all(fetchedProducts.map(async (p) => {
                const qty = await getAvailableQuantity(p.productId);
                newStockMap[String(p.productId)] = qty;
            }));
            setStockMap(newStockMap);
        } catch (error) {
            toast({ title: "Error loading data", description: error.message, variant: "destructive" });
        }
    };

    // ── Role / permission helpers (must come before derived values) ──────────
    const isAdmin = role === "Admin";
    const canEditSales = isAdmin || canEdit;

    // ── Derived values ─────────────────────────────────────────────────────────
    const currentUser = getSessionUser();
    const todaySales = sales.filter(s => {
        if (s.saleDate !== new Date().toISOString().split("T")[0]) return false;
        if (s.status !== "ACTIVE" && s.status !== "FINALIZED") return false;
        if (canEditSales) return true;
        const rb = (s.recordedBy || "").toLowerCase();
        const u1 = (currentUser.username || "").toLowerCase();
        const u2 = (currentUser.name || "").toLowerCase();
        return rb === u1 || rb === u2 || rb === "system";
    });
    const todayCount = [...new Set(todaySales.map(s => s.saleGroupId))].length;
    const todayQuantity = todaySales.reduce((acc, s) => acc + (s.quantitySold ?? s.quantity ?? 0), 0);

    let displaySales = [...sales].filter(s => {
        // "mine" tab always shows only current user's sales
        if (salesTab === "mine") {
            const rb = (s.recordedBy || "").toLowerCase();
            const u1 = (currentUser.username || "").toLowerCase();
            const u2 = (currentUser.name || "").toLowerCase();
            if (rb !== u1 && rb !== u2 && rb !== "system") return false;
        }
        if (filterStatus === "EDITED") return !!s.lastEditedBy && (s.status === "ACTIVE" || s.status === "FINALIZED");
        if (filterStatus !== "ALL") {
            const effStatus = s.status === "ACTIVE" ? "FINALIZED" : s.status === "VOID" ? "VOIDED" : s.status;
            if (effStatus !== filterStatus) return false;
        }
        if (filterDateFrom && s.saleDate < filterDateFrom) return false;
        if (filterDateTo && s.saleDate > filterDateTo) return false;
        if (filterSearch && !s.productName.toLowerCase().includes(filterSearch.toLowerCase())) return false;
        return true;
    });
    displaySales.sort((a, b) => {
        if (sortBy === "NEWEST") return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime() || b.id - a.id;
        if (sortBy === "PRODUCT") return a.productName.localeCompare(b.productName);
        if (sortBy === "QUANTITY") return (b.quantitySold ?? b.quantity ?? 0) - (a.quantitySold ?? a.quantity ?? 0);
        return 0;
    });

    const getItemCurrentStock = (productId) => stockMap[String(productId)] || 0;
    const getProductById = (id) => products.find(p => String(p.productId) === String(id));

    const handlePickProduct = async (productId) => {
        const val = String(productId);
        
        // Immediate UI feedback: update the item and close picker
        if (productPickerMode === "pos") {
            setItems(prev => prev.map(i =>
                String(i.id) === String(productPickerLineId) ? { ...i, productId: val, batchId: "", quantity: "" } : i
            ));
        } else {
            setEditBillItems(prev => prev.map(i =>
                String(i.id) === String(productPickerLineId) ? { ...i, productId: val, batchId: "", quantity: "" } : i
            ));
        }
        setProductPickerOpen(false);

        // Fetch batches for the selected product in background
        if (val && !batchesMap[val]) {
            try {
                const batches = await getBatchesByProduct(val);
                setBatchesMap(prev => ({ ...prev, [val]: batches }));
            } catch (err) {
                console.error("Failed to load batches for selection", err);
            }
        }
    };

    // POS totals
    const lineTotals = items.map(item => {
        if (!item.productId || typeof item.quantity !== "number") return 0;
        const product = getProductById(item.productId);
        return (product?.sellingPrice ?? 0) * item.quantity;
    });
    const billTotal = lineTotals.reduce((sum, v) => sum + v, 0);

    // Form valid
    const isFormValid = saleDate !== "" &&
        items.some(i => i.productId && typeof i.quantity === "number" && i.quantity > 0) &&
        items.every(i => {
            if (!i.productId || typeof i.quantity !== "number" || i.quantity <= 0) return true;
            return i.quantity <= getItemCurrentStock(i.productId);
        });

    // canEdit (tick) = can edit ANY sale with no restrictions; no tick = view only
    const canEditThisSale = (sale) => {
        if (sale.status === "VOID" || sale.status === "VOIDED") return false;
        return isAdmin || canEdit;
    };

    // ── POS sale handlers ─────────────────────────────────────────────────────
    const buildPayloadItems = () =>
        items
            .filter(i => i.productId && typeof i.quantity === "number" && i.quantity > 0)
            .map(i => ({ 
                productId: parseInt(i.productId), 
                batchId: i.batchId ? parseInt(i.batchId) : null,
                quantity: i.quantity 
            }));

    const executeRecordSale = async (payload) => {
        await recordPosSale(payload);
        toast({
            title: payload.asDraft ? "Draft Saved" : "Sale Recorded Successfully",
            description: payload.asDraft
                ? "Bill saved as draft. Finalize it to deduct stock."
                : `POS bill captured with ${payload.items.length} line item(s).`,
        });
        setItems([{ id: "1", productId: "", batchId: "", quantity: "" }]);
        setAmountGiven("");
        setNotes("");
        setCustomerName("");
        setCustomerEmail("");
        setSendReceipt(false);
        await refreshData();
    };

    const handleRecordSale = async (e, asDraft = false) => {
        e.preventDefault();
        if (!isFormValid) return;
        const sUser = getSessionUser();
        const user = sUser.username || (isAdmin ? "admin" : "staff");
        const payloadItems = buildPayloadItems();
        const payload = {
            saleDate,
            recordedBy: user,
            notes,
            items: payloadItems,
            customerName: customerName.trim() || null,
            customerEmail: (sendReceipt && customerEmail.trim()) ? customerEmail.trim() : null,
            asDraft,
        };

        // Future date validation
        if (saleDate > new Date().toISOString().split("T")[0]) {
            toast({ title: "Invalid Date", description: "Sale date cannot be in the future.", variant: "destructive" });
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (sendReceipt && customerEmail.trim() && !emailRegex.test(customerEmail.trim())) {
            toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
            return;
        }

        try {
            // Duplicate check (skip for drafts)
            if (!asDraft) {
                let dupFound = false;
                for (const item of payloadItems) {
                    const isDup = await checkDuplicate(item.productId, saleDate, item.quantity, payload.customerName);
                    if (isDup) { dupFound = true; break; }
                }
                if (dupFound) {
                    setDupPendingPayload(payload);
                    setDupWarnOpen(true);
                    return;
                }
            }
            await executeRecordSale(payload);
        } catch (error) {
            toast({ title: "Error Recording Sale", description: error.message, variant: "destructive" });
        }
    };

    // ── Void handlers ─────────────────────────────────────────────────────────
    const handleVoidClick = (saleId) => {
        setVoidTargetId(saleId);
        setVoidReason("");
        setVoidDialogOpen(true);
    };

    const handleVoidConfirm = async () => {
        if (!voidReason.trim()) {
            toast({ title: "Reason required", description: "Please enter a void reason.", variant: "destructive" });
            return;
        }
        const sUser = getSessionUser();
        setVoidSaving(true);
        try {
            await voidSale(voidTargetId, sUser.username || "system", voidReason.trim());
            toast({ title: "Sale Voided", description: "Inventory has been restored. Transaction preserved for audit." });
            setVoidDialogOpen(false);
            await refreshData();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setVoidSaving(false);
        }
    };

    // ── Single-line edit (legacy) ─────────────────────────────────────────────
    const openEdit = (id, currentQty) => {
        setEditData({ id: String(id), newQuantity: currentQty });
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editData || typeof editData.newQuantity !== "number" || editData.newQuantity <= 0) {
            toast({ title: "Validation Error", description: "Quantity must be > 0", variant: "destructive" });
            return;
        }
        const sUser = getSessionUser();
        try {
            await editSaleQuantity(editData.id, editData.newQuantity, sUser.username || "system", editData.editReason || "");
            toast({ title: "Sale Updated", description: "Inventory adjusted automatically." });
            setEditOpen(false);
            await refreshData();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    // ── Bill view ─────────────────────────────────────────────────────────────
    const openBillDetails = (billId) => {
        setSelectedBillId(String(billId));
        setBillOpen(true);
    };

    // ── Full bill edit ────────────────────────────────────────────────────────
    const openFullEdit = (billGroupId) => {
        const billLines = sales.filter(s =>
            (s.saleGroupId ?? String(s.id)) === String(billGroupId) && (s.status === "ACTIVE" || s.status === "FINALIZED")
        );
        setEditBillGroupId(String(billGroupId));
        setEditBillDate(billLines[0]?.saleDate || new Date().toISOString().split("T")[0]);
        setEditBillNotes(billLines[0]?.notes || "");
        setEditBillCustomerName(billLines[0]?.customerName || "");
        const existingEmail = billLines[0]?.customerEmail || "";
        setEditBillCustomerEmail(existingEmail);
        setEditBillSendReceipt(!!existingEmail);
        setEditBillReason("");
        setEditBillItems(billLines.map(l => ({ 
            id: String(l.id), 
            productId: String(l.productId), 
            batchId: l.batchId ? String(l.batchId) : "",
            quantity: (l.quantitySold ?? l.quantity ?? 0) 
        })));
        setFullEditOpen(true);
    };

    const handleFullEditSave = async () => {
        if (!editBillGroupId) return;
        const validItems = editBillItems.filter(i => i.productId && typeof i.quantity === "number" && i.quantity > 0);
        if (validItems.length === 0) {
            toast({ title: "Validation Error", description: "At least one product line is required.", variant: "destructive" });
            return;
        }
        if (!editBillReason.trim()) {
            toast({ title: "Reason required", description: "Please enter a reason for this edit.", variant: "destructive" });
            return;
        }

        // Auth re-check: verify the user still has permission to edit this specific bill
        const billLine = sales.find(s => (s.saleGroupId ?? String(s.id)) === editBillGroupId && (s.status === "ACTIVE" || s.status === "FINALIZED"));
        if (billLine && !canEditThisSale(billLine)) {
            toast({ title: "Permission Denied", description: "You can only edit your own bills within 2 hours of recording.", variant: "destructive" });
            setFullEditOpen(false);
            return;
        }

        // Duplicate product check: same product cannot appear twice in one bill
        const productIds = validItems.map(i => i.productId);
        if (new Set(productIds).size !== productIds.length) {
            toast({ title: "Duplicate Product", description: "The same product appears more than once. Merge the quantities into one line.", variant: "destructive" });
            return;
        }

        // Future date validation
        if (editBillDate > new Date().toISOString().split("T")[0]) {
            toast({ title: "Invalid Date", description: "Sale date cannot be in the future.", variant: "destructive" });
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (editBillSendReceipt && editBillCustomerEmail.trim() && !emailRegex.test(editBillCustomerEmail.trim())) {
            toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
            return;
        }

        // Stock validation
        for (const item of validItems) {
            const available = getItemCurrentStock(item.productId);
            const product = getProductById(item.productId);
            if (item.quantity > available) {
                toast({ title: "Insufficient Stock", description: `Only ${available} units available for ${product?.productName ?? "this product"}.`, variant: "destructive" });
                return;
            }
        }

        const sUser = getSessionUser();
        setEditBillSaving(true);
        try {
            await updateBill(editBillGroupId, {
                saleDate: editBillDate,
                recordedBy: sUser.username || "system",
                notes: editBillNotes,
                items: validItems.map(i => ({ 
                productId: parseInt(i.productId), 
                batchId: i.batchId ? parseInt(i.batchId) : null,
                quantity: i.quantity 
            })),
                customerName: editBillCustomerName.trim() || null,
                customerEmail: (editBillSendReceipt && editBillCustomerEmail.trim()) ? editBillCustomerEmail.trim() : null,
                lastEditedBy: sUser.username || "system",
                editReason: editBillReason.trim(),
            });
            toast({ title: "Bill Updated", description: "Inventory adjusted. Audit trail recorded." });
            setFullEditOpen(false);
            await refreshData();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setEditBillSaving(false);
        }
    };

    // ── Draft finalize ────────────────────────────────────────────────────────
    const handleFinalizeDraft = async (billGroupId) => {
        const sUser = getSessionUser();
        try {
            await finalizeDraft(billGroupId, sUser.username || "system");
            toast({ title: "Draft Finalized", description: "Stock deducted. Bill is now ACTIVE." });
            await refreshData();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    // ── Computed bill data for invoice modal ──────────────────────────────────
    const selectedBillLines = selectedBillId
        ? sales.filter(s => (s.saleGroupId ?? String(s.id)) === selectedBillId)
        : [];
    const selectedBillActive = selectedBillLines.filter(s => s.status !== "VOID" && s.status !== "VOIDED");
    const selectedBillTotal = selectedBillActive.reduce((sum, s) => sum + (s.lineTotal ?? 0), 0);

    // ── Styling ───────────────────────────────────────────────────────────────
    const isDark = false;
    const isStaff = role === "Staff";
    const bgCard = isStaff
        ? "card-premium border-none shadow-[0_8px_30px_rgb(78,52,46,0.04)] bg-[#F9F5EC]"
        : "card-premium border-none shadow-premium bg-white";
    const textLabel = isStaff ? "text-[#4E342E]/50" : "text-[#0F172A]/40";
    const textValue = isStaff ? "text-[#4E342E]" : "text-[#0F172A]";
    const inputBg = isStaff
        ? "bg-[#F5EBE1] border-[#4E342E]/10 placeholder:text-[#4E342E]/30"
        : "bg-white border-gray-200 placeholder:text-[#0F172A]/30";

    const statusBadge = (status) => {
        if (status === "ACTIVE" || status === "FINALIZED") return "bg-emerald-100 text-emerald-600";
        if (status === "DRAFT") return "bg-yellow-100 text-yellow-700";
        return "bg-gray-100 text-gray-600";
    };

    const formatDateTime = (isoStr) => {
        if (!isoStr) return null;
        try {
            return new Date(isoStr).toLocaleString("en-US", {
                month: "short", day: "numeric", year: "numeric",
                hour: "2-digit", minute: "2-digit"
            });
        } catch { return isoStr; }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-10">

            {/* Summary Row */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className={`${bgCard} p-6 rounded-[2rem]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-[#007A5E]/10 text-[#007A5E]"><ShoppingCart size={24}/></div>
                    </div>
                    <p className={`text-xs font-black uppercase tracking-widest ${textLabel} mb-1`}>Today's Bills</p>
                    <h3 className={`text-4xl font-black ${textValue}`}>{todayCount}</h3>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className={`${bgCard} p-6 rounded-[2rem]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED]"><Clock size={24}/></div>
                    </div>
                    <p className={`text-xs font-black uppercase tracking-widest ${textLabel} mb-1`}>Units Sold Today</p>
                    <h3 className={`text-4xl font-black ${textValue}`}>{todayQuantity}</h3>
                </motion.div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">

                {/* ── POS Form ── */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className={`${bgCard} p-0 overflow-hidden`}>
                        <CardHeader className={`p-6 border-b ${isDark ? "border-white/5" : "border-[#0F172A]/5"}`}>
                            <CardTitle className={`font-black text-xl ${textValue}`}>Record New Sale (POS)</CardTitle>
                            <CardDescription className="font-bold">
                                Add multiple products to one bill. Stock deducted via FEFO.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <form onSubmit={(e) => handleRecordSale(e, false)} className="space-y-4">
                                {/* Line Items */}
                                <div className="space-y-3">
                                    {items.map((item, index) => {
                                        const currentStock = getItemCurrentStock(item.productId);
                                        const product = getProductById(item.productId);
                                        const lineTotal = lineTotals[index];
                                        return (
                                            <div key={item.id} className="rounded-2xl border border-gray-200/60 p-3 space-y-2 bg-white/40">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Line {index + 1}</Label>
                                                    {items.length > 1 && (
                                                        <button type="button"
                                                            onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                                                            className="text-[10px] font-black uppercase tracking-widest text-red-500">
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setProductPickerLineId(item.id);
                                                        setProductPickerMode("pos");
                                                        setProductPickerSearch("");
                                                        setProductPickerOpen(true);
                                                    }}
                                                    className={`w-full rounded-2xl h-10 font-bold text-left px-3 flex items-center justify-between border ${inputBg}`}
                                                >
                                                    <span className={`text-sm truncate ${item.productId ? textValue : 'text-[#0F172A]/30'}`}>
                                                        {item.productId
                                                            ? (getProductById(item.productId)?.productName ?? "Choose product...")
                                                            : "Choose product..."}
                                                    </span>
                                                    <Search size={14} className="text-[#0F172A]/30 flex-shrink-0 ml-2" />
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" min="1" className={`rounded-2xl h-10 ${inputBg}`}
                                                        placeholder="Qty" value={item.quantity}
                                                        onChange={e => setItems(prev => prev.map(i =>
                                                            i.id === item.id ? { ...i, quantity: e.target.value ? parseInt(e.target.value) : "" } : i
                                                        ))} />
                                                    <div className="text-right text-[11px] font-bold flex-1">
                                                        <div className={textLabel}>Line Total</div>
                                                        <div className={textValue}>Rs {lineTotal.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                                {item.productId && typeof item.quantity === "number" && item.quantity > currentStock && (
                                                    <p className="text-red-500 text-[11px] font-bold flex items-center gap-1">
                                                        <AlertTriangle size={12}/> Only {currentStock} units available.
                                                    </p>
                                                )}
                                                {item.productId && (
                                                    <div className="space-y-2">
                                                        <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>
                                                            Batch Selection (Optional)
                                                        </Label>
                                                        <Select 
                                                            value={item.batchId || "fefo"} 
                                                            onValueChange={(v) => setItems(prev => prev.map(i => 
                                                                i.id === item.id ? { ...i, batchId: v === "fefo" ? "" : v } : i
                                                            ))}
                                                        >
                                                            <SelectTrigger className={`rounded-2xl h-10 font-bold ${inputBg}`}>
                                                                <SelectValue placeholder="Auto-Select (Oldest First)" />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-2xl">
                                                                <SelectItem value="fefo">Auto-Select (Oldest First)</SelectItem>
                                                                {batchesMap[item.productId]?.map(b => (
                                                                    <SelectItem key={b.id} value={String(b.id)}>
                                                                        {b.batchNumber} (Exp: {b.expiryDate}) - Qty: {b.quantity}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                                {item.productId && (
                                                    <p className={`text-[11px] font-bold opacity-70 ${textLabel}`}>
                                                        Total Stock: <span className="font-black">{currentStock}</span> •
                                                        Price: <span className="font-black">Rs {product?.sellingPrice.toFixed(2) ?? "0.00"}</span>
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {(() => {
                                        const last = items[items.length - 1];
                                        const canAddLine = last.productId && typeof last.quantity === "number" && last.quantity > 0;
                                        return (
                                            <Button type="button" variant="outline"
                                                disabled={!canAddLine}
                                                className="w-full rounded-2xl font-black text-xs disabled:opacity-40"
                                                onClick={() => setItems(prev => [...prev, { id: String(Date.now()), productId: "", batchId: "", quantity: "" }])}>
                                                <Plus size={14} className="mr-2"/> Add Another Product
                                            </Button>
                                        );
                                    })()}
                                </div>

                                {/* Date */}
                                <div className="space-y-2">
                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>Date of Sale</Label>
                                    <Input type="date" className={`rounded-2xl h-12 ${inputBg}`}
                                        value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>Reference / Notes (Optional)</Label>
                                    <Input className={`rounded-2xl h-12 ${inputBg}`} placeholder="Invoice # or details..."
                                        value={notes} onChange={e => setNotes(e.target.value)} />
                                </div>

                                {/* Customer */}
                                <div className="space-y-3 border-t border-gray-200/60 pt-4">
                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>Customer (Optional)</Label>
                                    <Input className={`rounded-2xl h-10 ${inputBg}`} placeholder="Customer name"
                                        value={customerName} onChange={e => setCustomerName(e.target.value)} />
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id="sendReceipt" checked={sendReceipt}
                                            onChange={e => setSendReceipt(e.target.checked)}
                                            className="h-4 w-4 accent-[#007A5E] rounded" />
                                        <label htmlFor="sendReceipt" className={`text-[11px] font-bold ${textLabel} cursor-pointer`}>
                                            Send receipt to email
                                        </label>
                                    </div>
                                    {sendReceipt && (
                                        <Input type="email" className={`rounded-2xl h-10 ${inputBg}`}
                                            placeholder="customer@email.com" value={customerEmail}
                                            onChange={e => setCustomerEmail(e.target.value)} />
                                    )}
                                </div>

                                {/* Bill total + cash tendered */}
                                <div className="flex items-center justify-between pt-2">
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Bill Total</div>
                                    <div className={`text-2xl font-black ${textValue}`}>Rs {billTotal.toFixed(2)}</div>
                                </div>
                                <div className="space-y-2 border-t border-gray-200/60 pt-3">
                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>Amount Given by Customer</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className={`rounded-2xl h-12 ${inputBg}`}
                                        placeholder="e.g. 500.00"
                                        value={amountGiven}
                                        onChange={e => setAmountGiven(e.target.value)}
                                    />
                                    {amountGiven !== "" && !isNaN(parseFloat(amountGiven)) && (
                                        <div className={`flex items-center justify-between rounded-2xl px-4 py-3 mt-1 ${
                                            parseFloat(amountGiven) >= billTotal
                                                ? "bg-emerald-50 border border-emerald-200"
                                                : "bg-red-50 border border-red-200"
                                        }`}>
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${
                                                parseFloat(amountGiven) >= billTotal ? "text-emerald-600" : "text-red-500"
                                            }`}>
                                                {parseFloat(amountGiven) >= billTotal ? "Change to Return" : "Amount Short"}
                                            </span>
                                            <span className={`text-xl font-black ${
                                                parseFloat(amountGiven) >= billTotal ? "text-emerald-700" : "text-red-600"
                                            }`}>
                                                Rs {Math.abs(parseFloat(amountGiven) - billTotal).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Buttons */}
                                <Button type="submit" disabled={!isFormValid}
                                    className="w-full mt-2 py-6 rounded-2xl bg-[#007A5E] text-white font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                    <CheckCircle2 size={18} className="mr-2"/> Record POS Bill
                                </Button>
                                <Button type="button" disabled={!isFormValid} variant="outline"
                                    onClick={(e) => handleRecordSale(e, true)}
                                    className="w-full py-5 rounded-2xl font-black text-sm">
                                    <FileText size={16} className="mr-2"/> Save as Draft
                                </Button>

                                <p className={`text-center text-[10px] uppercase font-bold tracking-widest ${textLabel} mt-2`}>
                                    Stock deducted from earliest-expiry batch (FEFO).
                                </p>
                            </form>
                        </CardContent>
                    </Card>

                    {(isAdmin || canEdit) && (
                        <Card className={`${bgCard} p-6 rounded-[2rem] border-dashed border-2 ${isDark ? "border-white/10" : "border-[#0F172A]/10"}`}>
                            <CardHeader className="p-0 mb-3">
                                <CardTitle className={`font-black text-lg ${textValue}`}>Sales Oversight</CardTitle>
                                <CardDescription className="font-bold text-xs">
                                    Full history access — use the <span className="font-black">All Bills</span> tab to view and edit any bill.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    )}
                </div>

                {/* ── Sales History Table ── */}
                <div className="lg:col-span-2">
                    <Card className={`${bgCard} p-0 overflow-hidden`}>
                        <CardHeader className={`p-6 border-b ${isDark ? "border-white/5" : "border-[#0F172A]/5"} flex-col gap-4 items-start`}>
                            <div className="flex items-center justify-between w-full">
                                <div>
                                    <CardTitle className={`font-black text-xl ${textValue}`}>
                                        {salesTab === "all" ? "All Bills" : "My Sales"}
                                    </CardTitle>
                                    <CardDescription className="font-bold">
                                        {salesTab === "all"
                                            ? "All bills from every user — full edit access."
                                            : "Your own transaction records."}
                                    </CardDescription>
                                </div>
                            </div>
                            {/* Tabs */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSalesTab("mine")}
                                    className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                        salesTab === "mine"
                                            ? "bg-[#007A5E] text-white shadow-sm"
                                            : `${isDark ? "text-white/40 hover:text-white hover:bg-white/10" : "text-[#0F172A]/40 hover:text-[#0F172A] hover:bg-[#0F172A]/5"}`
                                    }`}>
                                    My Sales
                                </button>
                                {(isAdmin || canEdit) && (
                                    <button
                                        type="button"
                                        onClick={() => setSalesTab("all")}
                                        className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                            salesTab === "all"
                                                ? "bg-[#7C3AED] text-white shadow-sm"
                                                : `${isDark ? "text-white/40 hover:text-white hover:bg-white/10" : "text-[#0F172A]/40 hover:text-[#0F172A] hover:bg-[#0F172A]/5"}`
                                        }`}>
                                        All Bills
                                    </button>
                                )}
                            </div>
                        </CardHeader>
                        <div className={`px-6 pb-4 flex flex-wrap items-center gap-2`}>
                                <Input placeholder="Search product..." className={`rounded-2xl h-10 w-32 lg:w-40 ${inputBg}`}
                                    value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className={`rounded-2xl h-10 w-32 font-bold ${inputBg}`}>
                                        <SelectValue placeholder="Status"/>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        <SelectItem value="ALL">All Status</SelectItem>
                                        <SelectItem value="FINALIZED">Active</SelectItem>
                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                        <SelectItem value="VOIDED">Voided</SelectItem>
                                        {(isAdmin || canEdit) && <SelectItem value="EDITED">Edited Only</SelectItem>}
                                    </SelectContent>
                                </Select>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <Input type="date" className={`rounded-2xl h-10 w-36 ${inputBg}`}
                                            placeholder="From"
                                            value={filterDateFrom}
                                            onChange={e => {
                                                setFilterDateFrom(e.target.value);
                                                if (filterDateTo && e.target.value && e.target.value > filterDateTo) {
                                                    setFilterDateError("Start date cannot be after end date.");
                                                } else {
                                                    setFilterDateError("");
                                                }
                                            }} />
                                        <span className={`text-[11px] font-bold ${textLabel}`}>–</span>
                                        <Input type="date" className={`rounded-2xl h-10 w-36 ${inputBg}`}
                                            placeholder="To"
                                            value={filterDateTo}
                                            onChange={e => {
                                                setFilterDateTo(e.target.value);
                                                if (filterDateFrom && e.target.value && e.target.value < filterDateFrom) {
                                                    setFilterDateError("End date cannot be before start date.");
                                                } else {
                                                    setFilterDateError("");
                                                }
                                            }} />
                                    </div>
                                    {filterDateError && (
                                        <p className="text-red-500 text-[10px] font-bold flex items-center gap-1 px-1">
                                            <AlertTriangle size={10}/> {filterDateError}
                                        </p>
                                    )}
                                </div>
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className={`rounded-2xl h-10 w-32 font-bold ${inputBg}`}>
                                        <SelectValue placeholder="Sort"/>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        <SelectItem value="NEWEST">Newest</SelectItem>
                                        <SelectItem value="PRODUCT">Product</SelectItem>
                                        <SelectItem value="QUANTITY">Quantity</SelectItem>
                                    </SelectContent>
                                </Select>
                        </div>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className={isStaff ? "bg-[#4E342E]/[0.02]" : "bg-[#0F172A]/[0.02]"}>
                                    <TableRow className={isStaff ? "border-[#4E342E]/5" : "border-[#0F172A]/5"}>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest px-6">Bill / Line</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Product</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Qty</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Amount</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                                        {(isAdmin || canEdit) && <TableHead className="text-right px-6 font-black uppercase text-[10px] tracking-widest">Action</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displaySales.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={(isAdmin || canEdit) ? 7 : 6} className="text-center py-12">
                                                <p className={`${textLabel} font-bold text-sm`}>No sales found.</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : displaySales.map((sale) => (
                                        <TableRow key={sale.id}
                                            className={`${isStaff ? "border-[#4E342E]/5 hover:bg-[#4E342E]/[0.02]" : "border-[#0F172A]/5 hover:bg-primary/[0.03]"} transition-colors ${(sale.status === "VOID" || sale.status === "VOIDED") ? "opacity-50" : ""}`}>
                                            <TableCell className="px-6 py-4">
                                                {(isAdmin || canEdit) ? (
                                                    <button type="button"
                                                        onClick={() => openBillDetails(sale.saleGroupId ?? String(sale.id))}
                                                        className="text-left">
                                                        <p className={`font-black text-[11px] underline ${textValue}`}>
                                                            {sale.saleGroupId ?? sale.id}
                                                        </p>
                                                        <p className={`text-[10px] font-bold ${textLabel} uppercase`}>View Full Bill</p>
                                                    </button>
                                                ) : (
                                                    <>
                                                        <p className={`font-black text-[11px] ${textValue}`}>{sale.saleGroupId ?? sale.id}</p>
                                                        <p className={`text-[10px] font-bold ${textLabel} uppercase`}>Line #{sale.id}</p>
                                                    </>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <p className={`font-black ${textValue}`}>{sale.productName}</p>
                                                <p className={`text-[10px] font-bold ${textLabel} uppercase`}>
                                                    #{sale.id} • {sale.recordedBy}
                                                    {sale.lastEditedBy && <span className="text-[#7C3AED]"> • edited by {sale.lastEditedBy}</span>}
                                                </p>
                                            </TableCell>
                                            <TableCell className="font-bold text-lg">{sale.quantitySold ?? sale.quantity ?? 0}</TableCell>
                                            <TableCell className="font-bold text-sm">Rs {(sale.lineTotal ?? 0).toFixed(2)}</TableCell>
                                            <TableCell className={`font-bold text-sm ${textLabel}`}>{sale.saleDate}</TableCell>
                                            <TableCell>
                                                <Badge className={`rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none ${statusBadge(sale.status)}`}>
                                                    {sale.status}
                                                </Badge>
                                            </TableCell>
                                            {(isAdmin || canEdit) && (
                                                <TableCell className="text-right px-6">
                                                    {sale.status === "DRAFT" ? (
                                                        <Button variant="outline" size="sm"
                                                            onClick={() => handleFinalizeDraft(sale.saleGroupId ?? String(sale.id))}
                                                            className="rounded-xl text-xs font-black text-yellow-700 border-yellow-300 hover:bg-yellow-50">
                                                            Finalize
                                                        </Button>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button variant="ghost" size="icon"
                                                                disabled={!canEditThisSale(sale)}
                                                                onClick={() => openFullEdit(sale.saleGroupId ?? String(sale.id))}
                                                                title={!canEditThisSale(sale) && !isAdmin ? "Staff can only edit within 2 hours of recording" : "Edit Bill"}
                                                                className={`${textLabel} hover:text-[#007A5E] hover:bg-[#007A5E]/10 rounded-xl transition-all`}>
                                                                <Edit2 size={16}/>
                                                            </Button>
                                                            <Button variant="ghost" size="icon"
                                                                disabled={!canEditThisSale(sale)}
                                                                onClick={() => handleVoidClick(sale.id)}
                                                                title={!canEditThisSale(sale) && !isAdmin ? "Staff can only void within 2 hours of recording" : "Void Sale"}
                                                                className={`${textLabel} hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all`}>
                                                                <Trash2 size={16}/>
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Duplicate Warning Dialog ── */}
            <Dialog open={dupWarnOpen} onOpenChange={setDupWarnOpen}>
                <DialogContent className="bg-white text-slate-900 p-8 max-w-sm">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                            <AlertTriangle size={20} className="text-amber-500"/> Possible Duplicate Sale
                        </DialogTitle>
                        <DialogDescription className={`font-bold text-sm ${textLabel}`}>
                            A similar transaction was recorded recently for one or more of these products. Please confirm before continuing.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setDupWarnOpen(false)}
                            className={`py-5 rounded-2xl ${textLabel} hover:bg-black/5 font-black text-sm`}>
                            Review Entry
                        </Button>
                        <Button onClick={async () => {
                            setDupWarnOpen(false);
                            if (dupPendingPayload) {
                                try { await executeRecordSale(dupPendingPayload); }
                                catch (err) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                            }
                        }} className="flex-1 py-5 rounded-2xl bg-[#007A5E] text-white font-black text-sm">
                            Save Anyway
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Void Confirmation Dialog ── */}
            <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
                <DialogContent className="bg-white text-slate-900 p-8 max-w-md">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-black tracking-tight">Confirm Void</DialogTitle>
                        <DialogDescription className={`font-bold text-sm ${textLabel}`}>
                            This will mark the transaction as <span className="font-black text-gray-700">VOID</span>, restore allocated stock to inventory, and preserve the record for audit/history. It will be excluded from reports and AI analysis.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>
                            Void Reason <span className="text-red-500">*</span>
                        </Label>
                        <Input className={`rounded-2xl h-12 ${inputBg}`}
                            placeholder="State the reason for voiding..."
                            value={voidReason} onChange={e => setVoidReason(e.target.value)} />
                    </div>
                    <DialogFooter className="pt-6 gap-2">
                        <Button variant="ghost" onClick={() => setVoidDialogOpen(false)}
                            className={`py-6 rounded-2xl ${textLabel} hover:bg-black/5 font-black text-sm`}>
                            Cancel
                        </Button>
                        <Button disabled={!voidReason.trim() || voidSaving}
                            onClick={handleVoidConfirm}
                            className="flex-1 py-6 rounded-2xl bg-red-600 text-white font-black text-sm hover:scale-[1.02]">
                            {voidSaving ? "Voiding..." : "Confirm Void"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Invoice / Full Bill Modal ── */}
            {(isAdmin || canEdit) && (
                <Dialog open={billOpen} onOpenChange={setBillOpen}>
                    <DialogContent className="bg-white text-slate-900 p-0 max-w-lg overflow-hidden">
                        {/* Invoice header */}
                        <div className="bg-gradient-to-br from-[#007A5E] to-[#0F172A] p-6 text-white">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Invigo FreshGuard</p>
                                    <h2 className="text-2xl font-black tracking-tight">INVOICE</h2>
                                    <p className="text-sm font-bold opacity-70 mt-1">{selectedBillId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Date</p>
                                    <p className="text-sm font-bold">{selectedBillLines[0]?.saleDate || "—"}</p>
                                    {selectedBillLines[0]?.customerName && (
                                        <div className="mt-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Customer</p>
                                            <p className="text-sm font-bold">{selectedBillLines[0].customerName}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Line items */}
                        <div className="p-6">
                            {selectedBillLines.length === 0 ? (
                                <p className={`${textLabel} text-sm font-bold`}>No lines found for this bill.</p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-gray-200/60 overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-gray-50/80">
                                                <TableRow className="border-gray-200/60">
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest px-4 py-3">Product</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 text-center">Qty</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 text-right">Unit Price</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 text-right px-4">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedBillLines.map(line => (
                                                    <TableRow key={line.id}
                                                        className={`border-gray-200/40 ${(line.status === "VOID" || line.status === "VOIDED") ? "opacity-40 line-through" : ""}`}>
                                                        <TableCell className="px-4 py-3">
                                                            <p className={`font-black text-sm ${textValue}`}>{line.productName}</p>
                                                            {line.discountRate > 0 && (
                                                                <span className="text-[10px] font-black text-[#007A5E] bg-[#007A5E]/10 px-2 py-0.5 rounded-full">
                                                                    -{line.discountRate}% OFF
                                                                </span>
                                                            )}
                                                            {(line.status === "VOID" || line.status === "VOIDED") && (
                                                                <span className="ml-2 text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">VOID</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center font-bold text-sm py-3">{line.quantitySold ?? line.quantity ?? 0}</TableCell>
                                                        <TableCell className="text-right font-bold text-sm py-3">Rs {(line.unitPrice ?? 0).toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-black text-sm py-3 px-4">Rs {(line.lineTotal ?? 0).toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Grand total */}
                                    <div className="flex items-center justify-between px-2 pt-2 border-t-2 border-[#007A5E]">
                                        <span className={`font-black text-base ${textValue}`}>Grand Total</span>
                                        <span className="font-black text-2xl text-[#007A5E]">Rs {selectedBillTotal.toFixed(2)}</span>
                                    </div>

                                    {selectedBillLines[0]?.notes && (
                                        <p className={`text-[11px] font-bold ${textLabel} px-2`}>Notes: {selectedBillLines[0].notes}</p>
                                    )}

                                    {/* Full Audit Trail */}
                                    <div className={`text-[10px] font-bold ${textLabel} px-2 pt-3 border-t border-gray-100 space-y-1`}>
                                        <div className="flex justify-between">
                                            <span>Created by: <span className="font-black text-[#007A5E]">{selectedBillLines[0]?.recordedBy || "—"}</span></span>
                                            <span className="opacity-70">{selectedBillLines[0]?.saleDate}</span>
                                        </div>
                                        {selectedBillLines[0]?.lastEditedBy && (
                                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                <span>Edited by: <span className="font-black text-[#7C3AED]">{selectedBillLines[0].lastEditedBy}</span></span>
                                                {selectedBillLines[0].editedAt && (
                                                    <span className="opacity-70">{formatDateTime(selectedBillLines[0].editedAt)}</span>
                                                )}
                                                {selectedBillLines[0].editReason && (
                                                    <span>Reason: <span className="font-black text-slate-600">{selectedBillLines[0].editReason}</span></span>
                                                )}
                                            </div>
                                        )}
                                        {selectedBillLines.some(l => (l.status === "VOID" || l.status === "VOIDED") && l.voidedBy) && (
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-red-400">
                                                <span>Voided by: <span className="font-black">{selectedBillLines.find(l => l.voidedBy)?.voidedBy}</span></span>
                                                {selectedBillLines.find(l => l.voidedAt)?.voidedAt && (
                                                    <span className="opacity-70">{formatDateTime(selectedBillLines.find(l => l.voidedAt).voidedAt)}</span>
                                                )}
                                                {selectedBillLines.find(l => l.voidReason)?.voidReason && (
                                                    <span>Reason: <span className="font-black">{selectedBillLines.find(l => l.voidReason).voidReason}</span></span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <DialogFooter className="pt-4">
                                <Button variant="ghost" onClick={() => setBillOpen(false)}
                                    className={`py-5 rounded-2xl ${textLabel} hover:bg-black/5 font-black text-sm`}>
                                    Close
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* ── Full Bill Edit Modal ── */}
            <Dialog open={fullEditOpen} onOpenChange={setFullEditOpen}>
                <DialogContent className="bg-white text-slate-900 p-0 max-w-xl overflow-hidden">
                    <div className="p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black tracking-tight">Edit Bill — {editBillGroupId}</DialogTitle>
                            <DialogDescription className={`font-bold uppercase tracking-widest text-[10px] ${textLabel}`}>
                                Old lines voided and replaced. Inventory adjusts automatically. Audit trail recorded.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                            {editBillItems.map((item, index) => {
                                const currentStock = getItemCurrentStock(item.productId);
                                const product = getProductById(item.productId);
                                const lineTotal = (product?.sellingPrice ?? 0) * (typeof item.quantity === "number" ? item.quantity : 0);
                                return (
                                    <div key={item.id} className="rounded-2xl border border-gray-200/60 p-3 space-y-2 bg-white/40">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Line {index + 1}</Label>
                                            {editBillItems.length > 1 && (
                                                <button type="button"
                                                    onClick={() => setEditBillItems(prev => prev.filter(i => i.id !== item.id))}
                                                    className="text-[10px] font-black uppercase tracking-widest text-red-500">Remove</button>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProductPickerLineId(item.id);
                                                setProductPickerMode("edit");
                                                setProductPickerSearch("");
                                                setProductPickerOpen(true);
                                            }}
                                            className={`w-full rounded-2xl h-10 font-bold text-left px-3 flex items-center justify-between border ${inputBg}`}
                                        >
                                            <span className={`text-sm truncate ${item.productId ? textValue : 'text-[#0F172A]/30'}`}>
                                                {item.productId
                                                    ? (getProductById(item.productId)?.productName ?? "Choose product...")
                                                    : "Choose product..."}
                                            </span>
                                            <Search size={14} className="text-[#0F172A]/30 flex-shrink-0 ml-2" />
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <Input type="number" min="1" className={`rounded-2xl h-10 ${inputBg}`}
                                                placeholder="Qty" value={item.quantity}
                                                onChange={e => setEditBillItems(prev => prev.map(i =>
                                                    i.id === item.id ? { ...i, quantity: e.target.value ? parseInt(e.target.value) : "" } : i
                                                ))} />
                                            <div className="text-right text-[11px] font-bold flex-1">
                                                <div className={textLabel}>Line Total</div>
                                                <div className={textValue}>Rs {lineTotal.toFixed(2)}</div>
                                            </div>
                                        </div>
                                        {item.productId && typeof item.quantity === "number" && item.quantity > currentStock && (
                                            <p className="text-red-500 text-[11px] font-bold flex items-center gap-1">
                                                <AlertTriangle size={12}/> Only {currentStock} units available.
                                            </p>
                                        )}
                                        {item.productId && (
                                            <div className="space-y-2">
                                                <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>
                                                    Batch Selection (Optional)
                                                </Label>
                                                <Select 
                                                    value={item.batchId || "fefo"} 
                                                    onValueChange={(v) => setEditBillItems(prev => prev.map(i => 
                                                        i.id === item.id ? { ...i, batchId: v === "fefo" ? "" : v } : i
                                                    ))}
                                                >
                                                    <SelectTrigger className={`rounded-2xl h-10 font-bold ${inputBg}`}>
                                                        <SelectValue placeholder="Auto-Select (Oldest First)" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl">
                                                        <SelectItem value="fefo">Auto-Select (Oldest First)</SelectItem>
                                                        {batchesMap[item.productId]?.map(b => (
                                                            <SelectItem key={b.id} value={String(b.id)}>
                                                                {b.batchNumber} (Exp: {b.expiryDate}) - Qty: {b.quantity}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        {item.productId && (
                                            <p className={`text-[11px] font-bold opacity-70 ${textLabel}`}>
                                                Stock: <span className="font-black">{currentStock} units</span>
                                            </p>
                                        )}
                                    </div>
                                );
                            })}

                            <Button type="button" variant="outline" className="w-full rounded-2xl font-black text-xs"
                                onClick={() => setEditBillItems(prev => [...prev, { id: String(Date.now()), productId: "", batchId: "", quantity: "" }])}>
                                + Add Another Product
                            </Button>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>Date of Sale</Label>
                                    <Input type="date" className={`rounded-2xl h-10 ${inputBg}`}
                                        value={editBillDate} onChange={e => setEditBillDate(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>Notes</Label>
                                    <Input className={`rounded-2xl h-10 ${inputBg}`} placeholder="Optional notes"
                                        value={editBillNotes} onChange={e => setEditBillNotes(e.target.value)} />
                                </div>
                            </div>

                            {/* Customer fields */}
                            <div className="space-y-3 border-t border-gray-200/60 pt-3">
                                <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>Customer (Optional)</Label>
                                <Input className={`rounded-2xl h-10 ${inputBg}`} placeholder="Customer name"
                                    value={editBillCustomerName} onChange={e => setEditBillCustomerName(e.target.value)} />
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" id="editSendReceipt" checked={editBillSendReceipt}
                                        onChange={e => setEditBillSendReceipt(e.target.checked)}
                                        className="h-4 w-4 accent-[#007A5E] rounded" />
                                    <label htmlFor="editSendReceipt" className={`text-[11px] font-bold ${textLabel} cursor-pointer`}>
                                        Send updated receipt to email
                                    </label>
                                </div>
                                {editBillSendReceipt && (
                                    <Input type="email" className={`rounded-2xl h-10 ${inputBg}`}
                                        placeholder="customer@email.com"
                                        value={editBillCustomerEmail} onChange={e => setEditBillCustomerEmail(e.target.value)} />
                                )}
                            </div>

                            {/* Edit reason (required) */}
                            <div className="space-y-1 border-t border-gray-200/60 pt-3">
                                <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>
                                    Reason for Edit <span className="text-red-500">*</span>
                                </Label>
                                <Input className={`rounded-2xl h-10 ${inputBg}`}
                                    placeholder="e.g. Corrected quantity, wrong product selected..."
                                    value={editBillReason} onChange={e => setEditBillReason(e.target.value)} />
                            </div>
                        </div>

                        {/* New bill total */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200/40 mt-4">
                            <span className={`font-black text-sm ${textLabel}`}>New Bill Total</span>
                            <span className={`font-black text-xl ${textValue}`}>
                                Rs {editBillItems.reduce((sum, item) => {
                                    const p = getProductById(item.productId);
                                    return sum + (p?.sellingPrice ?? 0) * (typeof item.quantity === "number" ? item.quantity : 0);
                                }, 0).toFixed(2)}
                            </span>
                        </div>

                        <DialogFooter className="pt-4 gap-2">
                            <Button variant="ghost" onClick={() => setFullEditOpen(false)}
                                className={`py-6 rounded-2xl ${textLabel} hover:bg-black/5 font-black text-sm`}>
                                Cancel
                            </Button>
                            <Button disabled={editBillSaving || !editBillReason.trim()} onClick={handleFullEditSave}
                                className="flex-1 py-6 rounded-2xl bg-[#007A5E] text-white font-black text-sm hover:scale-[1.02] active:scale-[0.98]">
                                {editBillSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Product Picker Dialog ── */}
            <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                <DialogContent hideClose className="bg-white text-slate-900 p-0 max-w-md overflow-hidden rounded-3xl border-none shadow-2xl">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-[#007A5E] to-[#0F172A] px-6 py-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">POS</p>
                                <h2 className="text-xl font-black text-white tracking-tight">Select Product</h2>
                            </div>
                            <button type="button" onClick={() => setProductPickerOpen(false)}
                                className="text-white/60 hover:text-white transition-colors p-1 rounded-xl hover:bg-white/10">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search by name or category..."
                                value={productPickerSearch}
                                onChange={e => setProductPickerSearch(e.target.value)}
                                className="w-full pl-9 pr-4 h-10 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/30"
                            />
                        </div>
                    </div>

                    {/* Product list */}
                    <div className="p-3 max-h-[360px] overflow-y-auto space-y-1">
                        {(() => {
                            const q = productPickerSearch.toLowerCase();
                            const allInStock = products.filter(p => {
                                const stock = stockMap[String(p.productId)] ?? 0;
                                return stock > 0;
                            });
                            const availableProducts = allInStock.filter(p =>
                                !q ||
                                (p.productName || "").toLowerCase().includes(q) ||
                                (p.mainCategory || "").toLowerCase().includes(q)
                            );
                            const PREVIEW_COUNT = 5;
                            const showingAll = q.length > 0;
                            const visibleProducts = showingAll ? availableProducts : availableProducts.slice(0, PREVIEW_COUNT);
                            const hiddenCount = availableProducts.length - PREVIEW_COUNT;

                            if (products.length === 0) return (
                                <div className="flex flex-col items-center justify-center py-14 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                                        <Package size={24} className="text-gray-400" />
                                    </div>
                                    <p className="font-black text-[#0F172A]/70 text-sm">No products loaded</p>
                                    <p className="text-[10px] font-bold text-[#0F172A]/40 mt-1 uppercase tracking-widest">Check backend connection</p>
                                </div>
                            );

                            if (availableProducts.length === 0) return (
                                <div className="flex flex-col items-center justify-center py-14 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                                        <Search size={24} className="text-gray-400" />
                                    </div>
                                    <p className="font-black text-[#0F172A]/70 text-sm">
                                        {q ? "No matching products" : "No products in stock"}
                                    </p>
                                    <p className="text-[10px] font-bold text-[#0F172A]/40 mt-1 uppercase tracking-widest">
                                        {q ? "Try a different search term" : "Add inventory batches first"}
                                    </p>
                                </div>
                            );

                            return (
                                <>
                                    {visibleProducts.map(p => {
                                        const stock = stockMap[String(p.productId)] ?? 0;
                                        const isLow = stock <= 10;
                                        const stockColor = isLow ? "text-orange-500" : "text-[#007A5E]";
                                        const stockBg = isLow ? "bg-orange-50 border-orange-100" : "bg-[#007A5E]/10 border-[#007A5E]/10";
                                        return (
                                            <button key={p.productId} type="button"
                                                onClick={() => handlePickProduct(p.productId)}
                                                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-[#007A5E]/5 hover:border-[#007A5E]/20 border border-transparent transition-all text-left group">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-sm text-[#0F172A] group-hover:text-[#007A5E] transition-colors truncate">
                                                        {p.productName}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-[#0F172A]/40 uppercase tracking-widest mt-0.5">
                                                        {p.mainCategory || "General"}
                                                        <span className="mx-1">•</span>
                                                        Rs {(p.sellingPrice ?? 0).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className={`flex-shrink-0 px-3 py-1.5 rounded-xl border text-center ${stockBg}`}>
                                                    <p className={`font-black text-base leading-tight ${stockColor}`}>{stock}</p>
                                                    <p className={`text-[9px] font-black uppercase tracking-widest ${stockColor} opacity-70`}>in stock</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {!showingAll && hiddenCount > 0 && (
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <Search size={12} className="text-[#0F172A]/30 flex-shrink-0" />
                                            <p className="text-[10px] font-bold text-[#0F172A]/40 uppercase tracking-widest">
                                                Showing 5 of {availableProducts.length} — search to find more
                                            </p>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default SalesModule;
