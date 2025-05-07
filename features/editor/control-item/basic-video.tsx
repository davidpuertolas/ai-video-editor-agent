import { IBoxShadow, ITrackItem, IVideo } from "@designcombo/types";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import Opacity from "./common/opacity";
import Rounded from "./common/radius";
import { Button, buttonVariants } from "@/components/ui/button";
import { Crop, ClockArrowDown , ClockArrowUp , Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import useLayoutStore from "../store/use-layout-store";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import useAudioStore from "../store/use-audio-store";
import { DynamicallyImportedAudioAnalyzer } from "../clip-editor/audio-analyzer";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import FadeEffect from "./common/fade-effect";
import useStore from "../store/use-store";

const BasicVideo = ({ trackItem }: { trackItem: ITrackItem & IVideo }) => {
  const [properties, setProperties] = useState(trackItem);
  const { setCropTarget } = useLayoutStore();
  const { animationsMap } = useStore();

  // Obtener info de animaciones actuales
  const hasAnimation = animationsMap && animationsMap[trackItem.id];
  const fadeInEnabled = hasAnimation?.in?.name === "fadeIn";
  const fadeOutEnabled = hasAnimation?.out?.name === "fadeOut";
  const fadeInDuration = fadeInEnabled ?
    hasAnimation?.in?.composition?.[0]?.durationInFrames || 30 : 30;
  const fadeOutDuration = fadeOutEnabled ?
    hasAnimation?.out?.composition?.[0]?.durationInFrames || 30 : 30;

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

  const onChangeBorderWidth = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            borderWidth: v,
          },
        },
      },
    });
    setProperties((prev) => {
      return {
        ...prev,
        details: {
          ...prev.details,
          borderWidth: v,
        },
      };
    });
  };

  const onChangeBorderColor = (v: string) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            borderColor: v,
          },
        },
      },
    });
    setProperties((prev) => {
      return {
        ...prev,
        details: {
          ...prev.details,
          borderColor: v,
        },
      };
    });
  };

  const handleChangeOpacity = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            opacity: v,
          },
        },
      },
    });
    setProperties((prev) => {
      return {
        ...prev,
        details: {
          ...prev.details,
          opacity: v,
        },
      };
    });
  };

  const onChangeBorderRadius = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            borderRadius: v,
          },
        },
      },
    });
    setProperties((prev) => {
      return {
        ...prev,
        details: {
          ...prev.details,
          borderRadius: v,
        },
      };
    });
  };

  const onChangeBoxShadow = (boxShadow: IBoxShadow) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            boxShadow: boxShadow,
          },
        },
      },
    });

    setProperties((prev) => {
      return {
        ...prev,
        details: {
          ...prev.details,
          boxShadow,
        },
      };
    });
  };
  useEffect(() => {
    setProperties(trackItem);
  }, [trackItem]);

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
        Video
      </div>
      <div className="flex flex-col gap-2 px-4">
        <motion.div
          className="mb-4 mt-2 flex gap-2"
          initial="hidden"
          animate="visible"
          custom={0}
          variants={itemVariants}
        >
          <Button
            variant={"secondary"}
            size={"icon"}
            onClick={() => {
              setCropTarget(trackItem);
            }}
          >
            <Crop size={18} />
          </Button>
          <Button
            variant={"secondary"}
            size={"icon"}
            onClick={() => {
              handleChangeSpeed(1.5);
            }}
          >
            <ClockArrowUp  size={18} />
          </Button>

          <Button
            variant={"secondary"}
            size={"icon"}
            onClick={() => {
              handleChangeSpeed(0.5);
            }}
          >
            <ClockArrowDown  size={18} />
          </Button>
          <a
            href="#"
            className={cn(
              buttonVariants({ variant: "secondary", size: "icon" }),
              "h-8 w-8 p-0",
            )}
            onClick={(e) => {
              e.preventDefault();
              handleChangeVolume(0);
            }}
          >
            <VolumeX size={18} />
          </a>
        </motion.div>

        <motion.div
          className="flex flex-col gap-2"
          initial="hidden"
          animate="visible"
          custom={1}
          variants={itemVariants}
        >
          <Label className="font-sans text-xs font-semibold text-primary">
            Basic
          </Label>

          <motion.div custom={2} variants={itemVariants}>
            <Rounded
              onChange={(v: number) => onChangeBorderRadius(v)}
              value={properties.details.borderRadius as number}
            />
          </motion.div>

          <motion.div custom={3} variants={itemVariants}>
            <Opacity
              onChange={(v: number) => handleChangeOpacity(v)}
              value={properties.details.opacity!}
            />
          </motion.div>

          <motion.div className="mt-4" custom={4} variants={itemVariants}>
            <div className="text-xs font-semibold">Volumen</div>
            <Slider
              defaultValue={[100]}
              value={[properties.details.volume! * 100]}
              min={0}
              max={150}
              step={1}
              onValueChange={(value) => {
                handleChangeVolume(value[0] / 100);
              }}
            />
          </motion.div>
        </motion.div>

        <motion.div custom={5} variants={itemVariants}>
          <FadeEffect
            trackItemId={trackItem.id}
            enabled={{ fadeIn: fadeInEnabled, fadeOut: fadeOutEnabled }}
            fadeInDuration={fadeInDuration}
            fadeOutDuration={fadeOutDuration}
          />
        </motion.div>

        <motion.div custom={6} variants={itemVariants}>
          <Outline
            label="Outline"
            onChageBorderWidth={(v: number) => onChangeBorderWidth(v)}
            onChangeBorderColor={(v: string) => onChangeBorderColor(v)}
            valueBorderWidth={properties.details.borderWidth as number}
            valueBorderColor={properties.details.borderColor as string}
          />
        </motion.div>

        <motion.div custom={7} variants={itemVariants}>
          <Shadow
            label="Shadow"
            onChange={(v: IBoxShadow) => onChangeBoxShadow(v)}
            value={properties.details.boxShadow!}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default BasicVideo;
