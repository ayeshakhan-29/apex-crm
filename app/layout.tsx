import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";


export const metadata: Metadata = {
  title: "Apex",
  description: "Apex CRM - Full-stack customer relationship management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
