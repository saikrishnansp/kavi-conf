interface RetroBackgroundProps {
  children: React.ReactNode;
  showGrid?: boolean;
  showScanlines?: boolean;
}

export function RetroBackground({
  children,
  showGrid = true,
  showScanlines = true,
}: RetroBackgroundProps) {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Retro grid pattern */}
      {showGrid && (
        <div
          className="fixed inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      )}

      {/* CRT scanlines */}
      {showScanlines && (
        <div
          className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              hsl(0 0% 0%) 2px,
              hsl(0 0% 0%) 4px
            )`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
