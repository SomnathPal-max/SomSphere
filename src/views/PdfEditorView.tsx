import React, { useState, useRef, useEffect } from "react";
import { Camera, Image as ImageIcon, Trash2, ArrowUp, ArrowDown, Download, FileText, Loader2, Plus, X, LogIn, Sparkles, AlertCircle, CheckCircle, QrCode, Link as LinkIcon, Upload, Eye, EyeOff, Lock, Scissors } from "lucide-react";
import { useToast } from "../ToastContext";
import { useNotifications } from "../NotificationsContext";
import jsPDF from "jspdf";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { initAuth, googleSignIn, getAccessToken } from "../firebase";
import type { User } from "firebase/auth";
import jsQR from "jsqr";
import { PdfPreviewer } from "../components/PdfPreviewer";
import { createItem } from "../api";

export function PdfEditorView() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { addNotification } = useNotifications();
  const [images, setImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // PDF conversion progress tracking states
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionStep, setConversionStep] = useState("");
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);
  const [generatedPdfName, setGeneratedPdfName] = useState("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  
  // PDF Preview states
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<'pdf' | 'pages'>('pdf');
  const [editingPdfName, setEditingPdfName] = useState("");
  const [customFilenamePattern, setCustomFilenamePattern] = useState("document_[DATE]_[TIME]");
  const [compressPdf, setCompressPdf] = useState(false);
  const [pdfQuality, setPdfQuality] = useState(0.8);
  const [pdfMetadataTitle, setPdfMetadataTitle] = useState("");
  const [pdfMetadataAuthor, setPdfMetadataAuthor] = useState("");
  const [pdfMetadataKeywords, setPdfMetadataKeywords] = useState("");
  const [pdfPassword, setPdfPassword] = useState("");
  const [pdfPasswordEnabled, setPdfPasswordEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Recent Conversions History list state
  const [recentConversions, setRecentConversions] = useState<any[]>(() => {
    const saved = localStorage.getItem("somsphere_pdf_history");
    if (saved) {
      try {
        // Clear active blobUrl references because Blobs expire on page refresh,
        // but keep metadata lists active for seamless reference logging.
        return JSON.parse(saved).map((item: any) => ({ ...item, blobUrl: "" }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  // Selection set for merging conversions
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());

  // Watermark States
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL WORKSPACE");
  const [watermarkColor, setWatermarkColor] = useState("#ec4899");
  const [watermarkFontSize, setWatermarkFontSize] = useState(40);
  const [watermarkAngle, setWatermarkAngle] = useState(-45);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.2);

  // AI tag suggestions state
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
  const [isAiTaggingLoading, setIsAiTaggingLoading] = useState(false);

  // Synchronize history lists to client-side disk storage safely
  useEffect(() => {
    const serialized = recentConversions.map(c => ({
      ...c,
      blobUrl: "" // Exclude expired local session URLs from persisting to avoid disk bloat
    }));
    localStorage.setItem("somsphere_pdf_history", JSON.stringify(serialized));
  }, [recentConversions]);

  // PDF split ranges state (e.g. "1-2, 3-4")
  const [splitRangesInput, setSplitRangesInput] = useState("");
  const [isSplitting, setIsSplitting] = useState(false);

  // Optical Character Recognition (OCR) states
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrTextResult, setOcrTextResult] = useState("");
  const [ocrTargetIndex, setOcrTargetIndex] = useState<number | null>(null);
  
  // Drag & Drop states
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Batch Camera Capture states & refs
  const [isBatchCameraOpen, setIsBatchCameraOpen] = useState(false);
  const [capturedBatchImages, setCapturedBatchImages] = useState<string[]>([]);
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);
  const batchVideoRef = useRef<HTMLVideoElement | null>(null);
  const batchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const batchStreamRef = useRef<MediaStream | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // QR Code Scanner states & refs
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [detectedQrValue, setDetectedQrValue] = useState<string | null>(null);
  const [isProcessingQrLink, setIsProcessingQrLink] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrImageInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup QR stream and Batch stream on component unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (batchStreamRef.current) {
        batchStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Start webcam QR code scanner
  const handleStartQrScanner = async () => {
    setDetectedQrValue(null);
    setIsQrModalOpen(true);
    
    // Tiny timeout to let the DOM modal render securely
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play();
        }
        animationFrameRef.current = requestAnimationFrame(scanQrFrame);
      } catch (err: any) {
        console.error("Camera access failed or user rejected permission:", err);
        showToast("Webcam stream is blocked or unavailable. You can upload a QR image instead!", "info");
      }
    }, 300);
  };

  // Stop webcam QR code scanner
  const handleStopQrScanner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setDetectedQrValue(null);
    setIsQrModalOpen(false);
  };

  // QR code scanning tick frame
  const scanQrFrame = () => {
    if (!videoRef.current || !canvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanQrFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
          });
          
          if (code && code.data) {
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
            setDetectedQrValue(code.data);
            // Lock/pause loop until reviewed/confirmed
            return;
          }
        } catch (e) {
          console.error("QR parse error:", e);
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanQrFrame);
  };

  // Scan from an uploaded image file
  const handleQrImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    if (!file.type.startsWith("image/")) {
      showToast("Uploaded file must be a valid image format.", "error");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            setDetectedQrValue(code.data);
            showToast("Successfully decoded QR link from photo!", "success");
          } else {
            showToast("Could not recognize a valid QR code in this image.", "error");
          }
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop files handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Start batch camera session
  const handleStartBatchCameraCapture = async () => {
    setCapturedBatchImages([]);
    setIsBatchCameraOpen(true);
    
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        batchStreamRef.current = stream;
        if (batchVideoRef.current) {
          batchVideoRef.current.srcObject = stream;
          batchVideoRef.current.setAttribute("playsinline", "true");
          batchVideoRef.current.play();
        }
      } catch (err: any) {
        console.error("Camera access failed:", err);
        showToast("Webcam stream is blocked or unavailable. Opening native device camera...", "info");
        setIsBatchCameraOpen(false);
        // Fallback to triggering native camera picker
        cameraInputRef.current?.click();
      }
    }, 300);
  };

  // Stop batch camera session
  const handleStopBatchCameraCapture = () => {
    if (batchStreamRef.current) {
      batchStreamRef.current.getTracks().forEach((track) => track.stop());
      batchStreamRef.current = null;
    }
    if (batchVideoRef.current) {
      batchVideoRef.current.srcObject = null;
    }
    setCapturedBatchImages([]);
    setIsBatchCameraOpen(false);
  };

  // Snaps the current video stream frame to local list
  const captureBatchPhoto = () => {
    if (!batchVideoRef.current || !batchCanvasRef.current) return;
    
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 200);
    
    if (navigator.vibrate) {
      navigator.vibrate(60);
    }

    const video = batchVideoRef.current;
    const canvas = batchCanvasRef.current;
    
    if (video.readyState >= 2) { // HAVE_CURRENT_DATA
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedBatchImages(prev => [...prev, dataUrl]);
        showToast(`Captured Page ${capturedBatchImages.length + 1}!`, "success");
      }
    } else {
      showToast("Video stream not fully loaded yet. Wait a second and try again.", "info");
    }
  };

  // Discards an captured image inside batch modal
  const removeCapturedBatchImage = (index: number) => {
    setCapturedBatchImages(prev => prev.filter((_, i) => i !== index));
    showToast("Discarded page from batch capture list.", "info");
  };

  // Commits batch captured images to main images list
  const handleCommitBatchImages = () => {
    if (capturedBatchImages.length === 0) {
      handleStopBatchCameraCapture();
      return;
    }
    setImages(prev => [...prev, ...capturedBatchImages]);
    showToast(`Added ${capturedBatchImages.length} captured page(s) to PDF workspace!`, "success");
    handleStopBatchCameraCapture();
  };

  // Safe wrapper to convert and append a scanned document link to the file conversion queue
  const handleProcessScannedQr = () => {
    if (!detectedQrValue) return;
    setIsProcessingQrLink(true);

    const link = detectedQrValue.trim();
    const isUrl = /^https?:\/\//i.test(link);

    if (isUrl) {
      const isDirectImage = /\.(jpg|jpeg|png|webp|gif)/i.test(link) || link.includes("media") || link.includes("images") || link.includes("img");
      
      if (isDirectImage) {
        // Direct Image URL - try loading with CORS first, fallback to visual page template on failure
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = link;
        
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/jpeg");
              setImages(prev => [...prev, dataUrl]);
              showToast("Successfully added image from QR code!", "success");
            } else {
              setImages(prev => [...prev, link]);
              showToast("QR link added to conversion queue!", "success");
            }
          } catch (e) {
            setImages(prev => [...prev, link]);
            showToast("QR link added to conversion queue!", "success");
          }
          setIsProcessingQrLink(false);
          handleStopQrScanner();
        };

        img.onerror = () => {
          const generatedPage = generateDocumentLinkPage(link);
          if (generatedPage) {
            setImages(prev => [...prev, generatedPage]);
            showToast("QR URL card generated into queue!", "success");
          } else {
            setImages(prev => [...prev, link]);
            showToast("QR link added to queue!", "success");
          }
          setIsProcessingQrLink(false);
          handleStopQrScanner();
        };
      } else {
        // General URL or Document link (e.g. syllabus, Google doc link) -> compile beautiful page representation
        const generatedPage = generateDocumentLinkPage(link);
        if (generatedPage) {
          setImages(prev => [...prev, generatedPage]);
          showToast("Scanned document link converted to PDF page card!", "success");
        } else {
          setImages(prev => [...prev, link]);
          showToast("Document link added to queue!", "success");
        }
        setIsProcessingQrLink(false);
        handleStopQrScanner();
      }
    } else {
      // Plain text content -> create beautiful textual representation page
      const generatedPage = generateDocumentLinkPage(link);
      if (generatedPage) {
        setImages(prev => [...prev, generatedPage]);
        showToast("QR information compiled into PDF page card!", "success");
      } else {
        showToast("Scanned content added to queue!", "success");
      }
      setIsProcessingQrLink(false);
      handleStopQrScanner();
    }
  };

  // Elegant canvas page generator representing any captured link or document identifier
  const generateDocumentLinkPage = (url: string): string => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 1131; // strict A4 ratio (1 : 1.414)
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      // Dark futuristic cosmic backdrop
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#09090e");
      gradient.addColorStop(1, "#161623");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Border frame
      ctx.strokeStyle = "rgba(236, 72, 153, 0.2)"; // Soft pink accent border line
      ctx.lineWidth = 14;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // Header display text
      ctx.font = "bold 32px sans-serif";
      ctx.fillStyle = "#EC4899"; // High quality pink highlight
      ctx.fillText("CAPTURED QR DOCUMENT LINK", 82, 110);

      // Elegant dividing line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 145);
      ctx.lineTo(canvas.width - 80, 145);
      ctx.stroke();

      // Top info Card background
      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.beginPath();
      ctx.roundRect?.(80, 190, canvas.width - 160, 240, 24);
      ctx.fill();
      ctx.strokeStyle = "rgba(236, 72, 153, 0.15)";
      ctx.stroke();

      // Beautiful media visual placeholder
      ctx.fillStyle = "rgba(236, 72, 153, 0.08)";
      ctx.beginPath();
      ctx.roundRect?.(120, 230, 100, 100, 20);
      ctx.fill();

      // Draw custom visual representation of chain links
      ctx.strokeStyle = "#EC4899";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(160, 280, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(180, 280, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Title & state details
      ctx.font = "bold 24px sans-serif";
      ctx.fillStyle = "#E2E8F0";
      ctx.fillText("Digital QR Link Captured", 250, 260);

      ctx.font = "16px monospace";
      ctx.fillStyle = "#F472B6";
      ctx.fillText("QUEUE STATUS: ACTIVE CONVERSION", 250, 295);

      // Body link section
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#94A3B8";
      ctx.fillText("Scanned Source String:", 82, 500);

      ctx.font = "18px monospace";
      ctx.fillStyle = "#F1F5F9";

      // Wrapping algorithm for long strings
      const words = url.split("");
      let line = "";
      let y = 540;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n];
        if (testLine.length > 55) {
          ctx.fillText(line, 82, y);
          line = words[n];
          y += 28;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 82, y);

      // Audit info block
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "#64748B";
      ctx.fillText("METADATA & SYSTEM AUDIT", 82, 780);

      ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
      ctx.beginPath();
      ctx.roundRect?.(80, 810, canvas.width - 160, 130, 16);
      ctx.fill();

      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#64748B";
      ctx.fillText("• Timestamp: " + new Date().toLocaleString(), 110, 855);
      ctx.fillText("• Engine Compiler: jsPDF / React Student Dashboard", 110, 885);
      ctx.fillText("• Verification Status: Digitally verified link page", 110, 915);

      // Footer
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 990);
      ctx.lineTo(canvas.width - 80, 990);
      ctx.stroke();

      ctx.font = "bold 14px monospace";
      ctx.fillStyle = "#10B981";
      ctx.fillText("✔ QUEUE COHERENCE SECURED", 82, 1035);

      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#475569";
      ctx.fillText("PDF page dynamically generated from user camera / gallery action stream.", 82, 1060);

      return canvas.toDataURL("image/jpeg", 0.95);
    } catch (e) {
      console.error("Canvas link page rendering failed:", e);
      return "";
    }
  };

  // Google Docs state & auth
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  useEffect(() => {
    const unsub = initAuth(
      (u) => {
        setUser(u);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsub();
  }, []);

  const handleOpenDocModal = () => {
    const dateStr = new Date().toLocaleDateString([], { month: "short", day: "numeric" });
    setDocTitle(`Untitled Document (${dateStr})`);
    setIsDocModalOpen(true);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        showToast("Connected to Google Account!", "success");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      showToast("Google authorization failed", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    setIsCreatingDoc(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setIsCreatingDoc(false);
        return;
      }

      const res = await fetch("https://docs.googleapis.com/v1/documents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: docTitle.trim() }),
      });

      if (!res.ok) {
        throw new Error(`Google API: ${res.status}`);
      }

      const newDoc = await res.json();
      showToast(`Created document: "${newDoc.title}"`, "success");
      
      // Save details for DocumentEditorView to auto-load
      localStorage.setItem("auto_load_doc_id", newDoc.documentId);
      localStorage.setItem("auto_load_doc_title", newDoc.title);
      
      setIsDocModalOpen(false);
      navigate("/document");
    } catch (err: any) {
      console.error("Doc creation failed:", err);
      showToast("Could not create Google Document", "error");
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        showToast(`Skipped ${file.name} - not an image.`, 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          setImages(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setImages(prev => {
      const newImages = [...prev];
      const temp = newImages[index];
      newImages[index] = newImages[index - 1];
      newImages[index - 1] = temp;
      return newImages;
    });
  };

  const moveDown = (index: number) => {
    if (index === images.length - 1) return;
    setImages(prev => {
      const newImages = [...prev];
      const temp = newImages[index];
      newImages[index] = newImages[index + 1];
      newImages[index + 1] = temp;
      return newImages;
    });
  };

  const generatePDF = async (autoDownload = true) => {
    if (images.length === 0) return;
    setIsGenerating(true);
    setConversionProgress(0);
    setShowCompletionNotification(false);
    setConversionStep("Initializing document settings...");

    // Clean up previous blob URL if any to prevent memory leaks
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    
    try {
      // Small initialization sleep for micro-interaction
      await new Promise(r => setTimeout(r, 600));

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Embed document metadata properties
      const props: any = {};
      if (pdfMetadataTitle.trim()) props.title = pdfMetadataTitle.trim();
      if (pdfMetadataAuthor.trim()) props.author = pdfMetadataAuthor.trim();
      if (pdfMetadataKeywords.trim()) props.keywords = pdfMetadataKeywords.trim();
      
      if (Object.keys(props).length > 0) {
        pdf.setProperties(props);
      }
      
      const a4Width = 210;
      const a4Height = 297;

      for (let i = 0; i < images.length; i++) {
        const pageNum = i + 1;
        setConversionStep(`Processing page ${pageNum} of ${images.length}...`);
        
        // Start phase of the current page
        const startProgress = Math.round((i / images.length) * 100);
        setConversionProgress(startProgress);

        // Simulated/Controlled delay for layout transition
        await new Promise(r => setTimeout(r, 300));

        if (i > 0) {
          pdf.addPage();
        }
        
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
             const imgRatio = img.width / img.height;
             const a4Ratio = a4Width / a4Height;
             
             let renderWidth = a4Width;
             let renderHeight = a4Height;
             
             if (imgRatio > a4Ratio) {
                renderWidth = a4Width;
                renderHeight = a4Width / imgRatio;
             } else {
                renderHeight = a4Height;
                renderWidth = a4Height * imgRatio;
             }
             
             const x = (a4Width - renderWidth) / 2;
             const y = (a4Height - renderHeight) / 2;
             
             let imageToUse: HTMLImageElement | string = img;
             
             if (compressPdf) {
               try {
                 const canvas = document.createElement("canvas");
                 let width = img.width;
                 let height = img.height;
                 
                 // Constrain maximum dimensions based on target quality slider to lower total raw pixel footprint
                 const maxDim = pdfQuality < 0.6 ? 1024 : 1600;
                 if (width > maxDim || height > maxDim) {
                   if (width > height) {
                     height = Math.round((height * maxDim) / width);
                     width = maxDim;
                   } else {
                     width = Math.round((width * maxDim) / height);
                     height = maxDim;
                   }
                 }
                 
                 canvas.width = width;
                 canvas.height = height;
                 const ctx = canvas.getContext("2d");
                 if (ctx) {
                   ctx.drawImage(img, 0, 0, width, height);
                   imageToUse = canvas.toDataURL("image/jpeg", pdfQuality);
                 }
               } catch (err) {
                 console.warn("Canvas compression failed, using original image", err);
                 imageToUse = img;
               }
             }
             
             pdf.addImage(imageToUse, 'JPEG', x, y, renderWidth, renderHeight);

              // 3] Apply custom text watermark layer if configured
              if (watermarkEnabled && watermarkText.trim()) {
                try {
                  pdf.saveGraphicsState();
                  let r = 236, g = 72, b = 153;
                  if (watermarkColor) {
                    const cleanedHex = watermarkColor.replace("#", "");
                    r = parseInt(cleanedHex.substring(0, 2), 16) || 236;
                    g = parseInt(cleanedHex.substring(2, 4), 16) || 72;
                    b = parseInt(cleanedHex.substring(4, 6), 16) || 153;
                  }
                  pdf.setTextColor(r, g, b);
                  pdf.setFont("helvetica", "bold");
                  pdf.setFontSize(watermarkFontSize);
                  // @ts-ignore
                  if (typeof pdf.GState === 'function') {
                    // @ts-ignore
                    const extGState = new pdf.GState({ opacity: watermarkOpacity });
                    // @ts-ignore
                    pdf.setGState(extGState);
                  }
                  const centerX = 105;
                  const centerY = 148.5;
                  pdf.text(watermarkText.trim(), centerX, centerY, {
                    align: "center",
                    angle: watermarkAngle
                  });
                  pdf.restoreGraphicsState();
                } catch (wmError) {
                  console.warn("Could not apply watermark overlay:", wmError);
                }
              }
             resolve();
          };
          img.onerror = () => reject(new Error("Image failed to load"));
          img.src = images[i];
        });

        // Completed phase of the current page
        const finishProgress = Math.round(((i + 1) / images.length) * 100);
        setConversionProgress(finishProgress);
      }
      
      setConversionStep("Compiling PDF document...");
      await new Promise(r => setTimeout(r, 400));

      let finalName = "";
      if (customFilenamePattern.trim()) {
        let pattern = customFilenamePattern.trim();
        // Remove trailing .pdf extension if typed, we'll append it
        pattern = pattern.replace(/\.pdf$/i, "");
        
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        const hh = String(now.getHours()).padStart(2, "0");
        const min = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        const timeStr = `${hh}${min}${ss}`;
        
        let resolved = pattern
          .replace(/\[DATE\]/g, dateStr)
          .replace(/\[TIME\]/g, timeStr)
          .replace(/\[PAGES\]/g, String(images.length))
          .replace(/\[TIMESTAMP\]/g, String(Date.now()));
        
        // Sanitize out illegal filename characters
        resolved = resolved.replace(/[\\/:*?"<>|]/g, "_");
        finalName = `${resolved}.pdf`;
      } else {
        finalName = `document_${Date.now()}.pdf`;
      }
      setGeneratedPdfName(finalName);
      setEditingPdfName(finalName);

      // Create blob URL for in-app preview/action
      const pdfBlob = pdf.output("blob");
      let finalBlob = pdfBlob;
      let finalUrl = URL.createObjectURL(pdfBlob);

      if (pdfPasswordEnabled && pdfPassword.trim()) {
        setConversionStep("Applying secure password-protection...");
        try {
          const rawBase64 = pdf.output("datauristring");
          const response = await fetch("/api/pdf/encrypt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pdfBase64: rawBase64,
              password: pdfPassword.trim()
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Failed to encrypt PDF on server");
          }

          const resData = await response.json();
          const encryptedRaw = resData.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
          const binaryStr = atob(encryptedRaw);
          const bytes = new Uint8Array(binaryStr.length);
          for (let idx = 0; idx < binaryStr.length; idx++) {
            bytes[idx] = binaryStr.charCodeAt(idx);
          }
          finalBlob = new Blob([bytes], { type: "application/pdf" });
          finalUrl = URL.createObjectURL(finalBlob);
        } catch (encryptError: any) {
          console.error("Encryption failed:", encryptError);
          showToast(`Security encryption failed: ${encryptError.message || "Please try again."}`, "error");
          throw new Error("Could not password-protect. Aborting save for your security.");
        }
      }

      setPdfBlobUrl(finalUrl);

      // 1] Keep track of the last 10 generated PDF files (Recent Conversions)
      const sourceImgsCopy = [...images];
      const newConversion = {
        id: "conv_" + Date.now(),
        name: finalName,
        blobUrl: finalUrl,
        date: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        pageCount: sourceImgsCopy.length,
        sourceImages: sourceImgsCopy,
        tags: [] as string[]
      };
      
      setRecentConversions(prev => {
        const filtered = prev.filter(c => c.name !== finalName);
        return [newConversion, ...filtered].slice(0, 10);
      });

      // 2] Trigger AI-powered auto-tagging to recommend metadata keywords
      setIsAiTaggingLoading(true);
      fetch("/api/gemini/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: finalName,
          title: pdfMetadataTitle,
          author: pdfMetadataAuthor,
          pageCount: sourceImgsCopy.length
        })
      })
        .then(res => res.json())
        .then(data => {
          setIsAiTaggingLoading(false);
          if (data && data.tags && data.tags.length > 0) {
            setAiSuggestedTags(data.tags);
            // Append suggested tags to the newly created history record
            setRecentConversions(prev => {
              return prev.map(c => {
                if (c.id === newConversion.id) {
                  return { ...c, tags: data.tags };
                }
                return c;
              });
            });
            showToast(`AI analyzed "${finalName}" and suggested relevant tags!`, "info");
          }
        })
        .catch(err => {
          console.error("AI Auto-tagging failed:", err);
          setIsAiTaggingLoading(false);
        });

      setConversionProgress(100);
      setIsGenerating(false);

      if (autoDownload) {
        // Save PDF via browser automatically
        const link = document.createElement("a");
        link.href = finalUrl;
        link.download = finalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowCompletionNotification(true);
        showToast("Secure PDF generated and saved successfully!", "success");
        addNotification("pdf", "PDF Saved Successfully", `Document "${finalName}" has been successfully generated and downloaded.`);
      } else {
        setPreviewTab('pdf');
        setIsPreviewModalOpen(true);
        showToast("Secure PDF preview compiled successfully!", "success");
        addNotification("pdf", "PDF Saved Successfully", `Document "${finalName}" preview has been successfully compiled.`);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to generate PDF.", "error");
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfBlobUrl) return;
    const link = document.createElement("a");
    link.href = pdfBlobUrl;
    link.download = editingPdfName || generatedPdfName || "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("PDF saved and downloaded successfully!", "success");
  };

  const parseRanges = (input: string, maxPageCount: number): Array<Array<number>> => {
    const segments = input.split(",").map(s => s.trim()).filter(Boolean);
    const result: Array<Array<number>> = [];
    
    for (const segment of segments) {
      if (segment.includes("-")) {
        const parts = segment.split("-").map(p => p.trim());
        const min = parseInt(parts[0], 10);
        const max = parseInt(parts[1], 10);
        if (isNaN(min) || isNaN(max) || min < 1 || max < min || min > maxPageCount || max > maxPageCount) {
          throw new Error(`Invalid range segment: "${segment}". Ranges must be between 1 and ${maxPageCount}.`);
        }
        const rangeIndices: number[] = [];
        for (let i = min; i <= max; i++) {
          rangeIndices.push(i - 1);
        }
        result.push(rangeIndices);
      } else {
        const pageNum = parseInt(segment, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > maxPageCount) {
          throw new Error(`Invalid page number: "${segment}". Must be between 1 and ${maxPageCount}.`);
        }
        result.push([pageNum - 1]);
      }
    }
    return result;
  };

  const performSplitPDF = async () => {
    if (images.length === 0) {
      showToast("Cannot split an empty workspace. Please upload or load images first.", "error");
      return;
    }
    const cleanInput = splitRangesInput.trim();
    if (!cleanInput) {
      showToast("Please enter page ranges to split, e.g., '1-2, 3-4'", "error");
      return;
    }

    try {
      setIsSplitting(true);
      const ranges = parseRanges(cleanInput, images.length);
      if (ranges.length === 0) {
        throw new Error("No valid ranges interpreted.");
      }

      // Loop through ranges and generate PDFs
      for (let rIdx = 0; rIdx < ranges.length; rIdx++) {
        const pageIndices = ranges[rIdx];
        const partName = `${editingPdfName || "split_document"}_part_${rIdx + 1}.pdf`;
        
        // Initialize new jsPDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        // Set properties
        const props: any = {};
        if (pdfMetadataTitle.trim()) props.title = `${pdfMetadataTitle.trim()} (Part ${rIdx + 1})`;
        if (pdfMetadataAuthor.trim()) props.author = pdfMetadataAuthor.trim();
        if (pdfMetadataKeywords.trim()) props.keywords = pdfMetadataKeywords.trim();
        if (Object.keys(props).length > 0) {
          pdf.setProperties(props);
        }

        const a4Width = 210;
        const a4Height = 297;

        for (let pIdx = 0; pIdx < pageIndices.length; pIdx++) {
          const actualImgIdx = pageIndices[pIdx];
          const imgSrc = images[actualImgIdx];
          
          if (pIdx > 0) {
            pdf.addPage();
          }

          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const imgRatio = img.width / img.height;
              const a4Ratio = a4Width / a4Height;
              
              let renderWidth = a4Width;
              let renderHeight = a4Height;
              
              if (imgRatio > a4Ratio) {
                renderWidth = a4Width;
                renderHeight = a4Width / imgRatio;
              } else {
                renderHeight = a4Height;
                renderWidth = a4Height * imgRatio;
              }
              
              const x = (a4Width - renderWidth) / 2;
              const y = (a4Height - renderHeight) / 2;
              
              let imageToUse: HTMLImageElement | string = img;
              
              if (compressPdf) {
                try {
                  const canvas = document.createElement("canvas");
                  let width = img.width;
                  let height = img.height;
                  const maxDim = pdfQuality < 0.6 ? 1024 : 1600;
                  if (width > maxDim || height > maxDim) {
                    if (width > height) {
                      height = Math.round((height * maxDim) / width);
                      width = maxDim;
                    } else {
                      width = Math.round((width * maxDim) / height);
                      height = maxDim;
                    }
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    imageToUse = canvas.toDataURL("image/jpeg", pdfQuality);
                  }
                } catch (err) {
                  imageToUse = img;
                }
              }

              pdf.addImage(imageToUse, 'JPEG', x, y, renderWidth, renderHeight);

              // Apply custom text watermark layer if configured
              if (watermarkEnabled && watermarkText.trim()) {
                try {
                  pdf.saveGraphicsState();
                  let r = 236, g = 72, b = 153;
                  if (watermarkColor) {
                    const cleanedHex = watermarkColor.replace("#", "");
                    r = parseInt(cleanedHex.substring(0, 2), 16) || 236;
                    g = parseInt(cleanedHex.substring(2, 4), 16) || 72;
                    b = parseInt(cleanedHex.substring(4, 6), 16) || 153;
                  }
                  pdf.setTextColor(r, g, b);
                  pdf.setFont("helvetica", "bold");
                  pdf.setFontSize(watermarkFontSize);
                  // @ts-ignore
                  if (typeof pdf.GState === 'function') {
                    // @ts-ignore
                    const extGState = new pdf.GState({ opacity: watermarkOpacity });
                    // @ts-ignore
                    pdf.setGState(extGState);
                  }
                  const centerX = 105;
                  const centerY = 148.5;
                  pdf.text(watermarkText.trim(), centerX, centerY, {
                    align: "center",
                    angle: watermarkAngle
                  });
                  pdf.restoreGraphicsState();
                } catch (wmError) {
                  console.warn("Could not apply watermark overlay:", wmError);
                }
              }

              resolve();
            };
            img.onerror = () => reject(new Error("Image failed to load"));
            img.src = imgSrc;
          });
        }

        // Output and trigger split segment download
        const finalPdfData = pdf.output("blob");
        const finalUrl = URL.createObjectURL(finalPdfData);
        
        const link = document.createElement("a");
        link.href = finalUrl;
        link.download = partName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      showToast(`Successfully split and downloaded ${ranges.length} PDF sub-files!`, "success");
      addNotification("pdf", "PDF Split Completed", `Successfully split active document into ${ranges.length} smaller file(s) structure.`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to split PDF ranges.", "error");
    } finally {
      setIsSplitting(false);
    }
  };

  const handleOCRForImage = async (index: number) => {
    const imgSrc = images[index];
    if (!imgSrc) return;
    
    setIsOcrLoading(true);
    setOcrTargetIndex(index);
    setOcrTextResult("");
    setIsOcrModalOpen(true);
    
    try {
      let mimeType = "image/jpeg";
      const mimeMatch = imgSrc.match(/data:([^;]+);base64,/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }
      
      const base64Data = imgSrc.replace(/^data:[^;]+;base64,/, "");
      
      showToast("Starting AI layer character analysis...", "info");
      
      const res = await fetch('/api/gemini/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mimeType, base64: base64Data })
      });
      
      if (!res.ok) {
        throw new Error("Server responded with error running character recognition layer.");
      }
      
      const data = await res.json();
      if (data.text) {
        setOcrTextResult(data.text);
        showToast("Text layout successfully retrieved!", "success");
      } else {
        throw new Error(data.error || "No text could be extracted from image.");
      }
    } catch (err: any) {
      console.error("OCR extraction failed:", err);
      setOcrTextResult(`OCR Extraction Failed. Please verify the scanned document contrast and try again.\n\nError: ${err.message || "Unknown API response"}`);
      showToast(err.message || "OCR service failed", "error");
    } finally {
      setIsOcrLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 p-6 overflow-y-auto custom-scrollbar">
      
      {/* Main Workspace Queue Column */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-pink-500" />
            PDF Editor
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Convert your notes, assignments, and photos into a PDF document.
          </p>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <button 
           onClick={() => galleryInputRef.current?.click()}
           className="glass-card p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors text-white text-center group"
         >
           <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/30 group-hover:scale-105 transition-transform">
              <ImageIcon className="w-6 h-6" />
           </div>
           <div>
             <div className="font-bold flex items-center justify-center gap-1.5">
               From Gallery
               <span className="bg-blue-500/20 text-blue-300 text-[9px] border border-blue-400/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Batch</span>
             </div>
             <div className="text-xs text-gray-400">Select multiple device images at once</div>
           </div>
           <input 
             type="file" 
             className="hidden" 
             accept="image/*" 
             multiple
             ref={galleryInputRef}
             onChange={(e) => handleFiles(e.target.files)}
           />
         </button>
         
         <button 
           onClick={handleStartBatchCameraCapture}
           className="glass-card p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors text-white text-center group"
         >
           <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center border border-green-500/30 group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6" />
           </div>
           <div>
             <div className="font-bold flex items-center justify-center gap-1.5">
               Batch Scanner
               <span className="bg-green-500/20 text-green-300 text-[9px] border border-green-400/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Continuous</span>
             </div>
             <div className="text-xs text-gray-400">Continuous scans or native photo</div>
           </div>
           <input 
             type="file" 
             className="hidden" 
             accept="image/*" 
             capture="environment"
             ref={cameraInputRef}
             onChange={(e) => handleFiles(e.target.files)}
           />
         </button>

         <button 
           onClick={handleOpenDocModal}
           className="glass-card p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors text-white text-center"
         >
           <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center border border-indigo-500/30">
              <Plus className="w-6 h-6" />
           </div>
           <div>
             <div className="font-bold">New Google Doc</div>
             <div className="text-xs text-gray-400">Create & type connected notes</div>
           </div>
         </button>

         <button 
           onClick={handleStartQrScanner}
           className="glass-card p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors text-white text-center border-pink-500/10 hover:border-pink-500/30 group"
         >
           <div className="w-12 h-12 bg-pink-500/20 text-pink-400 rounded-full flex items-center justify-center border border-pink-500/30 group-hover:scale-105 transition-transform">
              <QrCode className="w-6 h-6" />
           </div>
           <div>
             <div className="font-bold flex items-center justify-center gap-1.5">
               Scan QR Code
               <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
             </div>
             <div className="text-xs text-gray-400">Capture document links directly</div>
           </div>
         </button>
      </div>

      {/* Selected Images List */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          "flex-1 glass-card p-6 flex flex-col transition-all duration-300 relative overflow-hidden",
          isDraggingOver ? "border-pink-500/40 bg-pink-500/5 shadow-[0_0_20px_rgba(236,72,153,0.15)] scale-[1.005]" : "border-white/10"
        )}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none text-center p-6 border-2 border-dashed border-pink-500/50 rounded-2xl">
            <Upload className="w-12 h-12 text-pink-400 animate-bounce mb-3" />
            <h4 className="text-base font-bold text-white">Drop Images Here</h4>
            <p className="text-xs text-gray-400 mt-1">Release to batch-add images instantly</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-lg text-white">Pages ({images.length})</h3>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => generatePDF(false)}
              disabled={images.length === 0 || isGenerating}
              className="px-4 py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 active:scale-[0.98]"
            >
               {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 text-pink-400" />}
               Preview PDF
            </button>

            <button
              onClick={() => generatePDF(true)}
              disabled={images.length === 0 || isGenerating}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-[0.98]"
            >
               {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
               {isGenerating ? "Generating..." : "Generate & Save"}
            </button>
          </div>
        </div>

        {images.length > 0 && (
          <div className="flex flex-col gap-4 mb-6">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-pink-400 uppercase tracking-widest block">Custom Filename Pattern / Prefix</label>
                <p className="text-xs text-gray-400">
                  Use variables: <code className="text-pink-300 font-mono">[DATE]</code> (YYYY-MM-DD), <code className="text-pink-300 font-mono">[TIME]</code>, <code className="text-pink-300 font-mono">[PAGES]</code>, <code className="text-pink-300 font-mono">[TIMESTAMP]</code>
                </p>
              </div>
              <div className="w-full md:w-96 shrink-0">
                <input
                  type="text"
                  value={customFilenamePattern}
                  onChange={(e) => setCustomFilenamePattern(e.target.value)}
                  placeholder="e.g., assignment_[DATE]_page_[PAGES]"
                  className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all font-mono"
                />
                <div className="text-[10px] text-gray-500 mt-1 font-mono text-right truncate">
                  Preview: {customFilenamePattern ? customFilenamePattern
                    .replace(/\[DATE\]/g, new Date().toISOString().split('T')[0])
                    .replace(/\[TIME\]/g, String(new Date().getHours()).padStart(2, '0') + String(new Date().getMinutes()).padStart(2, '0') + String(new Date().getSeconds()).padStart(2, '0'))
                    .replace(/\[PAGES\]/g, String(images.length))
                    .replace(/\[TIMESTAMP\]/g, String(Date.now()))
                    .replace(/[\\/:*?"<>|]/g, "_") : "document"}.pdf
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-start lg:items-center gap-4 justify-between">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-pink-400 uppercase tracking-widest block">File Size Optimization</label>
                <p className="text-xs text-gray-400">
                  Reduce resolution or compress page quality using sliders to achieve smaller and optimized final PDF dimensions.
                </p>
              </div>
              <div className="w-full md:w-96 shrink-0 space-y-3 bg-[#09090e]/60 border border-white/5 rounded-xl p-3.5">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="compressPdfCheckbox"
                    checked={compressPdf}
                    onChange={(e) => setCompressPdf(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-black text-pink-500 focus:ring-pink-500/50 cursor-pointer accent-pink-500"
                  />
                  <label htmlFor="compressPdfCheckbox" className="text-xs font-bold text-gray-200 select-none cursor-pointer">
                    Compress and Optimize PDF Size
                  </label>
                </div>
                
                {compressPdf && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 text-[11px]">Compression Quality</span>
                      <span className="font-mono font-bold text-pink-400 text-[11px] bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">{Math.round(pdfQuality * 100)}%</span>
                    </div>
                    
                    <input
                      type="range"
                      min="0.10"
                      max="1.00"
                      step="0.05"
                      value={pdfQuality}
                      onChange={(e) => setPdfQuality(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-none"
                    />
                    
                    <div className="text-[10px] text-gray-500 font-medium">
                      {pdfQuality < 0.4 ? (
                        <span className="text-red-400/80">⚠️ Extreme Compression (low details, smallest size)</span>
                      ) : pdfQuality < 0.65 ? (
                        <span className="text-amber-400/80">⚡ Balanced (readable texts, smaller footprint)</span>
                      ) : pdfQuality < 0.85 ? (
                        <span className="text-pink-300">📈 Optimize (great resolution, high standard clarity)</span>
                      ) : (
                        <span className="text-blue-400">💎 Original Details (large file size, perfect native DPI)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-start lg:items-center gap-4 justify-between">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-pink-400 uppercase tracking-widest block">Document Metadata</label>
                <p className="text-xs text-gray-400">
                  Set Title, Author, and Keywords embedded within the document metadata.
                </p>
              </div>
              <div className="w-full md:w-96 shrink-0 space-y-3 bg-[#09090e]/60 border border-white/5 rounded-xl p-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Document Title</label>
                  <input
                    type="text"
                    value={pdfMetadataTitle}
                    onChange={(e) => setPdfMetadataTitle(e.target.value)}
                    placeholder="e.g., Physics Assignment 1"
                    className="w-full bg-[#09090e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Author</label>
                  <input
                    type="text"
                    value={pdfMetadataAuthor}
                    onChange={(e) => setPdfMetadataAuthor(e.target.value)}
                    placeholder="e.g., Somnath Pal"
                    className="w-full bg-[#09090e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Keywords</label>
                  <input
                    type="text"
                    value={pdfMetadataKeywords}
                    onChange={(e) => setPdfMetadataKeywords(e.target.value)}
                    placeholder="e.g., homework, science, 2026"
                    className="w-full bg-[#09090e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all"
                  />
                  <span className="text-[9px] text-gray-500 block">Comma-separated tags for PDF properties.</span>

                  {/* AI Auto-tagging suggestions block */}
                  {(aiSuggestedTags.length > 0 || isAiTaggingLoading) && (
                    <div className="pt-2.5 border-t border-white/5 mt-2.5 space-y-1.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-pink-400 uppercase tracking-widest flex items-center gap-1 font-mono">
                          <Sparkles className="w-3 h-3 animate-pulse text-pink-500" />
                          AI Keyword Recommendations
                        </span>
                        {isAiTaggingLoading && <Loader2 className="w-2.5 h-2.5 text-pink-400 animate-spin" />}
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {aiSuggestedTags.map((tag) => {
                          const lowerKeywords = pdfMetadataKeywords.toLowerCase();
                          const isAlreadyAdded = lowerKeywords.split(",").map(k => k.trim()).includes(tag.toLowerCase());
                          
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                if (isAlreadyAdded) {
                                  // Remove it
                                  const filtered = pdfMetadataKeywords
                                    .split(",")
                                    .map(k => k.trim())
                                    .filter(k => k.toLowerCase() !== tag.toLowerCase())
                                    .join(", ");
                                  setPdfMetadataKeywords(filtered);
                                } else {
                                  // Add it
                                  const current = pdfMetadataKeywords.trim();
                                  const updated = current ? `${current}, ${tag}` : tag;
                                  setPdfMetadataKeywords(updated);
                                }
                              }}
                              className={clsx(
                                "text-[10px] px-2 py-0.5 rounded-full transition-all border font-medium cursor-pointer",
                                isAlreadyAdded
                                  ? "bg-pink-500/20 text-white border-pink-500/40"
                                  : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-gray-500 font-mono">Click a pill above to instantly toggle it into your document metadata keywords list.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Watermark Overlay Configuration */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-start lg:items-center gap-4 justify-between">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-pink-400 uppercase tracking-widest block flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                  Visual Watermarking
                </label>
                <p className="text-xs text-gray-400">
                  Embed custom stylized text watermarks across all generated pages for ownership protection or draft labels.
                </p>
              </div>
              <div className="w-full md:w-96 shrink-0 space-y-3 bg-[#09090e]/60 border border-white/5 rounded-xl p-3.5">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="watermarkEnabledCheckbox"
                    checked={watermarkEnabled}
                    onChange={(e) => setWatermarkEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-black text-pink-500 focus:ring-pink-500/50 cursor-pointer accent-pink-500"
                  />
                  <label htmlFor="watermarkEnabledCheckbox" className="text-xs font-bold text-gray-200 select-none cursor-pointer">
                    Enable Page Watermarking
                  </label>
                </div>
                
                {watermarkEnabled && (
                  <div className="space-y-3 pt-2 border-t border-white/5 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Watermark Text</label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="e.g., CONFIDENTIAL COPY"
                        className="w-full bg-[#09090e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Font Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={watermarkColor}
                            onChange={(e) => setWatermarkColor(e.target.value)}
                            className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-gray-300 uppercase">{watermarkColor}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Font Size</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="14"
                            max="72"
                            step="2"
                            value={watermarkFontSize}
                            onChange={(e) => setWatermarkFontSize(parseInt(e.target.value))}
                            className="flex-1 h-1 bg-white/10 rounded appearance-none cursor-pointer accent-pink-500"
                          />
                          <span className="text-[10px] font-mono font-bold text-pink-400 bg-pink-500/10 px-1 py-0.5 rounded border border-pink-500/20">{watermarkFontSize}pt</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Angle Offset</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="-95"
                            max="95"
                            step="5"
                            value={watermarkAngle}
                            onChange={(e) => setWatermarkAngle(parseInt(e.target.value))}
                            className="flex-1 h-1 bg-white/10 rounded appearance-none cursor-pointer accent-pink-500"
                          />
                          <span className="text-[10px] font-mono font-bold text-pink-400 bg-pink-500/10 px-1 py-0.5 rounded border border-pink-500/20">{watermarkAngle}°</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Opacity Level</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0.05"
                            max="0.95"
                            step="0.05"
                            value={watermarkOpacity}
                            onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-white/10 rounded appearance-none cursor-pointer accent-pink-500"
                          />
                          <span className="text-[10px] font-mono font-bold text-pink-400 bg-pink-500/10 px-1 py-0.5 rounded border border-pink-500/20">{Math.round(watermarkOpacity * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-start lg:items-center gap-4 justify-between">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-pink-400 uppercase tracking-widest block flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                  Document Security
                </label>
                <p className="text-xs text-gray-400">
                  Password-protect your PDF document. The password will be required of anyone trying to open the file.
                </p>
              </div>
              <div className="w-full md:w-96 shrink-0 space-y-3 bg-[#09090e]/60 border border-white/5 rounded-xl p-3.5">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="pdfPasswordCheckbox"
                    checked={pdfPasswordEnabled}
                    onChange={(e) => setPdfPasswordEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-black text-pink-500 focus:ring-pink-500/50 cursor-pointer accent-pink-500"
                  />
                  <label htmlFor="pdfPasswordCheckbox" className="text-xs font-bold text-gray-200 select-none cursor-pointer">
                    Enable PDF Password Protection
                  </label>
                </div>
                
                {pdfPasswordEnabled && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Set Document Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={pdfPassword}
                          onChange={(e) => setPdfPassword(e.target.value)}
                          placeholder="Enter opening password"
                          className="w-full bg-[#09090e] border border-white/10 rounded-xl pl-3 pr-10 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <span className="text-[9px] text-gray-500 block">Uses bank-grade standard RC4/AES 128-bit PDF encryption securely.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Range Segment PDF Splitter Card */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-start lg:items-center gap-4 justify-between">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-pink-400 uppercase tracking-widest block flex items-center gap-1.5 font-mono">
                  <Scissors className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                  PDF Segment Splitter
                </label>
                <p className="text-xs text-gray-400">
                  Splits the current workspace queue list into multiple smaller PDF files instantly using custom range parameters.
                </p>
              </div>
              <div className="w-full md:w-96 shrink-0 space-y-3 bg-[#09090e]/60 border border-white/5 rounded-xl p-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Split Page Ranges</label>
                  <input
                    type="text"
                    value={splitRangesInput}
                    onChange={(e) => setSplitRangesInput(e.target.value)}
                    placeholder="e.g. 1-2, 3-4, 5"
                    className="w-full bg-[#09090e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all font-mono"
                  />
                  <div className="text-[9.5px] text-gray-500 space-y-0.5 leading-tight font-mono">
                    <p>• Comma-separated groups create distinct files.</p>
                    <p>• Example: <span className="text-pink-400">1-2, 3-5, 6</span> splits 6 pages into 3 separate downloads.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={performSplitPDF}
                  disabled={isSplitting || images.length === 0}
                  className="w-full py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 disabled:opacity-35 text-[10px] font-bold uppercase tracking-widest text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSplitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Splitting segments...
                    </>
                  ) : (
                    <>
                      <Scissors className="w-3.5 h-3.5" />
                      Execute Multi-File Split
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {images.length === 0 ? (
           <div className="flex-1 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 p-8 text-center min-h-[300px]">
             <FileText className="w-12 h-12 mb-3 opacity-50" />
             <p className="font-bold text-gray-400">No images added</p>
             <p className="text-sm mt-1">Upload or capture images to create a PDF.</p>
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 overflow-y-auto custom-scrollbar content-start">
             {images.map((imgSrc, idx) => (
                <div key={idx} className="relative group bg-[#0D0D14] border border-white/10 rounded-xl overflow-hidden aspect-[3/4]">
                   {/* Thumbnail */}
                   <img src={imgSrc} alt={`Page ${idx + 1}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                   
                   {/* Page Number Badge */}
                   <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white font-mono text-[10px] px-2 py-0.5 rounded-md border border-white/10">
                     {idx + 1}
                   </div>
                   
                   {/* Overlay Actions */}
                   <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-md text-white transition-colors"
                      >
                         <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => moveDown(idx)}
                        disabled={idx === images.length - 1}
                        className="p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-md text-white transition-colors"
                      >
                         <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleOCRForImage(idx)}
                        className="p-1.5 bg-pink-500/15 hover:bg-pink-500/35 text-pink-300 rounded-md transition-colors"
                        title="Scan Text (OCR)"
                      >
                         <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-pulse animate-duration-1000" />
                      </button>
                      <button 
                        onClick={() => removeImage(idx)}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-md transition-colors ml-auto"
                      >
                         <Trash2 className="w-3.5 h-3.5" />
                      </button>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>

      </div>

      {/* Right Sidebar - Recent Conversions & Merge Hub */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-5 mt-[72px]">
        <div className="bg-[#0E0E16]/80 backdrop-blur-md border border-white/5 rounded-[24px] p-5 flex flex-col h-[640px] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-pink-500 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Recent Conversions</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded border border-pink-500/20">
              {recentConversions.length}/10
            </span>
          </div>

          {/* Merge Utility Action Strip */}
          {recentConversions.length > 0 && (
            <div className="py-2.5 px-3 rounded-xl bg-pink-500/5 border border-pink-500/10 mt-3 hover:border-pink-500/20 transition-all shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider">Merge Utility</span>
                <span className="text-[9px] text-gray-400 font-mono">
                  {selectedForMerge.size} selected
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Select 2+ files below to merge their pages together.</p>
              
              <button
                disabled={selectedForMerge.size < 2}
                onClick={async () => {
                  const selectedDocs = recentConversions.filter(c => selectedForMerge.has(c.id));
                  const consolidatedImages: string[] = [];
                  selectedDocs.forEach(doc => {
                    if (doc.sourceImages && Array.isArray(doc.sourceImages)) {
                      consolidatedImages.push(...doc.sourceImages);
                    }
                  });

                  if (consolidatedImages.length === 0) {
                    showToast("No source images found for merge. Try converting some first!", "error");
                    return;
                  }

                  // Load them into images workbench
                  setImages(consolidatedImages);
                  setCustomFilenamePattern("merged_document_[DATE]_[TIME]");
                  showToast(`Consolidated ${consolidatedImages.length} pages from ${selectedDocs.length} files into the workbench queue! Adjust order, watermark, compress, then click Generate to download!`, "success");
                  setSelectedForMerge(new Set()); // reset selections
                }}
                className="w-full mt-2.5 py-1.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 disabled:opacity-35 text-[10px] font-bold text-white rounded-lg transition-all uppercase tracking-wider shadow-lg shadow-pink-500/10 hover:shadow-pink-400/20 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
              >
                Merge Selected into Workbench
              </button>
            </div>
          )}

          {/* History Documents List */}
          <div className="flex-1 overflow-y-auto mt-4 space-y-3 custom-scrollbar pr-1">
            {recentConversions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-4 text-center text-gray-500">
                <FileText className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs font-bold">No history records</p>
                <p className="text-[10px] mt-0.5 leading-relaxed font-mono">Generated documents in this active session will show up here instantly!</p>
              </div>
            ) : (
              recentConversions.map((conv) => {
                const isSelected = selectedForMerge.has(conv.id);
                return (
                  <div
                    key={conv.id}
                    className={clsx(
                      "p-3 rounded-xl border transition-all flex flex-col gap-2 relative group",
                      isSelected
                        ? "bg-pink-500/5 border-pink-500/25 shadow-sm"
                        : "bg-[#111119]/80 border-white/5 hover:border-white/10"
                    )}
                  >
                    {/* Header line */}
                    <div className="flex items-start gap-2 justify-between">
                      {/* Checkbox for merge utility */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          id={`check_${conv.id}`}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedForMerge(prev => {
                              const next = new Set(prev);
                              if (next.has(conv.id)) {
                                next.delete(conv.id);
                              } else {
                                next.add(conv.id);
                              }
                              return next;
                            });
                          }}
                          className="w-3.5 h-3.5 rounded border-white/10 bg-black text-pink-500 focus:ring-pink-500/50 cursor-pointer accent-pink-500 shrink-0"
                        />
                        <label htmlFor={`check_${conv.id}`} className="text-xs font-bold text-white truncate font-mono block select-all cursor-pointer" title={conv.name}>
                          {conv.name}
                        </label>
                      </div>
                      
                      {/* Delete icon */}
                      <button
                        onClick={() => {
                          setRecentConversions(prev => prev.filter(c => c.id !== conv.id));
                          setSelectedForMerge(prev => {
                            const next = new Set(prev);
                            next.delete(conv.id);
                            return next;
                          });
                          showToast("Conversion history record removed from log list", "success");
                        }}
                        className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                        title="Delete record"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Metadata indicators */}
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                      <span>{conv.date}</span>
                      <span className="bg-white/5 text-gray-300 px-1.5 py-0.5 rounded border border-white/5 font-bold">
                        {conv.pageCount} page{conv.pageCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Associated metadata tags */}
                    {conv.tags && conv.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-white/[0.03]">
                        {conv.tags.map((tg: string) => (
                          <span
                            key={tg}
                            className="text-[9px] bg-pink-500/10 border border-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded font-medium"
                          >
                            {tg}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions Strip */}
                    <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-white/[0.03]">
                      <button
                        disabled={!conv.blobUrl}
                        onClick={() => {
                          if (!conv.blobUrl) {
                            showToast("Blob URL is expired or unavailable in this session. Re-generate to preview!", "error");
                            return;
                          }
                          setEditingPdfName(conv.name);
                          setPdfBlobUrl(conv.blobUrl);
                          setPreviewTab('pdf');
                          setIsPreviewModalOpen(true);
                          showToast("Displaying in-app preview from recent history cache!", "success");
                        }}
                        className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-pink-400" />
                        Preview
                      </button>
                      
                      <button
                        disabled={!conv.blobUrl}
                        onClick={() => {
                          if (!conv.blobUrl) {
                            showToast("Blob URL is expired or unavailable in this session. Re-generate to download!", "error");
                            return;
                          }
                          const link = document.createElement("a");
                          link.href = conv.blobUrl;
                          link.download = conv.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          showToast("Downloaded PDF from history cache!", "success");
                        }}
                        className="flex-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-30 disabled:hover:bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-bold text-blue-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="pt-2 border-t border-white/5 text-[9px] text-gray-500 font-mono text-center shrink-0">
            Active session history block.
          </div>
        </div>
      </div>

      {/* Creation Modal Overlay */}
      <AnimatePresence>
        {isDocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDocModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-[#161623] border border-white/10 rounded-[28px] p-6 shadow-2xl overflow-hidden z-10"
            >
              <div className="absolute top-0 right-0 p-4">
                <button
                  onClick={() => setIsDocModalOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Decorative gradient corner */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex gap-4 items-start mb-6 w-full">
                <div className="p-3 bg-blue-500/15 rounded-2xl border border-blue-500/20 shrink-0">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-1.5 leading-snug">
                    New Google Document
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Create a blank document directly in your Google Drive storage.
                  </p>
                </div>
              </div>

              {needsAuth ? (
                /* Auth State Panel */
                <div className="bg-[#09090e]/50 border border-white/5 rounded-2xl p-5 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-400/80 mx-auto mb-3" />
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    Connecting to Google with proper permissions is required before creating documents.
                  </p>
                  
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isLoggingIn ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Connect Google Drive
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Text Creation Form */
                <form onSubmit={handleCreateDocument} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Document Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Exam Study Outline"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full bg-[#09090e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all font-serif"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsDocModalOpen(false)}
                      className="px-4 py-2 hover:bg-white/5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingDoc || !docTitle.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-2 border border-white/10"
                    >
                      {isCreatingDoc ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                          Create Document
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Active Conversion Progress Overlay */}
      <AnimatePresence>
        {isGenerating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-[#161623] border border-white/10 rounded-[28px] p-6.5 shadow-2xl overflow-hidden z-10 text-center"
            >
              {/* Circular filling progress indicator */}
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-5 mt-2">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    className="stroke-white/5"
                    strokeWidth="5"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="56"
                    cy="56"
                    r="44"
                    className="stroke-pink-500"
                    strokeWidth="5"
                    fill="transparent"
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: 276.4 }}
                    animate={{ strokeDashoffset: 276.4 - (conversionProgress / 100) * 276.4 }}
                    transition={{ ease: "easeOut", duration: 0.3 }}
                    style={{
                      strokeDasharray: 276.4,
                      filter: "drop-shadow(0px 0px 8px rgba(236, 72, 153, 0.4))",
                    }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-bold font-mono text-white leading-none">
                    {conversionProgress}%
                  </span>
                  <span className="text-[8px] font-bold text-pink-400 uppercase tracking-widest mt-1">
                    Progress
                  </span>
                </div>
              </div>

              <h3 className="text-md font-bold text-white mb-1 leading-snug">
                Generating PDF Document
              </h3>
              <p className="text-xs text-pink-300 font-mono mb-4 max-w-xs mx-auto animate-pulse">
                {conversionStep}
              </p>

              <span className="text-[10px] text-gray-500 font-mono block">
                Compiles high-quality elements for distribution...
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Conversion Final Notification Overlay */}
      <AnimatePresence>
        {showCompletionNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowCompletionNotification(false)}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-[#161623] border border-white/10 rounded-[28px] p-6 shadow-2xl overflow-hidden z-10"
            >
              <div className="absolute top-0 right-0 p-4">
                <button
                  onClick={() => setShowCompletionNotification(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Decorative gradient corner */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex gap-4 items-start mb-6 w-full">
                <div className="p-3 bg-emerald-500/15 rounded-2xl border border-emerald-500/20 shrink-0">
                  <CheckCircle className="w-6 h-6 text-emerald-400 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white leading-snug">
                    PDF Document Ready!
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Your images have been successfully converted and compiled into a high-quality PDF.
                  </p>
                </div>
              </div>

              <div className="bg-[#09090e]/60 border border-white/5 rounded-2xl p-4.5 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-500/10 rounded-xl border border-pink-500/20">
                    <FileText className="w-5 h-5 text-pink-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{generatedPdfName || "document.pdf"}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Compiled from {images.length} page(s)</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCompletionNotification(false)}
                  className="px-4 py-2 hover:bg-white/5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Close
                </button>
                {pdfBlobUrl && (
                  <a
                    href={pdfBlobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-2 border border-white/10"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Open PDF
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Capture Overlay */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleStopQrScanner}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-[#111119] border border-pink-500/20 rounded-[28px] p-6 shadow-2xl overflow-hidden z-10"
            >
              <div className="absolute top-0 right-0 p-4">
                <button
                  onClick={handleStopQrScanner}
                  className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Decorative background gradient */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex gap-4 items-start mb-6 w-full">
                <div className="p-3 bg-pink-500/15 rounded-2xl border border-pink-500/20 shrink-0">
                  <QrCode className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-snug">
                    Scan Document QR Code
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Point your camera at a QR code, or upload an image containing a link.
                  </p>
                </div>
              </div>

              {detectedQrValue ? (
                /* Scanning Confirmation Panel */
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-pink-950/10 border border-pink-500/30 rounded-2xl p-5 space-y-4 text-center relative overflow-hidden"
                >
                  <div className="w-12 h-12 bg-pink-500/20 text-pink-400 rounded-full flex items-center justify-center border border-pink-500/30 mx-auto animate-pulse">
                    <LinkIcon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-pink-400 uppercase tracking-widest text-[10px]">QR Code Decoded</p>
                    <div className="bg-[#09090e] border border-white/5 rounded-xl p-3 text-xs text-gray-300 font-mono text-center select-all break-all max-h-24 overflow-y-auto">
                      {detectedQrValue}
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    Would you like to resolve this source link and add it to your file conversion queue?
                  </p>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setDetectedQrValue(null);
                        // Resume the live loop
                        animationFrameRef.current = requestAnimationFrame(scanQrFrame);
                      }}
                      disabled={isProcessingQrLink}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-xl text-gray-400 hover:text-white transition-colors border border-white/5"
                    >
                      Rescan / Clear
                    </button>
                    <button
                      onClick={handleProcessScannedQr}
                      disabled={isProcessingQrLink}
                      className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-500 hover:from-pink-400 hover:to-indigo-400 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border border-white/10"
                    >
                      {isProcessingQrLink ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Add to Queue
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Active Camera Finder / Image Uploader */
                <div className="space-y-5">
                  <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
                    {/* Running Video element */}
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Hidden canvas for image grab decoding */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Interactive overlay target sights */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/30">
                      <div className="relative w-48 h-28 border-2 border-dashed border-pink-500/60 rounded-xl flex flex-col items-center justify-center">
                        <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-pink-500 rounded-tl" />
                        <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-pink-500 rounded-tr" />
                        <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-pink-500 rounded-bl" />
                        <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-pink-500 rounded-br" />
                        
                        <span className="text-[10px] text-pink-400/80 uppercase font-bold tracking-widest">Scanning...</span>

                        {/* Red visual laser scanning element */}
                        <div className="absolute h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent w-full top-2 left-0 animate-bounce shadow-[0_0_8px_rgba(236,72,153,1)]" />
                      </div>
                    </div>
                  </div>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-gray-500 font-mono uppercase tracking-wider">or selection from device</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>

                  {/* Manual file upload selector */}
                  <div 
                    onClick={() => qrImageInputRef.current?.click()}
                    className="border border-dashed border-white/10 hover:border-pink-500/20 bg-white/5 hover:bg-white/10 rounded-2xl p-5 text-center cursor-pointer transition-all group shrink-0"
                  >
                    <Upload className="w-6 h-6 text-pink-400 opacity-60 group-hover:opacity-100 mx-auto mb-2 transition-opacity" />
                    <p className="text-xs font-bold text-gray-300">Scan QR Code from Photo</p>
                    <p className="text-[10px] text-gray-500 mt-1">Select an image file containing a document QR link</p>
                    <input 
                      type="file" 
                      ref={qrImageInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleQrImageUpload(e.target.files)} 
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Camera Scanner Modal Overlay */}
      <AnimatePresence>
        {isBatchCameraOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleStopBatchCameraCapture}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-4xl h-[88vh] bg-[#0E0E15] border border-white/10 rounded-[28px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-10"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-green-500/15 rounded-xl border border-green-500/20 text-green-400 shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-green-400">Continuous Capture Engine</span>
                    <h3 className="text-base font-bold text-white leading-tight">Batch Document Scanner</h3>
                  </div>
                </div>

                <button
                  onClick={handleStopBatchCameraCapture}
                  className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Content Workspace Layout: Split Grid */}
              <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-0">
                {/* Left Side: Live Feed Screen */}
                <div className="flex-1 bg-[#050508] border border-white/5 rounded-2xl relative overflow-hidden flex flex-col justify-between p-4 group">
                  <div className="relative flex-1 w-full rounded-xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
                    {/* Live Camera Feed */}
                    <video
                      ref={batchVideoRef}
                      className="w-full h-full object-cover"
                      playsInline
                    />
                    
                    {/* Hidden canvas for video grabs */}
                    <canvas ref={batchCanvasRef} className="hidden" />

                    {/* Camera Flash Overlay */}
                    {isShutterFlashing && (
                      <div className="absolute inset-0 bg-white/90 z-20 transition-opacity duration-150" />
                    )}

                    {/* Boundary Grid Lines Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/20">
                      <div className="relative w-[80%] h-[80%] border border-white/20 rounded-lg">
                        {/* Corner Accents */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-l-2 border-t-2 border-green-400 rounded-tl" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-r-2 border-t-2 border-green-400 rounded-tr" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-2 border-b-2 border-green-400 rounded-bl" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-2 border-b-2 border-green-400 rounded-br" />

                        {/* Grid Lines */}
                        <div className="absolute inset-y-0 left-1/3 border-l border-white/10" />
                        <div className="absolute inset-y-0 right-1/3 border-r border-white/10" />
                        <div className="absolute inset-x-0 top-1/3 border-t border-white/10" />
                        <div className="absolute inset-x-0 bottom-1/3 border-b border-white/10" />

                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] text-green-400/60 uppercase font-mono tracking-widest bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
                            Align Page Frame
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Big Shutter Button inside camera window */}
                    <div className="absolute bottom-6 inset-x-0 flex justify-center z-10">
                      <button
                        onClick={captureBatchPhoto}
                        className="w-16 h-16 rounded-full bg-white border-4 border-green-500/40 hover:border-green-500 active:scale-90 transition-all flex items-center justify-center text-[#111] shadow-[0_0_15px_rgba(255,255,255,0.3)] group-hover:scale-105"
                      >
                        <Camera className="w-5 h-5 text-gray-800" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Side: Batch Captured List (Session Filmstrip) */}
                <div className="w-full md:w-[280px] bg-[#07070B] border border-white/5 rounded-2xl p-4 flex flex-col justify-between shrink-0 min-h-[150px] md:min-h-0">
                  <div className="flex flex-col h-full min-h-0">
                    {/* Header of session tracker */}
                    <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Draft Scans</h4>
                      <span className="bg-green-500/10 text-green-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-green-500/15 animate-pulse">
                        {capturedBatchImages.length} Pages
                      </span>
                    </div>

                    {/* Scrolling strip of captured images */}
                    <div className="flex-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto max-h-[120px] md:max-h-none flex md:flex-col gap-3 custom-scrollbar py-1 min-h-0">
                      {capturedBatchImages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-gray-500 py-6 md:py-12 border border-dashed border-white/5 rounded-xl">
                          <ImageIcon className="w-8 h-8 text-gray-600 mb-2" />
                          <p className="text-[10px] text-gray-300 font-bold">No snapshots yet</p>
                          <p className="text-[9px] text-gray-500 mt-1.5 px-3">Position documents and press the shutter button to compile pages.</p>
                        </div>
                      ) : (
                        capturedBatchImages.map((src, index) => (
                          <div 
                            key={index} 
                            className="relative w-[75px] h-[100px] md:w-full md:h-[120px] bg-black border border-white/10 rounded-xl overflow-hidden group/thumb flex-shrink-0"
                          >
                            <img 
                              src={src} 
                              alt={`Draft Page ${index + 1}`} 
                              className="w-full h-full object-cover opacity-70 group-hover/thumb:opacity-100 transition-opacity" 
                              referrerPolicy="no-referrer"
                            />
                            
                            {/* Page Index Shield */}
                            <span className="absolute top-1.5 left-1.5 bg-black/75 text-[9px] font-mono font-bold text-white border border-white/15 px-1.5 py-0.5 rounded-md leading-none shadow-sm">
                              {index + 1}
                            </span>

                            {/* Discard Overlay Action Button */}
                            <button
                              onClick={() => removeCapturedBatchImage(index)}
                              className="absolute top-1.5 right-1.5 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-md text-white shadow-md active:scale-95 md:opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5 pt-4 border-t border-white/5 shrink-0">
                <p className="text-[10px] sm:text-[11px] text-gray-400 max-w-lg leading-relaxed">
                  Tip: Clean lighting and landscape/portrait align document pages inside the green boundaries for superior results.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleStopBatchCameraCapture}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    Discard Session
                  </button>
                  <button
                    onClick={handleCommitBatchImages}
                    disabled={capturedBatchImages.length === 0}
                    className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-40 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 border border-white/10"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Add All to Workspace ({capturedBatchImages.length})
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Dynamic Preview Modal Overlay */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-4xl h-[85vh] bg-[#111119] border border-white/10 rounded-[28px] p-6 shadow-2xl flex flex-col overflow-hidden z-10 animate-duration-300"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-pink-500/15 rounded-xl border border-pink-500/20 text-pink-400 shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-pink-500">Document Live Verification</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <input
                        type="text"
                        value={editingPdfName}
                        onChange={(e) => setEditingPdfName(e.target.value)}
                        className="text-base font-bold text-white bg-white/5 hover:bg-white/10 focus:bg-black/40 border border-transparent hover:border-white/10 focus:border-pink-500/30 rounded-lg px-2.5 py-1 outline-none transition-all truncate"
                        placeholder="document.pdf"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Selector & Metrics */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0 bg-white/5 p-1.5 rounded-2xl">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPreviewTab('pdf')}
                    className={clsx(
                      "flex-grow sm:flex-initial py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      previewTab === 'pdf' 
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Interactive PDF
                  </button>
                  <button
                    onClick={() => setPreviewTab('pages')}
                    className={clsx(
                      "flex-grow sm:flex-initial py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      previewTab === 'pages' 
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Visual Pages ({images.length})
                  </button>
                </div>

                <div className="text-[10px] text-gray-500 font-mono flex items-center gap-3 px-2 py-1 justify-end">
                  <span>Format: <b>A4 Portrait</b></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  <span>Pages: <b>{images.length}</b></span>
                </div>
              </div>
                            {/* Preview Content Area */}
              <div className="flex-1 bg-[#09090e] border border-white/5 rounded-2xl p-4 overflow-y-auto custom-scrollbar flex items-center justify-center min-h-0">
                {previewTab === 'pdf' && pdfBlobUrl ? (
                  <div className="w-full h-full relative rounded-xl overflow-hidden bg-[#0D0D14]/80 p-2 flex flex-col">
                    <PdfPreviewer 
                      fileUrl={pdfBlobUrl} 
                      onSaveHighlight={async (text) => {
                        try {
                          const noteContent = `> ${text}\n\n*Highlighted from [${editingPdfName || "document.pdf"}](PDF_PREVIEW)*`;
                          await createItem('notes', { 
                            title: `Highlight: ${editingPdfName || "document.pdf"}`, 
                            content: noteContent, 
                            createdAt: new Date().toISOString() 
                          });
                          showToast("Highlight saved to Notes!", "success");
                        } catch (e) {
                          showToast("Failed to save highlight", "error");
                        }
                      }}
                    />
                  </div>
                ) : (
                  /* Visual Pages rendering simulator */
                  <div className="w-full h-full overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">
                    {images.map((imgSrc, idx) => (
                      <div 
                        key={idx} 
                        className="bg-white text-black shadow-[0_12px_40px_rgba(0,0,0,0.6)] rounded-sm overflow-hidden mx-auto border border-black/10 flex flex-col relative"
                        style={{
                          aspectRatio: '210 / 297',
                          maxWidth: '540px',
                          width: '100%',
                        }}
                      >
                        {/* Page Content layout representation */}
                        <div className="flex-1 relative w-full h-full bg-[#fafafa] flex items-center justify-center overflow-hidden">
                          <img 
                            src={imgSrc} 
                            alt={`Render Page ${idx + 1}`} 
                            className="w-full h-full object-contain pointer-events-none select-none max-h-full" 
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Simulation watermark footer */}
                        <div className="absolute bottom-1 right-2 pointer-events-none select-none flex items-center justify-between text-[7px] text-gray-400/60 font-mono w-[95%] border-t border-gray-100/30 pt-1">
                          <span>Page {idx + 1} of {images.length}</span>
                          <span>PDF Preview Verification System</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5 pt-4 border-t border-white/5 shrink-0">
                <p className="text-[11px] text-gray-400">
                  Please review the page margin alignments, cropping alignment, and ordering before final publication.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    Close Preview
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-500 hover:from-pink-400 hover:to-indigo-400 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 border border-white/10"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Download & Save PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI OCR Scan Modal Overlay */}
      <AnimatePresence>
        {isOcrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOcrModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-2xl bg-[#111119] border border-pink-500/20 rounded-[28px] p-6 shadow-2xl overflow-hidden z-10"
            >
              <div className="absolute top-0 right-0 p-4">
                <button
                  type="button"
                  onClick={() => setIsOcrModalOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Decorative background gradient glow */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex gap-4 items-start mb-6 w-full">
                <div className="p-3 bg-pink-500/15 rounded-2xl border border-pink-500/20 shrink-0">
                  <Sparkles className="w-6 h-6 text-pink-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-snug">
                    AI Optical Character Recognition (OCR) Scanner
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Analyzing raw pixels through Gemini 2.5 Intelligence Engine to extract machine-readable texts.
                  </p>
                </div>
              </div>

              {isOcrLoading ? (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-12 h-12 rounded-full border-2 border-pink-500/20 animate-ping" />
                    <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Analyzing Layout Layers</p>
                    <p className="text-[10px] text-gray-500">Transcribing and structure mapping. Please wait...</p>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-[#09090e] border border-white/5 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
                      <span>Source Thumbnail (Page {ocrTargetIndex !== null ? ocrTargetIndex + 1 : ""})</span>
                      <span className="text-pink-400 font-bold uppercase text-[9px] tracking-wider bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded">Transcription Complete</span>
                    </div>
                    {ocrTargetIndex !== null && images[ocrTargetIndex] && (
                      <div className="flex items-center gap-4 bg-[#1a1a2e] p-2 rounded-xl">
                        <img 
                          src={images[ocrTargetIndex]} 
                          alt="OCR Scanned Segment" 
                          className="w-14 h-14 rounded-md object-cover border border-white/10" 
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-300 font-mono truncate">Page_{ocrTargetIndex + 1}_Source.jpg</p>
                          <p className="text-[10px] text-gray-500 font-mono">Rendered Base64 stream processed.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Extracted OCR Transcription Text</label>
                    <textarea
                      value={ocrTextResult}
                      onChange={(e) => setOcrTextResult(e.target.value)}
                      className="w-full h-48 bg-[#09090e] border border-white/10 rounded-2xl p-3.5 text-xs text-gray-200 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all font-mono resize-none leading-relaxed custom-scrollbar"
                      placeholder="Extracted character text will display here..."
                    />
                  </div>

                  {/* Actions buttons footer */}
                  <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        if (ocrTextResult.trim()) {
                          setPdfMetadataTitle(ocrTextResult.trim().slice(0, 45));
                          showToast("Copied subset of OCR text into document title metadata properties!", "success");
                        }
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[11px] font-bold text-gray-300 rounded-xl transition-all border border-white/5 cursor-pointer"
                    >
                      Use as Document Title
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(ocrTextResult);
                        showToast("Extracted transcription copied to clipboard!", "success");
                      }}
                      className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-[11px] font-bold text-blue-300 rounded-xl transition-all border border-blue-500/20 cursor-pointer"
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOcrModalOpen(false)}
                      className="px-5 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-[11px] font-bold text-white rounded-xl transition-all cursor-pointer"
                    >
                      Close Overlay
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
