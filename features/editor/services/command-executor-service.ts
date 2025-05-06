import { VideoCommandExecutor } from "../../../components/ai-chat/ai-video-commands";

/**
 * Clase de servicio para acceder al VideoCommandExecutor globalmente
 */
class CommandExecutorService {
  private static instance: VideoCommandExecutor | null = null;

  /**
   * Establece la instancia del VideoCommandExecutor
   */
  public static setExecutor(executor: VideoCommandExecutor): void {
    this.instance = executor;
  }

  /**
   * Obtiene la instancia del VideoCommandExecutor
   */
  public static getExecutor(): VideoCommandExecutor | null {
    return this.instance;
  }

  /**
   * Verifica si el executor está disponible
   */
  public static isExecutorAvailable(): boolean {
    return this.instance !== null;
  }
}

export default CommandExecutorService;
