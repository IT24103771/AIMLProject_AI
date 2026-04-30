import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import InvigoLogo from "@/components/InvigoLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/lib/api";
import { isLoggedIn, hasRole, saveSession } from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn()) {
      if (hasRole("ADMIN", "OWNER")) {
        navigate("/admin");
      } else {
        navigate("/staff");
      }
    }
  }, [navigate]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    const trimmedUser = username.trim();

    if (!trimmedUser || !password) {
      setError("Please fill in both username and password.");
      return;
    }

    if (trimmedUser.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const authResult = await loginUser(trimmedUser, password);

      saveSession(authResult);

      if (authResult.role?.toUpperCase() === "ADMIN" || authResult.role?.toUpperCase() === "OWNER") {
        navigate("/admin");
      } else {
        navigate("/staff");
      }
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#007A5E]/10 rounded-full blur-[120px] animate-blob" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7C3AED]/10 rounded-full blur-[120px] animate-blob"
          style={{ animationDelay: "3s" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative"
      >
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-20 group">
            <div className="h-12 w-12 glass p-2 rounded-xl transition-transform group-hover:rotate-12 bg-white/40">
              <InvigoLogo size={32} />
            </div>
            <span className="font-brand text-4xl text-[#0F172A]">Invigo</span>
          </Link>

          <div className="max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#007A5E]/10 text-[#007A5E] text-[10px] font-black uppercase tracking-[0.2em] mb-6"
            >
              <Sparkles size={12} />
              AI Excellence
            </motion.div>

            <h2 className="font-display font-alice-bold text-5xl text-[#0F172A] leading-tight mb-6">
              Empowering <br />
              <span className="gradient-text">Global Retailers</span>
            </h2>

            <p className="text-xl text-[#0F172A]/70 leading-relaxed font-medium">
              Join the future of inventory management with Invigo&apos;s self-driving analytics.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-8">
          <div className="glass p-6 rounded-3xl border-white/40">
            <Zap className="text-[#007A5E] mb-3" />
            <p className="text-sm font-black text-[#0F172A]">Instant Insight</p>
            <p className="text-xs text-[#0F172A]/50 font-bold uppercase tracking-tighter">Live Updates</p>
          </div>

          <div className="glass p-6 rounded-3xl border-white/40">
            <ShieldCheck className="text-[#7C3AED] mb-3" />
            <p className="text-sm font-black text-[#0F172A]">Advanced Guard</p>
            <p className="text-xs text-[#0F172A]/50 font-bold uppercase tracking-tighter">Secure Data</p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex items-center justify-center p-6 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md card-premium p-10 rounded-[3rem] relative z-20"
        >
          <div className="text-center mb-10">
            <h1 className="font-display font-alice-bold text-3xl text-[#0F172A] mb-2">
              Welcome Back
            </h1>
            <p className="text-[#0F172A]/60 font-medium tracking-tight">
              Access your Invigo control center
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold text-center border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-[#0F172A]/40 mb-2 block px-1">
                Username
              </Label>

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#0F172A]/30 group-focus-within:text-[#007A5E] transition-colors" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-[#0F172A]/10 bg-white/50 focus:bg-white focus:ring-2 focus:ring-[#007A5E]/20 transition-all font-bold text-[#0F172A]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="px-1">
                <Label className="text-xs font-black uppercase tracking-widest text-[#0F172A]/40 block">
                  Password
                </Label>
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#0F172A]/30 group-focus-within:text-[#7C3AED] transition-colors" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-14 rounded-2xl border-[#0F172A]/10 bg-white/50 focus:bg-white focus:ring-2 focus:ring-[#7C3AED]/20 transition-all font-bold text-[#0F172A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0F172A]/40 hover:text-[#0F172A] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              disabled={isLoading}
              type="submit"
              className="w-full h-14 rounded-2xl bg-[#0F172A] hover:bg-[#007A5E] text-white font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Portal
                  <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-[#0F172A]/40 font-brand">
            Powered by Invigo Gen3 Analytics
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;