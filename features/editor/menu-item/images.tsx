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

export const Images = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddImage = (payload: Partial<IImage>) => {
    console.log("[DEBUG Images] Añadiendo imagen:", payload.details?.src?.substring(0, 30) + "...");
    console.log("[DEBUG Images] Thumbnail disponible:", !!payload.metadata?.previewUrl);
    console.log("[DEBUG Images] Nombre del archivo:", payload.metadata?.fileName || "No disponible");

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
              fileName: payload.metadata?.fileName || "imagen.jpg",
            },
          },
        ],
      },
    });
  };

  // Función para generar miniatura de una imagen
  const generateImageThumbnail = (file: File): Promise<string> => {
    console.log("[DEBUG Images] Generando thumbnail para imagen:", file.name);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const dataUrl = e.target?.result as string;
          console.log("[DEBUG Images] Imagen cargada, generando thumbnail");

          // Crear una imagen a partir del dataURL
          const img = new Image();
          img.onload = () => {
            // Crear un canvas para redimensionar la imagen
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Calcular dimensiones manteniendo el aspect ratio
            const maxDimension = 200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxDimension) {
                height = Math.round(height * (maxDimension / width));
                width = maxDimension;
              }
            } else {
              if (height > maxDimension) {
                width = Math.round(width * (maxDimension / height));
                height = maxDimension;
              }
            }

            // Configurar canvas y dibujar imagen
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);

            // Generar dataURL para el thumbnail
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
            console.log("[DEBUG Images] Thumbnail generado correctamente:", thumbnailUrl.substring(0, 50) + "...");

            resolve(thumbnailUrl);
          };

          img.onerror = (error) => {
            console.error("[ERROR Images] Error generando thumbnail:", error);
            // En caso de error, usar el dataURL original como fallback
            resolve(dataUrl);
          };

          img.src = dataUrl;
        } catch (error) {
          console.error("[ERROR Images] Error procesando imagen:", error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error("[ERROR Images] Error leyendo archivo:", error);
        reject(error);
      };

      reader.readAsDataURL(file);
    });
  };

  // Manejar subida de archivo local
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log("[DEBUG Images] No se seleccionaron archivos");
      return;
    }

    try {
      const file = files[0];
      console.log("[DEBUG Images] Archivo seleccionado:", file.name, "Tipo:", file.type);

      if (!file.type.startsWith('image/')) {
        console.error("[ERROR Images] El archivo no es una imagen válida");
        return;
      }

      // Generar miniatura
      console.log("[DEBUG Images] Iniciando generación de thumbnail...");
      const thumbnail = await generateImageThumbnail(file);

      // Crear URL para la imagen original
      const imageUrl = URL.createObjectURL(file);
      console.log("[DEBUG Images] URL de imagen creado:", imageUrl);

      // Añadir la imagen con la miniatura
      handleAddImage({
        id: generateId(),
        details: {
          src: imageUrl,
        },
        metadata: {
          previewUrl: thumbnail,
          fileName: file.name,
        },
      } as IImage);

      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("[ERROR Images] Error procesando archivo:", error);
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
