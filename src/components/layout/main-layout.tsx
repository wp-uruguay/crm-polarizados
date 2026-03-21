"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import logoColonia from "@/public/Logo.png";
import { CurrencyProvider, useCurrency } from "@/contexts/currency-context";

const UserMenu = dynamic(
  () => import("@/components/layout/user-menu").then((m) => ({ default: m.UserMenu })),
  { ssr: false }
);

function CurrencyToggle() {
  const { currency, rate, loading, toggle } = useCurrency();
  return (
    <button
      onClick={toggle}
      title={rate ? `1 USD = $${rate.toLocaleString("es-AR")} ARS` : "Cargando cotización..."}
      className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold transition-colors hover:bg-muted"
    >
      <span className={currency === "USD" ? "text-foreground" : "text-muted-foreground"}>USD</span>
      <span className="text-muted-foreground/40">/</span>
      <span className={currency === "ARS" ? "text-foreground" : "text-muted-foreground"}>ARS</span>
      {loading && <span className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
    </button>
  );
}

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function MainLayout({ children, title = "Dashboard" }: MainLayoutProps) {
  return (
    <CurrencyProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-4" />
            <span className="flex-1 text-sm font-medium text-muted-foreground">{title}</span>
            <CurrencyToggle />
            <Separator orientation="vertical" className="mx-2 h-4" />
            <NotificationBell />
            <Separator orientation="vertical" className="mx-2 h-4" />
            <UserMenu />
          </header>
          <div className="flex flex-1 flex-col p-6">
            {children}
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-end gap-2 border-t px-6 py-2 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Copyright</span>
            <span className="opacity-40">·</span>
            <span>Desarrollado por</span>
            <a
              href="https://colonia.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center overflow-hidden"
              aria-label="colonia.cloud"
            >
              <span
                className="absolute inset-0 flex items-center justify-start whitespace-nowrap text-xs font-medium
                  translate-y-full opacity-0 transition-all duration-300 ease-out
                  group-hover:translate-y-0 group-hover:opacity-100"
              >
                colonia.cloud
              </span>
              <Image
                src={logoColonia}
                alt="Colonia Cloud"
                height={16}
                className="object-contain opacity-50 transition-all duration-300 ease-out
                  group-hover:-translate-y-full group-hover:opacity-0"
              />
            </a>
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </CurrencyProvider>
  );
}
