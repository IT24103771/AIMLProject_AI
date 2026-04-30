import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Package, AlertTriangle, BarChart3, Settings, Menu, TrendingUp, Users, UserPlus, Plus, Clock, Eye, EyeOff, Edit2, Trash2, } from "lucide-react";
import InvigoLogo from "@/components/InvigoLogo";
import LogoutButton from "@/components/LogoutButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/api";
import SalesModule from "@/components/SalesModule";
// --- Types & Data ---
// Removed initialUsers since we fetch from backend
const adminStats = [
    { label: "Total Stock", value: "2,412", sub: "12 added today", icon: Package, color: "text-[#007A5E]", bg: "bg-[#007A5E]/10" },
    { label: "Waste Prevented", value: "78%", sub: "+5% vs prev month", icon: TrendingUp, color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10" },
    { label: "Active Alerts", value: "14", sub: "Requires attention", icon: AlertTriangle, color: "text-[#9D1967]", bg: "bg-[#9D1967]/10" },
    { label: "Staff Active", value: "6", sub: "Currently on shift", icon: Users, color: "text-[#007A5E]", bg: "bg-[#007A5E]/10" },
];
const expiringItems = [
    { name: "Fresh Milk 1L", sku: "FM-1023", expiry: "In 2 days", risk: "Critical" },
    { name: "Yogurt Plain 500g", sku: "YP-2041", expiry: "In 3 days", risk: "High" },
    { name: "Cheese Spread 200g", sku: "CS-3089", expiry: "In 4 days", risk: "Medium" },
    { name: "Leafy Greens Mix", sku: "LG-4102", expiry: "In 5 days", risk: "Low" },
];
// --- Sub-components (Redesigned) ---
const Sidebar = ({ open, setOpen }) => {
    const location = useLocation();
    const navItems = [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Sales Data", href: "/admin/sales", icon: BarChart3 },
        { label: "Inventory", href: "/admin/inventory", icon: Package },
        { label: "Alerts", href: "/admin/alerts", icon: AlertTriangle },
        { label: "Reports", href: "/admin/reports", icon: BarChart3 },
        { label: "User Control", href: "/admin/users", icon: Users },
        { label: "Settings", href: "/admin/settings", icon: Settings },
    ];
    return (<>
      <AnimatePresence>
        {open && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"/>)}
      </AnimatePresence>

      <aside className={`fixed top-0 left-0 z-50 h-screen w-72 bg-[#0F172A] text-white transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"} lg:sticky`}>
        <div className="flex flex-col h-full border-r border-white/5">
          <div className="p-8 flex items-center gap-3">
            <div className="h-10 w-10 glass p-1.5 rounded-xl border-white/20">
              <InvigoLogo size={28}/>
            </div>
            <span className="font-brand text-3xl">Invigo<span className="text-[#007A5E]">.</span></span>
          </div>

          <div className="px-4 mb-4">
            <div className="glass p-4 rounded-3xl border-white/10 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#007A5E] to-[#7C3AED] flex items-center justify-center font-black text-white">
                AD
              </div>
              <div className="text-[#0F172A]">
                <p className="text-sm font-black leading-none mb-1">Owner View</p>
                <p className="text-[10px] font-bold text-[#0F172A]/50 uppercase tracking-widest leading-none">Status: Active</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 py-4">
            {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (<Link key={item.href} to={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${isActive
                    ? "bg-white/10 text-white font-bold border border-white/10"
                    : "text-white/50 hover:text-white hover:bg-white/5"}`}>
                  <item.icon size={20} className={isActive ? "text-[#007A5E]" : "group-hover:text-white"}/>
                  <span className="text-sm">{item.label}</span>
                  {isActive && <motion.div layoutId="active" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#007A5E]"/>}
                </Link>);
        })}
          </nav>

          <div className="p-6 border-t border-white/5">
            <LogoutButton className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-white/40 hover:text-white hover:bg-red-500/10 transition-all font-black uppercase tracking-widest text-[10px]"/>
          </div>
        </div>
      </aside>
    </>);
};
const Header = ({ setSidebarOpen, title }) => (<header className="sticky top-0 z-30 flex h-20 items-center justify-between px-8 bg-white/80 backdrop-blur-xl border-b border-[#0F172A]/5">
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" className="lg:hidden text-[#0F172A]" onClick={() => setSidebarOpen(true)}>
        <Menu size={24}/>
      </Button>
      <h1 className="font-display text-2xl font-black text-[#0F172A] tracking-tight">{title}</h1>
    </div>

    <div className="flex items-center gap-4">
      <div className="hidden md:flex items-center gap-2 glass px-4 py-2 border-[#0F172A]/5 rounded-2xl">
        <Clock size={16} className="text-[#007A5E]"/>
        <span className="text-xs font-black text-[#0F172A]/60 uppercase tracking-widest">Shift: 08:00 - 16:00</span>
      </div>
      <Button size="icon" className="rounded-2xl glass border-[#0F172A]/5 text-[#0F172A] hover:bg-white shadow-none">
        <Settings size={20}/>
      </Button>
    </div>
  </header>);
const AdminDashboardHome = () => (<div className="space-y-10">
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {adminStats.map((stat, i) => (<motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card-premium p-6">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24}/>
            </div>
            <TrendingUp size={16} className="text-[#007A5E]/30"/>
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">{stat.label}</p>
          <h3 className="text-3xl font-black text-[#0F172A] mb-1">{stat.value}</h3>
          <p className="text-[10px] font-bold text-[#007A5E]">{stat.sub}</p>
        </motion.div>))}
    </div>

    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card className="card-premium p-0 overflow-hidden border-none shadow-premium">
          <CardHeader className="p-8 border-b border-[#0F172A]/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-black text-xl">Loss Prevention Monitor</CardTitle>
              <CardDescription className="font-bold">Items requiring immediate action</CardDescription>
            </div>
            <Button size="sm" variant="ghost" className="text-[#007A5E] font-black text-xs uppercase tracking-widest">See Full Log</Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#0F172A]/[0.02]">
                <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-8">Product</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Expiry</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Risk Level</TableHead>
                  <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringItems.map((row) => (<TableRow key={row.sku} className="border-[#0F172A]/5 hover:bg-primary/[0.03] transition-colors">
                    <TableCell className="px-8 flex items-center gap-3">
                      <div className="h-1 w-8 rounded-full bg-[#0F172A]/10"/>
                      <div>
                        <p className="font-black text-[#0F172A] text-sm">{row.name}</p>
                        <p className="text-[10px] font-bold text-black/40 uppercase">{row.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-sm">{row.expiry}</TableCell>
                    <TableCell>
                      <Badge className={`rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none ${row.risk === "Critical" ? "bg-red-100 text-red-600" :
            row.risk === "High" ? "bg-orange-100 text-orange-600" :
                "bg-blue-100 text-blue-600"}`}>
                        {row.risk}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <Button size="sm" className="rounded-xl glass border-[#0F172A]/5 text-[#0F172A] hover:bg-[#007A5E] hover:text-white transition-all text-xs font-black">
                        Resolve
                      </Button>
                    </TableCell>
                  </TableRow>))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="card-premium p-8 border-none shadow-premium bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white">
          <h3 className="text-xl font-black mb-2">Gen3 AI Status</h3>
          <p className="text-white/50 text-xs font-bold mb-8 uppercase tracking-[0.2em]">Optimizing efficiency</p>
          <div className="space-y-6">
            {[
        { label: "Vision Processing", val: 100 },
        { label: "Risk Prediction", val: 88 },
        { label: "Inventory Sync", val: 94 }
    ].map(s => (<div key={s.label}>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                  <span>{s.label}</span>
                  <span>{s.val}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#007A5E]" style={{ width: `${s.val}%` }}/>
                </div>
              </div>))}
          </div>
        </Card>

        <Button className="w-full py-8 rounded-[2rem] bg-[#007A5E] text-white shadow-2xl hover:scale-[1.02] transition-all group flex items-center justify-center gap-4">
          <div className="p-2 bg-white/20 rounded-xl group-hover:rotate-12 transition-transform">
            <Plus size={24}/>
          </div>
          <span className="text-xl font-black tracking-tight">New Inventory Batch</span>
        </Button>
      </div>
    </div>
  </div>);
const UserManagement = ({ users, setUsers }) => {
    // Global View State
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [globalError, setGlobalError] = useState("");
    // Create State
    const [createOpen, setCreateOpen] = useState(false);
    const [formData, setFormData] = useState({ username: "", password: "", name: "", doj: "", role: "Staff" });
    const [isCreating, setIsCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    // Edit State
    const [editOpen, setEditOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [editPassword, setEditPassword] = useState("");
    const [editError, setEditError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    // Load Initial Users
    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            setGlobalError("");
            try {
                const data = await getUsers();
                // Normalize the backend ENUM (ADMIN/STAFF) to frontend casing (Admin/Staff)
                const normalizedData = data.map(user => ({
                    ...user,
                    role: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : "Staff"
                }));
                setUsers(normalizedData);
            }
            catch (err) {
                console.error("Failed to load users:", err);
                setGlobalError("Could not connect to the backend to load users.");
            }
            finally {
                setLoadingUsers(false);
            }
        };
        // Only fetch if we haven't loaded them (or if they are empty from parent init)
        if (users.length === 0) {
            fetchUsers();
        }
    }, []);
    const handleCreate = async (e) => {
        e.preventDefault();
        setError("");
        if (!formData.username || !formData.password || !formData.name || !formData.doj) {
            setError("Please fill in all fields to continue.");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        setIsCreating(true);
        try {
            // Map role to uppercase for the Java backend Enum
            const payload = {
                ...formData,
                role: formData.role.toUpperCase()
            };
            const newUser = await createUser(payload);
            // Ensure the returned role matches our local type casing
            if (newUser.role) {
                newUser.role = newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1).toLowerCase();
            }
            setUsers((prev) => [...prev, newUser]);
            setCreateOpen(false);
            setFormData({ username: "", password: "", name: "", doj: "", role: "Staff" });
        }
        catch (err) {
            setError(err.message || "Failed to create user");
        }
        finally {
            setIsCreating(false);
        }
    };
    const openEdit = (user) => {
        setEditData({ ...user });
        setEditPassword("");
        setEditError("");
        setEditOpen(true);
    };
    const handleEdit = async (e) => {
        e.preventDefault();
        if (!editData)
            return;
        if (!editData.username || !editData.name || !editData.doj) {
            setEditError("Please fill in all required fields.");
            return;
        }
        setIsEditing(true);
        try {
            const payload = { ...editData };
            if (editPassword)
                payload.password = editPassword;
            if (payload.role)
                payload.role = payload.role.toUpperCase(); // For Java Enum
            const updatedUser = await updateUser(editData.id, payload);
            // Fix casing for local state
            if (updatedUser.role) {
                updatedUser.role = updatedUser.role.charAt(0).toUpperCase() + updatedUser.role.slice(1).toLowerCase();
            }
            setUsers((prev) => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            setEditOpen(false);
        }
        catch (err) {
            setEditError(err.message || "Failed to update user");
        }
        finally {
            setIsEditing(false);
        }
    };
    const handleRevoke = async (id, name) => {
        if (confirm(`Are you sure you want to revoke network access for ${name}? This cannot be undone.`)) {
            try {
                await deleteUser(id);
                setUsers((prev) => prev.filter(u => u.id !== id));
            }
            catch (err) {
                alert("Failed to revoke access: " + err.message);
            }
        }
    };
    return (<div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Staff Governance</h2>
          <p className="text-[#0F172A]/50 font-bold uppercase tracking-widest text-[10px] mt-1">Operational Control Panel</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="rounded-3xl bg-[#7C3AED] py-6 px-10 text-white font-black text-lg shadow-xl hover:scale-105 transition-all flex items-center gap-3">
          <UserPlus size={24}/>
          Onboard New Staff
        </Button>
      </div>

      {globalError && (<div className="bg-red-50 p-4 rounded-2xl flex items-center justify-between border border-red-100">
          <div className="flex items-center gap-3 text-red-600 font-bold text-sm">
            <AlertTriangle size={18}/>
            {globalError}
          </div>
          <Button size="sm" variant="outline" className="border-red-200 text-red-700 bg-white" onClick={() => window.location.reload()}>Retry Connection</Button>
        </div>)}

      <Card className="card-premium p-0 border-none shadow-premium overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#0F172A]/[0.02]">
              <TableRow className="border-[#0F172A]/5">
                <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest">Identity</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Position</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Entry Date</TableHead>
                <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Network Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsers ? (<TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="w-8 h-8 mx-auto border-4 border-[#007A5E] border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-[#0F172A]/40 font-bold uppercase tracking-widest text-[10px]">Syncing with Mainframe...</p>
                  </TableCell>
                </TableRow>) : users.length === 0 && !globalError ? (<TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <Users size={32} className="mx-auto text-[#0F172A]/20 mb-3"/>
                    <p className="text-[#0F172A]/40 font-bold text-sm">No personnel records found.</p>
                  </TableCell>
                </TableRow>) : (users.map((user) => (<TableRow key={user.id} className="border-[#0F172A]/5 hover:bg-primary/[0.03] transition-colors">
                    <TableCell className="px-8 flex items-center gap-4 py-6">
                      <div className="h-12 w-12 rounded-2xl bg-[#0F172A]/5 flex items-center justify-center font-black text-[#0F172A]/40">
                        {user.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-black text-[#0F172A]">{user.name}</p>
                        <p className="text-[10px] font-bold text-black/30 uppercase">@{user.username}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`rounded-lg px-2 text-[10px] font-black uppercase tracking-widest border-none ${user.role === "Admin" ? "bg-purple-100 text-purple-600" : "bg-emerald-100 text-emerald-600"}`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-sm text-[#0F172A]/60">
                      {new Date(user.doj).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)} className="text-[#0F172A]/40 hover:text-[#007A5E] hover:bg-[#007A5E]/10 rounded-xl transition-all">
                          <Edit2 size={16}/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRevoke(user.id, user.name)} className="text-[#0F172A]/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                          <Trash2 size={16}/>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass-dark border-white/10 p-10 max-w-xl text-white">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-black tracking-tight">Onboard Staff Member</DialogTitle>
            <DialogDescription className="font-bold uppercase tracking-widest text-[10px] text-white/50">Create secure system credentials</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-6">
            {error && (<div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle size={14}/>
                {error}
              </div>)}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Username</Label>
                <Input className="rounded-2xl bg-white/5 h-12 border-white/10 focus:bg-white/10 text-white transition-none placeholder:text-white/20" placeholder="e.g. jdoe" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}/>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Pin / Password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} className="rounded-2xl bg-white/5 h-12 border-white/10 focus:bg-white/10 text-white transition-none pr-10 placeholder:text-white/20" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1">
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Full Name</Label>
              <Input className="rounded-2xl bg-white/5 h-12 border-white/10 text-white placeholder:text-white/20" placeholder="John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}/>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Joining Date</Label>
              {/* Added specifically [color-scheme:dark] to make the calendar icon visible on some browsers */}
              <Input type="date" className="rounded-2xl bg-white/5 h-12 border-white/10 text-white [color-scheme:dark]" value={formData.doj} onChange={e => setFormData({ ...formData, doj: e.target.value })}/>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">System Permissions</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger className="rounded-2xl bg-white/5 h-12 border-white/10 font-bold text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-[#0F172A] text-white border-white/10">
                  <SelectItem value="Staff">Warehouse Staff</SelectItem>
                  <SelectItem value="Admin">System Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-6">
              <Button disabled={isCreating} type="submit" className="w-full py-8 rounded-[2rem] bg-[#007A5E] text-white font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl border-none disabled:opacity-50">
                {isCreating ? "Configuring Access..." : "Activate Professional Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass-dark border-white/10 p-10 max-w-xl text-white">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-black tracking-tight">Edit Staff Member</DialogTitle>
            <DialogDescription className="font-bold uppercase tracking-widest text-[10px] text-white/50">Update system credentials and permissions</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-6">
            {editError && (<div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle size={14}/>
                {editError}
              </div>)}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Full Name</Label>
                <Input className="rounded-2xl bg-white/5 h-12 border-white/10 text-white placeholder:text-white/20" value={editData?.name || ""} onChange={e => setEditData(prev => prev ? { ...prev, name: e.target.value } : null)}/>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Password Override</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} className="rounded-2xl bg-white/5 h-12 border-white/10 focus:bg-white/10 text-white transition-none pr-10 placeholder:text-white/20" placeholder="Type to change pass" value={editPassword} onChange={e => setEditPassword(e.target.value)}/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1">
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">Joining Date</Label>
                <Input type="date" className="rounded-2xl bg-white/5 h-12 border-white/10 text-white [color-scheme:dark]" value={editData?.doj || ""} onChange={e => setEditData(prev => prev ? { ...prev, doj: e.target.value } : null)}/>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1 text-white">System Permissions</Label>
                <Select value={editData?.role || "Staff"} onValueChange={(v) => setEditData(prev => prev ? { ...prev, role: v } : null)}>
                  <SelectTrigger className="rounded-2xl bg-white/5 h-12 border-white/10 font-bold text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-[#0F172A] text-white border-white/10">
                    <SelectItem value="Staff">Warehouse Staff</SelectItem>
                    <SelectItem value="Admin">System Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-6">
              <Button disabled={isEditing} type="button" variant="ghost" onClick={() => setEditOpen(false)} className="py-8 rounded-[2rem] text-white hover:bg-white/5 font-black text-lg transition-all border-none px-8">
                Cancel
              </Button>
              <Button disabled={isEditing} type="submit" className="flex-1 py-8 rounded-[2rem] bg-[#7C3AED] text-white font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow-amethyst border-none disabled:opacity-50">
                {isEditing ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>);
};
const Admin = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [users, setUsers] = useState([]); // Init empty, fetch on mount
    const location = useLocation();
    const getPageTitle = () => {
        if (location.pathname === "/admin/users")
            return "User Management";
        if (location.pathname === "/admin/inventory")
            return "Inventory Suite";
        if (location.pathname === "/admin/sales")
            return "Sales Recording & Data";
        if (location.pathname === "/admin/alerts")
            return "Risk Control";
        if (location.pathname === "/admin/reports")
            return "Data Intelligence";
        if (location.pathname === "/admin/settings")
            return "System Config";
        return "Owner Dashboard";
    };
    const content = (<div className="relative min-h-screen">
      {/* Background aesthetics */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#007A5E]/5 rounded-full blur-[120px]"/>
        <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-[#7C3AED]/5 rounded-full blur-[100px]"/>
      </div>

      <div className="flex flex-col min-h-screen relative z-10 animate-fade-in">
        <Header setSidebarOpen={setSidebarOpen} title={getPageTitle()}/>
        <main className="flex-1 p-8 lg:p-12">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                {location.pathname === "/admin/users" ? (<UserManagement users={users} setUsers={setUsers}/>) : location.pathname === "/admin/sales" ? (<SalesModule role="Admin"/>) : location.pathname === "/admin" || location.pathname === "/admin/" ? (<AdminDashboardHome />) : (<div className="text-center py-24">
                    <div className="h-20 w-20 bg-[#0F172A]/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Settings size={40} className="text-[#0F172A]/20"/>
                    </div>
                    <h2 className="text-2xl font-black text-[#0F172A]">Section Modules</h2>
                    <p className="text-[#0F172A]/40 font-bold uppercase tracking-widest text-xs mt-2">Expansion Module Coming Soon</p>
                  </div>)}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>);
    return (<div className="flex min-h-screen bg-background text-foreground tracking-tight">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}/>
      <div className="flex-1 w-full max-w-full overflow-hidden">{content}</div>
    </div>);
};
export default Admin;
