import { useEffect, useRef, useState } from "react";
import { disclaimer, educationalNotes, permissionDescriptions, type LabEvent, type ParticipantSession, type PermissionKey } from "../../shared/types";
import { Layout } from "../components/Layout";
import { API_BASE, api } from "../utils/api";
import { collectAutomaticInfo } from "../utils/collect";

type Props = {
  eventId: string;
};

const permissionButtons: PermissionKey[] = ["location", "camera", "microphone", "notifications", "clipboard"];

export function Participant({ eventId }: Props) {
  const [event, setEvent] = useState<LabEvent | null>(null);
  const [session, setSession] = useState<ParticipantSession | null>(null);
  const [error, setError] = useState("");
  const [scanStep, setScanStep] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let active = true;
    api
      .event(eventId)
      .then(async (labEvent) => {
        if (!active) return;
        setEvent(labEvent);
        const automatic = await collectAutomaticInfo();
        const opened = await api.openParticipant(eventId, automatic);
        if (active) setSession(opened);
      })
      .catch((err: Error) => setError(err.message));

    return () => {
      active = false;
      if (session) navigator.sendBeacon(`${API_BASE}/api/participants/${eventId}/sessions/${session.id}/disconnect`);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [eventId]);

  useEffect(() => {
    if (session) return;
    const timer = window.setInterval(() => setScanStep((step) => Math.min(step + 1, 4)), 650);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const disconnect = () => {
      navigator.sendBeacon(`${API_BASE}/api/participants/${eventId}/sessions/${session.id}/disconnect`);
    };
    window.addEventListener("pagehide", disconnect);
    return () => window.removeEventListener("pagehide", disconnect);
  }, [eventId, session]);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  const update = async (body: Record<string, unknown>) => {
    if (!session) return;
    const updated = await api.updatePermission(eventId, session.id, body);
    setSession(updated);
  };

  const requestPermission = async (key: PermissionKey) => {
    try {
      if (key === "location") {
        if (!navigator.geolocation) return update({ key, decision: "unavailable", detail: "Geolocation API is not available." });
        navigator.geolocation.getCurrentPosition(
          (position) =>
            update({
              key,
              decision: "granted",
              detail: "Location shared through the browser prompt.",
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              }
            }),
          (err) => update({ key, decision: err.code === err.PERMISSION_DENIED ? "denied" : "error", detail: err.message }),
          { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 }
        );
        return;
      }

      if (key === "camera" || key === "microphone") {
        if (!navigator.mediaDevices?.getUserMedia) return update({ key, decision: "unavailable", detail: "Media devices are not available." });
        const stream = await navigator.mediaDevices.getUserMedia({ video: key === "camera", audio: key === "microphone" });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (key === "camera") {
          setCameraActive(true);
        }
        await update({ key, decision: "granted", detail: `${key} stream intentionally shared in this active browser session.` });
        return;
      }

      if (key === "notifications") {
        if (!("Notification" in window)) return update({ key, decision: "unavailable", detail: "Notifications are not supported." });
        const decision = await Notification.requestPermission();
        await update({ key, decision: decision === "granted" ? "granted" : "denied", detail: `Browser returned ${decision}.` });
        if (decision === "granted") new Notification("ReconLens", { body: "Notification permission was granted for this demonstration." });
        return;
      }

      if (key === "clipboard") {
        if (!navigator.clipboard?.readText) return update({ key, decision: "unavailable", detail: "Clipboard read is not available." });
        await navigator.clipboard.readText();
        await update({ key, decision: "granted", detail: "Clipboard read was allowed after your click." });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "The browser rejected or blocked the request.";
      await update({ key, decision: message.toLowerCase().includes("denied") ? "denied" : "error", detail: message });
    }
  };

  const takeAndSharePhoto = async () => {
    if (!session || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setPhotoMessage("Camera preview is not ready yet. Wait a second and try again.");
      return;
    }
    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.78);
    const updated = await api.sharePhoto(eventId, session.id, photoDataUrl);
    setSession(updated);
    setPhotoMessage("Photo shared with the dashboard.");
  };

  return (
    <Layout title="ReconLens Demonstration">
      <section className="rounded-md border border-cyber/20 bg-panel p-6 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyber">ReconLens Assessment</p>
        <h2 className="mt-2 text-2xl font-semibold">Your browser is demonstrating privacy and permission boundaries.</h2>
        <p className="mt-3 max-w-3xl text-slate-300">
          This website demonstrates what information websites can automatically collect and what information requires your permission.
          Sensitive browser capabilities are requested only after you press the matching button.
        </p>
        <p className="mt-4 rounded border border-cyber/20 bg-cyber/5 p-3 text-sm text-slate-300">{disclaimer}</p>
        {error && <p className="mt-4 rounded border border-danger/30 bg-danger/10 p-3 text-danger">{error}</p>}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-white/[0.045] p-5">
          <h2 className="text-lg font-semibold">Automatically Collected Information</h2>
          {!session && (
            <div className="mt-4 space-y-2">
              {["Scanning Network...", "Scanning Browser...", "Scanning Device...", "Scanning Display...", "Scanning Locale..."].map((label, index) => (
                <div key={label} className={`rounded border px-3 py-2 font-mono text-sm transition ${index <= scanStep ? "border-cyber/30 bg-cyber/10 text-cyber" : "border-white/10 bg-black/25 text-slate-500"}`}>
                  {label}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 grid gap-2">
            {session &&
              Object.entries(session.automaticInfo)
                .filter(([key]) => event?.options.autoCollection[key as keyof typeof event.options.autoCollection] !== false)
                .map(([key, value]) => (
                  <div key={key} className="rounded border border-white/10 bg-black/25 px-3 py-3">
                    <div className="flex justify-between gap-4">
                      <span className="font-mono text-xs uppercase text-slate-500">{key}</span>
                      <span className="break-words text-right text-sm text-slate-200">{String(value)}</span>
                    </div>
                    {educationalNotes[key] && (
                      <div className="mt-2 border-t border-white/10 pt-2 text-xs text-slate-400">
                        <p><span className="text-signal">Why available:</span> {educationalNotes[key].availability}</p>
                        <p className="mt-1"><span className="text-warning">Misuse:</span> {educationalNotes[key].misuse}</p>
                        <p className="mt-1"><span className="text-cyber">Protection:</span> {educationalNotes[key].protection}</p>
                      </div>
                    )}
                  </div>
                ))}
          </div>
        </div>

        <div className="rounded-md border border-signal/20 bg-white/[0.045] p-5">
          <h2 className="text-lg font-semibold">Browser Permissions Demonstration</h2>
          <div className="mt-4 space-y-3">
            {permissionButtons
              .filter((key) => event?.options.permissions[key] !== false)
              .map((key) => (
                <div key={key} className="rounded-md border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold capitalize text-white">{key}</p>
                      <p className="mt-1 max-w-xl text-sm text-slate-400">{permissionDescriptions[key]}</p>
                    </div>
                    <button disabled={!session} className="secondary-action w-auto min-w-44" onClick={() => requestPermission(key)}>
                      Allow {key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                  </div>
                  {session && <p className="mt-2 text-sm text-signal">Status: {session.permissions[key].decision}</p>}
                  {educationalNotes[key] && (
                    <div className="mt-2 rounded border border-white/10 bg-white/[0.035] p-2 text-xs text-slate-400">
                      <p>{educationalNotes[key].collected}</p>
                      <p className="mt-1">Protection: {educationalNotes[key].protection}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
          {session?.location && (
            <div className="mt-4 rounded border border-cyber/20 bg-cyber/5 p-3 text-sm text-slate-300">
              <p className="font-semibold text-cyber">Precise browser location granted</p>
              <p>Latitude: {session.location.latitude}</p>
              <p>Longitude: {session.location.longitude}</p>
              <p>Accuracy: {Math.round(session.location.accuracy)} meters</p>
              <p>Timestamp: {new Date(session.location.capturedAt).toLocaleString()}</p>
              <p className="mt-2 text-slate-400">This is different from approximate IP-based location, which is inferred by the server from the network address.</p>
            </div>
          )}
          {cameraActive && (
            <div className="mt-4 rounded-md border border-cyber/20 bg-black/30 p-3">
              <video ref={videoRef} autoPlay muted playsInline className="max-h-72 w-full rounded-md border border-cyber/20 bg-black" />
              <button className="primary-action mt-3" onClick={takeAndSharePhoto}>Take & Share Photo</button>
              <p className="mt-2 text-xs text-slate-400">This sends one still image only after you press this button. The operator cannot trigger this from the dashboard.</p>
              {photoMessage && <p className="mt-2 text-sm text-cyber">{photoMessage}</p>}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
