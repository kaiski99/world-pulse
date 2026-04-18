"use client";

import { useState, useMemo } from "react";
import { FlowDataPoint } from "@/lib/types";

interface FlowTableProps {
  title: string;
  icon: string;
  data: FlowDataPoint[];
  columns: { key: string; label: string }[];
  defaultOpen?: boolean;
}

function formatValue(value: number, unit: string): string {
  if (unit === "%") return `${value.toFixed(2)}%`;
  if (unit === "USD" || unit === "$") {
    const abs = Math.abs(value);
    if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  }
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getCellValue(item: FlowDataPoint, key: string): string | number {
  switch (key) {
    case "name":
      return item.name;
    case "value":
      return item.value;
    case "unit":
      return item.unit;
    case "change24h":
      return item.change24h;
    case "changePct24h":
      return item.changePct24h;
    case "change7d":
      return item.change7d ?? 0;
    case "direction":
      return item.direction;
    default: {
      const meta = item.metadata?.[key];
      return meta !== undefined ? meta : "";
    }
  }
}

function renderCellValue(
  item: FlowDataPoint,
  key: string
): React.ReactNode {
  switch (key) {
    case "name":
      return <span className="text-text-primary">{item.name}</span>;
    case "value":
      return (
        <span className="text-text-primary font-[family-name:var(--font-mono)]">
          {formatValue(item.value, item.unit)}
        </span>
      );
    case "change24h":
      return (
        <span
          className={`font-[family-name:var(--font-mono)] ${item.change24h >= 0 ? "text-accent-green" : "text-red-500"}`}
        >
          {formatValue(item.change24h, item.unit)}
        </span>
      );
    case "changePct24h":
      return (
        <span
          className={`font-[family-name:var(--font-mono)] ${item.changePct24h >= 0 ? "text-accent-green" : "text-red-500"}`}
        >
          {formatChange(item.changePct24h)}
        </span>
      );
    case "change7d":
      if (item.change7d === undefined) return <span className="text-text-muted">--</span>;
      return (
        <span
          className={`font-[family-name:var(--font-mono)] ${item.change7d >= 0 ? "text-accent-green" : "text-red-500"}`}
        >
          {formatChange(item.change7d)}
        </span>
      );
    case "direction":
      return (
        <span
          className={
            item.direction === "up"
              ? "text-accent-green"
              : item.direction === "down"
                ? "text-red-500"
                : "text-text-muted"
          }
        >
          {item.direction === "up" ? "\u2191" : item.direction === "down" ? "\u2193" : "\u2192"}
        </span>
      );
    default: {
      const meta = item.metadata?.[key];
      return (
        <span className="text-text-secondary">
          {meta !== undefined ? String(meta) : "--"}
        </span>
      );
    }
  }
}

export default function FlowTable({
  title,
  icon,
  data,
  columns,
  defaultOpen = false,
}: FlowTableProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortAsc, setSortAsc] = useState(false);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const va = getCellValue(a, sortKey);
      const vb = getCellValue(b, sortKey);
      if (typeof va === "number" && typeof vb === "number") {
        return sortAsc ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      return sortAsc ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [data, sortKey, sortAsc]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  return (
    <div className="rounded bg-bg-surface border border-border-main overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-text-primary flex-1">
          {title}
        </span>
        <span
          className={`text-text-muted text-xs transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          &#9660;
        </span>
      </button>

      {/* Table */}
      {isOpen && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left px-3 py-2 text-text-muted uppercase tracking-wider font-[family-name:var(--font-mono)] border-t border-border-main cursor-pointer hover:text-text-primary transition-colors select-none"
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <span className="ml-1">
                        {sortAsc ? "\u25B2" : "\u25BC"}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, i) => (
                <tr
                  key={item.id}
                  className={`border-t border-border-main ${i % 2 === 1 ? "bg-white/[0.02]" : ""} hover:bg-white/[0.04] transition-colors`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                      {renderCellValue(item, col.key)}
                    </td>
                  ))}
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-4 text-center text-text-muted"
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
