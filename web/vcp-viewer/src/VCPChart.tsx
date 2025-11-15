import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { Stock } from './types';
import { identifyVCPZones } from './vcpUtils';

interface VCPChartProps {
  stock: Stock;
}

export const VCPChart: React.FC<VCPChartProps> = ({ stock }) => {
  const { priceHistory, sma200 } = stock;

  if (!priceHistory || priceHistory.length === 0) {
    return <div className="text-gray-500 text-center p-4">No price data available</div>;
  }

  // Identify VCP zones
  const vcpZones = identifyVCPZones(priceHistory);

  // Prepare data for chart
  const chartData = priceHistory.map((bar, index) => ({
    ...bar,
    index,
    dateShort: new Date(bar.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  // Calculate min/max for Y-axis
  const minPrice = Math.min(...priceHistory.map(p => p.close));
  const maxPrice = Math.max(...priceHistory.map(p => p.close));
  const padding = (maxPrice - minPrice) * 0.1;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dateShort"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
            formatter={(value: any, name: string) => {
              if (name === 'close') {
                return [`$${Number(value).toFixed(2)}`, 'Close'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => label}
          />

          {/* VCP Zones */}
          {vcpZones.map((zone, idx) => {
            const color = idx === vcpZones.length - 1 ? '#f59e0b' : '#fbbf24';
            const startIndex = zone.start;
            const endIndex = zone.end;

            return (
              <React.Fragment key={`zone-${idx}`}>
                <ReferenceArea
                  x1={startIndex}
                  x2={endIndex}
                  y1={zone.low}
                  y2={zone.high}
                  fill={color}
                  fillOpacity={0.15}
                  strokeOpacity={0}
                />
                <ReferenceLine
                  segment={[
                    { x: startIndex, y: zone.high },
                    { x: endIndex, y: zone.high },
                  ]}
                  stroke={color}
                  strokeWidth={1.5}
                />
                <ReferenceLine
                  segment={[
                    { x: startIndex, y: zone.low },
                    { x: endIndex, y: zone.low },
                  ]}
                  stroke={color}
                  strokeWidth={1.5}
                />
              </React.Fragment>
            );
          })}

          {/* SMA200 line */}
          {sma200 && (
            <ReferenceLine
              y={sma200}
              stroke="#9ca3af"
              strokeDasharray="5 5"
              strokeWidth={1}
              label={{ value: 'SMA200', position: 'right', fill: '#6b7280', fontSize: 12 }}
            />
          )}

          {/* Price line */}
          <Line
            type="monotone"
            dataKey="close"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
