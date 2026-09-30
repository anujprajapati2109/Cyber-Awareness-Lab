import { educationalNotes, type DashboardSnapshot } from "../../shared/types";
import { sessionsToCsv } from "./exportService";

export function snapshotToJson(snapshot: DashboardSnapshot) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      event: snapshot.event,
      participantCount: snapshot.participantCount,
      sessions: snapshot.sessions,
      timeline: snapshot.timeline,
      educationalNotes
    },
    null,
    2
  );
}

export function snapshotToCsv(snapshot: DashboardSnapshot) {
  return sessionsToCsv(snapshot.sessions);
}

export function snapshotToPdf(snapshot: DashboardSnapshot): Buffer {
  const lines = [
    "ReconLens Report",
    `Event: ${snapshot.event.name}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Participants: ${snapshot.participantCount}`,
    "",
    "Session Summary",
    ...snapshot.sessions.flatMap((session) => [
      `${session.id} - ${session.status} - opened ${session.openedAt}`,
      `Browser: ${session.automaticInfo.browser} ${session.automaticInfo.browserVersion}`,
      `Device: ${session.automaticInfo.deviceType} / ${session.automaticInfo.operatingSystem}`,
      `Network: ${session.automaticInfo.publicIp} / ${session.automaticInfo.isp}`,
      `Permissions: ${Object.entries(session.permissions).map(([key, value]) => `${key}: ${value.decision}`).join(", ")}`,
      ""
    ]),
    "Timeline",
    ...snapshot.timeline.slice().reverse().map((item) => `${new Date(item.timestamp).toLocaleTimeString()} - ${item.label}${item.detail ? ` - ${item.detail}` : ""}`),
    "",
    "Educational Notes",
    ...Object.values(educationalNotes).flatMap((note) => [
      note.title,
      `What was collected: ${note.collected}`,
      `Why available: ${note.availability}`,
      `Potential misuse: ${note.misuse}`,
      `Protection: ${note.protection}`,
      ""
    ])
  ];
  return createTextPdf(lines);
}

function createTextPdf(lines: string[]): Buffer {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const lineHeight = 14;
  const maxLines = Math.floor((pageHeight - margin * 2) / lineHeight);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += maxLines) pages.push(lines.slice(i, i + maxLines));

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  for (const pageLines of pages) {
    const content = [
      "BT",
      "/F1 10 Tf",
      `${margin} ${pageHeight - margin} Td`,
      ...pageLines.flatMap((line, index) => [`${index === 0 ? "" : `0 -${lineHeight} Td`}`, `(${escapePdfText(line).slice(0, 150)}) Tj`]).filter(Boolean),
      "ET"
    ].join("\n");
    const contentId = addObject(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    pageIds.push(
      addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    );
  }
  const pagesId = addObject(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  for (const pageId of pageIds) objects[pageId - 1] = objects[pageId - 1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

function escapePdfText(value: string) {
  return value.replace(/[\\()]/g, (match) => `\\${match}`).replace(/[^\x20-\x7E]/g, "?");
}
