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

NUEVA FUNCIONALIDAD - MÚSICA:
También debes detectar cuando el usuario quiere agregar música al video.
Cuando detectes una solicitud para agregar música, debes recomendar las dos opciones disponibles en una respuesta BREVE y CONCISA.

Ejemplos de solicitudes para agregar música:
- "Agrega música al video"
- "Pon música de fondo"
- "Necesito música para mi video"
- "Quiero añadir una banda sonora"
- "Ponle algo de música"
- "Añade música"
- "Me gustaría ponerle música"
- "¿Puedes agregar música?"
- "Quiero música en mi video"

Al detectar estas solicitudes, debes responder con una frase corta como:
"¿Cuál de estas opciones prefieres?" o "Aquí tienes dos opciones musicales:"

En la estructura JSON, debes incluir las rutas de archivo correctas:
"options": ["/songs/song1.mp3", "/songs/song2.mp3"]

NO SUGIERAS OTRAS CANCIONES QUE NO SEAN ESTAS DOS, ya que no existen en el sistema.

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
5. Si quiere agregar música al video

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
1. Tipo de elemento: texto, imagen, video, subtitles, segments (para eliminar segmentos) o music (para agregar música)
2. Contenido (para texto)
3. Color (si se menciona)
4. Ubicación temporal (tiempo de inicio y fin en segundos) ← CRUCIAL
5. URL de la imagen (si se proporcionó en el mensaje)
6. Nivel de confianza en tu interpretación (de 0.0 a 1.0)
7. Para subtítulos: si deben agruparse o no (groupWords)
8. Para eliminar segmentos: un array de objetos con startTime y endTime para cada segmento
9. Para compactar: simplemente detectar la intención (type: "compact")
10. Para recorte inteligente: simplemente detectar la intención (type: "smartTrim")
11. Para música: incluir un array de opciones recomendadas

Para subtítulos, si el usuario no dice nada, asume que deben durar del segundo 0 al segundo 10000000 (final del video) y que deben estar agrupados, no preguntes si agrupados o no, asume que si siempre. Tambien asume que son los subtitulos generados automaticamente asi que responde siempre que el user pida subtitulos con mensajes de "Subtitulos agregados con exito o algo por ele estilo, breve y conciso.".

Los elementos que se pueden agregar tienen esta estructura general:
- Texto: { type: "text", content: "texto", color: "#color", startTime: X, endTime: Y }
- Imagen: { type: "image", url: "url_de_la_imagen", startTime: X, endTime: Y }
- Video: { type: "video", startTime: X, endTime: Y }
- Subtítulos: { type: "subtitles", groupWords: true/false, startTime: X, endTime: Y }
- Eliminar segmentos: { type: "segments", segments: [{ startTime: X1, endTime: Y1 }, { startTime: X2, endTime: Y2 }, ...] }
- Compactar timeline: { type: "compact" }
- Recorte inteligente: { type: "smartTrim" }
- Música: { type: "music", options: ["/songs/song1.mp3", "/songs/song2.mp3"] }

