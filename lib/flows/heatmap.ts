import { FlowDataPoint, HeatmapCell } from "../types";

type CapitalData = {
  chainTVL: FlowDataPoint[];
  [key: string]: any;
};

type MacroData = {
  commodities: FlowDataPoint[];
  fx: FlowDataPoint[];
  [key: string]: any;
};

function getColor(changePct: number): string {
  if (changePct < -5) return "#991b1b"; // dark red
  if (changePct < -1) return "#ef4444"; // light red
  if (changePct <= 1) return "#3f3f46"; // neutral
  if (changePct <= 5) return "#22c55e"; // light green
  return "#15803d"; // dark green
}

function formatValue(value: number, unit: string): string {
  if (unit === "%" || unit.includes("%")) return value.toFixed(2) + "%";
  if (Math.abs(value) >= 1e12) return "$" + (value / 1e12).toFixed(2) + "T";
  if (Math.abs(value) >= 1e9) return "$" + (value / 1e9).toFixed(2) + "B";
  if (Math.abs(value) >= 1e6) return "$" + (value / 1e6).toFixed(2) + "M";
  if (Math.abs(value) >= 1e3) return "$" + (value / 1e3).toFixed(2) + "K";
  return unit === "$" ? "$" + value.toFixed(2) : value.toFixed(2);
}

export function computeHeatmap(capital: CapitalData, macro: MacroData): HeatmapCell[] {
  const cells: HeatmapCell[] = [];

  // Gather rows: top 10 chains + commodities + top 5 FX
  const chainRows = capital.chainTVL.slice(0, 10);
  const commodityRows = macro.commodities;
  const fxRows = macro.fx.slice(0, 5);

  const allRows: FlowDataPoint[] = [...chainRows, ...commodityRows, ...fxRows];

  for (const row of allRows) {
    // Column: 24h Change %
    cells.push({
      row: row.name,
      column: "24h Change %",
      value: row.changePct24h,
      color: getColor(row.changePct24h),
    });

    // Column: Value
    cells.push({
      row: row.name,
      column: "Value",
      value: row.value,
      color: "#3f3f46", // neutral for absolute values
    });

    // Column: 7d Change %
    const change7d = row.change7d ?? 0;
    cells.push({
      row: row.name,
      column: "7d Change %",
      value: change7d,
      color: getColor(change7d),
    });
  }

  return cells;
}
