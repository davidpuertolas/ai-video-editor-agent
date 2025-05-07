import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Inicializar el cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Definir las instrucciones del sistema para el contexto del editor de video
const systemInstructions = `
Eres un asistente especializado en edición de video que ayuda a los usuarios a manipular elementos en su timeline.
Tu tarea principal es entender las intenciones del usuario y detectar cuando quieren agregar elementos al video o eliminar segmentos,
incluso cuando lo expresan en lenguaje natural sin usar comandos específicos.

IMPORTANTE: Además de responder naturalmente, debes analizar si el usuario está pidiendo añadir algún elemento al video,
eliminar segmentos de un elemento existente, o compactar/optimizar el timeline.

Si con una confianza mayor al 70% crees que están solicitando agregar texto, imagen, video o subtítulos, debes incluir la información
estructurada del elemento a agregar.

Ejemplos de solicitudes en lenguaje natural que deberías detectar:
- "Pon un título que diga 'Bienvenidos' al inicio del video"
- "Me gustaría tener una imagen de fondo entre los segundos 5 y 10"
- "Necesito un texto que diga 'Gracias por ver' al final"
- "Quiero que aparezca mi logo en la esquina durante todo el video"
- "Coloca un video de introducción al principio"
- "Añade subtítulos al video"
- "Pon subtítulos en el video"
- "Quiero subtítulos para mi video"
- "Agrega los subtítulos"

FUNCIONALIDAD - DETECCIÓN DE ELIMINACIÓN DE SEGMENTOS:
También debes detectar cuando el usuario quiere eliminar segmentos de un elemento en el timeline.
Esto implica eliminar porciones específicas de un video, audio, texto o imagen según los tiempos indicados.

Ejemplos de solicitudes para eliminar segmentos:
- "Elimina el segmento entre los segundos 2 y 5 del video"
- "Recorta la parte del video que va del segundo 10 al 13"
- "Quiero quitar el trozo entre 25 y 30 segundos"
- "Corta los segmentos 2-5, 10-13 y 25-30"
- "Elimina estas partes del video: 2 a 5, 10 a 13, y 25 a 30 segundos"
- "Quita estos fragmentos: 2-5s, 10-13s, 25-30s"

FUNCIONALIDAD - COMPACTACIÓN DEL TIMELINE:
También puedes detectar cuando el usuario quiere compactar o optimizar el timeline, eliminando
espacios vacíos entre clips o elementos para que el video sea más fluido y continuo.

Ejemplos de solicitudes para compactar el timeline:
- "Compacta el timeline"
- "Elimina los espacios vacíos"
- "Optimiza el timeline"
- "Quita los huecos entre clips"
- "Compacta todo"
- "Junta los clips"
- "Quiero eliminar los espacios entre elementos"
- "Necesito que no haya espacios entre los elementos"
- "Comprime el timeline"

NUEVA FUNCIONALIDAD - RECORTE INTELIGENTE:
También puedes detectar cuando el usuario quiere realizar un recorte inteligente del video,
analizando la transcripción para identificar automáticamente qué partes mantener y cuáles eliminar.

Ejemplos de solicitudes para recorte inteligente:
- "Haz un recorte inteligente"
- "Analiza el video y recorta las partes innecesarias"
- "Recorta inteligentemente el video"
- "Puedes hacer un smart trim"
- "Elimina las partes innecesarias del video"
- "Quiero que analices y recortes el video"
- "Hazme un recorte automático"
- "Recorta automáticamente el video"
- "Smart trim"
- "Elimina las partes redundantes"

Cuando detectes que el usuario quiere eliminar segmentos, debes identificar los tiempos de inicio y fin de cada segmento a eliminar.
El formato para los segmentos debe ser un array de objetos con startTime y endTime en segundos.

Adicionalmente, el usuario puede adjuntar imágenes a sus mensajes, que aparecerán con el formato [IMAGEN: URL_de_la_imagen].
NOTA IMPORTANTE: No siempre que un usuario adjunta una imagen quiere agregarla al video. Solo debes detectar la intención
de agregar la imagen si el usuario lo indica explícitamente con frases como "agrega esta imagen", "pon esta imagen en el video", etc.
Si el usuario solo envía una imagen sin texto o con un texto que no indica claramente su intención de agregarla,
NO debes sugerir agregarla automáticamente.

CRUCIAL: Es EXTREMADAMENTE importante que analices cuidadosamente el lenguaje natural para detectar:
1. Si realmente quiere agregar la imagen o eliminar segmentos (confianza alta)
2. El tiempo exacto donde quiere agregarlo o los segmentos a eliminar (segundos iniciales y finales)
3. Si quiere compactar el timeline (eliminar espacios vacíos)
4. Si quiere hacer un recorte inteligente del video

Ejemplos de tiempos que debes detectar:
- "agrega esta imagen en el segundo 10" → startTime: 10, endTime: 15
- "pon la imagen del segundo 5 al 8" → startTime: 5, endTime: 8
- "quiero esta imagen entre los segundos 3 y 7" → startTime: 3, endTime: 7
- "agrega la imagen al inicio" → startTime: 0, endTime: 5
- "la imagen va al final" → startTime: [duración-5], endTime: [duración]

Para subtítulos, detecta si el usuario quiere:
- Subtítulos agrupados (por defecto): groupWords: true
- Subtítulos completos sin dividir: groupWords: false
- Subtítulos en un rango de tiempo específico: startTime y endTime

Cuando detectes una solicitud para agregar contenido, analiza:
1. Tipo de elemento: texto, imagen, video, subtitles o segments (para eliminar segmentos)
2. Contenido (para texto)
3. Color (si se menciona)
4. Ubicación temporal (tiempo de inicio y fin en segundos) ← CRUCIAL
5. URL de la imagen (si se proporcionó en el mensaje)
6. Nivel de confianza en tu interpretación (de 0.0 a 1.0)
7. Para subtítulos: si deben agruparse o no (groupWords)
8. Para eliminar segmentos: un array de objetos con startTime y endTime para cada segmento
9. Para compactar: simplemente detectar la intención (type: "compact")
10. Para recorte inteligente: simplemente detectar la intención (type: "smartTrim")

Para subtítulos, si el usuario no dice nada, asume que deben durar del segundo 0 al segundo 10000000 (final del video) y que deben estar agrupados, no preguntes si agrupados o no, asume que si siempre. Tambien asume que son los subtitulos generados automaticamente asi que responde siempre que el user pida subtitulos con mensajes de "Subtitulos agregados con exito o algo por ele estilo, breve y conciso.".

Los elementos que se pueden agregar tienen esta estructura general:
- Texto: { type: "text", content: "texto", color: "#color", startTime: X, endTime: Y }
- Imagen: { type: "image", url: "url_de_la_imagen", startTime: X, endTime: Y }
- Video: { type: "video", startTime: X, endTime: Y }
- Subtítulos: { type: "subtitles", groupWords: true/false, startTime: X, endTime: Y }
- Eliminar segmentos: { type: "segments", segments: [{ startTime: X1, endTime: Y1 }, { startTime: X2, endTime: Y2 }, ...] }
- Compactar timeline: { type: "compact" }
- Recorte inteligente: { type: "smartTrim" }

PD: Un elemento no puede duarar 0 segundos, como minimo 0,1. Si no te dicen el tiempo final, el elemento dura 5 segundos. No puedes decir -voy a agregar este elemento- y no dar true con high confidence, no te congradigas. Si el user no menciona el tiempo donde quiere agregar la imagen, preguntale al user en que tiempo quiere agregar la imagen. Si dice solo el tiempo de inicio, no le preguntes, asume que debe durar 5 segundos, no le preguntes, repito.`;

