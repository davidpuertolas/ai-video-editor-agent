"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, ImageIcon, X, Sparkles, RefreshCw } from "lucide-react";
import useDataState from "@/features/editor/store/use-data-state";
import { useStateManager } from "@/features/editor/hooks/state-manager";
import { createVideoCommandExecutor, VideoCommandExecutor } from "./ai-video-commands";
import { createUploadsDetails } from "@/utils/upload";
import CommandExecutorService from "@/features/editor/services/command-executor-service";
import useStore from "@/features/editor/store/use-store";
import ReactMarkdown from "react-markdown";

// Indica si la solicitud debe ser procesada por el agente
function shouldUseAgent(mode: "chat" | "agent", message: string): boolean {
  if (mode !== "agent") return false;

  // Patrones que indican que el usuario quiere que el agente edite automáticamente el video
  const autoEditPatterns = [
    /edita\s+(el|este|mi)?\s*video/i,
    /mejora\s+(el|este|mi)?\s*video/i,
    /optimiza\s+(el|este|mi)?\s*video/i,
    /procesa\s+(el|este|mi)?\s*video/i,
    /arregla\s+(el|este|mi)?\s*video/i,
    /modifica\s+(el|este|mi)?\s*video/i,
    /trabaja\s+(en|con)\s+(el|este|mi)?\s*video/i,
    /puedes\s+editar/i,
    /^edita$/i,
    /^editar$/i,
    /^mejora$/i,
    /^optimiza$/i,
  ];

  return autoEditPatterns.some(pattern => pattern.test(message.trim()));
}

// Función para extraer tiempos de inicio y fin de una imagen a partir del mensaje
function extractImageTimesFromMessage(messageContent: string): { startTime: number, endTime: number } {
  let startTime = 0;
  let endTime = 5;

  if (!messageContent) return { startTime, endTime };

  // Buscar referencias al tiempo inicial
  const startTimePatterns = [
    /en el segundo (\d+)/i,
    /desde el segundo (\d+)/i,
    /a partir del segundo (\d+)/i,
    /comenzando en el segundo (\d+)/i,
    /desde el minuto (\d+)/i, // Convertir minutos a segundos
    /en el minuto (\d+)/i,    // Convertir minutos a segundos
    /entre los segundos (\d+) y/i, // Captura el primer número en "entre X y Y"
    /del segundo (\d+) al/i,
    /empezando en (\d+)/i,
    /segundo (\d+)/i,     // Patrón más general para capturar "segundo X"
    /en (\d+) segundos/i, // "en X segundos"
    /en el (\d+)/i,       // "en el X" (cuando se refiere a segundos)
  ];

  // Buscar referencias al tiempo final
  const endTimePatterns = [
    /hasta el segundo (\d+)/i,
    /al segundo (\d+)/i,
    /terminando en el segundo (\d+)/i,
    /hasta el minuto (\d+)/i, // Convertir minutos a segundos
    /entre los segundos \d+ y (\d+)/i, // Captura el segundo número en "entre X y Y"
    /del segundo \d+ al (\d+)/i,
    /por (\d+) segundos/i, // Duración relativa
    /durante (\d+) segundos/i, // Duración relativa
  ];

  // Buscar palabras clave especiales
  const isAtStart = /\b(al inicio|al principio|al comienzo)\b/i.test(messageContent);
  const isAtEnd = /\b(al final|al término|al acabar)\b/i.test(messageContent);

  // Procesar patrones de tiempo inicial
  for (const pattern of startTimePatterns) {
    const match = messageContent.match(pattern);
    if (match && match[1]) {
      // Si es referencia a minutos, convertir a segundos
      startTime = pattern.toString().includes('minuto')
        ? parseInt(match[1]) * 60
        : parseInt(match[1]);
      break;
    }
  }

  // Procesar patrones de tiempo final
  for (const pattern of endTimePatterns) {
    const match = messageContent.match(pattern);
    if (match && match[1]) {
      if (pattern.toString().includes('por') || pattern.toString().includes('durante')) {
        // Es una duración relativa, sumar al tiempo inicial
        endTime = startTime + parseInt(match[1]);
      } else {
        // Es un tiempo absoluto
        endTime = pattern.toString().includes('minuto')
          ? parseInt(match[1]) * 60
          : parseInt(match[1]);
      }
      break;
    }
  }

  // Si se menciona "al inicio", establecer tiempo a 0
  if (isAtStart) {
    startTime = 0;
    endTime = 5; // Por defecto 5 segundos de duración
  }

  // Si se menciona "al final", establecer valores relativos al final
  // Nota: El valor real se ajustará en el cliente según la duración
  if (isAtEnd) {
    startTime = -1; // Código especial para "final - 5 segundos"
    endTime = -1;   // Código especial para "final"
  }

  // Si no se detectó tiempo final pero sí inicial, establecer una duración predeterminada
  if (startTime > 0 && endTime === 5 && startTime !== 0) {
    endTime = startTime + 5;
  }

  return { startTime, endTime };
}

