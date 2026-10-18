
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, Radio } from "lucide-react";

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

export default function VoicePlayer({
  src,
  transcript = "",
  type = "Codec2",
  status = "RECEIVED",
}) {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const animationRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const [bars, setBars] = useState(() => Array(32).fill(0.15));

  const normalizedStatus = String(status).toUpperCase();
  const lost = normalizedStatus === "LOST";
  const partial = normalizedStatus === "PARTIAL";
  const disabled = lost || error || !src;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime || 0);
      if (partial && duration > 0 && audio.currentTime >= duration * 0.6) {
        audio.pause();
        audio.currentTime = duration * 0.6;
        setCurrentTime(audio.currentTime);
        setPlaying(false);
      }
    };

    const updateDuration = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onError = () => setError(true);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [partial, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playing) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    let cancelled = false;

    const animate = () => {
      if (cancelled) return;

      const analyser = analyserRef.current;
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        setBars(
          Array.from({ length: 32 }, (_, i) => {
            const index = Math.floor((i / 32) * data.length);
            return Math.max(0.12, data[index] / 255);
          })
        );
      } else {
        setBars(
          Array.from({ length: 32 }, () => 0.15 + Math.random() * 0.75)
        );
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Try to attach a Web Audio analyser for a live waveform.
    try {
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;

        if (AudioContextClass) {
          const context = new AudioContextClass();
          const analyser = context.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.8;

          const source = context.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(context.destination);

          audioContextRef.current = context;
          analyserRef.current = analyser;
          sourceNodeRef.current = source;
        }
      }

      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
    } catch {
      // Pseudo-random waveform remains available if Web Audio is blocked.
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || disabled) return;

    if (playing) {
      audio.pause();
      return;
    }

    try {
      if (partial && duration > 0 && audio.currentTime >= duration * 0.6) {
        audio.currentTime = 0;
      }
      await audio.play();
    } catch {
      setError(true);
      setPlaying(false);
    }
  };

  const seek = (event) => {
    const audio = audioRef.current;
    if (!audio || disabled || !duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width)
    );
    const limit = partial ? duration * 0.6 : duration;
    audio.currentTime = fraction * limit;
    setCurrentTime(audio.currentTime);
  };

  const progress =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <section
      style={{
        width: "100%",
        maxWidth: 440,
        boxSizing: "border-box",
        padding: 16,
        borderRadius: 14,
        border: "1px solid #493044",
        background: "#19141f",
        color: "#f6eaf0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <audio
        ref={audioRef}
        src={src || undefined}
        preload="metadata"
      />

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Radio size={18} color="#f1a0b8" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              SATELLITE VOICE
            </div>
            <div style={{ fontSize: 10, color: "#c3aebb", marginTop: 3 }}>
              {type} · 3200 bps
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "5px 8px",
            borderRadius: 20,
            color: lost ? "#fca5a5" : partial ? "#fbbf24" : "#86efac",
            background: lost
              ? "rgba(239,68,68,0.12)"
              : partial
                ? "rgba(245,158,11,0.12)"
                : "rgba(34,197,94,0.12)",
          }}
        >
          {lost ? "LOST" : partial ? "PARTIAL" : "RECEIVED"}
        </span>
      </header>

      <div
        style={{
          display: "flex",
          height: 58,
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          overflow: "hidden",
          marginBottom: 14,
        }}
        aria-label="Audio waveform"
      >
        {bars.map((level, index) => (
          <span
            key={index}
            style={{
              display: "block",
              flex: "1 1 0",
              maxWidth: 7,
              height: `${Math.max(12, level * 52)}px`,
              borderRadius: 4,
              background: playing
                ? "#f1a0b8"
                : index < (progress / 100) * bars.length
                  ? "#d47d9d"
                  : "#493044",
              opacity: playing ? 0.9 : 0.65,
              transition: "height 100ms linear",
            }}
          />
        ))}
      </div>

      <div
        role="slider"
        aria-label="Seek audio"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime}
        tabIndex={disabled ? -1 : 0}
        onClick={seek}
        onKeyDown={(event) => {
          const audio = audioRef.current;
          if (!audio || disabled || !duration) return;
          if (event.key === "ArrowRight") audio.currentTime += 1;
          if (event.key === "ArrowLeft") audio.currentTime -= 1;
        }}
        style={{
          height: 6,
          borderRadius: 8,
          background: "#493044",
          cursor: disabled ? "default" : "pointer",
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "#f1a0b8",
            borderRadius: 8,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "#c3aebb",
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <button
        type="button"
        onClick={togglePlayback}
        disabled={disabled}
        aria-label={playing ? "Pause audio" : "Play audio"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          marginTop: 15,
          padding: "11px 14px",
          borderRadius: 10,
          border: "1px solid #d47d9d",
          background: disabled ? "#302532" : "#d47d9d",
          color: disabled ? "#b5a2b0" : "#1b1119",
          fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {playing ? <Pause size={17} /> : <Play size={17} />}
        {playing ? "Pause transmission" : "Play transmission"}
        <Volume2 size={16} />
      </button>

      {transcript && (
        <blockquote
          style={{
            margin: "16px 0 0",
            padding: "12px 13px",
            borderLeft: "3px solid #d47d9d",
            borderRadius: "0 8px 8px 0",
            background: "#241b29",
            color: "#ead8e2",
            fontSize: 12,
            lineHeight: 1.6,
            fontStyle: "italic",
          }}
        >
          “{transcript}”
        </blockquote>
      )}

      {lost && (
        <p style={{ color: "#fca5a5", fontSize: 12, marginBottom: 0 }}>
          Packet lost. Re-queued for retransmission.
        </p>
      )}

      {partial && !lost && (
        <p style={{ color: "#fbbf24", fontSize: 11, marginBottom: 0 }}>
          Partial packet · playback stops at 60%
        </p>
      )}

      {(error || !src) && !lost && (
        <p style={{ color: "#fca5a5", fontSize: 12, marginBottom: 0 }}>
          Audio unavailable
        </p>
      )}
    </section>
  );
}