PD: Un elemento no puede duarar 0 segundos, como minimo 0,1. Si no te dicen el tiempo final, el elemento dura 5 segundos. No puedes decir -voy a agregar este elemento- y no dar true con high confidence, no te congradigas. Si el user no menciona el tiempo donde quiere agregar la imagen, preguntale al user en que tiempo quiere agregar la imagen. Si dice solo el tiempo de inicio, no le preguntes, asume que debe durar 5 segundos, no le preguntes, repito.`;

// Función para analizar los tiempos de inicio y fin de una imagen a partir del mensaje del usuario
function extractImageTimesFromMessage(messageContent: string): { startTime: number, endTime: number } {
  let startTime = 0;
  let endTime = 5;

  if (!messageContent) return { startTime, endTime };

  console.log("Analizando mensaje para tiempos:", messageContent);

  // Buscar patrones de rango directo (formato X-Y o X a Y)
  const rangePatterns = [
    /(?:del|desde)?\s*(?:seg(?:undo)?s?|s)\s*(\d+)(?:\s*(?:al|hasta|a)\s*|\s*[-–—]\s*)(\d+)/i,
    /(?:entre)?\s*(?:el|los)?\s*(?:seg(?:undo)?s?|s)\s*(\d+)\s*(?:y|e)\s*(?:el)?\s*(\d+)/i,
    /(\d+)\s*(?:al|a|hasta)\s*(\d+)\s*(?:seg(?:undo)?s?|s)/i,
    /(?:en el rango|rango|de)\s*(\d+)\s*(?:a|al|hasta|-|–|—)\s*(\d+)/i,
    /(\d+)\s*(?:-|–|—)\s*(\d+)\s*(?:seg(?:undo)?s?|s)/i,
    /del\s*(?:segundo|seg|s)?\s*(\d+)\s*al\s*(?:segundo|seg|s)?\s*(\d+)/i,  // "del segundo 5 al segundo 10" o variantes
    /desde\s*(?:el)?\s*(?:segundo|seg|s)?\s*(\d+)\s*(?:al|hasta)\s*(?:el)?\s*(?:segundo|seg|s)?\s*(\d+)/i,  // "desde el segundo 5 hasta el segundo 10"
    /(?:poner|agregar|añadir|colocar|insertar|meter|mostrar)\s+(?:una|la|esta|mi)?\s*imagen\s+(?:del|desde)\s*(?:segundo|seg|s)?\s*(\d+)\s*(?:al|hasta)\s*(?:el)?\s*(?:segundo|seg|s)?\s*(\d+)/i  // "agregar imagen del segundo 5 al 10"
  ];

  // Verificar primero los patrones de rango directo (tienen prioridad)
  for (const pattern of rangePatterns) {
    const match = messageContent.match(pattern);
    if (match && match[1] && match[2]) {
      startTime = parseInt(match[1]);
      endTime = parseInt(match[2]);
      console.log(`Patrón de rango coincidió: ${pattern}, valores: ${startTime}-${endTime}`);
      return { startTime, endTime };
    }
  }

  // Caso simple: buscar números directamente
  // Por ejemplo: "agrega esta imagen 5 10" (asumiendo que 5 y 10 son tiempos)
  const simpleTwoNumbers = messageContent.match(/imagen.*?\b(\d+)\b.*?\b(\d+)\b/i);
  if (simpleTwoNumbers && simpleTwoNumbers[1] && simpleTwoNumbers[2]) {
    startTime = parseInt(simpleTwoNumbers[1]);
    endTime = parseInt(simpleTwoNumbers[2]);
    // Verificar que los valores tengan sentido
    if (startTime < endTime && endTime - startTime <= 60) { // Razonable para un rango de tiempo
      console.log(`Patrón simple de dos números coincidió: ${startTime}-${endTime}`);
      return { startTime, endTime };
    }
  }

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
    /desde (?:el seg(?:undo)?)?\s*(\d+)/i, // "desde 5" o "desde el seg 5"
    /a partir de (?:el seg(?:undo)?)?\s*(\d+)/i,
    /(?:en|al) (?:el seg(?:undo)?)?\s*(\d+)/i, // "en 5" o "en el seg 5"
    /(?:en|al) (?:el)?\s*(\d+)\s*(?:seg(?:undo)?)?/i, // "en 5 seg" o "al 5 segundo"
    /seg(?:undo)?\s*(\d+)/i, // "segundo 5" o "seg 5"
    /a los (\d+)\s*(?:seg(?:undos)?|s)/i, // "a los 5 segundos"
    /segundo (\d+)/i,     // Patrón más general para capturar "segundo X"
    /en (\d+) segundos/i, // "en X segundos"
    /en el (\d+)/i,       // "en el X" (cuando se refiere a segundos)
    /(\d+)\s*(?:seg(?:undos)?|s)\s*(?:de inicio|iniciales)/i, // "5 segundos de inicio"
    /(\d+)\s*$/i,         // Solo un número al final, como último recurso
  ];

  // Buscar referencias al tiempo final
  const endTimePatterns = [
    /hasta el segundo (\d+)/i,
    /al segundo (\d+)/i,
    /terminando en el segundo (\d+)/i,
    /hasta el minuto (\d+)/i, // Convertir minutos a segundos
    /entre los segundos \d+ y (\d+)/i, // Captura el segundo número en "entre X y Y"
    /del segundo \d+ al (\d+)/i,
    /hasta (?:el seg(?:undo)?)?\s*(\d+)/i, // "hasta 8" o "hasta el seg 8"
    /(?:terminando|acabando) en (?:el seg(?:undo)?)?\s*(\d+)/i,
    /(?:hasta|al) (?:el)?\s*(\d+)\s*(?:seg(?:undo)?)?/i, // "hasta 8 seg" o "al 8 segundo"
    /(?:por|durante) (\d+) segundos/i, // Duración relativa
    /(?:por|durante) (\d+)s/i, // Abreviatura "por 5s"
    /(?:por|durante) (\d+)/i, // "por 5" cuando se refiere claramente a segundos
    /(\d+)\s*(?:seg(?:undos)?|s)\s*(?:de duración|finales)/i, // "5 segundos de duración"
  ];

  // Buscar palabras clave especiales
  const isAtStart = /\b(al inicio|al principio|al comienzo|al empezar|inicio|principio|comienzo)\b/i.test(messageContent);
  const isAtEnd = /\b(al final|al término|al acabar|finalizar|final|término)\b/i.test(messageContent);

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

  // Si el tiempo de inicio es mayor que el final (puede pasar con ciertos patrones),
  // intercambiarlos para asegurar validez
  if (startTime > endTime && startTime >= 0 && endTime >= 0) {
    console.log(`Corrigiendo orden de tiempos: ${startTime}>${endTime}`);
    const temp = startTime;
    startTime = endTime;
    endTime = temp;
  }

  // Asegurarse de que la duración sea de al menos 0.1 segundos
  if (endTime - startTime < 0.1 && startTime >= 0 && endTime >= 0) {
    endTime = startTime + 0.1;
    console.log(`Ajustando duración mínima: startTime=${startTime}, endTime=${endTime}`);
  }

  console.log(`Tiempos finales extraídos: startTime=${startTime}, endTime=${endTime}`);
  return { startTime, endTime };
}

export async function POST(req: NextRequest) {
  try {
    // Extraer los mensajes del cuerpo de la solicitud
    const { messages, lastImageUrl = "" } = await req.json();

    // Validar que se proporcionaron mensajes
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Se requieren mensajes válidos' },
        { status: 400 }
      );
    }

    // Extraer la URL de la imagen si está presente en el último mensaje
    let imageUrl = '';
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage && typeof lastUserMessage.content === 'string') {
      // Buscar URL de imagen explícita
      const imageMatch = lastUserMessage.content.match(/\[IMAGEN: (.*?)\]/);
      if (imageMatch && imageMatch[1]) {
        imageUrl = imageMatch[1];
      }

      // O verificar si hay imagen adjunta (sin URL explícita)
      else if (lastUserMessage.content.includes('[IMAGEN_ADJUNTA]')) {
        // Usamos un identificador especial para indicar que se debe usar la última imagen
        // NO usar una URL relativa que causaría error 404
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

    if (isCompactRequest) {
      console.log("Se detectó posible solicitud de compactación del timeline");
    }

    // Verificar si el usuario está solicitando un recorte inteligente
    const isSmartTrimRequest =
      lastUserMessage &&
      typeof lastUserMessage.content === 'string' &&
      (/recorte\s+inteligente|smart\s*trim|analiza\s+(?:y\s+)?recort[a|e]|recort[a|e]\s+(?:inteligentemente|automáticamente)|elimina\s+(?:partes|segmentos)\s+(?:innecesari[os|as]|redundantes)/i.test(lastUserMessage.content));

    if (isSmartTrimRequest) {
      console.log("Se detectó posible solicitud de recorte inteligente");
    }

    // Verificar si el usuario está solicitando agregar música
    const isMusicRequest =
      lastUserMessage &&
      typeof lastUserMessage.content === 'string' &&
      (/(?:agrega|añade|pon|coloca|quiero|necesito|añadir|agregar|poner|colocar)\s+(?:algo\s+de\s+)?(música|musica|audio|sonido|banda\s+sonora|soundtrack)/i.test(lastUserMessage.content) ||
       /música\s+(?:para|en|de)\s+(?:el|mi)?\s*video/i.test(lastUserMessage.content) ||
       /poner\s+música/i.test(lastUserMessage.content) ||
       /música\s+de\s+fondo/i.test(lastUserMessage.content));

    if (isMusicRequest) {
      console.log("Se detectó posible solicitud de agregar música");
    }

    // Añadir el mensaje del sistema al inicio para dar contexto
    const conversationWithSystem = [
      { role: 'system', content: systemInstructions },
      ...messages,
      {
        role: 'system',
        content: `
        Después de responder al usuario, evalúa si están solicitando agregar un elemento al video o eliminar segmentos.
        Si crees que están solicitando agregar un elemento o eliminar segmentos con una confianza mayor a 0.7, incluye una estructura JSON como esta al final de tu respuesta, entre los marcadores <element_data> y </element_data>:

        <element_data>
        {
          "detected": true,
          "confidence": [nivel de confianza entre 0 y 1],
          "element": {
            "type": ["text", "image", "video", "subtitles", "segments", "compact", "smartTrim" o "music"],
            "content": "[solo para texto - el contenido del texto]",
            "color": "[solo para texto - color en hex o nombre]",
            "url": "[solo para imagen - URL de la imagen si se proporcionó]",
            "startTime": [tiempo inicial en segundos, solo para text, image, video, subtitles],
            "endTime": [tiempo final en segundos, solo para text, image, video, subtitles],
            "segments": [solo para segments - array de objetos con startTime y endTime para cada segmento a eliminar],
            "options": [solo para music - array de rutas a archivos de música recomendados]
          },
          "reasoning": "Explica detalladamente por qué has elegido este nivel de confianza y por qué has decidido que se debe insertar o no un elemento. Incluye los factores que consideraste y las palabras clave que detectaste en el mensaje del usuario."
        }
        </element_data>

        Si no están solicitando agregar elementos o eliminar segmentos, o tu confianza es menor a 0.7, incluye:

        <element_data>
        {
          "detected": false,
          "confidence": [nivel de confianza entre 0 y 1],
          "reasoning": "Explica detalladamente por qué has elegido este nivel de confianza y por qué has decidido que NO se debe insertar un elemento. Incluye los factores que consideraste y por qué el mensaje del usuario no constituye una solicitud clara de inserción."
        }
        </element_data>

        IMPORTANTE PARA SOLICITUDES DE MÚSICA:
        Si el usuario solicita añadir música al video, debes recomendar una lista de canciones que podrían ser adecuadas.
        En tu respuesta natural, menciona que has analizado el video y sugieres varias opciones musicales.
        Luego, en la estructura JSON, incluye estas opciones en el campo "options".

        Por ejemplo, si el usuario dice "añade música al video", podrías responder:
        "He analizado tu video y te recomiendo estas canciones que podrían complementarlo bien. Puedes hacer clic en cualquiera para añadirla."

        Y en el JSON:
        "element": {
          "type": "music",
          "options": ["/songs/song1.mp3", "/songs/song2.mp3"]
        }

        ${imageUrl ? `IMPORTANTE: El usuario ha compartido una imagen con URL: ${imageUrl}.
NO asumas automáticamente que quiere agregarla al video.
Solo debes sugerir agregarla si el usuario lo indica explícitamente en su mensaje.
Si el usuario no ha expresado claramente su intención de agregar la imagen, simplemente reconoce que la has visto y pregunta qué desea hacer con ella.` :
`NOTA: Aunque el usuario no ha adjuntado una imagen en este mensaje, es posible que haya compartido una imagen anteriormente y esté haciendo referencia a ella.
Si el usuario menciona "esta imagen", "la imagen" o algo similar, y está pidiendo agregarla al video, asume que se refiere a la última imagen compartida. Ademas si el user no menciona el tiempo donde quiere agregar la imagen, preguntale al user en que tiempo quiere agregar la imagen. Si dice solo el tiempo de inicio, no le preguntes, asume que debe durar 5 segundos, no le preguntes, repito. No puedes decir -voy a agregar este elemento- y no dar true con high confidence, no te congradigas.`}

        IMPORTANTE: Esta estructura JSON es solo para procesamiento interno y no debe ser mencionada en tu respuesta al usuario, o estas despedido (las repsuta al user keep it short boy).
        `
      }
    ];

    // Registrar el prompt completo enviado a la IA
    console.log("=== PROMPT ENVIADO A LA IA ===");
    console.log(JSON.stringify(conversationWithSystem, null, 2));
    console.log("==============================");

    // Llamar a la API de OpenAI para generar una respuesta
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini', // Modelo más ampliamente disponible y más económico
      messages: conversationWithSystem,
      temperature: 0.7,
      max_tokens: 1000, // Aumentado para permitir la respuesta y la estructura JSON
      top_p: 0.95,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    // Obtener la respuesta generada
    const responseContent = response.choices[0].message.content || '';

    // Registrar la respuesta completa de la IA
    console.log("=== RESPUESTA DE LA IA ===");
    console.log(responseContent);
    console.log("==========================");

    // Extraer los datos del elemento si existen
    const elementDataMatch = responseContent.match(/<element_data>([\s\S]*?)<\/element_data>/);

    // Preparar la respuesta al cliente
    let cleanedResponse = responseContent.replace(/<element_data>[\s\S]*?<\/element_data>/g, '').trim();
    let elementData = null;

    if (elementDataMatch && elementDataMatch[1]) {
      try {
        elementData = JSON.parse(elementDataMatch[1].trim());

        // Registrar el razonamiento de la IA
        console.log("=== RAZONAMIENTO DE LA IA ===");
        console.log(`Detectado: ${elementData.detected}`);
        console.log(`Confianza: ${elementData.confidence}`);
        console.log(`Razonamiento: ${elementData.reasoning || "No proporcionado"}`);
        console.log("=============================");

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

          // Si el elemento de imagen tiene la URL genérica y hay una última imagen válida, asegurarse de identificarlo
          if (elementData.element.type === 'image' &&
              elementData.element.url === 'imagen_adjunta_por_el_usuario.jpg' &&
              !lastImageUrl) {
            console.warn('Se detectó URL genérica de imagen pero no hay última imagen disponible');
          }

          // Normalizar tipos de datos
          if (elementData.element.startTime)
            elementData.element.startTime = Number(elementData.element.startTime);
          if (elementData.element.endTime)
            elementData.element.endTime = Number(elementData.element.endTime);

          // Si es una imagen pero no tiene tiempos definidos o son inválidos, extraerlos del mensaje
          if (elementData.element.type === 'image' && lastUserMessage && typeof lastUserMessage.content === 'string' &&
              (elementData.element.startTime === undefined || elementData.element.endTime === undefined ||
               isNaN(elementData.element.startTime) || isNaN(elementData.element.endTime) ||
               elementData.element.startTime === elementData.element.endTime)) {

            console.log("Detectando tiempos para elemento de imagen...");
            const extractedTimes = extractImageTimesFromMessage(lastUserMessage.content);
            elementData.element.startTime = extractedTimes.startTime;
            elementData.element.endTime = extractedTimes.endTime;
            console.log(`Tiempos extraídos para imagen: startTime=${elementData.element.startTime}, endTime=${elementData.element.endTime}`);
          }

          // Añadir manejo para subtítulos
          if (elementData.element.type === 'subtitles') {
            // Normalizar valores
            if (elementData.element.groupWords === undefined) {
              elementData.element.groupWords = true; // Por defecto, agrupar palabras
            }
            if (elementData.element.startTime)
              elementData.element.startTime = Number(elementData.element.startTime);
            if (elementData.element.endTime)
              elementData.element.endTime = Number(elementData.element.endTime);
          }

          // Añadir manejo para segmentos a eliminar
          if (elementData.element.type === 'segments' && elementData.element.segments) {
            // Asegurarse de que segments es un array
            if (!Array.isArray(elementData.element.segments)) {
              elementData.element.segments = [];
            }

            // Normalizar los valores de cada segmento
            elementData.element.segments = elementData.element.segments.map(segment => ({
              startTime: Number(segment.startTime),
              endTime: Number(segment.endTime)
            }));

            // Verificar que hay al menos un segmento válido
            if (elementData.element.segments.length === 0) {
              console.warn('No se detectaron segmentos válidos para eliminar');
              elementData.detected = false;
            }
          }

          // Añadir manejo para música
          if (elementData.element.type === 'music') {
            // Asegurarse de que options es un array
            if (!elementData.element.options || !Array.isArray(elementData.element.options)) {
              console.log('Creando opciones de música por defecto');
              // Opciones por defecto (solo las que existen realmente)
              elementData.element.options = [
                "/songs/song1.mp3",
                "/songs/song2.mp3"
              ];
            }

            // Asegurarse de que las opciones solo son las existentes
            if (elementData.element.options.length > 0) {
              console.log('Actualizando opciones de música para usar solo las existentes');
              elementData.element.options = [
                "/songs/song1.mp3",
                "/songs/song2.mp3"
              ];
            }
          }
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

        // Si hay una detección directa de solicitud de música pero la IA no la detectó
        if (isMusicRequest && (!elementData || !elementData.detected || elementData.element?.type !== 'music')) {
          console.log("Generando elemento de música basado en la detección directa");

          // Lista de canciones recomendadas (solo las que existen realmente)
          const musicOptions = [
            "/songs/song1.mp3",
            "/songs/song2.mp3"
          ];

          elementData = {
            detected: true,
            confidence: 0.95,
            element: {
              type: "music",
              options: musicOptions
            },
            reasoning: "Detectado basado en el análisis de patrones de solicitud directa de música"
          };
        }

        // Si hay una imagen compartida y no se detectó ningún elemento, no crear uno automáticamente
        // a menos que el último mensaje del usuario tenga indicaciones claras
        if (imageUrl && (!elementData || !elementData.detected)) {
          // Verificar si el mensaje del usuario indica claramente que quiere agregar la imagen
          const userWantsToAddImage = lastUserMessage && typeof lastUserMessage.content === 'string' && (
            /agrega(?:r)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
            /a(?:ñ|n)ade\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
            /coloca(?:r)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
            /pon(?:er)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
            /usa(?:r)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
            /inserta(?:r)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
            /mete(?:r)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
            // Patrones más generales
            /(?:quiero|necesito|quisiera)\s+(?:agregar|añadir|colocar|poner|insertar|meter)\s+(?:la|esta|mi|una)?\s*imagen/i.test(lastUserMessage.content) ||
            /(?:puedes|podrías)\s+(?:agregar|añadir|colocar|poner|insertar|meter)\s+(?:la|esta|mi|una)?\s*imagen/i.test(lastUserMessage.content) ||
            // Patrones con el segmento de tiempo específico
            /imagen\s+(?:en|a|al|del|desde|entre)\s+(?:el|los)?\s*(?:segundo|seg|s|tiempo|minuto|min)/i.test(lastUserMessage.content) ||
            /imagen.*\b\d+\b.*\b\d*\b/i.test(lastUserMessage.content) || // imagen seguida de números (probable tiempo)
            // Detectar cuando se hace referencia a una imagen previa
            /agrega(?:r)?\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
            /a(?:ñ|n)ade\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
            /coloca(?:r)?\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
            /pon(?:er)?\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
            /usa(?:r)?\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
            /inserta(?:r)?\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
            // Detectar menciones a "la imagen" cuando está claro que se quiere agregar
            (/la\s+imagen/i.test(lastUserMessage.content) &&
             (/agregar/i.test(lastUserMessage.content) ||
              /añadir/i.test(lastUserMessage.content) ||
              /colocar/i.test(lastUserMessage.content) ||
              /poner/i.test(lastUserMessage.content) ||
              /insertar/i.test(lastUserMessage.content)))
          );

          if (userWantsToAddImage && lastUserMessage && typeof lastUserMessage.content === 'string') {
            // Solo si el usuario lo indica claramente, crear un elemento
            console.log("Mensaje detectado como solicitud de agregar imagen (sin elementData previo):", lastUserMessage.content);
            const { startTime, endTime } = extractImageTimesFromMessage(lastUserMessage.content);

            console.log(`Creando elemento de imagen con tiempos: startTime=${startTime}, endTime=${endTime}`);

            elementData = {
              detected: true,
              confidence: 0.9,
              element: {
                type: "image",
                url: imageUrl,
                startTime: startTime,
                endTime: endTime
              }
            };
          } else {
            // Si no hay indicación clara, no crear elemento
            elementData = {
              detected: false,
              confidence: 0
            };
          }
        }
      } catch (e) {
        console.error('Error parsing element data JSON:', e);

        // Si hay una imagen compartida, crear un elemento para ella a pesar del error
        if (imageUrl && lastUserMessage && typeof lastUserMessage.content === 'string') {
          console.log("Mensaje detectado como solicitud de agregar imagen (error handling):", lastUserMessage.content);
          const { startTime, endTime } = extractImageTimesFromMessage(lastUserMessage.content);

          elementData = {
            detected: true,
            confidence: 0.9,
            element: {
              type: "image",
              url: imageUrl,
              startTime: startTime,
              endTime: endTime
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
      if (imageUrl) {
        // Verificar si el mensaje del usuario indica claramente que quiere agregar la imagen
        const userWantsToAddImage = lastUserMessage && typeof lastUserMessage.content === 'string' && (
          /agrega(?:r)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
          /a(?:ñ|n)ade\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
          /coloca(?:r)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
          /pon(?:er)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
          /usa(?:r)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
          /inserta(?:r)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
          /mete(?:r)?\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
          /muestra\s+(esta|la|mi|una)\s+imagen/i.test(lastUserMessage.content) ||
          // Patrones más generales
          /(?:quiero|necesito|quisiera)\s+(?:agregar|añadir|colocar|poner|insertar|meter)\s+(?:la|esta|mi|una)?\s*imagen/i.test(lastUserMessage.content) ||
          /(?:puedes|podrías)\s+(?:agregar|añadir|colocar|poner|insertar|meter)\s+(?:la|esta|mi|una)?\s*imagen/i.test(lastUserMessage.content) ||
          // Patrones con el segmento de tiempo específico
          /imagen\s+(?:en|a|al|del|desde|entre)\s+(?:el|los)?\s*(?:segundo|seg|s|tiempo|minuto|min)/i.test(lastUserMessage.content) ||
          /imagen.*\b\d+\b.*\b\d*\b/i.test(lastUserMessage.content) || // imagen seguida de números (probable tiempo)
          // Detectar cuando se hace referencia a una imagen previa
          /agrega(?:r)?\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
          /a(?:ñ|n)ade\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
          /coloca(?:r)?\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
          /pon(?:er)?\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
          /usa(?:r)?\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
          /inserta(?:r)?\s+la\s+imagen\s+(?:anterior|previa|compartida|subida)/i.test(lastUserMessage.content) ||
          // Detectar menciones a "la imagen" cuando está claro que se quiere agregar
          (/la\s+imagen/i.test(lastUserMessage.content) &&
           (/agregar/i.test(lastUserMessage.content) ||
            /añadir/i.test(lastUserMessage.content) ||
            /colocar/i.test(lastUserMessage.content) ||
            /poner/i.test(lastUserMessage.content) ||
            /insertar/i.test(lastUserMessage.content)))
        );

        if (userWantsToAddImage && lastUserMessage && typeof lastUserMessage.content === 'string') {
          // Solo si el usuario lo indica claramente, crear un elemento
          const { startTime, endTime } = extractImageTimesFromMessage(lastUserMessage.content);

          console.log(`Creando elemento de imagen con tiempos: startTime=${startTime}, endTime=${endTime}`);

          elementData = {
            detected: true,
            confidence: 0.9,
            element: {
              type: "image",
              url: imageUrl,
              startTime: startTime,
              endTime: endTime
            }
          };
        } else {
          // Si no hay indicación clara, no crear elemento
          elementData = {
            detected: false,
            confidence: 0
          };
        }
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
      elementData: elementData
    });

  } catch (error) {
    console.error('Error en la API de chat:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud de chat' },
      { status: 500 }
    );
  }
}
