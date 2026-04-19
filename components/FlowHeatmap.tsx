"use client";

import { useState, useMemo } from "react";
import { HeatmapCell } from "@/lib/types";
import { trackEvent } from "@/lib/tracking/events";

interface FlowHeatmapProps {
  heatmapData: HeatmapCell[];
  sortColumn?: string;
  onSortChange?: (col: string) => void;
}

const COLUMNS = ["Value", "24h Change %", "7d Change %"];

function columnKey(col: string): string {
  if (col === "Value") return "Value";
  if (col === "24h Change %") return "24h Change %";
  return "7d Change %";
}

export default function FlowHeatmap({
  heatmapData,
  sortColumn,
  onSortChange,
}: FlowHeatmapProps) {
  const [internalSort, setInternalSort] = useState<{
    col: string;
    asc: boolean;
  }>({ col: "", asc: false });

  const activeSort = sortColumn || internalSort.col;

  const rows = useMemo(() => {
    const rowNames = Array.from(new Set(heatmapData.map((c) => c.row)));

    if (activeSort) {
      rowNames.sort((a, b) => {
        const cellA = heatmapData.find(
          (c) => c.row === a && c.column === activeSort
        );
        const cellB = heatmapData.find(
          (c) => c.row === b && c.column === activeSort
        );
        const valA = cellA?.value ?? 0;
        const valB = cellB?.value ?? 0;
        return internalSort.asc ? valA - valB : valB - valA;
      });
    }

    return rowNames;
  }, [heatmapData, activeSort, internalSort.asc]);

  function handleSort(col: string) {
    trackEvent("heatmap_sorted", { column: col });
    if (onSortChange) {
      onSortChange(col);
    } else {
      setInternalSort((prev) =>
        prev.col === col ? { col, asc: !prev.asc } : { col, asc: false }
      );
    }
  }

  function getCell(row: string, column: string): HeatmapCell | undefined {
    return heatmapData.find((c) => c.row === row && c.column === column);
  }

  function formatCellValue(value: number, column: string): string {
    if (column.includes("Change")) {
      const sign = value >= 0 ? "+" : "";
      return `${sign}${value.toFixed(2)}%`;
    }
    const abs = Math.abs(value);
    if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(2);
  }

  if (!heatmapData || heatmapData.length === 0) {
    return (
      <div className="text-text-muted text-sm py-4 text-center">
        No heatmap data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 text-text-muted text-xs uppercase tracking-wider font-[family-name:var(--font-mono)] bg-bg-surface border border-border-main">
              Asset
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col}
                onClick={() => handleSort(columnKey(col))}
                className="text-right px-3 py-2 text-text-muted text-xs uppercase tracking-wider font-[family-name:var(--font-mono)] bg-bg-surface border border-border-main cursor-pointer hover:text-text-primary transition-colors select-none"
              >
                {col}
                {activeSort === columnKey(col) && (
                  <span className="ml-1">
                    {internalSort.asc ? "\u25B2" : "\u25BC"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-text-primary border border-border-main bg-bg-surface whitespace-nowrap text-xs">
                {row}
              </td>
              {COLUMNS.map((col) => {
                const cell = getCell(row, columnKey(col));
                return (
                  <td
                    key={col}
                    className="px-3 py-2 text-right font-[family-name:var(--font-mono)] text-xs border border-border-main whitespace-nowrap"
                    style={{
                      backgroundColor: cell?.color || "transparent",
                    }}
                  >
                    <span className="text-white font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {cell ? formatCellValue(cell.value, col) : "\u2014"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
