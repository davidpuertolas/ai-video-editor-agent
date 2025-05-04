"use client";

import { Player } from "../player";
import Viewer from "@interactify/infinite-viewer";
import { useRef, useEffect } from "react";
import useStore from "../store/use-store";
import StateManager from "@designcombo/state";
import SceneEmpty from "./empty";
import SceneBoard from "./board";
import useZoom from "../hooks/use-zoom";
import { SceneInteractions } from "./interactions";

// Estilos CSS para un fondo más moderno
const modernBackgroundStyle = {
  background: `radial-gradient(circle at center, rgba(36, 16, 60, 0.8) 0%, rgba(21, 10, 36, 0.9) 70%, rgba(13, 6, 22, 1) 100%)`,
  backgroundSize: '100% 100%',
  boxShadow: 'inset 0 0 100px rgba(98, 33, 234, 0.15)',
};

// Estilos para el grid
const gridStyle = {
  backgroundImage: `
    linear-gradient(to right, rgba(156, 90, 250, 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(156, 90, 250, 0.07) 1px, transparent 1px)
  `,
  backgroundSize: '40px 40px',
  backgroundPosition: 'center center',
};

// Estilos para las líneas de guía principales
const accentLinesStyle = {
  backgroundImage: `
    linear-gradient(to right, rgba(156, 90, 250, 0.12) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(156, 90, 250, 0.12) 1px, transparent 1px)
  `,
  backgroundSize: '200px 200px',
  backgroundPosition: 'center center',
};

// Añadimos un estilo de CSS directamente en el componente para las animaciones
const gridAnimationStyle = `
@keyframes pulseGrid {
  0% { opacity: 0.5; }
  50% { opacity: 0.7; }
  100% { opacity: 0.5; }
}

@keyframes rotateSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes shimmerLines {
  0% { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}

.grid-pulse {
  animation: pulseGrid 10s ease-in-out infinite;
}

.rotating-bg {
  animation: rotateSlow 120s linear infinite;
}

.shimmer-line {
  background-size: 200% 100%;
  animation: shimmerLines 6s linear infinite;
}
`;

