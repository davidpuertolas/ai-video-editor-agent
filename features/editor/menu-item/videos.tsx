import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VIDEOS } from "../data/video";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, DESIGN_RESIZE } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { IVideo } from "@designcombo/types";
import React, { useState, useRef } from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "lucide-react";

export const Videos = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  const handleAddVideo = (payload: Partial<IVideo>) => {
    console.log("[DEBUG Videos] Añadiendo video:", payload.details?.src?.substring(0, 30) + "...");
    console.log("[DEBUG Videos] Thumbnail disponible:", !!payload.metadata?.previewUrl);
    console.log("[DEBUG Videos] Nombre del archivo:", payload.metadata?.fileName || "No disponible");

    // Crear un elemento de video temporal para obtener las dimensiones
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';

    videoElement.onloadedmetadata = () => {
      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;
      console.log("[DEBUG Videos] Dimensiones del video:", videoWidth, "x", videoHeight);

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
        console.log('[DEBUG Videos] Video horizontal detectado. Configurando canvas a 16:9');
      } else {
        // Si es vertical, usar 9:16
        dispatch(DESIGN_RESIZE, {
          payload: {
            width: 1080,
            height: 1920,
            name: "9:16",
          },
        });
        console.log('[DEBUG Videos] Video vertical detectado. Configurando canvas a 9:16');
      }

      // Después de configurar el tamaño, agregamos el video al editor
      dispatch(ADD_VIDEO, {
        payload,
        options: {
          resourceId: "main",
          scaleMode: "fit",
        },
      });
    };

    videoElement.onerror = (error) => {
      console.error("[ERROR Videos] Error cargando video para determinar dimensiones:", error);
      // Si hay error, agregar el video de todos modos con la configuración predeterminada
      dispatch(ADD_VIDEO, {
        payload,
        options: {
          resourceId: "main",
          scaleMode: "fit",
        },
      });
    };

    // Establecer la fuente del video
    videoElement.src = payload.details?.src || '';
  };

  // Función para generar una miniatura a partir de un video
  const generateVideoThumbnail = (file: File): Promise<string> => {
    console.log("[DEBUG Videos] Generando thumbnail para video:", file.name);

    return new Promise((resolve, reject) => {
      // Crear un elemento de video temporal
      const video = document.createElement('video');
      video.preload = 'metadata';

      // Configurar eventos
      video.onloadedmetadata = () => {
        console.log("[DEBUG Videos] Video metadata cargada, duración:", video.duration);
        // Buscar un fotograma cerca del inicio del video, pero no el primer frame
        video.currentTime = Math.min(1, video.duration / 10);
      };

      video.onloadeddata = () => {
        try {
          console.log("[DEBUG Videos] Datos de video cargados, generando thumbnail");
          // Crear un canvas para capturar el fotograma actual
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Dibujar el fotograma actual en el canvas
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convertir el canvas a una URL de datos (thumbnail)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          console.log("[DEBUG Videos] Thumbnail generado correctamente:", dataUrl.substring(0, 50) + "...");

          // Liberar recursos
          URL.revokeObjectURL(video.src);

          resolve(dataUrl);
        } catch (error) {
          console.error("[ERROR Videos] Error generando thumbnail:", error);
          reject(error);
        }
      };

      video.onerror = (error) => {
        console.error("[ERROR Videos] Error cargando video para thumbnail:", error);
        URL.revokeObjectURL(video.src);
        reject(new Error("Error loading video"));
      };

      // Establecer la fuente del video
      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;
      console.log("[DEBUG Videos] URL del video creado:", videoUrl);
    });
  };

  // Manejar subida de archivo local
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log("[DEBUG Videos] No se seleccionaron archivos");
      return;
    }

    try {
      setIsGeneratingThumbnail(true);
      const file = files[0];
      console.log("[DEBUG Videos] Archivo seleccionado:", file.name, "Tipo:", file.type);

      if (!file.type.startsWith('video/')) {
        console.error("[ERROR Videos] El archivo no es un video válido");
        setIsGeneratingThumbnail(false);
        return;
      }

      // Crear URL para el video
      const videoUrl = URL.createObjectURL(file);
      console.log("[DEBUG Videos] URL de video creado:", videoUrl);

      // Generar thumbnail
      console.log("[DEBUG Videos] Iniciando generación de thumbnail...");
      let thumbnail;
      try {
        thumbnail = await generateVideoThumbnail(file);
        console.log("[DEBUG Videos] Thumbnail generado con éxito");
      } catch (thumbnailError) {
        console.error("[ERROR Videos] No se pudo generar thumbnail, usando video URL como fallback:", thumbnailError);
        thumbnail = videoUrl;
      }

      // Añadir el video con su miniatura
      handleAddVideo({
        id: generateId(),
        details: {
          src: videoUrl,
        },
        metadata: {
          previewUrl: thumbnail,
          fileName: file.name,
        },
      });

      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("[ERROR Videos] Error procesando archivo:", error);
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  // Abrir diálogo de selección de archivo
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center justify-between px-4 text-sm font-medium">
        <span>Videos</span>
        <Button
          size="sm"
          variant="ghost"
          className="flex items-center gap-1"
          onClick={handleUploadClick}
          disabled={isGeneratingThumbnail}
        >
          {isGeneratingThumbnail ? (
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
              <span>Procesando...</span>
            </span>
          ) : (
            <>
              <UploadIcon size={16} />
              <span>Subir video</span>
            </>
          )}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="video/*"
          onChange={handleFileUpload}
        />
      </div>
      <ScrollArea>
        <div className="masonry-sm px-4">
          {VIDEOS.map((video, index) => {
            return (
              <VideoItem
                key={index}
                video={video}
                shouldDisplayPreview={!isDraggingOverTimeline}
                handleAddImage={handleAddVideo}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

const VideoItem = ({
  handleAddImage,
  video,
  shouldDisplayPreview,
}: {
  handleAddImage: (payload: Partial<IVideo>) => void;
  video: Partial<IVideo>;
  shouldDisplayPreview: boolean;
}) => {
  const style = React.useMemo(
    () => ({
      backgroundImage: `url(${video.preview})`,
      backgroundSize: "cover",
      width: "80px",
      height: "80px",
    }),
    [video.preview],
  );

  return (
    <Draggable
      data={{
        ...video,
        metadata: {
          previewUrl: video.preview,
        },
      }}
      renderCustomPreview={<div style={style} className="draggable" />}
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div
        onClick={() =>
          handleAddImage({
            id: generateId(),
            details: {
              src: video.details!.src,
            },
            metadata: {
              previewUrl: video.preview,
            },
            type: video.type,
            duration: video.duration,
          })
        }
        className="flex w-full items-center justify-center overflow-hidden bg-background pb-2"
      >
        <img
          draggable={false}
          src={video.preview}
          className="h-full w-full rounded-md object-cover"
          alt="image"
        />
      </div>
    </Draggable>
  );
};

