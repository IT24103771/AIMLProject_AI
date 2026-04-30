import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Menu, Search, CheckCircle2, Clock, ChevronRight, BellRing, Zap, ShieldCheck, Settings, Sparkles, UserCircle, } from "lucide-react";
import InvigoLogo from "@/components/InvigoLogo";
import LogoutButton from "@/components/LogoutButton";
import { Button } from "@/components/ui/button";
import SalesModule from "@/components/SalesModule";
import StaffProfile from "@/components/StaffProfile";
const staffStats = [
    { label: "Tasks Done", value: "24", sub: "8 pending", icon: CheckCircle2, color: "text-[#007A5E]", bg: "bg-[#007A5E]/10" },
    { label: "High Risk Items", value: "12", sub: "Scan required", icon: Clock, color: "text-[#9D1967]", bg: "bg-[#9D1967]/10" },
    { label: "Efficiency", value: "96%", sub: "Top performer", icon: Zap, color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10" },
];
const Sidebar = ({ open, setOpen }) => {
    const location = useLocation();
    const navItems = [
        { label: "Staff Desk", href: "/staff", icon: LayoutDashboard },
        { label: "Sales Entry", href: "/staff/sales", icon: CheckCircle2 },
        { label: "Rapid Scan", href: "/staff/inventory", icon: Search },
        { label: "My Alerts", href: "/staff/alerts", icon: BellRing },
        { label: "Activity Log", href: "/staff/reports", icon: Clock },
        { label: "My Profile", href: "/staff/profile", icon: UserCircle },
    ];
    return (<>
            <AnimatePresence>
                {open && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"/>)}
            </AnimatePresence>

            <aside className={`fixed top-0 left-0 z-50 h-screen w-72 bg-[#141C1A] text-white transition-transform duration-300 shadow-2xl lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"} lg:sticky`}>
                <div className="flex flex-col h-full border-r border-white/5">
                    <div className="p-8 flex items-center gap-3">
                        <div className="h-10 w-10 glass p-1.5 rounded-xl border-white/10 bg-white/5">
                            <InvigoLogo size={28}/>
                        </div>
                        <span className="font-brand text-3xl text-white">Invigo<span className="text-[#007A5E]">.</span></span>
                    </div>

                    <div className="px-4 mb-4">
                        <div className="glass p-4 rounded-3xl border-white/5 bg-white/5 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#007A5E] to-[#7C3AED] flex items-center justify-center font-black text-white shadow-lg shadow-[#007A5E]/20">
                                ST
                            </div>
                            <div>
                                <p className="text-sm font-black leading-none mb-1 text-white">Staff Hub</p>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">Status: Active</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 space-y-2 py-4">
                        {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (<Link key={item.href} to={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${isActive
                    ? "bg-white/10 text-white font-black border border-white/5"
                    : "text-white/40 hover:text-white hover:bg-white/5 font-bold"}`}>
                                    <item.icon size={20} className={isActive ? "text-[#007A5E]" : "group-hover:text-white"}/>
                                    <span className="text-sm">{item.label}</span>
                                    {isActive && <motion.div layoutId="active" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#007A5E]"/>}
                                </Link>);
        })}
                    </nav>

                    <div className="p-6 border-t border-white/5">
                        <LogoutButton className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-white/30 hover:text-white hover:bg-red-500/10 transition-all font-black uppercase tracking-widest text-[10px]"/>
                    </div>
                </div>
            </aside>
        </>);
};
const Header = ({ setSidebarOpen, title }) => (<header className="sticky top-0 z-30 flex h-20 items-center justify-between px-8 bg-[#141C1A]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setSidebarOpen(true)}>
                <Menu size={24}/>
            </Button>
            <h1 className="font-brand text-3xl tracking-tight text-white">{title}</h1>
        </div>
    </header>);
const StaffDashboardHome = () => (<div className="space-y-8">
        <div className="grid sm:grid-cols-3 gap-6">
            {staffStats.map((stat, i) => (<motion.div key={stat.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="card-premium bg-[#F9F5EC] p-8 rounded-[2rem] border-none shadow-[0_8px_30px_rgb(78,52,46,0.04)] hover:shadow-[0_8px_30px_rgb(78,52,46,0.08)] transition-all">
                    <div className={`h-14 w-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6`}>
                        <stat.icon size={28}/>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#4E342E]/40 mb-1">{stat.label}</p>
                    <h3 className="text-4xl font-black text-[#4E342E]">{stat.value}</h3>
                    <p className="text-xs font-bold text-[#4E342E]/50 mt-2">{stat.sub}</p>
                </motion.div>))}
        </div>

        <div className="card-premium p-10 bg-gradient-to-br from-[#8D6E63]/20 to-[#D7CCC8]/30 border-none shadow-[0_8px_30px_rgb(78,52,46,0.04)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"/>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-alice-bold tracking-tight mb-2 text-[#4E342E]">Shift Priorities</h2>
                        <p className="text-[#007A5E] text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={16}/> Hand-picked by AI engine
                        </p>
                    </div>
                    <div className="p-4 bg-[#F9F5EC]/50 rounded-2xl backdrop-blur-sm border border-[#F9F5EC] text-[#8D6E63] shadow-sm">
                        <ShieldCheck size={48}/>
                    </div>
                </div>
                <div className="grid gap-4">
                    {[
        "Scan Batch FM-102 (Milk) for accurate level detection",
        "Prioritize restocking front-end display for Yogurt Plain",
        "Mark FM-209 as 'Promoted' in system"
    ].map((task, i) => (<div key={i} className="bg-[#F9F5EC]/60 backdrop-blur-md border border-white/50 p-5 rounded-3xl flex items-center gap-4 hover:bg-[#F9F5EC] transition-all cursor-pointer group shadow-sm hover:shadow-md">
                            <div className="h-8 w-8 rounded-full border-2 border-[#007A5E]/20 text-[#007A5E] flex items-center justify-center group-hover:bg-[#007A5E] group-hover:border-[#007A5E] group-hover:text-white transition-all">
                                <CheckCircle2 size={16}/>
                            </div>
                            <span className="font-black text-sm tracking-tight text-[#4E342E]">{task}</span>
                            <ChevronRight size={20} className="ml-auto text-[#4E342E]/30 group-hover:text-[#007A5E]"/>
                        </div>))}
                </div>
            </div>
        </div>
    </div>);
const Staff = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const getPageTitle = () => {
        if (location.pathname === "/staff/inventory")
            return "Rapid Scan";
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
            {/* Background aesthetics */}
            <div className="fixed inset-0 pointer-events-none transition-opacity duration-1000">
                <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-1000 bg-[#7C3AED]/10"/>
                <div className="absolute bottom-0 left-0 w-[30%] h-[30%] rounded-full blur-[100px] transition-colors duration-1000 bg-[#007A5E]/10"/>
            </div>

            <div className="flex flex-col min-h-screen relative z-10 animate-fade-in">
                <Header setSidebarOpen={setSidebarOpen} title={getPageTitle()}/>
                <main className="flex-1 p-8 lg:p-12">
                    <div className="max-w-7xl mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                                {location.pathname === "/staff" || location.pathname === "/staff/" ? (<StaffDashboardHome />) : location.pathname === "/staff/sales" ? (<SalesModule role="Staff"/>) : location.pathname === "/staff/profile" ? (<StaffProfile />) : (<div className="text-center py-24">
                                        <div className="h-20 w-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-colors duration-500 bg-[#4E342E]/5 text-[#4E342E]/20">
                                            <Settings size={40} className="currentColor"/>
                                        </div>
                                        <h2 className="text-2xl font-black transition-colors duration-500 text-[#4E342E]">Section Modules</h2>
                                        <p className="font-bold uppercase tracking-widest text-xs mt-2 transition-colors duration-500 text-[#4E342E]/40">Expansion Module Coming Soon</p>
                                    </div>)}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>);
    return (<div className="flex min-h-screen tracking-tight transition-colors duration-500 bg-gradient-to-br from-[#F5EBE1] to-[#E6D5C3] text-[#4E342E]">
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}/>
            <div className="flex-1 w-full max-w-full overflow-hidden">{content}</div>
        </div>);
};
export default Staff;
