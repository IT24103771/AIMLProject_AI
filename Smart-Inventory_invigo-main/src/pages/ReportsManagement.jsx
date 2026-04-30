import React, { useState, useMemo, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import ReportsStats from "@/components/reports/ReportsStats";
import ReportsFilters from "@/components/reports/ReportsFilters";
import ReportsTable from "@/components/reports/ReportsTable";
import ReportsForm from "@/components/reports/ReportsForm";
import ReportPreviewModal from "@/components/reports/ReportPreviewModal";
import { Plus } from "lucide-react";
import { toast } from "sonner"; // Using 'sonner' which is imported in App.jsx
import { authFetch } from "@/lib/api";

const ReportsManagement = ({ role }) => {
    const [reports, setReports] = useState([]);
    
    const fetchReports = async () => {
        try {
            const res = await authFetch("/api/reports");
            if (res.ok) {
                const data = await res.json();
                setReports(data.sort((a,b) => b.id - a.id));
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to fetch reports");
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);
    const [filters, setFilters] = useState({ search: '', type: '', status: '', priority: '', visibility: '' });
    
    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [previewReport, setPreviewReport] = useState(null);

    // Filter Logic
    const filteredReports = useMemo(() => {
        let result = [...reports];

        // 1. Role-based Visibility Pre-filter
        if (role !== "ADMIN") {
            // Staff can only see 'STAFF' or 'ALL' visibility. 
            result = result.filter(r => {
                const rv = (r.visibility || "").toUpperCase();
                return rv === "STAFF" || rv === "ALL";
            });
        }

        // 2. Search
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(r => 
                (r.reportTitle && r.reportTitle.toLowerCase().includes(q)) || 
                (r.reportType && r.reportType.toLowerCase().includes(q)) ||
                (r.createdBy && r.createdBy.toLowerCase().includes(q))
            );
        }

        // 3. Dropdowns
        if (filters.type) result = result.filter(r => r.reportType === filters.type);
        if (filters.visibility) {
            result = result.filter(r => {
                const rv = (r.visibility || "").toUpperCase().replace(" ONLY", "");
                return rv === filters.visibility.toUpperCase();
            });
        }

        // Sort: Favorites first, then newest based on timestamp or original array order
        return result.sort((a, b) => {
            if (a.favorite === b.favorite) {
                const timeA = a.timestamp || 0;
                const timeB = b.timestamp || 0;
                
                if (timeA !== timeB) {
                    return timeB - timeA;
                }
                // Fallback to array index since new items are prepended
                return reports.indexOf(a) - reports.indexOf(b);
            }
            return a.favorite ? -1 : 1;
        });
    }, [reports, filters, role]);

    // Handlers
    const handleSaveReport = async (data) => {
        try {
            const requestBody = {
                reportTitle: data.reportTitle,
                reportType: data.reportType,
                startDate: data.dateRangeStart || null,
                endDate: data.dateRangeEnd || null,
                visibility: data.visibility || "ADMIN"
            };

            const res = await authFetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (res.ok) {
                toast.success("New report generated and saved successfully!");
                fetchReports();
                setIsFormOpen(false);
            } else {
                toast.error("Failed to create report");
            }
        } catch (e) {
            toast.error("An error occurred creating the report");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this report?")) return;
        
        try {
            const res = await authFetch(`/api/reports/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Report deleted successfully");
                setReports(prev => prev.filter(r => r.id !== id));
            } else {
                toast.error("Failed to delete report");
            }
        } catch (e) {
            toast.error("Error deleting report");
        }
    };

    const handleArchive = (id) => {
        toast.info("Archive is disabled for server-generated reports.");
    };

    const handleRestore = (id) => { };
    const handlePublish = (id) => { };
    const handleUnpublish = (id) => { };
    const handleTogglePin = (id) => { };
    
    const handleVisibilityChange = async (id, newVisibility) => {
        try {
            const res = await authFetch(`/api/reports/${id}/visibility?visibility=${newVisibility}`, {
                method: "PUT"
            });
            if (res.ok) {
                toast.success(`Visibility updated to ${newVisibility}`);
                setReports(prev => prev.map(r => r.id === id ? { ...r, visibility: newVisibility } : r));
            } else {
                toast.error("Failed to update visibility");
            }
        } catch (e) {
            toast.error("Error updating visibility");
        }
    };

    const handleDownload = async (report) => {
        toast.info("Preparing download from server...");
        
        try {
            const res = await authFetch(`/api/reports/${report.id}/download`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Report_${report.reportType}_${report.id}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                toast.success("Download complete");
            } else {
                toast.error("Failed to download PDF stream");
            }
        } catch (e) {
            toast.error("Download failed");
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[#0F172A]/5 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#0F172A]">Reports Management</h1>
                    <p className="text-[#0F172A]/50 font-medium mt-1">Analytics, performance summaries, and predictive intelligence exports.</p>
                </div>
                {role === "ADMIN" && (
                    <button 
                        onClick={() => { setEditingReport(null); setIsFormOpen(true); }}
                        className="px-6 py-3 rounded-2xl bg-[#0F172A] text-white font-black hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2"
                    >
                        <Plus size={18} /> New Report
                    </button>
                )}
            </div>

            <ReportsStats reports={reports} />
            <ReportsFilters filters={filters} setFilters={setFilters} role={role} />
            
            <ReportsTable 
                reports={filteredReports} 
                role={role}
                onPreview={setPreviewReport}
                onEdit={(report) => { setEditingReport(report); setIsFormOpen(true); }}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onRestore={handleRestore}
                onPublish={handlePublish}
                onUnpublish={handleUnpublish}
                onTogglePin={handleTogglePin}
                onDownload={handleDownload}
                onVisibilityChange={handleVisibilityChange}
            />

            <ReportsForm 
                open={isFormOpen} 
                setOpen={setIsFormOpen} 
                report={editingReport} 
                onSave={handleSaveReport}
            />

            <ReportPreviewModal 
                report={previewReport} 
                onClose={() => setPreviewReport(null)} 
                onDownload={handleDownload}
            />
        </div>
    );
};

export default ReportsManagement;
