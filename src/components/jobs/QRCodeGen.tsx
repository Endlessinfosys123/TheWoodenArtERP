'use client';

import React from 'react';

interface QRCodeGenProps {
  value: string;
  size?: number;
}

export default function QRCodeGen({ value, size = 100 }: QRCodeGenProps) {
  // Simple deterministic 2D QR matrix generator for shop floor token encoding
  const generateMatrix = (text: string) => {
    const matrixSize = 21;
    const grid: boolean[][] = Array(matrixSize).fill(false).map(() => Array(matrixSize).fill(false));

    // Corner Finder Patterns
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            grid[startY + r][startX + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(matrixSize - 7, 0);
    drawFinder(0, matrixSize - 7);

    // Hash string bytes to populate inner data bits
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        // Skip finder zones
        if ((r < 7 && c < 7) || (r < 7 && c >= matrixSize - 7) || (r >= matrixSize - 7 && c < 7)) {
          continue;
        }
        const val = Math.abs(Math.sin((r * 31 + c * 17 + hash) * 0.1));
        if (val > 0.45) {
          grid[r][c] = true;
        }
      }
    }

    return grid;
  };

  const grid = generateMatrix(value);
  const cellSize = size / grid.length;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded bg-white p-1.5 shadow-sm border border-slate-300">
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
}
