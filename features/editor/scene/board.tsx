"use client";

import { useState } from "react";
import { DroppableArea } from "./droppable";
import { cn } from "@/lib/utils";
import { CSSProperties, forwardRef } from "react";

interface BoardProps {
  children: React.ReactNode;
  size: {
    width: number;
    height: number;
  };
  style?: CSSProperties;
  className?: string;
}

const Board = forwardRef<HTMLDivElement, BoardProps>(
  ({ children, size, style, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("bg-scene rounded-lg", className)}
        style={{
          width: size.width,
          height: size.height,
          margin: "auto",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 0 30px rgba(128, 55, 220, 0.5), 0 0 80px rgba(98, 33, 234, 0.3)",
          border: "1px solid rgba(156, 90, 250, 0.6)",
          backdropFilter: "blur(3px)",
          backgroundColor: "#000000",
          zIndex: 100,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Board.displayName = "Board";

const SceneBoard = ({
  size,
  children,
}: {
  size: { width: number; height: number };
  children: React.ReactNode;
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  return (
    <DroppableArea
      id="artboard"
      onDragStateChange={setIsDraggingOver}
      style={{
        width: size.width,
        height: size.height,
        zIndex: 100,
      }}
      className="pointer-events-auto"
    >
      <div
        style={{
          width: size.width,
          height: size.height,
          zIndex: 2,
          backgroundColor: "#000000",
        }}
        className={`pointer-events-none absolute border transition-colors duration-300 ease-in-out ${
          isDraggingOver
            ? "border-4 border-dashed border-purple-400 bg-white/[0.075]"
            : "border border-purple-400/60 bg-black"
        } shadow-[0_0_0_5000px_rgba(13,6,22,0.95)]`}
      />

      {/* Elementos decorativos para un aspecto más futurista - esquinas del canvas */}
      <div className="absolute top-0 right-0 left-0 h-[1px] pointer-events-none"
           style={{
             background: "linear-gradient(90deg, transparent 0%, rgba(156, 90, 250, 0.5) 50%, transparent 100%)",
             zIndex: 3,
           }}
      />
      <div className="absolute bottom-0 right-0 left-0 h-[1px] pointer-events-none"
           style={{
             background: "linear-gradient(90deg, transparent 0%, rgba(156, 90, 250, 0.5) 50%, transparent 100%)",
             zIndex: 3,
           }}
      />
      <div className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none"
           style={{
             borderWidth: "1px",
             borderStyle: "solid",
             borderColor: "rgba(156, 90, 250, 0.3)",
             borderRadius: "4px",
             zIndex: 3,
           }}
      />

      {children}
    </DroppableArea>
  );
};

export default SceneBoard;
