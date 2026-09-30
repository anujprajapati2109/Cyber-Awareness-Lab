# Security Policy

ReconLens is built for cybersecurity education and awareness.

## Scope

Security reports should focus on vulnerabilities in ReconLens itself, including:

- unintended data exposure,
- unsafe permission handling,
- tunnel URL handling issues,
- cross-site scripting,
- broken authorization assumptions,
- dependency security problems.

## Explicit Non-Goals

ReconLens should not include:

- browser permission bypasses,
- exploit chains,
- hidden hardware activation,
- covert tracking,
- persistence mechanisms,
- unauthorized data collection.

## Reporting

Open a private security advisory on GitHub if available, or contact the repository owner directly.

Please include:

- affected version,
- reproduction steps,
- impact,
- suggested mitigation if known.

## Design Principle

Every sensitive action must be visible to the participant and initiated through standard browser permission prompts or explicit participant controls.
