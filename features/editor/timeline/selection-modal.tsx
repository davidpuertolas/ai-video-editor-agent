import React, { useEffect, useState, useRef } from 'react';
import { filter, subject } from "@designcombo/events";
import { TIMELINE_SELECTION_MODAL } from './items/timeline';
import AIService from '../services/ai-service';

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

/**
 * Modal que se muestra cuando se seleccionan elementos por arrastre en la timeline
 * Analiza automáticamente los elementos seleccionados para detectar URLs
 */
const SelectionModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [responseMessage, setResponseMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [urlAnalysis, setUrlAnalysis] = useState<URLAnalysisResult | null>(null);
  const [analyzedText, setAnalyzedText] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

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
        setResponseMessage('');
        setAiResponse(null);
        setUrlAnalysis(null);
        setAnalyzedText('');
        setSelectedScreenshot(null);
        setVisible(true);

        // Analizar automáticamente los elementos seleccionados
        analyzeItems(payload.selectedItems);
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

  // Función para analizar automáticamente los elementos seleccionados
  const analyzeItems = async (items: any[]) => {
    setIsSending(true);
    setAiResponse(null);
    setUrlAnalysis(null);

    try {
      // Llamar al servicio de IA
      const response = await AIService.analyzeItems({
        items: items
      });

      console.log('AI response:', response);

      if (response.success) {
        setAiResponse(response.analysis);
        setResponseMessage(response.analysis.summary);

        // Extraer el análisis de URLs
        if (response.analysis.urlAnalysis) {
          setUrlAnalysis(response.analysis.urlAnalysis);

          // Si hay screenshots disponibles, seleccionar el primero por defecto
          if (response.analysis.urlAnalysis.screenshots &&
              response.analysis.urlAnalysis.screenshots.length > 0) {
            setSelectedScreenshot(response.analysis.urlAnalysis.screenshots[0].screenshotPath);
          }
        }

        // Guardar el texto analizado para mostrar
        if (response.analysis.analyzedText) {
          setAnalyzedText(response.analysis.analyzedText);
        }
      } else {
        setResponseMessage(`Error: ${response.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error al analizar los elementos:', error);
      setResponseMessage('Error al analizar los elementos seleccionados. Inténtalo de nuevo.');
    } finally {
      setIsSending(false);
    }
  };

  // Función para volver a analizar los mismos elementos
  const handleReanalyze = () => {
    analyzeItems(selectedItems);
  };

  // Función para seleccionar una captura de pantalla
  const handleSelectScreenshot = (screenshotPath: string) => {
    setSelectedScreenshot(screenshotPath);
  };

  if (!visible) return null;

  // Determinamos la anchura adecuada del modal basada en si hay una captura de pantalla seleccionada
  const modalWidth = selectedScreenshot ? '600px' : '350px';

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        background: 'rgba(35, 20, 60, 0.95)',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        padding: '16px',
        width: modalWidth,
        color: 'white',
        fontFamily: 'Inter, system-ui, sans-serif',
        border: '1px solid rgba(156, 90, 250, 0.4)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        borderBottom: '1px solid rgba(156, 90, 250, 0.3)',
        paddingBottom: '8px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: 'rgba(156, 90, 250, 1.0)'
        }}>
          {selectedItems.length > 1 ?
            `Análisis de URLs en ${selectedItems.length} elementos` :
            'Análisis de URLs en elemento'}
        </h3>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0',
            lineHeight: '1',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        {isSending ? (
          <div style={{
            padding: '30px 0',
            textAlign: 'center',
            fontSize: '14px',
            opacity: 0.8
          }}>
            <div style={{
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              margin: '0 auto 15px',
              border: '3px solid rgba(156, 90, 250, 0.3)',
              borderTopColor: 'rgba(156, 90, 250, 1)',
              animation: 'spin 1s linear infinite',
            }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            Analizando elementos seleccionados...
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(156, 90, 250, 0.9)'
              }}>
                Resultado del análisis:
              </p>
              {urlAnalysis && (
                <button
                  onClick={handleReanalyze}
                  style={{
                    background: 'rgba(156, 90, 250, 0.2)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Reanalizar
                </button>
              )}
            </div>

            {urlAnalysis ? (
              <div style={{
                display: 'flex',
                gap: '15px',
                width: '100%'
              }}>
                {/* Panel de análisis */}
                <div style={{
                  flex: selectedScreenshot ? '1' : '1',
                  padding: '12px',
                  background: 'rgba(156, 90, 250, 0.15)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  marginBottom: '12px',
                  border: '1px solid rgba(156, 90, 250, 0.3)',
                  lineHeight: '1.4'
                }}>
                  <div style={{
                    padding: '6px 8px',
                    background: urlAnalysis.containsURLs
                      ? 'rgba(121, 189, 143, 0.25)'
                      : 'rgba(189, 121, 121, 0.25)',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: urlAnalysis.containsURLs ? '#79BD8F' : '#BD7979',
                      marginRight: '8px'
                    }}></div>
                    <span style={{ fontWeight: 600 }}>
                      {urlAnalysis.containsURLs
                        ? 'Se encontraron URLs en el contenido'
                        : 'No se encontraron URLs en el contenido'}
                    </span>
                  </div>

                  <p>{responseMessage}</p>

                  {analyzedText && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Texto analizado:</p>
                      <div style={{
                        background: 'rgba(35, 20, 60, 0.5)',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        maxHeight: '80px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {analyzedText.length > 300
                          ? analyzedText.substring(0, 300) + '...'
                          : analyzedText}
                      </div>
                    </div>
                  )}

                  {urlAnalysis.containsURLs && urlAnalysis.urls.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>URLs encontradas:</p>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {urlAnalysis.urls.map((url, index) => {
                          // Buscar el screenshot correspondiente a esta URL
                          const screenshot = urlAnalysis.screenshots?.find(s => s.url === url);

                          return (
                            <li key={index} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{url}</span>
                                {screenshot && (
                                  <button
                                    onClick={() => handleSelectScreenshot(screenshot.screenshotPath)}
                                    style={{
                                      background: 'rgba(156, 90, 250, 0.2)',
                                      border: 'none',
                                      borderRadius: '4px',
                                      color: 'white',
                                      padding: '2px 6px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Ver
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {aiResponse && aiResponse.recommendations && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Recomendaciones:</p>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {aiResponse.recommendations.map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Panel de vista previa de la captura de pantalla */}
                {selectedScreenshot && (
                  <div style={{
                    flex: '1.5',
                    padding: '12px',
                    background: 'rgba(156, 90, 250, 0.15)',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    border: '1px solid rgba(156, 90, 250, 0.3)',
                  }}>
                    <p style={{
                      margin: '0 0 10px 0',
                      fontWeight: 600,
                      fontSize: '14px',
                      textAlign: 'center'
                    }}>
                      Vista previa de la página web
                    </p>
                    <div style={{
                      width: '100%',
                      height: '280px',
                      overflow: 'hidden',
                      borderRadius: '4px',
                      border: '1px solid rgba(156, 90, 250, 0.5)',
                    }}>
                      <img
                        src={selectedScreenshot}
                        alt="Vista previa de la página web"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'top center'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                padding: '16px',
                background: 'rgba(156, 90, 250, 0.15)',
                borderRadius: '4px',
                textAlign: 'center',
              }}>
                No se pudo analizar el contenido. Inténtalo de nuevo.
              </div>
            )}
          </>
        )}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        borderTop: '1px solid rgba(156, 90, 250, 0.3)',
        paddingTop: '12px'
      }}>
        <button
          onClick={handleClose}
          style={{
            background: 'rgba(156, 90, 250, 0.1)',
            border: '1px solid rgba(156, 90, 250, 0.3)',
            borderRadius: '4px',
            color: 'white',
            padding: '8px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

// Componente de botón de acción para mantener un estilo consistente
const ActionButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
}> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      background: 'rgba(156, 90, 250, 0.2)',
      border: 'none',
      borderRadius: '4px',
      color: 'white',
      padding: '8px 12px',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: '14px',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(156, 90, 250, 0.4)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(156, 90, 250, 0.2)';
    }}
  >
    {children}
  </button>
);

export default SelectionModal;
