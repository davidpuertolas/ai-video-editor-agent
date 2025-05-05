import { useEffect, useRef, useState } from "react";
import Header from "./header";
import Ruler from "./ruler";
import { timeMsToUnits, unitsToTimeMs } from "@designcombo/timeline";
import CanvasTimeline from "./items/timeline";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { dispatch, filter, subject } from "@designcombo/events";
import {
  TIMELINE_BOUNDING_CHANGED,
  TIMELINE_PREFIX,
  SELECTION_CREATED,
  SELECTION_UPDATED,
  SELECTION_CLEARED,
} from "@designcombo/timeline";
import useStore from "../store/use-store";
import Playhead from "./playhead";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { Audio, Image, Text, Video, Caption, Helper, Track } from "./items";
import StateManager, { REPLACE_MEDIA } from "@designcombo/state";
import {
  TIMELINE_OFFSET_CANVAS_LEFT,
  TIMELINE_OFFSET_CANVAS_RIGHT,
} from "../constants/constants";
import { ITrackItem } from "@designcombo/types";
import PreviewTrackItem from "./items/preview-drag-item";
import SelectionModal from "./selection-modal";

// Monitor @designcombo/timeline constants
console.log("Timeline constants imported:", {
  TIMELINE_BOUNDING_CHANGED,
  TIMELINE_PREFIX,
  SELECTION_CREATED: (typeof SELECTION_CREATED !== 'undefined') ? SELECTION_CREATED : 'undefined',
  SELECTION_UPDATED: (typeof SELECTION_UPDATED !== 'undefined') ? SELECTION_UPDATED : 'undefined',
  SELECTION_CLEARED: (typeof SELECTION_CLEARED !== 'undefined') ? SELECTION_CLEARED : 'undefined',
});

CanvasTimeline.registerItems({
  Text,
  Image,
  Audio,
  Video,
  Caption,
  Helper,
  Track,
  PreviewTrackItem,
});

// Estilos para el contenedor de la timeline
const timelineStyles = {
  container: {
    position: "relative" as const,
    height: "100%" as const,
    width: "100%" as const,
    overflow: "hidden" as const,
    background: "linear-gradient(180deg, rgba(18, 10, 28, 0.98) 0%, rgba(12, 7, 20, 0.98) 100%)",
    borderTop: "1px solid rgba(70, 50, 120, 0.2)",
    boxShadow: "inset 0 0 30px rgba(0, 0, 0, 0.4)",
  },
  trackArea: {
    display: "flex" as const,
  },
  trackLabels: {
    position: "relative" as const,
    width: "40px" as const,
    flexGrow: 0,
    flexShrink: 0,
    background: "linear-gradient(90deg, rgba(25, 15, 40, 0.8) 0%, rgba(18, 10, 32, 0.8) 100%)",
    borderRight: "1px solid rgba(70, 50, 120, 0.2)",
    boxShadow: "2px 0 4px rgba(0, 0, 0, 0.2)",
  },
  canvasContainer: {
    position: "relative" as const,
    height: "100%" as const,
    flexGrow: 1,
  },
  canvas: {
    position: "absolute" as const,
    top: 0,
    width: "100%" as const,
  },
  scrollbarH: {
    position: "absolute" as const,
    width: "calc(100vw - 40px)" as const,
    height: "10px" as const,
    bottom: "10px",
    left: 0,
    zIndex: 10,
  },
  scrollbarV: {
    position: "absolute" as const,
    height: "100%" as const,
    width: "10px" as const,
    right: "6px",
    top: 0,
    zIndex: 10,
  },
  scrollThumb: {
    backgroundColor: "rgba(90, 60, 150, 0.4)",
    borderRadius: "10px",
    cursor: "pointer" as const,
    transition: "background-color 0.2s ease",
  },
  scrollThumbHover: {
    backgroundColor: "rgba(90, 60, 150, 0.6)",
  },
  gridPattern: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    pointerEvents: "none" as const,
    backgroundImage: "linear-gradient(0deg, rgba(90, 60, 150, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(90, 60, 150, 0.2) 1px, transparent 1px)",
    backgroundSize: "20px 20px",
    zIndex: 1,
  },
};