// Función para analizar los tiempos de inicio y fin de una imagen a partir del mensaje del usuario
function extractImageTimesFromMessage(messageContent: string): { startTime: number, endTime: number } {
  let startTime = 0;
  let endTime = 5;

  if (!messageContent) return { startTime, endTime };

  console.log("Analizando mensaje para tiempos:", messageContent);

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
  let startTimeMatch = false;
  for (const pattern of startTimePatterns) {
    const match = messageContent.match(pattern);
    if (match && match[1]) {
      startTimeMatch = true;
      // Si es referencia a minutos, convertir a segundos
      startTime = pattern.toString().includes('minuto')
        ? parseInt(match[1]) * 60
        : parseInt(match[1]);
      console.log(`Patrón de tiempo inicial coincidió: ${pattern}, valor: ${startTime}`);
      break;
    }
  }

  // Procesar patrones de tiempo final
  let endTimeMatch = false;
  for (const pattern of endTimePatterns) {
    const match = messageContent.match(pattern);
    if (match && match[1]) {
      endTimeMatch = true;
      if (pattern.toString().includes('por') || pattern.toString().includes('durante')) {
        // Es una duración relativa, sumar al tiempo inicial
        endTime = startTime + parseInt(match[1]);
      } else {
        // Es un tiempo absoluto
        endTime = pattern.toString().includes('minuto')
          ? parseInt(match[1]) * 60
          : parseInt(match[1]);
      }
      console.log(`Patrón de tiempo final coincidió: ${pattern}, valor: ${endTime}`);
      break;
    }
  }

  // Si se menciona "al inicio", establecer tiempo a 0
  if (isAtStart) {
    startTime = 0;
    endTime = 5; // Por defecto 5 segundos de duración
    console.log("Se detectó 'al inicio': startTime=0, endTime=5");
  }

  // Si se menciona "al final", establecer valores relativos al final
  // Nota: El valor real se ajustará en el cliente según la duración
  if (isAtEnd) {
    startTime = -1; // Código especial para "final - 5 segundos"
    endTime = -1;   // Código especial para "final"
    console.log("Se detectó 'al final': startTime=-1, endTime=-1");
  }

  // Si se detectó un tiempo inicial pero no final, establecer duración predeterminada
  if (startTimeMatch && !endTimeMatch) {
    endTime = startTime + 5;
    console.log(`Se estableció tiempo final automático: ${endTime} (startTime + 5)`);
  }

  // Si no se detectó tiempo final pero sí inicial, establecer una duración predeterminada
  if (startTime > 0 && endTime === 5 && startTime !== 0) {
    endTime = startTime + 5;
    console.log(`Se ajustó tiempo final: ${endTime} (startTime + 5)`);
  }

  console.log(`Tiempos finales extraídos: startTime=${startTime}, endTime=${endTime}`);
  return { startTime, endTime };
}

