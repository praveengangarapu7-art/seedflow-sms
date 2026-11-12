import {
  ClipboardCheck,
  Database,
  Factory,
  FlaskConical,
  LayoutGrid,
  ShoppingCart,
  ShieldCheck,
  Sprout,
  TestTube,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { SearchModule } from '@/data/searchIndex';

export const MODULE_ICON: Record<SearchModule, LucideIcon> = {
  Platform: LayoutGrid,
  Procurement: ShoppingCart,
  Warehouse: Warehouse,
  'R&D': FlaskConical,
  Processing: Factory,
  Production: Sprout,
  Laboratory: TestTube,
  Quality: ClipboardCheck,
  Administration: ShieldCheck,
  'Master Data': Database,
  Portals: Users,
};
