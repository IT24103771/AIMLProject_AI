import React from "react";
import { FileText, CheckCircle2, Clock, Flame, Star, Archive, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";

const ReportsStats = ({ reports = [] }) => {
    const total = reports.length;
    const generated = reports.filter(r => r.status === "Generated" || r.status === "Published").length;
    const published = reports.filter(r => r.status === "Published").length;
    const archived = reports.filter(r => r.status === "Archived").length;
    const critical = reports.filter(r => r.priority === "Critical" && r.status !== "Archived").length;
    const favorites = reports.filter(r => r.favorite).length;

    const stats = [
        { label: "Total Reports", value: total, icon: FileText, color: "text-[#0F172A]", bg: "bg-[#0F172A]/5" },
        { label: "Generated", value: generated, icon: BarChart2, color: "text-blue-600", bg: "bg-blue-100" },
        { label: "Published", value: published, icon: CheckCircle2, color: "text-[#007A5E]", bg: "bg-[#007A5E]/10" },
        { label: "Archived", value: archived, icon: Archive, color: "text-slate-500", bg: "bg-slate-100" },
        { label: "Critical", value: critical, icon: Flame, color: "text-red-600", bg: "bg-red-100" },
        { label: "Favorites", value: favorites, icon: Star, color: "text-yellow-600", bg: "bg-yellow-100" },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {stats.map((stat, i) => (
                <motion.div 
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-5 rounded-3xl bg-white border border-[#0F172A]/5 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group hover:shadow-md transition-all"
                >
                    <div className={`mb-3 h-10 w-10 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                        <stat.icon size={20} />
                    </div>
                    <div className="text-2xl font-black text-[#0F172A] mb-1">{stat.value}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#0F172A]/50">{stat.label}</div>
                    <div className={`absolute bottom-0 inset-x-0 h-1 ${stat.bg} opacity-0 group-hover:opacity-100 transition-opacity`}/>
                </motion.div>
            ))}
        </div>
    );
};

export default ReportsStats;
