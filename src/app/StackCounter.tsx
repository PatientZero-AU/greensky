"use client";

const TECHNOLOGIES = [
  "GnuCOBOL",
  "Python",
  "MQTT",
  "Mosquitto",
  "WebSockets",
  "Docker",
  "K3s",
  "Longhorn Storage",
  "Cloudflare Tunnel",
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "Canvas API",
  "nginx",
  "ARM64 Linux",
  "Raspberry Pi 5",
  "adsb.lol API",
];

const VENDOR_COUNT = 15;

export default function StackCounter() {
  return (
    <div className="stack-counter">
      <div className="stack-counter-number">
        <span className="stack-count-value">{TECHNOLOGIES.length}</span>
        <span className="stack-count-label"> technologies</span>
        <span className="stack-count-separator">, </span>
        <span className="stack-count-value">{VENDOR_COUNT}</span>
        <span className="stack-count-label"> vendors</span>
      </div>
      <div className="stack-counter-punchline">
        — to show dots on a map
      </div>
      <div className="stack-counter-links">
        <a
          href="https://paul-seymour.com/articles/human-of-the-gaps"
          target="_blank"
          rel="noopener noreferrer"
          className="stack-link"
        >
          Read the blog post →
        </a>
        <a
          href="https://github.com/PatientZero-AU/cobol-flight-tracker"
          target="_blank"
          rel="noopener noreferrer"
          className="stack-link"
        >
          View on GitHub →
        </a>
      </div>
    </div>
  );
}
