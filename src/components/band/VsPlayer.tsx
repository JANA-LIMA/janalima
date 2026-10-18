import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtTime } from "@/lib/band";

/** Custom player: streams the private VS file through a short-lived signed URL, no download controls. */
export function VsPlayer({ path }: { path: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    let alive = true;
    supabase.storage
      .from("vs")
      .createSignedUrl(path, 60 * 10)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setErr("Não foi possível carregar o VS.");
        else setSrc(data.signedUrl);
      });
    return () => {
      alive = false;
    };
  }, [path]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  if (err) return <p className="text-sm text-destructive">{err}</p>;

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-accent to-card p-4" onContextMenu={(e) => e.preventDefault()}>
      {src && (
        <audio
          ref={audio}
          src={src}
          preload="metadata"
          controlsList="nodownload noplaybackrate"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          className="hidden"
        />
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={!src}
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-axe text-primary-foreground shadow-glow disabled:opacity-50"
          aria-label={playing ? "Pausar" : "Tocar"}
        >
          {playing ? <Pause className="size-6" /> : <Play className="ml-1 size-6" />}
        </button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={dur || 0}
            step={0.1}
            value={t}
            onChange={(e) => {
              if (audio.current) audio.current.currentTime = Number(e.target.value);
            }}
            className="w-full accent-primary"
            aria-label="Posição"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{fmtTime(t)}</span>
            <span>{dur ? fmtTime(dur) : "--:--"}</span>
          </div>
        </div>
        <button
          onClick={() => audio.current && (audio.current.currentTime = 0)}
          className="p-2 text-muted-foreground"
          aria-label="Voltar ao início"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  );
}
