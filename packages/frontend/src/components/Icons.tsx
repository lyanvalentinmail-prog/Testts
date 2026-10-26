import {
  Activity,
  BookOpen,
  Boxes,
  Code2,
  Compass,
  Download,
  Layers,
  Palette,
  Search,
  Sparkles,
  Terminal,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

/** Iconos de categoría declarados en el catálogo compartido. */
const ICONS: Record<string, LucideIcon> = {
  palette: Palette,
  sparkles: Sparkles,
  search: Search,
  download: Download,
  wrench: Wrench,
  activity: Activity,
  layers: Layers,
  boxes: Boxes,
  code: Code2,
  terminal: Terminal,
  book: BookOpen,
  compass: Compass,
};

export function categoryIcon(name: string): LucideIcon {
  return ICONS[name] ?? Layers;
}

export {
  Activity,
  BookOpen,
  Boxes,
  Code2,
  Compass,
  Download,
  Layers,
  Palette,
  Search,
  Sparkles,
  Terminal,
  Wrench,
};
