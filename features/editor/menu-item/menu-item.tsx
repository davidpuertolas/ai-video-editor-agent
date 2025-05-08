import useLayoutStore from "../store/use-layout-store";
import { Texts } from "./texts";
import { Audios } from "./audios";
import { Elements } from "./elements";
import { Images } from "./images";
import { Videos } from "./videos";
import { Subtitles } from "./subtitles";
import { AdvancedEdit } from "./advanced-edit";
import SmartTrim from "@/components/smart-trim";
import { AttributeEditor } from "./attribute-editor";
import { Workflows } from "./workflows";
import useStore from "../store/use-store";
import { useEffect } from "react";

const ActiveMenuItem = () => {
  const { activeMenuItem } = useLayoutStore();

  console.log("[DEBUG MenuItem] Panel activo:", activeMenuItem);

  // Mostrar el contenido según el panel activo seleccionado
  if (activeMenuItem === "attributes") {
    console.log("[DEBUG MenuItem] Mostrando AttributeEditor");
    return <AttributeEditor />;
  }

  if (activeMenuItem === "texts") {
    return <Texts />;
  } else if (activeMenuItem === "shapes") {
    return <Elements />;
  } else if (activeMenuItem === "videos") {
    return <Videos />;
  } else if (activeMenuItem === "audios") {
    return <Audios />;
  } else if (activeMenuItem === "images") {
    return <Images />;
  } else if (activeMenuItem === "subtitles") {
    return <Subtitles />;
  } else if (activeMenuItem === "advanced") {
    return <AdvancedEdit />;
  } else if (activeMenuItem === "smarttrim") {
    return <SmartTrim />;
  } else if (activeMenuItem === "workflows") {
    return <Workflows />;
  } else {
    // Si no hay un panel seleccionado, no mostrar nada
    return null;
  }
};

export const MenuItem = () => {
  // Añadir un useEffect para monitorear cambios en el activeMenuItem
  useEffect(() => {
    const checkActiveItem = () => {
      const { activeMenuItem, showMenuItem } = useLayoutStore.getState();
      console.log("[DEBUG MenuItem useEffect] Panel activo:", activeMenuItem, "Mostrar:", showMenuItem);
    };

    // Verificar inmediatamente
    checkActiveItem();

    // Subscribirse a cambios en el store
    const unsubscribe = useLayoutStore.subscribe(checkActiveItem);

    return () => unsubscribe();
  }, []);

  return (
    <div
      className="w-[300px] flex-1"
      style={{
        background: "linear-gradient(to right, rgba(18, 10, 28, 0.98), rgba(14, 8, 20, 0.98))",
        borderRight: "1px solid rgba(90, 60, 150, 0.1)",
        boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.2)"
      }}
    >
      <ActiveMenuItem />
    </div>
  );
};
