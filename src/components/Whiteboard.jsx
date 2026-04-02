import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Pencil, 
  Square, 
  ArrowUpRight, 
  Hexagon, 
  Trash2, 
  Circle, 
  Type,
  MousePointer2,
  Undo2
} from 'lucide-react';

export const Whiteboard = ({ onClose, theme = 'dark' }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // 'pen', 'rectangle', 'square', 'octagon', 'arrow'
  const [color, setColor] = useState('#8b5cf6'); // MeetSpace Indigo
  const [inkStyle, setInkStyle] = useState('solid'); // 'solid', 'dashed', 'neon', 'thick'
  
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    // Set display size (css)
    const { width, height } = canvas.parentElement.getBoundingClientRect();
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Set actual resolution (taking device pixel ratio into account)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;
    
    // Initial board state
    if (theme === 'dark') {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    
    // Save initial state for history
    saveToHistory();
    
    // Resize handler
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
      img.onload = () => ctx.drawImage(img, 0, 0, newW, newH);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    setHistory(prev => [...prev.slice(-19), canvas.toDataURL()]);
  };

  const applyStyle = (ctx) => {
    ctx.strokeStyle = color;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.setLineDash([]);
    ctx.lineWidth = 2;

    if (inkStyle === 'thick') ctx.lineWidth = 6;
    if (inkStyle === 'dashed') ctx.setLineDash([10, 10]);
    if (inkStyle === 'neon') {
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.lineWidth = 3;
    }
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    
    if (tool === 'pen') {
      contextRef.current.beginPath();
      contextRef.current.moveTo(offsetX, offsetY);
      applyStyle(contextRef.current);
    } else {
      setStartPos({ x: offsetX, y: offsetY });
      // Store current state for preview
      const canvas = canvasRef.current;
      const previewSnapshot = canvas.toDataURL();
      canvas.dataset.snapshot = previewSnapshot;
    }
    
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = contextRef.current;
    const canvas = canvasRef.current;

    if (tool === 'pen') {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    } else {
      // CLEAR TO PREVIEW SNAPSHOT
      const img = new Image();
      img.src = canvas.dataset.snapshot;
      // We can't wait for onload here for 60fps drawing, so we use a buffer or accept small flicker
      // In a real app, I'd use two canvases (top/bottom), but for 1 file precision I'll use the clearRect+redraw strategy
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
    ctx.beginPath();
    const w = x2 - x1;
    const h = y2 - y1;

    switch (toolType) {
      case 'rectangle':
        ctx.strokeRect(x1, y1, w, h);
        break;
      case 'square':
        const side = Math.max(Math.abs(w), Math.abs(h));
        ctx.strokeRect(x1, y1, w > 0 ? side : -side, h > 0 ? side : -side);
        break;
      case 'octagon':
        drawOctagon(ctx, x1, y1, x2, y2);
        break;
      case 'arrow':
        drawArrow(ctx, x1, y1, x2, y2);
        break;
      default:
        break;
    }
    ctx.closePath();
  };

  const drawOctagon = (ctx, x1, y1, x2, y2) => {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const radiusX = Math.abs(x2 - x1) / 2;
    const radiusY = Math.abs(y2 - y1) / 2;
    
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const x = centerX + radiusX * Math.cos(angle);
      const y = centerY + radiusY * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  };

  const drawArrow = (ctx, x1, y1, x2, y2) => {
    const headlen = 15;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    const { width, height } = canvas.getBoundingClientRect();
    ctx.fillStyle = theme === 'dark' ? '#111827' : '#ffffff';
    ctx.fillRect(0, 0, width, height);
    saveToHistory();
  };

  const undo = () => {
    if (history.length <= 1) return;
    const prevStates = [...history];
    prevStates.pop(); // remove current
    const lastState = prevStates[prevStates.length - 1];
    
    const img = new Image();
    img.src = lastState;
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      setHistory(prevStates);
    };
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-950 rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative">
      
      {/* Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-gray-900/80 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
        
        <div className="flex gap-1 pr-4 border-r border-white/10">
          <ToolBtn active={tool === 'pen'} onClick={() => setTool('pen')} icon={<Pencil size={18} />} />
          <ToolBtn active={tool === 'rectangle'} onClick={() => setTool('rectangle')} icon={<Square size={18} />} />
          <ToolBtn active={tool === 'arrow'} onClick={() => setTool('arrow')} icon={<ArrowUpRight size={18} />} />
          <ToolBtn active={tool === 'octagon'} onClick={() => setTool('octagon')} icon={<Hexagon size={18} />} />
        </div>

        <div className="flex gap-2 px-4 border-r border-white/10">
          {['#ffffff', '#8b5cf6', '#10b981', '#f43f5e'].map(c => (
            <button 
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform hover:scale-125 ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="flex gap-1 px-4 border-r border-white/10">
          <StyleBtn active={inkStyle === 'solid'} onClick={() => setInkStyle('solid')} label="S" title="Solid" />
          <StyleBtn active={inkStyle === 'dashed'} onClick={() => setInkStyle('dashed')} label="D" title="Dashed" />
          <StyleBtn active={inkStyle === 'neon'} onClick={() => setInkStyle('neon')} label="N" title="Neon" />
          <StyleBtn active={inkStyle === 'thick'} onClick={() => setInkStyle('thick')} label="T" title="Thick" />
        </div>

        <div className="flex gap-1 pl-2">
          <ToolBtn onClick={undo} icon={<Undo2 size={18} />} />
          <ToolBtn onClick={clearCanvas} icon={<Trash2 size={18} className="text-red-400" />} />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-grow w-full h-full cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="block w-full h-full"
        />
      </div>

      <div className="absolute bottom-6 right-8 bg-indigo-500/20 px-4 py-2 rounded-xl border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest text-indigo-300 backdrop-blur-md">
        Whiteboard - Local Mode
      </div>
    </div>
  );
};

const ToolBtn = ({ active, onClick, icon }) => (
  <button 
    onClick={onClick}
    className={`p-2.5 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
  >
    {icon}
  </button>
);

const StyleBtn = ({ active, onClick, label, title }) => (
  <button 
    onClick={onClick}
    title={title}
    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${active ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'text-gray-500 hover:text-gray-300'}`}
  >
    {label}
  </button>
);
