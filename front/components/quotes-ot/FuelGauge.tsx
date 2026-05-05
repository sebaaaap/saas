"use client";

import React, { useRef, useCallback } from "react";

interface FuelGaugeProps {
    value: number; // 0-100
    onChange: (value: number) => void;
}

const LEVELS = [
    { pct: 0, label: "E", color: "#ef4444" },
    { pct: 12.5, label: "⅛", color: "#ef4444" },
    { pct: 25, label: "¼", color: "#f97316" },
    { pct: 50, label: "½", color: "#eab308" },
    { pct: 75, label: "¾", color: "#84cc16" },
    { pct: 100, label: "F", color: "#22c55e" },
];

export function FuelGauge({ value, onChange }: FuelGaugeProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    const angleFromValue = (v: number) => {
        // -135deg (E) to +135deg (F), total 270deg arc
        return -135 + (v / 100) * 270;
    };

    const needle = angleFromValue(value);

    const polarToXY = (angleDeg: number, radius: number, cx: number, cy: number) => {
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        return {
            x: cx + radius * Math.cos(rad),
            y: cy + radius * Math.sin(rad),
        };
    };

    const handleSvgClick = useCallback(
        (e: React.MouseEvent<SVGSVGElement>) => {
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height * 0.65;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
            if (angle < -135) angle += 360;
            // Clamp to arc range -135 to +135
            angle = Math.max(-135, Math.min(135, angle));
            const pct = Math.round(((angle + 135) / 270) * 100);
            onChange(pct);
        },
        [onChange]
    );

    const cx = 100, cy = 105, r = 75;

    // Arc path helper
    const describeArc = (startAngle: number, endAngle: number, radius: number) => {
        const s = polarToXY(startAngle, radius, cx, cy);
        const en = polarToXY(endAngle, radius, cx, cy);
        const large = endAngle - startAngle > 180 ? 1 : 0;
        return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${en.x} ${en.y}`;
    };

    const needleEnd = polarToXY(needle, r - 12, cx, cy);
    const needleBase1 = polarToXY(needle + 90, 6, cx, cy);
    const needleBase2 = polarToXY(needle - 90, 6, cx, cy);

    const fuelColor =
        value <= 12 ? "#ef4444" : value <= 30 ? "#f97316" : value <= 60 ? "#eab308" : "#22c55e";

    const currentLevel = LEVELS.reduce((prev, curr) =>
        Math.abs(curr.pct - value) < Math.abs(prev.pct - value) ? curr : prev
    );

    return (
        <div className="flex flex-col items-center gap-3">
            <svg
                ref={svgRef}
                viewBox="0 0 200 140"
                className="w-full max-w-[280px] cursor-pointer select-none"
                onClick={handleSvgClick}
            >
                {/* Track (grey full arc) */}
                <path
                    d={describeArc(-135, 135, r)}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="14"
                    strokeLinecap="round"
                />

                {/* Value arc (colored) */}
                {value > 0 && (
                    <path
                        d={describeArc(-135, -135 + (value / 100) * 270, r)}
                        fill="none"
                        stroke={fuelColor}
                        strokeWidth="14"
                        strokeLinecap="round"
                        style={{ transition: "all 0.3s ease" }}
                    />
                )}

                {/* Tick marks */}
                {LEVELS.map((lvl, i) => {
                    const a = -135 + (lvl.pct / 100) * 270;
                    const outer = polarToXY(a, r + 8, cx, cy);
                    const inner = polarToXY(a, r - 8, cx, cy);
                    const labelPos = polarToXY(a, r + 20, cx, cy);
                    return (
                        <g key={i}>
                            <line
                                x1={inner.x} y1={inner.y}
                                x2={outer.x} y2={outer.y}
                                stroke="#94a3b8" strokeWidth={i === 0 || i === LEVELS.length - 1 ? "2" : "1"}
                            />
                            <text
                                x={labelPos.x}
                                y={labelPos.y + 3}
                                textAnchor="middle"
                                fontSize="7"
                                fill="#64748b"
                                fontWeight={i === 0 || i === LEVELS.length - 1 ? "bold" : "normal"}
                            >
                                {lvl.label}
                            </text>
                        </g>
                    );
                })}

                {/* E / F labels */}
                <text x="22" y="108" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#ef4444">E</text>
                <text x="178" y="108" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#22c55e">F</text>

                {/* Needle */}
                <polygon
                    points={`${needleEnd.x},${needleEnd.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
                    fill={fuelColor}
                    style={{ transition: "all 0.3s ease" }}
                />
                <circle cx={cx} cy={cy} r="8" fill="#1e293b" />
                <circle cx={cx} cy={cy} r="4" fill="#f1f5f9" />

                {/* Fuel icon */}
                <text x={cx} y={cy + 22} textAnchor="middle" fontSize="14">⛽</text>
            </svg>

            {/* Level display */}
            <div className="flex items-center gap-4">
                <div
                    className="px-4 py-2 rounded-xl font-black text-white text-sm shadow-md transition-all"
                    style={{ backgroundColor: fuelColor }}
                >
                    {currentLevel.label} — {value}%
                </div>
            </div>

            {/* Quick buttons */}
            <div className="flex gap-2 flex-wrap justify-center">
                {LEVELS.map((lvl) => (
                    <button
                        key={lvl.pct}
                        onClick={() => onChange(lvl.pct)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:scale-105"
                        style={{
                            backgroundColor: value === lvl.pct ? lvl.color : "transparent",
                            borderColor: lvl.color,
                            color: value === lvl.pct ? "white" : lvl.color,
                        }}
                    >
                        {lvl.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
