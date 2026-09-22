import type { ComponentType } from 'react'
import {
  Home, Car, Bus, Fuel, ShoppingCart, ShoppingBag, Utensils, Coffee, Pizza,
  Heart, HeartPulse, Dumbbell, GraduationCap, Gift, Briefcase, Laptop, Monitor,
  Smartphone, Phone, CreditCard, Banknote, PiggyBank, Plane, TrendingUp, Wallet,
  Building2, Landmark, Music, Film, Zap, Wrench, Shirt, Baby, PawPrint, Wifi,
  Bike, Gamepad2, BookOpen, Palette, Camera, Scissors, Hammer, Package,
  DollarSign, HandCoins, Receipt, Tag, Star, Sparkles, Bed, Sofa, Lightbulb,
  Droplet, Flame, Beer, Wine, Cake, Stethoscope, Anchor, Waves, Ticket, Truck,
} from 'lucide-react'

export type IconKey = keyof typeof ICONS

export const ICONS: Record<string, ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  home: Home, car: Car, bus: Bus, fuel: Fuel, cart: ShoppingCart, bag: ShoppingBag,
  utensils: Utensils, coffee: Coffee, pizza: Pizza, heart: Heart, health: HeartPulse,
  dumbbell: Dumbbell, education: GraduationCap, gift: Gift, briefcase: Briefcase,
  laptop: Laptop, monitor: Monitor, smartphone: Smartphone, phone: Phone,
  card: CreditCard, cash: Banknote, savings: PiggyBank, plane: Plane, invest: TrendingUp,
  wallet: Wallet, building: Building2, bank: Landmark, music: Music, film: Film,
  energy: Zap, tools: Wrench, shirt: Shirt, baby: Baby, pet: PawPrint, wifi: Wifi,
  bike: Bike, game: Gamepad2, book: BookOpen, art: Palette, camera: Camera,
  scissors: Scissors, hammer: Hammer, package: Package, dollar: DollarSign,
  coins: HandCoins, receipt: Receipt, tag: Tag, star: Star, sparkles: Sparkles,
  bed: Bed, sofa: Sofa, bulb: Lightbulb, water: Droplet, flame: Flame, beer: Beer,
  wine: Wine, cake: Cake, medical: Stethoscope, anchor: Anchor, waves: Waves,
  ticket: Ticket, truck: Truck,
}

export const ICON_KEYS = Object.keys(ICONS)

export function CatIcon({
  name,
  size = 20,
  className,
  strokeWidth = 2,
}: {
  name?: string | null
  size?: number
  className?: string
  strokeWidth?: number
}) {
  const Cmp = (name && ICONS[name]) || Tag
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} />
}

// Paleta de colores para categorías / cuentas / tarjetas
export const PALETTE = [
  '#f0574f', '#ff8a3d', '#ffb300', '#ffd400', '#a3d13a', '#37c978',
  '#12b981', '#0fb9c9', '#3ba6ff', '#4f7cff', '#7c5cff', '#a855f7',
  '#d946ef', '#ec4899', '#f43f6e', '#9ca3af', '#64748b', '#111318',
]
