"use client";

import { dispatch } from "@designcombo/events";
import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO, DESIGN_RESIZE } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import React, { useCallback, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

enum AcceptedDropTypes {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
}

interface DraggedData {
  type: AcceptedDropTypes;
  [key: string]: any;
}

interface DroppableAreaProps {
  id: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onDragStateChange?: (isDraggingOver: boolean) => void;
}

const useDragAndDrop = (onDragStateChange?: (isDragging: boolean) => void) => {
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDrop = useCallback((draggedData: DraggedData) => {
    const payload = { ...draggedData, id: generateId() };

    switch (draggedData.type) {
      case AcceptedDropTypes.IMAGE:
        dispatch(ADD_IMAGE, { payload });
        break;
      case AcceptedDropTypes.VIDEO:
        // Para videos, verificamos primero las dimensiones
        if (payload.details?.src) {
          // Crear un elemento de video temporal para obtener las dimensiones
          const videoElement = document.createElement('video');
          videoElement.preload = 'metadata';

          videoElement.onloadedmetadata = () => {
            const videoWidth = videoElement.videoWidth;
            const videoHeight = videoElement.videoHeight;
            console.log("[DEBUG Droppable] Dimensiones del video:", videoWidth, "x", videoHeight);

            // Determinar si es horizontal o vertical
            const isHorizontal = videoWidth > videoHeight;

            // Configurar el tamaño del canvas según la orientación
            if (isHorizontal) {
              // Si es horizontal, usar 16:9
              dispatch(DESIGN_RESIZE, {
                payload: {
                  width: 1920,
                  height: 1080,
                  name: "16:9",
                },
              });
              console.log('[DEBUG Droppable] Video horizontal detectado. Configurando canvas a 16:9');
            } else {
              // Si es vertical, usar 9:16
              dispatch(DESIGN_RESIZE, {
                payload: {
                  width: 1080,
                  height: 1920,
                  name: "9:16",
                },
              });
              console.log('[DEBUG Droppable] Video vertical detectado. Configurando canvas a 9:16');
            }

            // Después de configurar el tamaño, agregamos el video al editor
            dispatch(ADD_VIDEO, { payload });
          };

          videoElement.onerror = (error) => {
            console.error("[ERROR Droppable] Error cargando video para determinar dimensiones:", error);
            // Si hay error, agregar el video de todos modos con la configuración predeterminada
            dispatch(ADD_VIDEO, { payload });
          };

          // Establecer la fuente del video
          videoElement.src = payload.details.src;
        } else {
          // Si no tiene src, simplemente añadir el video
          dispatch(ADD_VIDEO, { payload });
        }
        break;
      case AcceptedDropTypes.AUDIO:
        dispatch(ADD_AUDIO, { payload });
        break;
    }
  }, []);

  const onDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      try {
        const draggedDataString = e.dataTransfer?.types[0] as string;
        if (!draggedDataString) return;
        const draggedData: DraggedData = JSON.parse(draggedDataString);

        if (!Object.values(AcceptedDropTypes).includes(draggedData.type))
          return;
        setIsDraggingOver(true);
        setIsPointerInside(true);
        onDragStateChange?.(true);
      } catch (error) {
        console.error("Error parsing dragged data:", error);
      }
    },
    [onDragStateChange],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (isPointerInside) {
        setIsDraggingOver(true);
        onDragStateChange?.(true);
      }
    },
    [isPointerInside, onDragStateChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!isDraggingOver) return;
      e.preventDefault();
      setIsDraggingOver(false);
      onDragStateChange?.(false);

      try {
        const draggedDataString = e.dataTransfer?.types[0] as string;
        const draggedData = JSON.parse(
          e.dataTransfer!.getData(draggedDataString),
        );
        handleDrop(draggedData);
      } catch (error) {
        console.error("Error parsing dropped data:", error);
      }
    },
    [isDraggingOver, onDragStateChange, handleDrop],
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDraggingOver(false);
        setIsPointerInside(false);
        onDragStateChange?.(false);
      }
    },
    [onDragStateChange],
  );

  return { onDragEnter, onDragOver, onDrop, onDragLeave, isDraggingOver };
};

export function DroppableArea({
  id,
  children,
  style,
  className,
  onDragStateChange,
}: DroppableAreaProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  if (onDragStateChange) {
    onDragStateChange(isOver);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative", className)}
    >
      {children}
    </div>
  );
}
