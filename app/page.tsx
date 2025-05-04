"use client";

import Editor from "@/features/editor";
import useDataState from "@/features/editor/store/use-data-state";
import { getCompactFontData } from "@/features/editor/utils/fonts";
import { FONTS } from "@/features/editor/data/fonts";
import { useEffect } from "react";

export default function Home() {
  const { setCompactFonts, setFonts } = useDataState();

  useEffect(() => {
    setCompactFonts(getCompactFontData(FONTS));
    setFonts(FONTS);
  }, []);

  return <Editor />;
}
