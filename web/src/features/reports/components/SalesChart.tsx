import type { DaySales } from '../aggregate';

export interface SalesChartProps {
  data: DaySales[];
}

const HEIGHT = 160;
const BAR_WIDTH = 22;

/**
 * Weekly revenue bars, mirroring Expo `WeeklySalesChart` (custom SVG, no
 * chart library). Pure markup — renders on the server.
 */
export function SalesChart({ data }: SalesChartProps) {
  const max = Math.max(1, ...data.map((day) => day.revenue));
  const width = Math.max(1, data.length) * (BAR_WIDTH + 10) + 10;
  const plotHeight = HEIGHT - 30;
  return (
    <svg
      width={width}
      height={HEIGHT}
      role="img"
      aria-label="Revenue by day"
      className="bg-surface"
    >
      <line
        x1={0}
        y1={plotHeight}
        x2={width}
        y2={plotHeight}
        stroke="#E0E0E0"
      />
      {data.map((day, index) => {
        const barHeight =
          day.revenue === 0 ? 0 : (day.revenue / max) * plotHeight;
        const x = 10 + index * (BAR_WIDTH + 10);
        return (
          <g key={day.date}>
            <rect
              x={x}
              y={plotHeight - barHeight}
              width={BAR_WIDTH}
              height={barHeight}
              rx={4}
              fill="#364C35"
            />
            <text
              x={x + BAR_WIDTH / 2}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#6B6B6B"
            >
              {day.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
