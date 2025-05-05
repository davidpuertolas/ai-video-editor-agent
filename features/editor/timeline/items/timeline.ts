import TimelineBase from "@designcombo/timeline";
import Video from "./video";
import { throttle } from "lodash";
import Audio from "./audio";
import { TimelineOptions } from "@designcombo/timeline";
import { ITimelineScaleState } from "@designcombo/types";
import { dispatch } from "@designcombo/events";

// Constante para el evento de selección de elementos
export const TIMELINE_SELECTION_MODAL = "timeline/selection-modal";

class Timeline extends TimelineBase {
  public isShiftKey: boolean = false;
  constructor(
    canvasEl: HTMLCanvasElement,
    options: Partial<TimelineOptions> & {
      scale: ITimelineScaleState;
      duration: number;
      guideLineColor?: string;
    },
  ) {
    super(canvasEl, options); // Call the parent class constructor

    // Add shift keyboard listener
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    // Monitor selection events
    console.log("Timeline instance created - Adding event listeners for monitoring selection");

    // Override or extend methods related to selection
    const originalMouseDown = this.onMouseDown;
    const originalMouseMove = this.onMouseMove;
    const originalMouseUp = this.onMouseUp;

    // Override mousedown
    this.onMouseDown = (e: any) => {
      console.log("Timeline - Mouse Down Event", e);
      return originalMouseDown.call(this, e);
    };

    // Override mousemove
    this.onMouseMove = (e: any) => {
      if (this._currentTransform) {
        console.log("Timeline - Mouse Move with active transform", e);
      }
      return originalMouseMove.call(this, e);
    };

    // Override mouseup
    this.onMouseUp = (e: any) => {
      console.log("Timeline - Mouse Up Event", e);
      if (this.getActiveObjects && this.getActiveObjects().length > 0) {
        console.log("Timeline - Selected objects after mouseup:", this.getActiveObjects());
      }
      return originalMouseUp.call(this, e);
    };

    // Monitor selection changes
    if (this.on) {
      this.on('selection:created', (e: any) => {
        console.log('Timeline - Selection created event:', e);

        // Check if this is a mouseup event (selection by drag)
        if (e.e && e.e.type === 'mouseup' && e.selected && e.selected.length > 0) {
          // Dispatch an event to show the modal with the selected items
          dispatch(TIMELINE_SELECTION_MODAL, {
            payload: {
              selectedItems: e.selected,
              position: { x: e.e.clientX, y: e.e.clientY },
              source: 'drag-selection'
            }
          });
        }
      });

      this.on('selection:updated', (e: any) => {
        console.log('Timeline - Selection updated event:', e);
      });

      this.on('selection:cleared', (e: any) => {
        console.log('Timeline - Selection cleared event:', e);
      });
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Shift") {
      this.isShiftKey = true;
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Shift") {
      this.isShiftKey = false;
    }
  };

  public purge(): void {
    super.purge();

    // Cleanup event listener for Shift key
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  public setViewportPos(posX: number, posY: number) {
    const limitedPos = this.getViewportPos(posX, posY);
    const vt = this.viewportTransform;
    vt[4] = limitedPos.x;
    vt[5] = limitedPos.y;
    this.requestRenderAll();
    this.setActiveTrackItemCoords();
    this.onScrollChange();

    this.onScroll?.({
      scrollTop: limitedPos.y,
      scrollLeft: limitedPos.x - this.spacing.left,
    });
  }

  public onScrollChange = throttle(async () => {
    const objects = this.getObjects();
    const viewportTransform = this.viewportTransform;
    const scrollLeft = viewportTransform[4];
    for (const object of objects) {
      if (object instanceof Video || object instanceof Audio) {
        object.onScrollChange({ scrollLeft });
      }
    }
  }, 250);

  public scrollTo({
    scrollLeft,
    scrollTop,
  }: {
    scrollLeft?: number;
    scrollTop?: number;
  }): void {
    const vt = this.viewportTransform; // Create a shallow copy
    let hasChanged = false;

    if (typeof scrollLeft === "number") {
      vt[4] = -scrollLeft + this.spacing.left;
      hasChanged = true;
    }
    if (typeof scrollTop === "number") {
      vt[5] = -scrollTop;
      hasChanged = true;
    }

    if (hasChanged) {
      this.viewportTransform = vt;
      this.getActiveObject()?.setCoords();
      this.onScrollChange();
      this.requestRenderAll();
    }
  }
}

export default Timeline;
