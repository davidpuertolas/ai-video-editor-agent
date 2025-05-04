import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VIDEOS } from "../data/video";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { IVideo } from "@designcombo/types";
import React, { useState } from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "lucide-react";

export const Videos = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  const handleAddVideo = (payload: Partial<IVideo>) => {
    // payload.details.src = "https://cdn.designcombo.dev/videos/timer-20s.mp4";
    dispatch(ADD_VIDEO, {
      payload,
      options: {
        resourceId: "main",
        scaleMode: "fit",
      },
    });
  };

  // Función para generar un thumbnail a partir de un video
  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Crear un elemento de video temporal para generar la miniatura
      const video = document.createElement('video');
      video.preload = 'metadata';

      // Configurar eventos
      video.onloadedmetadata = () => {
        // Buscar un fotograma cerca del inicio del video, pero no el primer frame
        video.currentTime = Math.min(1, video.duration / 10);
      };

      video.onloadeddata = () => {
        try {
          // Crear un canvas para capturar el fotograma actual
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Dibujar el fotograma actual en el canvas
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convertir el canvas a una URL de datos (thumbnail)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

          // Liberar recursos
          URL.revokeObjectURL(video.src);

          resolve(dataUrl);
        } catch (error) {
          console.error("Error generando thumbnail:", error);
          reject(error);
        }
      };

      video.onerror = () => {
        console.error("Error cargando video para thumbnail");
        URL.revokeObjectURL(video.src);
        reject(new Error("Error loading video"));
      };

      // Establecer la fuente del video
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsGeneratingThumbnail(true);

      // Crear URL para el video
      const videoUrl = URL.createObjectURL(file);

      // Generar thumbnail
      const thumbnailUrl = await generateVideoThumbnail(file);

      // Agregar video con thumbnail generado
      handleAddVideo({
        id: generateId(),
        details: {
          src: videoUrl,
        },
        metadata: {
          previewUrl: thumbnailUrl,
          fileName: file.name,
        },
      } as any);
    } catch (error) {
      console.error("Error procesando video:", error);

      // Si falla la generación del thumbnail, usar el video directamente como preview
      const videoUrl = URL.createObjectURL(file);

      handleAddVideo({
        id: generateId(),
        details: {
          src: videoUrl,
        },
        metadata: {
          previewUrl: videoUrl,
          fileName: file.name,
        },
      } as any);
    } finally {
      // Resetear input y estado
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsGeneratingThumbnail(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center justify-between px-4 text-sm font-medium">
        <span>Videos</span>
        <Button
          size="sm"
          variant="ghost"
          className="flex items-center gap-1"
          onClick={() => fileInputRef.current?.click()}
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
          onChange={handleFileUpload}
          accept="video/*"
          className="hidden"
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
          } as any)
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
