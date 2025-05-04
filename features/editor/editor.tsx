"use client";
import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import Scene from "./scene";
import StateManager from "@designcombo/state";
import { useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import MenuList from "./menu-list";
import { MenuItem } from "./menu-item";
import CropModal from "./crop-modal/crop-modal";
import useDataState from "./store/use-data-state";
import { FONTS } from "./data/fonts";
import FloatingControl from "./control-item/floating-controls/floating-control";
import AIChat from "@/components/ai-chat";
import { StateManagerProvider } from "./hooks/state-manager";

// Estilos para asegurar fondo oscuro
const darkModeStyles = {
  backgroundColor: "rgb(13, 6, 19)",
  color: "white"
};

const stateManager = new StateManager({
  size: {
    width: 1080,
    height: 1920,
  },
});

const Editor = () => {
  const [projectName, setProjectName] = useState<string>("Untitled video");
  const timelinePanelRef = useRef<ImperativePanelHandle>(null);
  const aiChatPanelRef = useRef<ImperativePanelHandle>(null);
  const { timeline, playerRef } = useStore();
  const [showAIChat, setShowAIChat] = useState<boolean>(true);

  useTimelineEvents();

  const { setCompactFonts, setFonts } = useDataState();

  useEffect(() => {
    setCompactFonts(getCompactFontData(FONTS));
    setFonts(FONTS);
  }, []);

  useEffect(() => {
    loadFonts([
      {
        name: SECONDARY_FONT,
        url: SECONDARY_FONT_URL,
      },
    ]);

    // Asegurar que el body tenga el fondo oscuro
    document.body.style.backgroundColor = "rgb(13, 6, 19)";
  }, []);

  useEffect(() => {
    const screenHeight = window.innerHeight;
    const desiredHeight = 300;
    const percentage = (desiredHeight / screenHeight) * 100;
    timelinePanelRef.current?.resize(percentage);

    // Establecer un ancho inicial para el panel del chat
    const screenWidth = window.innerWidth;
    const desiredWidth = 300;
    const widthPercentage = (desiredWidth / screenWidth) * 100;
    aiChatPanelRef.current?.resize(widthPercentage);
  }, []);

  const handleTimelineResize = () => {
    const timelineContainer = document.getElementById("timeline-container");
    if (!timelineContainer) return;

    timeline?.resize(
      {
        height: timelineContainer.clientHeight - 90,
        width: timelineContainer.clientWidth - 40,
      },
      {
        force: true,
      },
    );
  };

  useEffect(() => {
    const onResize = () => handleTimelineResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [timeline]);

  const toggleAIChat = () => {
    setShowAIChat(!showAIChat);
  };

  return (
    <StateManagerProvider stateManager={stateManager}>
      <div className="flex h-screen w-screen flex-col" style={darkModeStyles}>
        <Navbar
          projectName={projectName}
          user={null}
          stateManager={stateManager}
          setProjectName={setProjectName}
          onToggleAIChat={toggleAIChat}
          showAIChat={showAIChat}
        />
        <div className="flex flex-1">
          <ResizablePanelGroup style={{ flex: 1 }} direction="horizontal">
            <ResizablePanel defaultSize={80}>
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel className="relative" defaultSize={70}>
                  <FloatingControl />
                  <div className="flex h-full flex-1">
                    <div className="bg-sidebar flex flex-none border-r border-border/80">
                      <MenuList />
                      <MenuItem />
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        position: "relative",
                        flex: 1,
                        overflow: "hidden",
                        backgroundColor: "rgb(13, 6, 19)"
                      }}
                    >
                      <CropModal />
                      <Scene stateManager={stateManager} />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel
                  className="min-h-[50px]"
                  ref={timelinePanelRef}
                  defaultSize={30}
                  onResize={handleTimelineResize}
                >
                  {playerRef && <Timeline stateManager={stateManager} />}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            {showAIChat && (
              <>
                <ResizableHandle className="bg-purple-900/20 hover:bg-purple-800/30 transition-colors duration-300" />
                <ResizablePanel
                  className="min-w-[380px] max-w-[500px] bg-transparent"
                  ref={aiChatPanelRef}
                  defaultSize={30}
                >
                  <AIChat />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </StateManagerProvider>
  );
};

export default Editor;
