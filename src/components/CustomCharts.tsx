import React, { useState } from 'react';

// Beautiful pure SVG area chart for risk scores trend
export function RiskDistributionChart({ scores }: { scores: number[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // Group scores in buckets: 0-20, 21-40, 41-60, 61-80, 81-100
  const buckets = [0, 0, 0, 0, 0];
  scores.forEach(s => {
    if (s <= 20) buckets[0]++;
    else if (s <= 40) buckets[1]++;
    else if (s <= 60) buckets[2]++;
    else if (s <= 80) buckets[3]++;
    else buckets[4]++;
  });

  const bucketLabels = ['0-20 (Trust)', '21-40 (Low)', '41-60 (Med)', '61-80 (High)', '81-100 (Critical)'];
  const maxCount = Math.max(...buckets, 1);
  const chartHeight = 160;
  const paddingBottom = 24;
  const totalHeight = chartHeight + paddingBottom;

  return (
    <div className="w-full bg-[#18181b]/50 border border-zinc-800 rounded-xl p-5 backdrop-blur-md">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-100">AI Risk Distribution</h4>
          <p className="text-xs text-zinc-400">Aggregated risk-tier density among candidates</p>
        </div>
        <div className="flex gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Clear
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Caution
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Critical
          </span>
        </div>
      </div>

      <div className="relative flex items-end justify-between h-[180px] pt-4 px-2">
        {buckets.map((count, index) => {
          const heightPercent = (count / maxCount) * 100;
          const barHeight = (heightPercent / 100) * chartHeight;
          const isHovered = hoveredIndex === index;

          // Determine color based on risk bucket
          let colorClass = 'bg-emerald-500/20 border-emerald-500 hover:bg-emerald-500/30';
          let textColorClass = 'text-emerald-400';
          if (index === 2) {
            colorClass = 'bg-amber-500/20 border-amber-500 hover:bg-amber-500/30';
            textColorClass = 'text-amber-400';
          } else if (index >= 3) {
            colorClass = 'bg-rose-500/20 border-rose-500 hover:bg-rose-500/30';
            textColorClass = 'text-rose-400';
          }

          return (
            <div 
              key={index} 
              className="flex-1 flex flex-col items-center justify-end h-full px-1 group cursor-pointer relative"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-[170px] bg-zinc-950 text-xs text-zinc-100 px-2.5 py-1.5 rounded-lg border border-zinc-800 shadow-xl z-20 whitespace-nowrap animate-fade-in">
                  <div className="font-semibold text-zinc-200">{bucketLabels[index]}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Candidates: <span className="text-zinc-100 font-medium">{count}</span></div>
                </div>
              )}

              {/* Bar */}
              <div 
                className={`w-full border-t border-x rounded-t transition-all duration-300 relative ${colorClass}`}
                style={{ height: `${Math.max(barHeight, 6)}px` }}
              >
                {/* Active neon glow top indicator */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-current opacity-80" />
              </div>

              {/* Label */}
              <span className="text-[10px] text-zinc-500 font-mono mt-2 truncate w-full text-center">
                {bucketLabels[index].split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Donut Chart for proctoring violation counts
export function ViolationBreakdownChart({ logs }: { logs: { type: string }[] }) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const breakdown: Record<string, number> = {
    'tab-switch': 0,
    'copy-paste': 0,
    'face-missing': 0,
    'multiple-faces': 0,
    'look-away': 0
  };

  logs.forEach(l => {
    if (l.type in breakdown) {
      breakdown[l.type]++;
    }
  });

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  const colors: Record<string, string> = {
    'tab-switch': '#f59e0b', // Amber
    'copy-paste': '#ec4899', // Pink
    'face-missing': '#3b82f6', // Blue
    'multiple-faces': '#ef4444', // Red
    'look-away': '#8b5cf6' // Purple
  };

  const labels: Record<string, string> = {
    'tab-switch': 'Tab Switches',
    'copy-paste': 'Copy-Pasted Snippets',
    'face-missing': 'Unattended Frames',
    'multiple-faces': 'Secondary Persons',
    'look-away': 'Gaze Deviations'
  };

  // Convert breakdown to chart items
  const items = Object.entries(breakdown)
    .filter(([_, count]) => count > 0)
    .map(([key, count]) => ({
      key,
      name: labels[key],
      value: count,
      color: colors[key],
      percentage: total > 0 ? (count / total) * 100 : 0
    }));

  return (
    <div className="w-full bg-[#18181b]/50 border border-zinc-800 rounded-xl p-5 backdrop-blur-md flex flex-col justify-between">
      <div>
        <h4 className="text-sm font-semibold text-zinc-100">Violation Breakdown</h4>
        <p className="text-xs text-zinc-400">Distribution of proctoring events flagged by telemetry</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
        {/* Left: SVG Donut */}
        <div className="relative w-[130px] h-[130px] flex items-center justify-center">
          {total === 0 ? (
            <div className="text-center text-xs text-zinc-500 font-mono">
              No Violations
            </div>
          ) : (
            <>
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#27272a" strokeWidth="4.5" />
                {(() => {
                  let accumulatedPercent = 0;
                  return items.map((item, idx) => {
                    const strokeDashArray = `${item.percentage} ${100 - item.percentage}`;
                    const strokeDashOffset = 100 - accumulatedPercent + 25; // +25 to start at top-center
                    accumulatedPercent += item.percentage;
                    const isHovered = hoveredSegment === item.key;

                    return (
                      <circle
                        key={item.key}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth={isHovered ? '6' : '4.5'}
                        strokeDasharray={strokeDashArray}
                        strokeDashoffset={strokeDashOffset}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredSegment(item.key)}
                        onMouseLeave={() => setHoveredSegment(null)}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-bold font-mono text-zinc-100">{total}</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">Events</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Legend */}
        <div className="flex-1 w-full space-y-2 text-xs">
          {items.length === 0 ? (
            <div className="text-zinc-500 font-mono italic text-center py-4">All assessments conducted in perfect integrity.</div>
          ) : (
            items.map(item => (
              <div 
                key={item.key} 
                className={`flex justify-between items-center p-1.5 rounded transition-colors ${hoveredSegment === item.key ? 'bg-zinc-800/40 text-zinc-100' : 'text-zinc-400'}`}
                onMouseEnter={() => setHoveredSegment(item.key)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="font-medium text-zinc-300">{item.name}</span>
                </div>
                <div className="flex gap-2 font-mono text-[11px]">
                  <span className="font-semibold text-zinc-200">{item.value}</span>
                  <span className="text-zinc-500">({Math.round(item.percentage)}%)</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
