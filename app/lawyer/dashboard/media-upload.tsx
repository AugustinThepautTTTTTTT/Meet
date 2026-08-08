"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";

export default function MediaUpload({
  label,
  purpose,
  value,
  shape = "wide",
  onChange,
  settings,
  onSettings,
}: {
  label: string;
  purpose: string;
  value: string;
  shape?: "wide" | "portrait";
  onChange: (url: string) => void;
  settings?: { position: number; zoom: number };
  onSettings?: (settings: { position: number; zoom: number }) => void;
}) {
  const [status, setStatus] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Uploading…");
    const form = new FormData();
    form.set("file", file);
    form.set("purpose", purpose);
    const response = await fetch("/api/uploads", {
      method: "POST",
      body: form,
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Upload failed");
      return;
    }
    onChange(data.url);
    setStatus("Uploaded ✓");
  }
  return (
    <div className={`media-upload ${shape}`}>
      {value ? (
        <Image
          src={value}
          alt=""
          fill
          sizes={shape === "portrait" ? "160px" : "600px"}
          unoptimized
          style={{
            objectPosition: `50% ${settings?.position ?? 50}%`,
            transform: `scale(${(settings?.zoom ?? 100) / 100})`,
          }}
        />
      ) : (
        <div className="media-placeholder">
          <span>＋</span>
          <small>{label}</small>
        </div>
      )}
      <label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={upload}
        />
        <span>{value ? "Replace image" : `Upload ${label.toLowerCase()}`}</span>
      </label>
      {status ? <small className="upload-status">{status}</small> : null}
      {value && settings && onSettings ? (
        <div className="media-adjust">
          <label>
            Position
            <input
              type="range"
              min="0"
              max="100"
              value={settings.position}
              onChange={(e) =>
                onSettings({ ...settings, position: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Zoom
            <input
              type="range"
              min="100"
              max="180"
              value={settings.zoom}
              onChange={(e) =>
                onSettings({ ...settings, zoom: Number(e.target.value) })
              }
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
