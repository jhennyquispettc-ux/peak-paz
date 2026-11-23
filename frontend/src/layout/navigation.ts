import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CalendarX,
  Compass,
  Flag,
  Gavel,
  LifeBuoy,
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
} from 'lucide-react';
import type { Role } from '../auth/roles';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const ADMIN_NAV: NavGroup[] = [
  {
    title: 'Operación',
    items: [
      {
        path: '',
        label: 'Resumen',
        icon: LayoutDashboard,
      },
      {
        path: 'verificaciones',
        label: 'Verificaciones',
        icon: ShieldCheck,
      },
      {
        path: 'cancelaciones',
        label: 'Cancelaciones',
        icon: CalendarX,
      },
      {
        path: 'disputas',
        label: 'Disputas',
        icon: Gavel,
      },
      {
        path: 'ayuda',
        label: 'Ayuda en ruta',
        icon: LifeBuoy,
      },
      {
        path: 'reclamos',
        label: 'Reclamos',
        icon: MessageSquareWarning,
      },
      {
        path: 'strikes',
        label: 'Strikes',
        icon: ShieldAlert,
      },
    ],
  },
  {
    title: 'Gestión',
    items: [
      {
        path: 'rutas',
        label: 'Rutas',
        icon: Map,
      },
      {
        path: 'usuarios',
        label: 'Usuarios',
        icon: Users,
      },
      {
        path: 'reservas',
        label: 'Reservas',
        icon: CalendarCheck,
      },
      {
        path: 'liquidaciones',
        label: 'Liquidaciones',
        icon: Wallet,
      },
      {
        path: 'resenas',
        label: 'Reseñas',
        icon: Star,
      },
      {
        path: 'reglas',
        label: 'Reglas',
        icon: SlidersHorizontal,
      },
    ],
  },
];

const GUIDE_NAV: NavGroup[] = [
  {
    title: 'Mi trabajo',
    items: [
      {
        path: '',
        label: 'Inicio',
        icon: LayoutDashboard,
      },
      {
        path: 'reservas',
        label: 'Reservas',
        icon: CalendarCheck,
      },
      {
        path: 'agenda',
        label: 'Agenda',
        icon: CalendarDays,
      },
      {
        path: 'mis-rutas',
        label: 'Mis rutas',
        icon: Compass,
      },
    ],
  },
  {
    title: 'Mi cuenta',
    items: [
      {
        path: 'liquidaciones',
        label: 'Liquidaciones',
        icon: Wallet,
      },
      {
        path: 'resenas',
        label: 'Reseñas',
        icon: Star,
      },
      {
        path: 'sanciones',
        label: 'Sanciones',
        icon: ShieldAlert,
      },
      {
        path: 'perfil',
        label: 'Perfil',
        icon: UserRound,
      },
    ],
  },
];

const AGENCY_NAV: NavGroup[] = [
  {
    title: 'Mi trabajo',
    items: [
      {
        path: '',
        label: 'Inicio',
        icon: LayoutDashboard,
      },
      {
        path: 'salidas',
        label: 'Salidas',
        icon: Flag,
      },
    ],
  },
  {
    title: 'Mi cuenta',
    items: [
      {
        path: 'liquidaciones',
        label: 'Liquidaciones',
        icon: Wallet,
      },
      {
        path: 'resenas',
        label: 'Reseñas',
        icon: Star,
      },
      {
        path: 'sanciones',
        label: 'Sanciones',
        icon: ShieldAlert,
      },
      {
        path: 'perfil',
        label: 'Perfil',
        icon: UserRound,
      },
    ],
  },
];

export const NOTICES_ITEM = { path: 'avisos', label: 'Avisos', icon: Bell };

export function navigationFor(role: Role): NavGroup[] {
  if (role === 'ADMIN') return ADMIN_NAV;
  if (role === 'GUIDE') return GUIDE_NAV;
  if (role === 'AGENCY') return AGENCY_NAV;
  return [];
}

export function baseFor(role: Role): string {
  return role === 'ADMIN' ? '/admin' : '/panel';
}

export function areaLabelFor(role: Role): string {
  if (role === 'ADMIN') return 'Administración';
  if (role === 'GUIDE') return 'Panel del guía';
  return 'Panel de la agencia';
}