// Nueva función para manejar los mensajes del chat de la timeline
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

    // Verificar si es una solicitud del chat de la timeline
    if (body.type === 'timeline_chat') {
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
    }

    // Extraer los mensajes del cuerpo de la solicitud
    const { messages, lastImageUrl = "" } = body;

    // Validar que se proporcionaron mensajes
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Se requieren mensajes válidos' },
        { status: 400 }
      );
    }

    // Limitar la cantidad de mensajes históricos para reducir tokens
    const limitedMessages = messages.slice(-10); // Solo mantener los últimos 10 mensajes

    // Limitar el tamaño de cada mensaje
    const processedMessages = limitedMessages.map(msg => {
      if (typeof msg.content === 'string') {
        return {
          ...msg,
          content: msg.content.slice(0, 500) // Limitar cada mensaje a 500 caracteres
        };
      }
      return msg;
    });

    // Extraer la URL de la imagen si está presente en el último mensaje
    let imageUrl = '';
    const lastUserMessage = [...processedMessages].reverse().find(m => m.role === 'user');
    if (lastUserMessage && typeof lastUserMessage.content === 'string') {
      // Buscar URL de imagen explícita
      const imageMatch = lastUserMessage.content.match(/\[IMAGEN: (.*?)\]/);
      if (imageMatch && imageMatch[1]) {
        imageUrl = imageMatch[1];
      }

      // O verificar si hay imagen adjunta (sin URL explícita)
      else if (lastUserMessage.content.includes('[IMAGEN_ADJUNTA]')) {
        imageUrl = 'imagen_adjunta_por_el_usuario.jpg';
      }
    }

    // Si no hay imagen en el mensaje actual pero hay una última imagen URL, usarla en caso
    // de que el usuario esté haciendo referencia a ella
    const hasLastImageReference =
      !imageUrl &&
      lastImageUrl &&
      lastUserMessage &&
      typeof lastUserMessage.content === 'string' &&
      (/la\s+imagen/i.test(lastUserMessage.content) ||
       /esta\s+imagen/i.test(lastUserMessage.content) ||
       /imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content));

    // Si parece que el usuario está haciendo referencia a una imagen anterior,
    // considerar usar esa URL
    if (hasLastImageReference) {
      console.log("Se detectó referencia a una imagen anterior");
      // Usar el mismo identificador especial
      imageUrl = "imagen_adjunta_por_el_usuario.jpg";
    }

    // Verificar si el usuario está solicitando compactar el timeline
    const isCompactRequest =
      lastUserMessage &&
      typeof lastUserMessage.content === 'string' &&
      (/compact[a|ar]|elimina[r]?\s+(los)?\s*espacios|optimiza[r]?|quita[r]?\s+(los)?\s*huecos|junta[r]?\s+(los)?\s*clips|comprim[e|ir]/i.test(lastUserMessage.content));

    // Verificar si el usuario está solicitando un recorte inteligente
    const isSmartTrimRequest =
      lastUserMessage &&
      typeof lastUserMessage.content === 'string' &&
      (/recorte\s+inteligente|smart\s*trim|analiza\s+(?:y\s+)?recort[a|e]|recort[a|e]\s+(?:inteligentemente|automáticamente)|elimina\s+(?:partes|segmentos)\s+(?:innecesari[os|as]|redundantes)/i.test(lastUserMessage.content));

    // Crear una versión reducida de las instrucciones del sistema
    const compactSystemInstructions = `
Eres un asistente especializado en edición de video. Tu tarea es detectar cuando los usuarios quieren:
1. Agregar texto, imagen, video o subtítulos al timeline
2. Eliminar segmentos de un elemento existente
3. Compactar el timeline eliminando espacios vacíos
4. Realizar recorte inteligente del video

Responde de manera breve y concisa. Si detectas una solicitud para agregar elementos o realizar acciones, incluye la información estructurada necesaria entre <element_data> y </element_data>.`;

    // Añadir el mensaje del sistema al inicio para dar contexto, con versión reducida
    const conversationWithSystem = [
      { role: 'system', content: compactSystemInstructions },
      ...processedMessages,
      {
        role: 'system',
        content: `
        Después de responder, evalúa si el usuario solicita agregar elementos o ejecutar acciones con confianza >0.7.
        Si es así, incluye datos estructurados entre <element_data> y </element_data> siguiendo el formato:
        ${imageUrl ? `El usuario ha compartido una imagen: ${imageUrl}. Solo sugiérela si lo pide explícitamente.` :
        `Si el usuario menciona "esta imagen", asume que se refiere a una imagen anterior.`}
        IMPORTANTE: Mantén respuestas concisas y no menciones esta estructura en tu respuesta.
        `
      }
    ];

    // Solo registrar información reducida para depuración
    console.log("=== LONGITUD DEL PROMPT ENVIADO A LA IA ===");
    console.log("Número de mensajes:", conversationWithSystem.length);
    console.log("Longitud del mensaje del sistema:", compactSystemInstructions.length);
    console.log("==============================");

    // Llamar a la API de OpenAI con modelo más económico
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cambiar a modelo más económico
      messages: conversationWithSystem,
      temperature: 0.7,
      max_tokens: 600, // Reducir para ahorrar tokens
      top_p: 0.95,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    // Obtener la respuesta generada
    const responseContent = response.choices[0].message.content || '';

    // Registrar información de uso de tokens
    if (response.usage) {
      console.log("=== USO DE TOKENS ===");
      console.log(`Entrada: ${response.usage.prompt_tokens}`);
      console.log(`Salida: ${response.usage.completion_tokens}`);
      console.log(`Total: ${response.usage.total_tokens}`);
      console.log("====================");
    }

    // Extraer los datos del elemento si existen
    const elementDataMatch = responseContent.match(/<element_data>([\s\S]*?)<\/element_data>/);

    // Preparar la respuesta al cliente
    let cleanedResponse = responseContent.replace(/<element_data>[\s\S]*?<\/element_data>/g, '').trim();
    let elementData = null;

    if (elementDataMatch && elementDataMatch[1]) {
      try {
        elementData = JSON.parse(elementDataMatch[1].trim());

        // Verificar que el formato de los datos es correcto
        if (elementData && elementData.detected === true && elementData.element) {
          // Asegurarse de que los campos obligatorios existen
          if (!elementData.element.type ||
             (elementData.element.type === 'text' && !elementData.element.content)) {
            console.warn('Datos de elemento incompletos:', elementData);
            // Convertir a formato "no detectado" si faltan campos obligatorios
            elementData = {
              detected: false,
              confidence: elementData.confidence || 0
            };
          }

          // Si hay una imagen en el mensaje pero no se específica en el elemento, agregarla
          if (imageUrl && elementData.element.type === 'image' && !elementData.element.url) {
            elementData.element.url = imageUrl;
          }

          // Normalizar tipos de datos
          if (elementData.element.startTime)
            elementData.element.startTime = Number(elementData.element.startTime);
          if (elementData.element.endTime)
            elementData.element.endTime = Number(elementData.element.endTime);
        }

        // Si hay una detección directa de solicitud de compactación pero la IA no la detectó
        if (isCompactRequest && (!elementData || !elementData.detected || elementData.element?.type !== 'compact')) {
          console.log("Generando elemento de compactación basado en la detección directa");
          elementData = {
            detected: true,
            confidence: 0.95,
            element: {
              type: "compact"
            },
            reasoning: "Detectado basado en el análisis de patrones de solicitud directa de compactación"
          };
        }

        // Si hay una detección directa de solicitud de recorte inteligente pero la IA no lo detectó
        if (isSmartTrimRequest && (!elementData || !elementData.detected || elementData.element?.type !== 'smartTrim')) {
          console.log("Generando elemento de recorte inteligente basado en la detección directa");
          elementData = {
            detected: true,
            confidence: 0.95,
            element: {
              type: "smartTrim"
            },
            reasoning: "Detectado basado en el análisis de patrones de solicitud directa de recorte inteligente"
          };
        }
      } catch (e) {
        console.error('Error parsing element data JSON:', e);
        // Si hay una imagen compartida, crear un elemento para ella a pesar del error
        if (imageUrl && lastUserMessage && typeof lastUserMessage.content === 'string') {
          elementData = {
            detected: true,
            confidence: 0.9,
            element: {
              type: "image",
              url: imageUrl,
              startTime: 0,
              endTime: 5
            }
          };
        } else {
          elementData = {
            detected: false,
            confidence: 0
          };
        }
      }
    } else {
      // Si no se detectó ningún elemento pero hay una imagen, verificar si el usuario quiere agregarla
      if (imageUrl && lastUserMessage && typeof lastUserMessage.content === 'string' &&
          (/agregar|añadir|colocar|poner|usar|insertar/i.test(lastUserMessage.content) &&
           /imagen/i.test(lastUserMessage.content))) {

          elementData = {
            detected: true,
            confidence: 0.9,
            element: {
              type: "image",
              url: imageUrl,
            startTime: 0,
            endTime: 5
          }
        };
      } else {
        elementData = {
          detected: false,
          confidence: 0
        };
      }
    }

    return NextResponse.json({
      message: {
        role: 'assistant',
        content: cleanedResponse
      },
      elementData: elementData,
      usage: response.usage
    });

  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }, { status: 500 });
  }
}