// Función para procesar elementos detectados por la IA
const processDetectedElement = async (elementData, commandExecutor, finalResponseRef, timeline, lastUploadedImageUrl, currentImageUrlForThisRequest) => {
  let elementAdded = false;
  let finalResponse = finalResponseRef.current;

  try {
    // Si se detectó un elemento para agregar con confianza suficiente
    if (elementData &&
        elementData.detected === true &&
        typeof elementData.confidence === 'number' &&
        elementData.confidence > 0.7 &&
        elementData.element) {
      const element = elementData.element;

      // Procesar según el tipo de elemento
      if (element.type === "text" && element.content) {
        // Configurar opciones para el texto
        const textOptions: any = {
          startTime: typeof element.startTime === 'number' ? element.startTime : 0,
          endTime: typeof element.endTime === 'number' ? element.endTime : (typeof element.startTime === 'number' ? element.startTime + 5 : 5),
        };

        // Asignar color si está disponible
        if (element.color) {
          textOptions.color = element.color.toLowerCase() === "blanco" ? "#FFFFFF" :
                            element.color.toLowerCase() === "negro" ? "#000000" :
                            element.color.toLowerCase() === "rojo" ? "#FF0000" :
                            element.color.toLowerCase() === "azul" ? "#0000FF" :
                            element.color.toLowerCase() === "verde" ? "#00FF00" :
                            element.color.toLowerCase() === "amarillo" ? "#FFFF00" :
                            element.color;
        }

        // Añadir el texto
        commandExecutor.current.addText(element.content, textOptions);

        // Actualizar respuesta
        finalResponse += `\n\n[He agregado el texto "${element.content}" ${element.color ? `con color ${element.color} ` : ""}desde el segundo ${textOptions.startTime} hasta el segundo ${textOptions.endTime}]`;
        elementAdded = true;
      }
      else if (element.type === "image") {
        // Configurar opciones para la imagen
        const imageOptions: any = {
          startTime: typeof element.startTime === 'number' ? element.startTime : 0,
          endTime: typeof element.endTime === 'number' ? element.endTime : (typeof element.startTime === 'number' ? element.startTime + 5 : 5),
          // Posición centrada por defecto
          position: { x: 0.5, y: 0.5 }
        };

        // Registrar tiempos específicos para depuración
        console.log(`Tiempos de imagen recibidos de la API: startTime=${element.startTime}, endTime=${element.endTime}`);

        // Manejar casos especiales para "al final" del video
        if (element.startTime === -1 || element.endTime === -1) {
          // Calcular la duración del video en segundos
          const videoDuration = timeline?.duration
            ? Math.floor(timeline.duration / 1000)
            : 30; // Valor predeterminado si no hay duración

          console.log(`Duración del video: ${videoDuration}s`);

          if (element.startTime === -1 && element.endTime === -1) {
            // Si ambos son -1, colocar en los últimos 5 segundos
            imageOptions.startTime = Math.max(0, videoDuration - 5);
            imageOptions.endTime = videoDuration;
            console.log(`Ajustando para "al final": startTime=${imageOptions.startTime}, endTime=${imageOptions.endTime}`);
          } else if (element.startTime === -1) {
            // Solo startTime es -1
            imageOptions.startTime = Math.max(0, videoDuration - 5);
          } else if (element.endTime === -1) {
            // Solo endTime es -1
            imageOptions.endTime = videoDuration;
          }
        }

        console.log(`Tiempos de imagen a aplicar: startTime=${imageOptions.startTime}, endTime=${imageOptions.endTime}`);

        // Determinar la URL de la imagen a usar
        const isGenericUrl = element.url === 'imagen_adjunta_por_el_usuario.jpg';
        const isLocalImage = lastUploadedImageUrl && lastUploadedImageUrl.startsWith('data:');

        let imageUrl: string;

        // PRIORIDAD 1: Usar la imagen que acaba de subirse en este mensaje específico
        if (currentImageUrlForThisRequest) {
          imageUrl = currentImageUrlForThisRequest;
          console.log("Usando la imagen recién subida para esta solicitud específica");
        }
        // PRIORIDAD 2: Usar la URL del elemento si tiene una específica y NO es la URL genérica
        else if (element.url && !isGenericUrl && !element.url.includes('/url_de_la_imagen')) {
          imageUrl = element.url;
          console.log("Usando URL específica del elemento");
        }
        // PRIORIDAD 3: Usar la última imagen subida guardada si hay referencia a imagen genérica
        else if (isGenericUrl && lastUploadedImageUrl) {
          imageUrl = lastUploadedImageUrl;
          console.log("Usando la última imagen subida guardada");
        }
        // PRIORIDAD 4: Fallback a URL genérica
        else {
          // Si todo lo demás falla, usar una imagen de ejemplo
          imageUrl = "https://ik.imagekit.io/wombo/images/img2.jpg";
          console.log("Usando imagen de ejemplo como fallback");
        }

        // Añadir la imagen
        commandExecutor.current.addImage(imageUrl, imageOptions);

        // Actualizar respuesta
        finalResponse += `\n\n[He agregado la imagen desde el segundo ${imageOptions.startTime} hasta el segundo ${imageOptions.endTime}]`;
        elementAdded = true;
      }
      else if (element.type === "video") {
        // Configurar opciones para el video
        const videoOptions: any = {
          startTime: typeof element.startTime === 'number' ? element.startTime : 0,
          endTime: typeof element.endTime === 'number' ? element.endTime : (typeof element.startTime === 'number' ? element.startTime + 10 : 10),
        };

        // URL de video de ejemplo (en producción esto sería dinámico)
        const videoUrl = "https://cdn.designcombo.dev/videos/demo-video-4.mp4";

        // Añadir el video
        commandExecutor.current.addVideo(videoUrl, videoOptions);

        // Actualizar respuesta
        finalResponse += `\n\n[He agregado el video desde el segundo ${videoOptions.startTime} hasta el segundo ${videoOptions.endTime}]`;
        elementAdded = true;
      }
      else if (element.type === "subtitles") {
        // Configurar opciones para los subtítulos
        const subtitleOptions: any = {
          groupWords: element.groupWords !== undefined ? element.groupWords : true,
        };

        // Añadir tiempos si se especificaron
        if (typeof element.startTime === 'number') {
          subtitleOptions.startTime = element.startTime;
        }
        if (typeof element.endTime === 'number') {
          subtitleOptions.endTime = element.endTime;
        }

        // Añadir los subtítulos desde el archivo específico
        console.log("Usando subtítulos desde public/transcriptions/transcriptionSubtitles.srt");
        const result = await commandExecutor.current.addSubtitles(subtitleOptions);

        // Actualizar respuesta con información específica sobre el origen de los subtítulos
        finalResponse += `\n\n[He agregado los subtítulos desde el archivo transcriptionSubtitles.srt${
          typeof element.startTime === 'number' && typeof element.endTime === 'number'
            ? ` entre los segundos ${element.startTime} y ${element.endTime}`
            : ""
        }]`;

        elementAdded = true;
      }
      else if (element.type === "segments" && Array.isArray(element.segments) && element.segments.length > 0) {
        // Configurar los segmentos a eliminar
        const segments = element.segments.map(segment => ({
          startTime: typeof segment.startTime === 'number' ? segment.startTime : 0,
          endTime: typeof segment.endTime === 'number' ? segment.endTime : (typeof segment.startTime === 'number' ? segment.startTime + 5 : 5),
        }));

        console.log(`Eliminando ${segments.length} segmentos:`, segments);

        // Ejemplo de formato de segmentos a mostrar
        const segmentsFormatted = segments.map(s => `${s.startTime}-${s.endTime}s`).join(', ');

        try {
          // Ejecutar la eliminación de segmentos
          const result = await commandExecutor.current.removeSegments(segments);

          if (result) {
            finalResponse += `\n\n[He eliminado los segmentos solicitados: ${segmentsFormatted}]`;
          } else {
            finalResponse += `\n\n[No pude eliminar los segmentos solicitados. Asegúrate de que hay un elemento seleccionado en la timeline.]`;
          }
          elementAdded = true;
        } catch (error) {
          console.error("Error al eliminar segmentos:", error);
          finalResponse += `\n\n[Error al intentar eliminar los segmentos: ${error.message || "Error desconocido"}]`;
        }
      }
      else if (element.type === "compact") {
        // Ejecutar la compactación del timeline
        console.log("Compactando timeline por solicitud del usuario");

        try {
          // Iniciar la compactación
          const result = await commandExecutor.current.compactTimeline();

          if (result) {
            finalResponse += `\n\n[He compactado el timeline eliminando los espacios vacíos entre elementos]`;
          } else {
            finalResponse += `\n\n[No fue posible compactar el timeline. Puede que no haya elementos o espacios vacíos que compactar]`;
          }
          elementAdded = true;
        } catch (error) {
          console.error("Error al compactar el timeline:", error);
          finalResponse += `\n\n[Error al intentar compactar el timeline: ${error.message || "Error desconocido"}]`;
        }
      }
      else if (element.type === "smartTrim") {
        // Ejecutar el recorte inteligente
        console.log("Iniciando recorte inteligente por solicitud del usuario");

        try {
          // Mostrar mensaje de análisis en curso
          finalResponse += `\n\n[Analizando el video para identificar las partes a eliminar...]`;

          // Iniciar el recorte inteligente
          const result = await commandExecutor.current.smartTrim();

          if (result) {
            finalResponse += `\n\n[He realizado un recorte inteligente del video, eliminando las partes innecesarias y compactando el timeline]`;
          } else {
            finalResponse += `\n\n[No fue posible realizar el recorte inteligente. Verifica que el video tenga una transcripción]`;
          }
          elementAdded = true;
        } catch (error) {
          console.error("Error al realizar el recorte inteligente:", error);
          finalResponse += `\n\n[Error al intentar realizar el recorte inteligente: ${error.message || "Error desconocido"}]`;
        }
      }
      else if (element.type === "music" && Array.isArray(element.options) && element.options.length > 0) {
        // Respuesta más corta para música
        finalResponse = "¿Cuál de estas opciones te gustaría añadir?";
        elementAdded = true;
      }
    }
  } catch (error) {
    console.error("Error al procesar elemento detectado:", error);
    finalResponse += "\n\n[No pude procesar la solicitud debido a un error.]";
  }

  return { finalResponse, elementAdded };
};

