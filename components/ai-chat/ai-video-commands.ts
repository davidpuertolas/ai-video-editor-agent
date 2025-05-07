import StateManager from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { DESIGN_ADD_TEXT, DESIGN_ADD_AUDIO, DESIGN_ADD_IMAGE, ADD_TEXT, ADD_VIDEO, ADD_IMAGE, ACTIVE_SPLIT, LAYER_SELECT, LAYER_DELETE, TIMELINE_SCALE_CHANGED, EDIT_OBJECT } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";


export interface VideoCommandExecutor {
  addText: (text: string, options?: TextOptions) => void;
  changeColor: (elementId: string, color: string) => void;
  addImage: (url: string, options?: ImageOptions) => void;
  addVideo: (url: string, options?: VideoOptions) => void;
  changeDuration: (elementId: string, duration: number) => void;
  changeTransition: (elementId: string, transition: string) => void;
  addSubtitles: (options?: SubtitleOptions) => void;
  removeSegments: (segments: TimeSegment[]) => void;
  getActiveElements: () => Promise<any[]>;
  getAllTimelineElements: () => Promise<any[]>;
  compactTimeline: () => Promise<boolean>;
  smartTrim: () => Promise<boolean>;
}

interface TextOptions {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  position?: { x: number; y: number };
  startTime?: number; // en segundos
  endTime?: number; // en segundos
}

interface ImageOptions {
  width?: number;
  height?: number;
  position?: { x: number; y: number };
  startTime?: number; // en segundos
  endTime?: number; // en segundos
  isAnimated?: boolean;
  isStatic?: boolean; // Para forzar tratar una imagen animada como estática
  scaleMode?: string;
}

interface VideoOptions {
  width?: number;
  height?: number;
  position?: { x: number; y: number };
  startTime?: number; // en segundos
  endTime?: number; // en segundos
  scaleMode?: string;
  isAPNG?: boolean;
  syncWithTimeline?: boolean;
  playbackBehavior?: string;
}

interface SubtitleOptions {
  groupWords?: boolean; // Si se deben agrupar palabras (true) o usar subtítulos completos (false)
  startTime?: number;   // Tiempo de inicio para filtrar subtítulos (opcional)
  endTime?: number;     // Tiempo de fin para filtrar subtítulos (opcional)
}

// Tipo para representar un segmento de subtítulo
interface SubtitleSegment {
  id: number;
  startTime: number; // en milisegundos
  endTime: number;   // en milisegundos
  text: string;
}

interface TimeSegment {
  startTime: number; // Tiempo de inicio en segundos
  endTime: number;   // Tiempo final en segundos
}

