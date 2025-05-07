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
      style={{
        zIndex: 150,
        backgroundColor: "#000000", // Fondo negro para el contenedor del player
        overflow: "hidden" // Asegura que el contenido no se desborde del contenedor
      }}
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
        overflowVisible={false} // Cambiado a false para evitar que se vea el contenido que se sale
        style={{
          // Añadir un sutil efecto de brillo al borde durante la reproducción
          boxShadow: isPlaying
            ? '0 0 0 1px rgba(156, 90, 250, 0.5), 0 0 10px rgba(156, 90, 250, 0.2)'
            : 'none',
          transition: 'box-shadow 0.3s ease-in-out',
          position: 'relative',
          zIndex: 200,
          backgroundColor: "#000000", // Fondo negro para el player
          overflow: "hidden" // Añadido para recortar el contenido
        }}
      />

      {/* Indicador de esquina (sutil) - mantener para efectos decorativos */}
      <div
        className={`absolute top-0 left-0 w-16 h-16 pointer-events-none transition-opacity duration-300 ${isHovering || isPlaying ? 'opacity-30' : 'opacity-0'}`}
        style={{
          background: 'linear-gradient(135deg, rgba(156, 90, 250, 0.4) 0%, transparent 70%)',
          zIndex: 210, // Asegurar que esté por encima del player
        }}
      />

      {/* Decoración de las esquinas - visible siempre */}
      <div
        className="absolute top-0 left-0 w-12 h-12 pointer-events-none"
        style={{
          borderTop: '2px solid rgba(156, 90, 250, 0.7)',
          borderLeft: '2px solid rgba(156, 90, 250, 0.7)',
          borderTopLeftRadius: '4px',
          zIndex: 210,
        }}
      />
      <div
        className="absolute top-0 right-0 w-12 h-12 pointer-events-none"
        style={{
          borderTop: '2px solid rgba(156, 90, 250, 0.7)',
          borderRight: '2px solid rgba(156, 90, 250, 0.7)',
          borderTopRightRadius: '4px',
          zIndex: 210,
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-12 h-12 pointer-events-none"
        style={{
          borderBottom: '2px solid rgba(156, 90, 250, 0.7)',
          borderLeft: '2px solid rgba(156, 90, 250, 0.7)',
          borderBottomLeftRadius: '4px',
          zIndex: 210,
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none"
        style={{
          borderBottom: '2px solid rgba(156, 90, 250, 0.7)',
          borderRight: '2px solid rgba(156, 90, 250, 0.7)',
          borderBottomRightRadius: '4px',
          zIndex: 210,
        }}
      />
    </div>
  );
};

export default Player;
