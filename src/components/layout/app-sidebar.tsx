"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Shield,
  Package,
  FileText,
  ShoppingCart,
  FileCheck,
  CreditCard,
  Target,
  Brain,
  Sparkles,
  MapPin,
  CalendarDays,
  Phone,
  Settings,
  AlertTriangle,
  Truck,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: UserPlus },
  { label: "Clientes", href: "/clients", icon: Users },
  { label: "Productos", href: "/products", icon: Package },
  { label: "Presupuestos", href: "/quotes", icon: FileText },
  { label: "Ventas", href: "/sales", icon: ShoppingCart },
  { label: "Remitos", href: "/remitos", icon: FileCheck },
  { label: "Pagos", href: "/payments", icon: CreditCard },
  { label: "Proveedores", href: "/suppliers", icon: Truck },
  { label: "Órdenes de Compra", href: "/purchase-orders", icon: ClipboardList },
  { label: "Movimientos Stock", href: "/stock-movements", icon: BarChart3 },
  { label: "Competencia", href: "/competitors", icon: Target },
  { label: "AI Insights", href: "/ai-insights", icon: Brain },
  { label: "RRSS Creator", href: "/social-creator", icon: Sparkles },
  { label: "DR Scrapp", href: "/scrapper", icon: MapPin },
  { label: "Visitas", href: "/calendar/visits", icon: CalendarDays },
  { label: "Llamadas", href: "/calendar/calls", icon: Phone },
];

export function AppSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");

  useEffect(() => {
    fetch("/api/settings/message")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setMsgTitle(data.title);
          setMsgBody(data.body);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Shield className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">DR Polarizados</span>
                  <span className="text-xs text-muted-foreground">Sistema de gestión</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Configuración">
              <Link href="/settings">
                <Settings />
                <span>Configuración</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {msgTitle && msgBody && (
          <div className="mx-2 mb-2 rounded-lg border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20 p-3 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="size-4 text-yellow-600 shrink-0" />
              <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-400 truncate">{msgTitle}</span>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-500 leading-relaxed">{msgBody}</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
