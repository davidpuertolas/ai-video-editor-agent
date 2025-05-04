import { useContext, createContext } from "react";
import StateManager from "@designcombo/state";

// Crear un contexto para el StateManager
export const StateManagerContext = createContext<StateManager | null>(null);

// Hook para acceder al StateManager
export function useStateManager(): StateManager {
  const stateManager = useContext(StateManagerContext);

  if (!stateManager) {
    throw new Error("useStateManager debe ser usado dentro de un StateManagerProvider");
  }

  return stateManager;
}

// Provider component
export function StateManagerProvider({
  children,
  stateManager,
}: {
  children: React.ReactNode;
  stateManager: StateManager;
}) {
  return (
    <StateManagerContext.Provider value={stateManager}>
      {children}
    </StateManagerContext.Provider>
  );
}
