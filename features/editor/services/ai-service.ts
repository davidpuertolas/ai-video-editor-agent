/**
 * Servicio para manejar la comunicación con la IA.
 * Esta es una implementación base que simula respuestas.
 * En el futuro, se conectará con una API real.
 */

interface AIAnalysisRequest {
  message?: string;
  items: any[]; // Los elementos seleccionados en la timeline
  context?: any; // Información de contexto adicional
}

interface AIAnalysisResponse {
  success: boolean;
  message: string;
  analysis?: any; // Análisis detallado de la IA
  error?: string;
}

interface URLAnalysisResult {
  containsURLs: boolean;
  urls: string[];
  screenshots?: URLScreenshotInfo[]; // Información de screenshots para las URLs
}

interface URLScreenshotInfo {
  url: string;
  screenshotPath: string;
}

// Nueva interfaz para la detección de aplicar transiciones
interface TransitionDetectionResult {
  detected: boolean;
  confidence: number;
  reason: string;
  transitionPath?: string;
}

// Nueva interfaz para solicitudes de chat
interface ChatRequest {
  message: string;
  selectedItems: any[];
}

// Nueva interfaz para respuestas de chat
interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  urlAnalysis?: {
    containsURLs: boolean;
    urls: string[];
    screenshots?: URLScreenshotInfo[];
  };
  showScreenshotDetection?: {
    detected: boolean;
    confidence: number;
    reason: string;
  };
  applyTransitionDetection?: TransitionDetectionResult;
}

