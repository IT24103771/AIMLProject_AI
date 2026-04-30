import { useState, useEffect } from "react";
import {
    User,
    Lock,
    CheckCircle2,
    Eye,
    EyeOff,
    Save,
    RefreshCw,
    ShieldCheck,
    Calendar,
    BadgeCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { getStaffProfile, updateStaffProfile } from "@/lib/api";
import { getCurrentUser, updateStoredUser } from "@/lib/auth";

const InfoRow = ({ icon: Icon, label, value, hint }) => (
    <div className="flex items-center gap-4 p-5 rounded-2xl bg-[#F9F5EC]/80 border border-[#4E342E]/5">
        <div className="h-10 w-10 rounded-xl bg-[#007A5E]/10 flex items-center justify-center shrink-0">
            <Icon size={20} className="text-[#007A5E]" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#4E342E]/40">{label}</p>
            <p className="font-black text-[#4E342E] text-base truncate">{value}</p>
            {hint && <p className="text-[10px] font-bold text-[#4E342E]/30 mt-0.5">{hint}</p>}
        </div>
    </div>
);

const StaffProfile = () => {
    const { toast } = useToast();
    const session = getCurrentUser();

    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState("");

    const [editName, setEditName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);
    const [nameSuccess, setNameSuccess] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    useEffect(() => {
        if (!session?.id) {
            setProfileError("Session not found. Please log in again.");
            setLoadingProfile(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const data = await getStaffProfile(session.id);
                setProfile(data);
                setEditName(data.name || "");
            } catch (err) {
                setProfileError(err.message || "Could not load profile.");
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [session?.id]);

    const handleSaveName = async (e) => {
        e.preventDefault();
        if (!profile) return;

        if (!editName.trim()) {
            toast({
                title: "Invalid name",
                description: "Name cannot be empty.",
                variant: "destructive",
            });
            return;
        }

        if (editName.trim() === profile.name) {
            toast({
                title: "No changes",
                description: "Display name is already up-to-date.",
            });
            return;
        }

        setIsSavingName(true);
        setNameSuccess(false);

        try {
            const updated = await updateStaffProfile(profile.id, { name: editName.trim() });
            setProfile(updated);
            updateStoredUser({ name: updated.name });
            setNameSuccess(true);

            toast({
                title: "Profile updated!",
                description: "Your display name has been saved.",
            });

            setTimeout(() => setNameSuccess(false), 3000);
        } catch (err) {
            toast({
                title: "Failed to save",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsSavingName(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!profile) return;

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

            toast({
                title: "Password changed!",
                description: "Your new password is now active.",
            });

            setTimeout(() => setPasswordSuccess(false), 4000);
        } catch (err) {
            setPasswordError(err.message || "Failed to change password.");
        } finally {
            setIsSavingPassword(false);
        }
    };

    if (loadingProfile) {
        return (
            <div className="flex items-center justify-center py-16">
                <RefreshCw className="animate-spin text-[#007A5E]" size={28} />
            </div>
        );
    }

    if (profileError) {
        return (
            <Card className="card-premium p-8">
                <p className="text-red-500 font-bold">{profileError}</p>
            </Card>
        );
    }

    if (!profile) return null;

    return (
        <div className="space-y-8">
            <Card className="card-premium border-none shadow-premium">
                <CardHeader>
                    <CardTitle className="text-2xl font-black text-[#4E342E]">My Profile</CardTitle>
                    <CardDescription className="font-medium">View and manage your account information.</CardDescription>
                </CardHeader>

                <CardContent className="grid md:grid-cols-2 gap-4">
                    <InfoRow icon={User} label="Username" value={profile.username || "-"} />
                    <InfoRow icon={BadgeCheck} label="Full Name" value={profile.name || "-"} />
                    <InfoRow icon={ShieldCheck} label="Role" value={profile.roleName || profile.role || "-"} />
                    <InfoRow icon={Calendar} label="Date Joined" value={profile.doj || "-"} />
                </CardContent>
            </Card>

            <Card className="card-premium border-none shadow-premium">
                <CardHeader>
                    <CardTitle className="text-xl font-black text-[#4E342E]">Update Display Name</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveName} className="space-y-4">
                        <div>
                            <Label className="mb-2 block">Full Name</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>

                        <Button type="submit" disabled={isSavingName} className="bg-[#007A5E] hover:bg-[#00614b] text-white">
                            {isSavingName ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                            Save Name
                        </Button>

                        {nameSuccess && (
                            <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                                <CheckCircle2 size={16} />
                                Name updated successfully.
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>

            <Card className="card-premium border-none shadow-premium">
                <CardHeader>
                    <CardTitle className="text-xl font-black text-[#4E342E]">Change Password</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <Label className="mb-2 block">Current Password</Label>
                            <div className="relative">
                                <Input
                                    type={showCurrent ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="pr-10"
                                />
                                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <Label className="mb-2 block">New Password</Label>
                            <div className="relative">
                                <Input
                                    type={showNew ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="pr-10"
                                />
                                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <Label className="mb-2 block">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pr-10"
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {passwordError && <p className="text-red-500 text-sm font-bold">{passwordError}</p>}
                        {passwordSuccess && <Badge className="bg-green-100 text-green-700">Password updated</Badge>}

                        <Button type="submit" disabled={isSavingPassword} className="bg-[#7C3AED] hover:bg-[#6828c7] text-white">
                            {isSavingPassword ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Lock className="mr-2" size={16} />}
                            Change Password
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default StaffProfile;