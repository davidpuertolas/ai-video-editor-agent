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

// Estilos CSS para el fondo con patrón de gradiente
const wandsBackgroundStyle = {
  background: `linear-gradient(135deg, #18141f 22px, #211a2c 22px, #211a2c 24px, transparent 24px, transparent 67px, #211a2c 67px, #211a2c 69px, transparent 69px),
               linear-gradient(225deg, #18141f 22px, #211a2c 22px, #211a2c 24px, transparent 24px, transparent 67px, #211a2c 67px, #211a2c 69px, transparent 69px)`,
  backgroundColor: '#18141f',
  backgroundSize: '64px 64px',
};

export default function Scene({
  stateManager,
}: {
  stateManager: StateManager;
}) {
  const viewerRef = useRef<Viewer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { size, trackItemIds } = useStore();
  const { zoom, handlePinch } = useZoom(containerRef, viewerRef, size);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        flex: 1,
      }}
      ref={containerRef}
    >
      {trackItemIds.length === 0 && <SceneEmpty />}
      <Viewer
        ref={viewerRef}
        className="player-container"
        style={wandsBackgroundStyle}
        displayHorizontalScroll={false}
        displayVerticalScroll={false}
        zoom={zoom}
        usePinch={true}
        pinchThreshold={50}
        onPinch={handlePinch}
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
    </div>
  );
}
