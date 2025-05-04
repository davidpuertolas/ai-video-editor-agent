import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Asegurarse de que el directorio temporal existe
const ensureTempDir = () => {
  const tempDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { design, options } = body;

    // Generar un ID único para el trabajo de renderizado
    const jobId = uuidv4();

    // Guardar el diseño en un archivo temporal para referencia futura
    const tempDir = ensureTempDir();
    const designFilePath = path.join(tempDir, `${jobId}.json`);

    fs.writeFileSync(designFilePath, JSON.stringify(design, null, 2));

    // Devolver información sobre el trabajo de renderizado
    return NextResponse.json({
      success: true,
      video: {
        id: jobId,
        status: 'PENDING',
        progress: 0
      }
    });
  } catch (error) {
    console.error('Error starting render job:', error);
    return NextResponse.json(
      { error: 'Failed to start render job' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id) {
      return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
    }

    console.log(`Checking status for job ${id}, type: ${type}`);

    // En una implementación real, aquí verificarías el estado real del trabajo
    // Para esta demo, simularemos un progreso más realista basado en el ID

    // Generar una URL para descargar el video
    const downloadUrl = `/api/download/${id}`;

    // Usar el ID para generar un progreso determinista pero que parezca aleatorio
    const idSum = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const now = Date.now();
    const timeBasedProgress = Math.min(100, Math.floor((now % 10000) / 100));

    // Combinar para un progreso que avance con el tiempo pero sea consistente para el mismo ID
    const progress = Math.min(100, Math.floor((timeBasedProgress + idSum % 20) % 101));

    console.log(`Job ${id} progress: ${progress}%`);

    // Si el progreso es 100, consideramos que está completo
    const status = progress === 100 ? 'COMPLETED' : 'PENDING';

    return NextResponse.json({
      success: true,
      video: {
        id,
        status,
        progress,
        url: status === 'COMPLETED' ? downloadUrl : undefined
      }
    });
  } catch (error) {
    console.error('Error checking render status:', error);
    return NextResponse.json(
      { error: 'Failed to check render status' },
      { status: 500 }
    );
  }
}
