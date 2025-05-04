import useLayoutStore from "./store/use-layout-store";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Scissors, Sparkles, WandSparkles, Sliders, Paintbrush, Settings } from "lucide-react";
import useStore from "./store/use-store";
import { useEffect } from "react";

export default function MenuList() {
  const { setActiveMenuItem, setShowMenuItem, activeMenuItem, showMenuItem } =
    useLayoutStore();

  // Añadir monitoreo de cambios en activeMenuItem
  useEffect(() => {
    console.log("[DEBUG MenuList] Panel activo:", activeMenuItem, "Mostrar:", showMenuItem);
  }, [activeMenuItem, showMenuItem]);

  return (
    <div className="flex w-14 flex-col items-center gap-1 border-r border-border/80 py-2">
      {/* Editor de Atributos */}
      <Button
        onClick={() => {
          console.log("[DEBUG MenuList] Clic en botón de atributos");
          setActiveMenuItem("attributes");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "attributes"
            ? "bg-secondary"
            : "text-muted-foreground",
        )}
        variant={"ghost"}
        size={"icon"}
        title="Editor de Atributos"
      >
        <Sliders width={16} />
      </Button>

      <Button
        onClick={() => {
          setActiveMenuItem("texts");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "texts"
            ? "bg-secondary"
            : "text-muted-foreground",
        )}
        variant={"ghost"}
        size={"icon"}
      >
        <Icons.type width={16} />
      </Button>

      <Button
        onClick={() => {
          setActiveMenuItem("videos");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "videos"
            ? "bg-secondary"
            : "text-muted-foreground",
        )}
        variant={"ghost"}
        size={"icon"}
      >
        <Icons.video width={16} />
      </Button>

      <Button
        onClick={() => {
          setActiveMenuItem("images");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "images"
            ? "bg-secondary"
            : "text-muted-foreground",
        )}
        variant={"ghost"}
        size={"icon"}
      >
        <Icons.image width={16} />
      </Button>
      {/* <Button
        onClick={() => {
          setActiveMenuItem("shapes");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "shapes"
            ? "bg-secondary"
            : "text-muted-foreground",
        )}
        variant={"ghost"}
        size={"icon"}
      >
        <Icons.shapes width={16} />
      </Button> */}
      <Button
        onClick={() => {
          setActiveMenuItem("audios");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "audios"
            ? "bg-secondary"
            : "text-muted-foreground",
        )}
        variant={"ghost"}
        size={"icon"}
      >
        <Icons.audio width={16} />
      </Button>

      {/* Botón para subtítulos */}
      <Button
        onClick={() => {
          setActiveMenuItem("subtitles");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "subtitles"
            ? "bg-secondary"
            : "text-muted-foreground",
        )}
        variant={"ghost"}
        size={"icon"}
      >
        <Icons.captions width={16} />
      </Button>

      {/* Nuevo botón para Edición Avanzada */}
      <Button
        onClick={() => {
          setActiveMenuItem("advanced");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "advanced"
            ? "bg-secondary"
            : "text-muted-foreground",
        )}
        variant={"ghost"}
        size={"icon"}
        title="Edición Avanzada"
      >
        <Scissors width={16} />
      </Button>

      {/* Nuevo botón para Recorte Inteligente */}
      <Button
        onClick={() => {
          setActiveMenuItem("smarttrim");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "smarttrim"
            ? "bg-secondary"
            : "text-muted-foreground",
        )}
        variant={"ghost"}
        size={"icon"}
        title="Recorte Inteligente"
      >
        <WandSparkles width={16} />
      </Button>
    </div>
  );
}
