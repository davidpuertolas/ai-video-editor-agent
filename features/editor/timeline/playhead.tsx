import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import useStore from "../store/use-store";
import { MouseEvent, TouchEvent, useEffect, useRef, useState } from "react";
import { timeMsToUnits, unitsToTimeMs } from "../utils/timeline";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "../constants/constants";

const Playhead = ({ scrollLeft }: { scrollLeft: number }) => {
  const playheadRef = useRef<HTMLDivElement>(null);
  const { playerRef, fps, scale } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef!);
  const position =
    timeMsToUnits((currentFrame / fps) * 1000, scale.zoom) - scrollLeft;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(position);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (
    e:
      | MouseEvent<HTMLDivElement, globalThis.MouseEvent>
      | TouchEvent<HTMLDivElement>,
  ) => {
    e.preventDefault(); // Prevent default drag behavior
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setDragStartPosition(position);
  };

  const handleMouseMove = (
    e: globalThis.MouseEvent | globalThis.TouchEvent,
  ) => {
    if (isDragging) {
      e.preventDefault(); // Prevent default drag behavior
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const delta = clientX - dragStartX + scrollLeft;
      const newPosition = dragStartPosition + delta;

      const time = unitsToTimeMs(newPosition, scale.zoom);
      playerRef?.current?.seekTo((time * fps) / 1000);
    }
  };

  useEffect(() => {
    const preventDefaultDrag = (e: Event) => {
      e.preventDefault();
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
      document.addEventListener("dragstart", preventDefaultDrag);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.removeEventListener("dragstart", preventDefaultDrag);
    }

    // Cleanup event listeners on component unmount
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.removeEventListener("dragstart", preventDefaultDrag);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={playheadRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onDragStart={(e) => e.preventDefault()}
      style={{
        position: "absolute",
        left: 40 + TIMELINE_OFFSET_CANVAS_LEFT + position,
        top: 50,
        width: 1,
        height: "calc(100% - 40px)",
        zIndex: 10,
        cursor: "pointer",
        touchAction: "none", // Prevent default touch actions
      }}
    >
      {/* Playhead marker at the top */}
      <div
        style={{
          position: "absolute",
          top: -2,
          left: -6,
          width: 12,
          height: 12,
          borderRadius: "50% 50% 0 0",
          background: "linear-gradient(135deg, #b388ff 0%, #8c5bd8 100%)",
          boxShadow: "0 0 8px rgba(179, 136, 255, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          transform: "translateY(-50%)",
          transition: "box-shadow 0.2s ease-in-out",
        }}
        className="hover:shadow-[0_0_12px_rgba(179,136,255,1)]"
      ></div>

      {/* Playhead line with glow effect */}
      <div className="relative h-full">
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "3px",
            height: "100%",
            background: "rgba(179, 136, 255, 0.15)",
            filter: "blur(2px)",
            transform: "translateX(-50%)",
          }}
        ></div>

        {/* Bright line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1px",
            height: "100%",
            background: "#b388ff",
            transform: "translateX(-50%)",
            boxShadow: "0 0 3px rgba(179, 136, 255, 0.8)",
          }}
        ></div>

        {/* Animated pulse effect */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1px",
            height: "100%",
            background: "rgba(179, 136, 255, 0.5)",
            transform: "translateX(-50%)",
            animation: "playheadPulse 2s infinite ease-in-out",
          }}
        ></div>
      </div>

      {/* Small marker dots along the playhead */}
      {[0.2, 0.4, 0.6, 0.8].map((pos) => (
        <div
          key={pos}
          style={{
            position: "absolute",
            top: `${pos * 100}%`,
            left: 0,
            width: "3px",
            height: "3px",
            borderRadius: "50%",
            background: "rgba(179, 136, 255, 0.6)",
            transform: "translate(-50%, -50%)",
          }}
        ></div>
      ))}

      {/* CSS for playhead animations */}
      <style jsx>{`
        @keyframes playheadPulse {
          0% { opacity: 0.3; height: 30%; top: 0; }
          50% { opacity: 0.8; height: 70%; top: 15%; }
          100% { opacity: 0.3; height: 30%; top: 0; }
        }
      `}</style>
    </div>
  );
};

export default Playhead;
