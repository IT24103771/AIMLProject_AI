import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, AlertCircle } from "lucide-react";

const ReportsForm = ({ open, setOpen, report = null, onSave }) => {
    const [formData, setFormData] = useState({
        reportTitle: "",
        reportType: "",
        description: "",
        dateRangeStart: "",
        dateRangeEnd: "",
        status: "Draft",
        visibility: "Admin Only",
        format: "PDF",
        priority: "Low",
        notes: "",
        published: false
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (report) {
            setFormData({
                ...report
            });
        } else {
            setFormData({
                reportTitle: "",
                reportType: "",
                description: "",
                dateRangeStart: "",
                dateRangeEnd: "",
                status: "Draft",
                visibility: "Admin Only",
                format: "PDF",
                priority: "Low",
                notes: "",
                published: false
            });
        }
        setErrors({});
    }, [report, open]);

    const validate = () => {
        const newErrors = {};
        if (!formData.reportTitle.trim()) newErrors.reportTitle = "Title is required";
        if (!formData.reportType) newErrors.reportType = "Type is required";

        if (formData.status === "Generated" || formData.status === "Published") {
            if (!formData.dateRangeStart) newErrors.dateRangeStart = "Start Date required for Generated/Published";
            if (!formData.dateRangeEnd) newErrors.dateRangeEnd = "End Date required for Generated/Published";
        }

        if (formData.dateRangeStart && formData.dateRangeEnd) {
            if (new Date(formData.dateRangeStart) > new Date(formData.dateRangeEnd)) {
                newErrors.dateRangeEnd = "End Date cannot be before Start Date";
            }
        }
        
        if (formData.reportType === "SALES" || formData.reportType === "EXPIRED") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (formData.dateRangeStart && new Date(formData.dateRangeStart) > today) {
                newErrors.dateRangeStart = "Cannot select future dates for historical reports";
            }
            if (formData.dateRangeEnd && new Date(formData.dateRangeEnd) > today) {
                newErrors.dateRangeEnd = "Cannot select future dates for historical reports";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validation check for published setting
        if (formData.published && formData.status !== "Published") {
            // Force status to "Published" if checkbox is ticked but dropdown isn't matching
            formData.status = "Published";
        }

        if (validate()) {
            onSave(formData);
        }
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-end bg-[#0F172A]/40 backdrop-blur-sm"
                onClick={() => setOpen(false)}
            >
                <motion.div 
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="w-full max-w-xl h-full bg-white shadow-2xl border-l border-[#0F172A]/10 flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h2 className="text-2xl font-black text-[#0F172A]">
                            {report ? "Edit Report" : "Create Report"}
                        </h2>
                        <button 
                            onClick={() => setOpen(false)}
                            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#0F172A] hover:bg-slate-50 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        <form id="report-form" onSubmit={handleSubmit} className="space-y-6">
                            
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-[#0F172A]/50 mb-2">Report Title *</label>
                                <input 
                                    type="text" 
                                    className={`w-full p-4 rounded-2xl bg-slate-50 border ${errors.reportTitle ? 'border-red-500' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20 focus:border-[#007A5E] font-medium transition-all`}
                                    placeholder="e.g., Weekly Wastage Analysis"
                                    value={formData.reportTitle}
                                    onChange={e => setFormData({...formData, reportTitle: e.target.value})}
                                />
                                {errors.reportTitle && <p className="text-red-500 text-xs mt-1 font-bold flex items-center gap-1"><AlertCircle size={12}/> {errors.reportTitle}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-[#0F172A]/50 mb-2">Report Type *</label>
                                    <select 
                                        className={`w-full p-4 rounded-2xl bg-slate-50 border ${errors.reportType ? 'border-red-500' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20 focus:border-[#007A5E] font-medium transition-all appearance-none cursor-pointer`}
                                        value={formData.reportType}
                                        onChange={e => setFormData({...formData, reportType: e.target.value})}
                                    >
                                        <option value="">Select a type...</option>
                                        <option value="INVENTORY">Inventory Summary</option>
                                        <option value="SALES">Sales Report</option>
                                        <option value="EXPIRED">Expired Items Report</option>
                                        <option value="NEAR_EXPIRY">Near Expiry Report</option>
                                    </select>
                                    {errors.reportType && <p className="text-red-500 text-xs mt-1 font-bold flex items-center gap-1"><AlertCircle size={12}/> {errors.reportType}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-[#0F172A]/50 mb-2">Format</label>
                                    <div className="w-full p-4 rounded-2xl bg-slate-100 border border-slate-200 text-[#0F172A]/50 font-medium cursor-not-allowed">
                                        PDF <span className="text-xs ml-2">(Fixed)</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-[#0F172A]/50 mb-2">Description</label>
                                <textarea 
                                    rows="3"
                                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20 focus:border-[#007A5E] font-medium transition-all resize-none"
                                    placeholder="Brief overview of this report's contents..."
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-[#0F172A]/50 mb-2">Start Date</label>
                                    <input 
                                        type="date" 
                                        className={`w-full p-4 rounded-2xl bg-slate-50 border ${errors.dateRangeStart ? 'border-red-500' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20 focus:border-[#007A5E] font-medium transition-all`}
                                        value={formData.dateRangeStart}
                                        onChange={e => setFormData({...formData, dateRangeStart: e.target.value})}
                                    />
                                    {errors.dateRangeStart && <p className="text-red-500 text-xs mt-1 font-bold flex items-center gap-1"><AlertCircle size={12}/> {errors.dateRangeStart}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-[#0F172A]/50 mb-2">End Date</label>
                                    <input 
                                        type="date" 
                                        className={`w-full p-4 rounded-2xl bg-slate-50 border ${errors.dateRangeEnd ? 'border-red-500' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20 focus:border-[#007A5E] font-medium transition-all`}
                                        value={formData.dateRangeEnd}
                                        onChange={e => setFormData({...formData, dateRangeEnd: e.target.value})}
                                    />
                                    {errors.dateRangeEnd && <p className="text-red-500 text-xs mt-1 font-bold flex items-center gap-1"><AlertCircle size={12}/> {errors.dateRangeEnd}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-[#0F172A]/50 mb-2">Status</label>
                                    <select 
                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#007A5E] text-sm font-bold transition-all appearance-none cursor-pointer"
                                        value={formData.status}
                                        onChange={e => setFormData({...formData, status: e.target.value})}
                                    >
                                        <option value="Draft">Draft</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Generated">Generated</option>
                                        <option value="Published">Published</option>
                                        <option value="Archived" disabled={!report}>Archived</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-[#0F172A]/50 mb-2">Priority</label>
                                    <select 
                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#007A5E] text-sm font-bold transition-all appearance-none cursor-pointer"
                                        value={formData.priority}
                                        onChange={e => setFormData({...formData, priority: e.target.value})}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-[#0F172A]/50 mb-2">Visibility</label>
                                    <select 
                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#007A5E] text-sm font-bold transition-all appearance-none cursor-pointer"
                                        value={formData.visibility}
                                        onChange={e => setFormData({...formData, visibility: e.target.value})}
                                    >
                                        <option value="ADMIN">Admin Only</option>
                                        <option value="STAFF">Staff</option>
                                        <option value="ALL">All</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-[#0F172A]/50 mb-2">Internal Notes</label>
                                <textarea 
                                    rows="2"
                                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007A5E]/20 focus:border-[#007A5E] text-sm font-medium transition-all resize-none"
                                    placeholder="Visible only to admins..."
                                    value={formData.notes}
                                    onChange={e => setFormData({...formData, notes: e.target.value})}
                                />
                            </div>
                            
                            <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={formData.published}
                                    onChange={e => setFormData({...formData, published: e.target.checked})}
                                    className="w-5 h-5 rounded border-slate-300 text-[#007A5E] focus:ring-[#007A5E]"
                                />
                                <span className="text-sm font-bold text-[#0F172A]">Publish Immediately</span>
                            </label>

                        </form>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-bl-[2rem]">
                        <button 
                            type="button"
                            onClick={() => setOpen(false)}
                            className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-[#0F172A] font-bold shadow-sm hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            form="report-form"
                            type="submit"
                            className="px-8 py-3 rounded-2xl bg-[#007A5E] text-white font-black shadow-xl shadow-[#007A5E]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Save size={18} /> Save Report
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ReportsForm;
