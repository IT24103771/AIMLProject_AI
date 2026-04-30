import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Menu, Search, CheckCircle2, Clock, ChevronRight, BellRing, Zap, ShieldCheck, Settings, Sparkles, UserCircle, Package, Percent, TrendingUp, Home, BarChart3 } from "lucide-react";
import InvigoLogo from "@/components/InvigoLogo";
import LogoutButton from "@/components/LogoutButton";
import { Button } from "@/components/ui/button";
import SalesModule from "@/components/SalesModule";
import StaffProfile from "@/components/StaffProfile";
import Products from "./Products";
import AddProduct from "./AddProduct";
import EditProduct from "./EditProduct";
import ProductDetails from "./ProductDetails";
import InventoryPage from "./InventoryPage";
import DiscountsPage from "./DiscountsPage";
import NotificationsPage from "./NotificationsPage";
import ReportsManagement from "./ReportsManagement";

const staffStats = [
    { label: "Tasks Done", value: "24", sub: "8 pending", icon: CheckCircle2, color: "text-[#007A5E]", bg: "bg-[#007A5E]/10" },
    { label: "High Risk Items", value: "12", sub: "Scan required", icon: Clock, color: "text-[#9D1967]", bg: "bg-[#9D1967]/10" },
    { label: "Efficiency", value: "96%", sub: "Top performer", icon: Zap, color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10" },
];

const Sidebar = ({ open, setOpen }) => {
    const location = useLocation();
    const navItems = [
        { label: "Home Page", href: "/", icon: Home },
        { label: "Staff Desk", href: "/staff", icon: LayoutDashboard },
        { label: "Products", href: "/staff/products", icon: Package },
        { label: "Inventory", href: "/staff/inventory", icon: Search },
        { label: "Discounts", href: "/staff/discounts", icon: Percent },
        { label: "My Alerts", href: "/staff/alerts", icon: BellRing },
        { label: "Sales Entry", href: "/staff/sales", icon: CheckCircle2 },
        { label: "Reports", href: "/staff/reports", icon: BarChart3 },
        { label: "My Profile", href: "/staff/profile", icon: UserCircle },
    ];
    return (<>
      <AnimatePresence>
        {open && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"/>)}
      </AnimatePresence>

      <aside className={`fixed top-0 left-0 z-50 h-screen w-72 bg-[#0F172A] text-white transition-transform duration-300 shadow-2xl lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"} lg:sticky`}>
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
                ST
              </div>
              <div className="text-[#0F172A]">
                <p className="text-sm font-black leading-none mb-1">Staff Hub</p>
                <p className="text-[10px] font-bold text-[#0F172A]/50 uppercase tracking-widest leading-none">Status: Active</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 py-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${isActive
                    ? "bg-white/10 text-white font-bold border border-white/10"
                    : "text-white/50 hover:text-white hover:bg-white/5"}`}>
                  <item.icon size={20} className={isActive ? "text-[#007A5E]" : "group-hover:text-white"}/>
                  <span className="text-sm">{item.label}</span>
                  {isActive && <motion.div layoutId="active" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#007A5E]"/>}
                </Link>
              );
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

const StaffDashboardHome = () => (<div className="space-y-10">
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {staffStats.map((stat, i) => (<motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card-premium p-6">
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

    <div className="card-premium p-0 border-none shadow-premium relative overflow-hidden">
      <div className="p-8 border-b border-[#0F172A]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[#0F172A]">Shift Priorities</h2>
          <p className="text-[#007A5E] text-xs font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
            <Sparkles size={14}/> Hand-picked by AI engine
          </p>
        </div>
        <div className="p-3 bg-[#0F172A]/5 rounded-xl border border-[#0F172A]/10 text-[#0F172A]">
          <ShieldCheck size={28}/>
        </div>
      </div>
      
      <div className="p-6 grid gap-2">
        {[
          "Scan Batch FM-102 (Milk) for accurate level detection",
          "Prioritize restocking front-end display for Yogurt Plain",
          "Mark FM-209 as 'Promoted' in system"
        ].map((task, i) => (
          <div key={i} className="bg-white/50 border border-[#0F172A]/5 p-4 rounded-2xl flex items-center gap-4 hover:bg-[#007A5E]/5 transition-colors cursor-pointer group shadow-sm">
            <div className="h-8 w-8 rounded-full bg-[#007A5E]/10 text-[#007A5E] flex items-center justify-center group-hover:bg-[#007A5E] group-hover:text-white transition-all">
              <CheckCircle2 size={16}/>
            </div>
            <span className="font-bold text-sm tracking-tight text-[#0F172A]/80 flex-1">{task}</span>
            <ChevronRight size={18} className="text-[#0F172A]/20 group-hover:text-[#007A5E]"/>
          </div>
        ))}
      </div>
    </div>
  </div>);

const Staff = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    
    const getPageTitle = () => {
        if (location.pathname === "/staff/products")
            return "Product Directory";
        if (location.pathname === "/staff/inventory")
            return "Rapid Scan";
        if (location.pathname === "/staff/discounts")
            return "Active Promotions";
        if (location.pathname === "/staff/sales")
            return "Record Sales";
        if (location.pathname === "/staff/alerts")
            return "My Alerts";
        if (location.pathname === "/staff/reports")
            return "Activity Log";
        if (location.pathname === "/staff/profile")
            return "My Profile";
        return "Staff Hub";
    };

    const content = (<div className="relative min-h-screen">
      {/* Background aesthetics matching Admin.jsx */}
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
                {(() => {
                  if (location.pathname === "/staff" || location.pathname === "/staff/") return <StaffDashboardHome />;
                  if (location.pathname === "/staff/sales") return <SalesModule role="Staff"/>;
                  if (location.pathname === "/staff/profile") return <StaffProfile />;
                  if (location.pathname === "/staff/products") return <Products />;
                  if (location.pathname === "/staff/products/add") return <AddProduct />;
                  if (location.pathname.startsWith("/staff/products/edit/")) return <EditProduct />;
                  if (location.pathname.startsWith("/staff/products/details/")) return <ProductDetails />;
                  if (location.pathname === "/staff/inventory") return <InventoryPage />;
                  if (location.pathname === "/staff/discounts") return <DiscountsPage />;
                  if (location.pathname === "/staff/alerts") return <NotificationsPage />;
                  if (location.pathname === "/staff/reports") return <ReportsManagement role="STAFF" />;
                  
                  return (
                    <div className="text-center py-24">
                      <div className="h-20 w-20 bg-[#0F172A]/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Settings size={40} className="text-[#0F172A]/20"/>
                      </div>
                      <h2 className="text-2xl font-black text-[#0F172A]">Section Modules</h2>
                      <p className="text-[#0F172A]/40 font-bold uppercase tracking-widest text-xs mt-2">Expansion Module Coming Soon</p>
                    </div>
                  );
                })()}
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

export default Staff;
