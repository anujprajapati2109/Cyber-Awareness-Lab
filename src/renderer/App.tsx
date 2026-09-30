import { useMemo, useState } from "react";
import { CreateEvent } from "./pages/CreateEvent";
import { Dashboard } from "./pages/Dashboard";
import { Home } from "./pages/Home";
import { Participant } from "./pages/Participant";
import { Settings } from "./pages/Settings";

type Route = {
  page: string;
  eventId?: string;
};

function initialRoute(): Route {
  const match = window.location.pathname.match(/^\/participant\/([^/]+)/);
  if (match) return { page: "participant", eventId: match[1] };
  return { page: "home" };
}

export function App() {
  const [route, setRoute] = useState<Route>(initialRoute);
  const navigate = (page: string, eventId?: string) => setRoute({ page, eventId });
  const screen = useMemo(() => {
    if (route.page === "participant" && route.eventId) return <Participant eventId={route.eventId} />;
    if (route.page === "create") return <CreateEvent navigate={navigate} />;
    if (route.page === "settings") return <Settings navigate={navigate} />;
    if (route.page === "dashboard" && route.eventId) return <Dashboard eventId={route.eventId} navigate={navigate} />;
    return <Home navigate={navigate} />;
  }, [route]);
  return screen;
}
