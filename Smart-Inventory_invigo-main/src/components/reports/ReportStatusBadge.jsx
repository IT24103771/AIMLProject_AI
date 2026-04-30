import React from "react";
import { CheckCircle2, AlertCircle, Clock, FileEdit, Archive, Flame, ShieldAlert, BadgeInfo } from "lucide-react";

export const ReportStatusBadge = ({ status }) => {
    switch (status) {
        case "Draft":
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                    <FileEdit size={12} /> Draft
                </div>
            );
        case "Pending":
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase tracking-wider">
                    <Clock size={12} /> Pending
                </div>
            );
        case "Generated":
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                    <CheckCircle2 size={12} /> Generated
                </div>
            );
        case "Published":
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#007A5E]/10 text-[#007A5E] text-[10px] font-black uppercase tracking-wider ring-1 ring-[#007A5E]/20">
                    <CheckCircle2 size={12} /> Published
                </div>
            );
        case "Archived":
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <Archive size={12} /> Archived
                </div>
            );
        default:
            return null;
    }
};

export const ReportPriorityBadge = ({ priority }) => {
    switch (priority) {
        case "Critical":
            return (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-widest border border-red-200 shadow-sm shadow-red-100 object-contain">
                    <Flame size={10} className="animate-pulse" /> Critical
                </div>
            );
        case "High":
            return (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-widest border border-orange-200">
                    <ShieldAlert size={10} /> High
                </div>
            );
        case "Medium":
            return (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-700 text-[9px] font-black uppercase tracking-widest">
                    Medium
                </div>
            );
        case "Low":
            return (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest">
                    <BadgeInfo size={10} /> Low
                </div>
            );
        default:
            return null;
    }
};
