"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFilterProps {
  name: string;
  defaultValue?: string;
  options: SelectOption[];
  className?: string;
}

export function SelectFilter({
  name,
  defaultValue = "ALL",
  options,
  className = "bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-xs cursor-pointer",
}: SelectFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    const val = e.target.value;

    if (!val || val === "ALL") {
      params.delete(name);
    } else {
      params.set(name, val);
    }

    // Reset pagination to page 1 on filter change
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`);
  };

  const currentValue = searchParams.get(name) || defaultValue;

  return (
    <select
      name={name}
      value={currentValue}
      onChange={handleChange}
      className={className}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
          {opt.label}
        </option>
      ))}
    </select>
  );
}
