import React from "react";
import { Search, Filter } from "lucide-react";

export const reportTypes = [
    "EXPIRED", "NEAR_EXPIRY", "SALES", "INVENTORY", "AI_RISK"
];

const ReportsFilters = ({ filters, setFilters, role }) => {
    return (
        <div className="bg-white p-6 rounded-3xl border border-[#0F172A]/5 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0F172A]/40" />
                <input 
                    type="text" 
                    placeholder="Search reports by title or author..." 
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20 focus:border-[#007A5E] text-sm font-medium transition-all"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                    <Filter size={14} className="text-slate-400"/>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filters</span>
                </div>

                <select 
                    className="py-2.5 pl-4 pr-8 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#007A5E] cursor-pointer"
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                >
                    <option value="">All Types</option>
                    <option value="INVENTORY">Inventory Summary</option>
                    <option value="SALES">Sales Report</option>
                    <option value="EXPIRED">Expired Items Report</option>
                    <option value="NEAR_EXPIRY">Near Expiry Report</option>
                    <option value="AI_RISK">🤖 AI Risk Report</option>
                </select>

                {role === "ADMIN" && (
                    <select 
                        className="py-2.5 pl-4 pr-8 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#007A5E] cursor-pointer"
                        value={filters.visibility}
                        onChange={(e) => setFilters(prev => ({ ...prev, visibility: e.target.value }))}
                    >
                        <option value="">Any Visibility</option>
                        <option value="ADMIN">Admin Only</option>
                        <option value="STAFF">Staff</option>
                        <option value="ALL">All</option>
                    </select>
                )}
            </div>
        </div>
    );
};

export default ReportsFilters;
