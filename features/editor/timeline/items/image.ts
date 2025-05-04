import {
  Control,
  Image as ImageBase,
  ImageProps,
  Pattern,
  util,
} from "@designcombo/timeline";
import { createResizeControls } from "../controls";
import { IMetadata } from "@designcombo/types";

// Modificamos la interfaz de props para incluir metadata
interface ExtendedImageProps extends ImageProps {
  metadata?: Partial<IMetadata>;
}

class Image extends ImageBase {
  static type = "Image";
  public metadata?: Partial<IMetadata>;

  static createControls(): { controls: Record<string, Control> } {
    return { controls: createResizeControls() };
  }

  constructor(props: ExtendedImageProps) {
    super(props);
    this.metadata = props.metadata;
    this.loadImage();
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.updateSelected(ctx);
  }

  public async loadImage() {
    try {
      console.log("[DEBUG Image] Cargando imagen:", this.src.substring(0, 30) + "...");

      const img = await util.loadImage(this.src).catch(error => {
        console.error("[ERROR Image] Error cargando imagen principal:", error);

        // Si hay metadata con previewUrl, intentar usar esa como fallback
        if (this.metadata?.previewUrl) {
          console.log("[DEBUG Image] Intentando cargar desde previewUrl");
          return util.loadImage(this.metadata.previewUrl);
        }
        throw error;
      });

      const imgHeight = img.height;
      const rectHeight = this.height;
      const scaleY = rectHeight / imgHeight;
      const pattern = new Pattern({
        source: img,
        repeat: "repeat-x",
        patternTransform: [scaleY, 0, 0, scaleY, 0, 0],
      });
      this.set("fill", pattern);
      this.canvas?.requestRenderAll();
      console.log("[DEBUG Image] Imagen cargada correctamente");
    } catch (error) {
      console.error("[ERROR Image] No se pudo cargar la imagen:", error);
      // Si falla todo, establecer un patrón de color gris como fallback
      const fillColor = "#666666";
      this.set("fill", fillColor);
      this.canvas?.requestRenderAll();
    }
  }

  public setSrc(src: string) {
    this.src = src;
    this.loadImage();
    this.canvas?.requestRenderAll();
  }
}

export default Image;
