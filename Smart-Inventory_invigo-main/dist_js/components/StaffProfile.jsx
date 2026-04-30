import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Lock, CheckCircle2, AlertTriangle, Eye, EyeOff, Save, RefreshCw, ShieldCheck, Calendar, BadgeCheck, } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { getStaffProfile, updateStaffProfile } from "@/lib/api";
// ─── Helper: load the saved session from localStorage ─────────────────────────
const getSessionUser = () => {
    try {
        const raw = localStorage.getItem("invigo_user");
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
};
// ─── Sub-component: read-only info pill ───────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, hint, }) => (<div className="flex items-center gap-4 p-5 rounded-2xl bg-[#F9F5EC]/80 border border-[#4E342E]/5">
        <div className="h-10 w-10 rounded-xl bg-[#007A5E]/10 flex items-center justify-center shrink-0">
            <Icon size={20} className="text-[#007A5E]"/>
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#4E342E]/40">{label}</p>
            <p className="font-black text-[#4E342E] text-base truncate">{value}</p>
            {hint && <p className="text-[10px] font-bold text-[#4E342E]/30 mt-0.5">{hint}</p>}
        </div>
    </div>);
// ─── Main Component ────────────────────────────────────────────────────────────
const StaffProfile = () => {
    const { toast } = useToast();
    const session = getSessionUser();
    // ── Profile state ──────────────────────────────────────────────────────────
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState("");
    // ── Name edit state ────────────────────────────────────────────────────────
    const [editName, setEditName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);
    const [nameSuccess, setNameSuccess] = useState(false);
    // ── Password change state ──────────────────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    // ── Load profile on mount ──────────────────────────────────────────────────
    useEffect(() => {
        if (!session?.id) {
            setProfileError("Session not found. Please log in again.");
            setLoadingProfile(false);
            return;
        }
        const fetchProfile = async () => {
            try {
                const data = await getStaffProfile(session.id);
                // Normalize role casing (backend sends STAFF/ADMIN enum)
                const normalized = {
                    ...data,
                    role: data.role
                        ? data.role.charAt(0).toUpperCase() + data.role.slice(1).toLowerCase()
                        : "Staff",
                };
                setProfile(normalized);
                setEditName(normalized.name);
            }
            catch (err) {
                setProfileError("Could not load profile. Is the backend running?");
            }
            finally {
                setLoadingProfile(false);
            }
        };
        fetchProfile();
    }, []);
    // ── Save display name ──────────────────────────────────────────────────────
    const handleSaveName = async (e) => {
        e.preventDefault();
        if (!profile)
            return;
        if (!editName.trim())
            return;
        if (editName.trim() === profile.name) {
            toast({ title: "No changes", description: "Display name is already up-to-date." });
            return;
        }
        setIsSavingName(true);
        setNameSuccess(false);
        try {
            const updated = await updateStaffProfile(profile.id, { name: editName.trim() });
            const normalized = {
                ...updated,
                role: updated.role
                    ? updated.role.charAt(0).toUpperCase() + updated.role.slice(1).toLowerCase()
                    : "Staff",
            };
            setProfile(normalized);
            // Keep localStorage in sync
            const session = getSessionUser();
            if (session) {
                localStorage.setItem("invigo_user", JSON.stringify({ ...session, name: normalized.name }));
            }
            setNameSuccess(true);
            toast({ title: "Profile updated!", description: "Your display name has been saved." });
            setTimeout(() => setNameSuccess(false), 3000);
        }
        catch (err) {
            toast({ title: "Failed to save", description: err.message, variant: "destructive" });
        }
        finally {
            setIsSavingName(false);
        }
    };
    // ── Change password ────────────────────────────────────────────────────────
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!profile)
            return;
        setPasswordError("");
        setPasswordSuccess(false);
        if (!currentPassword) {
            setPasswordError("Please enter your current password.");
            return;
        }
        if (!newPassword) {
            setPasswordError("Please enter a new password.");
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }
        if (currentPassword === newPassword) {
            setPasswordError("New password must be different from your current password.");
            return;
        }
        setIsSavingPassword(true);
        try {
            await updateStaffProfile(profile.id, {
                currentPassword,
                newPassword,
            });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordSuccess(true);
            toast({ title: "Password changed!", description: "Your new password is now active." });
            setTimeout(() => setPasswordSuccess(false), 4000);
        }
        catch (err) {
            setPasswordError(err.message || "Failed to change password.");
        }
        finally {
            setIsSavingPassword(false);
        }
    };
    // ── Loading / Error states ─────────────────────────────────────────────────
    if (loadingProfile) {
        return (<div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-10 h-10 border-4 border-[#007A5E] border-t-transparent rounded-full animate-spin"/>
                <p className="text-[#4E342E]/40 font-black uppercase tracking-widest text-[10px]">
                    Loading your profile…
                </p>
            </div>);
    }
    if (profileError || !profile) {
        return (<div className="flex flex-col items-center justify-center py-32 gap-6">
                <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle size={40} className="text-red-400"/>
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-black text-[#4E342E]">Profile Unavailable</h2>
                    <p className="text-[#4E342E]/50 font-bold text-sm mt-1">
                        {profileError || "Unknown error"}
                    </p>
                </div>
                <Button onClick={() => window.location.reload()} className="rounded-2xl bg-[#007A5E] text-white font-black flex items-center gap-2">
                    <RefreshCw size={16}/> Retry Connection
                </Button>
            </div>);
    }
    const initials = profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    const joinedDate = new Date(profile.doj).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
    return (<div className="space-y-10 max-w-3xl mx-auto">
            {/* ── Hero Card ───────────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-premium p-8 bg-gradient-to-br from-[#8D6E63]/20 to-[#D7CCC8]/30 border-none relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"/>
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {/* Avatar */}
                    <div className="h-20 w-20 rounded-[1.5rem] bg-gradient-to-br from-[#007A5E] to-[#7C3AED] flex items-center justify-center text-white font-black text-2xl shadow-xl shrink-0">
                        {initials}
                    </div>

                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h2 className="text-3xl font-black text-[#4E342E] tracking-tight">{profile.name}</h2>
                            <Badge className={`rounded-xl px-3 text-[10px] font-black uppercase tracking-widest border-none ${profile.role === "Admin"
            ? "bg-purple-100 text-purple-700"
            : "bg-emerald-100 text-emerald-700"}`}>
                                {profile.role}
                            </Badge>
                        </div>
                        <p className="text-[#4E342E]/50 font-bold text-sm">@{profile.username}</p>
                        <p className="text-[#4E342E]/40 font-bold text-xs mt-1 uppercase tracking-widest">
                            Member since {joinedDate}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* ── Read-only Info ───────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="card-premium border-none shadow-premium">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="font-black text-xl text-[#4E342E] flex items-center gap-2">
                            <BadgeCheck size={20} className="text-[#007A5E]"/>
                            Account Information
                        </CardTitle>
                        <CardDescription className="font-bold uppercase tracking-widest text-[10px] text-[#4E342E]/40">
                            These fields are managed by your administrator
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 grid sm:grid-cols-2 gap-4">
                        <InfoRow icon={User} label="Username" value={`@${profile.username}`} hint="Cannot be changed"/>
                        <InfoRow icon={ShieldCheck} label="Role" value={profile.role} hint="Set by administrator"/>
                        <InfoRow icon={Calendar} label="Date Joined" value={joinedDate} hint="Onboarding date"/>
                    </CardContent>
                </Card>
            </motion.div>

            {/* ── Edit Display Name ────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="card-premium border-none shadow-premium">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="font-black text-xl text-[#4E342E] flex items-center gap-2">
                            <User size={20} className="text-[#007A5E]"/>
                            Display Name
                        </CardTitle>
                        <CardDescription className="font-bold uppercase tracking-widest text-[10px] text-[#4E342E]/40">
                            Update how your name appears across the system
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-2">
                        <form onSubmit={handleSaveName} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-[#4E342E]/40">
                                    Full Name
                                </Label>
                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="John Doe" className="rounded-2xl h-12 bg-[#F9F5EC] border-[#4E342E]/10 font-bold text-[#4E342E] placeholder:text-[#4E342E]/20 focus:ring-2 focus:ring-[#007A5E]/20"/>
                            </div>
                            <Button type="submit" disabled={isSavingName || !editName.trim()} className="rounded-2xl bg-[#007A5E] text-white font-black px-8 py-6 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2">
                                {isSavingName ? (<>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                        Saving…
                                    </>) : nameSuccess ? (<>
                                        <CheckCircle2 size={18}/>
                                        Saved!
                                    </>) : (<>
                                        <Save size={18}/>
                                        Save Name
                                    </>)}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>

            {/* ── Change Password ──────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="card-premium border-none shadow-premium">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="font-black text-xl text-[#4E342E] flex items-center gap-2">
                            <Lock size={20} className="text-[#9D1967]"/>
                            Change Password
                        </CardTitle>
                        <CardDescription className="font-bold uppercase tracking-widest text-[10px] text-[#4E342E]/40">
                            Minimum 6 characters · Must differ from current password
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-2">
                        <form onSubmit={handleChangePassword} className="space-y-6">
                            {/* Error banner */}
                            {passwordError && (<div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-4 rounded-2xl flex items-center gap-2">
                                    <AlertTriangle size={14}/>
                                    {passwordError}
                                </div>)}

                            {/* Success banner */}
                            {passwordSuccess && (<div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold p-4 rounded-2xl flex items-center gap-2">
                                    <CheckCircle2 size={14}/>
                                    Password updated successfully!
                                </div>)}

                            {/* Current password */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-[#4E342E]/40">
                                    Current Password
                                </Label>
                                <div className="relative">
                                    <Input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="rounded-2xl h-12 bg-[#F9F5EC] border-[#4E342E]/10 font-bold text-[#4E342E] pr-12 placeholder:text-[#4E342E]/20 focus:ring-2 focus:ring-[#9D1967]/20"/>
                                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4E342E]/30 hover:text-[#4E342E] transition-colors p-1">
                                        {showCurrent ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                            </div>

                            {/* New password */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#4E342E]/40">
                                        New Password
                                    </Label>
                                    <div className="relative">
                                        <Input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="rounded-2xl h-12 bg-[#F9F5EC] border-[#4E342E]/10 font-bold text-[#4E342E] pr-12 placeholder:text-[#4E342E]/20 focus:ring-2 focus:ring-[#9D1967]/20"/>
                                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4E342E]/30 hover:text-[#4E342E] transition-colors p-1">
                                            {showNew ? <EyeOff size={16}/> : <Eye size={16}/>}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#4E342E]/40">
                                        Confirm New Password
                                    </Label>
                                    <div className="relative">
                                        <Input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className={`rounded-2xl h-12 bg-[#F9F5EC] border-[#4E342E]/10 font-bold text-[#4E342E] pr-12 placeholder:text-[#4E342E]/20 focus:ring-2 ${confirmPassword && confirmPassword !== newPassword
            ? "border-red-300 focus:ring-red-300/30"
            : "focus:ring-[#9D1967]/20"}`}/>
                                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4E342E]/30 hover:text-[#4E342E] transition-colors p-1">
                                            {showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                                        </button>
                                    </div>
                                    {/* Inline mismatch hint */}
                                    {confirmPassword && confirmPassword !== newPassword && (<p className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                                            Passwords don't match
                                        </p>)}
                                </div>
                            </div>

                            {/* Strength indicator */}
                            {newPassword.length > 0 && (<div className="space-y-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#4E342E]/40">
                                        Password Strength
                                    </p>
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3, 4].map((level) => {
                const strength = Math.min(4, Math.floor(newPassword.length / 3) +
                    (/[A-Z]/.test(newPassword) ? 1 : 0) +
                    (/[0-9]/.test(newPassword) ? 1 : 0) +
                    (/[^A-Za-z0-9]/.test(newPassword) ? 1 : 0));
                const active = level <= strength;
                const color = strength <= 1
                    ? "bg-red-400"
                    : strength === 2
                        ? "bg-orange-400"
                        : strength === 3
                            ? "bg-yellow-400"
                            : "bg-[#007A5E]";
                return (<div key={level} className={`h-1.5 flex-1 rounded-full transition-colors ${active ? color : "bg-[#4E342E]/10"}`}/>);
            })}
                                    </div>
                                    <p className="text-[10px] font-bold text-[#4E342E]/40">
                                        {newPassword.length < 6
                ? "Too short"
                : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)
                    ? "Very strong"
                    : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)
                        ? "Strong"
                        : /[A-Z]/.test(newPassword) || /[0-9]/.test(newPassword)
                            ? "Moderate"
                            : "Weak"}
                                    </p>
                                </div>)}

                            <Button type="submit" disabled={isSavingPassword} className="rounded-2xl bg-[#9D1967] text-white font-black px-8 py-6 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2">
                                {isSavingPassword ? (<>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                        Updating…
                                    </>) : (<>
                                        <Lock size={18}/>
                                        Update Password
                                    </>)}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Bottom spacer */}
            <div className="h-8"/>
        </div>);
};
export default StaffProfile;
