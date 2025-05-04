import Draggable from '@/components/shared/draggable';
import { Button, buttonVariants } from '@/components/ui/button';
import { DEFAULT_FONT } from '@/features/editor/constants/font';
import { cn } from '@/lib/utils';
import { dispatch } from '@designcombo/events';
import { ADD_TEXT } from '@designcombo/state';
import { generateId } from '@designcombo/timeline';
import { useIsDraggingOverTimeline } from '../hooks/is-dragging-over-timeline';
import { useEffect, useState } from 'react';

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

  const handleAddSubtitle = (segment: SubtitleSegment) => {
    dispatch(ADD_TEXT, {
      payload: getAddTextPayload(segment.text, segment.startTime, segment.endTime),
      options: {},
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

    // Añadir subtítulos con un retraso entre cada uno
    subtitleSegments.forEach((segment, index) => {
      setTimeout(() => {
        dispatch(ADD_TEXT, {
          payload: getAddTextPayload(segment.text, segment.startTime, segment.endTime),
          options: {},
        });

        // Si es el último subtítulo, actualizar el estado
        if (index === subtitleSegments.length - 1) {
          // Marcar todos los subtítulos como añadidos
          const allIds = new Set(subtitleSegments.map(segment => segment.id));
          setAddedSubtitles(allIds);
          setIsLoading(false);
        }
      }, index * 200); // 20ms de retraso entre cada subtítulo
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
        ) : (
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
        )}
      </div>
    </div>
  );
};
