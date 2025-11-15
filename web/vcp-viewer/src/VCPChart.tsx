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
  Legend,
} from 'recharts';
import { Stock } from './types';
import { identifyVCPZones } from './vcpUtils';

interface VCPChartProps {
  stock: Stock;
}

export const VCPChart: React.FC<VCPChartProps> = ({ stock }) => {
  const { priceHistory } = stock;

  if (!priceHistory || priceHistory.length === 0) {
    return <div className="text-gray-500 text-center p-4">No price data available</div>;
  }

  // Identify VCP zones
  const vcpZones = identifyVCPZones(priceHistory);

  const calculateSMA = (history: typeof priceHistory, period: number) => {
    const smaValues: Array<number | null> = [];
    let rollingSum = 0;
    for (let i = 0; i < history.length; i += 1) {
      rollingSum += history[i].close;
      if (i >= period) {
        rollingSum -= history[i - period].close;
      }
      if (i + 1 >= period) {
        smaValues.push(rollingSum / period);
      } else {
        smaValues.push(null);
      }
    }
    return smaValues;
  };

  const sma20 = calculateSMA(priceHistory, 20);
  const sma50 = calculateSMA(priceHistory, 50);
  const sma200 = calculateSMA(priceHistory, 200);

  // Prepare data for chart
  const chartData = priceHistory.map((bar, index) => ({
    ...bar,
    index,
    dateShort: new Date(bar.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    sma20: sma20[index],
    sma50: sma50[index],
    sma200: sma200[index],
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
              if (value === null || value === undefined || Number.isNaN(Number(value))) {
                return ['-', name];
              }
              const formatted = `$${Number(value).toFixed(2)}`;
              switch (name) {
                case 'close':
                  return [formatted, 'Close'];
                case 'sma20':
                  return [formatted, 'SMA 20'];
                case 'sma50':
                  return [formatted, 'SMA 50'];
                case 'sma200':
                  return [formatted, 'SMA 200'];
                default:
                  return [value, name];
              }
            }}
            labelFormatter={(label) => label}
          />
          <Legend verticalAlign="top" height={24} iconType="line" />

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

          {/* Moving averages */}
          {[
            { key: 'sma20', stroke: '#f97316', name: 'SMA 20', strokeWidth: 1.5, dash: '4 2' },
            { key: 'sma50', stroke: '#a855f7', name: 'SMA 50', strokeWidth: 1.5, dash: '6 3' },
            { key: 'sma200', stroke: '#9ca3af', name: 'SMA 200', strokeWidth: 2, dash: '8 4' },
          ].map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.stroke}
              strokeWidth={line.strokeWidth}
              strokeDasharray={line.dash}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}

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
