"use client";

const TECH_TAGS = [
  "K3s",
  "ARM64",
  "Raspberry Pi 5",
  "Longhorn Storage",
  "COBOL",
  "MQTT",
  "GnuCOBOL",
];

export default function InfraBanner() {
  return (
    <div className="infra-banner">
      <div className="infra-live-indicator">
        <span className="infra-ping-dot" />
        <span className="infra-live-text">
          Running live on a Raspberry Pi 5 K3s cluster
        </span>
      </div>
      <div className="infra-tags">
        {TECH_TAGS.map((tag) => (
          <span key={tag} className="infra-tag">
            {tag}
          </span>
        ))}
      </div>
      <div className="infra-brand">
        <a
          href="https://paul-seymour.com"
          target="_blank"
          rel="noopener noreferrer"
          className="infra-brand-link"
        >
          Patient Zero — 10,000 Spoons
        </a>
      </div>
    </div>
  );
}
