import { ISize } from "@designcombo/types";
import { OnPinch } from "@interactify/infinite-viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import InfiniteViewer from "@interactify/infinite-viewer";

function useZoom(
  containerRef: React.RefObject<HTMLDivElement>,
  viewerRef: React.RefObject<InfiniteViewer>,
  size: ISize,
) {
  const [zoom, setZoom] = useState(0.01);
  const currentZoomRef = useRef(0.01);

  // Función para centrar el canvas
  const centerCanvas = useCallback(() => {
    if (viewerRef.current?.infiniteViewer) {
      viewerRef.current.infiniteViewer.scrollCenter();
    }
  }, [viewerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const PADDING = 96;
    const containerHeight = container.clientHeight - PADDING;
    const containerWidth = container.clientWidth - PADDING;
    const { width, height } = size;

    // Calcular el zoom que hace que el canvas sea 100% visible
    const desiredZoom = Math.min(
      containerWidth / width,
      containerHeight / height,
    );

    // Aplicar un pequeño margen de seguridad para que quede completamente visible
    const zoomWithMargin = desiredZoom * 0.95;

    // Actualizar el zoom
    currentZoomRef.current = zoomWithMargin;
    setZoom(zoomWithMargin);

    // Centrar el canvas después de cambiar el zoom
    setTimeout(() => {
      centerCanvas();
    }, 50);
  }, [size, containerRef, centerCanvas]);

  // Efectos para mantener el canvas centrado
  useEffect(() => {
    // Re-centrar el canvas cada vez que la ventana cambia de tamaño
    const handleResize = () => {
      centerCanvas();
    };

    window.addEventListener('resize', handleResize);

    // Periódicamente verificar y centrar el canvas para prevenir desplazamiento no deseado
    const intervalId = setInterval(() => {
      if (viewerRef.current?.infiniteViewer) {
        // Solo re-centrar si el desplazamiento está fuera de ciertos límites
        const container = containerRef.current;
        if (container) {
          const viewer = viewerRef.current.infiniteViewer;
          const viewerRect = viewer.getContainer().getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          // Si el centro del canvas está muy lejos del centro del contenedor, re-centrar
          const viewerCenterX = viewerRect.left + viewerRect.width / 2;
          const containerCenterX = containerRect.left + containerRect.width / 2;
          const viewerCenterY = viewerRect.top + viewerRect.height / 2;
          const containerCenterY = containerRect.top + containerRect.height / 2;

          if (Math.abs(viewerCenterX - containerCenterX) > 50 ||
              Math.abs(viewerCenterY - containerCenterY) > 50) {
            centerCanvas();
          }
        }
      }
    }, 5000); // Verificar cada 5 segundos

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(intervalId);
    };
  }, [viewerRef, containerRef, centerCanvas]);

  // Esta función desactiva el pinch/zoom para mantener la escena fija
  const handlePinch = useCallback((_: OnPinch) => {
    // Re-centrar inmediatamente para prevenir cualquier movimiento
    centerCanvas();
  }, [centerCanvas]);

  return { zoom, handlePinch, centerCanvas };
}

export default useZoom;
