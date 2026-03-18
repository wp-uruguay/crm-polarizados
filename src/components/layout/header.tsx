"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { LogOut, ChevronDown, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-white px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <User className="h-5 w-5" />
          <span>{session?.user?.name ?? "Usuario"}</span>
          <span className="text-xs text-gray-500">
            {(session?.user as { role?: string })?.role ?? ""}
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1 w-48 rounded-md border bg-white py-1 shadow-lg">
            <div className="border-b px-4 py-2">
              <p className="text-sm font-medium text-gray-900">
                {session?.user?.name}
              </p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>

            <form
              action={async () => {
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 rounded-none px-4 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                )}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
