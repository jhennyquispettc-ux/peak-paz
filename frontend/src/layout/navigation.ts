import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CalendarX,
  Compass,
  Flag,
  Gavel,
  LayoutDashboard,
  Map,
  MessageSquareWarning,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "../auth/roles";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  phase: string;
  what: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const ADMIN_NAV: NavGroup[] = [
  {
    title: "Operación",
    items: [
      {
        path: "",
        label: "Resumen",
        icon: LayoutDashboard,
        phase: "F2",
        what: "los pendientes de hoy en un vistazo",
      },
      {
        path: "verificaciones",
        label: "Verificaciones",
        icon: ShieldCheck,
        phase: "F2",
        what: "la revisión de guías y agencias",
      },
      {
        path: "cancelaciones",
        label: "Cancelaciones",
        icon: CalendarX,
        phase: "F2",
        what: "las cancelaciones de proveedores por revisar",
      },
      {
        path: "disputas",
        label: "Disputas",
        icon: Gavel,
        phase: "F2",
        what: "los tours sin confirmar o con guía ausente",
      },
      {
        path: "reclamos",
        label: "Reclamos",
        icon: MessageSquareWarning,
        phase: "F2",
        what: "los reclamos de turistas y sus reembolsos",
      },
      {
        path: "strikes",
        label: "Strikes",
        icon: ShieldAlert,
        phase: "F2",
        what: "las sanciones de guías y agencias",
      },
    ],
  },
  {
    title: "Gestión",
    items: [
      {
        path: "rutas",
        label: "Rutas",
        icon: Map,
        phase: "F3",
        what: "las rutas, sus paradas, fotos y equipo",
      },
      {
        path: "usuarios",
        label: "Usuarios",
        icon: Users,
        phase: "F3",
        what: "las cuentas de la plataforma",
      },
      {
        path: "reservas",
        label: "Reservas",
        icon: CalendarCheck,
        phase: "F3",
        what: "todas las reservas y su estado",
      },
      {
        path: "liquidaciones",
        label: "Liquidaciones",
        icon: Wallet,
        phase: "F3",
        what: "los pagos a guías y agencias",
      },
      {
        path: "resenas",
        label: "Reseñas",
        icon: Star,
        phase: "F3",
        what: "la moderación de reseñas",
      },
      {
        path: "reglas",
        label: "Reglas",
        icon: SlidersHorizontal,
        phase: "F3",
        what: "los plazos, comisiones y límites",
      },
    ],
  },
];

const GUIDE_NAV: NavGroup[] = [
  {
    title: "Mi trabajo",
    items: [
      {
        path: "",
        label: "Inicio",
        icon: LayoutDashboard,
        phase: "F4",
        what: "tus próximos tours y lo que requiere acción",
      },
      {
        path: "reservas",
        label: "Reservas",
        icon: CalendarCheck,
        phase: "F4",
        what: "solicitudes, reconfirmación e inicio del tour",
      },
      {
        path: "agenda",
        label: "Agenda",
        icon: CalendarDays,
        phase: "F4",
        what: "tu disponibilidad y compromisos",
      },
      {
        path: "mis-rutas",
        label: "Mis rutas",
        icon: Compass,
        phase: "F4",
        what: "las rutas que estás autorizado a guiar",
      },
    ],
  },
  {
    title: "Mi cuenta",
    items: [
      {
        path: "liquidaciones",
        label: "Liquidaciones",
        icon: Wallet,
        phase: "F4",
        what: "tus pagos y descuentos",
      },
      {
        path: "resenas",
        label: "Reseñas",
        icon: Star,
        phase: "F4",
        what: "lo que dicen los turistas",
      },
      {
        path: "sanciones",
        label: "Sanciones",
        icon: ShieldAlert,
        phase: "F4",
        what: "tus strikes y multas",
      },
      {
        path: "perfil",
        label: "Perfil",
        icon: UserRound,
        phase: "F4",
        what: "tus datos y documentos",
      },
    ],
  },
];

const AGENCY_NAV: NavGroup[] = [
  {
    title: "Mi trabajo",
    items: [
      {
        path: "",
        label: "Inicio",
        icon: LayoutDashboard,
        phase: "F5",
        what: "tus próximas salidas y sus cupos",
      },
      {
        path: "salidas",
        label: "Salidas",
        icon: Flag,
        phase: "F5",
        what: "publicar salidas y ver a los inscritos",
      },
    ],
  },
  {
    title: "Mi cuenta",
    items: [
      {
        path: "liquidaciones",
        label: "Liquidaciones",
        icon: Wallet,
        phase: "F5",
        what: "tus pagos y descuentos",
      },
      {
        path: "resenas",
        label: "Reseñas",
        icon: Star,
        phase: "F5",
        what: "lo que dicen los turistas",
      },
      {
        path: "sanciones",
        label: "Sanciones",
        icon: ShieldAlert,
        phase: "F5",
        what: "tus strikes y multas",
      },
      {
        path: "perfil",
        label: "Perfil",
        icon: UserRound,
        phase: "F5",
        what: "los datos y documentos de la agencia",
      },
    ],
  },
];

export const NOTICES_ITEM = { path: "avisos", label: "Avisos", icon: Bell };

export function navigationFor(role: Role): NavGroup[] {
  if (role === "ADMIN") return ADMIN_NAV;
  if (role === "GUIDE") return GUIDE_NAV;
  if (role === "AGENCY") return AGENCY_NAV;
  return [];
}

export function baseFor(role: Role): string {
  return role === "ADMIN" ? "/admin" : "/panel";
}

export function areaLabelFor(role: Role): string {
  if (role === "ADMIN") return "Administración";
  if (role === "GUIDE") return "Panel del guía";
  return "Panel de la agencia";
}

export function findNavItem(role: Role, path: string): NavItem | undefined {
  return navigationFor(role)
    .flatMap((group) => group.items)
    .find((item) => item.path === path);
}

export const PROVIDER_PATHS = Array.from(
  new Set(
    [...GUIDE_NAV, ...AGENCY_NAV]
      .flatMap((group) => group.items)
      .map((item) => item.path)
      .filter(Boolean),
  ),
);

export const ADMIN_PATHS = ADMIN_NAV.flatMap((group) => group.items)
  .map((item) => item.path)
  .filter((path) => path && path !== "verificaciones");
