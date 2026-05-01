import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, File, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";

const FileUploadModal = ({ isOpen, onClose, onUpload, title = "Upload File", accept = "*", maxFiles = 1 }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList);
    setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles));
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (success) setSuccess(false);
  };

  const simulateUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setUploading(false);
    setSuccess(true);
    
    // In a real app, we'd send the files to the parent
    if (onUpload) {
      // For now just sending the first file's name or a mock URL
      const mockUrl = URL.createObjectURL(files[0]);
      onUpload(mockUrl);
    }
    
    setTimeout(() => {
      onClose();
      setFiles([]);
      setSuccess(false);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#0F172A]/5"
        >
          {/* Header */}
          <div className="p-8 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">{title}</h2>
              <p className="text-[#0F172A]/40 text-xs font-bold uppercase tracking-widest mt-1">Cloud Integration Active</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-2xl bg-[#0F172A]/5 text-[#0F172A] hover:bg-red-500 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 pt-4 space-y-6">
            {/* Drag and Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative h-48 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all cursor-pointer overflow-hidden ${
                dragActive 
                ? "border-[#007A5E] bg-[#007A5E]/5 scale-[0.98]" 
                : "border-[#0F172A]/10 bg-[#0F172A]/[0.02] hover:bg-[#0F172A]/[0.04]"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={accept}
                multiple={maxFiles > 1}
                onChange={(e) => handleFiles(e.target.files)}
              />

              <div className={`p-4 rounded-3xl ${dragActive ? "bg-[#007A5E] text-white" : "bg-white shadow-sm text-[#007A5E]"} transition-all`}>
                <Upload size={32} />
              </div>

              <div className="text-center">
                <p className="font-black text-[#0F172A]">Click or drag to upload</p>
                <p className="text-[10px] font-bold text-[#0F172A]/40 uppercase tracking-widest mt-1">
                  PNG, JPG, SVG up to 10MB
                </p>
              </div>

              {/* Decorative blobs */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#007A5E]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-[#7C3AED]/5 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 px-2">Selected Files</p>
                {files.map((file, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-[#0F172A]/[0.03] border border-[#0F172A]/5 group"
                  >
                    <div className="p-2 rounded-xl bg-white shadow-sm text-[#007A5E]">
                      {file.type.startsWith('image/') ? <ImageIcon size={18} /> : <File size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[#0F172A] truncate">{file.name}</p>
                      <p className="text-[10px] font-bold text-[#0F172A]/40 uppercase">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    {!uploading && !success && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="p-2 text-[#0F172A]/20 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                    {success && <CheckCircle2 size={18} className="text-[#007A5E]" />}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl bg-[#0F172A]/5 text-[#0F172A] font-black text-xs uppercase tracking-widest hover:bg-[#0F172A]/10 transition-all outline-none"
              >
                Cancel
              </button>
              <button
                disabled={files.length === 0 || uploading || success}
                onClick={simulateUpload}
                className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl outline-none ${
                  files.length === 0 
                  ? "bg-[#0F172A]/10 text-[#0F172A]/30 cursor-not-allowed shadow-none" 
                  : success
                    ? "bg-[#007A5E] text-white"
                    : "bg-[#007A5E] text-white hover:scale-[1.02] shadow-[#007A5E]/20"
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 size={16} />
                    Uploaded
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Confirm Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FileUploadModal;
