import useStore from "../store/use-store";
import { useEffect } from "react";
import { filter, subject } from "@designcombo/events";
import {
  PLAYER_PAUSE,
  PLAYER_PLAY,
  PLAYER_PREFIX,
  PLAYER_SEEK,
  PLAYER_SEEK_BY,
  PLAYER_TOGGLE_PLAY,
} from "../constants/events";
import { LAYER_PREFIX, LAYER_SELECTION } from "@designcombo/state";
import { TIMELINE_SEEK, TIMELINE_PREFIX } from "@designcombo/timeline";
import useLayoutStore from "../store/use-layout-store";

const useTimelineEvents = () => {
  const { playerRef, fps, timeline, setState } = useStore();
  const { setActiveMenuItem, setShowMenuItem, activeMenuItem } = useLayoutStore();

  //handle player events
  useEffect(() => {
    const playerEvents = subject.pipe(
      filter(({ key }) => key.startsWith(PLAYER_PREFIX)),
    );
    const timelineEvents = subject.pipe(
      filter(({ key }) => key.startsWith(TIMELINE_PREFIX)),
    );

    const timelineEventsSubscription = timelineEvents.subscribe((obj) => {
      if (obj.key === TIMELINE_SEEK) {
        const { time } = obj.value?.payload;
        playerRef?.current?.seekTo((time / 1000) * fps);
      }
    });
    const playerEventsSubscription = playerEvents.subscribe((obj) => {
      if (obj.key === PLAYER_SEEK) {
        const { time } = obj.value?.payload;
        playerRef?.current?.seekTo((time / 1000) * fps);
      } else if (obj.key === PLAYER_PLAY) {
        playerRef?.current?.play();
      } else if (obj.key === PLAYER_PAUSE) {
        playerRef?.current?.pause();
      } else if (obj.key === PLAYER_TOGGLE_PLAY) {
        if (playerRef?.current?.isPlaying()) {
          playerRef?.current?.pause();
        } else {
          playerRef?.current?.play();
        }
      } else if (obj.key === PLAYER_SEEK_BY) {
        const { frames } = obj.value?.payload;
        playerRef?.current?.seekTo(
          Math.round(playerRef?.current?.getCurrentFrame()) + frames,
        );
      }
    });

    return () => {
      playerEventsSubscription.unsubscribe();
      timelineEventsSubscription.unsubscribe();
    };
  }, [playerRef, fps]);

  // handle selection events
  useEffect(() => {
    console.log("[DEBUG] Configurando suscripción a eventos de selección");

    const selectionEvents = subject.pipe(
      filter(({ key }) => key.startsWith(LAYER_PREFIX)),
    );

    const selectionSubscription = selectionEvents.subscribe((obj) => {
      console.log("[DEBUG] Evento recibido:", obj.key);

      if (obj.key === LAYER_SELECTION) {
        const activeIds = obj.value?.payload.activeIds || [];
        console.log("[DEBUG] IDs activos:", activeIds);

        setState({
          activeIds: activeIds,
        });

        // Si se ha seleccionado un elemento (y solo uno), cambiamos automáticamente al panel de atributos
        if (activeIds && activeIds.length === 1) {
          console.log("[DEBUG] Un elemento seleccionado, cambiando a panel de atributos");
          console.log("[DEBUG] Panel actual:", activeMenuItem);

          // Establecer el panel activo como "attributes" y mostrar el menú
          setActiveMenuItem("attributes");
          setShowMenuItem(true);

          // Verificar después del cambio
          setTimeout(() => {
            const currentMenuItem = useLayoutStore.getState().activeMenuItem;
            console.log("[DEBUG] Panel después del cambio:", currentMenuItem);
          }, 100);
        }
      }
    });

    return () => {
      console.log("[DEBUG] Cancelando suscripción a eventos de selección");
      selectionSubscription.unsubscribe();
    };
  }, [timeline, setActiveMenuItem, setShowMenuItem, activeMenuItem]);
};

export default useTimelineEvents;