const EMPTY_SIZE = { width: 0, height: 0 };
const Timeline = ({ stateManager }: { stateManager: StateManager }) => {
  // prevent duplicate scroll events
  const canScrollRef = useRef(false);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<CanvasTimeline | null>(null);
  const verticalScrollbarVpRef = useRef<HTMLDivElement>(null);
  const horizontalScrollbarVpRef = useRef<HTMLDivElement>(null);
  const { scale, playerRef, fps, duration, setState, timeline } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef!);
  const [canvasSize, setCanvasSize] = useState(EMPTY_SIZE);
  const [size, setSize] = useState<{ width: number; height: number }>(
    EMPTY_SIZE,
  );
  const [hoveredScrollbar, setHoveredScrollbar] = useState<'h' | 'v' | null>(null);

  const { setTimeline } = useStore();
  const onScroll = (v: { scrollTop: number; scrollLeft: number }) => {
    if (horizontalScrollbarVpRef.current && verticalScrollbarVpRef.current) {
      verticalScrollbarVpRef.current.scrollTop = -v.scrollTop;
      horizontalScrollbarVpRef.current.scrollLeft = -v.scrollLeft;
      setScrollLeft(-v.scrollLeft);
    }
  };

  useEffect(() => {
    if (playerRef?.current) {
      canScrollRef.current = playerRef?.current.isPlaying();
    }
  }, [playerRef?.current?.isPlaying()]);

  useEffect(() => {
    const position = timeMsToUnits((currentFrame / fps) * 1000, scale.zoom);
    const canvasBoudingX =
      canvasElRef.current?.getBoundingClientRect().x! +
      canvasElRef.current?.clientWidth!;
    const playHeadPos = position - scrollLeft + 40;
    if (playHeadPos >= canvasBoudingX) {
      const scrollDivWidth = horizontalScrollbarVpRef.current?.clientWidth!;
      const totalScrollWidth = horizontalScrollbarVpRef.current?.scrollWidth!;
      const currentPosScroll = horizontalScrollbarVpRef.current?.scrollLeft!;
      const availableScroll =
        totalScrollWidth - (scrollDivWidth + currentPosScroll);
      const scaleScroll = availableScroll / scrollDivWidth;
      if (scaleScroll >= 0) {
        if (scaleScroll > 1)
          horizontalScrollbarVpRef.current?.scrollTo({
            left: currentPosScroll + scrollDivWidth,
          });
        else
          horizontalScrollbarVpRef.current?.scrollTo({
            left: totalScrollWidth - scrollDivWidth,
          });
      }
    }
  }, [currentFrame]);

  const onResizeCanvas = (payload: { width: number; height: number }) => {
    setCanvasSize({
      width: payload.width,
      height: payload.height,
    });
  };

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    const timelineContainerEl = timelineContainerRef.current;

    if (!canvasEl || !timelineContainerEl) return;

    const containerWidth = timelineContainerEl.clientWidth - 40;
    const containerHeight = timelineContainerEl.clientHeight - 90;
    const canvas = new CanvasTimeline(canvasEl, {
      width: containerWidth,
      height: containerHeight,
      bounding: {
        width: containerWidth,
        height: 0,
      },
      selectionColor: "rgba(156, 90, 250, 0.2)",
      selectionBorderColor: "rgba(156, 90, 250, 1.0)",
      onScroll,
      onResizeCanvas,
      scale: scale,
      state: stateManager,
      duration,
      spacing: {
        left: TIMELINE_OFFSET_CANVAS_LEFT,
        right: TIMELINE_OFFSET_CANVAS_RIGHT,
      },
      sizesMap: {
        caption: 32,
        text: 32,
        audio: 36,
        customTrack: 40,
        customTrack2: 40,
      },
      acceptsMap: {
        text: ["text", "caption"],
        image: ["image", "video"],
        video: ["video", "image"],
        audio: ["audio"],
        caption: ["caption", "text"],
        template: ["template"],
        customTrack: ["video", "image"],
        customTrack2: ["video", "image"],
        main: ["video", "image"],
      },
      guideLineColor: "rgba(156, 90, 250, 0.8)",
    });

    canvasRef.current = canvas;

    setCanvasSize({ width: containerWidth, height: containerHeight });
    setSize({
      width: containerWidth,
      height: 0,
    });
    setTimeline(canvas);

    const resizeDesignSubscription = stateManager.subscribeToSize(
      (newState) => {
        setState(newState);
      },
    );
    const scaleSubscription = stateManager.subscribeToScale((newState) => {
      setState(newState);
    });

    const tracksSubscription = stateManager.subscribeToState((newState) => {
      setState(newState);
    });
    const durationSubscription = stateManager.subscribeToDuration(
      (newState) => {
        setState(newState);
      },
    );

    const updateTrackItemsMap = stateManager.subscribeToUpdateTrackItem(() => {
      const currentState = stateManager.getState();
      setState({
        duration: currentState.duration,
        trackItemsMap: currentState.trackItemsMap,
      });
    });

    const itemsDetailsSubscription = stateManager.subscribeToAddOrRemoveItems(
      () => {
        const currentState = stateManager.getState();
        setState({
          trackItemDetailsMap: currentState.trackItemDetailsMap,
          trackItemsMap: currentState.trackItemsMap,
          trackItemIds: currentState.trackItemIds,
          tracks: currentState.tracks,
        });
      },
    );

    const updateItemDetailsSubscription =
      stateManager.subscribeToUpdateItemDetails(() => {
        const currentState = stateManager.getState();
        setState({
          trackItemDetailsMap: currentState.trackItemDetailsMap,
        });
      });

    return () => {
      canvas.purge();
      scaleSubscription.unsubscribe();
      tracksSubscription.unsubscribe();
      durationSubscription.unsubscribe();
      itemsDetailsSubscription.unsubscribe();
      updateTrackItemsMap.unsubscribe();
      updateItemDetailsSubscription.unsubscribe();
      resizeDesignSubscription.unsubscribe();
    };
  }, []);

  const handleOnScrollH = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (canScrollRef.current) {
      const canvas = canvasRef.current!;
      canvas.scrollTo({ scrollLeft });
    }
    setScrollLeft(scrollLeft);
  };

  const handleOnScrollV = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (canScrollRef.current) {
      const canvas = canvasRef.current!;
      canvas.scrollTo({ scrollTop });
    }
  };

  useEffect(() => {
    const timelineEvents = subject.pipe(
      filter(({ key }) => key.startsWith(TIMELINE_PREFIX)),
    );

    const subscription = timelineEvents.subscribe((obj) => {
      console.log("Timeline event:", obj.key, obj.value);
      if (obj.key === TIMELINE_BOUNDING_CHANGED) {
        const bounding = obj.value?.payload?.bounding;
        if (bounding) {
          setSize({
            width: bounding.width,
            height: bounding.height,
          });
        }
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleReplaceItem = (trackItem: Partial<ITrackItem>) => {
    const id = trackItem.id!;
    dispatch(REPLACE_MEDIA, {
      payload: {
        id,
        mediaSource: trackItem.details?.src!,
      },
    });
  };

  const onClickRuler = (units: number) => {
    if (!playerRef?.current) return;
    const time = unitsToTimeMs(units, scale.zoom);
    const frame = (time * fps) / 1000;
    playerRef?.current.seekTo(frame);
  };

  return (
    <div
      ref={timelineContainerRef}
      id={"timeline-container"}
      style={timelineStyles.container}
    >
      <Header />
      <Ruler onClick={onClickRuler} scrollLeft={scrollLeft} />
      <Playhead scrollLeft={scrollLeft} />

      {/* Grid pattern overlay */}
      <div style={timelineStyles.gridPattern}></div>

      <div style={timelineStyles.trackArea}>
        <div style={timelineStyles.trackLabels}></div>
        <div style={{ ...timelineStyles.canvasContainer, height: canvasSize.height }}>
          <div
            style={{ ...timelineStyles.canvas, height: canvasSize.height }}
            ref={containerRef}
          >
            <canvas
              id="designcombo-timeline-canvas"
              ref={canvasElRef}
              style={{
                background: "rgba(15, 8, 22, 0.2)",
                boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.3)",
                borderRadius: "2px",
              }}
            />
          </div>

          {/* Scrollbars con estilo mejorado */}
          <ScrollArea.Root
            type="always"
            style={timelineStyles.scrollbarH}
            className="ScrollAreaRootH"
            onPointerDown={() => {
              canScrollRef.current = true;
            }}
            onPointerUp={() => {
              canScrollRef.current = false;
            }}
            onMouseEnter={() => setHoveredScrollbar('h')}
            onMouseLeave={() => setHoveredScrollbar(null)}
          >
            <ScrollArea.Viewport
              onScroll={handleOnScrollH}
              className="ScrollAreaViewport"
              id="viewportH"
              ref={horizontalScrollbarVpRef}
            >
              <div
                style={{
                  width:
                    size.width > canvasSize.width
                      ? size.width + TIMELINE_OFFSET_CANVAS_RIGHT
                      : size.width,
                }}
                className="pointer-events-none h-[10px]"
              ></div>
            </ScrollArea.Viewport>

            <ScrollArea.Scrollbar
              className="ScrollAreaScrollbar"
              orientation="horizontal"
              style={{
                background: hoveredScrollbar === 'h' ? "rgba(35, 20, 60, 0.3)" : "transparent",
                transition: "background 0.2s ease",
              }}
            >
              <ScrollArea.Thumb
                onMouseDown={() => {
                  canScrollRef.current = true;
                }}
                onMouseUp={() => {
                  canScrollRef.current = false;
                }}
                style={hoveredScrollbar === 'h' ? { ...timelineStyles.scrollThumb, ...timelineStyles.scrollThumbHover } : timelineStyles.scrollThumb}
                className="ScrollAreaThumb"
              />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          <ScrollArea.Root
            type="always"
            style={timelineStyles.scrollbarV}
            className="ScrollAreaRootV"
            onMouseEnter={() => setHoveredScrollbar('v')}
            onMouseLeave={() => setHoveredScrollbar(null)}
          >
            <ScrollArea.Viewport
              onScroll={handleOnScrollV}
              className="ScrollAreaViewport"
              ref={verticalScrollbarVpRef}
            >
              <div
                style={{
                  height:
                    size.height > canvasSize.height
                      ? size.height + 40
                      : canvasSize.height,
                }}
                className="pointer-events-none w-[10px]"
              ></div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className="ScrollAreaScrollbar"
              orientation="vertical"
              style={{
                background: hoveredScrollbar === 'v' ? "rgba(35, 20, 60, 0.3)" : "transparent",
                transition: "background 0.2s ease",
              }}
            >
              <ScrollArea.Thumb
                onMouseDown={() => {
                  canScrollRef.current = true;
                }}
                onMouseUp={() => {
                  canScrollRef.current = false;
                }}
                style={hoveredScrollbar === 'v' ? { ...timelineStyles.scrollThumb, ...timelineStyles.scrollThumbHover } : timelineStyles.scrollThumb}
                className="ScrollAreaThumb"
              />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          {/* Glass overlay effect para los bordes del área de timeline */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              boxShadow: "inset 0 0 0 1px rgba(70, 50, 120, 0.2)",
              borderRadius: "2px",
              zIndex: 5,
            }}
          ></div>
        </div>
      </div>

      {/* Selection Modal */}
      <SelectionModal />
    </div>
  );
};

export default Timeline;