export default function Scene({
  stateManager,
}: {
  stateManager: StateManager;
}) {
  const viewerRef = useRef<Viewer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { size, trackItemIds } = useStore();
  const { zoom, handlePinch, centerCanvas } = useZoom(containerRef, viewerRef, size);

  // Asegurar que el canvas permanezca centrado en caso de interacción
  useEffect(() => {
    const viewer = viewerRef.current?.infiniteViewer;
    if (!viewer) return;

    const handleMouseUp = () => {
      // Cuando el usuario suelte el mouse, re-centrar el canvas
      setTimeout(() => centerCanvas(), 50);
    };

    // Limitar el desplazamiento manual y re-centrar al finalizar
    const container = viewer.getContainer();
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchend', handleMouseUp);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchend', handleMouseUp);
    };
  }, [centerCanvas]);

  // Calcular dinámicamente el tamaño del grid basado en el tamaño de la ventana
  useEffect(() => {
    const updateGridSize = () => {
      const gridElements = document.querySelectorAll('.dynamic-grid');
      const windowWidth = window.innerWidth;

      // Ajustar tamaño del grid basado en el ancho de la ventana
      let gridSize = '40px';
      if (windowWidth < 768) {
        gridSize = '30px'; // Más pequeño para móviles
      } else if (windowWidth > 1920) {
        gridSize = '50px'; // Más grande para pantallas muy grandes
      }

      gridElements.forEach((el: HTMLElement) => {
        if (el.style.backgroundSize) {
          el.style.backgroundSize = `${gridSize} ${gridSize}`;
        }
      });
    };

    updateGridSize();
    window.addEventListener('resize', updateGridSize);

    return () => {
      window.removeEventListener('resize', updateGridSize);
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        flex: 1,
        overflow: "hidden", // Importante: evita que el contenido se salga del contenedor
      }}
      ref={containerRef}
    >
      {/* Añadir estilos de animación */}
      <style>{gridAnimationStyle}</style>

      {/* Capa de fondo con efecto visual */}
      <div
        className="absolute inset-0"
        style={{
          ...modernBackgroundStyle,
          zIndex: 0
        }}
      />

      {/* Grid de fondo futurista */}
      <div
        className="absolute inset-0 opacity-60 grid-pulse dynamic-grid"
        style={{
          ...gridStyle,
          zIndex: 1
        }}
      />

      {/* Líneas de acento más prominentes */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          ...accentLinesStyle,
          zIndex: 1
        }}
      />

      {/* Efecto de perspectiva para el grid */}
      <div className="absolute inset-0 pointer-events-none"
           style={{
             backgroundImage: 'radial-gradient(circle at center, transparent 0%, rgba(13, 6, 22, 0.5) 80%)',
             zIndex: 1
           }}
      />


      {/* Líneas cruzadas diagonales */}
      <div className="absolute inset-0 pointer-events-none opacity-10"
           style={{
             backgroundImage: `
               linear-gradient(45deg, rgba(156, 90, 250, 0.2) 0%, transparent 40%),
               linear-gradient(135deg, rgba(156, 90, 250, 0.2) 0%, transparent 40%)
             `,
             zIndex: 1
           }}
      />

      <Viewer
        ref={viewerRef}
        className="player-container"
        style={{
          position: "relative",
          zIndex: 100,
        }}
        displayHorizontalScroll={false}
        displayVerticalScroll={false}
        zoom={zoom}
        usePinch={false}
        pinchThreshold={999}
        onPinch={handlePinch}
        // Limitar el movimiento al implementar límites de desplazamiento
        onScroll={(e) => {
          // Verificar que e y sus propiedades son accesibles antes de usarlas
          if (!e || typeof e.scrollLeft === 'undefined' || typeof e.scrollTop === 'undefined') {
            // Si no están disponibles, simplemente re-centramos
            setTimeout(() => centerCanvas(), 0);
            return;
          }

          // Si el desplazamiento supera ciertos límites, re-centrar
          const scrollLeft = e.scrollLeft;
          const scrollTop = e.scrollTop;
          const maxScroll = 150; // Límite de desplazamiento permitido

          if (Math.abs(scrollLeft) > maxScroll || Math.abs(scrollTop) > maxScroll) {
            setTimeout(() => centerCanvas(), 0);
          }
        }}
      >
        <SceneBoard size={size}>
          <Player />
          <SceneInteractions
            stateManager={stateManager}
            viewerRef={viewerRef}
            containerRef={containerRef}
            zoom={zoom}
            size={size}
          />
        </SceneBoard>
      </Viewer>

      {/* Sombra decorativa para dar profundidad al canvas - Ahora por DEBAJO del canvas */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 70px rgba(0, 0, 0, 0.5)',
          zIndex: 1
        }}
      />

      {/* Líneas de eje central - ahora por DEBAJO del canvas */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] pointer-events-none opacity-30 shimmer-line"
           style={{
             background: 'linear-gradient(to right, transparent, rgba(156, 90, 250, 0.8), transparent)',
             transform: 'translateX(-0.5px)',
             zIndex: 1
           }}
      />
      <div className="absolute top-1/2 left-0 right-0 h-[1px] pointer-events-none opacity-30 shimmer-line"
           style={{
             background: 'linear-gradient(to right, transparent, rgba(156, 90, 250, 0.8), transparent)',
             transform: 'translateY(-0.5px)',
             zIndex: 1
           }}
      />

      {/* Puntos de intersección destacados - ahora por DEBAJO del canvas */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(156, 90, 250, 0.3) 1px, transparent 1px)',
          backgroundSize: '200px 200px',
          backgroundPosition: 'center center',
          opacity: 0.5,
          zIndex: 1
        }}
      />

      {/* Marco decorativo en las esquinas - ahora por DEBAJO del canvas */}
      <div className="absolute top-4 left-4 w-16 h-16 pointer-events-none"
           style={{
             borderTop: '2px solid rgba(156, 90, 250, 1)',
             borderLeft: '2px solid rgba(156, 90, 250, 1)',
             opacity: 1,
             zIndex: 1
           }}
      />
      <div className="absolute top-4 right-4 w-16 h-16 pointer-events-none"
           style={{
             borderTop: '2px solid rgba(156, 90, 250, 1)',
             borderRight: '2px solid rgba(156, 90, 250, 1)',
             opacity: 1,
             zIndex: 1
           }}
      />
      <div className="absolute bottom-4 left-4 w-16 h-16 pointer-events-none"
           style={{
             borderBottom: '2px solid rgba(156, 90, 250, 1)',
             borderLeft: '2px solid rgba(156, 90, 250, 1)',
             opacity: 1,
             zIndex: 1
           }}
      />
      <div className="absolute bottom-4 right-4 w-16 h-16 pointer-events-none"
           style={{
             borderBottom: '2px solid rgba(156, 90, 250, 1)',
             borderRight: '2px solid rgba(156, 90, 250, 1)',
             opacity: 1,
             zIndex: 1
           }}
      />

      {/* SceneEmpty se mueve al final del componente para asegurar que esté en la capa superior */}
      {trackItemIds.length === 0 && <SceneEmpty />}
    </div>
  );
}
