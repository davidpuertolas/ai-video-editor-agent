import React, { useEffect, useState } from "react";
import {
  IAudio,
  ICaption,
  IImage,
  IText,
  ITrackItem,
  ITrackItemAndDetails,
  IVideo,
} from "@designcombo/types";
import BasicText from "../control-item/basic-text";
import BasicImage from "../control-item/basic-image";
import BasicVideo from "../control-item/basic-video";
import BasicAudio from "../control-item/basic-audio";
import BasicCaption from "../control-item/basic-caption";
import useStore from "../store/use-store";
import useLayoutStore from "../store/use-layout-store";
import { Sliders } from "lucide-react";

const AttributeEditorContainer = ({ children }: { children: React.ReactNode }) => {
  const { activeIds, trackItemsMap, trackItemDetailsMap, transitionsMap } = useStore();
  const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
  const { setTrackItem: setLayoutTrackItem } = useLayoutStore();

  console.log("[DEBUG AttributeEditor] ActiveIds:", activeIds);

  useEffect(() => {
    if (activeIds.length === 1) {
      const [id] = activeIds;
      console.log("[DEBUG AttributeEditor] ID seleccionado:", id);
      console.log("[DEBUG AttributeEditor] trackItemDetailsMap:", Object.keys(trackItemDetailsMap || {}));
      console.log("[DEBUG AttributeEditor] trackItemsMap:", Object.keys(trackItemsMap || {}));

      const trackItemDetails = trackItemDetailsMap[id];
      if (trackItemDetails) {
        console.log("[DEBUG AttributeEditor] Encontrado trackItemDetails para ID:", id);
        const trackItem = {
          ...trackItemsMap[id],
          details: trackItemDetails?.details || {},
        };
        setTrackItem(trackItem);
        setLayoutTrackItem(trackItem);
      } else {
        console.log("[DEBUG AttributeEditor] No se encontró trackItemDetails para ID:", id);
        console.log("[DEBUG AttributeEditor] Revisando transitionsMap:", transitionsMap[id]);
      }
    } else {
      setTrackItem(null);
      setLayoutTrackItem(null);
    }
  }, [activeIds, trackItemsMap, trackItemDetailsMap]);

  if (!trackItem) {
    console.log("[DEBUG AttributeEditor] No hay trackItem, retornando null");
    return null;
  }

  // Obtener un título más descriptivo basado en el tipo de elemento
  const getItemTypeTitle = (type: string) => {
    switch(type) {
      case 'text': return 'Texto';
      case 'image': return 'Imagen';
      case 'video': return 'Video';
      case 'audio': return 'Audio';
      case 'caption': return 'Subtítulo';
      default: return 'Elemento';
    }
  };

  console.log("[DEBUG AttributeEditor] Renderizando editor para tipo:", trackItem.type);

  return (
    <div className="flex w-full flex-col">
      <div className="border-b border-border/80 p-3">
        <div className="flex items-center gap-2 text-primary font-medium">
          <Sliders size={16} />
          <span>Editor de Atributos - {getItemTypeTitle(trackItem.type)}</span>
        </div>
      </div>
      {React.cloneElement(children as React.ReactElement<any>, {
        trackItem,
      })}
    </div>
  );
};

const ActiveAttributeEditor = ({
  trackItem,
}: {
  trackItem?: ITrackItemAndDetails;
}) => {
  if (!trackItem) {
    console.log("[DEBUG ActiveAttributeEditor] No hay trackItem, retornando null");
    return null;
  }

  console.log("[DEBUG ActiveAttributeEditor] Renderizando editor para tipo:", trackItem.type);

  return (
    <>
      {
        {
          text: <BasicText trackItem={trackItem as ITrackItem & IText} />,
          caption: (
            <BasicCaption trackItem={trackItem as ITrackItem & ICaption} />
          ),
          image: <BasicImage trackItem={trackItem as ITrackItem & IImage} />,
          video: <BasicVideo trackItem={trackItem as ITrackItem & IVideo} />,
          audio: <BasicAudio trackItem={trackItem as ITrackItem & IAudio} />,
        }[trackItem.type as "text"]
      }
    </>
  );
};

export const AttributeEditor = () => {
  const { activeIds } = useStore();
  const { activeMenuItem } = useLayoutStore();

  console.log("[DEBUG AttributeEditor] Componente principal, activeIds:", activeIds);
  console.log("[DEBUG AttributeEditor] Panel activo:", activeMenuItem);

  if (activeIds.length !== 1) {
    console.log("[DEBUG AttributeEditor] No hay un solo elemento seleccionado, mostrando mensaje");
    return (
      <div className="flex h-full w-full flex-col">
        <div className="border-b border-border/80 p-3">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Sliders size={16} />
            <span>Editor de Atributos</span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center text-muted-foreground p-4 text-center">
          Selecciona un elemento para editar sus atributos
        </div>
      </div>
    );
  }

  console.log("[DEBUG AttributeEditor] Renderizando AttributeEditorContainer");
  return (
    <AttributeEditorContainer>
      <ActiveAttributeEditor />
    </AttributeEditorContainer>
  );
};
