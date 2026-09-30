# Contributing to ReconLens

ReconLens is a consent-first cybersecurity education project. Contributions are welcome when they improve clarity, reliability, accessibility, documentation, or educational value without weakening participant consent.

## Ground Rules

- Do not add stealth collection.
- Do not bypass browser permission prompts.
- Do not remotely activate camera or microphone.
- Do not add exploit code.
- Do not obscure what the participant page is doing.
- Keep sensitive actions participant-initiated.

## Development

```powershell
npm install
npm run dev
```

Before opening a pull request:

```powershell
npm run build
npm audit --omit=dev
```

## Pull Request Checklist

- The change preserves the consent-first model.
- User-facing copy is clear and non-deceptive.
- The dashboard and participant page remain usable on desktop and mobile.
- Build passes.
- Documentation is updated when behavior changes.

## Reporting Issues

When filing a bug, include:

- Windows version
- Node.js version
- ReconLens version
- Tunnel provider, if relevant
- Steps to reproduce
- Expected result
- Actual result
