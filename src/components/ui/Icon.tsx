import {
  Activity,
  Binary,
  Bookmark,
  BookOpen,
  Boxes,
  Bug,
  Crosshair,
  Database,
  FileCode,
  Flag,
  Globe,
  GraduationCap,
  Key,
  Layers,
  Lightbulb,
  Lock,
  Network,
  Radar,
  Rocket,
  Search,
  Server,
  Shield,
  Sparkles,
  Tag,
  Terminal,
  Waypoints,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Curated registry — badges store an icon *name*, so the set has to be finite
 * and bundled. These are the icons the badge creator offers.
 */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  tag: Tag,
  shield: Shield,
  radar: Radar,
  search: Search,
  layers: Layers,
  crosshair: Crosshair,
  terminal: Terminal,
  network: Network,
  book: BookOpen,
  database: Database,
  server: Server,
  globe: Globe,
  key: Key,
  lock: Lock,
  bug: Bug,
  zap: Zap,
  rocket: Rocket,
  flag: Flag,
  activity: Activity,
  binary: Binary,
  boxes: Boxes,
  'file-code': FileCode,
  bookmark: Bookmark,
  'graduation-cap': GraduationCap,
  lightbulb: Lightbulb,
  sparkles: Sparkles,
  waypoints: Waypoints,
};

export const ICON_NAMES = Object.keys(ICON_REGISTRY);

export function DynamicIcon({
  name,
  size = 13,
  className,
  strokeWidth = 1.75,
}: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}): JSX.Element {
  const Cmp = ICON_REGISTRY[name] ?? Tag;
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
