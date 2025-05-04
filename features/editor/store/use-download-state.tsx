import { create } from 'zustand';

interface DownloadState {
  isExporting: boolean;
  progress: number;
  exportType: "mp4" | "json";
  payload: any;
  error: string | null;
  exportResult: any;
  actions: {
    startExport: () => void;
    setProgress: (progress: number) => void;
    completeExport: () => void;
    cancelExport: () => void;
    setExportError: (error: string | null) => void;
    setExportType: (exportType: "mp4" | "json") => void;
    setState: ({ payload }: { payload: any }) => void;
    setExportResult: (exportResult: any) => void;
  };
}

export const useDownloadState = create<DownloadState>((set) => ({
  isExporting: false,
  progress: 0,
  exportType: "mp4",
  payload: null,
  error: null,
  exportResult: null,
  actions: {
    startExport: () => set({ isExporting: true, progress: 0, error: null }),
    setProgress: (progress) => set({ progress }),
    completeExport: () => set({ isExporting: false, progress: 100 }),
    cancelExport: () => set({ isExporting: false, progress: 0 }),
    setExportError: (error) => set({ error, isExporting: false }),
    setExportType: (exportType) => set({ exportType }),
    setState: ({ payload }) => set({ payload }),
    setExportResult: (exportResult) => set({ exportResult }),
  },
}));
