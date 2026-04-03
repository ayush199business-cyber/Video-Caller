import React, { useRef, useEffect, useState } from 'react';
import { 
  MousePointer2, 
  Pencil, 
  Square, 
  Circle, 
  Eraser, 
  Undo2,
  Redo2,
  Trash2,
  Grid,
  Plus,
  Search,
  Minus
} from 'lucide-react';

export const Whiteboard = ({ onClose, theme = 'dark', isStandalone, onElementsUpdate, remoteElements = {}, isMobile }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [tool, setTool] = useState('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#8b5cf6');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [inkStyle, setInkStyle] = useState('solid');
  const [background, setBackground] = useState('white');
  
  const [selectedElement, setSelectedElement] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const { width, height } = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;
    
    render();

    const handleResize = () => {
      const { width: newW, height: newH } = parent.getBoundingClientRect();
      canvas.width = newW * dpr;
      canvas.height = newH * dpr;
      canvas.style.width = `${newW}px`;
      canvas.style.height = `${newH}px`;
      ctx.scale(dpr, dpr);
      render();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    render();
  }, [elements, remoteElements, background]);

  const render = () => {
    if (!contextRef.current) return;
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    
    ctx.clearRect(0, 0, width, height);
    drawBackground(ctx, width, height);

    // Merge local and remote
    const all = [...elements];
    Object.values(remoteElements).forEach(peerElements => {
      if (Array.isArray(peerElements)) all.push(...peerElements);
    });

    all.forEach(el => drawElement(ctx, el));
  };

  const drawBackground = (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    if (background === 'grid') {
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      for (let x=0; x<w; x+=30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
      for (let y=0; y<h; y+=30) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    } else if (background === 'dot') {
      ctx.fillStyle = '#e0e0e0';
      for (let x=0; x<w; x+=20) { for (let y=0; y<h; y+=20) { ctx.beginPath(); ctx.arc(x,y,1,0,Math.PI*2); ctx.fill(); }}
    }
  };

  const drawElement = (ctx, el) => {
    if (!el) return;
    ctx.save();
    ctx.strokeStyle = el.color;
    ctx.lineWidth = el.strokeWidth;
    ctx.globalAlpha = el.tool === 'marker' ? 0.5 : (el.tool === 'highlighter' ? 0.3 : 1);
    if (el.inkStyle === 'dashed') ctx.setLineDash([10, 10]);
    if (el.inkStyle === 'neon') { ctx.shadowBlur = 10; ctx.shadowColor = el.color; }

    if (['pen', 'marker', 'highlighter'].includes(el.tool)) {
      ctx.beginPath();
      if (el.points && el.points.length > 0) {
        el.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
      }
      ctx.stroke();
    } else if (el.tool === 'rectangle') {
      ctx.strokeRect(el.x, el.y, el.w, el.h);
    } else if (el.tool === 'square') {
      const s = Math.max(Math.abs(el.w), Math.abs(el.h));
      ctx.strokeRect(el.x, el.y, el.w > 0 ? s : -s, el.h > 0 ? s : -s);
    } else if (el.tool === 'circle') {
      ctx.beginPath();
      const r = Math.sqrt(el.w**2 + el.h**2);
      ctx.arc(el.x, el.y, r, 0, Math.PI*2);
      ctx.stroke();
    } else if (el.tool === 'line') {
      ctx.beginPath(); ctx.moveTo(el.x, el.y); ctx.lineTo(el.x + el.w, el.y + el.h); ctx.stroke();
    }
    ctx.restore();
  };

  const startDrawing = (e) => {
    if (isMobile) return;
    const { offsetX: x, offsetY: y } = e.nativeEvent;
    
    if (tool === 'select') {
      const found = [...elements].reverse().find(el => isPointInElement(x, y, el));
      if (found) {
        setSelectedElement(found);
        setDragOffset({ x: x - (found.x !== undefined ? found.x : found.points[0].x), y: y - (found.y !== undefined ? found.y : found.points[0].y) });
      } else {
        setSelectedElement(null);
      }
      return;
    }

    if (tool === 'eraser') {
      const remaining = elements.filter(el => !isPointInElement(x, y, el));
      if (remaining.length !== elements.length) updateElements(remaining);
      return;
    }

    setIsDrawing(true);
    const newEl = {
      id: crypto.randomUUID(),
      tool, color, strokeWidth, inkStyle,
      x, y, w: 0, h: 0,
      points: [{ x, y }]
    };
    setElements(prev => [...prev, newEl]);
  };

  const draw = (e) => {
    if (!isDrawing && !selectedElement) return;
    const { offsetX: x, offsetY: y } = e.nativeEvent;

    if (tool === 'select' && selectedElement) {
      setElements(prev => prev.map(el => {
        if (el.id === selectedElement.id) {
          if (el.points) {
            const dx = x - dragOffset.x - el.points[0].x;
            const dy = y - dragOffset.y - el.points[0].y;
            return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
          }
          return { ...el, x: x - dragOffset.x, y: y - dragOffset.y };
        }
        return el;
      }));
      return;
    }

    if (isDrawing) {
      setElements(prev => {
        const last = prev[prev.length - 1];
        if (['pen', 'marker', 'highlighter'].includes(tool)) {
          return [...prev.slice(0, -1), { ...last, points: [...last.points, { x, y }] }];
        }
        return [...prev.slice(0, -1), { ...last, w: x - last.x, h: y - last.y }];
      });
    }
  };

  const stopDrawing = () => {
    if (isDrawing || selectedElement) {
      setIsDrawing(false);
      setSelectedElement(null);
      updateElements(elements);
    }
  };

  const updateElements = (newElements) => {
    setElements(newElements);
    if (onElementsUpdate) onElementsUpdate(newElements);
    // history
    const nextIdx = historyIndex + 1;
    setHistory(prev => [...prev.slice(0, nextIdx), newElements]);
    setHistoryIndex(nextIdx);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setElements(history[idx]);
      if (onElementsUpdate) onElementsUpdate(history[idx]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setElements(history[idx]);
      if (onElementsUpdate) onElementsUpdate(history[idx]);
    }
  };

  const isPointInElement = (x, y, el) => {
    if (['pen', 'marker', 'highlighter'].includes(el.tool)) {
      return el.points.some(p => Math.abs(p.x - x) < 5 && Math.abs(p.y - y) < 5);
    }
    if (el.tool === 'rectangle' || el.tool === 'square') {
      const left = Math.min(el.x, el.x + el.w);
      const right = Math.max(el.x, el.x + el.w);
      const top = Math.min(el.y, el.y + el.h);
      const bottom = Math.max(el.y, el.y + el.h);
      return x >= left && x <= right && y >= top && y <= bottom;
    }
    if (el.tool === 'circle') {
      const r = Math.sqrt(el.w**2 + el.h**2);
      const d = Math.sqrt((el.x - x)**2 + (el.y - y)**2);
      return d <= r;
    }
    return false;
  };

  const clearAll = () => { if (window.confirm('Clear all?')) updateElements([]); };

  return (
    <div className="w-full h-full flex flex-col bg-[#f8f9fa] overflow-hidden relative">
      <div className="h-16 w-full flex items-center justify-between px-6 bg-white border-b border-gray-200 z-30 shadow-sm">
        <div className="flex items-center gap-10">
          {!isMobile && (
            <>
              <StyleGroup label="Ink">
                <div className="flex gap-1.5 p-1 bg-gray-100 rounded-lg">
                  <button onClick={() => setInkStyle('solid')} className={`px-2 py-1 text-[10px] font-bold rounded ${inkStyle === 'solid' ? 'bg-white shadow-sm' : ''}`}>Solid</button>
                  <button onClick={() => setInkStyle('dashed')} className={`px-2 py-1 text-[10px] font-bold rounded ${inkStyle === 'dashed' ? 'bg-white shadow-sm' : ''}`}>Dash</button>
                </div>
              </StyleGroup>
              <StyleGroup label="Color">
                <div className="flex gap-2">
                  {['#000000', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444'].map(c => (
                    <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-indigo-500 scale-110' : 'border-transparent'}`} style={{ background: c }} />
                  ))}
                </div>
              </StyleGroup>
            </>
          )}
          {isMobile && <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">View Mode Active</span>}
        </div>
        <div className="flex gap-4">
          <button onClick={() => setBackground(background === 'grid' ? 'white' : 'grid')} className={`w-10 h-8 rounded border flex items-center justify-center transition-all ${background === 'grid' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
            <Grid size={16} className={background === 'grid' ? 'text-indigo-600' : 'text-gray-400'} />
          </button>
        </div>
      </div>

      <div className="flex-grow flex relative">
        {!isMobile && (
          <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-4 z-30 shadow-lg">
            <SidebarBtn active={tool === 'select'} onClick={() => setTool('select')} icon={<MousePointer2 size={20} />} label="Pick" />
            <SidebarBtn active={tool === 'pen'} onClick={() => setTool('pen')} icon={<Pencil size={20} />} label="Draw" />
            <SidebarBtn active={tool === 'rectangle'} onClick={() => setTool('rectangle')} icon={<Square size={18} />} label="Rect" />
            <SidebarBtn active={tool === 'circle'} onClick={() => setTool('circle')} icon={<Circle size={18} />} label="Circle" />
            <SidebarBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={20} />} label="Eraser" />
            <div className="mt-auto flex flex-col gap-2">
              <SidebarBtn onClick={undo} icon={<Undo2 size={18} />} />
              <SidebarBtn onClick={redo} icon={<Redo2 size={18} />} />
              <SidebarBtn onClick={clearAll} icon={<Trash2 size={18} className="text-red-500" />} />
            </div>
          </div>
        )}

        <div className="flex-grow relative bg-[#f1f3f5] p-2 sm:p-6 overflow-hidden">
          <div className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-200 relative overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className={`block w-full h-full ${isMobile ? 'cursor-default' : 'cursor-crosshair'}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const StyleGroup = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    {children}
  </div>
);

const SidebarBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
    {icon}
    {label && <span className="text-[8px] font-bold uppercase">{label}</span>}
  </button>
);
