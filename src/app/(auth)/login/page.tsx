"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import logoColonia from "@/public/Logo.png";
import logoBlanco from "@/public/logo-blanco.webp";

// ─── Particle canvas ───────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const PARTICLE_COUNT = 160;
    const particles: Particle[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function spawn(): Particle {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const speed = 0.18 + Math.random() * 0.22;
      const angle = (Math.random() * Math.PI) / 6 + (dir === 1 ? 0 : Math.PI);
      return {
        x: Math.random() * (canvas?.width ?? window.innerWidth),
        y: Math.random() * (canvas?.height ?? window.innerHeight),
        vx: Math.cos(angle) * speed * dir,
        vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.15,
        size: 0.4 + Math.random() * 0.9,
        alpha: 0.15 + Math.random() * 0.45,
      };
    }

    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(spawn());

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        // wrap around
        if (p.x < -2) p.x = canvas.width + 2;
        if (p.x > canvas.width + 2) p.x = -2;
        if (p.y < -2) p.y = canvas.height + 2;
        if (p.y > canvas.height + 2) p.y = -2;
      }

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0"
    />
  );
}

// ─── Login page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Credenciales incorrectas. Intente nuevamente.");
      } else {
        router.push("/");
      }
    } catch {
      setError("Error al iniciar sesión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_60%_30%,#1c1c1c_0%,#0d0d0d_55%,#000000_100%)]" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Particles */}
      <ParticleCanvas />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src={logoBlanco}
            alt="DR Polarizados"
            width={180}
            height={60}
            className="object-contain drop-shadow-lg"
            priority
          />
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
          <p className="mb-6 text-center text-sm text-white/50">
            Ingresá tus credenciales para acceder al sistema
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 border border-red-500/20">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="email" className="text-white/70 text-xs uppercase tracking-wide">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-white/30 focus:ring-0"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-white/70 text-xs uppercase tracking-wide">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-white/30 focus:ring-0"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-white text-black hover:bg-white/90 font-semibold transition-all"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 left-0 right-0 z-10 flex items-center justify-center gap-2 text-white/30 text-xs select-none">
        <span>© {new Date().getFullYear()} Copyright</span>
        <span className="opacity-40">·</span>
        <span>Desarrollado por</span>

        {/* Logo con hover reveal */}
        <a
          href="https://colonia.cloud"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center overflow-hidden"
          aria-label="colonia.cloud"
        >
          {/* URL que sale deslizándose desde abajo */}
          <span
            className="absolute inset-0 flex items-center justify-start whitespace-nowrap text-xs font-medium text-white/70
              translate-y-full opacity-0 transition-all duration-300 ease-out
              group-hover:translate-y-0 group-hover:opacity-100"
          >
            colonia.cloud
          </span>

          {/* Logo que sube y se oculta en hover */}
          <Image
            src={logoColonia}
            alt="Colonia Cloud"
            height={18}
            className="object-contain opacity-40 transition-all duration-300 ease-out
              group-hover:-translate-y-full group-hover:opacity-0"
          />
        </a>
      </div>
    </div>
  );
}
