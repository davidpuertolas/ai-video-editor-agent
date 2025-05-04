import { ScrollArea } from "@/components/ui/scroll-area";
import { IMAGES } from "../data/images";
import { dispatch } from "@designcombo/events";
import { generateId } from "@designcombo/timeline";
import Draggable from "@/components/shared/draggable";
import { IImage } from "@designcombo/types";
import React, { useRef } from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { ADD_ITEMS } from "@designcombo/state";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "lucide-react";
import { createUploadsDetails } from "@/utils/upload";

export const Images = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddImage = (payload: Partial<IImage>) => {
    const id = generateId();
    dispatch(ADD_ITEMS, {
      payload: {
        trackItems: [
          {
            id,
            type: "image",
            display: {
              from: 0,
              to: 5000,
            },
            details: {
              src: payload.details?.src,
            },
            metadata: {
              previewUrl: payload.metadata?.previewUrl,
            },
          },
        ],
      },
    });
  };

  // Función para manejar la carga de una imagen desde el equipo local
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Generar miniaturas y URLs para la imagen
      const uploadDetails = await createUploadsDetails(file.name, file);

      // Usar la misma URL como miniatura y como fuente
      handleAddImage({
        id: generateId(),
        details: {
          src: uploadDetails.url,
        },
        metadata: {
          previewUrl: uploadDetails.url,
          fileName: file.name,
        },
      } as any);

      // Resetear el input para permitir seleccionar el mismo archivo nuevamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error al cargar la imagen:", error);
      // Aquí podrías mostrar una notificación de error
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center justify-between px-4 text-sm font-medium">
        <span>Photos</span>
        <Button
          size="sm"
          variant="ghost"
          className="flex items-center gap-1"
          onClick={handleUploadClick}
        >
          <UploadIcon size={16} />
          <span>Subir</span>
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
      </div>
      <ScrollArea>
        <div className="masonry-sm px-4">
          {IMAGES.map((image, index) => {
            return (
              <ImageItem
                key={index}
                image={image}
                shouldDisplayPreview={!isDraggingOverTimeline}
                handleAddImage={handleAddImage}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

const ImageItem = ({
  handleAddImage,
  image,
  shouldDisplayPreview,
}: {
  handleAddImage: (payload: Partial<IImage>) => void;
  image: Partial<IImage>;
  shouldDisplayPreview: boolean;
}) => {
  const style = React.useMemo(
    () => ({
      backgroundImage: `url(${image.preview})`,
      backgroundSize: "cover",
      width: "80px",
      height: "80px",
    }),
    [image.preview],
  );

  return (
    <Draggable
      data={{
        ...image,
        metadata: {
          previewUrl: image.preview,
        },
      }}
      renderCustomPreview={<div style={style} />}
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div
        onClick={() =>
          handleAddImage({
            id: generateId(),
            details: {
              src: image.details!.src,
            },
            metadata: {
              previewUrl: image.preview,
            },
          } as IImage)
        }
        className="flex w-full items-center justify-center overflow-hidden bg-background pb-2"
      >
        <img
          draggable={false}
          src={image.preview}
          className="h-full w-full rounded-md object-cover"
          alt="image"
        />
      </div>
    </Draggable>
  );
};
