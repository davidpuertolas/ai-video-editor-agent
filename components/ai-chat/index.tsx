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

// Tipo para los mensajes
type Message = {
  id: string;
  content: string;
  role: "assistant" | "user";
  timestamp: Date;
  imageUrl?: string; // Nueva propiedad para URLs de imagen
};

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

        // Añadir los subtítulos
        commandExecutor.current.addSubtitles(subtitleOptions);

        // Actualizar respuesta silenciosa (se maneja en otro lado)
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
    }
  } catch (error) {
    console.error("Error al procesar elemento detectado:", error);
    finalResponse += "\n\n[No pude procesar la solicitud debido a un error.]";
  }

  return { finalResponse, elementAdded };
};

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hola, soy tu asistente de edición de video. ¿En qué puedo ayudarte?",
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

  const stateManager = useStateManager();
  const { timeline, scenes, playerRef } = useDataState();
  const commandExecutor = useRef<VideoCommandExecutor>(createVideoCommandExecutor(stateManager));

  // Inicializar el CommandExecutorService con el executor actual
  useEffect(() => {
    if (commandExecutor.current) {
      CommandExecutorService.setExecutor(commandExecutor.current);
      console.log("CommandExecutorService inicializado con éxito");
    }
  }, [commandExecutor.current]);

  // Función para reiniciar el chat
  const resetChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        content: "Hola, soy tu asistente de edición de video. ¿En qué puedo ayudarte?",
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
  }, [messages]);

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
        const response = await fetch('/api/ai', {
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

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: finalResponse,
          role: "assistant",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
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

  return (
    <div className="flex h-full flex-col bg-[rgb(20,10,30)] border-l border-purple-800/30">
      {/* Header simplificado */}
      <div className="bg-[rgb(30,15,45)] p-3 flex justify-between items-center border-b border-purple-800/30">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded flex items-center justify-center bg-purple-700">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <h3 className="font-medium text-white text-sm">Asistente IA</h3>
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

      {/* Área de mensajes simplificada */}
      <ScrollArea className="flex-1 pr-2 chat-scrollbar">
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
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                {message.imageUrl && (
                  <div className="mt-2 rounded overflow-hidden">
                    <img
                      src={message.imageUrl}
                      alt="Imagen adjunta"
                      className="max-h-48 max-w-full object-contain"
                    />
                  </div>
                )}
              </div>
              <div className={`text-[10px] mt-0.5 px-1 ${message.role === "assistant" ? "text-zinc-500" : "text-purple-300"}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-2" />
        </div>
      </ScrollArea>

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
              disabled={isLoading}
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
              placeholder="Escribe tu mensaje..."
              disabled={isLoading}
              className="flex-1 border-0 bg-transparent h-9 focus:ring-0 focus-visible:ring-0 text-zinc-200"
            />

            <Button
              onClick={handleSendMessage}
              disabled={(!input.trim() && !imageFile) || isLoading}
              className={`h-9 px-3 rounded-none ${
                (!input.trim() && !imageFile) || isLoading
                  ? "bg-purple-900/50 cursor-not-allowed text-purple-300/50"
                  : "bg-purple-700 hover:bg-purple-600 text-white"
              }`}
            >
              {isLoading || isUploading ? (
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
        disabled={isLoading}
      />
    </div>
  );
}
