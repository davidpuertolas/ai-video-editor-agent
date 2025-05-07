import React, { useEffect, useState, useRef } from 'react';
import { filter, subject, dispatch } from "@designcombo/events";
import { TIMELINE_SELECTION_MODAL } from './items/timeline';
import AIService from '../services/ai-service';
import CommandExecutorService from '../services/command-executor-service';
import { generateId } from "@designcombo/timeline";
import { ADD_IMAGE, ADD_VIDEO, ADD_TEXT, ADD_ANIMATION } from "@designcombo/state";

interface Position {
  x: number;
  y: number;
}

interface SelectedItems {
  selectedItems: any[];
  position: Position;
  source: string;
}

interface URLAnalysisResult {
  containsURLs: boolean;
  urls: string[];
  screenshots?: URLScreenshotInfo[];
}

interface URLScreenshotInfo {
  url: string;
  screenshotPath: string;
}

// Interfaz para detección de transiciones
interface TransitionDetectionResult {
  detected: boolean;
  confidence: number;
  reason: string;
  transitionPath?: string;
}

// Interfaz para mensajes de chat
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // Si el mensaje mostró captura de pantalla, guardar información
  showScreenshot?: boolean;
  screenshotUrl?: string;
  detectionInfo?: {
    detected: boolean;
    confidence: number;
    reason: string;
  };
}

/**
 * Modal que se muestra cuando se seleccionan elementos por arrastre en la timeline
 * Proporciona una interfaz simple para enviar comandos mediante texto
 */
const SelectionModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [lastActionInfo, setLastActionInfo] = useState<string | null>(null);
  const [showActionInfo, setShowActionInfo] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<boolean | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Estado para el chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Estado para rastrear imágenes añadidas a la timeline
  const [addedScreenshots, setAddedScreenshots] = useState<{url: string, screenshotPath: string}[]>([]);

  useEffect(() => {
    // Suscribirse al evento de selección por arrastre
    const selectionEvents = subject.pipe(
      filter(({ key }) => key === TIMELINE_SELECTION_MODAL)
    );

    const subscription = selectionEvents.subscribe((event) => {
      const payload = event.value?.payload as SelectedItems;
      console.log('Selection modal event received:', payload);

      if (payload && payload.selectedItems && payload.selectedItems.length > 0) {
        setSelectedItems(payload.selectedItems);

        // Ajustar la posición para que el modal sea visible
        setPosition({
          x: Math.min(payload.position.x, window.innerWidth - 350),
          y: Math.min(payload.position.y, window.innerHeight - 350)
        });

        // Resetear estados
        setChatMessages([]);
        setChatInput('');
        setLastActionInfo(null);
        setActionSuccess(null);
        setVisible(true);

        // Enfocar el textarea cuando el modal se abre
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 100);
      }
    });

    // Manejar clic fuera del modal para cerrarlo
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
  };

  // Función para agregar una transición al video
  const applyTransition = async (transitionPath: string): Promise<{ success: boolean; details: string }> => {
    try {
      console.log("=== APLICANDO TRANSICIÓN USANDO EFECTOS DE FADE ===");

      // Verificar si tenemos elementos seleccionados
      if (!selectedItems || selectedItems.length === 0) {
        return {
          success: false,
          details: "No hay elementos seleccionados para aplicar la transición"
        };
      }

      // Duración de los efectos en frames (30 frames = 1 segundo)
      const fadeDuration = 30;

      // Si hay exactamente dos elementos seleccionados
      if (selectedItems.length === 2) {
        console.log("Aplicando transición entre dos elementos: fade out al primero, fade in al segundo");

        // Primer elemento: aplicar fade out
        const firstElement = selectedItems[1];

        // Segundo elemento: aplicar fade in
        const secondElement = selectedItems[0];

        // Aplicar fade out al primer elemento
        dispatch(ADD_ANIMATION, {
          payload: {
            id: firstElement.id,
            animations: {
              out: {
                name: "fadeOut",
                composition: [{
                  property: "opacity",
                  from: 1,
                  to: 0,
                  durationInFrames: fadeDuration, // 1 segundo
                  ease: "easeInOut",
                  name: "Fade Out",
                  previewUrl: "https://cdn.designcombo.dev/animations/FadeOut.webp",
                }],
              },
            },
          },
        });

        // Aplicar fade in al segundo elemento
        dispatch(ADD_ANIMATION, {
          payload: {
            id: secondElement.id,
            animations: {
              in: {
                name: "fadeIn",
                composition: [{
                  property: "opacity",
                  from: 0,
                  to: 1,
                  durationInFrames: fadeDuration, // 1 segundo
                  ease: "easeInOut",
                  name: "Fade In",
                  previewUrl: "https://cdn.designcombo.dev/animations/FadeIn.webp",
                }],
              },
            },
          },
        });

        return {
          success: true,
          details: "Transición aplicada: Fade out de 1 segundo al primer elemento y fade in de 1 segundo al segundo elemento"
        };
      }
      // Si solo hay un elemento seleccionado
      else if (selectedItems.length === 1) {
        console.log("Solo hay un elemento seleccionado, aplicando fade out");

        const element = selectedItems[0];

        // Aplicar fade out al elemento
        dispatch(ADD_ANIMATION, {
          payload: {
            id: element.id,
            animations: {
              out: {
                name: "fadeOut",
                composition: [{
                  property: "opacity",
                  from: 1,
                  to: 0,
                  durationInFrames: fadeDuration, // 1 segundo
                  ease: "easeInOut",
                  name: "Fade Out",
                  previewUrl: "https://cdn.designcombo.dev/animations/FadeOut.webp",
                }],
              },
            },
          },
        });

        return {
          success: true,
          details: "Fade out de 1 segundo aplicado al elemento seleccionado"
        };
      }
      // Si hay más de dos elementos seleccionados
      else {
        console.log("Hay más de dos elementos seleccionados, aplicando fade out al primero y fade in al último");

        // Primer elemento: aplicar fade out
        const firstElement = selectedItems[0];

        // Último elemento: aplicar fade in
        const lastElement = selectedItems[selectedItems.length - 1];

        // Aplicar fade out al primer elemento
        dispatch(ADD_ANIMATION, {
          payload: {
            id: firstElement.id,
            animations: {
              out: {
                name: "fadeOut",
                composition: [{
                  property: "opacity",
                  from: 1,
                  to: 0,
                  durationInFrames: fadeDuration, // 1 segundo
                  ease: "easeInOut",
                  name: "Fade Out",
                  previewUrl: "https://cdn.designcombo.dev/animations/FadeOut.webp",
                }],
              },
            },
          },
        });

        // Aplicar fade in al último elemento
        dispatch(ADD_ANIMATION, {
          payload: {
            id: lastElement.id,
            animations: {
              in: {
                name: "fadeIn",
                composition: [{
                  property: "opacity",
                  from: 0,
                  to: 1,
                  durationInFrames: fadeDuration, // 1 segundo
                  ease: "easeInOut",
                  name: "Fade In",
                  previewUrl: "https://cdn.designcombo.dev/animations/FadeIn.webp",
                }],
              },
            },
          },
        });

        return {
          success: true,
          details: `Transición aplicada: Fade out al primer elemento y fade in al último elemento (${selectedItems.length} elementos seleccionados)`
        };
      }
    } catch (error) {
      console.error("Error al aplicar transición:", error);
      return {
        success: false,
        details: `Error al aplicar transición: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  };

  // Función para enviar un mensaje y procesarlo sin mostrar chat
  const sendCommand = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    // Añadir el mensaje del usuario al chat interno (para lógica, no se muestra)
    setChatMessages([...chatMessages, userMessage]);
    setChatInput('');
    setIsSending(true);
    setLastActionInfo(null);
    setShowActionInfo(false);
    setActionSuccess(null);

    try {
      console.log("=== INICIANDO ENVÍO DE COMANDO ===");

      // Enviar el mensaje a la API
      const response = await AIService.sendChatMessage({
        message: chatInput,
        selectedItems: selectedItems
      });

      console.log("Respuesta recibida de la API:", response);

      if (response.success && response.response) {
        let actionSuccessful = true; // Por defecto asumimos éxito
        let operationDetails = '';
        let screenshotToAdd = null;
        let detectionInfo = null;
        let startTime = 0;
        let endTime = 5;
        let actionDetected = false;
        let errorDetails = null;

        // Verificar si debemos aplicar una transición
        if (response.applyTransitionDetection?.detected &&
            response.applyTransitionDetection.confidence > 0.2 &&
            response.applyTransitionDetection.transitionPath) {

          actionDetected = true;
          const transitionPath = response.applyTransitionDetection.transitionPath;

          console.log("Aplicando transición:", transitionPath);

          try {
            // Aplicar la transición de desvanecimiento
            const transitionResult = await applyTransition(transitionPath);

            console.log("Resultado de aplicar transición:", transitionResult);

            actionSuccessful = transitionResult.success;
            operationDetails = transitionResult.details;

            // Detalles de la detección para referenciar
            detectionInfo = {
              detected: response.applyTransitionDetection.detected,
              confidence: response.applyTransitionDetection.confidence,
              reason: response.applyTransitionDetection.reason
            };
          } catch (error) {
            // Capturar errores específicos de la transición
            console.error("Error al aplicar transición:", error);
            actionSuccessful = false;
            operationDetails = `Error al aplicar transición: ${error.message || 'Error desconocido'}`;
            errorDetails = {
              message: error.message || 'Error desconocido',
              stack: error.stack,
              type: error.constructor?.name || 'Error'
            };
          }
        }
        // Verificar si debemos aplicar una captura de pantalla a la timeline
        else if (response.showScreenshotDetection &&
            response.urlAnalysis?.containsURLs &&
            response.urlAnalysis.screenshots &&
            response.urlAnalysis.screenshots.length > 0) {

          // Comprobar si la detección es positiva con confianza suficiente
          if (response.showScreenshotDetection.detected &&
              response.showScreenshotDetection.confidence > 0.2) {

            actionDetected = true;
            // Seleccionar la primera captura disponible
            const firstScreenshot = response.urlAnalysis.screenshots[0];
            screenshotToAdd = firstScreenshot;

            // Guardar información de detección
            detectionInfo = {
              detected: response.showScreenshotDetection.detected,
              confidence: response.showScreenshotDetection.confidence,
              reason: response.showScreenshotDetection.reason
            };

            // Calcular tiempos para la imagen
            // Por defecto, usar la duración del elemento seleccionado
            startTime = 0;
            endTime = 5;

            // Añadir la captura a la timeline utilizando el CommandExecutorService
            const commandExecutor = CommandExecutorService.getExecutor();
            if (commandExecutor) {
              try {
                // Si hay elementos seleccionados, usar sus tiempos
                if (selectedItems && selectedItems.length > 0) {
                  // Obtener el primer elemento seleccionado
                  const firstItem = selectedItems[0];

                  // Intentar obtener los tiempos del elemento
                  if (firstItem.display) {
                    startTime = (firstItem.display.from || 0) / 1000; // convertir de ms a segundos
                    endTime = (firstItem.display.to || (startTime * 1000 + 5000)) / 1000; // convertir de ms a segundos
                  }
                }

                // Añadir la imagen a la timeline
                await commandExecutor.addImage(firstScreenshot.screenshotPath, {
                  startTime,
                  endTime
                });

                // Registrar la captura añadida
                setAddedScreenshots(prev => [...prev, firstScreenshot]);

                // Detalles de la operación
                operationDetails = `Captura aplicada a la timeline desde ${startTime.toFixed(1)}s hasta ${endTime.toFixed(1)}s`;

                console.log(`Imagen añadida a la timeline desde ${startTime}s hasta ${endTime}s: ${firstScreenshot.screenshotPath}`);
              } catch (error) {
                console.error("Error al añadir imagen a la timeline:", error);
                actionSuccessful = false;
                operationDetails = `Error al añadir imagen: ${error instanceof Error ? error.message : String(error)}`;
              }
            } else {
              console.error("CommandExecutor no disponible");
              actionSuccessful = false;
              operationDetails = "CommandExecutor no disponible";
            }
          }
        }

        // Actualizar estado según los resultados
        setActionSuccess(actionSuccessful);

        // Si hubo un error, actualizar con detalles adicionales
        if (!actionSuccessful && errorDetails) {
          setLastActionInfo({
            operationDetails,
            errorDetails,
            confidence: detectionInfo?.confidence || 0,
            reason: detectionInfo?.reason || 'Error en la operación',
            screenshotToAdd
          });
        } else {
          setLastActionInfo({
            operationDetails,
            confidence: detectionInfo?.confidence || 0,
            reason: detectionInfo?.reason || '',
            screenshotToAdd
          });
        }

        setShowActionInfo(actionDetected || screenshotToAdd !== null);

        // Componer el mensaje informativo si tenemos respuesta válida
        let actionMessage;
        if (actionDetected) {
          // Si se detectó una acción específica (como agregar captura o transición)
          actionMessage = actionSuccessful
            ? (screenshotToAdd
               ? `✨ ${operationDetails || 'Captura aplicada correctamente'}`
               : `✨ ${operationDetails || 'Fade out aplicado correctamente'}`)
            : `❌ Error: ${operationDetails || 'No se pudo completar la operación.'}`;
        } else {
          // Si no se detectó ninguna acción específica, mostrar un mensaje predeterminado
          actionMessage = "ℹ️ Esta área es para ejecutar acciones específicas en la timeline. Si deseas conversar, por favor utiliza el chat.";
          setActionSuccess(null); // Neutro, ni éxito ni error
        }

        setLastActionInfo(actionMessage);
        setShowActionInfo(true);

        // Añadir la respuesta del asistente al chat interno (no se muestra)
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response + (actionDetected && actionSuccessful
            ? (screenshotToAdd
              ? `\n\n✅ **Captura de pantalla aplicada a la timeline**\n- URL: ${screenshotToAdd.url}\n- Tiempo: desde ${startTime}s hasta ${endTime}s\n- Confianza: ${Math.round(detectionInfo?.confidence * 100)}%`
              : `\n\n✅ **Fade out aplicado a la timeline**\n- Efecto: Desvanecimiento al final del clip\n- Tiempo: cerca del final en ${endTime.toFixed(1)}s\n- Confianza: ${Math.round(detectionInfo?.confidence * 100)}%`)
            : ''),
          timestamp: new Date(),
          detectionInfo: detectionInfo
        };
        setChatMessages(prevMessages => [...prevMessages, assistantMessage]);

        // Ocultar la información de acción después de 4 segundos
        setTimeout(() => {
          setShowActionInfo(false);
        }, 4000);
      } else {
        // Manejar caso de error en la respuesta
        console.error("Error en la respuesta de la API:", response);
        setActionSuccess(false);
        setLastActionInfo({
          operationDetails: "Error al procesar la solicitud: " + (response.error || "Error desconocido"),
          confidence: 0,
          reason: 'Error en la API'
        });
        setShowActionInfo(true);
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      // Mostrar mensaje de error brevemente
      setActionSuccess(false);
      setLastActionInfo(`❌ Error: ${error instanceof Error ? error.message : 'Error de comunicación con el servicio de IA.'}`);
      setShowActionInfo(true);
      setTimeout(() => {
        setShowActionInfo(false);
      }, 3000);
    } finally {
      setIsSending(false);
    }
  };

  // Función para manejar cambios en el textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
  };

  // Función para manejar el envío del mensaje con Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCommand();
    }
  };

  const handleAddScreenshot = (url: string) => {
    try {
      // Verificar si se trata de un APNG
      const isAPNG = url.toLowerCase().endsWith('.apng');
      if (isAPNG) {
        console.log("Advertencia: Se está intentando añadir un APNG como captura de pantalla");

        // Mostrar advertencia pero continuar con el proceso
        setLastActionInfo({
          operationDetails: "⚠️ Advertencia: El formato APNG puede no comportarse correctamente como captura. Se intentará usar como imagen estática.",
          confidence: 0.5,
          reason: 'Formato potencialmente problemático',
          screenshotToAdd: url
        });
        setActionSuccess(true);
        setShowActionInfo(true);
      }

      // Continuar con la lógica normal
      // Obtener el servicio de comandos
      const commandExecutor = CommandExecutorService.getExecutor();
      if (!commandExecutor) {
        console.error("CommandExecutor no disponible");
        setLastActionInfo({
          operationDetails: "Error: No se pudo obtener el servicio de comandos para añadir la captura",
          confidence: 0,
          reason: 'Error de servicio',
          screenshotToAdd: null
        });
        setActionSuccess(false);
        setShowActionInfo(true);
        return;
      }

      // Calcular tiempo para ubicar la imagen
      let startTime = 0;

      // Si hay elementos seleccionados, usar su tiempo
      if (selectedItems && selectedItems.length > 0) {
        const firstItem = selectedItems[0];
        if (firstItem.display) {
          startTime = (firstItem.display.from || 0) / 1000; // convertir de ms a segundos
        }
      }

      // Añadir la imagen a la timeline
      commandExecutor.addImage(url, {
        startTime,
        endTime: startTime + 5, // 5 segundos de duración por defecto
        position: { x: 0.5, y: 0.5 }, // centrado
        isStatic: isAPNG // Si es APNG, forzar como estático
      });

      // Actualizar la UI con el éxito
      setLastActionInfo({
        operationDetails: `Captura añadida a la línea de tiempo${isAPNG ? ' (como imagen estática)' : ''}`,
        confidence: 1.0,
        reason: 'Acción manual del usuario',
        screenshotToAdd: null
      });

      setActionSuccess(true);
      setShowActionInfo(true);

      // Ocultar después de 3 segundos
      setTimeout(() => {
        setShowActionInfo(false);
      }, 3000);

    } catch (error) {
      console.error("Error al añadir captura:", error);

      // Extraer mensaje de error
      let errorMessage = "Error desconocido";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Actualizar la UI con el error
      setLastActionInfo({
        operationDetails: `Error al añadir captura: ${errorMessage}`,
        confidence: 0,
        reason: 'Error en el proceso',
        errorDetails: {
          message: errorMessage,
          type: error instanceof Error ? error.constructor.name : 'Error',
          stack: error instanceof Error ? error.stack : undefined
        },
        screenshotToAdd: null
      });

      setActionSuccess(false);
      setShowActionInfo(true);
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        background: 'linear-gradient(135deg, rgba(35, 20, 60, 0.95) 0%, rgba(45, 25, 85, 0.95) 100%)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(156, 90, 250, 0.3)',
        padding: '20px',
        width: '380px',
        color: 'white',
        fontFamily: 'Inter, system-ui, sans-serif',
        border: '1px solid rgba(156, 90, 250, 0.6)',
        backdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(156, 90, 250, 0.5); }
            70% { box-shadow: 0 0 0 10px rgba(156, 90, 250, 0); }
            100% { box-shadow: 0 0 0 0 rgba(156, 90, 250, 0); }
          }
          @keyframes glow {
            0% { border-color: rgba(156, 90, 250, 0.6); }
            50% { border-color: rgba(156, 90, 250, 0.9); }
            100% { border-color: rgba(156, 90, 250, 0.6); }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* Estilos para detalles de error */
          .error-details {
            margin-top: 10px;
            padding: 8px;
            background-color: rgba(255, 0, 0, 0.05);
            border-radius: 4px;
            font-size: 13px;
          }

          .error-technical-info {
            margin-top: 8px;
            padding: 8px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            overflow-x: auto;
          }

          .error-actions {
            margin-top: 8px;
            display: flex;
            justify-content: flex-end;
          }

          .log-button {
            background-color: rgba(156, 90, 250, 0.2);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .log-button:hover {
            background-color: rgba(156, 90, 250, 0.4);
          }

          details summary {
            cursor: pointer;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
          }

          details summary:hover {
            color: rgba(255, 255, 255, 0.9);
          }
        `}
      </style>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        borderBottom: '1px solid rgba(156, 90, 250, 0.4)',
        paddingBottom: '12px',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          bottom: '-1px',
          left: '0',
          width: '60%',
          height: '1px',
          background: 'linear-gradient(90deg, rgba(156, 90, 250, 0.8) 0%, rgba(156, 90, 250, 0) 100%)',
          animation: 'glow 1.5s infinite alternate'
        }}></div>

        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: 'rgba(156, 90, 250, 1.0)',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          {selectedItems.length > 1 ? `${selectedItems.length} elementos seleccionados` : 'Elemento seleccionado'}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleClose}
          style={{
              background: 'rgba(156, 90, 250, 0.2)',
            border: 'none',
              borderRadius: '50%',
              color: 'rgba(255, 255, 255, 0.9)',
            cursor: 'pointer',
              fontSize: '16px',
              padding: '5px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            lineHeight: '1',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(156, 90, 250, 0.4)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(156, 90, 250, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ×
        </button>
        </div>
      </div>

      {/* Área de comando/formulario */}
      <div style={{ marginTop: '12px', marginBottom: '16px' }}>
        {showActionInfo && lastActionInfo && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            background: actionSuccess === false
              ? 'linear-gradient(to right, rgba(220, 50, 50, 0.15), rgba(220, 50, 50, 0.05))'
              : actionSuccess === true
                ? 'linear-gradient(to right, rgba(70, 200, 120, 0.15), rgba(70, 200, 120, 0.05))'
                : 'linear-gradient(to right, rgba(156, 90, 250, 0.15), rgba(156, 90, 250, 0.05))',
            borderRadius: '8px',
            fontSize: '14px',
            border: `1px solid ${actionSuccess === false
              ? 'rgba(220, 50, 50, 0.3)'
              : actionSuccess === true
                ? 'rgba(70, 200, 120, 0.3)'
                : 'rgba(156, 90, 250, 0.3)'}`,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            animation: actionSuccess ? 'pulse 2s infinite' : '',
            color: actionSuccess === false
              ? 'rgba(255, 220, 220, 0.9)'
              : actionSuccess === true
                ? 'rgba(220, 255, 230, 0.9)'
                : 'rgba(240, 230, 255, 0.9)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}>
              <div style={{
                flexShrink: 0,
                marginTop: '2px'
              }}>
                {actionSuccess === false
                  ? '❌'
                  : actionSuccess === true
                    ? '✨ Accion ejecutada con exito'
                    : 'ℹ️'}
              </div>
              <div>{lastActionInfo.operationDetails}</div>
            </div>

            {/* Mostrar detalles de error para depuración */}
            {!actionSuccess && lastActionInfo.errorDetails && (
              <div className="error-details">
                <details>
                  <summary>Ver detalles técnicos del error</summary>
                  <div className="error-technical-info">
                    <p><strong>Tipo de error:</strong> {lastActionInfo.errorDetails.type}</p>
                    <p><strong>Mensaje:</strong> {lastActionInfo.errorDetails.message}</p>
                    <p><strong>Recomendación:</strong> Verifique los logs en la consola del navegador para más información o intente usar un formato diferente para la transición (GIF/MP4).</p>
                  </div>
                </details>

                <div className="error-actions">
                                  <button
                    className="log-button"
                    onClick={() => {
                      console.log("Consulte la consola para más información de depuración");
                      alert("Los logs de depuración están disponibles en la consola del navegador (F12 > Console)");
                    }}
                  >
                    Ver logs
                                  </button>
                              </div>
                    </div>
                  )}

            {/* Si había captura de pantalla */}
            {lastActionInfo.screenshotToAdd && (
                  <div style={{
                marginTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '16px',
              }}>
                <img
                  src={lastActionInfo.screenshotToAdd}
                  alt="Captura de pantalla"
                  style={{
                    width: '100%',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                />
                    <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                  <button
                    onClick={() => handleAddScreenshot(lastActionInfo.screenshotToAdd)}
                    style={{
                      flex: '1',
                      background: 'linear-gradient(135deg, rgba(70, 200, 120, 0.7) 0%, rgba(50, 180, 100, 0.8) 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(50, 180, 100, 0.3)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 14px rgba(50, 180, 100, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(50, 180, 100, 0.3)';
                    }}
                  >
                    Añadir a Timeline
                  </button>
                  <button
                    onClick={() => {
                      setShowActionInfo(false);
                      setLastActionInfo(null);
                    }}
                        style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      cursor: 'pointer',
                      padding: '8px 16px',
                      fontSize: '13px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    Cerrar
                  </button>
                    </div>
                  </div>
                )}
              </div>
        )}

      <div style={{
        display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderTop: '1px solid rgba(156, 90, 250, 0.2)',
          paddingTop: '16px',
          position: 'relative'
        }}>
          <textarea
            ref={textareaRef}
            value={chatInput}
            onChange={handleTextareaChange}
            placeholder="Ejemplo: 'aplica captura a la timeline' o 'añade transición'"
            disabled={isSending}
            style={{
              background: 'rgba(20, 10, 35, 0.5)',
              border: '1px solid rgba(156, 90, 250, 0.4)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              padding: '12px',
              resize: 'vertical',
              minHeight: '80px',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(156, 90, 250, 0.7)';
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(156, 90, 250, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(156, 90, 250, 0.4)';
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3)';
            }}
          />
        <button
            onClick={sendCommand}
            disabled={isSending || !chatInput.trim()}
          style={{
              background: isSending || !chatInput.trim()
                ? 'rgba(156, 90, 250, 0.3)'
                : 'linear-gradient(135deg, rgba(156, 90, 250, 0.8) 0%, rgba(120, 60, 220, 0.9) 100%)',
              border: 'none',
              borderRadius: '8px',
            color: 'white',
              cursor: isSending || !chatInput.trim() ? 'not-allowed' : 'pointer',
              padding: '12px 16px',
            fontSize: '14px',
              fontWeight: '500',
            transition: 'all 0.2s ease',
              boxShadow: isSending || !chatInput.trim()
                ? 'none'
                : '0 4px 12px rgba(156, 90, 250, 0.3)',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}
            onMouseOver={(e) => {
              if (!isSending && chatInput.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(156, 90, 250, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!isSending && chatInput.trim()) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(156, 90, 250, 0.3)';
              }
            }}
          >
            {isSending ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span>Procesando...</span>
              </div>
            ) : 'Ejecutar'}
        </button>
        </div>
      </div>
    </div>
  );
};

export default SelectionModal;
