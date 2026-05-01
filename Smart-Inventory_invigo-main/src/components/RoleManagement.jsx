import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Plus, Trash2, X, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRoles, createRole, updateRole, deleteRole } from "@/lib/api";

const PERMISSIONS = [
    { key: "productManagement", label: "Product Management"  },
    { key: "inventoryTracking", label: "Inventory Tracking"  },
    { key: "salesManagement",   label: "Sales Management"    },
    { key: "userControl",       label: "User Control"        },
];

const RoleManagement = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingRole, setEditingRole] = useState(null);  // role being edited in side-panel
    const [editPerms, setEditPerms] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [roleSearch, setRoleSearch] = useState("");
    
    // Create dialog state
    const [createOpen, setCreateOpen] = useState(false);
    const [newRole, setNewRole] = useState({ roleName: "", description: "", roleType: "STAFF" });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const data = await getRoles();
                setRoles(data);
            } catch (e) {
                console.error("Failed to fetch roles", e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const openEdit = (role) => {
        setEditingRole(role);
        setSaveSuccess(false);
        setEditPerms({
            productManagement: role.productManagement ?? false,
            inventoryTracking: role.inventoryTracking ?? false,
            salesManagement:   role.salesManagement   ?? false,
            userControl:       role.userControl       ?? false,
        });
    };

    const handleSavePerms = async () => {
        if (!editingRole) return;
        setSaving(true);
        try {
            const updated = await updateRole(editingRole.id, {
                ...editingRole,
                ...editPerms,
                discountsAlerts: false,
                reportAnalytics: false,
            });
            setRoles(prev => prev.map(r => r.id === updated.id ? updated : r));
            setEditingRole(updated);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (e) {
            console.error("Failed to save permissions", e);
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateError("");
        if (!newRole.roleName.trim()) { setCreateError("Role name is required."); return; }
        setCreating(true);
        try {
            const created = await createRole(newRole);
            setRoles(prev => [...prev, created]);
            setCreateOpen(false);
            setNewRole({ roleName: "", description: "", roleType: "STAFF" });
        } catch (e) {
            setCreateError(e.message || "Failed to create role");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete role "${name}"? This cannot be undone.`)) return;
        try {
            await deleteRole(id);
            setRoles(prev => prev.filter(r => r.id !== id));
            if (editingRole?.id === id) setEditingRole(null);
        } catch (e) {
            alert("Failed to delete role: " + e.message);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return "—";
        return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* ── Left: Roles Table ── */}
            <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black text-[#0F172A]">All Roles</h2>
                    <Button
                        onClick={() => setCreateOpen(true)}
                        className="rounded-2xl bg-[#7C3AED] py-5 px-5 text-white font-black text-sm shadow-glow-amethyst hover:scale-105 transition-all"
                    >
                        <Plus size={16} className="mr-2" /> Create New Role
                    </Button>
                </div>
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F172A]/30" />
                    <input
                        type="text"
                        placeholder="Search roles..."
                        value={roleSearch}
                        onChange={e => setRoleSearch(e.target.value)}
                        className="w-full pl-11 pr-4 h-11 rounded-2xl border border-[#0F172A]/10 bg-white text-sm font-bold text-[#0F172A] placeholder:text-[#0F172A]/30 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                    />
                </div>

                <Card className="card-premium p-0 border-none shadow-premium overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-[#0F172A]/[0.02]">
                                <TableRow className="border-[#0F172A]/5 hover:bg-transparent">
                                    <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest">Role Name</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Description</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Users Assigned</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Last Modified</TableHead>
                                    <TableHead className="text-right px-6 font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <div className="w-8 h-8 mx-auto border-4 border-[#007A5E] border-t-transparent rounded-full animate-spin" />
                                            <p className="mt-4 text-[#0F172A]/40 font-bold uppercase tracking-widest text-[10px]">Loading roles...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : roles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <Shield size={32} className="mx-auto text-[#0F172A]/20 mb-3" />
                                            <p className="text-[#0F172A]/40 font-bold text-sm">No roles found.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : roles.filter(r => !roleSearch || r.roleName.toLowerCase().includes(roleSearch.toLowerCase())).map((role) => (
                                    <TableRow
                                        key={role.id}
                                        className={`border-[#0F172A]/5 hover:bg-primary/[0.03] transition-colors cursor-pointer ${
                                            editingRole?.id === role.id ? "bg-[#7C3AED]/5" : ""
                                        }`}
                                    >
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                                                    <Shield size={16} className="text-[#7C3AED]" />
                                                </div>
                                                <span className="font-black text-[#0F172A] text-sm">{role.roleName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold text-sm text-[#0F172A]/60">{role.description}</TableCell>
                                        <TableCell>
                                            <Badge className="bg-[#007A5E]/10 text-[#007A5E] border-none font-black text-xs rounded-lg">
                                                {role.usersAssigned} {role.usersAssigned === 1 ? "user" : "users"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-bold text-sm text-[#0F172A]/50">{formatDate(role.lastModified)}</TableCell>
                                        <TableCell className="text-right px-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEdit(role)}
                                                    className="rounded-xl border-[#0F172A]/10 text-[#0F172A] font-black text-xs hover:bg-[#7C3AED]/10 hover:border-[#7C3AED]/30 hover:text-[#7C3AED]"
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(role.id, role.roleName)}
                                                    className="text-[#0F172A]/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* ── Right: Permissions Side-Panel ── */}
            {editingRole && (
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    className="w-full lg:w-72 shrink-0"
                >
                    <Card className="card-premium border-none shadow-premium bg-white/80 backdrop-blur-xl">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 mb-1">Edit Role Permissions</p>
                                    <h3 className="font-black text-[#0F172A] text-base leading-tight">{editingRole.roleName}</h3>
                                </div>
                                <button
                                    onClick={() => setEditingRole(null)}
                                    className="text-[#0F172A]/30 hover:text-[#0F172A] transition-colors mt-0.5"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-3 mb-8">
                                {PERMISSIONS.map(({ key, label }) => {
                                    // Hide User Management (userControl) for plain Staff roles
                                    const roleTypeUpper = (editingRole?.roleType || "").toUpperCase();
                                    if (key === "userControl" && roleTypeUpper !== "ADMIN" && roleTypeUpper !== "SUB_ADMIN") return null;
                                    const checked = editPerms[key] ?? false;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setEditPerms(prev => ({ ...prev, [key]: !prev[key] }))}
                                            className="flex items-center gap-3 w-full text-left group"
                                        >
                                            <div className={`h-5 w-5 rounded flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                                                checked
                                                    ? "bg-[#007A5E] border-[#007A5E]"
                                                    : "border-[#0F172A]/20 group-hover:border-[#007A5E]/50"
                                            }`}>
                                                {checked && (
                                                    <svg viewBox="0 0 12 10" className="w-3 h-3" fill="none">
                                                        <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                )}
                                            </div>
                                            <span className={`text-sm font-bold transition-colors ${
                                                checked ? "text-[#0F172A]" : "text-[#0F172A]/50"
                                            }`}>{label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <Button
                                onClick={handleSavePerms}
                                disabled={saving}
                                className={`w-full rounded-xl py-6 font-black text-sm transition-all ${
                                    saveSuccess
                                        ? "bg-[#007A5E] text-white"
                                        : "bg-[#007A5E] hover:bg-[#006B52] text-white"
                                }`}
                            >
                                {saving ? "Saving..." : saveSuccess ? "✓ Saved!" : "Save Changes"}
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* ── Create New Role Dialog ── */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="glass-dark border-white/10 p-0 max-w-md text-white overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#7C3AED]/15 rounded-full blur-[60px]" />
                        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#007A5E]/15 rounded-full blur-[50px]" />
                    </div>
                    <div className="relative p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black tracking-tight">Create New Role</DialogTitle>
                            <DialogDescription className="font-bold uppercase tracking-widest text-[10px] text-white/50">Define a custom role for your team</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-5">
                            {createError && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                                    <AlertTriangle size={14} />{createError}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Role Name</Label>
                                <Input
                                    className="rounded-2xl bg-white/5 h-12 border-white/10 text-white placeholder:text-white/20"
                                    placeholder="e.g. Night Supervisor"
                                    value={newRole.roleName}
                                    onChange={e => setNewRole(p => ({ ...p, roleName: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Role Type</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    {["STAFF", "SUB_ADMIN", "ADMIN"].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNewRole(p => ({ ...p, roleType: type }))}
                                            className={`h-12 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border-2 ${
                                                newRole.roleType === type
                                                    ? type === "SUB_ADMIN"
                                                        ? "bg-[#7C3AED] border-[#7C3AED] text-white shadow-lg"
                                                        : type === "ADMIN"
                                                            ? "bg-[#9D1967] border-[#9D1967] text-white shadow-lg"
                                                            : "bg-[#007A5E] border-[#007A5E] text-white shadow-lg"
                                                    : "bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white/80"
                                            }`}
                                        >
                                            {type === "STAFF" ? "👷 Staff" : type === "SUB_ADMIN" ? "🛡️ Sub Admin" : "👑 Admin"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Description</Label>
                                <Input
                                    className="rounded-2xl bg-white/5 h-12 border-white/10 text-white placeholder:text-white/20"
                                    placeholder="Brief description of responsibilities"
                                    value={newRole.description}
                                    onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))}
                                />
                            </div>
                            <DialogFooter className="pt-4">
                                <Button
                                    disabled={creating}
                                    type="submit"
                                    className="w-full py-7 rounded-[2rem] bg-[#7C3AED] text-white font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow-amethyst border-none disabled:opacity-50"
                                >
                                    {creating ? "Creating..." : "Create Role"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RoleManagement;
