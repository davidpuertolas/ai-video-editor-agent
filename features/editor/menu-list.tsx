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
    <div
      className="flex w-14 flex-col items-center gap-1 border-r py-2"
      style={{
        background: "linear-gradient(to right, rgba(20, 10, 30, 0.95), rgba(16, 8, 22, 0.95))",
        borderRight: "1px solid rgba(90, 60, 150, 0.15)"
      }}
    >
      {/* Editor de Atributos */}
      <Button
        onClick={() => {
          console.log("[DEBUG MenuList] Clic en botón de atributos");
          setActiveMenuItem("attributes");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "attributes"
            ? "bg-purple-900/80 text-purple-100"
            : "text-muted-foreground hover:text-purple-300/70 hover:bg-purple-950/50",
        )}
        variant={"ghost"}
        size={"icon"}
        title="Editor de Atributos"
      >
        <Sliders width={16} />
      </Button>



      <Button
        onClick={() => {
          setActiveMenuItem("videos");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "videos"
            ? "bg-purple-900/80 text-purple-100"
            : "text-muted-foreground hover:text-purple-300/70 hover:bg-purple-950/50",
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
            ? "bg-purple-900/80 text-purple-100"
            : "text-muted-foreground hover:text-purple-300/70 hover:bg-purple-950/50",
        )}
        variant={"ghost"}
        size={"icon"}
      >
        <Icons.image width={16} />
      </Button>

      <Button
        onClick={() => {
          setActiveMenuItem("texts");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "texts"
            ? "bg-purple-900/80 text-purple-100"
            : "text-muted-foreground hover:text-purple-300/70 hover:bg-purple-950/50",
        )}
        variant={"ghost"}
        size={"icon"}
      >
        <Icons.type width={16} />
      </Button>


      {/* <Button
        onClick={() => {
          setActiveMenuItem("shapes");
          setShowMenuItem(true);
        }}
        className={cn(
          showMenuItem && activeMenuItem === "shapes"
            ? "bg-purple-900/80 text-purple-100"
            : "text-muted-foreground hover:text-purple-300/70 hover:bg-purple-950/50",
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
            ? "bg-purple-900/80 text-purple-100"
            : "text-muted-foreground hover:text-purple-300/70 hover:bg-purple-950/50",
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
            ? "bg-purple-900/80 text-purple-100"
            : "text-muted-foreground hover:text-purple-300/70 hover:bg-purple-950/50",
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
            ? "bg-purple-900/80 text-purple-100"
            : "text-muted-foreground hover:text-purple-300/70 hover:bg-purple-950/50",
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
            ? "bg-purple-900/80 text-purple-100"
            : "text-muted-foreground hover:text-purple-300/70 hover:bg-purple-950/50",
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
