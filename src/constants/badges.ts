import { PRIME_ICONS_UNICODES } from "./fonts"
export type PrimeIconKey = keyof typeof PRIME_ICONS_UNICODES

export interface BadgeConfig {
  icon: PrimeIconKey
  badgeBg: string
  badgeText: string
  iconBg: string
  iconColor: string
}

export const BADGE_CONFIGS: Record<string, BadgeConfig> = {
  credits: {
    icon: "pi-dollar",
    badgeBg: "#8D6932",
    badgeText: "#fff",
    iconBg: "#654020",
    iconColor: "#FABC25",
  },
}
