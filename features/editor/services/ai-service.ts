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
}

export default AIService;
