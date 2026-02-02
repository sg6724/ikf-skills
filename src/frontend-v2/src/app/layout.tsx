import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IKF AI Skills Playground",
  description: "AI-powered agent for content strategy, hygiene checks, and reports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
