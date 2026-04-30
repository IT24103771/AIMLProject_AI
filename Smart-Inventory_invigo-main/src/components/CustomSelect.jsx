import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CustomSelect = ({ name, value, onChange, placeholder, options, disabled, className = "" }) => {
  // Radix UI Select does not allow "" as a value for SelectItem.
  // We map "" to "__EMPTY__" internally.
  
  const handleValueChange = (val) => {
    if (onChange) {
      onChange({ target: { name, value: val === "__EMPTY__" ? "" : val } });
    }
  };

  const safeValue = value === "" ? "__EMPTY__" : (value || undefined);

  return (
    <Select value={safeValue} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger
        className={`w-full rounded-2xl bg-[#0F172A]/5 h-12 border-transparent px-4 font-bold focus:bg-white focus:ring-2 focus:ring-[#007A5E]/50 transition-all text-sm outline-none text-[#0F172A] ${className}`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-2xl border-white/40 shadow-premium bg-white/95 backdrop-blur-xl">
        {options.map((opt, i) => {
          const optValue = opt.value === "" ? "__EMPTY__" : opt.value;
          return (
            <SelectItem 
              key={i} 
              value={optValue}
              className="font-bold text-[#0F172A] focus:bg-[#007A5E]/10 focus:text-[#007A5E] cursor-pointer rounded-xl my-0.5"
            >
              {opt.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default CustomSelect;
