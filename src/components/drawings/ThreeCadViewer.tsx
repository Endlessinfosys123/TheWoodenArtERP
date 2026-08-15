'use client';

import React, { useRef, useEffect, useState } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Eye, Layers, Box } from 'lucide-react';

interface ThreeCadViewerProps {
  fileName: string;
  fileUrl?: string;
  height?: string;
}

export default function ThreeCadViewer({ fileName, height = '350px' }: ThreeCadViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [rotationX, setRotationX] = useState(25);
  const [rotationY, setRotationY] = useState(45);
  const [zoom, setZoom] = useState(1.2);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Draw 3D Isometric CAD Wireframe / Solid Flange Model on HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const width = canvas.parentElement?.clientWidth || 600;
    const heightPx = parseInt(height) || 350;
    canvas.width = width;
    canvas.height = heightPx;

    const cx = width / 2;
    const cy = heightPx / 2;

    ctx.clearRect(0, 0, width, heightPx);

    // Dark grid background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, heightPx);

    // Draw background grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 25;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, heightPx);
      ctx.stroke();
    }
    for (let y = 0; y < heightPx; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Transform 3D coordinates (x, y, z) to 2D screen coordinates
    const radX = (rotationX * Math.PI) / 180;
    const radY = (rotationY * Math.PI) / 180;

    const project = (x: number, y: number, z: number) => {
      // Rotate Y
      const x1 = x * Math.cos(radY) + z * Math.sin(radY);
      const z1 = -x * Math.sin(radY) + z * Math.cos(radY);
      // Rotate X
      const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = y * Math.sin(radX) + z1 * Math.cos(radX);

      const scale = zoom * 1.5;
      return {
        px: cx + x1 * scale,
        py: cy - y2 * scale,
        depth: z2,
      };
    };

    // Draw 3D Cylindrical Flange CAD Geometry
    const outerRadius = 80;
    const innerRadius = 35;
    const flangeHeight = 40;
    const boltCircleRadius = 60;
    const boltCount = 6;
    const segments = 32;

    // Outer Cylinder Top & Bottom Rings
    const topRing: { px: number; py: number }[] = [];
    const botRing: { px: number; py: number }[] = [];
    const topInnerRing: { px: number; py: number }[] = [];
    const botInnerRing: { px: number; py: number }[] = [];

    for (let i = 0; i <= segments; i++) {
      const theta = (i * 2 * Math.PI) / segments;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      topRing.push(project(outerRadius * cos, flangeHeight / 2, outerRadius * sin));
      botRing.push(project(outerRadius * cos, -flangeHeight / 2, outerRadius * sin));
      topInnerRing.push(project(innerRadius * cos, flangeHeight / 2, innerRadius * sin));
      botInnerRing.push(project(innerRadius * cos, -flangeHeight / 2, innerRadius * sin));
    }

    if (!wireframe) {
      // Solid shaded face fill
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;

      // Draw Top Face
      ctx.beginPath();
      topRing.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.px, pt.py);
        else ctx.lineTo(pt.px, pt.py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Outer Walls
      for (let i = 0; i < segments; i++) {
        ctx.beginPath();
        ctx.moveTo(topRing[i].px, topRing[i].py);
        ctx.lineTo(topRing[i + 1].px, topRing[i + 1].py);
        ctx.lineTo(botRing[i + 1].px, botRing[i + 1].py);
        ctx.lineTo(botRing[i].px, botRing[i].py);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? 'rgba(14, 165, 233, 0.2)' : 'rgba(2, 132, 199, 0.25)';
        ctx.fill();
        ctx.stroke();
      }
    } else {
      // Wireframe Mode
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;

      // Draw Outer Top Ring
      ctx.beginPath();
      topRing.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt.px, pt.py) : ctx.lineTo(pt.px, pt.py)));
      ctx.stroke();

      // Draw Outer Bottom Ring
      ctx.beginPath();
      botRing.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt.px, pt.py) : ctx.lineTo(pt.px, pt.py)));
      ctx.stroke();

      // Draw Inner Bore Rings
      ctx.strokeStyle = '#a855f7';
      ctx.beginPath();
      topInnerRing.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt.px, pt.py) : ctx.lineTo(pt.px, pt.py)));
      ctx.stroke();
      ctx.beginPath();
      botInnerRing.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt.px, pt.py) : ctx.lineTo(pt.px, pt.py)));
      ctx.stroke();

      // Vertical Struts
      ctx.strokeStyle = '#0284c7';
      for (let i = 0; i < segments; i += 4) {
        ctx.beginPath();
        ctx.moveTo(topRing[i].px, topRing[i].py);
        ctx.lineTo(botRing[i].px, botRing[i].py);
        ctx.stroke();
      }
    }

    // Draw Bolt Holes (6 PCD Holes)
    for (let b = 0; b < boltCount; b++) {
      const angle = (b * 2 * Math.PI) / boltCount;
      const bx = boltCircleRadius * Math.cos(angle);
      const bz = boltCircleRadius * Math.sin(angle);
      const boltPt = project(bx, flangeHeight / 2, bz);

      ctx.beginPath();
      ctx.arc(boltPt.px, boltPt.py, 5 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw Coordinate Axes Origin
    const origin = project(0, 0, 0);
    const xAxis = project(60, 0, 0);
    const yAxis = project(0, 60, 0);
    const zAxis = project(0, 0, 60);

    ctx.lineWidth = 2;
    // X Axis Red
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(origin.px, origin.py);
    ctx.lineTo(xAxis.px, xAxis.py);
    ctx.stroke();
    // Y Axis Green
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(origin.px, origin.py);
    ctx.lineTo(yAxis.px, yAxis.py);
    ctx.stroke();
    // Z Axis Blue
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(origin.px, origin.py);
    ctx.lineTo(zAxis.px, zAxis.py);
    ctx.stroke();

    // Axis Labels
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('X', xAxis.px + 4, xAxis.py);
    ctx.fillStyle = '#10b981';
    ctx.fillText('Y', yAxis.px + 4, yAxis.py);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Z', zAxis.px + 4, zAxis.py);

  }, [rotationX, rotationY, zoom, wireframe, height]);

  // Mouse Orbit Drag Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotationY(prev => prev + dx * 0.5);
    setRotationX(prev => prev - dy * 0.5);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-slate-950 flex flex-col group select-none">
      {/* CAD Toolbar Header */}
      <div className="px-4 py-2 bg-slate-900 border-b border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-cyan-400 font-mono font-semibold">
          <Box className="w-4 h-4" />
          <span className="truncate max-w-[200px] sm:max-w-xs">{fileName}</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
            3D CAD STEP/DXF
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition ${
              wireframe ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle Wireframe / Solid View"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{wireframe ? 'Wireframe' : 'Solid'}</span>
          </button>
          <button
            onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setRotationX(25);
              setRotationY(45);
              setZoom(1.2);
            }}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
            title="Reset View"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Canvas Area */}
      <div 
        className="cursor-grab active:cursor-grabbing relative flex-1 flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Orbit Drag Instruction Overlay */}
        <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 pointer-events-none">
          Click & Drag to Rotate Orbit | Scroll/Buttons to Zoom
        </div>
        <div className="absolute top-2 right-3 text-[10px] font-mono text-cyan-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 pointer-events-none">
          RotX: {Math.round(rotationX)}° | RotY: {Math.round(rotationY)}°
        </div>
      </div>
    </div>
  );
}
