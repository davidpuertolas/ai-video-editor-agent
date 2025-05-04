"use client";

import React from "react";
import useStore from "../store/use-store";
import { useEffect, useRef, useState } from "react";
import { Droppable } from "@/components/ui/droppable";
import { WandSparkles } from "lucide-react";
import { DroppableArea } from "./droppable";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, DESIGN_RESIZE } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

const SceneEmpty = () => {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { size } = useStore();

  useEffect(() => {
    // Solo esperamos un poco para asegurar que se ha montado el componente
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  }, []);

  // Función para generar una miniatura a partir de un video
  const generateVideoThumbnail = (file: File): Promise<string> => {
    console.log("[DEBUG SceneEmpty] Generando thumbnail para video:", file.name);

    return new Promise((resolve, reject) => {
      // Crear un elemento de video temporal para generar la miniatura
      const video = document.createElement('video');
      video.preload = 'metadata';

      // Configurar eventos
      video.onloadedmetadata = () => {
        console.log("[DEBUG SceneEmpty] Video metadata cargada, duración:", video.duration);
        // Buscar un fotograma cerca del inicio del video, pero no el primer frame
        video.currentTime = Math.min(1, video.duration / 10);
      };

      video.onloadeddata = () => {
        try {
          console.log("[DEBUG SceneEmpty] Datos de video cargados, generando thumbnail");
          // Crear un canvas para capturar el fotograma actual
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Dibujar el fotograma actual en el canvas
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convertir el canvas a una URL de datos (thumbnail)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          console.log("[DEBUG SceneEmpty] Thumbnail generado correctamente:", dataUrl.substring(0, 50) + "...");

          // Liberar recursos
          URL.revokeObjectURL(video.src);

          resolve(dataUrl);
        } catch (error) {
          console.error("[ERROR SceneEmpty] Error generando thumbnail:", error);
          reject(error);
        }
      };

      video.onerror = (error) => {
        console.error("[ERROR SceneEmpty] Error cargando video para thumbnail:", error);
        URL.revokeObjectURL(video.src);
        reject(new Error("Error loading video"));
      };

      // Establecer la fuente del video
      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;
      console.log("[DEBUG SceneEmpty] URL del video creado:", videoUrl);
    });
  };

  const onSelectFiles = async (files: File[]) => {
    console.log("[DEBUG SceneEmpty] Archivos seleccionados:", files);

    // Procesamos solo si hay archivos y el primero es un video
    if (files.length > 0 && files[0].type.startsWith('video/')) {
      const file = files[0];
      const videoUrl = URL.createObjectURL(file);
      console.log("[DEBUG SceneEmpty] URL del video creado:", videoUrl);

      try {
        // Generar thumbnail de forma asíncrona
        console.log("[DEBUG SceneEmpty] Iniciando generación de thumbnail...");
        const thumbnailUrl = await generateVideoThumbnail(file);
        console.log("[DEBUG SceneEmpty] Thumbnail generado con éxito");

        // Crear un elemento de video temporal para obtener las dimensiones
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';

        videoElement.onloadedmetadata = () => {
          const videoWidth = videoElement.videoWidth;
          const videoHeight = videoElement.videoHeight;
          console.log("[DEBUG SceneEmpty] Dimensiones del video:", videoWidth, "x", videoHeight);

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
            console.log('[DEBUG SceneEmpty] Video horizontal detectado. Configurando canvas a 16:9');
          } else {
            // Si es vertical, usar 9:16
            dispatch(DESIGN_RESIZE, {
              payload: {
                width: 1080,
                height: 1920,
                name: "9:16",
              },
            });
            console.log('[DEBUG SceneEmpty] Video vertical detectado. Configurando canvas a 9:16');
          }

          // Después de configurar el tamaño, agregamos el video al editor con el thumbnail generado
          console.log("[DEBUG SceneEmpty] Añadiendo video al editor con thumbnail");
          dispatch(ADD_VIDEO, {
            payload: {
              id: generateId(),
              details: {
                src: videoUrl,
              },
              metadata: {
                previewUrl: thumbnailUrl, // Usar el thumbnail generado
                fileName: file.name,
              },
            },
            options: {
              resourceId: "main",
              scaleMode: "fit",
            },
          });
        };

        // Establecer la fuente del video para iniciar la carga
        videoElement.src = videoUrl;

      } catch (error) {
        console.error("[ERROR SceneEmpty] Error en el proceso de thumbnail:", error);

        // Si falla la generación del thumbnail, usar el video directamente
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';

        videoElement.onloadedmetadata = () => {
          const videoWidth = videoElement.videoWidth;
          const videoHeight = videoElement.videoHeight;
          console.log("[DEBUG SceneEmpty] Dimensiones del video (sin thumbnail):", videoWidth, "x", videoHeight);

          // Determinar si es horizontal o vertical
          const isHorizontal = videoWidth > videoHeight;

          // Configurar tamaño del canvas
          if (isHorizontal) {
            dispatch(DESIGN_RESIZE, {
              payload: {
                width: 1920,
                height: 1080,
                name: "16:9",
              },
            });
          } else {
            dispatch(DESIGN_RESIZE, {
              payload: {
                width: 1080,
                height: 1920,
                name: "9:16",
              },
            });
          }

          // Añadir el video sin thumbnail especial
          console.log("[DEBUG SceneEmpty] Añadiendo video al editor sin thumbnail generado");
          dispatch(ADD_VIDEO, {
            payload: {
              id: generateId(),
              details: {
                src: videoUrl,
              },
              metadata: {
                previewUrl: videoUrl, // Usar el mismo video URL como fallback
                fileName: file.name,
              },
            },
            options: {
              resourceId: "main",
              scaleMode: "fit",
            },
          });
        };

        videoElement.src = videoUrl;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex h-full w-full flex-1"
      style={{
        zIndex: 1000, // Valor muy alto para asegurar que esté por encima de todo
        position: 'absolute',
        pointerEvents: 'auto' // Asegurar que recibe eventos de click
      }}
    >
      {!isLoading ? (
        <Droppable
          maxFileCount={1}
          maxSize={100 * 1024 * 1024}
          disabled={false}
          onValueChange={onSelectFiles}
          className="h-full w-full flex-1"
          accept={{
            "video/*": []
          }}
        >
          <DroppableArea
            onDragStateChange={setIsDraggingOver}
            className={`h-full w-full flex items-center justify-center transition-all duration-300 ${
              isDraggingOver
                ? "bg-[rgba(33,26,44,0.95)] border-2 border-dashed border-purple-400"
                : "bg-[rgba(26,22,37,0.9)] border-2 border-dashed border-purple-500/40"
            }`}
            style={{
              backdropFilter: "blur(12px)",
              boxShadow: "inset 0 0 100px rgba(98, 33, 234, 0.2)",
            }}
          >
            <div className="flex flex-col items-center justify-center gap-8 transform transition-transform duration-300 hover:scale-105">
              {/* Efecto de resplandor detrás del botón */}
              <div className="absolute w-24 h-24 rounded-full bg-purple-600/30 filter blur-xl animate-pulse"></div>

              <div className="cursor-pointer rounded-full bg-gradient-to-r from-purple-600 to-indigo-700 p-5 text-white shadow-lg shadow-purple-900/50 transition-all duration-200 hover:shadow-purple-800/70 hover:scale-110 relative z-10">
                <WandSparkles className="h-8 w-8" aria-hidden="true" />
              </div>

              <div className="flex flex-col gap-3 text-center max-w-md">
                <p className="text-2xl font-medium text-purple-50 drop-shadow-md">
                  Crea tu obra maestra
                </p>
                <p className="text-base text-purple-200/90 leading-relaxed">
                  Haz clic para subir tu video o arrastra un archivo aquí para comenzar tu proyecto
                </p>
              </div>

              {/* Líneas decorativas */}
              <div className="absolute bottom-10 left-0 right-0 h-[1px] opacity-50"
                   style={{background: "linear-gradient(90deg, transparent 0%, rgba(156, 90, 250, 0.8) 50%, transparent 100%)"}}></div>
            </div>
          </DroppableArea>
        </Droppable>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[rgba(26,22,37,0.95)] text-sm text-purple-200"
             style={{backdropFilter: "blur(16px)"}}>
          <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="bg-black/30 px-5 py-3 rounded-lg backdrop-blur-lg shadow-lg">
              Preparando tu canvas...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneEmpty;
