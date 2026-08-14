"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";
import ImageCropper, { type CropSettings } from "./image-cropper";

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
  settings?: Partial<CropSettings> & { position?: number; zoom: number };
  onSettings?: (settings: CropSettings) => void;
}) {
  const [status, setStatus] = useState("");
  const [cropping, setCropping] = useState(false);
  const normalized: CropSettings = {
    x: settings?.x ?? 50,
    y: settings?.y ?? settings?.position ?? 50,
    zoom: settings?.zoom ?? 100,
  };
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
    <div className={`media-upload ${shape} ${value ? "has-image" : ""}`}>
      {value ? (
        <Image
          src={value}
          alt=""
          fill
          sizes={shape === "portrait" ? "160px" : "600px"}
          unoptimized
          style={{
            objectPosition: `${normalized.x}% ${normalized.y}%`,
            transform: `scale(${normalized.zoom / 100})`,
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
      {value && onSettings ? (
        <button className="open-crop" onClick={() => setCropping(true)}>
          ⛶ Edit crop
        </button>
      ) : null}
      {cropping && value && onSettings ? (
        <ImageCropper
          url={value}
          title={`Adjust ${label.toLowerCase()}`}
          initial={normalized}
          onCancel={() => setCropping(false)}
          onApply={(next) => {
            onSettings(next);
            setCropping(false);
          }}
        />
      ) : null}
    </div>
  );
}
