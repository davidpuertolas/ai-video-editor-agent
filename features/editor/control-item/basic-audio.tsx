import { IAudio, ITrackItem } from "@designcombo/types";
import { useEffect, useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import Volume from "./common/volume";
import Speed from "./common/speed";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import FadeEffect from "./common/fade-effect";
import useStore from "../store/use-store";

const BasicAudio = ({ trackItem }: { trackItem: ITrackItem & IAudio }) => {
  const [properties, setProperties] = useState(trackItem);
  const { animationsMap } = useStore();

  // Obtener info de animaciones actuales
  const hasAnimation = animationsMap && animationsMap[trackItem.id];
  const fadeInEnabled = hasAnimation?.in?.name === "fadeIn";
  const fadeOutEnabled = hasAnimation?.out?.name === "fadeOut";
  const fadeInDuration = fadeInEnabled ?
    hasAnimation?.in?.composition?.[0]?.durationInFrames || 30 : 30;
  const fadeOutDuration = fadeOutEnabled ?
    hasAnimation?.out?.composition?.[0]?.durationInFrames || 30 : 30;

  useEffect(() => {
    setProperties(trackItem);
  }, [trackItem]);

  const handleChangeVolume = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            volume: v,
          },
        },
      },
    });
    setProperties((prev) => {
      return {
        ...prev,
        details: {
          ...prev.details,
          volume: v,
        },
      };
    });
  };

  const handleChangeSpeed = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          playbackRate: v,
        },
      },
    });
    setProperties((prev) => {
      return {
        ...prev,
        playbackRate: v,
      };
    });
  };

  // Variantes para animación de controles
  const itemVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3
      }
    })
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Audio
      </div>
      <div className="flex flex-col gap-3 px-4 py-2">
        <Label className="font-sans text-xs font-semibold text-primary pt-2">
          Settings
        </Label>
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={itemVariants}
        >
          <Volume
            onChange={(v: number) => handleChangeVolume(v)}
            value={properties.details.volume!}
          />
        </motion.div>
        <motion.div
          initial="hidden"
          animate="visible"
          custom={1}
          variants={itemVariants}
        >
          <Speed value={properties.playbackRate!} onChange={handleChangeSpeed} />
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          custom={2}
          variants={itemVariants}
        >
          <FadeEffect
            trackItemId={trackItem.id}
            enabled={{ fadeIn: fadeInEnabled, fadeOut: fadeOutEnabled }}
            fadeInDuration={fadeInDuration}
            fadeOutDuration={fadeOutDuration}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default BasicAudio;
