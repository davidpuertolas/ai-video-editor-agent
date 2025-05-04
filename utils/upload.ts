import { generateId } from "@designcombo/timeline";

const BASE_URL = "https://transcribe.designcombo.dev/presigned-url";

interface IUploadDetails {
  uploadUrl: string;
  url: string;
  name: string;
  id: string;
}

// Función para crear un mock de URL de imagen local usando dataURL
const createLocalImageUrl = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Resolver directamente con la data URL
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo convertir la imagen a dataURL'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    // Leer el archivo como data URL
    reader.readAsDataURL(file);
  });
};

export const createUploadsDetails = async (
  fileName: string,
  fileInstance?: File
): Promise<IUploadDetails> => {
  try {
    // En desarrollo local, usamos directamente la conversión a data URL
    if (fileInstance) {
      try {
        // Generar un ID único para la imagen
        const uniqueFileName = `${generateId()}`;
        const currentFormat = fileName.split(".").pop();
        const updatedFileName = `${uniqueFileName}.${currentFormat}`;

        // Convertir la imagen a data URL
        const dataUrl = await createLocalImageUrl(fileInstance);
        console.log(`Imagen convertida a data URL (${Math.floor(dataUrl.length / 1024)} KB)`);

        return {
          uploadUrl: "local-mock", // No se usará realmente para subir
          url: dataUrl, // Data URL que se puede usar directamente
          name: updatedFileName,
          id: uniqueFileName,
        };
      } catch (localError) {
        console.error("Error al procesar imagen localmente:", localError);
        throw localError;
      }
    }

    // Si llegamos aquí, intentamos el método original (pero ya no lo usaremos)
    const currentFormat = fileName.split(".").pop();
    const uniqueFileName = `${generateId()}`;
    const updatedFileName = `${uniqueFileName}.${currentFormat}`;

    console.warn("Opción de carga remota ignorada, solo se usará carga local");

    throw new Error("No se proporcionó archivo para carga local");
  } catch (error) {
    console.error("Error al crear detalles de carga:", error);
    throw error;
  }
};
