import { useEffect, useRef, useState } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";

const Player = () => {
  const playerRef = useRef<PlayerRef>(null);
  const { setPlayerRef, duration, fps, size } = useStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Efecto para actualizar el estado de reproducción
  useEffect(() => {
    if (!playerRef.current) return;

    const checkPlayState = () => {
      if (playerRef.current) {
        setIsPlaying(playerRef.current.isPlaying());
      }
    };

    // Verificar el estado inicial
    checkPlayState();

    // Configurar listeners para eventos del player
    const player = playerRef.current;
    player.addEventListener('play', checkPlayState);
    player.addEventListener('pause', checkPlayState);
    player.addEventListener('seeked', checkPlayState);
    player.addEventListener('ended', checkPlayState);

    return () => {
      // Limpiar listeners
      if (player) {
        player.removeEventListener('play', checkPlayState);
        player.removeEventListener('pause', checkPlayState);
        player.removeEventListener('seeked', checkPlayState);
        player.removeEventListener('ended', checkPlayState);
      }
    };
  }, [playerRef.current]);

  useEffect(() => {
    setPlayerRef(playerRef);
  }, []);

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ zIndex: 150 }}
    >
      {/* Indicador de reproducción */}
      {isPlaying && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md text-xs text-white">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>REC</span>
        </div>
      )}

      <RemotionPlayer
        ref={playerRef}
        component={Composition}
        durationInFrames={Math.round((duration / 1000) * fps) || 1}
        compositionWidth={size.width}
        compositionHeight={size.height}
        className="h-full w-full"
        fps={30}
        overflowVisible
        style={{
          // Añadir un sutil efecto de brillo al borde durante la reproducción
          boxShadow: isPlaying
            ? '0 0 0 1px rgba(156, 90, 250, 0.5), 0 0 10px rgba(156, 90, 250, 0.2)'
            : 'none',
          transition: 'box-shadow 0.3s ease-in-out',
          position: 'relative',
          zIndex: 200,
        }}
      />

      {/* Indicador de esquina (sutil) */}
      <div
        className={`absolute top-0 left-0 w-16 h-16 pointer-events-none transition-opacity duration-300 ${isHovering || isPlaying ? 'opacity-30' : 'opacity-0'}`}
        style={{
          background: 'linear-gradient(135deg, rgba(156, 90, 250, 0.4) 0%, transparent 70%)',
          zIndex: 10,
        }}
      />

      {/* Reflejo inferior (efecto de cristal) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none opacity-10"
        style={{
          background: 'linear-gradient(to top, rgba(255, 255, 255, 0.15), transparent)',
          transform: 'translateY(50%) scaleY(0.5)',
          filter: 'blur(5px)',
          zIndex: 10,
        }}
      />
    </div>
  );
};

export default Player;
