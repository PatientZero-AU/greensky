"use client";

const TECHNOLOGIES = [
  "GnuCOBOL",
  "Docker",
  "K3s",
  "Longhorn",
  "Cloudflare Tunnel",
  "MQTT",
  "Mosquitto",
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "Canvas API",
  "nginx Ingress",
  "ARM64 Linux",
  "OpenSky API",
];

const VENDOR_COUNT = 12;

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
