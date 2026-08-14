"use client";

import Image from "next/image";
import { PointerEvent, useRef, useState } from "react";

export type CropSettings = {
  x: number;
  y: number;
  zoom: number;
  aspect?: "landscape" | "square" | "portrait";
};

export default function ImageCropper({
  url,
  initial,
  title,
  allowAspect = false,
  onCancel,
  onApply,
}: {
  url: string;
  initial: CropSettings;
  title: string;
  allowAspect?: boolean;
  onCancel: () => void;
  onApply: (settings: CropSettings) => void;
}) {
  const [settings, setSettings] = useState(initial);
  const start = useRef<{ x: number; y: number; sx: number; sy: number } | null>(
    null,
  );
  const aspect = allowAspect ? settings.aspect || "landscape" : "landscape";
  function down(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = {
      x: event.clientX,
      y: event.clientY,
      sx: settings.x,
      sy: settings.y,
    };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    setSettings((current) => ({
      ...current,
      x: Math.max(
        0,
        Math.min(
          100,
          start.current!.sx +
            ((event.clientX - start.current!.x) / box.width) * 100,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          100,
          start.current!.sy +
            ((event.clientY - start.current!.y) / box.height) * 100,
        ),
      ),
    }));
  }
  return (
    <div
      className="crop-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="crop-modal">
        <header>
          <div>
            <p className="section-kicker">Adjust image</p>
            <h2>{title}</h2>
          </div>
          <button onClick={onCancel} aria-label="Close">
            ×
          </button>
        </header>
        <div
          className={`crop-stage aspect-${aspect}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={() => (start.current = null)}
        >
          <Image
            src={url}
            alt="Crop preview"
            fill
            draggable={false}
            style={{
              objectFit: "cover",
              objectPosition: `${settings.x}% ${settings.y}%`,
              transform: `scale(${settings.zoom / 100})`,
            }}
            unoptimized
          />
          <div className="crop-grid" />
          <span>Drag to reposition</span>
        </div>
        <div className="crop-tools">
          <label>
            <span>Zoom</span>
            <input
              type="range"
              min="100"
              max="220"
              value={settings.zoom}
              onChange={(e) =>
                setSettings({ ...settings, zoom: Number(e.target.value) })
              }
            />
            <b>{settings.zoom}%</b>
          </label>
          {allowAspect ? (
            <div className="aspect-buttons">
              <span>Crop</span>
              {(["landscape", "square", "portrait"] as const).map((value) => (
                <button
                  className={aspect === value ? "active" : ""}
                  key={value}
                  onClick={() => setSettings({ ...settings, aspect: value })}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <footer>
          <button className="card-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="primary-button compact"
            onClick={() => onApply(settings)}
          >
            Apply crop <span>✓</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
