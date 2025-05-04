import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDownloadState } from "./store/use-download-state";
import { Button } from "@/components/ui/button";
import { CircleCheckIcon, XIcon } from "lucide-react";
import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog";
import { download } from "@/utils/download";
import { useEffect, useState } from "react";

const DownloadProgressModal = () => {
  const {
    exporting,
    progress,
    output,
    displayProgressModal,
    actions
  } = useDownloadState();

  const [statusMessage, setStatusMessage] = useState("Iniciando exportación...");

  // Actualizar el mensaje de estado basado en el progreso
  useEffect(() => {
    if (progress === 0) {
      setStatusMessage("Preparando el diseño para exportar...");
    } else if (progress < 25) {
      setStatusMessage("Iniciando renderizado...");
    } else if (progress < 50) {
      setStatusMessage("Procesando frames...");
    } else if (progress < 75) {
      setStatusMessage("Generando video...");
    } else if (progress < 100) {
      setStatusMessage("Finalizando exportación...");
    } else {
      setStatusMessage("¡Exportación completada!");
    }
  }, [progress]);

  const handleDownload = () => {
    if (output?.url) {
      console.log("📥 Descargando video desde:", output.url);
      // Para archivos MP4, usamos la función de descarga
      if (output.type === 'mp4') {
        download(output.url, `designcombo-export-${Date.now()}`);
      } else {
        // Para otros tipos, abrimos en una nueva pestaña
        window.open(output.url, '_blank');
      }
      actions.setDisplayProgressModal(false);
    }
  };

  const handleCancel = () => {
    console.log("❌ Exportación cancelada por el usuario");
    actions.setExporting(false);
    actions.setDisplayProgressModal(false);
  };

  if (!displayProgressModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-sidebar w-96 rounded-lg p-6">
        <h2 className="mb-4 text-lg font-medium">Exporting your design</h2>

        <div className="mb-4">
          <div className="mb-2 flex justify-between">
            <span>{statusMessage}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {progress === 100 ? (
          <Button onClick={handleDownload} className="w-full">
            Download
          </Button>
        ) : (
          <Button
            onClick={handleCancel}
            variant="outline"
            className="w-full"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

export default DownloadProgressModal;
