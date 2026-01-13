import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Image, Pencil, Undo, Trash2, Send, X, User } from "lucide-react";

interface ChatPhotoUploadProps {
  onSendPhoto: (photoData: { url: string; markupData?: any; contactId?: number }) => void;
  disabled?: boolean;
}

export default function ChatPhotoUpload({ onSendPhoto, disabled }: ChatPhotoUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"select" | "camera" | "edit">("select");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: contacts } = useQuery({ queryKey: ["/api/contacts"] });

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode("camera");
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setCapturedImage(dataUrl);
      stopCamera();
      setMode("edit");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
      setMode("edit");
    };
    reader.readAsDataURL(file);
  };

  const handleUndo = () => {
    canvasRef.current?.undo();
  };

  const handleClearDrawing = () => {
    canvasRef.current?.clearCanvas();
  };

  const handleSend = async () => {
    if (!capturedImage) return;

    let finalImageUrl = capturedImage;

    // If drawing mode was active, export the canvas with drawings
    if (isDrawing && canvasRef.current) {
      try {
        const exportedImage = await canvasRef.current.exportImage("png");
        if (exportedImage) {
          finalImageUrl = exportedImage;
        }
      } catch (err) {
        console.error("Export error:", err);
      }
    }

    onSendPhoto({
      url: finalImageUrl,
      contactId: selectedContactId ? parseInt(selectedContactId) : undefined,
    });
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setMode("select");
    setIsDrawing(false);
    setSelectedContactId("");
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        title="Send photo"
      >
        <Image className="w-5 h-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {mode === "select" && "Add Photo"}
              {mode === "camera" && "Take Photo"}
              {mode === "edit" && "Edit Photo"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {/* Selection Mode */}
            {mode === "select" && (
              <div className="grid grid-cols-2 gap-4 p-4">
                <Button
                  variant="outline"
                  className="h-32 flex flex-col gap-2"
                  onClick={startCamera}
                >
                  <Camera className="w-8 h-8" />
                  <span>Take Photo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-32 flex flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8" />
                  <span>Upload Photo</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {/* Camera Mode */}
            {mode === "camera" && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { stopCamera(); setMode("select"); }}>
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                  <Button onClick={capturePhoto}>
                    <Camera className="w-4 h-4 mr-2" /> Capture
                  </Button>
                </div>
              </div>
            )}

            {/* Edit Mode */}
            {mode === "edit" && capturedImage && (
              <div className="flex flex-col gap-4">
                <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                  {isDrawing ? (
                    <ReactSketchCanvas
                      ref={canvasRef}
                      strokeWidth={4}
                      strokeColor="red"
                      backgroundImage={capturedImage}
                      preserveBackgroundImageAspectRatio="xMidYMid meet"
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <img
                      src={capturedImage}
                      alt="Captured"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* Contact Selector */}
                {contacts && (contacts as any[]).length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4" /> Link to Contact (optional)
                    </Label>
                    <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No contact</SelectItem>
                        {(contacts as any[]).map((contact: any) => (
                          <SelectItem key={contact.id} value={contact.id.toString()}>
                            {contact.firstName} {contact.lastName}
                            {contact.company && ` - ${contact.company}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex gap-2">
                    <Button
                      variant={isDrawing ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsDrawing(!isDrawing)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      {isDrawing ? "Drawing On" : "Draw"}
                    </Button>
                    {isDrawing && (
                      <>
                        <Button variant="outline" size="sm" onClick={handleUndo}>
                          <Undo className="w-4 h-4 mr-2" /> Undo
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleClearDrawing}>
                          <Trash2 className="w-4 h-4 mr-2" /> Clear
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setCapturedImage(null); setMode("select"); setIsDrawing(false); }}>
                      <X className="w-4 h-4 mr-2" /> Retake
                    </Button>
                    <Button onClick={handleSend}>
                      <Send className="w-4 h-4 mr-2" /> Send
                    </Button>
                  </div>
                </div>

                {isDrawing && (
                  <p className="text-sm text-muted-foreground text-center">
                    Draw on the image with your finger or mouse. Lines will appear in red.
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
