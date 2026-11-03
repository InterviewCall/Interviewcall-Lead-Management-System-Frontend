import {
  Activity, ArrowLeft, ArrowRight, ArrowRightLeft, Bell, Calendar, Check, ChartColumn,
  ChevronDown, ChevronRight, Clock, Download, Ellipsis, FileText, Funnel, House, Info, KeyRound,
  Link2, List, Lock, LogOut, Mail, Menu, MessageCircle, NotebookPen, PenLine, Phone, Plus,
  RefreshCw, Search, Server, Shield, Shuffle, SquareKanban, Target, TriangleAlert, Upload, User,
  Users, X, Zap, UserX, UserCheck, Eye, EyeOff, type LucideIcon,
} from "lucide-react";

/** Icon names follow the layer names in the Figma file (icon/home, icon/kanban …). */
const ICONS = {
  zap: Zap, clock: Clock, bars: ChartColumn, users: Users, mail: Mail, lock: Lock, home: House,
  kanban: SquareKanban, shuffle: Shuffle, upload: Upload, pulse: Activity, shield: Shield,
  search: Search, bell: Bell, plus: Plus, download: Download, chev: ChevronDown, filter: Funnel,
  check: Check, calendar: Calendar, phone: Phone, right: ChevronRight, user: User, note: FileText,
  msg: MessageCircle, more: Ellipsis, link: Link2, edit: PenLine, swap: ArrowRightLeft,
  form: NotebookPen, x: X, list: List, info: Info, arrowR: ArrowRight, warn: TriangleAlert,
  file: FileText, refresh: RefreshCw, server: Server, target: Target, menu: Menu, back: ArrowLeft,
  logout: LogOut, key: KeyRound, userX: UserX, userCheck: UserCheck, eye: Eye, eyeOff: EyeOff,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** Stroke width 2 in absolute pixels, as in the design. Colour comes from the text colour. */
export function Icon({ name, size = 18, className }: IconProps) {
  const Component = ICONS[name];
  return (
    <Component
      width={size}
      height={size}
      strokeWidth={2}
      absoluteStrokeWidth
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0 }}
    />
  );
}
