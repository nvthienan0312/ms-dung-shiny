"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { RefreshCw, ExternalLink, Smartphone } from "lucide-react";

interface QRCodeRendererProps {
  value: string;
  size?: number;
  className?: string;
  label?: string;
}

export default function QRCodeRenderer({
  value,
  size = 220,
  className = "",
  label,
}: QRCodeRendererProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size * 2, // 2x resolution for retina / crisp scanning
      margin: 2, // Standard quiet zone for fast scanning
      errorCorrectionLevel: "H", // High: allows 30% error correction
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        setDataUrl(url);
        setError(null);
      })
      .catch((err) => {
        console.error("QR Code generation error:", err);
        setError("Không thể tạo mã QR");
      });
  }, [value, size]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Khung mã QR chuẩn: Tuyệt đối không có bất kỳ layer nào che lên mã QR */}
      <div 
        className="bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-sm flex items-center justify-center"
        style={{ width: size + 24, height: size + 24 }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Mã QR Zalo"
            width={size}
            height={size}
            className="block select-none"
            style={{ width: size, height: size, imageRendering: "pixelated" }}
          />
        ) : error ? (
          <div className="text-xs text-red-500 font-semibold p-4 text-center">
            {error}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-[11px]">Đang tạo mã QR...</span>
          </div>
        )}
      </div>

      {label && (
        <span className="text-xs text-slate-500 font-medium mt-2 text-center max-w-xs">
          {label}
        </span>
      )}
    </div>
  );
}
