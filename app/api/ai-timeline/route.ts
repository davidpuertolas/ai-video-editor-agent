import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Inicializar el cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función para manejar los mensajes del chat de la timeline
async function handleTimelineChat(
  message: string,
  selectedItems: any[],
  selectedText: string,
  urlAnalysis: any,
  showScreenshotDetection: any,
  applyTransitionDetection: any
): Promise<any> {
  try {
    // Limitar la cantidad de elementos seleccionados para prevenir sobrecarga
    const limitedItems = selectedItems.slice(0, 5); // Solo considerar hasta 5 elementos

    // Función para sanear objetos complejos, eliminando campos innecesarios y limitando profundidad
    const sanitizeObject = (obj: any, depth: number = 0, maxDepth: number = 3): any => {
      if (depth >= maxDepth) return "[Objeto anidado]";
      if (obj === null || obj === undefined) return obj;

      // Para tipos primitivos, devolver directamente
      if (typeof obj !== 'object') return obj;

      // Para arrays, aplicar sanitización a cada elemento hasta cierto límite
      if (Array.isArray(obj)) {
        return obj.slice(0, 10).map(item => sanitizeObject(item, depth + 1, maxDepth));
      }

      // Para objetos, extraer solo campos esenciales
      const result: any = {};
      const essentialFields = [
        'id', 'type', 'display', 'text', 'content', 'name', 'details',
        'src', 'from', 'to', 'width', 'height'
      ];

      for (const field of essentialFields) {
        if (field in obj) {
          result[field] = sanitizeObject(obj[field], depth + 1, maxDepth);
        }
      }

      return result;
    };

    // Sanear los elementos seleccionados
    const sanitizedItems = limitedItems.map(item => sanitizeObject(item));

    // Extraer el contenido relevante de los elementos seleccionados de manera segura
    const extractedContent = sanitizedItems.map(item => {
      try {
        if (item.text) return String(item.text).slice(0, 100);
        if (item.details?.text) return String(item.details.text).slice(0, 100);
        if (item.name) return String(item.name).slice(0, 100);
        if (item.content) return String(item.content).slice(0, 100);
        if (typeof item === 'string') return item.slice(0, 100);
        return JSON.stringify(sanitizeObject(item, 0, 2)).slice(0, 100);
      } catch (err) {
        console.error("Error al extraer contenido de item:", err);
        return "[Error al procesar elemento]";
      }
    }).join('\n').slice(0, 500); // Limitar longitud total a 500 caracteres

    // Limitar también selectedText
    const limitedSelectedText = selectedText ? String(selectedText).slice(0, 300) : '';

    // Incluir información sobre las URLs detectadas en el mensaje del sistema
    let systemPrompt = "Eres un asistente de edición de video que ayuda a analizar y mejorar los elementos seleccionados en una timeline. Responde de manera concisa y útil.";

    // Si hay URLs en el texto, añadir información sobre ellas (limitada)
    if (urlAnalysis && urlAnalysis.containsURLs) {
      const limitedUrls = (urlAnalysis.urls || []).slice(0, 3).join('\n'); // Limitar a 3 URLs
      systemPrompt += `\n\nEl texto seleccionado contiene URLs, incluyendo: ${limitedUrls}`;

      // Informar que las capturas pueden ser aplicadas a la timeline (versión condensada)
      systemPrompt += "\n\nHay capturas disponibles. El usuario puede pedir añadirlas a la timeline.";

      // Añadir información resumida sobre la detección
      if (showScreenshotDetection && showScreenshotDetection.detected) {
        systemPrompt += " El usuario parece interesado en estas capturas.";
      }
    }

    // Añadir información sobre la detección de transiciones si existe
    if (applyTransitionDetection && applyTransitionDetection.detected) {
      systemPrompt += "\n\nEl usuario ha solicitado aplicar una transición a la timeline. Informa que la transición se ha aplicado correctamente en la timeline del video.";
    }

    // Limitamos mensaje del usuario
    const limitedMessage = message.slice(0, 200);

    console.log("Longitud de systemPrompt:", systemPrompt.length);
    console.log("Longitud de extractedContent:", extractedContent.length);
    console.log("Longitud de limitedSelectedText:", limitedSelectedText.length);
    console.log("Longitud de limitedMessage:", limitedMessage.length);

    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Usar un modelo más económico
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Elementos seleccionados:\n${extractedContent}\n\nTexto seleccionado: ${limitedSelectedText || extractedContent}\n\nMensaje del usuario: ${limitedMessage}` }
      ],
      temperature: 0.7,
      max_tokens: 300 // Reducir para ahorrar tokens
    });

    // Crear estructura con formato similar al de otras detecciones en la API
    let screenshotData = null;
    let transitionData = null;

    if (urlAnalysis && urlAnalysis.containsURLs && showScreenshotDetection) {
      // Simplificar la detección de capturas
      screenshotData = {
        detected: showScreenshotDetection.detected && showScreenshotDetection.confidence > 0.2,
        confidence: showScreenshotDetection.confidence,
        reason: showScreenshotDetection.reason,
        urls: (urlAnalysis.urls || []).slice(0, 3), // Limitar a 3 URLs
        screenshots: (urlAnalysis.screenshots || []).slice(0, 3) // Limitar a 3 capturas
      };
    }

    // Añadir información sobre transiciones detectadas
    if (applyTransitionDetection) {
      transitionData = {
        detected: applyTransitionDetection.detected && applyTransitionDetection.confidence > 0.2,
        confidence: applyTransitionDetection.confidence,
        reason: applyTransitionDetection.reason,
        transitionPath: applyTransitionDetection.transitionPath || '/transitions/fade-out.apng'
      };
    }

    return {
      success: true,
      response: chatResponse.choices[0].message.content,
      usage: chatResponse.usage,
      screenshotData: screenshotData,
      transitionData: transitionData
    };
  } catch (error) {
    console.error("Error en handleTimelineChat:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Request body type:", body.type);

    // Manejar la solicitud del chat de la timeline
    const { message, selectedItems, selectedText, urlAnalysis, showScreenshotDetection, applyTransitionDetection } = body;
    // Registrar el tamaño de los datos recibidos para diagnóstico
    console.log("Tamaño de datos recibidos:");
    console.log("- Mensaje:", message?.length || 0, "caracteres");
    console.log("- Elementos seleccionados:", selectedItems?.length || 0, "elementos");
    console.log("- Texto seleccionado:", selectedText?.length || 0, "caracteres");

    const response = await handleTimelineChat(
      message,
      selectedItems || [],
      selectedText || "",
      urlAnalysis,
      showScreenshotDetection,
      applyTransitionDetection
    );
    return NextResponse.json(response);

  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }, { status: 500 });
  }
}
