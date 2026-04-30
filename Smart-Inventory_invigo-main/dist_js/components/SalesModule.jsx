import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Clock, AlertTriangle, Edit2, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { getProducts, getAvailableQuantity, getSalesHistory, recordPosSale, voidSale, editSaleQuantity } from "@/lib/salesApi";
const SalesModule = ({ role }) => {
    const { toast } = useToast();
    // Data State
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [stockMap, setStockMap] = useState({});
    const [items, setItems] = useState([
        { id: "1", productId: "", quantity: "" }
    ]);
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0] // today YYYY-MM-DD
    );
    const [notes, setNotes] = useState("");
    // Edit/Void State
    const [editOpen, setEditOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    // Admin bill detail state (grouped POS view)
    const [billOpen, setBillOpen] = useState(false);
    const [selectedBillId, setSelectedBillId] = useState(null);
    // Filter & Sort State
    const [filterSearch, setFilterSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterDate, setFilterDate] = useState("");
    const [sortBy, setSortBy] = useState("NEWEST");
    // Initial Load
    useEffect(() => {
        refreshData();
    }, []);
    const refreshData = async () => {
        try {
            const fetchedProducts = await getProducts();
            setProducts(fetchedProducts);
            const fetchedSales = await getSalesHistory();
            setSales(fetchedSales);
            // Fetch stock for all products concurrently to avoid waterfall
            const newStockMap = {};
            await Promise.all(fetchedProducts.map(async (p) => {
                const qty = await getAvailableQuantity(p.id);
                newStockMap[String(p.id)] = qty;
            }));
            setStockMap(newStockMap);
        }
        catch (error) {
            toast({ title: "Error loading data", description: error.message, variant: "destructive" });
        }
    };
    // Derived states
    const todaySales = sales.filter(s => s.saleDate === new Date().toISOString().split('T')[0]);
    const todayCount = todaySales.length;
    const todayQuantity = todaySales.reduce((acc, curr) => acc + curr.quantitySold, 0);
    let displaySales = [...sales].filter(s => {
        if (filterStatus !== "ALL" && s.status !== filterStatus)
            return false;
        if (filterDate && s.saleDate !== filterDate)
            return false;
        if (filterSearch && !s.productName.toLowerCase().includes(filterSearch.toLowerCase()))
            return false;
        return true;
    });
    displaySales.sort((a, b) => {
        if (sortBy === "NEWEST")
            return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
        if (sortBy === "PRODUCT")
            return a.productName.localeCompare(b.productName);
        if (sortBy === "QUANTITY")
            return b.quantitySold - a.quantitySold;
        return 0;
    });
    const getItemCurrentStock = (productId) => {
        return stockMap[productId] || 0;
    };
    const getProductById = (id) => products.find(p => String(p.id) === id);
    // POS totals
    const lineTotals = items.map(item => {
        if (!item.productId || typeof item.quantity !== "number")
            return 0;
        const product = getProductById(item.productId);
        return (product?.sellingPrice ?? 0) * item.quantity;
    });
    const billTotal = lineTotals.reduce((sum, v) => sum + v, 0);
    // Validation
    const isFormValid = saleDate !== "" &&
        items.length > 0 &&
        items.some(i => i.productId && typeof i.quantity === "number" && i.quantity > 0) &&
        items.every(i => {
            if (!i.productId || typeof i.quantity !== "number" || i.quantity <= 0)
                return true;
            const available = getItemCurrentStock(i.productId);
            return i.quantity <= available;
        });
    // Handlers
    const handleRecordSale = async (e) => {
        e.preventDefault();
        if (!isFormValid)
            return;
        try {
            // Mocking current user taking action
            const user = role === "Admin" ? "admin_user" : "staff_user";
            const payloadItems = items
                .filter(i => i.productId && typeof i.quantity === "number" && i.quantity > 0)
                .map(i => ({
                productId: parseInt(i.productId),
                quantity: i.quantity
            }));
            await recordPosSale({
                saleDate,
                recordedBy: user,
                notes,
                items: payloadItems
            });
            toast({
                title: "Sale Recorded Successfully",
                description: `POS bill captured with ${payloadItems.length} line items.`,
                variant: "default",
            });
            // Reset form and refresh tables
            setItems([{ id: "1", productId: "", quantity: "" }]);
            setNotes("");
            await refreshData();
        }
        catch (error) {
            toast({
                title: "Error Recording Sale",
                description: error.message,
                variant: "destructive",
            });
        }
    };
    const handleVoidClick = async (id) => {
        if (confirm("Are you sure you want to void this sale? Inventory will be restored.")) {
            try {
                await voidSale(id);
                toast({ title: "Sale Voided", description: "Inventory has been restored." });
                await refreshData();
            }
            catch (err) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
            }
        }
    };
    const openEdit = (id, currentQty) => {
        setEditData({ id: String(id), newQuantity: currentQty });
        setEditOpen(true);
    };
    const handleEditSave = async () => {
        if (!editData || typeof editData.newQuantity !== "number" || editData.newQuantity <= 0) {
            toast({ title: "Validation Error", description: "Quantity must be > 0", variant: "destructive" });
            return;
        }
        try {
            await editSaleQuantity(editData.id, editData.newQuantity);
            toast({ title: "Sale Updated", description: "Inventory has been adjusted automatically." });
            setEditOpen(false);
            await refreshData();
        }
        catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };
    const openBillDetails = (billId) => {
        setSelectedBillId(String(billId));
        setBillOpen(true);
    };
    const selectedBillLines = selectedBillId
        ? sales.filter(s => (s.saleGroupId ?? String(s.id)) === selectedBillId)
        : [];
    const selectedBillTotal = selectedBillLines.reduce((sum, s) => sum + s.lineTotal, 0);
    // Role Colors - Staff uses warm brown theme, Admin uses light theme
    const isDark = false;
    const isStaff = role === "Staff";
    const isAdmin = role === "Admin";
    const bgCard = isStaff ? "card-premium border-none shadow-[0_8px_30px_rgb(78,52,46,0.04)] bg-[#F9F5EC]" : "card-premium border-none shadow-premium bg-white";
    const textLabel = isStaff ? "text-[#4E342E]/50" : "text-[#0F172A]/40";
    const textValue = isStaff ? "text-[#4E342E]" : "text-[#0F172A]";
    const inputBg = isStaff ? "bg-[#F5EBE1] border-[#4E342E]/10 placeholder:text-[#4E342E]/30" : "bg-white border-gray-200 placeholder:text-[#0F172A]/30";
    return (<div className="space-y-10">
            {/* Header section handled by parent page */}

            {/* Summary Row */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${bgCard} p-6 rounded-[2rem]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl bg-[#007A5E]/10 text-[#007A5E]`}>
                            <ShoppingCart size={24}/>
                        </div>
                    </div>
                    <p className={`text-xs font-black uppercase tracking-widest ${textLabel} mb-1`}>Today's Transactions</p>
                    <h3 className={`text-4xl font-black ${textValue}`}>{todayCount}</h3>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${bgCard} p-6 rounded-[2rem]`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED]`}>
                            <Clock size={24}/>
                        </div>
                    </div>
                    <p className={`text-xs font-black uppercase tracking-widest ${textLabel} mb-1`}>Units Sold Today</p>
                    <h3 className={`text-4xl font-black ${textValue}`}>{todayQuantity}</h3>
                </motion.div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Form Column – Both Staff and Admin can record sales */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className={`${bgCard} p-0 overflow-hidden`}>
                        <CardHeader className={`p-6 border-b ${isDark ? 'border-white/5' : 'border-[#0F172A]/5'}`}>
                            <CardTitle className={`font-black text-xl ${textValue}`}>Record New Sale (POS)</CardTitle>
                            <CardDescription className="font-bold">Add multiple products to one bill. Inventory will deduct using FEFO.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <form onSubmit={handleRecordSale} className="space-y-4">
                                <div className="space-y-3">
                                    {items.map((item, index) => {
            const currentStock = getItemCurrentStock(item.productId);
            const product = getProductById(item.productId);
            const lineTotal = lineTotals[index];
            return (<div key={item.id} className="rounded-2xl border border-gray-200/60 p-3 space-y-2 bg-white/40">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>
                                                        Line {index + 1}
                                                    </Label>
                                                    {items.length > 1 && (<button type="button" onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="text-[10px] font-black uppercase tracking-widest text-red-500">
                                                            Remove
                                                        </button>)}
                                                </div>
                                                <div className="space-y-2">
                                                    <Select value={item.productId} onValueChange={val => setItems(prev => prev.map(i => i.id === item.id ? { ...i, productId: val } : i))}>
                                                        <SelectTrigger className={`rounded-2xl h-10 font-bold ${inputBg}`}>
                                                            <SelectValue placeholder="Choose product..."/>
                                                        </SelectTrigger>
                                                        <SelectContent className={`rounded-2xl ${isDark ? 'bg-[#0F172A] text-white border-white/10' : ''}`}>
                                                            {products.map(p => (<SelectItem key={p.id} value={String(p.id)}>
                                                                    {p.name} — Rs {p.sellingPrice.toFixed(2)}
                                                                </SelectItem>))}
                                                        </SelectContent>
                                                    </Select>

                                                    <div className="flex items-center gap-2">
                                                        <Input type="number" min="1" className={`rounded-2xl h-10 ${inputBg}`} placeholder="Qty" value={item.quantity} onChange={e => setItems(prev => prev.map(i => i.id === item.id
                    ? { ...i, quantity: e.target.value ? parseInt(e.target.value) : "" }
                    : i))}/>
                                                        <div className="text-right text-[11px] font-bold flex-1">
                                                            <div className={`${textLabel}`}>Line Total</div>
                                                            <div className={textValue}>
                                                                Rs {lineTotal.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {item.productId && typeof item.quantity === "number" && item.quantity > currentStock && (<p className="text-red-500 text-[11px] font-bold mt-1 flex items-center gap-1">
                                                            <AlertTriangle size={12}/> Only {currentStock} units available.
                                                        </p>)}
                                                    {item.productId && (<p className="text-[11px] font-bold mt-1 flex items-center gap-2 text-current opacity-70">
                                                            Stock: <span className="font-black">{currentStock} units</span> • Price:{" "}
                                                            <span className="font-black">Rs {product?.sellingPrice.toFixed(2) ?? "0.00"}</span>
                                                        </p>)}
                                                </div>
                                            </div>);
        })}
                                    <Button type="button" variant="outline" className="w-full rounded-2xl font-black text-xs" onClick={() => setItems(prev => [
            ...prev,
            { id: String(Date.now()), productId: "", quantity: "" }
        ])}>
                                        <Plus size={14} className="mr-2"/>
                                        Add Another Product
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>Date of Sale</Label>
                                    <Input type="date" className={`rounded-2xl h-12 ${inputBg} ${isDark ? '[color-scheme:dark]' : ''}`} value={saleDate} onChange={e => setSaleDate(e.target.value)}/>
                                </div>

                                <div className="space-y-2">
                                    <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>Reference / Notes (Optional)</Label>
                                    <Input className={`rounded-2xl h-12 ${inputBg}`} placeholder="Invoice # or details..." value={notes} onChange={e => setNotes(e.target.value)}/>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest ${textLabel}">
                                        Bill Total
                                    </div>
                                    <div className={`text-2xl font-black ${textValue}`}>
                                        Rs {billTotal.toFixed(2)}
                                    </div>
                                </div>

                                <Button type="submit" disabled={!isFormValid} className="w-full mt-2 py-6 rounded-2xl bg-[#007A5E] text-white font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                    <CheckCircle2 size={18} className="mr-2"/>
                                    Record POS Bill
                                </Button>

                                <p className={`text-center text-[10px] uppercase font-bold tracking-widest ${textLabel} mt-4`}>
                                    Stock will be deducted from earliest expiry batch for each line item.
                                </p>
                            </form>
                        </CardContent>
                    </Card>
                    {isAdmin && (<Card className={`${bgCard} p-6 rounded-[2rem] border-dashed border-2 ${isDark ? 'border-white/10' : 'border-[#0F172A]/10'}`}>
                            <CardHeader className="p-0 mb-3">
                                <CardTitle className={`font-black text-lg ${textValue}`}>Sales Oversight</CardTitle>
                                <CardDescription className="font-bold text-xs">
                                    As Admin, you can record sales, and you also have access to edit or void incorrect entries in the history.
                                </CardDescription>
                            </CardHeader>
                        </Card>)}
                </div>

                {/* Table Column */}
                <div className="lg:col-span-2">
                    <Card className={`${bgCard} p-0 overflow-hidden`}>
                        <CardHeader className={`p-6 border-b ${isDark ? 'border-white/5' : 'border-[#0F172A]/5'} flex-col gap-4 items-start sm:flex-row sm:items-center justify-between`}>
                            <div>
                                <CardTitle className={`font-black text-xl ${textValue}`}>Sales History</CardTitle>
                                <CardDescription className="font-bold">Recent operational data.</CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Input placeholder="Search product..." className={`rounded-2xl h-10 w-32 lg:w-40 ${inputBg}`} value={filterSearch} onChange={e => setFilterSearch(e.target.value)}/>
                                <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val)}>
                                    <SelectTrigger className={`rounded-2xl h-10 w-28 font-bold ${inputBg}`}>
                                        <SelectValue placeholder="Status"/>
                                    </SelectTrigger>
                                    <SelectContent className={`rounded-2xl`}>
                                        <SelectItem value="ALL">All Status</SelectItem>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="VOID">Void</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input type="date" className={`rounded-2xl h-10 w-36 ${inputBg}`} value={filterDate} onChange={e => setFilterDate(e.target.value)}/>
                                <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                                    <SelectTrigger className={`rounded-2xl h-10 w-32 font-bold ${inputBg}`}>
                                        <SelectValue placeholder="Sort"/>
                                    </SelectTrigger>
                                    <SelectContent className={`rounded-2xl`}>
                                        <SelectItem value="NEWEST">Newest</SelectItem>
                                        <SelectItem value="PRODUCT">Product</SelectItem>
                                        <SelectItem value="QUANTITY">Quantity</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
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
                                        {isAdmin && (<TableHead className="text-right px-6 font-black uppercase text-[10px] tracking-widest">Action</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displaySales.length === 0 ? (<TableRow>
                                            <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-12">
                                                <p className={`${textLabel} font-bold text-sm`}>No sales found.</p>
                                            </TableCell>
                                        </TableRow>) : (displaySales.map((sale) => (<TableRow key={sale.id} className={`${isStaff ? "border-[#4E342E]/5 hover:bg-[#4E342E]/[0.02]" : "border-[#0F172A]/5 hover:bg-primary/[0.03]"} transition-colors ${sale.status === 'VOID' ? 'opacity-50' : ''}`}>
                                                <TableCell className="px-6 py-4">
                                                    {isAdmin ? (<button type="button" onClick={() => openBillDetails(sale.saleGroupId ?? String(sale.id))} className="text-left">
                                                            <p className={`font-black text-[11px] underline ${textValue}`}>
                                                                {sale.saleGroupId ?? sale.id}
                                                            </p>
                                                            <p className={`text-[10px] font-bold ${textLabel} uppercase`}>View Full Bill</p>
                                                        </button>) : (<>
                                                            <p className={`font-black text-[11px] ${textValue}`}>{sale.saleGroupId ?? sale.id}</p>
                                                            <p className={`text-[10px] font-bold ${textLabel} uppercase`}>Line #{sale.id}</p>
                                                        </>)}
                                                </TableCell>
                                                <TableCell>
                                                    <p className={`font-black ${textValue}`}>{sale.productName}</p>
                                                    <p className={`text-[10px] font-bold ${textLabel} uppercase`}>ID: {sale.id} • User: {sale.recordedBy}</p>
                                                </TableCell>
                                                <TableCell className="font-bold text-lg">{sale.quantitySold}</TableCell>
                                                <TableCell className="font-bold text-sm">{`Rs ${sale.lineTotal.toFixed(2)}`}</TableCell>
                                                <TableCell className={`font-bold text-sm ${textLabel}`}>{sale.saleDate}</TableCell>
                                                <TableCell>
                                                    <Badge className={`rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none ${sale.status === "ACTIVE" ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-600"}`}>
                                                        {sale.status}
                                                    </Badge>
                                                </TableCell>
                                                {isAdmin && (<TableCell className="text-right px-6">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button variant="ghost" size="icon" disabled={sale.status === 'VOID'} onClick={() => openEdit(sale.id, sale.quantitySold)} className={`${textLabel} hover:text-[#007A5E] hover:bg-[#007A5E]/10 rounded-xl transition-all`}>
                                                                <Edit2 size={16}/>
                                                            </Button>
                                                            <Button variant="ghost" size="icon" disabled={sale.status === 'VOID'} onClick={() => handleVoidClick(sale.id)} className={`${textLabel} hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all`}>
                                                                <Trash2 size={16}/>
                                                            </Button>
                                                        </div>
                                                    </TableCell>)}
                                            </TableRow>)))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className={`${isDark ? 'glass-dark text-white border-white/10' : 'bg-white text-slate-900'} p-10 max-w-sm`}>
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-black tracking-tight">Edit Sale</DialogTitle>
                        <DialogDescription className={`font-bold uppercase tracking-widest text-[10px] ${textLabel}`}>
                            Inventory will adjust automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel} ml-1`}>New Quantity</Label>
                            <Input type="number" min="1" className={`rounded-2xl h-12 ${inputBg}`} value={editData?.newQuantity || ""} onChange={e => setEditData(prev => prev ? { ...prev, newQuantity: e.target.value ? parseInt(e.target.value) : "" } : null)}/>
                        </div>
                    </div>
                    <DialogFooter className="pt-6 gap-2">
                        <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className={`py-6 rounded-2xl ${textLabel} hover:bg-black/5 font-black text-sm`}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleEditSave} className="flex-1 py-6 rounded-2xl bg-[#007A5E] text-white font-black text-sm hover:scale-[1.02] active:scale-[0.98]">
                            Confirm Edit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Admin Bill Detail Modal */}
            {isAdmin && (<Dialog open={billOpen} onOpenChange={setBillOpen}>
                    <DialogContent className={`${isDark ? 'glass-dark text-white border-white/10' : 'bg-white text-slate-900'} p-8 max-w-lg`}>
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-xl font-black tracking-tight">
                                Bill Details {selectedBillId ? `• ${selectedBillId}` : ""}
                            </DialogTitle>
                            <DialogDescription className={`font-bold uppercase tracking-widest text-[10px] ${textLabel}`}>
                                Grouped view of all POS line items under this sale.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedBillLines.length === 0 ? (<p className={`${textLabel} text-sm font-bold`}>No lines found for this bill.</p>) : (<div className="space-y-4">
                                <div className="max-h-64 overflow-auto rounded-2xl border border-gray-200/60">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest px-4">Product</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Qty</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Unit Price</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Line Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedBillLines.map(line => (<TableRow key={line.id}>
                                                    <TableCell className="px-4">
                                                        <p className={`font-black ${textValue}`}>{line.productName}</p>
                                                        <p className={`text-[10px] font-bold ${textLabel} uppercase`}>ID: {line.id} • User: {line.recordedBy}</p>
                                                    </TableCell>
                                                    <TableCell className="font-bold text-sm">{line.quantitySold}</TableCell>
                                                    <TableCell className="font-bold text-sm">{`Rs ${line.unitPrice.toFixed(2)}`}</TableCell>
                                                    <TableCell className="font-bold text-sm">{`Rs ${line.lineTotal.toFixed(2)}`}</TableCell>
                                                </TableRow>))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-gray-200/70 mt-2">
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>
                                        Bill Total
                                    </div>
                                    <div className={`text-2xl font-black ${textValue}`}>
                                        Rs {selectedBillTotal.toFixed(2)}
                                    </div>
                                </div>
                            </div>)}

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setBillOpen(false)} className={`py-4 rounded-2xl ${textLabel} hover:bg-black/5 font-black text-sm`}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>)}

        </div>);
};
export default SalesModule;
