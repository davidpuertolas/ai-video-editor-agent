import Draggable from '@/components/shared/draggable';
import { Button, buttonVariants } from '@/components/ui/button';
import { DEFAULT_FONT } from '@/features/editor/constants/font';
import { cn } from '@/lib/utils';
import { dispatch, subject, filter } from '@designcombo/events';
import { ADD_TEXT } from '@designcombo/state';
import { generateId } from '@designcombo/timeline';
import { useIsDraggingOverTimeline } from '../hooks/is-dragging-over-timeline';
import { useEffect, useState } from 'react';
import useStore from '../store/use-store';
import { TIMELINE_PREFIX, SELECTION_CREATED, SELECTION_UPDATED } from '@designcombo/timeline';

// Componente Spinner simple
const Spinner = () => (
  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
);

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

// Función para formatear milisegundos a formato legible (MM:SS)
const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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

export const getAddTextPayload = (text = 'Demo', startTime = 0, endTime = 5000) => ({
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

export const Subtitles = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const [subtitleSegments, setSubtitleSegments] = useState<SubtitleSegment[]>([]);
  const [originalSegments, setOriginalSegments] = useState<SubtitleSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedSubtitles, setAddedSubtitles] = useState<Set<number>>(new Set());
  const [groupWords, setGroupWords] = useState(true); // Estado para controlar si agrupar palabras
  const { tracks, timeline } = useStore(); // Acceder a los tracks del store
  const [subtitleTrackId, setSubtitleTrackId] = useState<string | null>(null); // Track ID específico para subtítulos
  const [statusMessage, setStatusMessage] = useState<string | null>(null); // Mensaje de estado para mostrar al usuario

  // Efecto para escuchar los eventos de selección del timeline
  useEffect(() => {
    // Filtrar eventos del timeline
    const timelineEvents = subject.pipe(
      filter(({ key }) => key.startsWith(TIMELINE_PREFIX))
    );

    // Suscribirse a los eventos de selección
    const subscription = timelineEvents.subscribe((obj) => {
      // Verificar si es un evento de creación o actualización de selección
      if ((obj.key === SELECTION_CREATED || obj.key === SELECTION_UPDATED) && obj.value) {
        console.log('Timeline selection event:', obj.key, obj.value);

        // Intentar obtener los elementos seleccionados
        const selected = obj.value.selected;
        if (selected && selected.length > 0) {
          // Obtener el canvas y los tracks
          try {
            const canvas = selected[0].canvas;
            if (canvas && canvas.tracks && canvas.tracks.length > 0) {
              // Extraer el ID del primer track
              const trackId = canvas.tracks[0].id;
              console.log('Seleccionado track con ID:', trackId);

              // Guardar el ID del track para usar con los subtítulos
              setSubtitleTrackId(trackId);
              setStatusMessage(`Track seleccionado para subtítulos (ID: ${trackId.substr(0, 8)}...)`);

              // El mensaje se eliminará después de 3 segundos
              setTimeout(() => setStatusMessage(null), 3000);
            }
          } catch (error) {
            console.error('Error al procesar selección del timeline:', error);
          }
        }
      }
    });

    // Limpiar suscripción cuando el componente se desmonte
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTranscription = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/transcriptions/transcription1.srt');
        if (!response.ok) {
          throw new Error(`Error al cargar el archivo SRT: ${response.status}`);
        }
        const text = await response.text();
        const segments = parseSRT(text);
        setOriginalSegments(segments);

        // Procesar los segmentos según la configuración actual
        if (groupWords) {
          const processedSegments = segments.flatMap(processSegment);
          setSubtitleSegments(processedSegments);
        } else {
          setSubtitleSegments(segments);
        }
      } catch (error) {
        console.error('Failed to load transcription:', error);
        setError('No se pudo cargar el archivo de subtítulos');
        setSubtitleSegments([]);
        setOriginalSegments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranscription();
  }, [groupWords]);

  // Función para cambiar entre modo agrupado y no agrupado
  const toggleGroupWords = () => {
    setGroupWords(!groupWords);
  };

  // Función para encontrar o crear un track para subtítulos
  const getSubtitleTrackId = () => {
    // Si ya tenemos un ID de track, usarlo
    if (subtitleTrackId) return subtitleTrackId;

    // Buscar un track de tipo "text" existente
    let trackId = tracks.find(track => track.type === 'text' && track.accepts.includes('text'))?.id;

    if (trackId) {
      setSubtitleTrackId(trackId);
      return trackId;
    }

    // Si no hay tracks o no se puede obtener timeline, usar un enfoque alternativo
    if (timeline && timeline.canvas) {
      // Intentar obtener tracks a través del canvas de timeline
      const canvasTracks = timeline.canvas.tracks;
      if (canvasTracks && canvasTracks.length > 0) {
        trackId = canvasTracks[0].id;
        setSubtitleTrackId(trackId);
        return trackId;
      }
    }

    // Si no se pudo obtener ningún track, null indicará usar el comportamiento por defecto
    return null;
  };

  const handleAddSubtitle = (segment: SubtitleSegment) => {
    // Intentar obtener un track ID para subtítulos
    const trackId = getSubtitleTrackId();

    dispatch(ADD_TEXT, {
      payload: getAddTextPayload(segment.text, segment.startTime, segment.endTime),
      options: trackId ? { trackId } : {}, // Solo añadir trackId si existe
    });

    // Marcar este subtítulo como añadido
    setAddedSubtitles(prev => {
      const newSet = new Set(prev);
      newSet.add(segment.id);
      return newSet;
    });
  };

  const handleAddAllSubtitles = () => {
    // Desactivar el botón mientras se procesan los subtítulos
    setIsLoading(true);

    // Intentar obtener un track ID para subtítulos
    const trackId = getSubtitleTrackId();
    console.log(`Usando track ID para subtítulos: ${trackId || 'ninguno (comportamiento por defecto)'}`);

    // Añadir subtítulos con un retraso entre cada uno
    subtitleSegments.forEach((segment, index) => {
      setTimeout(() => {
        dispatch(ADD_TEXT, {
          payload: getAddTextPayload(segment.text, segment.startTime, segment.endTime),
          options: trackId ? { trackId } : {}, // Solo añadir trackId si existe
        });

        // Si es el último subtítulo, actualizar el estado
        if (index === subtitleSegments.length - 1) {
          // Marcar todos los subtítulos como añadidos
          const allIds = new Set(subtitleSegments.map(segment => segment.id));
          setAddedSubtitles(allIds);
          setIsLoading(false);
          // Mostrar mensaje de finalización
          setStatusMessage(`Se añadieron ${subtitleSegments.length} subtítulos al track`);
          // El mensaje se eliminará después de 3 segundos
          setTimeout(() => setStatusMessage(null), 3000);
        }
      }, index * 200); // 200ms de retraso entre cada subtítulo
    });
  };

  return (
    <div className="flex flex-1 flex-col" data-subtitles>
      <div className="flex h-12 flex-none items-center px-4 font-medium text-sm text-text-primary">
        Subtítulos
      </div>
      <div className="flex flex-col gap-2 px-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm py-2">{error}</div>
        ) : subtitleSegments.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-2">
              <div
                onClick={toggleGroupWords}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  "cursor-pointer"
                )}
              >
                {groupWords ? "Ver subtítulos completos" : "Dividir en grupos de 3 palabras"}
              </div>
            </div>

            {/* Mensaje informativo para el usuario sobre el track seleccionado */}
            {statusMessage && (
              <div className="text-green-500 text-sm py-2 mb-2 text-center bg-green-500/10 rounded border border-green-500">
                {statusMessage}
              </div>
            )}

            {/* Información sobre cómo seleccionar un track */}
            <div className="text-xs text-muted-foreground mb-2 bg-gray-800/50 p-2 rounded">
              <p>Para añadir todos los subtítulos a un mismo track:</p>
              <ol className="list-decimal pl-4 mt-1">
                <li>Selecciona un elemento en la línea de tiempo</li>
                <li>Luego haz clic en "Añadir todos los subtítulos"</li>
              </ol>
            </div>

            <div
              onClick={handleAddAllSubtitles}
              className={cn(
                buttonVariants({ variant: 'secondary' }),
                "cursor-pointer flex justify-center items-center"
              )}
              disabled={isLoading}
              // ID dinámico según el modo de agrupación
              id={groupWords ? "add-all-subtitles-grouped" : "add-all-subtitles-complete"}
              data-subtitles-add-all
            >
              {isLoading ? (
                <>
                  <Spinner />
                  <span className="ml-2">Añadiendo subtítulos...</span>
                </>
              ) : (
                `Añadir todos los subtítulos ${groupWords ? "(agrupados)" : "(completos)"}`
              )}
            </div>
            <div className="mt-2 text-sm font-medium">Subtítulos individuales:</div>
            <div className="max-h-60 overflow-y-auto pr-1">
              {subtitleSegments.map((segment) => (
                <Draggable
                  key={segment.id}
                  data={() => getAddTextPayload(segment.text, segment.startTime, segment.endTime)}
                  renderCustomPreview={
                    <div className="bg-background border border-border p-2 rounded-md max-w-xs">
                      {segment.text}
                    </div>
                  }
                  shouldDisplayPreview={!isDraggingOverTimeline}
                >
                  <div
                    onClick={() => handleAddSubtitle(segment)}
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      "mb-2 text-left flex flex-col w-full",
                      addedSubtitles.has(segment.id) && "border-green-500 bg-green-500/10"
                    )}
                  >
                    <div className="truncate" title={segment.text}>
                      {segment.text.length > 30 ? `${segment.text.substring(0, 30)}...` : segment.text}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                    </div>
                  </div>
                </Draggable>
              ))}
            </div>
          </>
        ) :
          <Draggable
            data={() => getAddTextPayload("Demo")}
            renderCustomPreview={
              <Button variant="secondary" className="w-60">
                Add text
              </Button>
            }
            shouldDisplayPreview={!isDraggingOverTimeline}
          >
            <div
              onClick={() => handleAddSubtitle({id: 0, startTime: 0, endTime: 5000, text: "Demo"})}
              className={cn(buttonVariants({ variant: 'secondary' }))}
            >
              Add text
            </div>
          </Draggable>
        }
      </div>
    </div>
  );
};
