import { useState, useCallback } from "react";

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const getUploadParameters = useCallback(async (file: { name: string; size: number; type: string }) => {
    const res = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const data = await res.json();
    return { method: "PUT" as const, url: data.uploadURL, headers: { "Content-Type": file.type } };
  }, []);

  return { isUploading, setIsUploading, getUploadParameters };
}