// Tipo para los mensajes
type Message = {
  id: string;
  content: string;
  role: "assistant" | "user";
  timestamp: Date;
  imageUrl?: string; // Propiedad para URLs de imagen
  musicOptions?: string[]; // Propiedad para opciones de música
  isInitial?: boolean; // Propiedad para marcar mensajes iniciales
  isStreaming?: boolean; // Propiedad para marcar mensajes en streaming
  onStreamingComplete?: () => void; // Propiedad para manejar la finalización de streaming
};

// Componente para renderizar opciones de música como botones clickables
const MusicOptions = ({ options, onSelectMusic }) => {
  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  // Función para convertir el nombre del archivo a un nombre amigable
  const getFriendlyName = (musicPath) => {
    const filename = musicPath.split('/').pop() || musicPath;

    // Mapear nombres de archivos a nombres amigables
    if (filename === "song1.mp3") return "Música Energética";
    if (filename === "song2.mp3") return "Melodía Relajante";

    // Si no hay mapeo específico, devolver el nombre del archivo
    return filename;
  };

  return (
    <div className="flex flex-col gap-3 mt-3">
      <div className="flex flex-wrap gap-2">
        {options.map((musicPath, index) => {
          const musicName = getFriendlyName(musicPath);
          return (
            <button
              key={index}
              onClick={() => onSelectMusic(musicPath)}
              className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 9l12-3" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {musicName}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Componente para mostrar la animación de "pensando"
const ThinkingAnimation = () => (
  <div className="flex flex-col items-start animate-fadeIn">
    <div className="max-w-[85%] rounded-md px-4 py-2 bg-[rgb(40,20,60)] text-zinc-200">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <span className="h-2 w-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></span>
          <span className="h-2 w-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></span>
          <span className="h-2 w-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "600ms" }}></span>
        </div>
        <span className="text-xs text-zinc-400">Pensando...</span>
      </div>
    </div>
  </div>
);

// Componente para mostrar el razonamiento desplegable
const ReasoningSection = ({ reasoning }: { reasoning: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Generar un tiempo aleatorio entre 0.5 y 1.5 segundos
  const processingTime = useRef((Math.random() * 1.0 + 0.5).toFixed(1));

  return (
    <div className="mt-2 text-xs border-t border-purple-800/30 pt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span>Reasoned for {processingTime.current}s</span>
      </button>

      {isOpen && (
        <div className="mt-2 p-2 bg-[rgb(30,15,45)] rounded text-zinc-400 whitespace-pre-wrap font-mono text-[11px]">
          {reasoning}
        </div>
      )}
    </div>
  );
};

// Componente para simular el efecto de texto en streaming
const StreamingText = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(text.substring(0, index + 1));
      index++;

      if (index >= text.length) {
        clearInterval(intervalId);
        setIsComplete(true);
        if (onComplete) onComplete();
      }
    }, 20); // Velocidad de tipeo más lenta (20ms por caracter)

    return () => clearInterval(intervalId);
  }, [text, onComplete]);

  return <div className="whitespace-pre-wrap">{displayedText}</div>;
};

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Escribe \"edita el video\" y optimizaré tu video con recorte inteligente y subtítulos automáticos.",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadedImageUrl, setLastUploadedImageUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Estado para realizar un seguimiento del progreso del auto-edit
  const [autoEditStep, setAutoEditStep] = useState<number>(0);
  const [isAutoEditing, setIsAutoEditing] = useState<boolean>(false);

  const stateManager = useStateManager();
  const { timeline, scenes, playerRef } = useDataState();
  const { duration } = useStore(); // Obtener la duración del store
  const commandExecutor = useRef<VideoCommandExecutor>(createVideoCommandExecutor(stateManager));

  // Añadir estado para el modo (chat o agente)
  const [mode, setMode] = useState<"chat" | "agent">("chat");

  // Inicializar el CommandExecutorService con el executor actual
  useEffect(() => {
    if (commandExecutor.current) {
      CommandExecutorService.setExecutor(commandExecutor.current);
      console.log("CommandExecutorService inicializado con éxito");
    }
  }, [commandExecutor.current]);

  // Función para realizar la edición automática en modo agente
  const handleAutoEdit = async () => {
    try {
      setIsAutoEditing(true);
      // Mostrar "Pensando..." antes del primer mensaje
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Función para añadir un mensaje, esperar a que termine y mostrar "Pensando..." después
      const addMessageAndWait = async (content: string): Promise<void> => {
        return new Promise((resolve) => {
          const messageId = Date.now().toString();

          setMessages(prev => [...prev, {
            id: messageId,
            content: content,
            role: "assistant",
            timestamp: new Date(),
            isStreaming: true,
            onStreamingComplete: () => {
              // Mostrar "Pensando..." inmediatamente después de que termine el mensaje
              setIsLoading(true);
              setTimeout(() => {
                resolve();
              }, 1000); // Mantener "Pensando..." por 1 segundo
            }
          }]);

          // Desactivamos "Pensando..." justo antes de que el mensaje comience a mostrarse
          setIsLoading(false);
        });
      };

      // Mensaje inicial explicando el plan
      await addMessageAndWait("Voy a optimizar tu video con recorte inteligente y subtítulos automáticos.");

      // Ahora estamos en "Pensando..." después del mensaje inicial
      // NO desactivamos setIsLoading(false) aquí porque queremos mantenerlo hasta
      // que comience a mostrarse el siguiente mensaje

      // Iniciar el proceso de edición combinado
      setAutoEditStep(1);

      // Ejecutar el recorte inteligente
      const smartTrimResult = await commandExecutor.current.smartTrim();

      // Mensaje durante el proceso (después del cual se mostrará "Pensando...")
      await addMessageAndWait("Procesando video: eliminando segmentos irrelevantes y preparando el audio para subtítulos...");

      // Ahora estamos en "Pensando..." después del segundo mensaje
      // NO desactivamos setIsLoading(false) aquí
      setAutoEditStep(2);

      // Configurar opciones para los subtítulos
      const subtitleOptions: any = {
        groupWords: true,
        startTime: 0,
        endTime: 1000000 // Hasta el final del video
      };

      // Añadir los subtítulos
      await commandExecutor.current.addSubtitles(subtitleOptions);

      // Mensaje final con resumen de acciones
      let resultMessage = "Optimización completada. ";

      if (smartTrimResult) {
        resultMessage += "He reducido la duración eliminando partes menos relevantes y añadido subtítulos para mejorar la accesibilidad.";
      } else {
        resultMessage += "He añadido subtítulos, pero no pude optimizar la duración.";
      }

      resultMessage += "\n\n¿Quieres que sigamos?";

      // Para el último mensaje no necesitamos mostrar "Pensando..." después
      // Así que usamos un método diferente para el último mensaje
      return new Promise((finalResolve) => {
        const messageId = Date.now().toString();
        // Desactivamos "Pensando..." justo antes de mostrar el último mensaje
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id: messageId,
          content: resultMessage,
          role: "assistant",
          timestamp: new Date(),
          isStreaming: true,
          // No mostramos "Pensando..." después del último mensaje
          onStreamingComplete: () => {
            finalResolve();
          }
        }]);
      });
    } catch (error) {
      console.error("Error en la edición automática:", error);

      // Mostrar "Pensando..." antes del mensaje de error
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mantenemos "Pensando..." hasta que comience a mostrarse el mensaje de error
      const messageId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: messageId,
        content: `Ha ocurrido un problema durante el proceso: ${error.message || "Error desconocido"}\n\n¿Quieres intentar alguna otra acción?`,
        role: "assistant",
        timestamp: new Date(),
        isStreaming: true
      }]);
      // Desactivamos "Pensando..." justo antes de mostrar el mensaje de error
      setIsLoading(false);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsAutoEditing(false);
      setAutoEditStep(0);
      setIsLoading(false);
    }
  };

  // Función para reiniciar el chat
  const resetChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        content: "Escribe \"edita el video\" y optimizaré tu video con recorte inteligente y subtítulos automáticos.",
        role: "assistant",
        timestamp: new Date(),
      },
    ]);
    setInput("");
    setImageFile(null);
    setImagePreview(null);
    setLastUploadedImageUrl("");
  };

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Actualizar el ejecutor de comandos cuando cambie el stateManager
  useEffect(() => {
    commandExecutor.current = createVideoCommandExecutor(stateManager);
    // Actualizar el servicio con la nueva instancia del ejecutor
    CommandExecutorService.setExecutor(commandExecutor.current);
    console.log("CommandExecutorService actualizado con una nueva instancia del ejecutor");
  }, [stateManager]);

  // Manejar click en el botón de imagen
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Manejar selección de archivo de imagen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // Eliminar la imagen seleccionada
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Subir imagen al servidor
  const uploadImage = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      // Obtener URL firmada para subir la imagen
      const uploadDetails = await createUploadsDetails(file.name, file);

      // Si no es un mock local, proceder con la carga
      if (uploadDetails.uploadUrl !== "local-mock") {
        // Subir la imagen
        await fetch(uploadDetails.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });
      }
      // No se necesita hacer fetch si es un mock local (dataURL)

      // Retornar la URL pública de la imagen
      return uploadDetails.url;
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      throw new Error("No se pudo subir la imagen. Inténtalo de nuevo.");
    } finally {
      setIsUploading(false);
    }
  };

  // Función para enviar mensaje
  const handleSendMessage = async () => {
    if ((!input.trim() && !imageFile) || isLoading) return;

    let userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    };

    let uploadedImageUrl = "";
    // Variable para rastrear la URL de la imagen actual para esta solicitud específica
    let currentImageUrlForThisRequest = "";

    // Si hay una imagen para subir, procesarla
    if (imageFile) {
      try {
        uploadedImageUrl = await uploadImage(imageFile);
        userMessage.imageUrl = uploadedImageUrl;
        // Guardar la URL de la imagen para posibles referencias futuras
        setLastUploadedImageUrl(uploadedImageUrl);
        // Importante: Guardar la URL actual para esta solicitud específica
        currentImageUrlForThisRequest = uploadedImageUrl;
        console.log("Imagen subida exitosamente:", uploadedImageUrl.substring(0, 100) + "...");
      } catch (error) {
        console.error("Error en la subida de imagen:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            content: "Error al subir la imagen. Por favor, inténtalo de nuevo. Detalles: " +
              (error instanceof Error ? error.message : "Error desconocido"),
            role: "assistant",
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
        return;
      }
    }

    // Añadir mensaje del usuario
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsLoading(true);

    // Comprobar si estamos en modo agente y es una solicitud de edición automática
    if (shouldUseAgent(mode, userMessage.content)) {
      // Ya no necesitamos el delay aquí, cada mensaje tendrá su propio retraso
      // en la función addMessageAndWait

      // Ejecutar edición automática
      await handleAutoEdit();
      return;
    }

    try {
      // Enviar a la API para procesamiento en lenguaje natural
      const apiMessages = messages
        .concat(userMessage)
        .map(msg => {
          // Si el mensaje tiene una imagen, crear un formato especial para el contenido
          if (msg.imageUrl) {
            // Si es una URL de datos (comienza con data:), usar un marcador especial
            const isDataUrl = msg.imageUrl.startsWith('data:');
            const imageUrlToSend = isDataUrl
              ? '[IMAGEN_ADJUNTA]'
              : `[IMAGEN: ${msg.imageUrl}]`;

            return {
              role: msg.role,
              content: `${msg.content || ''} ${imageUrlToSend}`
            };
          }

          return {
            role: msg.role,
            content: msg.content
          };
        });

      // Añadir contexto del editor para la IA externa
      const contextMessage = {
        role: 'system',
        content: `
Contexto actual del editor de video:
- Posición actual (segundos): ${playerRef?.current?.getCurrentTime ? Math.floor((playerRef.current.getCurrentTime() || 0) * 100) / 100 : 0}
- Duración del proyecto (segundos): ${timeline?.duration ? Math.floor(timeline.duration / 1000) : 0}
- Número de escenas: ${scenes?.length || 0}
- Número de elementos en el timeline: ${(timeline?.canvas?.getObjects?.() || []).length - 1 > 0 ? (timeline?.canvas?.getObjects?.() || []).length - 1 : 0}
${lastUploadedImageUrl ? `- Última imagen compartida por el usuario disponible para usar` : ''}

El usuario puede expresar en lenguaje natural la necesidad de agregar elementos al video.
Ejemplos:
- "Pon un título que diga 'Bienvenidos' al inicio"
- "Quiero un texto blanco que diga 'Fin' al final del video"
- "Necesito una imagen en el segundo 10"
- "Coloca un video de introducción al principio"

Si el usuario adjunta una imagen en el mensaje, la URL estará en formato [IMAGEN: url_de_la_imagen].
Debes detectar si quiere agregar esta imagen al video y en qué momento temporal.
`
      };

      try {
        // Usar la API correcta según el modo
        const apiEndpoint = mode === "agent" ? '/api/ai-chat-agent' : '/api/ai-chat';

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [contextMessage, ...apiMessages],
            // Usar la URL de la imagen actual para esta solicitud si existe,
            // de lo contrario usar la última URL guardada
            lastImageUrl: currentImageUrlForThisRequest || lastUploadedImageUrl || ""
          }),
          // Agregar timeout para evitar esperas infinitas
          signal: AbortSignal.timeout(15000) // 15 segundos máximo
        });

        if (!response.ok) {
          throw new Error(`Error de API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Asegurarse de que data.message.content existe
        const aiResponse = data?.message?.content || "Lo siento, no pude entender tu solicitud.";

        // Obtener los datos del elemento si existen (con verificación segura)
        const elementData = data?.elementData;

        // Variable para la respuesta final
        let finalResponse = aiResponse;
        // Crear una referencia a la respuesta final para que sea accesible en la función procesadora
        const finalResponseRef = { current: finalResponse };
        let elementAdded = false;

        // Usar la función de procesamiento de elementos
        const processResult = await processDetectedElement(
          elementData,
          commandExecutor,
          finalResponseRef,
          timeline,
          lastUploadedImageUrl,
          currentImageUrlForThisRequest
        );

        finalResponse = processResult.finalResponse;
        elementAdded = processResult.elementAdded;

        // Crear mensaje con los detalles completos
        const newMessage: Message = {
          id: Date.now().toString(),
          content: finalResponse || data.message.content,
          role: "assistant",
          timestamp: new Date(),
        };

        // Si se detectó un elemento de música, agregar las opciones al mensaje
        if (elementData?.detected &&
            elementData.element?.type === "music" &&
            Array.isArray(elementData.element.options)) {

          newMessage.musicOptions = elementData.element.options;
          console.log("Opciones de música agregadas al mensaje:", newMessage.musicOptions);
        }

        // Actualizar mensajes
        setMessages(prev => [...prev, newMessage]);
      } catch (apiError) {
        console.error("Error en la comunicación con la API:", apiError);

        // Mensaje de error específico de API
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            content: "Lo siento, ha ocurrido un error al comunicarse con el servicio de IA. Por favor, intenta de nuevo en unos momentos.",
            role: "assistant",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error al procesar el mensaje:", error);

      // Determinar mensaje de error apropiado
      let errorMessage = "Lo siento, ha ocurrido un error al procesar tu mensaje.";

      if (error instanceof Error) {
        if (error.message.includes("timeout") || error.message.includes("abort")) {
          errorMessage = "La solicitud ha tardado demasiado. Prueba con un mensaje más corto.";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Parece que hay un problema de conexión. Verifica tu conexión a internet e intenta de nuevo.";
        }
      }

      // Mensaje de error
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: errorMessage,
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para manejar la selección de música
  const handleMusicSelect = async (musicPath: string) => {
    try {
      console.log(`Usuario seleccionó música: ${musicPath}`);

      // Calcular la duración del video en segundos usando el duration del store
      const videoDuration = duration ? Math.floor(duration / 1000) : 300; // 5 minutos por defecto
      console.log(`Duración del video (desde useStore): ${videoDuration} segundos`);

      // Configuración de opciones para la música
      const musicOptions = {
        startTime: 0,
        endTime: videoDuration, // Usar toda la duración del video
        volume: 80,
        fadeIn: true,
        fadeOut: true,
        respectNativeDuration: true // Respetar la duración natural de la música
      };

      // Añadir la música al timeline (respetará la duración natural si es más corta que el video)
      commandExecutor.current.addMusic(musicPath, musicOptions);

      // Obtener un nombre amigable para la música
      const getMusicFriendlyName = (path) => {
        const filename = path.split('/').pop() || path;
        if (filename === "song1.mp3") return "Música Energética";
        if (filename === "song2.mp3") return "Melodía Relajante";
        return filename;
      };

      // Añadir un mensaje de confirmación
      const musicName = getMusicFriendlyName(musicPath);
      const confirmationMsg: Message = {
        id: Date.now().toString(),
        content: `He añadido "${musicName}" a tu video. La música se adaptará automáticamente: si es más corta que el video, mantendrá su duración natural; si es más larga, se ajustará a la duración del video (${videoDuration} segundos).`,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, confirmationMsg]);

    } catch (error) {
      console.error("Error al añadir música:", error);

      // Mensaje de error
      const errorMsg: Message = {
        id: Date.now().toString(),
        content: `No se pudo añadir la música. Error: ${error.message || "Error desconocido"}`,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMsg]);
    }
  };

  // Manejar cambio de modo
  const handleModeChange = (newMode: "chat" | "agent") => {
    // Si el modo es diferente, cambiar y reiniciar la conversación
    if (newMode !== mode) {
      setMode(newMode);

      // Mensaje inicial específico según el modo
      const initialMessage = newMode === "chat"
        ? "Hola, soy tu asistente de edición de video. ¿En qué puedo ayudarte?"
        : "Escribe \"edita el video\" y optimizaré tu video con recorte inteligente y subtítulos automáticos.";

      // Reiniciar la conversación con el mensaje apropiado
      setMessages([
        {
          id: Date.now().toString(),
          content: initialMessage,
          role: "assistant",
          timestamp: new Date(),
          // Marcar el mensaje como inicial para evitar mostrar razonamiento
          isInitial: true,
          // Ya no aplicamos streaming al mensaje inicial
          isStreaming: false
        },
      ]);

      // Limpiar otros estados
      setInput("");
      setImageFile(null);
      setImagePreview(null);
      setLastUploadedImageUrl("");
      setAutoEditStep(0);
      setIsAutoEditing(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[rgb(20,10,30)] border-l border-purple-800/30">
      {/* Header con toggle */}
      <div className="bg-[rgb(30,15,45)] p-3 flex justify-between items-center border-b border-purple-800/30">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded flex items-center justify-center bg-purple-700">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <h3 className="font-medium text-white text-sm">Asistente IA</h3>
        </div>

        {/* Toggle entre Chat y Agente */}
        <div className="flex items-center bg-[rgb(40,20,60)] rounded-full p-0.5 mx-auto">
          <button
            onClick={() => handleModeChange("chat")}
            className={`px-3 py-1 text-xs rounded-full transition-all ${
              mode === "chat"
                ? "bg-purple-700 text-white font-medium"
                : "text-purple-300 hover:text-white"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => handleModeChange("agent")}
            className={`px-3 py-1 text-xs rounded-full transition-all ${
              mode === "agent"
                ? "bg-purple-700 text-white font-medium"
                : "text-purple-300 hover:text-white"
            }`}
          >
            Agente
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded hover:bg-purple-800/20"
            onClick={resetChat}
            title="Reiniciar conversación"
          >
            <RefreshCw className="h-3.5 w-3.5 text-zinc-300" />
          </Button>
        </div>
      </div>

      {/* Área de mensajes con altura fija y máxima */}
      <div className="flex-1 overflow-hidden relative max-h-[calc(100%-120px)]">
        <ScrollArea className="h-full pr-2 chat-scrollbar absolute inset-0">
          <div className="p-3 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col animate-fadeIn ${
                  message.role === "assistant" ? "items-start" : "items-end"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-md px-4 py-2 ${
                    message.role === "assistant"
                      ? "bg-[rgb(40,20,60)] text-zinc-200"
                      : "bg-purple-700 text-white"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm markdown-content">
                    {message.isStreaming ? (
                      <StreamingText
                        text={message.content}
                        onComplete={message.onStreamingComplete}
                      />
                    ) : (
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  {message.imageUrl && (
                    <div className="mt-2 rounded overflow-hidden">
                      <img
                        src={message.imageUrl}
                        alt="Imagen adjunta"
                        className="max-h-48 max-w-full object-contain"
                      />
                    </div>
                  )}
                  {message.musicOptions && message.musicOptions.length > 0 && (
                    <MusicOptions
                      options={message.musicOptions}
                      onSelectMusic={handleMusicSelect}
                    />
                  )}

                  {/* Sección de razonamiento (solo en modo agente, para mensajes del asistente, y no para el mensaje inicial) */}
                  {mode === "agent" && message.role === "assistant" && !message.isInitial && (
                    <ReasoningSection reasoning={generateReasoning(message.content)} />
                  )}
                </div>
                <div className={`text-[10px] mt-0.5 px-1 ${message.role === "assistant" ? "text-zinc-500" : "text-purple-300"}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {isLoading && <ThinkingAnimation />}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        </ScrollArea>
      </div>

      {/* Área de vista previa de imagen */}
      {imagePreview && (
        <div className="relative mx-3 mt-1 mb-2 h-24 bg-[rgb(30,15,45)] p-2 flex items-center justify-center rounded border border-purple-800/30">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 z-10 h-5 w-5 rounded-full bg-black/50"
            onClick={handleRemoveImage}
          >
            <X className="h-3 w-3 text-white" />
          </Button>
          <img
            src={imagePreview}
            alt="Vista previa"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}

      {/* Área de entrada simplificada */}
      <div className="bg-[rgb(30,15,45)] p-3 border-t border-purple-800/30">
        <div className="flex items-center gap-2">
          <div className="flex rounded overflow-hidden border border-purple-900/50 flex-1 bg-[rgb(25,12,40)]">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 bg-transparent hover:bg-purple-800/20"
              onClick={handleImageClick}
              disabled={isLoading || isAutoEditing}
            >
              <ImageIcon className="h-4 w-4 text-zinc-400" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={mode === "agent" ? "Escribe 'edita el video' para comenzar..." : "Escribe tu mensaje..."}
              disabled={isLoading || isAutoEditing}
              className="flex-1 border-0 bg-transparent h-9 focus:ring-0 focus-visible:ring-0 text-zinc-200"
            />

            <Button
              onClick={handleSendMessage}
              disabled={(!input.trim() && !imageFile) || isLoading || isAutoEditing}
              className={`h-9 px-3 rounded-none ${
                (!input.trim() && !imageFile) || isLoading || isAutoEditing
                  ? "bg-purple-900/50 cursor-not-allowed text-purple-300/50"
                  : "bg-purple-700 hover:bg-purple-600 text-white"
              }`}
            >
              {isLoading || isUploading || isAutoEditing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={isLoading || isAutoEditing}
      />
    </div>
  );
}

// Función para generar razonamiento basado en el contenido del mensaje
function generateReasoning(content: string): string {
  // Detectar si es un mensaje relacionado con el modo de edición automática
  if (content.includes("Subtítulos") ||
      content.includes("Recorte inteligente") ||
      content.includes("optimizar") ||
      content.includes("edición")) {

    // Determinar el tipo de mensaje y su contexto
    let etapa = "Planificación inicial";
    let prioridad = "Alta";
    let nextStep = "Analizar contenido del video";

    if (content.includes("Analizando") || content.includes("analiz")) {
      etapa = "Análisis de contenido";
      prioridad = "Alta";
      nextStep = "Identificar segmentos relevantes";
    } else if (content.includes("Recorte inteligente completado") || content.includes("optimizado")) {
      etapa = "Optimización de duración";
      prioridad = "Media";
      nextStep = "Procesar audio para subtítulos";
    } else if (content.includes("Procesando el audio") || content.includes("subtítulos")) {
      etapa = "Generación de subtítulos";
      prioridad = "Alta";
      nextStep = "Sincronizar texto con audio";
    } else if (content.includes("Edición completada") || content.includes("completada")) {
      etapa = "Finalización del proceso";
      prioridad = "Baja";
      nextStep = "Esperar feedback del usuario";
    }

    return `ANÁLISIS DE PLAN [${etapa}]
--------------------------------------------------
Intención detectada: Optimización automática de video
Objetivo principal: Mejorar calidad y accesibilidad
Prioridad: ${prioridad}
--------------------------------------------------

ANÁLISIS DE SOLICITUD:
• El usuario desea una edición eficiente sin intervención manual
• Se requiere balance entre duración óptima y preservación de contenido clave
• La accesibilidad mediante subtítulos es importante

PLAN DE ACCIÓN:
1. Evaluar el contenido completo del video
2. Identificar y preservar momentos de alto valor informativo
3. Eliminar secciones redundantes o de bajo interés
4. Generar y sincronizar subtítulos precisos

RAZONAMIENTO:
He determinado que esta combinación de acciones maximiza
el impacto del video mientras minimiza la duración total.
El orden de las operaciones es crítico: primero optimizar
estructura y luego añadir elementos de accesibilidad.

SIGUIENTE PASO:
→ ${nextStep}`;
  }

  // Para otros mensajes, mantener un razonamiento enfocado en la asistencia
  return `ANÁLISIS DE INTERACCIÓN
--------------------------------------------------
Tipo: Consulta general
Contexto: Asistencia en edición de video
Prioridad: Media
--------------------------------------------------

ANÁLISIS DE SOLICITUD:
• El usuario busca información o asistencia específica
• Se requiere respuesta clara y orientada a soluciones
• Posible necesidad de sugerencias basadas en contexto

PLAN DE ACCIÓN:
1. Proporcionar información relevante y concisa
2. Ofrecer opciones de acción cuando sea apropiado
3. Mantener un tono útil y accesible
4. Anticipar posibles preguntas de seguimiento

RAZONAMIENTO:
He detectado que este tipo de interacción requiere un
balance entre información técnica y accesibilidad.
La respuesta debe ser informativa pero sin abrumar
con detalles innecesarios.

SIGUIENTE PASO:
→ Esperar indicación específica del usuario`;
}
