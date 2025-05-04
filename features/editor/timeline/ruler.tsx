import { useCallback, useEffect, useRef, useState } from "react";

import {
  PREVIEW_FRAME_WIDTH,
  SECONDARY_FONT,
  SMALL_FONT_SIZE,
  TIMELINE_OFFSET_CANVAS_LEFT,
  TIMELINE_OFFSET_X,
} from "../constants/constants";
import { formatTimelineUnit } from "../utils/format";
import useStore from "../store/use-store";
import { debounce } from "lodash";

interface RulerProps {
  height?: number;
  longLineSize?: number;
  shortLineSize?: number;
  offsetX?: number;
  textOffsetY?: number;
  scrollPos?: number;
  textFormat?: (scale: number) => string;
  scrollLeft?: number;
  onClick?: (units: number) => void;
}

const Ruler = (props: RulerProps) => {
  const {
    height = 42, // Incrementado ligeramente para más espacio
    longLineSize = 10,
    shortLineSize = 6,
    offsetX = TIMELINE_OFFSET_X + TIMELINE_OFFSET_CANVAS_LEFT,
    textOffsetY = 17, // Posición del texto sobre las líneas
    textFormat = formatTimelineUnit,
    scrollLeft: scrollPos = 0,
    onClick,
  } = props;
  const { scale } = useStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasContext, setCanvasContext] =
    useState<CanvasRenderingContext2D | null>(null);
  const [canvasSize, setCanvasSize] = useState({
    width: 0,
    height: height,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      setCanvasContext(context);
      resize(canvas, context, scrollPos);
    }
  }, []);

  const handleResize = useCallback(() => {
    resize(canvasRef.current, canvasContext, scrollPos);
  }, [canvasContext, scrollPos]);

  useEffect(() => {
    const resizeHandler = debounce(handleResize, 200);
    window.addEventListener("resize", resizeHandler);

    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, [handleResize]);

  useEffect(() => {
    if (canvasContext) {
      resize(canvasRef.current, canvasContext, scrollPos);
    }
  }, [canvasContext, scrollPos, scale]);

  const resize = (
    canvas: HTMLCanvasElement | null,
    context: CanvasRenderingContext2D | null,
    scrollPos: number,
  ) => {
    if (!canvas || !context) return;

    const offsetParent = canvas.offsetParent as HTMLDivElement;
    const width = offsetParent?.offsetWidth ?? canvas.offsetWidth;
    const height = canvasSize.height;

    canvas.width = width;
    canvas.height = height;

    draw(context, scrollPos, width, height);
    setCanvasSize({ width, height });
  };

  const draw = (
    context: CanvasRenderingContext2D,
    scrollPos: number,
    width: number,
    height: number,
  ) => {
    const zoom = scale.zoom;
    const unit = scale.unit;
    const segments = scale.segments;
    context.clearRect(0, 0, width, height);
    context.save();

    // Dibujar un fondo con gradiente para la regla
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(45, 25, 75, 0.9)"); // Púrpura oscuro en la parte superior
    gradient.addColorStop(1, "rgba(30, 15, 50, 0.9)"); // Más oscuro en la parte inferior
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    // Dibujar una línea de borde brillante en la parte inferior
    context.beginPath();
    context.moveTo(0, height - 0.5);
    context.lineTo(width, height - 0.5);
    context.strokeStyle = "rgba(156, 90, 250, 0.6)"; // Púrpura brillante
    context.lineWidth = 1;
    context.stroke();

    // Configurar estilos de texto
    context.fillStyle = "#b388ff"; // Púrpura claro para el texto
    context.font = `${SMALL_FONT_SIZE}px ${SECONDARY_FONT}`;
    context.textBaseline = "top";
    context.textAlign = "center"; // Centrar el texto

    context.translate(0.5, 0);
    context.beginPath();

    const zoomUnit = unit * zoom * PREVIEW_FRAME_WIDTH;
    const minRange = Math.floor(scrollPos / zoomUnit);
    const maxRange = Math.ceil((scrollPos + width) / zoomUnit);
    const length = maxRange - minRange;

    // Crear un brillo de fondo para las marcas principales
    const createHighlight = (x: number, radius: number = 10, alpha: number = 0.1) => {
      const glow = context.createRadialGradient(x, height, 0, x, height, radius);
      glow.addColorStop(0, `rgba(156, 90, 250, ${alpha})`);
      glow.addColorStop(1, "rgba(156, 90, 250, 0)");
      return glow;
    };

    // Dibujar texto antes de dibujar las líneas
    for (let i = 0; i <= length; ++i) {
      const value = i + minRange;

      if (value < 0) continue;

      const startValue = (value * zoomUnit) / zoom;
      const startPos = (startValue - scrollPos / zoom) * zoom;

      if (startPos < -zoomUnit || startPos >= width + zoomUnit) continue;

      const text = textFormat(startValue);
      const posX = startPos + offsetX;

      // Dibujar texto con sombra para efecto futurista
      context.save();
      context.shadowColor = 'rgba(156, 90, 250, 0.3)';
      context.shadowBlur = 3;
      context.fillText(text, posX, textOffsetY);
      context.restore();
    }

    // Dibujar líneas largas y cortas después del texto
    for (let i = 0; i <= length; ++i) {
      const value = i + minRange;

      if (value < 0) continue;

      const startValue = value * zoomUnit;
      const startPos = startValue - scrollPos + offsetX;

      // Dibujar un brillo de fondo para cada marca principal
      if (value % 2 === 0) {
        context.fillStyle = createHighlight(startPos, 12, 0.15);
        context.fillRect(startPos - 12, height - 18, 24, 18);
      }

      for (let j = 0; j < segments; ++j) {
        const pos = startPos + (j / segments) * zoomUnit;

        if (pos < 0 || pos >= width) continue;

        const lineSize = j % segments ? shortLineSize : longLineSize;

        // Establecer color basado en el tamaño de la línea
        if (lineSize === shortLineSize) {
          context.strokeStyle = "rgba(156, 90, 250, 0.3)"; // Púrpura claro para líneas cortas
        } else {
          context.strokeStyle = "rgba(156, 90, 250, 0.7)"; // Púrpura más brillante para líneas largas
        }

        const origin = 24; // Aumentar el origen para empezar las líneas más abajo, debajo del texto

        const [x1, y1] = [pos, origin];
        const [x2, y2] = [x1, y1 + lineSize];

        context.beginPath(); // Comenzar un nuevo camino para cada línea
        context.lineWidth = lineSize === shortLineSize ? 1 : 1.5; // Líneas más gruesas para marcas principales
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke(); // Dibujar la línea
      }
    }

    context.restore();
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Obtener el cuadro delimitador del canvas para calcular la posición relativa del clic
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;

    // Calcular la posición x total, incluido scrollPos
    const totalX =
      clickX + scrollPos - TIMELINE_OFFSET_X - TIMELINE_OFFSET_CANVAS_LEFT;

    onClick?.(totalX);
  };

  return (
    <div
      className="border-t border-purple-800/30"
      style={{
        position: "relative",
        width: "100%",
        height: `${canvasSize.height}px`,
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      }}
    >
      <canvas
        onMouseUp={handleClick}
        ref={canvasRef}
        height={canvasSize.height}
        className="cursor-pointer"
      />
    </div>
  );
};

export default Ruler;
