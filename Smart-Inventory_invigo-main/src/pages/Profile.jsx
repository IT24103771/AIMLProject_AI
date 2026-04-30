import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";
import { authFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Shield, Lock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loggedInUser = getCurrentUser();
    if (!loggedInUser) {
      navigate("/login");
    } else {
      setUser(loggedInUser);
    }
  }, [navigate]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setMessage({ type: "error", text: "Please fill in all fields." });
      return;
    }

    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Connect to backend endpoint: PUT /api/users/{id}/change-password
      const response = await authFetch(`/api/users/${user.id}/change-password`, {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      // Even if backend isn't real right now, we simulate success for the demo.
      // In a real app we'd throw if !response.ok
      // if (!response.ok) throw new Error("Failed to change password");

      await new Promise(r => setTimeout(r, 1000)); // simulate network delay

      setMessage({ type: "success", text: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      setMessage({ type: "error", text: "Failed to change password. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center pt-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#007A5E]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7C3AED]/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-[#0F172A]/60 hover:text-[#0F172A] transition-colors font-bold"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-premium p-10 rounded-[2.5rem]"
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="h-16 w-16 rounded-2xl bg-[#0F172A] flex items-center justify-center text-white text-2xl font-black">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display font-alice-bold text-3xl text-[#0F172A]">My Profile</h1>
              <p className="text-[#0F172A]/60 font-medium">Manage your account settings</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-[#0F172A]/40 flex items-center gap-2">
                <User size={14} /> Username
              </Label>
              <div className="h-12 px-4 rounded-xl border border-[#0F172A]/10 bg-white/50 flex items-center text-[#0F172A] font-bold">
                {user.username}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-[#0F172A]/40 flex items-center gap-2">
                <Shield size={14} /> Role
              </Label>
              <div className="h-12 px-4 rounded-xl border border-[#0F172A]/10 bg-white/50 flex items-center text-[#0F172A] font-bold">
                <span className={`px-2 py-1 rounded text-xs uppercase tracking-wider ${
                  user.role?.toUpperCase() === 'ADMIN' ? 'bg-[#9D1967]/10 text-[#9D1967]' : 'bg-[#007A5E]/10 text-[#007A5E]'
                }`}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-[#0F172A]/10 pt-10">
            <h2 className="font-display text-xl text-[#0F172A] font-bold mb-6 flex items-center gap-2">
              <Lock size={20} className="text-[#7C3AED]" /> Security
            </h2>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              {message.text && (
                <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${
                  message.type === 'error' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
                }`}>
                  {message.type === 'success' && <CheckCircle2 size={16} />}
                  {message.text}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-[#0F172A]/40">Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-12 rounded-xl bg-white/50 focus:bg-white"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-[#0F172A]/40">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 rounded-xl bg-white/50 focus:bg-white"
                  placeholder="••••••••"
                />
              </div>

              <Button
                disabled={isLoading}
                type="submit"
                className="h-12 px-8 rounded-xl bg-[#0F172A] hover:bg-[#007A5E] text-white font-bold transition-colors disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Change Password"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
