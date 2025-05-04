import { ThemeProvider } from "@/components/theme-provider";
import "non.geist";
import "@/styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Remotion Captions",
  description: "Video caption editor with Remotion",
};

function getInitialThemeScript() {
  return {
    __html: `
      (function() {
        const storageKey = 'vite-ui-theme';
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const storedTheme = localStorage.getItem(storageKey);

        if (storedTheme === "dark" ||
           (storedTheme === "system" && darkModeMediaQuery.matches) ||
           (!storedTheme && darkModeMediaQuery.matches)) {
          document.documentElement.classList.add('dark');
          document.documentElement.style.backgroundColor = 'rgb(13, 6, 19)';
        } else {
          document.documentElement.classList.remove('dark');
        }
      })();
    `,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script dangerouslySetInnerHTML={getInitialThemeScript()} />
        <style>{`
          body {
            background-color: rgb(13, 6, 19);
          }
        `}</style>
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          storageKey="vite-ui-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
