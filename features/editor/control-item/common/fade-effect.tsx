import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { dispatch } from "@designcombo/events";
import { ADD_ANIMATION } from "@designcombo/state";
import { Animation } from "../../player/animated";
import { Easing } from "remotion";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

interface FadeEffectProps {
  trackItemId: string;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  enabled?: {
    fadeIn: boolean;
    fadeOut: boolean;
  };
}

const FadeEffect = ({
  trackItemId,
  fadeInDuration = 30,
  fadeOutDuration = 30,
  enabled = { fadeIn: false, fadeOut: false },
}: FadeEffectProps) => {
  const [localFadeInDuration, setLocalFadeInDuration] = useState(fadeInDuration);
  const [localFadeOutDuration, setLocalFadeOutDuration] = useState(fadeOutDuration);
  const [fadeInEnabled, setFadeInEnabled] = useState(enabled.fadeIn);
  const [fadeOutEnabled, setFadeOutEnabled] = useState(enabled.fadeOut);

  useEffect(() => {
    setLocalFadeInDuration(fadeInDuration);
    setLocalFadeOutDuration(fadeOutDuration);
    setFadeInEnabled(enabled.fadeIn);
    setFadeOutEnabled(enabled.fadeOut);
  }, [fadeInDuration, fadeOutDuration, enabled]);

  const applyFadeInAnimation = () => {
    const animation: Animation = {
      property: "opacity",
      from: 0,
      to: 1,
      durationInFrames: localFadeInDuration,
      ease: Easing.easeInOut,
      name: "Fade In",
      previewUrl: "https://cdn.designcombo.dev/animations/FadeIn.webp",
    };

    dispatch(ADD_ANIMATION, {
      payload: {
        id: trackItemId,
        animations: {
          in: {
            name: "fadeIn",
            composition: [animation],
          },
        },
      },
    });
    setFadeInEnabled(true);
  };

  const applyFadeOutAnimation = () => {
    const animation: Animation = {
      property: "opacity",
      from: 1,
      to: 0,
      durationInFrames: localFadeOutDuration,
      ease: Easing.easeInOut,
      name: "Fade Out",
      previewUrl: "https://cdn.designcombo.dev/animations/FadeOut.webp",
    };

    dispatch(ADD_ANIMATION, {
      payload: {
        id: trackItemId,
        animations: {
          out: {
            name: "fadeOut",
            composition: [animation],
          },
        },
      },
    });
    setFadeOutEnabled(true);
  };

  const removeFadeInAnimation = () => {
    dispatch(ADD_ANIMATION, {
      payload: {
        id: trackItemId,
        animations: {
          in: null,
        },
      },
    });
    setFadeInEnabled(false);
  };

  const removeFadeOutAnimation = () => {
    dispatch(ADD_ANIMATION, {
      payload: {
        id: trackItemId,
        animations: {
          out: null,
        },
      },
    });
    setFadeOutEnabled(false);
  };

  const toggleFadeIn = () => {
    if (fadeInEnabled) {
      removeFadeInAnimation();
    } else {
      applyFadeInAnimation();
    }
  };

  const toggleFadeOut = () => {
    if (fadeOutEnabled) {
      removeFadeOutAnimation();
    } else {
      applyFadeOutAnimation();
    }
  };

  const updateFadeInDuration = (value: number) => {
    setLocalFadeInDuration(value);
    if (fadeInEnabled) {
      applyFadeInAnimation();
    }
  };

  const updateFadeOutDuration = (value: number) => {
    setLocalFadeOutDuration(value);
    if (fadeOutEnabled) {
      applyFadeOutAnimation();
    }
  };

  return (
    <div className="space-y-4 mt-2">
      <Label className="font-sans text-xs font-semibold text-primary">Efectos de animación</Label>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine size={16} />
            <span className="text-sm">Fade In</span>
          </div>
          <Switch checked={fadeInEnabled} onCheckedChange={toggleFadeIn} />
        </div>

        {fadeInEnabled && (
          <div className="pl-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Duración</span>
              <div className="flex items-center gap-2">
                <span className="text-xs">{(localFadeInDuration / 30).toFixed(1)}s</span>
                <Slider
                  value={[localFadeInDuration]}
                  onValueChange={(value) => setLocalFadeInDuration(value[0])}
                  onValueCommit={() => updateFadeInDuration(localFadeInDuration)}
                  min={10}
                  max={120}
                  step={5}
                  className="w-28"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => applyFadeInAnimation()}
              >
                Aplicar
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownToLine size={16} />
            <span className="text-sm">Fade Out</span>
          </div>
          <Switch checked={fadeOutEnabled} onCheckedChange={toggleFadeOut} />
        </div>

        {fadeOutEnabled && (
          <div className="pl-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Duración</span>
              <div className="flex items-center gap-2">
                <span className="text-xs">{(localFadeOutDuration / 30).toFixed(1)}s</span>
                <Slider
                  value={[localFadeOutDuration]}
                  onValueChange={(value) => setLocalFadeOutDuration(value[0])}
                  onValueCommit={() => updateFadeOutDuration(localFadeOutDuration)}
                  min={10}
                  max={120}
                  step={5}
                  className="w-28"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => applyFadeOutAnimation()}
              >
                Aplicar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FadeEffect;
