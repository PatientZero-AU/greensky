"use client";

import { ReactNode } from "react";

export default function CrtMonitor({ children }: { children: ReactNode }) {
  return (
    <div className="crt-monitor">
      {/* Outer bezel */}
      <div className="crt-bezel">
        {/* Top bezel label */}
        <div className="crt-bezel-top">
          <span className="crt-model-label">Model CRT-K3S</span>
        </div>

        {/* Screen area */}
        <div className="crt-screen-frame">
          <div className="crt-screen">
            {/* Scanlines overlay */}
            <div className="crt-scanlines" />
            {/* Vignette overlay */}
            <div className="crt-vignette" />
            {/* Screen reflection */}
            <div className="crt-reflection" />
            {/* Flicker layer */}
            <div className="crt-flicker">
              {children}
            </div>
          </div>
        </div>

        {/* Bottom bezel with brand and LED */}
        <div className="crt-bezel-bottom">
          <span className="crt-brand">Patient Zero™</span>
          <div className="crt-power-led" title="Power">
            <div className="crt-led-glow" />
          </div>
        </div>
      </div>
    </div>
  );
}
