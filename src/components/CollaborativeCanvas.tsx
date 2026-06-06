import React, { useEffect, useRef, useState } from 'react';
import { Download, Eraser, Trash2, Pencil } from 'lucide-react';
import clsx from 'clsx';

type Point = { x: number; y: number };
type Line = { points: Point[]; color: string; width: number };

export function CollaborativeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#EC4899'); // default pink
  const [width, setWidth] = useState(3);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const wsRef = useRef<WebSocket | null>(null);

  // Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/api/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init') {
          setLines(data.lines);
        } else if (data.type === 'draw') {
          setLines((prev) => [...prev, data.line]);
        } else if (data.type === 'clear') {
          setLines([]);
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // Update canvas on resize or lines change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We can handle resize in another effect, but for simplicity we rely on container
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 400;
    
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    lines.forEach((line) => {
      if (line.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      line.points.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.stroke();
    });
  }, [lines]);

  // Ensure canvas size updates when container resizes
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container || !canvasRef.current) return;
      // Triggers re-render which triggers the effect above
      setLines(l => [...l]);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const currentLineRef = useRef<Line | null>(null);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;

    setIsDrawing(true);
    const newLine = { 
      points: [point], 
      color: tool === 'eraser' ? '#1A1A24' : color, 
      width: tool === 'eraser' ? 20 : width 
    };
    currentLineRef.current = newLine;
    setLines((prev) => [...prev, newLine]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentLineRef.current) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;

    currentLineRef.current.points.push(point);
    
    // Replace the last line with updated points without copying the whole array optimally
    // but for simplicity in React:
    setLines((prev) => {
      const newLines = [...prev];
      newLines[newLines.length - 1] = currentLineRef.current!;
      return newLines;
    });
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentLineRef.current) return;
    setIsDrawing(false);
    
    // Send via websocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'draw', line: currentLineRef.current }));
    }
    currentLineRef.current = null;
  };

  const clearCanvas = () => {
    setLines([]);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'clear' }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1A1A24]/60 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-xl">
      <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#0D0D14] rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setTool('pencil')}
              className={clsx("p-2 rounded-md transition-colors", tool === 'pencil' ? "bg-white/10 text-white" : "text-gray-500 hover:text-white")}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={clsx("p-2 rounded-md transition-colors", tool === 'eraser' ? "bg-white/10 text-white" : "text-gray-500 hover:text-white")}
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-2" />
          
          <div className="flex items-center gap-2">
            {['#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#FFFFFF'].map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool('pencil'); }}
                className={clsx("w-6 h-6 rounded-full border-2 transition-transform", color === c && tool === 'pencil' ? "scale-110 border-white" : "border-transparent scale-90")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-2" />
          
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={width} 
            onChange={(e) => setWidth(parseInt(e.target.value))}
            className="w-24 accent-pink-500"
          />
        </div>
        
        <button 
          onClick={clearCanvas}
          className="text-gray-400 hover:text-red-400 p-2 rounded-md transition-colors hover:bg-white/5"
          title="Clear Canvas"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div 
        ref={containerRef} 
        className="flex-1 w-full relative touch-none cursor-crosshair bg-[#0D0D14]/80"
        style={{ minHeight: '400px' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          className="absolute inset-0 block w-full h-full"
        />
      </div>
    </div>
  );
}
