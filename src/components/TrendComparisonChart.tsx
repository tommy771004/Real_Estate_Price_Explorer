import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { Transaction } from '../types/real-estate';

const toNumber = (value: string | number | undefined) => {
  const parsed = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

interface TrendComparisonChartProps {
  data: Transaction[];
  district: string;
  cityName: string;
  assetMode: string;
}

function parseYearMonth(date: string) {
  const raw = String(date || "");
  if (raw.length < 5) return { year: 0, month: 0, label: "" };
  const yearStr = raw.length >= 7 ? raw.slice(0, raw.length - 4) : raw.slice(0, 3);
  const monthStr = raw.length >= 7 ? raw.slice(raw.length - 4, raw.length - 2) : raw.slice(3, 5);
  return { 
    year: Number.parseInt(yearStr, 10), 
    month: Number.parseInt(monthStr, 10),
    label: `${yearStr}年${monthStr}月`
  };
}

function getMedian(arr: number[]) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function TrendComparisonChart({ data, district, cityName, assetMode }: TrendComparisonChartProps) {
  const chartData = useMemo(() => {
    if (district === "全部" || !district) return [];

    // Filter out invalid dates
    const validData = data.filter(d => {
      const { year, month } = parseYearMonth(d.date);
      return year > 0 && month > 0;
    });

    // Group by period (year * 12 + month)
    const grouped = new Map<number, { 
      label: string; 
      cityPrices: number[]; 
      districtPrices: number[];
      year: number;
      month: number;
    }>();

    for (const d of validData) {
      const { year, month, label } = parseYearMonth(d.date);
      const period = year * 12 + month;
      
      if (!grouped.has(period)) {
        grouped.set(period, { label, cityPrices: [], districtPrices: [], year, month });
      }
      
      const group = grouped.get(period)!;
      
      let price = 0;
      if (assetMode === "rental") {
         price = toNumber(d.unitPrice) * 3.30578; // per ping
      } else {
         price = toNumber(d.unitPrice) * 3.30578; // per ping in NTD
         if (assetMode === "land" || assetMode === "building" || assetMode === "presale") {
           price = price / 10000; // 万/坪
         }
      }

      if (price > 0 && Number.isFinite(price)) {
        group.cityPrices.push(price);
        if (d.district === district) {
          group.districtPrices.push(price);
        }
      }
    }

    // Sort by period, take last 6
    const sortedPeriods = Array.from(grouped.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const last6 = sortedPeriods.slice(-6);

    return last6.map(g => {
      const cityMedian = getMedian(g.cityPrices);
      const districtMedian = getMedian(g.districtPrices);
      return {
        name: g.label,
        cityAverage: cityMedian > 0 ? Number(cityMedian.toFixed(1)) : null,
        districtAverage: districtMedian > 0 ? Number(districtMedian.toFixed(1)) : null,
      };
    });

  }, [data, district, assetMode]);

  if (district === "全部" || !district || chartData.length === 0) {
    return null;
  }

  const isRental = assetMode === "rental";
  const unitLabel = isRental ? "元/坪" : "萬/坪";

  return (
    <div className="trend-comparison-chart" style={{ width: '100%', height: 220, marginTop: 24, padding: '0 12px' }}>
      <div className="trend-comparison-chart-title" style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 12 }}>
        近六個月房價趨勢對比：{district} vs {cityName} ({unitLabel})
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            domain={['auto', 'auto']}
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
            labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}
          />
          <Legend 
            wrapperStyle={{ fontSize: 12, paddingTop: 10 }} 
            iconType="circle"
          />
          <Line 
            name={`${cityName}平均`} 
            type="monotone" 
            dataKey="cityAverage" 
            stroke="#94a3b8" 
            strokeWidth={2} 
            dot={{ r: 4, strokeWidth: 2 }} 
            activeDot={{ r: 6 }} 
          />
          <Line 
            name={`${district}平均`} 
            type="monotone" 
            dataKey="districtAverage" 
            stroke="#ef6c52" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2 }} 
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
