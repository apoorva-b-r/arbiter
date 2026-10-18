
import { useEffect, useRef, useState } from "react";

const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 256;
const SCAN_DURATION = 1500;

export default function SstvImage({
  src,
  quality = 90,
  status = "RECEIVED",
  caption = "",
  width = 320,
}) {
  const canvasRef = useRef(null);
  const [imageError, setImageError] = useState(false);

  const safeQuality = Math.max(0, Math.min(100, Number(quality) || 0));
  const normalizedStatus = String(status).toUpperCase();
  const lost = normalizedStatus === "LOST";
  const partial = normalizedStatus === "PARTIAL";

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let frameId;
    let startTime;
    let cancelled = false;
    let image = null;
    let cutoff = 1;

    const random = (min, max) => min + Math.random() * (max - min);

    const drawStatic = (top, height, intensity = 1) => {
      if (height <= 0) return;

      const imageData = ctx.createImageData(FRAME_WIDTH, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.floor(random(45, 220) * intensity);
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 255;
      }

      ctx.putImageData(imageData, 0, top);
    };

    const drawLost = (time) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, FRAME_HEIGHT);
      gradient.addColorStop(0, "#29232f");
      gradient.addColorStop(1, "#110f17");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

      drawStatic(0, FRAME_HEIGHT, 0.7);

      ctx.fillStyle = "rgba(15, 12, 20, 0.72)";
      ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

      ctx.fillStyle = "#f1a0b8";
      ctx.font = "bold 19px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("NO SIGNAL", FRAME_WIDTH / 2, FRAME_HEIGHT / 2);

      ctx.fillStyle = "#e4cbd5";
      ctx.font = "11px monospace";
      ctx.fillText(
        "PACKET LOST",
        FRAME_WIDTH / 2,
        FRAME_HEIGHT / 2 + 24
      );

      if (!cancelled) {
        frameId = requestAnimationFrame(drawLost);
      }
    };

    const drawUnavailable = () => {
      const gradient = ctx.createLinearGradient(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      gradient.addColorStop(0, "#29232f");
      gradient.addColorStop(1, "#15121b");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

      ctx.fillStyle = "#f1a0b8";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Image unavailable", FRAME_WIDTH / 2, FRAME_HEIGHT / 2);
    };

    const drawImageFrame = (time) => {
      if (cancelled || !image) return;

      if (startTime === undefined) startTime = time;

      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / SCAN_DURATION);
      const revealedHeight = Math.floor(progress * FRAME_HEIGHT);

      ctx.fillStyle = "#17131d";
      ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

      if (partial) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, FRAME_WIDTH, Math.floor(FRAME_HEIGHT * cutoff));
        ctx.clip();
        ctx.drawImage(image, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        ctx.restore();

        if (revealedHeight < FRAME_HEIGHT * cutoff) {
          ctx.fillStyle = "rgba(17, 13, 22, 0.96)";
          ctx.fillRect(
            0,
            revealedHeight,
            FRAME_WIDTH,
            Math.max(0, FRAME_HEIGHT * cutoff - revealedHeight)
          );
        }

        const staticTop = Math.max(
          0,
          Math.floor(FRAME_HEIGHT * cutoff)
        );
        drawStatic(staticTop, FRAME_HEIGHT - staticTop, 0.8);
      } else {
        ctx.drawImage(image, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

        if (revealedHeight < FRAME_HEIGHT) {
          ctx.fillStyle = "rgba(17, 13, 22, 0.97)";
          ctx.fillRect(
            0,
            revealedHeight,
            FRAME_WIDTH,
            FRAME_HEIGHT - revealedHeight
          );
        }
      }

      // Signal degradation: more noise at lower quality.
      const noiseAmount = 1 - safeQuality / 100;
      if (noiseAmount > 0 && revealedHeight > 0) {
        const count = Math.floor(noiseAmount * 1800);

        for (let i = 0; i < count; i++) {
          const x = Math.floor(random(0, FRAME_WIDTH));
          const y = Math.floor(random(0, revealedHeight));
          const shade = random(100, 255);

          ctx.fillStyle = `rgba(${shade}, ${shade * 0.72}, ${shade * 0.9}, ${noiseAmount * 0.45})`;
          ctx.fillRect(x, y, random(1, 4), random(1, 2));
        }

        ctx.fillStyle = `rgba(219, 105, 151, ${noiseAmount * 0.08})`;
        ctx.fillRect(0, 0, FRAME_WIDTH, revealedHeight);
      }

      // Horizontal scan lines, spaced two pixels apart.
      ctx.fillStyle = "rgba(12, 8, 17, 0.18)";
      for (let y = 0; y < FRAME_HEIGHT; y += 2) {
        ctx.fillRect(0, y, FRAME_WIDTH, 1);
      }

      // Current scan position.
      if (progress < 1) {
        ctx.fillStyle = "rgba(255, 173, 204, 0.85)";
        ctx.fillRect(0, revealedHeight, FRAME_WIDTH, 1);
        frameId = requestAnimationFrame(drawImageFrame);
      }
    };

    if (lost) {
      frameId = requestAnimationFrame(drawLost);
    } else if (!src) {
      drawUnavailable();
    } else {
      cutoff = partial ? random(0.4, 0.75) : 1;

      image = new Image();
      image.crossOrigin = "anonymous";

      image.onload = () => {
        if (!cancelled) {
          startTime = undefined;
          frameId = requestAnimationFrame(drawImageFrame);
        }
      };

      image.onerror = () => {
        if (!cancelled) {
          setImageError(true);
          drawUnavailable();
        }
      };

      setImageError(false);
      image.src = src;
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      if (image) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [src, safeQuality, normalizedStatus, lost, partial]);

  return (
    <div
      style={{
        width: `min(100%, ${width}px)`,
        color: "#f6eaf0",
        background: "#19141f",
        border: "1px solid #493044",
        borderRadius: 12,
        padding: 10,
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          fontSize: 10,
          letterSpacing: 1,
          color: "#f1a0b8",
          fontWeight: 700,
        }}
      >
        <span>SSTV DOWNLINK</span>
        <span>{normalizedStatus}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={FRAME_WIDTH}
        height={FRAME_HEIGHT}
        role="img"
        aria-label={caption || "SSTV satellite image"}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          aspectRatio: "5 / 4",
          background: "#17131d",
          borderRadius: 6,
          imageRendering: "auto",
        }}
      />

      {caption && (
        <p
          style={{
            margin: "9px 0 5px",
            fontSize: 12,
            lineHeight: 1.4,
            color: "#f6eaf0",
          }}
        >
          {caption}
        </p>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          fontSize: 10,
          color: "#c3aebb",
          borderTop: "1px solid #493044",
          paddingTop: 8,
          marginTop: 6,
        }}
      >
        <span>SSTV · Martin M1 · 320×256</span>
        <span>Q {safeQuality}%</span>
      </div>

      {imageError && (
        <span style={{ display: "none" }}>Image unavailable</span>
      )}
    </div>
  );
}
