"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scissors, CheckCircle, Edit, Loader2, Play, Video, Trash, AlertCircle, ArrowRightLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast, ToastProvider } from "@/components/ui/use-toast";
import { useStateManager } from "@/features/editor/hooks/state-manager";
import { formatTimeToHumanReadable } from "@/features/editor/utils/format";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT, LAYER_SELECT } from "@designcombo/state";
import { TIMELINE_SCALE_CHANGED } from "@designcombo/state";

interface TrimSegment {
  startTime: number;
  endTime: number;
  text: string;
}

interface SmartTrimResult {
  keepSegments: TrimSegment[];
  removeSegments: TrimSegment[];
  reasoning: string;
}

// Componente principal que proporciona el contexto de Toast
export default function SmartTrim() {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [trimResult, setTrimResult] = useState<SmartTrimResult | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<TrimSegment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [compacting, setCompacting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [autoCompact, setAutoCompact] = useState<boolean>(true); // Por defecto activado
  const [removedSegments, setRemovedSegments] = useState<{start: number, end: number, trackId: string}[]>([]);
  const removedSegmentsRef = useRef<{start: number, end: number, trackId: string}[]>([]);

  // Usamos la función toast directamente
  const toast = (props: any) => {
    console.log('Toast notification:', props);
    // Implementación simple de toast como fallback
    const { title, description, variant = 'default' } = props;

    // Crear un elemento para mostrar la notificación
    const toastElem = document.createElement('div');
    toastElem.className = `fixed bottom-4 right-4 p-4 rounded-md shadow-lg z-50 ${
      variant === 'destructive' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
    }`;

    toastElem.innerHTML = `
      <div class="flex flex-col gap-1">
        <h3 class="font-medium">${title}</h3>
        ${description ? `<p class="text-sm opacity-90">${description}</p>` : ''}
      </div>
    `;

    document.body.appendChild(toastElem);

    // Eliminar después de 3 segundos
    setTimeout(() => {
      if (document.body.contains(toastElem)) {
        document.body.removeChild(toastElem);
      }
    }, 3000);
  };

  // Analizar la transcripción del video
  const analyzeTranscription = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/smart-trim');

      if (!response.ok) {
        throw new Error(`Error al analizar: ${response.status}`);
      }

      const data = await response.json();
      setTrimResult(data);

      // Por defecto, seleccionamos todos los segmentos a eliminar
      setSelectedSegments(data.removeSegments);

      toast({
        title: "Análisis completado",
        description: `Se encontraron ${data.removeSegments.length} segmentos para eliminar.`,
      });
    } catch (error) {
      console.error("Error al analizar la transcripción:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo analizar la transcripción del video.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Formatear tiempo en segundos a un formato legible
  const formatTime = (seconds: number) => {
    return formatTimeToHumanReadable(seconds * 1000);
  };

  // Alternar la selección de un segmento
  const toggleSegment = (segment: TrimSegment) => {
    if (selectedSegments.some(s => s.startTime === segment.startTime && s.endTime === segment.endTime)) {
      setSelectedSegments(selectedSegments.filter(s =>
        !(s.startTime === segment.startTime && s.endTime === segment.endTime)
      ));
    } else {
      setSelectedSegments([...selectedSegments, segment]);
    }
  };

  // Compactar la línea de tiempo eliminando espacios - Versión mejorada
  const compactTimeline = async () => {
    setCompacting(true);
    console.log("=== INICIANDO COMPACTACIÓN DE LÍNEA DE TIEMPO ===");

    try {
      // Añadir un tiempo de espera inicial para asegurar que el estado está completamente actualizado
      console.log("Esperando 1 segundo para asegurar consistencia del estado...");
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Exploramos el estado para entender mejor la estructura
      const explorarEstado = async () => {
        try {
          // Obtener el commandExecutor
          const { current: commandExecutor } = await import("@/components/ai-chat/ai-video-commands").then(
            module => {
              return { current: module.createVideoCommandExecutor(stateManager) };
            }
          );

          // 1. Obtener elementos activos
          console.log("Obteniendo elementos activos...");
          const elementosActivos = await commandExecutor.getActiveElements();
          console.log("Elementos activos:", elementosActivos);

          // 2. Obtener todos los elementos del timeline
          console.log("Obteniendo todos los elementos del timeline...");
          const todosElementos = await commandExecutor.getAllTimelineElements();
          console.log("Todos los elementos:", todosElementos);

          // Logging detallado de elementos encontrados
          todosElementos.forEach((elem, index) => {
            console.log(`Elemento ${index + 1}: ID=${elem.id}, Tipo=${elem.type}, Track=${elem.trackId}, Tiempo=${elem.from}ms-${elem.to}ms (duración=${elem.to-elem.from}ms)`);
          });

          // 3. Explorar directamente el estado
          const estado = stateManager.getState();
          console.log("Estado completo:", estado);
          console.log("Claves del estado:", Object.keys(estado));

          if (estado.tracks) {
            console.log("Tracks encontrados:", estado.tracks);
            if (Array.isArray(estado.tracks)) {
              console.log(`Hay ${estado.tracks.length} tracks disponibles`);

              // Explorar cada track
              estado.tracks.forEach((track, index) => {
                console.log(`Track ${index}:`, track);
                if (track.id) {
                  console.log(`ID del track ${index}: ${track.id}`);

                  // Buscar elementos que pertenecen a este track
                  if (estado.trackItemsMap) {
                    const elementosEnTrack = Object.entries(estado.trackItemsMap)
                      .filter(([_, item]) => item.trackId === track.id)
                      .map(([id, item]) => ({
                        id,
                        from: item.display?.from,
                        to: item.display?.to,
                        type: item.type
                      }));

                    console.log(`Elementos en track ${track.id}:`, elementosEnTrack);
                  }
                }
              });
            }
          }

          if (estado.trackItemsMap) {
            const trackItemsKeys = Object.keys(estado.trackItemsMap);
            console.log(`trackItemsMap tiene ${trackItemsKeys.length} elementos`);

            if (trackItemsKeys.length > 0) {
              // Mostrar ejemplo de un elemento
              const sampleItem = estado.trackItemsMap[trackItemsKeys[0]];
              console.log("Ejemplo de elemento:", sampleItem);
              console.log("Propiedades del elemento:", Object.keys(sampleItem));
            }
          }

          return {
            tieneElementos: todosElementos.length > 0,
            elementosTimeline: todosElementos,
            estructura: {
              tieneTrackItemsMap: !!estado.trackItemsMap,
              tieneTracks: !!estado.tracks,
              clavesPrincipales: Object.keys(estado)
            }
          };
        } catch (error) {
          console.error("Error explorando el estado:", error);
          return {
            tieneElementos: false,
            elementosTimeline: [],
            estructura: {}
          };
        }
      };

      // Exploramos el estado primero
      const infoEstado = await explorarEstado();
      console.log("Información del estado:", infoEstado);

      // Verificamos si tenemos segmentos eliminados
      if (removedSegmentsRef.current.length === 0) {
        console.log("No hay segmentos eliminados para compactar");
        toast({
          title: "Información",
          description: "No hay segmentos para compactar",
        });
        setCompacting(false);
        return;
      }

      console.log("Segmentos eliminados:", removedSegmentsRef.current);

      // Verificar la integridad de los segmentos eliminados
      let segmentosValidos = removedSegmentsRef.current.filter(segmento =>
        segmento &&
        typeof segmento.start === 'number' &&
        typeof segmento.end === 'number' &&
        segmento.start < segmento.end
      );

      if (segmentosValidos.length === 0) {
        console.log("No se encontraron segmentos válidos para compactar");
        toast({
          title: "Información",
          description: "No hay segmentos válidos para compactar",
        });
        setCompacting(false);
        return;
      }

      if (segmentosValidos.length !== removedSegmentsRef.current.length) {
        console.log(`Se encontraron ${removedSegmentsRef.current.length - segmentosValidos.length} segmentos inválidos que serán ignorados`);
      }

      // Si no hay elementos, no podemos compactar
      if (!infoEstado.tieneElementos) {
        console.log("No se encontraron elementos en el timeline para compactar");
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se encontraron elementos para compactar",
        });
        setCompacting(false);
        return;
      }

      // Ordenamos los segmentos eliminados
      const segmentosOrdenados = [...segmentosValidos]
        .sort((a, b) => a.start - b.start);

      console.log("Segmentos ordenados:", segmentosOrdenados);

      // Calculamos el espacio total a compactar
      let espacioTotal = 0;
      segmentosOrdenados.forEach(segmento => {
        const tamanoSegmento = segmento.end - segmento.start;
        espacioTotal += tamanoSegmento;
        console.log(`Segmento ${segmento.start}ms-${segmento.end}ms: tamaño=${tamanoSegmento}ms`);
      });

      console.log(`Espacio total a compactar: ${espacioTotal}ms (${espacioTotal/1000}s)`);

      // Preparamos las actualizaciones basándonos en los elementos encontrados
      const actualizaciones = {};
      let elementosAMover = 0;

      // Para cada elemento, calculamos el desplazamiento
      infoEstado.elementosTimeline.forEach(elemento => {
        // Si el elemento está después de algún segmento eliminado, debe moverse
        let desplazamiento = 0;

        for (const segmento of segmentosOrdenados) {
          if (elemento.from > segmento.start) {
            const espacioSegmento = segmento.end - segmento.start;
            desplazamiento += espacioSegmento;
            console.log(`Elemento ${elemento.id.substring(0,8)}... debe moverse ${espacioSegmento}ms por segmento ${segmento.start}-${segmento.end}`);
          }
        }

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

      console.log(`Elementos a mover: ${elementosAMover} de ${infoEstado.elementosTimeline.length} total`);

      // Aplicamos las actualizaciones
      if (elementosAMover > 0) {
        console.log("Aplicando actualizaciones para compactar timeline...");

        try {
          dispatch(EDIT_OBJECT, {
            payload: actualizaciones
          });
          console.log("Actualizaciones aplicadas con éxito");

          // Esperamos a que se completen las actualizaciones
          await new Promise(resolve => setTimeout(resolve, 500));

          // Refrescamos la vista
          refreshTimelineView();

          toast({
            title: "Línea de tiempo compactada",
            description: `Se han eliminado ${(espacioTotal/1000).toFixed(2)} segundos de espacios vacíos`,
          });

          // Limpiamos los segmentos eliminados
          removedSegmentsRef.current = [];
          setRemovedSegments([]);
        } catch (error) {
          console.error("Error al aplicar actualizaciones:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron aplicar las actualizaciones: " + (error.message || "Error desconocido"),
          });
        }
      } else {
        console.log("No hay elementos que necesiten moverse");
        toast({
          title: "Información",
          description: "No hay elementos que necesiten ajustarse",
        });
      }
    } catch (error) {
      console.error("Error general en compactación:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error durante la compactación: " + (error.message || "Error desconocido"),
      });
    } finally {
      setCompacting(false);
      console.log("=== PROCESO DE COMPACTACIÓN COMPLETADO ===");
    }
  };

  // Función para refrescar la vista de la línea de tiempo
  const refreshTimelineView = () => {
    try {
      const { scale } = stateManager.getState();
      if (scale) {
        console.log("Actualizando escala para refrescar la vista");

        // Realizar un cambio mínimo para forzar una actualización
        const updatedScale = { ...scale };

        // Incrementar o decrementar algún valor para forzar actualización
        if (typeof updatedScale.index === 'number') {
          updatedScale.index = (updatedScale.index || 0) + 1;
        } else if (typeof updatedScale.unit === 'number') {
          // Primero incrementamos
          updatedScale.unit = (updatedScale.unit || 0) + 1;

          // Luego volvemos al valor original en otro dispatch
          setTimeout(() => {
            const currentScale = { ...stateManager.getState().scale };
            currentScale.unit = (currentScale.unit || 1) - 1;
            dispatch(TIMELINE_SCALE_CHANGED, {
              payload: { scale: currentScale }
            });
          }, 300);
        }

        dispatch(TIMELINE_SCALE_CHANGED, {
          payload: { scale: updatedScale }
        });
      }
    } catch (error) {
      console.error("Error al refrescar la vista:", error);
    }
  };

  // Aplicar los recortes seleccionados
  const applyTrim = async () => {
    if (!selectedSegments.length) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay segmentos seleccionados para eliminar.",
      });
      return;
    }

    setProcessing(true);

    try {
      console.log("=== INICIANDO PROCESO DE RECORTE ===");

      // Obtener la información del estado antes de aplicar recortes
      const { current: commandExecutor } = await import("@/components/ai-chat/ai-video-commands").then(
        module => {
          return { current: module.createVideoCommandExecutor(stateManager) };
        }
      );

      // Analizar el estado para conocer su estructura
      const estado = stateManager.getState();
      console.log("Estado antes de recorte:", estado);

      // Verificar si hay tracks definidos
      let tracksPrincipales = [];
      if (estado.tracks && Array.isArray(estado.tracks)) {
        tracksPrincipales = estado.tracks.map(track => ({
          id: track.id,
          type: track.type,
          nombre: track.name || 'Sin nombre'
        }));
        console.log("Tracks disponibles:", tracksPrincipales);
      }

      // Obtener todos los elementos antes de recortar
      console.log("Obteniendo elementos del timeline antes de recortar...");
      const elementosAntes = await commandExecutor.getAllTimelineElements();
      console.log(`Se encontraron ${elementosAntes.length} elementos antes de recortar:`, elementosAntes);

      // Identificar el track más usado o los principales tracks con elementos
      const contadorTracks = {};
      elementosAntes.forEach(elem => {
        if (elem.trackId) {
          contadorTracks[elem.trackId] = (contadorTracks[elem.trackId] || 0) + 1;
        }
      });

      // Ordenar tracks por cantidad de elementos
      const tracksPorUso = Object.entries(contadorTracks)
        .sort((a, b) => b[1] - a[1])
        .map(([trackId, count]) => ({ trackId, count }));

      console.log("Tracks por uso:", tracksPorUso);

      // Determinar trackId principal para los segmentos
      let trackIdPrincipal = "";

      if (tracksPorUso.length > 0) {
        // Usamos el track con más elementos
        trackIdPrincipal = tracksPorUso[0].trackId;
        console.log(`Usando trackId principal por uso: ${trackIdPrincipal}`);
      } else if (tracksPrincipales.length > 0) {
        // Si no hay elementos, usamos el primer track disponible
        trackIdPrincipal = tracksPrincipales[0].id;
        console.log(`Usando primer trackId disponible: ${trackIdPrincipal}`);
      }

      // Obtener elementos activos para complementar información
      const elementosActivos = await commandExecutor.getActiveElements();
      if (elementosActivos.length > 0 && !trackIdPrincipal) {
        trackIdPrincipal = elementosActivos[0].trackId;
        console.log(`Usando trackId de elemento activo: ${trackIdPrincipal}`);
      }

      console.log(`Track ID final para segmentos: ${trackIdPrincipal}`);

      // Preparamos los segmentos a recordar (convertimos de segundos a ms)
      const segmentosParaRecordar = selectedSegments.map(segment => ({
        start: segment.startTime * 1000,  // Convertir a ms
        end: segment.endTime * 1000,      // Convertir a ms
        trackId: trackIdPrincipal,        // Usamos el trackId que identificamos
        texto: segment.text                // Guardamos también el texto como referencia
      }));

      // Guardamos información de los segmentos para compactación
      removedSegmentsRef.current = [...removedSegmentsRef.current, ...segmentosParaRecordar];
      setRemovedSegments(prev => [...prev, ...segmentosParaRecordar]);

      console.log("Segmentos a eliminar:", segmentosParaRecordar);

      // Convertir los segmentos al formato que espera removeSegments
      const timeSegments = selectedSegments.map(segment => ({
        startTime: segment.startTime,
        endTime: segment.endTime
      }));

      // Eliminar los segmentos
      console.log("Ejecutando eliminación de segmentos...");
      const resultado = await commandExecutor.removeSegments(timeSegments);

      if (resultado) {
        console.log("Segmentos eliminados correctamente");

        // Obtener elementos después de recortar
        await new Promise(resolve => setTimeout(resolve, 800));
        const elementosDespues = await commandExecutor.getAllTimelineElements();
        console.log(`Elementos después de recortar: ${elementosDespues.length}`, elementosDespues);

        // Comparamos para ver qué elementos se mantuvieron y cuáles se eliminaron
        const idsAntes = new Set(elementosAntes.map(elem => elem.id));
        const idsDespues = new Set(elementosDespues.map(elem => elem.id));

        // Elementos que se mantuvieron
        const elementosMantenidos = [...idsDespues].filter(id => idsAntes.has(id));
        console.log(`Se mantuvieron ${elementosMantenidos.length} elementos`);

        // Elementos que se eliminaron
        const elementosEliminados = [...idsAntes].filter(id => !idsDespues.has(id));
        console.log(`Se eliminaron ${elementosEliminados.length} elementos:`, elementosEliminados);

        toast({
          title: "Éxito",
          description: `Se han eliminado ${selectedSegments.length} segmentos del video.`,
        });

        // Si está habilitada la compactación automática
        if (autoCompact) {
          console.log("Iniciando compactación automática con un retraso de 3 segundos para asegurar que los cambios en la timeline estén completos...");
          // Aumentamos el retraso a 3 segundos para asegurar que los segmentos se han eliminado completamente
          setTimeout(() => compactTimeline(), 3000);
        }
      } else {
        console.log("Error al eliminar segmentos");
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron eliminar todos los segmentos.",
        });
      }

      console.log("=== PROCESO DE RECORTE COMPLETADO ===");
    } catch (error) {
      console.error("Error al aplicar los recortes:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al intentar eliminar los segmentos: " + (error.message || "Error desconocido"),
      });
    } finally {
      setProcessing(false);
    }
  };

  // Expandir o contraer un segmento
  const toggleExpand = (segmentType: string) => {
    if (expanded === segmentType) {
      setExpanded(null);
    } else {
      setExpanded(segmentType);
    }
  };

  const stateManager = useStateManager();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Recorte Inteligente
        </CardTitle>
        <CardDescription>
          Analiza la transcripción del video y recomienda qué partes eliminar
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!trimResult ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Analiza tu video para identificar automáticamente segmentos que podrían eliminarse
              para mejorar la calidad y concisión.
            </p>
            <Button
              onClick={analyzeTranscription}
              disabled={analyzing}
              className="flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analizando...
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4" /> Analizar Video
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-sm font-medium">Resultado del Análisis</h3>
                <p className="text-xs text-muted-foreground">
                  Se encontraron {trimResult.removeSegments.length} segmentos para eliminar
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyzeTranscription()}
                  disabled={analyzing || processing || compacting}
                >
                  <Edit className="h-4 w-4 mr-1" /> Re-analizar
                </Button>
                <Button
                  onClick={applyTrim}
                  disabled={!selectedSegments.length || processing || compacting}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>
                      <Scissors className="h-4 w-4" /> Aplicar Recortes ({selectedSegments.length})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Botón para compactar la línea de tiempo con opción automática */}
            <div className="flex items-center justify-between p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
              <div className="flex-1">
                <h3 className="text-sm font-medium">Compactar Línea de Tiempo</h3>
                <div className="text-xs text-muted-foreground flex items-center mt-1">
                  <input
                    type="checkbox"
                    id="auto-compact"
                    checked={autoCompact}
                    onChange={() => setAutoCompact(!autoCompact)}
                    className="mr-2 h-3 w-3"
                    disabled={processing || compacting}
                  />
                  <label htmlFor="auto-compact">Compactar automáticamente después de eliminar segmentos</label>
                </div>
              </div>
              <Button
                onClick={compactTimeline}
                disabled={processing || compacting}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                {compacting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Compactando...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4" /> Compactar ahora
                  </>
                )}
              </Button>
            </div>

            <Separator />

            <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md">
              <div
                className="text-sm font-medium mb-2 cursor-pointer flex items-center"
                onClick={() => toggleExpand("reasoning")}
              >
                <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                Razonamiento del Análisis
                {expanded === "reasoning" ? " ▼" : " ▶"}
              </div>
              {expanded === "reasoning" && (
                <div className="text-xs text-muted-foreground">
                  {trimResult.reasoning}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div
                className="text-sm font-medium cursor-pointer flex items-center justify-between"
                onClick={() => toggleExpand("remove")}
              >
                <div className="flex items-center">
                  <Trash className="h-4 w-4 mr-2 text-red-500" />
                  Segmentos a Eliminar
                </div>
                <Badge variant="destructive">{trimResult.removeSegments.length}</Badge>
              </div>

              {expanded === "remove" && (
                <ScrollArea className="h-[200px] rounded-md border p-2">
                  {trimResult.removeSegments.map((segment, index) => {
                    const isSelected = selectedSegments.some(
                      s => s.startTime === segment.startTime && s.endTime === segment.endTime
                    );

                    return (
                      <div
                        key={`remove-${index}`}
                        className={`flex items-start p-2 rounded-md mb-1 ${
                          isSelected ? "bg-red-100 dark:bg-red-900/20" : "bg-muted/50"
                        }`}
                      >
                        <div
                          className="mr-2 mt-1 cursor-pointer"
                          onClick={() => toggleSegment(segment)}
                        >
                          <div className={`h-4 w-4 rounded-sm border ${
                            isSelected
                              ? "bg-red-500 border-red-600 flex items-center justify-center"
                              : "border-muted-foreground"
                          }`}>
                            {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 text-xs">
                          <div className="font-mono text-muted-foreground mb-1">
                            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                            ({(segment.endTime - segment.startTime).toFixed(1)}s)
                          </div>
                          <div className="font-medium">{segment.text}</div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          onClick={() => {
                            // Función para reproducir o saltar a este segmento
                            console.log("Reproducir segmento:", segment);
                          }}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </ScrollArea>
              )}
            </div>

            <div className="space-y-2">
              <div
                className="text-sm font-medium cursor-pointer flex items-center justify-between"
                onClick={() => toggleExpand("keep")}
              >
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Segmentos a Mantener
                </div>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                  {trimResult.keepSegments.length}
                </Badge>
              </div>

              {expanded === "keep" && (
                <ScrollArea className="h-[200px] rounded-md border p-2">
                  {trimResult.keepSegments.map((segment, index) => (
                    <div
                      key={`keep-${index}`}
                      className="flex items-start p-2 rounded-md mb-1 bg-green-100 dark:bg-green-900/20"
                    >
                      <div className="flex-1 text-xs">
                        <div className="font-mono text-muted-foreground mb-1">
                          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                          ({(segment.endTime - segment.startTime).toFixed(1)}s)
                        </div>
                        <div className="font-medium">{segment.text}</div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => {
                          // Función para reproducir o saltar a este segmento
                          console.log("Reproducir segmento:", segment);
                        }}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

