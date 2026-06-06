import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, Plus } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewerProps {
  fileUrl: string;
  httpHeaders?: Record<string, string>;
  onSaveHighlight: (text: string) => void;
}

export function PdfPreviewer({ fileUrl, httpHeaders, onSaveHighlight }: PdfPreviewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [selectedText, setSelectedText] = useState<string>('');
  const [popoverPos, setPopoverPos] = useState<{ x: number, y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== '') {
      const text = selection.toString().trim();
      setSelectedText(text);
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Calculate position relative to container
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          setPopoverPos({
            x: rect.left - containerRect.left + (rect.width / 2),
            y: rect.top - containerRect.top - 40 // 40px above selection
          });
        }
      }
    } else {
      setSelectedText('');
      setPopoverPos(null);
    }
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.getSelection()?.removeAllRanges();
    if (selectedText) {
      onSaveHighlight(selectedText);
      setSelectedText('');
      setPopoverPos(null);
    }
  };

  return (
    <div className="flex flex-col items-center relative w-full h-full" ref={containerRef}>
      {popoverPos && (
        <div 
          className="absolute z-50 transform -translate-x-1/2 flex items-center bg-gray-900 border border-white/20 text-white rounded-lg shadow-xl px-3 py-2 animate-in fade-in zoom-in-95"
          style={{ left: popoverPos.x, top: Math.max(popoverPos.y, 0) }}
        >
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 text-sm font-bold hover:text-pink-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Save Highlight
          </button>
        </div>
      )}

      <Document
        file={{ url: fileUrl, httpHeaders } as any}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<Loader2 className="animate-spin text-pink-400 my-10 w-8 h-8" />}
        error={
          <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20 text-sm font-bold text-center">
            Failed to load PDF. It might be invalid or not accessible.
          </div>
        }
      >
        <Page 
          pageNumber={pageNumber} 
          renderTextLayer={true} 
          renderAnnotationLayer={true}
          className="max-w-full"
        />
      </Document>
      
      {numPages && numPages > 1 && (
        <div className="flex items-center gap-4 mt-6 text-white bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md sticky bottom-4 z-40">
          <button 
            disabled={pageNumber <= 1} 
            onClick={() => setPageNumber(p => p - 1)}
            className="hover:text-pink-400 disabled:opacity-30 disabled:hover:text-white transition-colors text-sm font-bold"
          >
            Prev
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Page {pageNumber} of {numPages}</span>
          <button 
            disabled={pageNumber >= numPages} 
            onClick={() => setPageNumber(p => p + 1)}
            className="hover:text-pink-400 disabled:opacity-30 disabled:hover:text-white transition-colors text-sm font-bold"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
