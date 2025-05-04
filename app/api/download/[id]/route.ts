import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validar el ID para evitar ataques de path traversal
    if (!id || id.includes('/') || id.includes('\\')) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const tempDir = path.join(process.cwd(), 'tmp');
    const filePath = path.join(tempDir, `${id}.mp4`);

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Leer el archivo
    const fileBuffer = fs.readFileSync(filePath);

    // Crear una respuesta con el archivo
    const response = new NextResponse(fileBuffer);

    // Establecer los headers adecuados
    response.headers.set('Content-Type', 'video/mp4');
    response.headers.set('Content-Disposition', `attachment; filename="designcombo-export-${id}.mp4"`);

    return response;
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
