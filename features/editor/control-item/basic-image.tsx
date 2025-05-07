import { IBoxShadow, IImage, ITrackItem } from "@designcombo/types";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import Opacity from "./common/opacity";
import Rounded from "./common/radius";
import AspectRatio from "./common/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Crop } from "lucide-react";
import { useEffect, useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import Blur from "./common/blur";
import Brightness from "./common/brightness";
import useLayoutStore from "../store/use-layout-store";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import FadeEffect from "./common/fade-effect";
import useStore from "../store/use-store";

const BasicImage = ({ trackItem }: { trackItem: ITrackItem & IImage }) => {
  const [properties, setProperties] = useState(trackItem);
  const { setCropTarget } = useLayoutStore();
  const { animationsMap } = useStore();

  useEffect(() => {
    setProperties(trackItem);
  }, [trackItem]);

  // Obtener info de animaciones actuales
  const hasAnimation = animationsMap && animationsMap[trackItem.id];
  const fadeInEnabled = hasAnimation?.in?.name === "fadeIn";
  const fadeOutEnabled = hasAnimation?.out?.name === "fadeOut";
  const fadeInDuration = fadeInEnabled ?
    hasAnimation?.in?.composition?.[0]?.durationInFrames || 30 : 30;
  const fadeOutDuration = fadeOutEnabled ?
    hasAnimation?.out?.composition?.[0]?.durationInFrames || 30 : 30;

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

  const onChangeBlur = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            blur: v,
          },
        },
      },
    });
    setProperties((prev) => {
      return {
        ...prev,
        details: {
          ...prev.details,
          blur: v,
        },
      };
    });
  };
  const onChangeBrightness = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            brightness: v,
          },
        },
      },
    });
    setProperties((prev) => {
      return {
        ...prev,
        details: {
          ...prev.details,
          brightness: v,
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
        Image
      </div>
      <div className="flex flex-col gap-2 px-4">
        <motion.div
          className="mb-4 mt-2"
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
            <AspectRatio />
          </motion.div>
          <motion.div custom={3} variants={itemVariants}>
            <Rounded
              onChange={(v: number) => onChangeBorderRadius(v)}
              value={properties.details.borderRadius as number}
            />
          </motion.div>
          <motion.div custom={4} variants={itemVariants}>
            <Opacity
              onChange={(v: number) => handleChangeOpacity(v)}
              value={properties.details.opacity!}
            />
          </motion.div>

          <motion.div custom={5} variants={itemVariants}>
            <Blur
              onChange={(v: number) => onChangeBlur(v)}
              value={properties.details.blur!}
            />
          </motion.div>
          <motion.div custom={6} variants={itemVariants}>
            <Brightness
              onChange={(v: number) => onChangeBrightness(v)}
              value={properties.details.brightness!}
            />
          </motion.div>
        </motion.div>

        <motion.div custom={7} variants={itemVariants}>
          <FadeEffect
            trackItemId={trackItem.id}
            enabled={{ fadeIn: fadeInEnabled, fadeOut: fadeOutEnabled }}
            fadeInDuration={fadeInDuration}
            fadeOutDuration={fadeOutDuration}
          />
        </motion.div>

        <motion.div custom={8} variants={itemVariants}>
          <Outline
            label="Outline"
            onChageBorderWidth={(v: number) => onChangeBorderWidth(v)}
            onChangeBorderColor={(v: string) => onChangeBorderColor(v)}
            valueBorderWidth={properties.details.borderWidth as number}
            valueBorderColor={properties.details.borderColor as string}
          />
        </motion.div>
        <motion.div custom={9} variants={itemVariants}>
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

export default BasicImage;
