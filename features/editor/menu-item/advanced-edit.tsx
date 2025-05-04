import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Scissors, SquareSplitHorizontal, Loader2, CheckCircle2, Trash, ChevronRight, ChevronLeft, Repeat, FileSymlink, Plus } from "lucide-react";
import { dispatch } from "@designcombo/events";
import { ACTIVE_SPLIT, LAYER_SELECT, LAYER_DELETE, EDIT_OBJECT, TIMELINE_SCALE_CHANGED } from "@designcombo/state";
import useStore from "../store/use-store";
import { formatTimeToHumanReadable } from "../utils/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tipo para nuestros segmentos
type TimeSegment = {
  id: string;
  startTime: number;
  endTime: number;
};

export const AdvancedEdit = () => {
  const { activeIds, trackItemsMap } = useStore();
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [removeMiddleSegment, setRemoveMiddleSegment] = useState<boolean>(false);
  const { scale } = useStore();

  // Estado para múltiples segmentos de tiempo
  const [segments, setSegments] = useState<TimeSegment[]>([
    { id: "segment-1", startTime: 0, endTime: 0 }
  ]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);

  // Estado para el recorte (trim)
  const [trimStartTime, setTrimStartTime] = useState<number>(0);
  const [trimEndTime, setTrimEndTime] = useState<number>(0);
  const [isTrimming, setIsTrimming] = useState<boolean>(false);

  // Verificar si el elemento seleccionado es de tipo compatible (video, audio, texto o imagen)
  const isCompatibleType = () => {
    if (!activeIds.length) return false;

    const activeItemId = activeIds[0];
    const activeItem = trackItemsMap[activeItemId];

    // Ampliamos los tipos compatibles para incluir texto e imagen
    return activeItem && (
      activeItem.type === 'video' ||
      activeItem.type === 'audio' ||
      activeItem.type === 'text' ||
      activeItem.type === 'image'
    );
  };

  // Función para convertir tiempo de formato "mm:ss" a milisegundos
  const timeToMs = (timeStr: string): number => {
    if (!timeStr) return 0;

    // Soporte para formatos: ss, mm:ss, hh:mm:ss
    const parts = timeStr.split(':').map(Number);
    let ms = 0;

    if (parts.length === 1) {
      // Solo segundos
      ms = parts[0] * 1000;
    } else if (parts.length === 2) {
      // Minutos y segundos
      ms = parts[0] * 60 * 1000 + parts[1] * 1000;
    } else if (parts.length === 3) {
      // Horas, minutos y segundos
      ms = parts[0] * 3600 * 1000 + parts[1] * 60 * 1000 + parts[2] * 1000;
    }

    return ms;
  };

  // Funciones para manejar múltiples segmentos
  const addNewSegment = () => {
    // Generar un ID único para el nuevo segmento
    const newSegmentId = `segment-${segments.length + 1}`;

    // Añadir nuevo segmento con tiempos iniciales en 0
    const newSegment: TimeSegment = {
      id: newSegmentId,
      startTime: 0,
      endTime: 0
    };

    setSegments([...segments, newSegment]);

    // Cambiar al nuevo segmento
    setCurrentSegmentIndex(segments.length);
  };

  const removeSegment = (indexToRemove: number) => {
    if (segments.length <= 1) {
      // Siempre debe haber al menos un segmento
      return;
    }

    const newSegments = segments.filter((_, index) => index !== indexToRemove);
    setSegments(newSegments);

    // Ajustar el índice actual si es necesario
    if (currentSegmentIndex >= newSegments.length) {
      setCurrentSegmentIndex(newSegments.length - 1);
    } else if (currentSegmentIndex === indexToRemove) {
      setCurrentSegmentIndex(Math.max(0, currentSegmentIndex - 1));
    }
  };

  // Función para actualizar el tiempo de inicio de un segmento específico
  const updateSegmentStartTime = (index: number, newStartTime: number) => {
    const updatedSegments = [...segments];
    updatedSegments[index] = {
      ...updatedSegments[index],
      startTime: newStartTime
    };
    setSegments(updatedSegments);
  };

  // Función para actualizar el tiempo final de un segmento específico
  const updateSegmentEndTime = (index: number, newEndTime: number) => {
    const updatedSegments = [...segments];
    updatedSegments[index] = {
      ...updatedSegments[index],
      endTime: newEndTime
    };
    setSegments(updatedSegments);
  };

  // Función para aplicar un solo corte
  const applySplit = (time: number, targetId?: string) => {
    // Si se proporciona un ID específico, primero lo seleccionamos
    if (targetId) {
      dispatch(LAYER_SELECT, {
        payload: {
          ids: [targetId]
        }
      });
    }

    // Aplicamos el corte
    dispatch(ACTIVE_SPLIT, {
      payload: {},
      options: {
        time: time,
      },
    });
  };

  // Función para seleccionar y eliminar un elemento
  const deleteSelectedItem = (itemId?: string) => {
    if (itemId) {
      // Si se proporciona un ID específico, primero lo seleccionamos
      dispatch(LAYER_SELECT, {
        payload: {
          ids: [itemId]
        }
      });
    }
    // Eliminamos el elemento seleccionado
    dispatch(LAYER_DELETE);
  };

  // Función para modificar la duración de un elemento
  const modifyItemDuration = (itemId: string, newEndTime: number) => {
    // Verificamos que newEndTime sea un número válido
    if (isNaN(newEndTime) || !isFinite(newEndTime)) {
      console.error("Error: Intentando establecer un tiempo final no válido:", newEndTime);
      toast({
        title: "Error en el proceso",
        description: "No se pudo modificar la duración del elemento (valor de tiempo no válido).",
        variant: "destructive"
      });
      return;
    }

    // Obtenemos el estado actual antes de la modificación
    const beforeState = useStore.getState();
    const itemBefore = beforeState.trackItemsMap[itemId];

    if (!itemBefore || !itemBefore.display || isNaN(itemBefore.display.from)) {
      console.error("Error: El elemento no tiene propiedades de duración válidas:", itemBefore);
      toast({
        title: "Error en el proceso",
        description: "El elemento no tiene propiedades de duración válidas.",
        variant: "destructive"
      });
      return;
    }

    const originalFrom = itemBefore.display.from;

    console.log(`Modificando duración del elemento ${itemId} de ${originalFrom}ms hasta ${newEndTime}ms`);
    console.log("Estado del elemento antes de la modificación:", {
      id: itemId,
      from: originalFrom,
      to: itemBefore.display.to
    });

    // Dispatch de la acción para modificar el elemento, preservando la propiedad 'from'
    dispatch(EDIT_OBJECT, {
      payload: {
        [itemId]: {
          display: {
            from: originalFrom, // Preservamos explícitamente el 'from' original
            to: newEndTime
          }
        }
      }
    });

    // Verificamos después de un breve tiempo que el cambio se haya aplicado
    setTimeout(() => {
      const afterState = useStore.getState();
      const itemAfter = afterState.trackItemsMap[itemId];

      console.log("Estado del elemento después de la modificación:", {
        id: itemId,
        from: itemAfter?.display?.from,
        to: itemAfter?.display?.to
      });

      if (itemAfter) {
        if (Math.abs(itemAfter.display.to - newEndTime) > 10) {
          console.error("ADVERTENCIA: La duración no parece haberse actualizado correctamente!");
          console.log("Diferencia en 'to':", itemAfter.display.to - newEndTime);
        }

        if (Math.abs(itemAfter.display.from - originalFrom) > 10) {
          console.error("ADVERTENCIA: El tiempo inicial ha cambiado inesperadamente!");
          console.log("Diferencia en 'from':", itemAfter.display.from - originalFrom);
        }

        if (Math.abs(itemAfter.display.to - newEndTime) <= 10 &&
            Math.abs(itemAfter.display.from - originalFrom) <= 10) {
          console.log("Modificación aplicada correctamente");
        }
      } else {
        console.error("ERROR: No se encontró el elemento después de la modificación");
      }

      // Verificar todos los elementos después de la modificación
      const allItemsAfter = Object.entries(afterState.trackItemsMap)
        .filter(([_, item]) =>
          item.trackId === itemBefore.trackId)
        .map(([id, item]) => ({
          id,
          from: item.display.from,
          to: item.display.to
        }));

      console.log("Todos los elementos después de la modificación:", allItemsAfter);
    }, 100);
  };

  // Función para mostrar notificación de éxito personalizada
  const showSuccessNotification = (message: string = "Cortes aplicados correctamente") => {
    // En lugar de usar toast, creamos un elemento visual temporal en la UI
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed bottom-4 right-4 bg-green-800/90 text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-2 z-50';

    let segmentDetails = '';
    if (segments.length > 1) {
      segmentDetails = `${segments.length} segmentos procesados`;
    } else {
      segmentDetails = `En ${formatTimeToHumanReadable(segments[0]?.startTime || 0)} - ${formatTimeToHumanReadable(segments[0]?.endTime || 0)}`;
    }

    successDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-300">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <div>
        <h4 class="font-medium text-sm">${message}</h4>
        <p class="text-xs text-green-200">${segmentDetails}</p>
      </div>
    `;

    document.body.appendChild(successDiv);

    // Eliminar después de 3 segundos
    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        document.body.removeChild(successDiv);
      }
    }, 3000);
  };

  // Función para modificar el tiempo de inicio de un elemento
  const modifyItemStartTime = (itemId: string, newStartTime: number) => {
    if (isNaN(newStartTime) || !isFinite(newStartTime)) {
      console.error("Error: Intentando establecer un tiempo de inicio no válido:", newStartTime);
      toast({
        title: "Error en el proceso",
        description: "No se pudo modificar el tiempo de inicio (valor no válido).",
        variant: "destructive"
      });
      return;
    }

    const beforeState = useStore.getState();
    const itemBefore = beforeState.trackItemsMap[itemId];

    if (!itemBefore || !itemBefore.display || isNaN(itemBefore.display.to)) {
      console.error("Error: El elemento no tiene propiedades de duración válidas:", itemBefore);
      toast({
        title: "Error en el proceso",
        description: "El elemento no tiene propiedades de duración válidas.",
        variant: "destructive"
      });
      return;
    }

    const originalTo = itemBefore.display.to;

    // Dispatch de la acción para modificar el elemento
    dispatch(EDIT_OBJECT, {
      payload: {
        [itemId]: {
          display: {
            from: newStartTime,
            to: originalTo
          }
        }
      }
    });
  };

  // Función simplificada para eliminar el segmento entre dos tiempos
  const removeSegmentBetweenTimes = async () => {
    if (!activeIds.length || isProcessing) return;

    // Verificamos que sea un elemento compatible
    if (!isCompatibleType()) {
      toast({
        title: "Elemento no compatible",
        description: "El elemento seleccionado no admite esta operación.",
        variant: "destructive"
      });
      return;
    }

    // Validamos que todos los segmentos tengan tiempos válidos
    const invalidSegments = segments.filter(segment =>
      isNaN(segment.startTime) || isNaN(segment.endTime) ||
      !isFinite(segment.startTime) || !isFinite(segment.endTime) ||
      segment.startTime >= segment.endTime
    );

    if (invalidSegments.length > 0) {
      toast({
        title: "Tiempos inválidos",
        description: "Uno o más segmentos tienen tiempos no válidos o el tiempo inicial es mayor que el final.",
        variant: "destructive"
      });
      return;
    }

    // Ordenamos los segmentos por tiempo de inicio para procesarlos en orden
    const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);

    // Verificamos que no haya solapamiento entre segmentos
    for (let i = 0; i < sortedSegments.length - 1; i++) {
      if (sortedSegments[i].endTime > sortedSegments[i + 1].startTime) {
        toast({
          title: "Segmentos solapados",
          description: "Los segmentos no pueden solaparse. Por favor, ajusta los tiempos.",
          variant: "destructive"
        });
        return;
      }
    }

    // Guardamos el ID del elemento original antes de cualquier operación
    const originalItemId = activeIds[0];
    const trackType = trackItemsMap[originalItemId].type;
    const trackId = trackItemsMap[originalItemId].trackId;

    // Verificamos que el elemento original tenga propiedades de duración válidas
    const originalItem = trackItemsMap[originalItemId];
    if (!originalItem ||
        !originalItem.display ||
        isNaN(originalItem.display.from) ||
        isNaN(originalItem.display.to)) {
      toast({
        title: "Elemento no válido",
        description: "El elemento seleccionado no tiene propiedades de duración válidas.",
        variant: "destructive"
      });
      return;
    }

    // Verificar que todos los tiempos estén dentro del rango del clip
    const outOfRangeSegments = sortedSegments.filter(segment =>
      segment.startTime < originalItem.display.from ||
      segment.endTime > originalItem.display.to
    );

    if (outOfRangeSegments.length > 0) {
      toast({
        title: "Tiempos fuera de rango",
        description: "Uno o más segmentos tienen tiempos fuera del rango del clip seleccionado.",
        variant: "destructive"
      });
      return;
    }

    // Indicamos que estamos procesando
    setIsProcessing(true);

    // Procesar cada segmento en orden (de final a principio para evitar afectar posiciones)
    for (let i = sortedSegments.length - 1; i >= 0; i--) {
      const currentSegment = sortedSegments[i];

      // Establecemos los tiempos actuales para esta iteración
      setStartTime(currentSegment.startTime);
      setEndTime(currentSegment.endTime);

      try {
        // Aplicar el mismo proceso para cada segmento
        await procesarSegmento(currentSegment.startTime, currentSegment.endTime, originalItemId, trackType, trackId, originalItem);
      } catch (error) {
        console.error(`Error al procesar el segmento ${i+1}:`, error);
        toast({
          title: "Error en el proceso",
          description: `Ocurrió un error al procesar el segmento ${i+1}.`,
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      // Pausa entre cada segmento para evitar conflictos
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Finalizamos el procesamiento
    finalizarEliminacion("multiple");
  };

  // Función para procesar un segmento individual
  const procesarSegmento = (segmentStart: number, segmentEnd: number, originalItemId: string, trackType: string, trackId: string, originalItem: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Iniciando operación: Eliminación de segmento (inicio=${segmentStart}ms, fin=${segmentEnd}ms)`);

        // PASO 1: Hacer un corte en el tiempo final
        applySplit(segmentEnd);
        console.log(`Paso 1: Corte aplicado en tiempo final ${segmentEnd}ms`);

        // Esperamos a que se procese el primer corte
        setTimeout(() => {
          try {
            // Obtenemos el estado después del primer corte
            const stateAfterFirstCut = useStore.getState();
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

            // PASO 2: Identificar el elemento izquierdo que contiene el tiempo inicial
            const leftElement = elementsAfterFirstCut.find(elem =>
              elem.from <= segmentStart && elem.to >= segmentStart
            );

            if (leftElement) {
              // PASO 3: Seleccionar el elemento izquierdo y hacer corte en tiempo inicial
              dispatch(LAYER_SELECT, {
                payload: {
                  ids: [leftElement.id]
                }
              });

              setTimeout(() => {
                applySplit(segmentStart);
                console.log(`Paso 3: Segundo corte aplicado en tiempo inicial ${segmentStart}ms`);

                setTimeout(() => {
                  try {
                    // Obtenemos el estado después del segundo corte
                    const stateAfterSecondCut = useStore.getState();
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

                    // PASO 4: Identificar el elemento del medio
                    const middleElements = elementsAfterSecondCut.filter(elem =>
                      Math.abs(elem.from - segmentStart) < 10 && Math.abs(elem.to - segmentEnd) < 10
                    );

                    if (middleElements.length > 0) {
                      const middleElement = middleElements[0];

                      try {
                        // PASO 5: Seleccionar y eliminar el elemento del medio
                        dispatch(LAYER_SELECT, {
                          payload: {
                            ids: [middleElement.id]
                          }
                        });

                        setTimeout(() => {
                          try {
                            const currentState = useStore.getState();

                            if (currentState.activeIds.includes(middleElement.id)) {
                              dispatch(LAYER_DELETE);
                              console.log(`Elemento eliminado correctamente: ${middleElement.id}`);
                              resolve();
                            } else {
                              // Enfoque alternativo: ocultar el segmento
                              dispatch(EDIT_OBJECT, {
                                payload: {
                                  [middleElement.id]: {
                                    display: {
                                      from: -99999,
                                      to: -99990
                                    },
                                    visible: false
                                  }
                                }
                              });
                              resolve();
                            }
                          } catch (error) {
                            console.error("Error en la eliminación:", error);
                            reject(error);
                          }
                        }, 300);
                      } catch (error) {
                        console.error("Error al seleccionar elemento:", error);
                        reject(error);
                      }
                    } else {
                      console.error("No se pudo identificar el elemento del medio");
                      reject(new Error("No se pudo identificar el elemento del medio"));
                    }
                  } catch (error) {
                    console.error("Error después del segundo corte:", error);
                    reject(error);
                  }
                }, 500);
              }, 200);
            } else {
              console.error("No se pudo identificar el elemento izquierdo");
              reject(new Error("No se pudo identificar el elemento izquierdo"));
            }
          } catch (error) {
            console.error("Error después del primer corte:", error);
            reject(error);
          }
        }, 500);
      } catch (error) {
        console.error("Error al aplicar el primer corte:", error);
        reject(error);
      }
    });
  };

  // Función auxiliar para finalizar el proceso
  function finalizarEliminacion(eliminatedElementId) {
    console.log("scale antes de incrementar", scale);
    scale.unit += 1;

    console.log("scale despues de incrementar", scale);

    dispatch(TIMELINE_SCALE_CHANGED, {
      payload: {
        scale,
      },
    });

    // Mostrar notificación de éxito
    if (segments.length > 1) {
      showSuccessNotification(`${segments.length} segmentos eliminados correctamente`);
    } else {
      showSuccessNotification("Segmento eliminado correctamente");
    }

    setIsProcessing(false);
  }

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const timeMs = timeToMs(e.target.value);
    updateSegmentStartTime(index, timeMs);
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const timeMs = timeToMs(e.target.value);
    updateSegmentEndTime(index, timeMs);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Eliminar segmento</CardTitle>
            <CardDescription>
              Elimina uno o más segmentos del elemento seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Segmentos a eliminar</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addNewSegment}
                      disabled={isProcessing}
                      className="h-7 px-2"
                    >
                      <Plus size={14} className="mr-1" /> Añadir segmento
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  Selecciona un elemento y especifica los segmentos que deseas eliminar
                </p>

                {/* Navegación entre segmentos */}
                {segments.length > 1 && (
                  <div className="flex items-center justify-between mb-3 border border-border/40 rounded-md p-2 bg-background/50">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentSegmentIndex(Math.max(0, currentSegmentIndex - 1))}
                        disabled={currentSegmentIndex === 0 || isProcessing}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronLeft size={14} />
                      </Button>
                      <div className="text-xs">
                        Segmento {currentSegmentIndex + 1} de {segments.length}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentSegmentIndex(Math.min(segments.length - 1, currentSegmentIndex + 1))}
                        disabled={currentSegmentIndex === segments.length - 1 || isProcessing}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSegment(currentSegmentIndex)}
                      disabled={segments.length <= 1 || isProcessing}
                      className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash size={14} className="mr-1" /> Eliminar
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="space-y-1">
                    <Label htmlFor="start-time" className="text-xs">Tiempo Inicial (mm:ss)</Label>
                    <Input
                      id="start-time"
                      placeholder="00:00"
                      onChange={(e) => handleStartTimeChange(e, currentSegmentIndex)}
                      disabled={!activeIds.length || isProcessing}
                      value={formatTimeToHumanReadable(segments[currentSegmentIndex]?.startTime || 0).substring(0, 5)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-time" className="text-xs">Tiempo Final (mm:ss)</Label>
                    <Input
                      id="end-time"
                      placeholder="00:00"
                      onChange={(e) => handleEndTimeChange(e, currentSegmentIndex)}
                      disabled={!activeIds.length || isProcessing}
                      value={formatTimeToHumanReadable(segments[currentSegmentIndex]?.endTime || 0).substring(0, 5)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {segments.length > 1 ? (
                      <>Se eliminarán {segments.length} segmentos</>
                    ) : (
                      <>{formatTimeToHumanReadable(segments[0]?.startTime || 0)} - {formatTimeToHumanReadable(segments[0]?.endTime || 0)}</>
                    )}
                  </div>
                  <Button
                    onClick={removeSegmentBetweenTimes}
                    disabled={!activeIds.length || isProcessing || !segments.some(s => s.startTime < s.endTime)}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Procesando...
                      </>
                    ) : (
                      <>
                        <Scissors size={14} /> {segments.length > 1 ? 'Eliminar segmentos' : 'Eliminar segmento'}
                      </>
                    )}
                  </Button>
                </div>

                {/* Lista resumen de segmentos si hay más de uno */}
                {segments.length > 1 && !isProcessing && (
                  <div className="mt-3 pt-2 border-t border-border/40">
                    <h4 className="text-xs font-medium mb-2">Resumen de segmentos</h4>
                    <div className="max-h-20 overflow-y-auto text-xs space-y-1">
                      {segments.map((segment, index) => (
                        <div
                          key={segment.id}
                          className={`flex justify-between p-1 rounded cursor-pointer hover:bg-accent/50 ${index === currentSegmentIndex ? 'bg-accent' : ''}`}
                          onClick={() => setCurrentSegmentIndex(index)}
                        >
                          <span>Segmento {index + 1}</span>
                          <span className="font-mono">
                            {formatTimeToHumanReadable(segment.startTime)} - {formatTimeToHumanReadable(segment.endTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {activeIds.length > 0 && (
              <div className="mt-4 pt-2 border-t border-border/40">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Elemento:</span>
                    <span className={isCompatibleType() ? "text-green-400" : "text-yellow-400"}>
                      {activeIds.length > 0 && trackItemsMap[activeIds[0]]?.type
                        ? trackItemsMap[activeIds[0]].type.charAt(0).toUpperCase() + trackItemsMap[activeIds[0]].type.slice(1)
                        : "Desconocido"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ID:</span>
                    <span className="font-mono">{activeIds[0]?.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compatible:</span>
                    <span className={isCompatibleType() ? "text-green-400" : "text-yellow-400"}>
                      {isCompatibleType() ? "Sí" : "No"}
                    </span>
                  </div>
                  {activeIds.length > 0 && trackItemsMap[activeIds[0]]?.display && (
                    <>
                      <div className="flex justify-between">
                        <span>Duración actual:</span>
                        <span>
                          {formatTimeToHumanReadable(trackItemsMap[activeIds[0]].display.from)} - {formatTimeToHumanReadable(trackItemsMap[activeIds[0]].display.to)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {!activeIds.length && (
              <div className="mt-4 pt-2 border-t border-border/40">
                <p className="text-xs text-yellow-400">
                  No hay ningún elemento seleccionado. Por favor, selecciona un elemento para editar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
