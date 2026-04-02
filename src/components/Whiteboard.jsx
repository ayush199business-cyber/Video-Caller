import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  MousePointer2, 
  Pencil, 
  PenLine, 
  Highlighter, 
  Square, 
  RectangleHorizontal, 
  Circle, 
  Hexagon, 
  Minus, 
  ArrowUpRight, 
  Eraser, 
  Type,
  Undo2,
  Redo2,
  Trash2,
  MoreHorizontal,
  Grid,
  Plus,
  ChevronDown,
  Search
} from 'lucide-react';

export const Whiteboard = ({ onClose, theme = 'dark' }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#8b5cf6'); // Default Indigo
  const [inkStyle, setInkStyle] = useState('solid'); 
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [background, setBackground] = useState('white'); // 'white', 'grid', 'dot'
  
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const { width, height } = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;
    
    drawBackground();
    saveToHistory();

    const handleResize = () => {
      const currentImage = canvas.toDataURL();
      const { width: newW, height: newH } = canvas.parentElement.getBoundingClientRect();
      canvas.style.width = `${newW}px`;
      canvas.style.height = `${newH}px`;
      canvas.width = newW * dpr;
      canvas.height = newH * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const img = new Image();
      img.src = currentImage;
      img.onload = () => {
        drawBackground(); // redraw background first
        ctx.drawImage(img, 0, 0, newW, newH);
      };
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [background]);

  const drawBackground = () => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    const { width, height } = canvas.getBoundingClientRect();
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    if (background === 'grid') {
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      const step = 30;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
    } else if (background === 'dot') {
      ctx.fillStyle = '#e0e0e0';
      const step = 20;
      for (let x = 0; x < width; x += step) {
        for (let y = 0; y < height; y += step) {
          ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    setHistory(prev => [...prev.slice(-19), canvas.toDataURL()]);
    setRedoStack([]);
  };

  const applyStyle = (ctx) => {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.lineWidth = strokeWidth;
    ctx.shadowBlur = 0;

    if (tool === 'marker') ctx.globalAlpha = 0.5;
    if (tool === 'highlighter') {
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = strokeWidth * 3;
    }
    
    if (inkStyle === 'dashed') ctx.setLineDash([10, 10]);
    if (inkStyle === 'neon') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
    }
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    
    if (['pen', 'marker', 'highlighter'].includes(tool)) {
      contextRef.current.beginPath();
      contextRef.current.moveTo(offsetX, offsetY);
      applyStyle(contextRef.current);
    } else {
      setStartPos({ x: offsetX, y: offsetY });
      const canvas = canvasRef.current;
      canvas.dataset.snapshot = canvas.toDataURL();
    }
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = contextRef.current;
    const canvas = canvasRef.current;

    if (['pen', 'marker', 'highlighter'].includes(tool)) {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    } else {
      const img = new Image();
      img.src = canvas.dataset.snapshot;
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      applyStyle(ctx);
      drawShape(ctx, startPos.x, startPos.y, offsetX, offsetY, tool);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    saveToHistory();
  };

  const drawShape = (ctx, x1, y1, x2, y2, toolType) => {
    const w = x2 - x1;
    const h = y2 - y1;
    ctx.beginPath();
    switch (toolType) {
      case 'rectangle': ctx.strokeRect(x1, y1, w, h); break;
      case 'square': 
        const side = Math.max(Math.abs(w), Math.abs(h));
        ctx.strokeRect(x1, y1, w > 0 ? side : -side, h > 0 ? side : -side);
        break;
      case 'circle':
        const r = Math.sqrt(w*w + h*h);
        ctx.arc(x1, y1, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'octagon': drawOctagon(ctx, x1, y1, x2, y2); break;
      case 'line': ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); break;
      case 'arrow': drawArrow(ctx, x1, y1, x2, y2); break;
      case 'eraser': eraser(ctx, x2, y2); break;
    }
  };

  const drawOctagon = (ctx, x1, y1, x2, y2) => {
    const cx = (x1+x2)/2; const cy = (y1+y2)/2;
    const rx = Math.abs(x2-x1)/2; const ry = Math.abs(y2-y1)/2;
    for(let i=0; i<8; i++) {
      const a = (i * Math.PI)/4;
      const x = cx + rx * Math.cos(a);
      const y = cy + ry * Math.sin(a);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath(); ctx.stroke();
  };

  const drawArrow = (ctx, x1, y1, x2, y2) => {
    const headlen = 15; const a = Math.atan2(y2-y1, x2-x1);
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
    ctx.lineTo(x2 - headlen * Math.cos(a - Math.PI/6), y2 - headlen * Math.sin(a - Math.PI/6));
    ctx.moveTo(x2,y2); 
    ctx.lineTo(x2 - headlen * Math.cos(a + Math.PI/6), y2 - headlen * Math.sin(a + Math.PI/6));
    ctx.stroke();
  };

  const eraser = (ctx, x, y) => {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const undo = () => {
    if (history.length <= 1) return;
    const current = history.pop();
    setRedoStack(prev => [current, ...prev]);
    const prev = history[history.length - 1];
    restoreState(prev);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack.shift();
    setHistory(prev => [...prev, next]);
    restoreState(next);
  };

  const restoreState = (dataUrl) => {
    const img = new Image(); img.src = dataUrl;
    img.onload = () => {
      const { width, height } = canvasRef.current.getBoundingClientRect();
      contextRef.current.clearRect(0,0,width,height);
      contextRef.current.drawImage(img, 0, 0, width, height);
    };
  };

  const clearAll = () => {
    if (window.confirm('Clear all drawings?')) {
      drawBackground();
      saveToHistory();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f8f9fa] overflow-hidden relative">
      
      {/* Top Style Bar */}
      <div className="h-16 w-full flex items-center justify-between px-6 bg-white border-b border-gray-200 z-30 shadow-sm">
        <div className="flex items-center gap-10">
          <StyleGroup label="Ink Style">
            <div className="flex gap-1.5 p-1 bg-gray-100 rounded-lg">
              <InkStyleBtn active={inkStyle === 'solid'} onClick={() => setInkStyle('solid')} icon={<SolidLine />} />
              <InkStyleBtn active={inkStyle === 'dashed'} onClick={() => setInkStyle('dashed')} icon={<DashedLine />} />
              <InkStyleBtn active={inkStyle === 'neon'} onClick={() => setInkStyle('neon')} icon={<NeonLine />} />
            </div>
          </StyleGroup>

          <StyleGroup label="Color">
            <div className="flex gap-2">
              {['#000000', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444', '#f59e0b'].map(c => (
                <button 
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-indigo-500 scale-110 shadow-lg' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <button className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-gray-600">
                <Plus size={14} />
              </button>
            </div>
          </StyleGroup>

          <StyleGroup label="Stroke Width">
            <div className="flex items-center gap-3 bg-gray-100 p-1.5 rounded-lg">
              {[2, 3, 4, 6].map(w => (
                <button 
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all ${strokeWidth === w ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {w}
                </button>
              ))}
            </div>
          </StyleGroup>
        </div>

        <div className="flex items-center gap-6">
          <StyleGroup label="Background">
            <div className="flex gap-2">
              <button onClick={() => setBackground('white')} className={`w-8 h-8 rounded border transition-all ${background === 'white' ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/10' : 'border-gray-200 bg-white hover:border-gray-300'}`} />
              <button onClick={() => setBackground('grid')} className={`w-8 h-8 rounded border transition-all flex items-center justify-center ${background === 'grid' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <Grid size={16} className="text-gray-400" />
              </button>
            </div>
          </StyleGroup>
          <div className="h-8 w-px bg-gray-200 mx-2" />
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <span>100%</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button className="w-6 h-6 flex items-center justify-center hover:text-gray-900"><Minus size={14} /></button>
              <button className="w-6 h-6 flex items-center justify-center hover:text-gray-900"><Plus size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow flex relative">
        {/* Left Toolbar */}
        <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-6 z-30 shadow-lg">
          <div className="flex flex-col gap-2">
            <SidebarBtn active={tool === 'select'} onClick={() => setTool('select')} icon={<MousePointer2 size={20} />} label="Select" />
            <SidebarBtn active={tool === 'pen'} onClick={() => setTool('pen')} icon={<Pencil size={20} />} label="Pen" />
            <SidebarBtn active={tool === 'marker'} onClick={() => setTool('marker')} icon={<PenLine size={20} />} label="Marker" />
            <SidebarBtn active={tool === 'highlighter'} onClick={() => setTool('highlighter')} icon={<Highlighter size={20} />} label="Highlight" />
          </div>

          <div className="w-10 h-px bg-gray-100" />

          <div className="flex flex-col gap-2">
            <SidebarBtn active={tool === 'rectangle'} onClick={() => setTool('rectangle')} icon={<RectangleHorizontal size={18} />} label="Rect" />
            <SidebarBtn active={tool === 'square'} onClick={() => setTool('square')} icon={<Square size={18} />} label="Square" />
            <SidebarBtn active={tool === 'circle'} onClick={() => setTool('circle')} icon={<Circle size={18} />} label="Circle" />
            <SidebarBtn active={tool === 'octagon'} onClick={() => setTool('octagon')} icon={<Hexagon size={18} />} label="Octagon" />
            <SidebarBtn active={tool === 'line'} onClick={() => setTool('line')} icon={<Minus size={18} />} label="Line" />
            <SidebarBtn active={tool === 'arrow'} onClick={() => setTool('arrow')} icon={<ArrowUpRight size={18} />} label="Arrow" />
          </div>

          <div className="w-10 h-px bg-gray-100" />

          <div className="flex flex-col gap-2">
            <SidebarBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={20} />} label="Eraser" />
            <SidebarBtn active={tool === 'text'} onClick={() => setTool('text')} icon={<Type size={20} />} label="Text" />
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <SidebarBtn onClick={undo} icon={<Undo2 size={18} />} label="Undo" />
            <SidebarBtn onClick={redo} icon={<Redo2 size={18} />} label="Redo" />
            <SidebarBtn onClick={clearAll} icon={<Trash2 size={18} className="text-red-500" />} label="Clear All" />
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-grow relative bg-[#f1f3f5] p-6 overflow-hidden">
          <div className="w-full h-full bg-white rounded-xl shadow-inner-lg border border-gray-200 overflow-hidden relative">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="block w-full h-full cursor-crosshair"
            />
          </div>
          
          {/* Mini Preview or Zoom indicator */}
          <div className="absolute bottom-10 right-10 flex items-center gap-3 bg-gray-900/90 text-white px-4 py-2 rounded-full border border-white/10 shadow-2xl backdrop-blur-xl">
             <Search size={16} className="text-gray-400" />
             <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="w-1/3 h-full bg-indigo-500"></div>
             </div>
             <Search size={16} className="text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

const StyleGroup = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{label}</span>
    {children}
  </div>
);

const SidebarBtn = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-xl transition-all group relative ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-110' : 'text-gray-400 hover:bg-gray-50 hover:text-indigo-600 hover:scale-105'}`}
  >
    {icon}
    <span className={`text-[8px] font-bold uppercase transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{label}</span>
  </button>
);

const InkStyleBtn = ({ active, onClick, icon }) => (
  <button 
    onClick={onClick}
    className={`w-9 h-7 flex items-center justify-center rounded-md transition-all ${active ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-indigo-600'}`}
  >
    {icon}
  </button>
);

const SolidLine = () => <div className="w-5 h-0.5 bg-current rounded-full" />;
const DashedLine = () => <div className="w-5 flex gap-0.5"><div className="w-1.5 h-0.5 bg-current rounded-full" /><div className="w-1.5 h-0.5 bg-current rounded-full" /><div className="w-1.5 h-0.5 bg-current rounded-full" /></div>;
const NeonLine = () => <div className="w-5 h-0.5 bg-current rounded-full shadow-[0_0_5px_currentColor]" />;
