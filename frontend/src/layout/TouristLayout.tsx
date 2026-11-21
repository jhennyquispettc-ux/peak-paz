import { Outlet } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

export default function TouristLayout() {
  return (
    <div className="pp app-shell">
      <SiteHeader />
      <main className="tourist-content">
        <Outlet />
      </main>
    </div>
  );
}
