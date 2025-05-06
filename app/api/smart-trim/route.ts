import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SubtitleSegment {
  id: number;
  startTime: number; // en milisegundos
  endTime: number;   // en milisegundos
  text: string;
}

interface TrimRecommendation {
  keepSegments: {
    startTime: number; // en segundos
    endTime: number;   // en segundos
    text: string;
  }[];
  removeSegments: {
    startTime: number; // en segundos
    endTime: number;   // en segundos
    text: string;
  }[];
  reasoning: string;
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

// Función para convertir milisegundos a segundos
const msToSeconds = (ms: number): number => {
  return Math.round(ms / 1000);
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

// Analizar la transcripción usando IA para determinar segmentos a mantener/eliminar
const analyzeTranscription = async (segments: SubtitleSegment[]): Promise<TrimRecommendation> => {
  try {
    // Preparar el texto para enviarlo a la IA
    const transcriptionText = segments.map(segment => {
      const startTimeInSec = msToSeconds(segment.startTime);
      const endTimeInSec = msToSeconds(segment.endTime);
      return `[${startTimeInSec}s-${endTimeInSec}s]: "${segment.text}"`;
    }).join('\n');

    const systemPrompt = `
    Eres un editor de video profesional especializado en identificar qué partes de un video deben mantenerse y cuáles deben eliminarse.

    Analiza cuidadosamente la transcripción del video y determina:
    1. Qué segmentos contienen información valiosa, instrucciones importantes o el contenido principal.
    2. Qué segmentos contienen errores, repeticiones, pausas largas, contenido irrelevante o frases como "esta parte debería ser cortada".

    Identifica específicamente:
    - Segmentos que mencionan explícitamente que deberían ser cortados
    - Largas pausas o silencios (indicados por grandes intervalos de tiempo sin texto sustancial)
    - Repeticiones de la misma información
    - Errores de habla o correcciones
    - Contenido irrelevante para el tema principal

    IMPORTANTE: Asegúrate de mantener la coherencia narrativa. No cortes en medio de una frase importante o una explicación.
    `;

    const userPrompt = `
    Aquí está la transcripción del video con marcas de tiempo (formato [segundos_inicio-segundos_fin]):

    ${transcriptionText}

    Basándote en esta transcripción, identifica qué segmentos deben mantenerse y cuáles deben eliminarse para crear un video conciso y profesional.

    Devuelve tu respuesta en formato JSON con la siguiente estructura:
    {
      "keepSegments": [
        { "startTime": número_segundos, "endTime": número_segundos, "text": "texto del segmento" }
      ],
      "removeSegments": [
        { "startTime": número_segundos, "endTime": número_segundos, "text": "texto del segmento" }
      ],
      "reasoning": "Explicación detallada de por qué tomaste estas decisiones"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    // Parsear la respuesta de la IA
    const aiResponse = response.choices[0].message.content;
    if (!aiResponse) {
      throw new Error("La IA no proporcionó una respuesta válida");
    }

    const trimRecommendation = JSON.parse(aiResponse) as TrimRecommendation;
    return trimRecommendation;

  } catch (error) {
    console.error("Error al analizar la transcripción:", error);
    throw error;
  }
};

export async function GET(req: NextRequest) {
  try {
    // Ruta a la transcripción
    const transcriptionPath = path.join(process.cwd(), 'public', 'transcriptions', 'transcription1.srt');

    // Leer el archivo de transcripción
    const srtContent = fs.readFileSync(transcriptionPath, 'utf8');

    // Parsear el contenido SRT
    const segments = parseSRT(srtContent);

    // Analizar la transcripción para obtener recomendaciones de recorte
    const trimRecommendation = await analyzeTranscription(segments);

    // Devolver el resultado
    return NextResponse.json(trimRecommendation);
  } catch (error) {
    console.error("Error en API de smart trim:", error);
    return NextResponse.json(
      { error: 'Error al procesar la transcripción' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Permitir pasar un archivo SRT personalizado
    const { transcription } = await req.json();

    // Si se proporcionó transcripción, usarla; de lo contrario, cargar la predeterminada
    let srtContent: string;

    if (transcription) {
      srtContent = transcription;
    } else {
      const transcriptionPath = path.join(process.cwd(), 'public', 'transcriptions', 'transcription1.srt');
      srtContent = fs.readFileSync(transcriptionPath, 'utf8');
    }

    // Parsear el contenido SRT
    const segments = parseSRT(srtContent);

    // Analizar la transcripción para obtener recomendaciones de recorte
    const trimRecommendation = await analyzeTranscription(segments);

    // Devolver el resultado
    return NextResponse.json(trimRecommendation);
  } catch (error) {
    console.error("Error en API de smart trim:", error);
    return NextResponse.json(
      { error: 'Error al procesar la transcripción' },
      { status: 500 }
    );
  }
}
