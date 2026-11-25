import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Alert02Icon,
  CubeIcon,
  Download04Icon,
  Mail01Icon,
  ArrowDown02Icon,
  DashboardSpeed01Icon,
  Edit02Icon,
  File01Icon,
  FlashIcon,
  Image01Icon,
  MagicWand01Icon,
  Message01Icon,
  SecurityCheckIcon,
  Share08Icon,
  SmartPhone01Icon,
  SquareLock02Icon,
  ThumbsDownIcon,
  AlertCircleIcon,
  ArrowExpand01Icon,
  ArrowRight02Icon,
  BubbleChatIcon,
  BulbIcon,
  Cancel01Icon,
  CancelCircleIcon,
  ChartDownIcon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  Clock01Icon,
  CloudUploadIcon,
  Copy01Icon,
  DashedLineCircleIcon,
  Delete02Icon,
  Flag02Icon,
  GitCompareIcon,
  GridViewIcon,
  InformationCircleIcon,
  Layers01Icon,
  LeftToRightListBulletIcon,
  Link01Icon,
  Loading03Icon,
  Location01Icon,
  Menu01Icon,
  MinusSignIcon,
  MoreHorizontalIcon,
  Note01Icon,
  Notification01Icon,
  PlusSignIcon,
  Search01Icon,
  SentIcon,
  Settings01Icon,
  Shield01Icon,
  Tick02Icon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { forwardRef, type ComponentProps } from 'react';

/**
 * The one place icons come from (code-phase-plan.md, decision 4). Every
 * icon is Hugeicons Stroke Rounded, the set the Figma designs use, exported
 * under the name the codebase already used so call sites keep their
 * `size` / `className` / `aria-hidden` props unchanged.
 *
 * Uses the free Stroke Rounded package for now. To move to Hugeicons Pro,
 * swap the import above for `@hugeicons-pro/core-stroke-rounded` once its
 * licence token is set up (as an env var, never committed).
 */
type IconProps = Omit<ComponentProps<typeof HugeiconsIcon>, 'icon'>;

export type IconComponent = ReturnType<typeof makeIcon>;

const DEFAULT_STROKE_WIDTH = 1.5;

function makeIcon(icon: IconSvgElement, displayName: string) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, strokeWidth = DEFAULT_STROKE_WIDTH, ...props },
    ref,
  ) {
    return <HugeiconsIcon ref={ref} icon={icon} size={size} strokeWidth={strokeWidth} {...props} />;
  });
  Icon.displayName = displayName;
  return Icon;
}

export const AlertCircle = makeIcon(AlertCircleIcon, 'AlertCircle');
export const AlertOctagon = makeIcon(Alert02Icon, 'AlertOctagon');
export const AlertTriangle = makeIcon(Alert02Icon, 'AlertTriangle');
export const ArrowRight = makeIcon(ArrowRight02Icon, 'ArrowRight');
export const ChevronRight = makeIcon(ArrowRight01Icon, 'ChevronRight');
export const ArrowLeft = makeIcon(ArrowLeft01Icon, 'ArrowLeft');
export const Bell = makeIcon(Notification01Icon, 'Bell');
export const Check = makeIcon(Tick02Icon, 'Check');
export const CheckCircle2 = makeIcon(CheckmarkCircle02Icon, 'CheckCircle2');
export const Circle = makeIcon(CircleIcon, 'Circle');
export const CircleDashed = makeIcon(DashedLineCircleIcon, 'CircleDashed');
export const Clock = makeIcon(Clock01Icon, 'Clock');
export const Copy = makeIcon(Copy01Icon, 'Copy');
export const Expand = makeIcon(ArrowExpand01Icon, 'Expand');
export const Eye = makeIcon(ViewIcon, 'Eye');
export const EyeOff = makeIcon(ViewOffIcon, 'EyeOff');
export const Flag = makeIcon(Flag02Icon, 'Flag');
export const GitCompare = makeIcon(GitCompareIcon, 'GitCompare');
export const History = makeIcon(Clock01Icon, 'History');
export const Info = makeIcon(InformationCircleIcon, 'Info');
export const Layers = makeIcon(Layers01Icon, 'Layers');
export const LayoutGrid = makeIcon(GridViewIcon, 'LayoutGrid');
export const Lightbulb = makeIcon(BulbIcon, 'Lightbulb');
export const LineChart = makeIcon(ChartLineData01Icon, 'LineChart');
export const Link2 = makeIcon(Link01Icon, 'Link2');
export const List = makeIcon(LeftToRightListBulletIcon, 'List');
export const Loader2 = makeIcon(Loading03Icon, 'Loader2');
export const MapPin = makeIcon(Location01Icon, 'MapPin');
export const Menu = makeIcon(Menu01Icon, 'Menu');
export const MessageSquareWarning = makeIcon(BubbleChatIcon, 'MessageSquareWarning');
export const MoreHorizontal = makeIcon(MoreHorizontalIcon, 'MoreHorizontal');
export const Plus = makeIcon(PlusSignIcon, 'Plus');
export const Search = makeIcon(Search01Icon, 'Search');
export const Send = makeIcon(SentIcon, 'Send');
export const Settings = makeIcon(Settings01Icon, 'Settings');
export const Shield = makeIcon(Shield01Icon, 'Shield');
// Was a "sparkles" glyph; the designs drop that "AI magic" signal, so the
// assistant uses a plain chat bubble.
export const Sparkles = makeIcon(BubbleChatIcon, 'Sparkles');
export const StickyNote = makeIcon(Note01Icon, 'StickyNote');
export const Trash2 = makeIcon(Delete02Icon, 'Trash2');
export const TrendingDown = makeIcon(ChartDownIcon, 'TrendingDown');
export const UploadCloud = makeIcon(CloudUploadIcon, 'UploadCloud');
export const User = makeIcon(UserIcon, 'User');
export const X = makeIcon(Cancel01Icon, 'X');
export const XCircle = makeIcon(CancelCircleIcon, 'XCircle');
export const Boxes = makeIcon(CubeIcon, 'Boxes');
export const FileText = makeIcon(File01Icon, 'FileText');
export const Gauge = makeIcon(DashboardSpeed01Icon, 'Gauge');
export const Image = makeIcon(Image01Icon, 'Image');
export const MessageSquare = makeIcon(Message01Icon, 'MessageSquare');
export const Pencil = makeIcon(Edit02Icon, 'Pencil');
export const Share2 = makeIcon(Share08Icon, 'Share2');
export const ShieldCheck = makeIcon(SecurityCheckIcon, 'ShieldCheck');
export const Smartphone = makeIcon(SmartPhone01Icon, 'Smartphone');
export const ThumbsDown = makeIcon(ThumbsDownIcon, 'ThumbsDown');
export const Wand2 = makeIcon(MagicWand01Icon, 'Wand2');
export const Zap = makeIcon(FlashIcon, 'Zap');
export const Lock = makeIcon(SquareLock02Icon, 'Lock');
export const Minus = makeIcon(MinusSignIcon, 'Minus');
export const Download = makeIcon(Download04Icon, 'Download');
export const Mail = makeIcon(Mail01Icon, 'Mail');
export const ArrowDown = makeIcon(ArrowDown02Icon, 'ArrowDown');