export class AIService {
  /**
   * Analiza los elementos seleccionados para buscar URLs
   */
  public static async analyzeItems(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // Simulamos un tiempo de respuesta de la API
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('AI Service - Request:', request);

      // Extraer el texto relevante de los elementos seleccionados
      const elementsText = this.extractTextFromElements(request.items);

      // Mensaje explícito o texto extraído de los elementos
      const textToAnalyze = request.message || elementsText;

      // Analizar si el texto contiene URLs
      const urlAnalysis = this.detectURLs(textToAnalyze);

      // Si hay URLs, generar información de screenshots
      if (urlAnalysis.containsURLs) {
        urlAnalysis.screenshots = this.getScreenshotsForUrls(urlAnalysis.urls);
      }

      // Simulación de respuesta de la IA
      // En un entorno real, esto enviaría la solicitud a un endpoint de API
      return {
        success: true,
        message: "Análisis completado con éxito",
        analysis: {
          summary: this.generateURLAnalysisSummary(urlAnalysis, request.items.length),
          urlAnalysis: urlAnalysis,
          itemsAnalyzed: request.items.length,
          analyzedText: textToAnalyze,
          recommendations: this.generateRecommendations(urlAnalysis),
          confidence: 0.95
        }
      };
    } catch (error) {
      console.error('Error in AI service:', error);
      return {
        success: false,
        message: "Error al procesar la solicitud",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Obtiene las capturas de pantalla para las URLs detectadas
   * (Como es un demo, utilizamos la misma imagen para todas las URLs)
   */
  private static getScreenshotsForUrls(urls: string[]): URLScreenshotInfo[] {
    // En un entorno real, esta función realizaría una llamada a un servicio
    // que generaría capturas de pantalla para cada URL
    // Por ahora, usamos una imagen de demostración para todas las URLs
    return urls.map(url => ({
      url,
      screenshotPath: '/screenshots/screenshot1.png'
    }));
  }

  /**
   * Extrae texto de los elementos seleccionados
   */
  private static extractTextFromElements(items: any[]): string {
    // Aquí extraemos el texto de los elementos seleccionados
    // En un caso real, esto dependería de la estructura de tus elementos
    let extractedText = "";

    for (const item of items) {
      // Intentar extraer texto de diferentes propiedades comunes
      // Esto es un ejemplo y debería adaptarse a tu estructura de datos real
      if (item.text) {
        extractedText += " " + item.text;
      } else if (item.details?.text) {
        extractedText += " " + item.details.text;
      } else if (item.name) {
        extractedText += " " + item.name;
      } else if (item.title) {
        extractedText += " " + item.title;
      } else if (item.description) {
        extractedText += " " + item.description;
      } else if (item.details?.description) {
        extractedText += " " + item.details.description;
      } else if (item.details?.src) {
        extractedText += " " + item.details.src;
      } else if (item.src) {
        extractedText += " " + item.src;
      } else if (item.content) {
        extractedText += " " + item.content;
      } else if (item.label) {
        extractedText += " " + item.label;
      } else if (item.value) {
        extractedText += " " + item.value;
      } else if (typeof item === 'string') {
        extractedText += " " + item;
      }

      // También podemos buscar en atributos anidados
      if (item.props && typeof item.props === 'object') {
        for (const key in item.props) {
          if (typeof item.props[key] === 'string') {
            extractedText += " " + item.props[key];
          }
        }
      }

      // Si todavía no hemos encontrado texto, intentamos convertir el objeto a string
      if (extractedText.trim() === "" && item.toString) {
        const str = item.toString();
        if (str !== "[object Object]") {
          extractedText += " " + str;
        }
      }
    }

    return extractedText.trim();
  }

  /**
   * Detecta URLs en un texto
   */
  private static detectURLs(text: string): URLAnalysisResult {
    // Expresión regular mejorada para capturar una variedad más amplia de URLs
    // Esta regex busca URLs con diversos dominios de nivel superior (.com, .org, .ai, etc.)
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

    const matches = text.match(urlRegex) || [];

    // Filtrar posibles falsos positivos (como números de versión: 1.0, etc.)
    const validUrls = matches.filter(url => {
      // Verificar que el dominio tenga al menos un punto y caracteres alfanuméricos
      const domainParts = url.split('.');
      // Debe tener al menos un punto y el TLD debe tener al menos 2 caracteres
      return domainParts.length >= 2 && domainParts[domainParts.length - 1].length >= 2;
    });

    return {
      containsURLs: validUrls.length > 0,
      urls: validUrls
    };
  }

  /**
   * Genera un resumen basado en el análisis de URLs
   */
  private static generateURLAnalysisSummary(analysis: URLAnalysisResult, itemCount: number): string {
    if (analysis.containsURLs) {
      const urlCount = analysis.urls.length;
      return `He analizado el contenido de ${itemCount} elemento${itemCount !== 1 ? 's' : ''} y encontrado ${urlCount} URL${urlCount !== 1 ? 's' : ''}.`;
    } else {
      return `He analizado el contenido de ${itemCount} elemento${itemCount !== 1 ? 's' : ''} y no he encontrado ninguna URL.`;
    }
  }

  /**
   * Genera recomendaciones basadas en el análisis de URLs
   */
  private static generateRecommendations(analysis: URLAnalysisResult): string[] {
    if (analysis.containsURLs) {
      return [
        "Considere verificar si las URLs son seguras antes de utilizarlas.",
        "Asegúrese de que las URLs estén activas y funcionen correctamente.",
        "Considere revisar si los enlaces apuntan a los recursos deseados."
      ];
    } else {
      return [
        "El contenido no contiene URLs. Si necesita incluir referencias web, considere añadirlas.",
        "Puede añadir enlaces a recursos adicionales para enriquecer el contenido."
      ];
    }
  }

  /**
   * Detecta si el mensaje del usuario tiene intención de aplicar una transición
   * @returns Objeto con la detección, nivel de confianza y el motivo
   */
  private static detectApplyTransitionIntention(message: string): TransitionDetectionResult {
    if (!message) {
      return {
        detected: false,
        confidence: 0,
        reason: "Mensaje vacío"
      };
    }

    // Si hay mención explícita a capturas, evitar detección de transición
    // para evitar falsos positivos cuando se combinen ambos términos
    if (/(?:captura|screenshot|imagen)\s+(?:de)?\s+pantalla/i.test(message) ||
        /mostrar\s+(?:captura|screenshot|imagen)/i.test(message)) {
      return {
        detected: false,
        confidence: 0,
        reason: "Se detectó intención de captura de pantalla en su lugar"
      };
    }

    // Patrones para detectar solicitudes de aplicar transiciones
    const transitionPatterns = [
      // Patrones de alta confianza - solicitudes muy específicas
      {
        pattern: /(?:aplica|agrega|añade|pon|coloca|mete|inserta)(?:r)?\s+(?:una|la)?\s+transici[óo]n(?:\s+(?:smooth|suave|elegante|de video|entre|visual))?/i,
        confidence: 0.98,
        description: "Solicitud directa de aplicar transición"
      },
      {
        pattern: /transici[óo]n(?:\s+(?:smooth|suave|elegante))?(?:\s+(?:entre|para|en(?:tre)?)\s+(?:el|los)\s+(?:video|clip|elemento|segmento))?/i,
        confidence: 0.95,
        description: "Mención a transición con calificadores"
      },
      {
        pattern: /efecto\s+(?:de)?\s+transici[óo]n/i,
        confidence: 0.90,
        description: "Mención a efecto de transición"
      },
      // Patrones de media confianza
      {
        pattern: /a[ñn]adir\s+(?:una|la)?\s+transici[óo]n/i,
        confidence: 0.88,
        description: "Solicitud de añadir transición"
      },
      {
        pattern: /a[ñn]adir\s+efecto\s+(?:de)?\s+transici[óo]n/i,
        confidence: 0.85,
        description: "Solicitud de añadir efecto de transición"
      },
      {
        pattern: /efecto\s+visual\s+(?:de)?\s+transici[óo]n/i,
        confidence: 0.83,
        description: "Mención a efecto visual de transición"
      },
      // Patrones de baja confianza
      {
        pattern: /transici[óo]n\s+de\s+video/i,
        confidence: 0.80,
        description: "Mención a transición de video"
      },
      {
        pattern: /transici[óo]n\s+smooth/i,
        confidence: 0.80,
        description: "Mención a transición smooth"
      },
      {
        pattern: /transici[óo]n\s+suave/i,
        confidence: 0.80,
        description: "Mención a transición suave"
      },
      {
        pattern: /implementa\s+transici[óo]n/i,
        confidence: 0.78,
        description: "Instrucción de implementar transición"
      },
      {
        pattern: /smooth\s+transition/i,
        confidence: 0.78,
        description: "Mención a smooth transition (inglés)"
      },
      {
        pattern: /transici[óo]n/i,
        confidence: 0.75,
        description: "Mención general a transición"
      }
    ];

    // Buscar el patrón con mayor confianza que coincida
    for (const item of transitionPatterns) {
      if (item.pattern.test(message)) {
        return {
          detected: true,
          confidence: item.confidence,
          reason: item.description,
          transitionPath: '/transitions/transition1.gif' // Path predeterminado para la transición
        };
      }
    }

    // No se detectó ninguna intención de aplicar transición
    return {
      detected: false,
      confidence: 0,
      reason: "No se detectó intención de aplicar transición"
    };
  }

  /**
   * Detecta si el mensaje del usuario tiene intención de mostrar capturas de pantalla
   * @returns Objeto con la detección, nivel de confianza y el motivo
   */
  private static detectShowScreenshotIntention(message: string): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (!message) {
      return {
        detected: false,
        confidence: 0,
        reason: "Mensaje vacío"
      };
    }

    // Si hay mención explícita a transiciones, evitar detección de capturas
    if (/transici[óo]n/i.test(message) || /smooth\s+transition/i.test(message)) {
      // Verificar si hay mención explícita y fuerte a capturas que supere la mención a transiciones
      const hasExplicitScreenshotMention = /(?:aplica|agrega|añade|pon|coloca|inserta|incorpora)(?:la|lo|r)?\s+(?:captura|screenshot|imagen)/i.test(message);

      if (!hasExplicitScreenshotMention) {
        return {
          detected: false,
          confidence: 0,
          reason: "Se detectó intención de transición en su lugar"
        };
      }
    }

    // Patrones específicos para aplicar a la timeline
    const timelinePatterns = [
      {
        pattern: /(?:aplica|agrega|añade|pon|coloca|inserta|incorpora)(?:la|lo|r)?\s+(?:captura|screenshot|imagen|vista|preview)/i,
        confidence: 0.98,
        description: "Solicitud directa de aplicar captura a la timeline"
      },
      {
        pattern: /(?:aplica|agrega|añade|pon|coloca|inserta|incorpora)(?:la|lo)?\s+(?:a la|al|en la|en el)?\s+(?:timeline|línea de tiempo)/i,
        confidence: 0.95,
        description: "Solicitud directa de añadir a la timeline"
      },
      {
        pattern: /(?:usa|usar|utiliza|utilizar)(?:la|lo)?\s+(?:captura|screenshot|imagen|vista|preview)/i,
        confidence: 0.93,
        description: "Solicitud de usar captura"
      }
    ];

    // Patrones muy específicos con alta confianza
    const highConfidencePatterns = [
      {
        pattern: /muestra(?:me)?\s+(?:la|el|una|un)?\s+(?:captura|screenshot|imagen|vista|preview)/i,
        confidence: 0.95,
        description: "Solicitud directa de mostrar captura"
      },
      {
        pattern: /ver\s+(?:la|el|una|un)?\s+(?:captura|screenshot|imagen|vista|preview)/i,
        confidence: 0.95,
        description: "Solicitud de ver captura"
      },
      {
        pattern: /enseña(?:me)?\s+(?:la|el|una|un)?\s+(?:captura|screenshot|imagen|vista|preview)/i,
        confidence: 0.95,
        description: "Solicitud de enseñar captura"
      }
    ];

    // Patrones menos específicos pero igualmente válidos
    const mediumConfidencePatterns = [
      {
        pattern: /(?:quiero|necesito|me gustaría)\s+ver\s+(?:la|el|una|un)?\s+(?:captura|screenshot|imagen)/i,
        confidence: 0.88,
        description: "Expresión de deseo de ver captura específica"
      },
      {
        pattern: /(?:puedes|podrías|puedo)\s+ver\s+(?:la|el|una|un)?\s+(?:captura|screenshot|imagen)/i,
        confidence: 0.88,
        description: "Pregunta sobre posibilidad de ver captura específica"
      },
      {
        pattern: /mostrar\s+(?:captura|screenshot|imagen)/i,
        confidence: 0.85,
        description: "Mención a mostrar captura específica"
      },
      {
        pattern: /visualizar\s+(?:captura|screenshot|imagen)/i,
        confidence: 0.85,
        description: "Mención a visualizar captura específica"
      },
      {
        pattern: /(?:quiero|necesito|me gustaría)\s+ver/i,
        confidence: 0.70,
        description: "Expresión de deseo de ver"
      },
      {
        pattern: /(?:puedes|podrías|puedo)\s+ver/i,
        confidence: 0.70,
        description: "Pregunta sobre posibilidad de ver"
      }
    ];

    // Patrones muy generales pero que podrían indicar intención
    const lowConfidencePatterns = [
      {
        pattern: /captura\s+(?:de)?\s+pantalla/i,
        confidence: 0.80,
        description: "Mención específica a captura de pantalla"
      },
      {
        pattern: /screenshot/i,
        confidence: 0.75,
        description: "Mención a screenshot"
      },
      {
        pattern: /ver\s+imagen/i,
        confidence: 0.75,
        description: "Mención a ver imagen"
      },
      {
        pattern: /captura/i,
        confidence: 0.65,
        description: "Mención a captura"
      },
      {
        pattern: /imagen/i,
        confidence: 0.60,
        description: "Mención a imagen"
      },
      {
        pattern: /ver/i,
        confidence: 0.40,
        description: "Mención a ver"
      },
      {
        pattern: /pantalla/i,
        confidence: 0.40,
        description: "Mención a pantalla"
      },
      {
        pattern: /url/i,
        confidence: 0.40,
        description: "Mención a URL"
      },
      {
        pattern: /link/i,
        confidence: 0.40,
        description: "Mención a link"
      },
      {
        pattern: /enlace/i,
        confidence: 0.40,
        description: "Mención a enlace"
      }
    ];

    // Primero comprobar patrones específicos de timeline
    for (const item of timelinePatterns) {
      if (item.pattern.test(message)) {
        return {
          detected: true,
          confidence: item.confidence,
          reason: item.description
        };
      }
    }

    // Luego buscar en el resto de patrones
    // Combinar todos los patrones
    const allPatterns = [...highConfidencePatterns, ...mediumConfidencePatterns, ...lowConfidencePatterns];

    // Buscar el patrón con mayor confianza que coincida
    for (const item of allPatterns) {
      if (item.pattern.test(message)) {
        return {
          detected: true,
          confidence: item.confidence,
          reason: item.description
        };
      }
    }

    // Si hay alguna referencia a URLs en general - REDUCIR CONFIANZA
    if (message.toLowerCase().includes('url') ||
        message.toLowerCase().includes('web') ||
        message.toLowerCase().includes('link') ||
        message.toLowerCase().includes('enlace')) {
      return {
        detected: true,
        confidence: 0.5,
        reason: "Posible interés en contenido web"
      };
    }

    // Detectar preguntas generales - REDUCIR CONFIANZA
    if (message.toLowerCase().includes('?') ||
        message.toLowerCase().includes('¿') ||
        /(?:puedes|podrías|me puedes)/i.test(message)) {
      return {
        detected: true,
        confidence: 0.3,
        reason: "Pregunta que podría implicar intención visual"
      };
    }

    // Detección por defecto - REDUCIR CONFIANZA AÚN MÁS
    if (message.length >= 5) {
      return {
        detected: true,
        confidence: 0.2,
        reason: "Detección por defecto"
      };
    }

    // Si no coincide ningún patrón y es muy corto
    return {
      detected: false,
      confidence: 0,
      reason: "No se detectó intención de mostrar captura"
    };
  }

  /**
   * Envía un mensaje al chat de la IA y devuelve la respuesta
   */
  public static async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Primero, analizar el texto del mensaje para detectar URLs
      const selectedText = this.extractTextFromElements(request.selectedItems);
      const urlAnalysis = this.detectURLs(selectedText);

      // Si hay URLs, generar capturas de pantalla
      if (urlAnalysis.containsURLs) {
        urlAnalysis.screenshots = this.getScreenshotsForUrls(urlAnalysis.urls);
      }

      // Determinar si debemos mostrar la captura de pantalla
      const showScreenshotDetection = this.detectShowScreenshotIntention(request.message);

      // Determinar si debemos aplicar una transición
      const applyTransitionDetection = this.detectApplyTransitionIntention(request.message);

      // Asegurarse de que solo una de las detecciones sea positiva con alta confianza
      let finalShowScreenshot = { ...showScreenshotDetection };
      let finalApplyTransition = { ...applyTransitionDetection };

      // Si ambas son detectadas, priorizar la que tenga mayor confianza
      if (showScreenshotDetection.detected && applyTransitionDetection.detected) {
        // Añadir un margen de seguridad para la transición (priorizar la transición ligeramente)
        const transitionConfidence = applyTransitionDetection.confidence;
        const screenshotConfidence = showScreenshotDetection.confidence * 0.95; // 5% de penalización

        console.log(`Detección doble: Transición (${transitionConfidence}) vs Screenshot (${screenshotConfidence})`);

        if (screenshotConfidence > transitionConfidence) {
          // Priorizar screenshot, desactivar transición
          finalApplyTransition.detected = false;
          finalApplyTransition.confidence = 0;
          finalApplyTransition.reason = "Priorizada la detección de captura de pantalla";

          console.log("Priorizada captura de pantalla sobre transición");
        } else {
          // Priorizar transición, desactivar screenshot
          finalShowScreenshot.detected = false;
          finalShowScreenshot.confidence = 0;
          finalShowScreenshot.reason = "Priorizada la detección de transición";

          console.log("Priorizada transición sobre captura de pantalla");
        }
      }

      // Enviar todo a la API junto con el mensaje del usuario
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'timeline_chat',
          message: request.message,
          selectedItems: request.selectedItems,
          selectedText: selectedText,
          urlAnalysis: urlAnalysis,
          showScreenshotDetection: finalShowScreenshot,
          applyTransitionDetection: finalApplyTransition
        }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          response: data.response,
          urlAnalysis: urlAnalysis,
          showScreenshotDetection: finalShowScreenshot,
          applyTransitionDetection: finalApplyTransition
        };
      } else {
        return {
          success: false,
          error: data.error || 'Error desconocido al procesar la solicitud'
        };
      }
    } catch (error) {
      console.error('Error en chat de timeline:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export default AIService;