export function createVideoCommandExecutor(stateManager: StateManager): VideoCommandExecutor {
  // Crear el objeto executor con todos los métodos
  const executor: VideoCommandExecutor = {
    addText: (text: string, options?: TextOptions) => {
      const position = options?.position || { x: 0.5, y: 0.5 }; // Centrado por defecto
      const fontSize = options?.fontSize || 48;
      const fontFamily = options?.fontFamily || "Roboto-Bold";
      const color = options?.color || "#FFFFFF";
      const startTime = options?.startTime || 0; // Por defecto al inicio
      const endTime = options?.endTime || 5; // Por defecto 5 segundos de duración

      // Crear payload para el texto
      const textPayload = {
        id: generateId(),
        display: {
          from: startTime * 1000, // Convertir a milisegundos
          to: endTime * 1000     // Convertir a milisegundos
        },
        type: 'text',
        details: {
          text: text,
          fontSize: fontSize,
          width: 600,
          fontFamily: fontFamily,
          color: color,
          wordWrap: 'break-word',
          textAlign: 'center',
          borderWidth: 0,
          borderColor: '#000000',
          boxShadow: {
            color: '#ffffff',
            x: 0,
            y: 0,
            blur: 0,
          },
        },
      };

      // Agregar texto al timeline
      dispatch(ADD_TEXT, {
        payload: textPayload,
        options: {},
      });
    },

    changeColor: (elementId: string, color: string) => {
      // Simulación de cambio de color (la implementación real dependerá de la estructura del proyecto)
      console.log(`Cambiando color del elemento ${elementId} a ${color}`);

      // Aquí iría la lógica real para cambiar el color de un elemento
    },

    addImage: (url: string, options?: ImageOptions) => {
      try {
      // Asegurar que tenemos una URL válida
      if (!url) {
          console.error("❌ URL de imagen no válida o vacía");
          throw new Error("URL de imagen no proporcionada");
      }

        console.log("=== INICIANDO PROCESO DE AÑADIR IMAGEN ===");
        console.log("URL:", url);
        console.log("Opciones:", JSON.stringify(options, null, 2));

      // Verificar si es una URL genérica de referencia, que no debe usarse directamente
      if (url === 'imagen_adjunta_por_el_usuario.jpg' || url.includes('/url_de_la_imagen')) {
        console.error("Error: URL de imagen genérica inválida detectada", url);
        throw new Error("La URL de imagen no es válida. Se intentó usar un marcador genérico directamente.");
      }

      const width = options?.width || 480;
      const height = options?.height || 270;
      const startTime = options?.startTime !== undefined ? options.startTime : 0;
      const endTime = options?.endTime !== undefined ? options.endTime : startTime + 5;

        // Detectores de tipo de imagen
        const isExplicitlyAnimated = options?.isAnimated === true;
        const isExplicitlyStatic = options?.isStatic === true;
        const isAPNG = url.toLowerCase().endsWith('.apng');
        const isGIF = url.toLowerCase().endsWith('.gif');

        // Determinar si debe tratarse como imagen animada
        const shouldTreatAsAnimated = (isExplicitlyAnimated || isAPNG || isGIF) && !isExplicitlyStatic;

        // Log de modo detectado
        if (shouldTreatAsAnimated) {
          console.log(`🔶 Detectada imagen animada: ${url}`);
          console.log(`Tipo: ${isAPNG ? 'APNG' : isGIF ? 'GIF' : 'Animada genérica'}`);
        } else if (isAPNG || isGIF) {
          console.log(`🔹 Detectada imagen potencialmente animada pero tratándola como estática: ${url}`);
        } else {
          console.log(`🔷 Detectada imagen estática: ${url}`);
        }

      // Para depuración, mostrar parte de la URL (truncada si es data:URL)
      const logUrl = url.startsWith('data:')
        ? `${url.substring(0, 30)}... (data URL)`
        : url;
      console.log(`Añadiendo imagen desde ${logUrl} desde segundo ${startTime} hasta ${endTime}`);

        // Posición (centrada por defecto)
        const position = options?.position || { x: 0.5, y: 0.5 };

        // Modos de escala
        const scaleMode = options?.scaleMode || "fit";
        const useFullScreen = scaleMode === "cover";

        // Propiedades para el payload, común para ambos casos
        const commonPayloadProps = {
          from: startTime * 1000,
          to: endTime * 1000
        };

        // Propiedades de detalle comunes
        const commonDetailsProps = {
          src: url,
          width: width,
          height: height,
          opacity: 100,
          scaleMode: scaleMode,
          left: position.x,
          top: position.y,
          originX: "center",
          originY: "center"
        };

        // Crear ID único
        const imageId = generateId();

        // Crear el payload de imagen simplificado
        const imagePayload = {
          id: imageId,
          display: commonPayloadProps,
          type: 'image',
          details: {
            ...commonDetailsProps,
            // Si es animada, añadir atributos específicos
            ...(shouldTreatAsAnimated && {
              isAnimated: true,
            }),
            // Si a pantalla completa, ajustar dimensiones
            ...(useFullScreen && {
              width: 1920,
              height: 1080
            })
          }
        };

        console.log("Payload de imagen a despachar:", JSON.stringify({
          ...imagePayload,
          details: {
            ...imagePayload.details,
            src: imagePayload.details.src.substring(0, 30) + (imagePayload.details.src.length > 30 ? '...' : '')
          }
        }, null, 2));

        // Opciones para el dispatch
        const dispatchOptions = {
          scaleMode: scaleMode,
          position: position,
        };

        // Despachar la acción para añadir la imagen
        dispatch(ADD_IMAGE, {
          payload: imagePayload,
          options: dispatchOptions
        });

        // Log de éxito
        if (shouldTreatAsAnimated) {
          console.log(`✅ Imagen animada añadida desde ${startTime}s hasta ${endTime}s`);
        } else {
          console.log(`✅ Imagen estática añadida desde ${startTime}s hasta ${endTime}s`);
        }

      } catch (error) {
        console.error("❌ ERROR CRÍTICO al añadir imagen:", error);
        console.error("Detalles completos:", error.message);
        console.error("Traza:", error.stack);
        throw error; // Propagar el error para manejo superior
      }
    },

    addVideo: (url: string, options?: VideoOptions) => {
      try {
        console.log("=== INICIANDO PROCESO DE AÑADIR VIDEO ===");
        console.log("URL:", url);
        console.log("Opciones:", JSON.stringify(options, null, 2));

        // Validación de URL
        if (!url) {
          console.error("❌ URL de video no válida o vacía");
          throw new Error("URL de video no proporcionada");
        }

        const width = options?.width || 640;
        const height = options?.height || 360;
        const startTime = options?.startTime || 0; // Por defecto al inicio
        const endTime = options?.endTime || 10; // Por defecto 10 segundos de duración

        // Detectar si es un archivo AVI o APNG para tratamiento especial
        const isAVI = url.toLowerCase().endsWith('.avi');
        const isAPNG = url.toLowerCase().endsWith('.apng');
        // Marcador pasado explícitamente - mayor prioridad que la extensión
        const isExplicitAPNG = options?.isAPNG === true;

        console.log("Formato detectado:",
          isAVI ? "AVI" : isAPNG ? "APNG" : isExplicitAPNG ? "Explícitamente marcado como APNG" : "Formato estándar");

        // Si es APNG según algún criterio
        const treatAsAPNG = isAPNG || isExplicitAPNG;
        const useFullScreen = isAVI || treatAsAPNG || (options?.scaleMode === "cover");

        // Para archivos AVI y APNG, respectar duración natural si no se especifica
        const respectNativeDuration = (isAVI || treatAsAPNG) && !options?.endTime;
        const finalEndTime = respectNativeDuration ? undefined : endTime;

        // Log para depurar
        if (treatAsAPNG) {
          console.log(`🔷 Añadiendo APNG como VIDEO sincronizado desde ${startTime}s con duración ${respectNativeDuration ? 'natural' : finalEndTime + 's'}`);
          console.log(`🔷 Configuraciones especiales de APNG - useFullScreen: ${useFullScreen}, syncWithTimeline: ${options?.syncWithTimeline || true}`);
        } else if (isAVI) {
          console.log(`🎬 Añadiendo AVI con duración ${respectNativeDuration ? 'natural' : 'especificada: ' + finalEndTime}s`);
        }

        // Manejar APNG usando un enfoque especial - intentar con un método alternativo si es posible
        if (treatAsAPNG) {
          try {
            // Intentar crear un payload especial para APNG que funcione como animación
            console.log("Probando con una configuración especial para APNG...");

            // Configuración de opciones importante para archivos APNG
            const apngVideoPayload = {
            id: generateId(),
            display: {
              from: startTime * 1000, // Convertir a milisegundos
                to: finalEndTime ? finalEndTime * 1000 : (startTime + 3) * 1000 // 3 segundos por defecto si no hay duración
            },
              // Probamos una nueva estrategia: tratarlo como imagen en lugar de video
            type: 'image',
            details: {
              src: url,
                width: 1920, // Ancho para pantalla completa
                height: 1080, // Alto para pantalla completa
              opacity: 100,
                scaleMode: "cover", // Para llenar toda la pantalla
                left: 0.5, // Centrado horizontalmente
                top: 0.5,  // Centrado verticalmente
                originX: "center", // Origen en el centro
                originY: "center", // Origen en el centro
                // Propiedades para animar
                isAnimated: true
              },
            };

            console.log("Payload para APNG como imagen animada:", JSON.stringify(apngVideoPayload, null, 2));

            // Usar ADD_IMAGE en lugar de ADD_VIDEO
          dispatch(ADD_IMAGE, {
              payload: apngVideoPayload,
            options: {
                scaleMode: "cover",
                position: { x: 0.5, y: 0.5 }
            },
          });

            console.log("✅ APNG añadido como imagen animada con éxito");
            return;
          } catch (apngError) {
            console.error("❌ Error al añadir APNG como imagen animada:", apngError);
            console.error("Detalles:", apngError.message);
            console.error("Traza:", apngError.stack);
            console.log("🔄 Continuando con el método estándar como respaldo...");
            // Continuar con el método estándar como respaldo
          }
        }

      // Crear payload para el video
      const videoPayload = {
        id: generateId(),
        display: {
          from: startTime * 1000, // Convertir a milisegundos
            to: finalEndTime ? finalEndTime * 1000 : undefined // Usar undefined si queremos respetar la duración natural
        },
        type: 'video',
        details: {
          src: url,
          width: width,
          height: height,
          opacity: 100,
            // Para archivos APNG y AVI, configurar propiedades específicas para pantalla completa
            ...(useFullScreen && {
              scaleMode: "cover", // Usar "cover" en lugar de "fit" para asegurar que cubra todo
              left: 0.5, // Centrado horizontalmente
              top: 0.5,  // Centrado verticalmente
              originX: "center", // Origen en el centro
              originY: "center", // Origen en el centro
            }),
            // Propiedades especiales para APNG
            ...(treatAsAPNG && {
              isAPNG: true,
              autoPlay: true,
              loop: false,
              syncWithTimeline: options?.syncWithTimeline || true
            })
          },
        };

        console.log("Payload de video estándar:", JSON.stringify(videoPayload, null, 2));

        // Configuraciones adicionales para el dispatch
        const dispatchOptions = {
          resourceId: "main",
          scaleMode: useFullScreen ? "cover" : "fit", // Usar cover para pantalla completa, fit para otros videos
          ...(useFullScreen && {
            position: { x: 0.5, y: 0.5 } // Centrar para videos a pantalla completa
          }),
          respectNativeDuration: respectNativeDuration,
          // Propiedades específicas para sincronización de APNG
          ...(treatAsAPNG && {
            isAPNG: true,
            syncWithTimeline: options?.syncWithTimeline || true,
            playbackBehavior: options?.playbackBehavior || "sync"
          })
        };

        console.log("Opciones de dispatch:", JSON.stringify(dispatchOptions, null, 2));

      // Agregar video al timeline
      dispatch(ADD_VIDEO, {
        payload: videoPayload,
          options: dispatchOptions,
        });

        // Mensaje de log adaptado al tipo de archivo
        if (treatAsAPNG) {
          console.log(`✅ Transición APNG añadida como VIDEO SINCRONIZADO al timeline desde ${startTime}s ${finalEndTime ? `hasta ${finalEndTime}s` : 'con duración natural'}. Dimensiones: ${width}x${height}`);
        } else {
          console.log(`✅ Video ${isAVI ? 'AVI' : ''} añadido al timeline desde ${startTime}s${finalEndTime ? ` hasta ${finalEndTime}s` : ' con duración natural'}. Dimensiones: ${width}x${height}`);
        }
      } catch (error) {
        console.error("❌ ERROR CRÍTICO al añadir video:", error);
        console.error("Detalles completos:", error.message);
        console.error("Traza:", error.stack);
        throw error; // Propagar el error para manejo superior
      }
    },

    changeDuration: (elementId: string, duration: number) => {
      // Simulación de cambio de duración (la implementación real dependerá de la estructura del proyecto)
      console.log(`Cambiando duración del elemento ${elementId} a ${duration}s`);

      // Aquí iría la lógica real para cambiar la duración de un elemento
    },

    changeTransition: (elementId: string, transition: string) => {
      // Simulación de cambio de transición (la implementación real dependerá de la estructura del proyecto)
      console.log(`Cambiando transición del elemento ${elementId} a ${transition}`);

      // Aquí iría la lógica real para cambiar la transición de un elemento
    },

    addSubtitles: async (options?: SubtitleOptions) => {
      try {
        console.log("Añadiendo subtítulos directamente sin depender del botón");

        // Tipo para representar un segmento de subtítulo
        interface SubtitleSegment {
          id: number;
          startTime: number; // en milisegundos
          endTime: number;   // en milisegundos
          text: string;
        }

        // Función para parsear el tiempo de formato SRT a milisegundos
        const parseTimeToMs = (timeString: string): number => {
          const [hours, minutes, secondsAndMs] = timeString.split(':');
          const [seconds, ms] = secondsAndMs.split(',');

          return (
            parseInt(hours) * 3600000 +
            parseInt(minutes) * 60000 +
            parseInt(seconds) * 1000 +
            parseInt(ms)
          );
        };

        // Función para parsear el archivo SRT
        const parseSRT = (srtContent: string): SubtitleSegment[] => {
          const segments: SubtitleSegment[] = [];
          const blocks = srtContent.trim().split('\n\n');

          blocks.forEach(block => {
            const lines = block.split('\n');
            if (lines.length >= 3) {
              const id = parseInt(lines[0]);
              const timeRange = lines[1].split(' --> ');
              const startTime = parseTimeToMs(timeRange[0]);
              const endTime = parseTimeToMs(timeRange[1]);
              const text = lines.slice(2).join('\n'); // Unir todas las líneas de texto

              segments.push({
                id,
                startTime,
                endTime,
                text
              });
            }
          });

          return segments;
        };

        // Función para dividir un texto en grupos de aproximadamente 3 palabras
        const splitTextIntoGroups = (text: string, wordsPerGroup = 3): string[] => {
          const words = text.split(/\s+/);
          const groups: string[] = [];

          for (let i = 0; i < words.length; i += wordsPerGroup) {
            const group = words.slice(i, i + wordsPerGroup).join(' ');
            groups.push(group);
          }

          return groups;
        };

        // Función para procesar un segmento y dividirlo en múltiples segmentos si es necesario
        const processSegment = (segment: SubtitleSegment): SubtitleSegment[] => {
          const textGroups = splitTextIntoGroups(segment.text);

          // Si solo hay un grupo, devolver el segmento original
          if (textGroups.length <= 1) {
            return [segment];
          }

          // Calcular la duración de cada grupo
          const totalDuration = segment.endTime - segment.startTime;
          const groupDuration = totalDuration / textGroups.length;

          // Crear un nuevo segmento para cada grupo
          return textGroups.map((groupText, index) => {
            const startTime = segment.startTime + (index * groupDuration);
            const endTime = startTime + groupDuration;

            return {
              id: segment.id * 1000 + index, // Generar un ID único
              startTime,
              endTime,
              text: groupText
            };
          });
        };

        // Función para crear el payload de texto para subtítulos
        const createSubtitlePayload = (text: string, startTime: number, endTime: number) => ({
          id: generateId(),
          display: {
            from: startTime,
            to: endTime,
          },
          type: 'text',
          details: {
            text: text.toUpperCase(), // Convertir a mayúsculas como MrBeast
            fontSize: 80, // Tamaño más grande para estilo MrBeast
            width: 900,
            fontUrl: '/fonts/mrbeast.ttf', // Usar la fuente MrBeast
            fontFamily: 'MrBeast', // Nombre de la fuente MrBeast
            color: '#FFFF00', // Amarillo brillante
            wordWrap: 'break-word',
            textAlign: 'center',
            borderWidth: 20, // Stroke negro grueso
            borderColor: '#000000',
            boxShadow: {
              color: '#000000',
              x: 3,
              y: 3,
              blur: 0, // Sin desenfoque para un estilo más impactante
            },
            backgroundColor: 'transparent', // Sin fondo para que destaque más
            padding: 10,
            borderRadius: 0, // Sin bordes redondeados para un estilo más impactante
          },
        });

        // Cargar el archivo SRT
        console.log("Cargando archivo SRT...");
        const response = await fetch('/transcriptions/transcription1.srt');
        if (!response.ok) {
          throw new Error(`Error al cargar el archivo SRT: ${response.status}`);
        }

        const srtContent = await response.text();
        console.log("Archivo SRT cargado correctamente");

        // Parsear el archivo SRT
        let segments = parseSRT(srtContent);
        console.log(`Se encontraron ${segments.length} segmentos de subtítulos`);

        // Siempre usar el modo agrupado (dividir en grupos de 3 palabras)
        segments = segments.flatMap(processSegment);
        console.log(`Después de procesar, hay ${segments.length} segmentos de subtítulos`);

        // Filtrar por tiempo si es necesario
        if (options?.startTime !== undefined || options?.endTime !== undefined) {
          const originalLength = segments.length;
          segments = segments.filter(segment => {
            const passesStartFilter = options.startTime === undefined ||
                                     segment.startTime >= (options.startTime * 1000);
            const passesEndFilter = options.endTime === undefined ||
                                   segment.endTime <= (options.endTime * 1000);
            return passesStartFilter && passesEndFilter;
          });
          console.log(`Filtrado por tiempo: de ${originalLength} a ${segments.length} segmentos`);
        }

        // Añadir los subtítulos con un retraso entre cada uno
        console.log(`Añadiendo ${segments.length} segmentos de subtítulos al timeline...`);

        segments.forEach((segment, index) => {
          setTimeout(() => {
            dispatch(ADD_TEXT, {
              payload: createSubtitlePayload(segment.text, segment.startTime, segment.endTime),
              options: {},
            });

            if ((index + 1) % 10 === 0 || index === segments.length - 1) {
              console.log(`Progreso: ${index + 1}/${segments.length} subtítulos añadidos`);
            }
          }, index * 200); // 200ms de retraso entre cada subtítulo
        });

        return true;
      } catch (error) {
        console.error("Error al añadir subtítulos:", error);
        return false;
      }
    },

    getActiveElements: async () => {
      try {
        // Obtener el estado actual
        const state = stateManager.getState();

        // Verificar si hay IDs activos
        if (!state.activeIds || state.activeIds.length === 0) {
          console.log("No hay elementos activos seleccionados");
          return [];
        }

        // Verificar si hay elementos en el trackItemsMap
        if (!state.trackItemsMap) {
          console.log("No hay trackItemsMap disponible");
          return [];
        }

        // Obtener información de los elementos activos
        const activeElements = state.activeIds
          .filter(id => state.trackItemsMap[id])
          .map(id => {
            const item = state.trackItemsMap[id];
            return {
              id,
              trackId: item.trackId,
              type: item.type,
              from: item.display?.from,
              to: item.display?.to,
              duration: item.display ? (item.display.to - item.display.from) : 0,
              details: item.details
            };
          });

        console.log(`Se encontraron ${activeElements.length} elementos activos`);
        return activeElements;
      } catch (error) {
        console.error("Error al obtener elementos activos:", error);
        return [];
      }
    },

    getAllTimelineElements: async () => {
      try {
        // Obtener el estado actual
        const state = stateManager.getState();

        // Verificar si hay elementos en el trackItemsMap
        if (!state.trackItemsMap || Object.keys(state.trackItemsMap).length === 0) {
          console.log("No hay elementos en el trackItemsMap");

          // Buscar elementos en otras propiedades del estado
          for (const key of Object.keys(state)) {
            if (typeof state[key] === 'object' && state[key] !== null) {
              const objValue = state[key];
              console.log(`Explorando propiedad alternativa: ${key}`);

              // Verificar si parece ser un mapa de elementos
              if (Object.keys(objValue).length > 0) {
                const sample = objValue[Object.keys(objValue)[0]];
                if (sample && sample.display && sample.type) {
                  console.log(`Encontrada posible fuente alternativa de elementos en propiedad ${key}`);

                  // Procesar elementos de esta propiedad alternativa
                  return Object.entries(objValue)
                    .filter(([_, item]) => item && item.display)
                    .map(([id, item]) => ({
                      id,
                      trackId: item.trackId,
                      type: item.type,
                      from: item.display?.from,
                      to: item.display?.to,
                      duration: item.display ? (item.display.to - item.display.from) : 0,
                      details: item.details
                    }));
                }
              }
            }
          }

          return [];
        }

        // Obtener todos los elementos
        const allElements = Object.entries(state.trackItemsMap)
          .filter(([_, item]) => item && item.display)
          .map(([id, item]) => ({
            id,
            trackId: item.trackId,
            type: item.type,
            from: item.display?.from,
            to: item.display?.to,
            duration: item.display ? (item.display.to - item.display.from) : 0,
            details: item.details
          }))
          .sort((a, b) => (a.from || 0) - (b.from || 0));

        console.log(`Se encontraron ${allElements.length} elementos en el timeline`);
        return allElements;
      } catch (error) {
        console.error("Error al obtener todos los elementos del timeline:", error);
        return [];
      }
    },

    removeSegments: async (segments: TimeSegment[]) => {
      try {
        console.log("Iniciando eliminación de segmentos múltiples");

        // Obtener el estado actual
        const state = stateManager.getState();

        // Validar que haya elementos en la timeline
        if (!state.activeIds || state.activeIds.length === 0) {
          console.error("No hay elementos seleccionados en la timeline");

          // Buscar el primer elemento disponible en la timeline
          const trackItemsMap = state.trackItemsMap || {};
          const trackItems = Object.keys(trackItemsMap);

          if (trackItems.length === 0) {
            console.error("No hay elementos en la timeline para eliminar segmentos");
            throw new Error("No hay elementos en la timeline");
          }

          // Seleccionar el primer elemento disponible
          const firstItemId = trackItems[0];
          console.log(`Seleccionando automáticamente el elemento con ID: ${firstItemId}`);

          dispatch(LAYER_SELECT, {
            payload: {
              ids: [firstItemId]
            }
          });

          // Esperar a que se aplique la selección
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Almacenamos información del elemento seleccionado
        const currentState = stateManager.getState();
        if (!currentState.activeIds || currentState.activeIds.length === 0) {
          throw new Error("No se pudo seleccionar ningún elemento en la timeline");
        }

        const originalItemId = currentState.activeIds[0];
        const originalItem = currentState.trackItemsMap[originalItemId];
        const trackType = originalItem.type;
        const trackId = originalItem.trackId;

        console.log(`Elemento seleccionado: ID=${originalItemId}, tipo=${trackType}, trackId=${trackId}`);

        // Procesar cada segmento en orden (de final a principio para evitar afectar posiciones)
        for (let i = segments.length - 1; i >= 0; i--) {
          const segment = segments[i];
          console.log(`Procesando segmento ${i+1}/${segments.length}: ${segment.startTime}s - ${segment.endTime}s`);

          try {
            // PASO 1: Hacer un corte en el tiempo final
            const endMs = segment.endTime * 1000;
            dispatch(ACTIVE_SPLIT, {
              payload: {},
              options: {
                time: endMs,
              },
            });
            console.log(`Paso 1: Corte aplicado en tiempo final ${segment.endTime}s`);

            // Esperar a que se procese el primer corte
            await new Promise(resolve => setTimeout(resolve, 500));

            // Obtenemos el estado después del primer corte
            const stateAfterFirstCut = stateManager.getState();
            const elementsAfterFirstCut = Object.entries(stateAfterFirstCut.trackItemsMap)
              .filter(([_, item]) =>
                item.type === trackType &&
                item.trackId === trackId &&
                item.display &&
                !isNaN(item.display.from) &&
                !isNaN(item.display.to)
              )
              .map(([id, item]) => ({
                id,
                from: item.display.from,
                to: item.display.to,
                duración: item.display.to - item.display.from
              }))
              .sort((a, b) => a.from - b.from);

            console.log("Elementos después del primer corte:", elementsAfterFirstCut);

            // PASO 2: Identificar el elemento izquierdo que contiene el tiempo inicial
            const startMs = segment.startTime * 1000;
            const leftElement = elementsAfterFirstCut.find(elem =>
              elem.from <= startMs && elem.to >= startMs
            );

            if (!leftElement) {
              console.error(`No se pudo identificar el elemento izquierdo para el segmento ${i+1}`);
              continue;
            }

            console.log(`Paso 2: Elemento izquierdo identificado (ID: ${leftElement.id})`);

            // PASO 3: Seleccionar el elemento izquierdo y hacer corte en tiempo inicial
            dispatch(LAYER_SELECT, {
              payload: {
                ids: [leftElement.id]
              }
            });

            // Esperar a que se aplique la selección
            await new Promise(resolve => setTimeout(resolve, 300));

            // Aplicar el corte en el tiempo inicial
            dispatch(ACTIVE_SPLIT, {
              payload: {},
              options: {
                time: startMs,
              },
            });
            console.log(`Paso 3: Segundo corte aplicado en tiempo inicial ${segment.startTime}s`);

            // Esperar a que se procese el segundo corte
            await new Promise(resolve => setTimeout(resolve, 500));

            // Obtenemos el estado después del segundo corte
            const stateAfterSecondCut = stateManager.getState();
            const elementsAfterSecondCut = Object.entries(stateAfterSecondCut.trackItemsMap)
              .filter(([_, item]) =>
                item.type === trackType &&
                item.trackId === trackId &&
                item.display &&
                !isNaN(item.display.from) &&
                !isNaN(item.display.to)
              )
              .map(([id, item]) => ({
                id,
                from: item.display.from,
                to: item.display.to,
                duración: item.display.to - item.display.from
              }))
              .sort((a, b) => a.from - b.from);

            console.log("Elementos después del segundo corte:", elementsAfterSecondCut);

            // PASO 4: Identificar el elemento del medio usando criterios más precisos
            const middleElements = elementsAfterSecondCut.filter(elem =>
              Math.abs(elem.from - startMs) < 50 && Math.abs(elem.to - endMs) < 50
            );

            console.log("Elementos que coinciden con los criterios del medio:", middleElements);

            if (middleElements.length === 0) {
              console.error(`No se pudo identificar el elemento del medio para el segmento ${i+1}`);
              continue;
            }

            // Si hay más de un elemento que coincide, tomamos el primero
            const middleElement = middleElements[0];
            console.log(`Paso 4: Elemento del medio identificado (ID: ${middleElement.id})`);

            // PASO 5: Seleccionar y eliminar el elemento del medio
            dispatch(LAYER_SELECT, {
              payload: {
                ids: [middleElement.id]
              }
            });

            // Esperar a que se aplique la selección
            await new Promise(resolve => setTimeout(resolve, 300));

            // Verificar que el elemento está seleccionado antes de eliminarlo
            const currentState = stateManager.getState();
            if (currentState.activeIds && currentState.activeIds.includes(middleElement.id)) {
              console.log(`Elemento del medio correctamente seleccionado, procediendo con eliminación`);
              dispatch(LAYER_DELETE);
              console.log(`Elemento eliminado correctamente: ${middleElement.id}`);
            } else {
              console.log(`No se pudo seleccionar normalmente, intentando método alternativo`);

              // Enfoque alternativo: Usar el EDIT_OBJECT para "ocultar" el segmento
              dispatch(EDIT_OBJECT, {
                payload: {
                  [middleElement.id]: {
                    display: {
                      from: -99999, // Un valor fuera del rango visible
                      to: -99990
                    },
                    visible: false // Adicionalmente marcarlo como no visible
                  }
                }
              });
              console.log(`Aplicado método alternativo para ocultar el segmento`);
            }

            // Esperar a que se procese la eliminación
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (error) {
            console.error(`Error al procesar el segmento ${i+1}:`, error);
          }

          // Pausa entre segmentos
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Actualizar la escala para refrescar la vista
        const { scale } = stateManager.getState();
        if (scale) {
          console.log("Actualizando escala para refrescar la vista");

          // Guardar el valor actual de scale.unit
          const originalUnit = scale.unit;

          // Incrementar el valor
          scale.unit += 1;
          console.log(`Scale cambiada: ${originalUnit} -> ${scale.unit}`);

          // Asegurar que el cambio sea notado por el sistema
          dispatch(TIMELINE_SCALE_CHANGED, {
            payload: {
              scale: {
                ...scale,  // Incluir todas las propiedades de scale
                unit: scale.unit  // Explícitamente establecer el nuevo valor
              },
            },
          });

          // Forzar una actualización adicional volviendo al valor original después de un momento
          setTimeout(() => {
            const currentState = stateManager.getState();
            if (currentState.scale) {
              dispatch(TIMELINE_SCALE_CHANGED, {
                payload: {
                  scale: {
                    ...currentState.scale,
                    unit: originalUnit  // Volver al valor original
                  },
                },
              });

              console.log(`Restaurado scale a valor original: ${originalUnit}`);
            }
          }, 300);
        }

        console.log("Eliminación de segmentos completada");
        return true;
      } catch (error) {
        console.error("Error al eliminar segmentos:", error);
        return false;
      }
    },

    compactTimeline: async () => {
      try {
        console.log("=== INICIANDO COMPACTACIÓN DE LÍNEA DE TIEMPO DESDE IA ===");

        // Obtener el estado actual
        const estado = stateManager.getState();
        console.log("Estado para compactación:", Object.keys(estado));

        // Añadir un tiempo de espera inicial para asegurar que el estado está actualizado
        console.log("Esperando 1 segundo para asegurar consistencia del estado...");
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verificación adicional para asegurarnos que los cambios en la timeline ya se aplicaron
        console.log("Verificando que los elementos en la timeline reflejen los cambios más recientes...");

        // Pequeña pausa adicional para asegurar consistencia del estado
        await new Promise(resolve => setTimeout(resolve, 500));

        // Buscar los elementos del timeline - usando la referencia al método dentro del mismo objeto
        const todosElementos = await executor.getAllTimelineElements();
        console.log(`Encontrados ${todosElementos.length} elementos en la timeline`);

        // Logging de elementos para diagnóstico
        todosElementos.forEach((elem, index) => {
          console.log(`Elemento ${index + 1}: ID=${elem.id}, Tipo=${elem.type}, Track=${elem.trackId}, Tiempo=${elem.from}ms-${elem.to}ms (duración=${elem.to-elem.from}ms)`);
        });

        // Si no hay elementos, no podemos compactar
        if (todosElementos.length === 0) {
          console.log("No hay elementos en el timeline para compactar");
          return false;
        }

        // Agrupar elementos por track para análisis
        const elementosPorTrack = {};
        todosElementos.forEach(elem => {
          if (elem.trackId) {
            if (!elementosPorTrack[elem.trackId]) {
              elementosPorTrack[elem.trackId] = [];
            }
            elementosPorTrack[elem.trackId].push(elem);
          }
        });

        // Ordenar elementos en cada track por tiempo
        Object.keys(elementosPorTrack).forEach(trackId => {
          elementosPorTrack[trackId].sort((a, b) => a.from - b.from);
        });

        console.log("Elementos agrupados por track:", Object.keys(elementosPorTrack).length);

        // Logging de tracks para diagnóstico
        Object.keys(elementosPorTrack).forEach(trackId => {
          console.log(`Track ${trackId}: ${elementosPorTrack[trackId].length} elementos`);
          // Mostrar los elementos en este track ordenados
          elementosPorTrack[trackId].forEach((elem, idx) => {
            console.log(`  ${idx+1}. ID=${elem.id.substring(0,8)}... Tiempo=${elem.from}ms-${elem.to}ms (duración: ${elem.to-elem.from}ms)`);
          });
        });

        // Buscar espacios vacíos en cada track
        const espaciosVacios = [];

        Object.keys(elementosPorTrack).forEach(trackId => {
          const elementos = elementosPorTrack[trackId];

          // Si hay al menos 2 elementos, podemos buscar espacios
          if (elementos.length >= 2) {
            for (let i = 0; i < elementos.length - 1; i++) {
              const elementoActual = elementos[i];
              const elementoSiguiente = elementos[i + 1];

              // Verificar si hay un espacio entre el fin del elemento actual y el inicio del siguiente
              const espacio = elementoSiguiente.from - elementoActual.to;

              // Si el espacio es significativo (más de 100ms)
              if (espacio > 100) {
                espaciosVacios.push({
                  trackId,
                  start: elementoActual.to,
                  end: elementoSiguiente.from,
                  size: espacio,
                  elementoAntes: elementoActual.id,
                  elementoDespues: elementoSiguiente.id
                });
                console.log(`Encontrado espacio de ${espacio}ms (${espacio/1000}s) en track ${trackId} entre elementos ${elementoActual.id.substring(0,8)}... y ${elementoSiguiente.id.substring(0,8)}...`);
              }
            }
          }
        });

        console.log(`Se encontraron ${espaciosVacios.length} espacios vacíos`);

        // Si no hay espacios, no necesitamos compactar
        if (espaciosVacios.length === 0) {
          console.log("No hay espacios significativos para compactar");
          return true; // Devolvemos true porque técnicamente está compactado
        }

        // Ordenar espacios por posición (de izquierda a derecha)
        espaciosVacios.sort((a, b) => a.start - b.start);

        // Calcular el espacio total a compactar
        let espacioTotal = 0;
        espaciosVacios.forEach(espacio => {
          espacioTotal += espacio.size;
        });

        console.log(`Espacio total a compactar: ${espacioTotal}ms (${espacioTotal/1000}s)`);
        console.log(`Preparando actualizaciones para ${todosElementos.length} elementos...`);

        // Preparar actualizaciones para cada elemento
        const actualizaciones = {};
        let elementosAMover = 0;

        // Para cada elemento, calculamos el desplazamiento basado en los espacios anteriores
        todosElementos.forEach(elemento => {
          let desplazamiento = 0;

          // Calcular cuánto debe moverse basado en los espacios vacíos anteriores
          for (const espacio of espaciosVacios) {
            // Si el elemento está después del espacio vacío, debe moverse
            if (elemento.from > espacio.end) {
              desplazamiento += espacio.size;
            }
          }

          // Si hay desplazamiento, añadir a las actualizaciones
          if (desplazamiento > 0) {
            const nuevoFrom = elemento.from - desplazamiento;
            const nuevoTo = elemento.to - desplazamiento;

            console.log(`Elemento ${elemento.id.substring(0,8)}... se moverá: ${elemento.from}ms -> ${nuevoFrom}ms (desplazamiento: ${desplazamiento}ms)`);

            actualizaciones[elemento.id] = {
              display: {
                from: nuevoFrom,
                to: nuevoTo
              }
            };
            elementosAMover++;
          }
        });

        console.log(`Elementos a mover: ${elementosAMover} de ${todosElementos.length} total`);

        // Aplicar las actualizaciones
        if (elementosAMover > 0) {
          console.log("Aplicando actualizaciones para compactar timeline...");

          try {
            dispatch(EDIT_OBJECT, {
              payload: actualizaciones
            });
            console.log("Actualizaciones aplicadas con éxito");
          } catch (error) {
            console.error("Error al aplicar actualizaciones:", error);
            return false;
          }

          // Refrescar la vista
          setTimeout(() => {
            try {
              const { scale } = stateManager.getState();
              if (scale) {
                // Hacer un pequeño cambio en la escala para forzar la actualización
                const updatedScale = { ...scale };

                if (typeof updatedScale.unit === 'number') {
                  updatedScale.unit = (updatedScale.unit || 0) + 1;

                  dispatch(TIMELINE_SCALE_CHANGED, {
                    payload: { scale: updatedScale }
                  });

                  // Volver a la escala original
                  setTimeout(() => {
                    const currentScale = { ...stateManager.getState().scale };
                    currentScale.unit = (currentScale.unit || 1) - 1;
                    dispatch(TIMELINE_SCALE_CHANGED, {
                      payload: { scale: currentScale }
                    });
                  }, 300);
                }
              }
            } catch (error) {
              console.error("Error al refrescar la vista:", error);
            }
          }, 500);

          console.log("Compactación completada con éxito");
          return true;
        } else {
          console.log("No hay elementos que necesiten moverse");
          return true;
        }
      } catch (error) {
        console.error("Error al compactar la línea de tiempo:", error);
        return false;
      }
    },

    smartTrim: async () => {
      try {
        console.log("=== INICIANDO PROCESO DE RECORTE INTELIGENTE DESDE IA ===");

        // 1. Realizar la llamada al API para analizar la transcripción
        console.log("Solicitando análisis de transcripción...");
        const response = await fetch('/api/smart-trim');

        if (!response.ok) {
          throw new Error(`Error al analizar la transcripción: ${response.status}`);
        }

        const data = await response.json();
        console.log("Análisis de transcripción completado:", data);

        if (!data.removeSegments || !Array.isArray(data.removeSegments) || data.removeSegments.length === 0) {
          console.log("No se encontraron segmentos para eliminar");
          return false;
        }

        // 2. Convertir los segmentos al formato que espera removeSegments
        const segments = data.removeSegments.map(segment => ({
          startTime: segment.startTime, // Ya está en segundos
          endTime: segment.endTime      // Ya está en segundos
        }));

        console.log(`Se eliminarán ${segments.length} segmentos:`,
          segments.map(s => `${s.startTime}s-${s.endTime}s`).join(', '));

        // Almacenar información del estado previo para identificar tracks y elementos
        console.log("Obteniendo información del estado antes de eliminar segmentos...");
        const estadoPrevio = stateManager.getState();
        const elementosPrevios = await executor.getAllTimelineElements();

        // Determinar el trackId principal basado en los elementos
        const contadorTracks = {};
        elementosPrevios.forEach(elem => {
          if (elem.trackId) {
            contadorTracks[elem.trackId] = (contadorTracks[elem.trackId] || 0) + 1;
          }
        });

        // Encontrar el track con más elementos
        let trackIdPrincipal = "";
        if (Object.keys(contadorTracks).length > 0) {
          const tracksPorUso = Object.entries(contadorTracks)
            .sort((a, b) => b[1] - a[1]);

          if (tracksPorUso.length > 0) {
            trackIdPrincipal = tracksPorUso[0][0];
            console.log(`Usando trackId principal: ${trackIdPrincipal}`);
          }
        }

        // 3. Eliminar los segmentos
        console.log("Ejecutando eliminación de segmentos...");
        const result = await executor.removeSegments(segments);

        if (!result) {
          console.log("Error al eliminar los segmentos");
          return false;
        }

        console.log("Segmentos eliminados correctamente");

        // 4. Crear registro de los segmentos eliminados para compactación
        const segmentosEliminados = segments.map(segment => ({
          start: segment.startTime * 1000,  // Convertir a ms
          end: segment.endTime * 1000,      // Convertir a ms
          trackId: trackIdPrincipal,
          size: (segment.endTime - segment.startTime) * 1000
        }));

        console.log("Segmentos registrados para compactación:", segmentosEliminados);

        // 5. Esperar un momento para que se completen las actualizaciones del DOM y el estado
        console.log("Esperando 5 segundos para asegurar que los cambios en la timeline estén completos antes de compactar...");
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 6. Compactar el timeline usando el enfoque de segmentos registrados
        console.log("Compactando timeline basado en segmentos eliminados...");

        // Obtener elementos actuales después de la eliminación
        const elementosActuales = await executor.getAllTimelineElements();
        console.log(`Se encontraron ${elementosActuales.length} elementos en la timeline después de eliminar segmentos`);

        // Calcular el espacio total a compactar
        let espacioTotal = 0;
        segmentosEliminados.forEach(segmento => {
          espacioTotal += segmento.size;
        });

        console.log(`Espacio total a compactar: ${espacioTotal}ms (${espacioTotal/1000}s)`);

        // Preparar actualizaciones para cada elemento
        const actualizaciones = {};
        let elementosAMover = 0;

        // Ordenar segmentos por posición de inicio
        const segmentosOrdenados = [...segmentosEliminados].sort((a, b) => a.start - b.start);

        // Para cada elemento, calcular el desplazamiento basado en los segmentos eliminados
        elementosActuales.forEach(elemento => {
          let desplazamiento = 0;

          // Calcular cuánto debe moverse basado en los segmentos eliminados anteriores
          for (const segmento of segmentosOrdenados) {
            if (elemento.from > segmento.start) {
              desplazamiento += segmento.size;
            }
          }

          // Si hay desplazamiento, añadir a las actualizaciones
          if (desplazamiento > 0) {
            const nuevoFrom = elemento.from - desplazamiento;
            const nuevoTo = elemento.to - desplazamiento;

            console.log(`Elemento ${elemento.id.substring(0,8)}... se moverá: ${elemento.from}ms -> ${nuevoFrom}ms (desplazamiento: ${desplazamiento}ms)`);

            actualizaciones[elemento.id] = {
              display: {
                from: nuevoFrom,
                to: nuevoTo
              }
            };
            elementosAMover++;
          }
        });

        console.log(`Elementos a mover: ${elementosAMover} de ${elementosActuales.length} total`);

        // Aplicar las actualizaciones
        if (elementosAMover > 0) {
          console.log("Aplicando actualizaciones para compactar timeline...");

          try {
            dispatch(EDIT_OBJECT, {
              payload: actualizaciones
            });
            console.log("Actualizaciones aplicadas con éxito");

            // Refrescar la vista
            setTimeout(() => {
              try {
                const { scale } = stateManager.getState();
                if (scale) {
                  const updatedScale = { ...scale };
                  if (typeof updatedScale.unit === 'number') {
                    updatedScale.unit = (updatedScale.unit || 0) + 1;

                    dispatch(TIMELINE_SCALE_CHANGED, {
                      payload: { scale: updatedScale }
                    });

                    // Volver a la escala original
                    setTimeout(() => {
                      const currentScale = { ...stateManager.getState().scale };
                      currentScale.unit = (currentScale.unit || 1) - 1;
                      dispatch(TIMELINE_SCALE_CHANGED, {
                        payload: { scale: currentScale }
                      });
                    }, 300);
                  }
                }
              } catch (error) {
                console.error("Error al refrescar la vista:", error);
              }
            }, 500);

          } catch (error) {
            console.error("Error al aplicar actualizaciones:", error);
            return false;
          }
        } else {
          console.log("No se encontraron elementos que necesiten moverse");
        }

        console.log("Timeline compactado correctamente");
        return true;
      } catch (error) {
        console.error("Error al realizar el recorte inteligente:", error);
        return false;
      }
    }
  };

  return executor;
}
