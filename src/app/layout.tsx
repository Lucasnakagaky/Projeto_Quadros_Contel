import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pipes",
  description: "Gerencie seus processos com pipes estilo Kanban, com cards pai e filho",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
