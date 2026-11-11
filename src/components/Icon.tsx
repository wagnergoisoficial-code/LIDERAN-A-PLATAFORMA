import React from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUp, Award, BadgeCheck, Forward, Ban, Cake, Download, Music, Wallet, BicepsFlexed, Bell, BookOpen, Bookmark, Calendar, Camera, ChartColumn,
  Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CirclePlay, Clock, Copy, Ellipsis, ExternalLink, FileText,
  Flag, Flame, Gift, Globe, HandHeart, Heart, House, Image, Info, LayoutDashboard, Link, ListChecks, Lock, LockOpen,
  LogOut, MapPin, MessageCircle, MessagesSquare, Moon, Pencil, Pin, PinOff, Play, Plus, Search, Send, ShieldCheck, ThumbsUp,
  Trash2, TriangleAlert, Upload, User, UserPlus, Users, X,
} from 'lucide-react';

// Uma só família de ícones (traço fino, sem preenchimento). Os nomes antigos do UIkit
// continuam a funcionar como sinónimos.
const ICONS = {
  home: House,
  users: Users,
  videos: CirclePlay,
  'play-circle': CirclePlay,
  play: Play,
  messages: MessageCircle,
  mail: MessageCircle,
  comment: MessageCircle,
  chat: MessagesSquare,
  commenting: MessagesSquare,
  plus: Plus,
  bell: Bell,
  search: Search,
  user: User,
  'user-plus': UserPlus,
  logout: LogOut,
  'sign-out': LogOut,
  moon: Moon,
  cake: Cake,
  wallet: Wallet,
  music: Music,
  badge: BadgeCheck,
  download: Download,
  dashboard: LayoutDashboard,
  grid: LayoutDashboard,
  reports: ChartColumn,
  table: ChartColumn,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  close: X,
  check: Check,
  trash: Trash2,
  pencil: Pencil,
  lock: Lock,
  unlock: LockOpen,
  ban: Ban,
  shield: ShieldCheck,
  location: MapPin,
  clock: Clock,
  calendar: Calendar,
  image: Image,
  camera: Camera,
  copy: Copy,
  link: Link,
  upload: Upload,
  'file-text': FileText,
  'file-pdf': FileText,
  warning: TriangleAlert,
  flag: Flag,
  info: Info,
  more: Ellipsis,
  pin: Pin,
  unpin: PinOff,
  gift: Gift,
  poll: ListChecks,
  list: ListChecks,
  world: Globe,
  external: ExternalLink,
  book: BookOpen,
  bookmark: Bookmark,
  share: Forward,
  award: Award,
  send: Send,
  reply: Send,
  // Reações das publicações
  amen: ThumbsUp,
  praying: HandHeart,
  heart: Heart,
  fire: Flame,
  strong: BicepsFlexed,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Ícone decorativo: o texto ou o aria-label do controlo é que o descreve. */
const Icon: React.FC<IconProps> = ({ name, size = 20, strokeWidth = 1.75, className, style }) => {
  const Svg = ICONS[name];
  return <Svg size={size} strokeWidth={strokeWidth} className={`icon${className ? ` ${className}` : ''}`} style={style} aria-hidden="true" focusable="false" />;
};

export default Icon;
