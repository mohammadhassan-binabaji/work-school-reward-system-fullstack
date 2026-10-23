export interface TierSemanticTokens {
  /** Main vibrant neon/accent color */
  primary: string;
  /** High-contrast, softer/brighter tint of the primary color for small text (11px) */
  textLight: string;
  /** Semi-transparent border color for card's outer stroke */
  border: string;
  /** Outer neon glow shadow color for card container and progress arc */
  borderGlow: string;
  /** Low-opacity (~15%) ambient glow color for blurred decorative circle */
  ambientBlob: string;
  /** Deep darkened recessed shade for unfilled background track of circular progress gauge */
  ringTrack: string;
  /** Very subtle translucent dark tint (~6% opacity) filling inner background of circle behind mascot */
  ringFill: string;
}

export interface TierTheme extends TierSemanticTokens {
  id: string;
  nameFa: string;
}

export const TIER_THEMES: Record<string, TierTheme> = {
  bronze_ember: {
    id: 'bronze_ember',
    nameFa: 'برنز (مسی درخشان)',
    primary: '#F06428',
    textLight: '#FF8552',
    border: 'rgba(240, 100, 40, 0.55)',
    borderGlow: '0 0 20px -3px rgba(240, 100, 40, 0.35)',
    ambientBlob: 'rgba(240, 100, 40, 0.15)',
    ringTrack: '#3B1D11',
    ringFill: 'rgba(240, 100, 40, 0.06)',
  },
  silver_cyber: {
    id: 'silver_cyber',
    nameFa: 'نقره‌ای (سایبر ملایم)',
    primary: '#94A3B8',
    textLight: '#CBD5E1',
    border: 'rgba(148, 163, 184, 0.55)',
    borderGlow: '0 0 20px -3px rgba(148, 163, 184, 0.30)',
    ambientBlob: 'rgba(148, 163, 184, 0.15)',
    ringTrack: '#1E293B',
    ringFill: 'rgba(148, 163, 184, 0.06)',
  },
  gold_aurelian: {
    id: 'gold_aurelian',
    nameFa: 'طلایی (درخشش پادشاهی)',
    primary: '#FACC15',
    textLight: '#FDE047',
    border: 'rgba(250, 204, 21, 0.55)',
    borderGlow: '0 0 20px -3px rgba(250, 204, 21, 0.35)',
    ambientBlob: 'rgba(250, 204, 21, 0.15)',
    ringTrack: '#3B300B',
    ringFill: 'rgba(250, 204, 21, 0.06)',
  },
  platinum_bioglaze: {
    id: 'platinum_bioglaze',
    nameFa: 'پلاتین (فیروزه‌ای هوشمند)',
    primary: '#2DD4BF',
    textLight: '#5EEAD4',
    border: 'rgba(45, 212, 191, 0.55)',
    borderGlow: '0 0 20px -3px rgba(45, 212, 191, 0.35)',
    ambientBlob: 'rgba(45, 212, 191, 0.15)',
    ringTrack: '#113835',
    ringFill: 'rgba(45, 212, 191, 0.06)',
  },
  diamond_aether: {
    id: 'diamond_aether',
    nameFa: 'الماس (نیلی آسمانی)',
    primary: '#38BDF8',
    textLight: '#7DD3FC',
    border: 'rgba(56, 189, 248, 0.60)',
    borderGlow: '0 0 22px -2px rgba(56, 189, 248, 0.40)',
    ambientBlob: 'rgba(56, 189, 248, 0.16)',
    ringTrack: '#0F2942',
    ringFill: 'rgba(56, 189, 248, 0.07)',
  },
  cosmic_orchid: {
    id: 'cosmic_orchid',
    nameFa: 'ارکیده کیهانی (بنفش حماسی)',
    primary: '#C084FC',
    textLight: '#D8B4FE',
    border: 'rgba(192, 132, 252, 0.55)',
    borderGlow: '0 0 20px -3px rgba(192, 132, 252, 0.35)',
    ambientBlob: 'rgba(192, 132, 252, 0.15)',
    ringTrack: '#2E1745',
    ringFill: 'rgba(192, 132, 252, 0.06)',
  },
  ruby_forge: {
    id: 'ruby_forge',
    nameFa: 'یاقوت سرخ (قرمز پیشتاز)',
    primary: '#FF3D00',
    textLight: '#FF6E40',
    border: 'rgba(255, 61, 0, 0.55)',
    borderGlow: '0 0 20px -3px rgba(255, 61, 0, 0.35)',
    ambientBlob: 'rgba(255, 61, 0, 0.15)',
    ringTrack: '#3D1410',
    ringFill: 'rgba(255, 61, 0, 0.06)',
  },
  emerald_oasis: {
    id: 'emerald_oasis',
    nameFa: 'زمرد (سبز شاهانه)',
    primary: '#34D399',
    textLight: '#6EE7B7',
    border: 'rgba(52, 211, 153, 0.55)',
    borderGlow: '0 0 20px -3px rgba(52, 211, 153, 0.35)',
    ambientBlob: 'rgba(52, 211, 153, 0.15)',
    ringTrack: '#0E3627',
    ringFill: 'rgba(52, 211, 153, 0.06)',
  },
  midnight_obsidian: {
    id: 'midnight_obsidian',
    nameFa: 'ابسیدین (طلای سایه)',
    primary: '#F59E0B',
    textLight: '#FBBF24',
    border: 'rgba(245, 158, 11, 0.55)',
    borderGlow: '0 0 20px -3px rgba(245, 158, 11, 0.35)',
    ambientBlob: 'rgba(245, 158, 11, 0.15)',
    ringTrack: '#362407',
    ringFill: 'rgba(245, 158, 11, 0.06)',
  },
  apex_nebula: {
    id: 'apex_nebula',
    nameFa: 'کهکشان نئون (بنفش الکتریک)',
    primary: '#F43F5E',
    textLight: '#FB7185',
    border: 'rgba(244, 63, 94, 0.60)',
    borderGlow: '0 0 22px -2px rgba(244, 63, 94, 0.40)',
    ambientBlob: 'rgba(244, 63, 94, 0.16)',
    ringTrack: '#3B1020',
    ringFill: 'rgba(244, 63, 94, 0.07)',
  },
};

export const TIER_THEME_LIST: TierTheme[] = Object.values(TIER_THEMES);

export const DEFAULT_TIER_THEMES_BY_LEVEL: Record<number, string> = {
  1: 'bronze_ember',
  2: 'silver_cyber',
  3: 'gold_aurelian',
  4: 'platinum_bioglaze',
  5: 'diamond_aether',
};

export function getDefaultThemeId(tierNumber: number): string {
  return DEFAULT_TIER_THEMES_BY_LEVEL[tierNumber] || 'bronze_ember';
}

export function getTierTheme(themeId?: string | null, tierNumber?: number): TierTheme {
  if (themeId && TIER_THEMES[themeId]) {
    return TIER_THEMES[themeId];
  }
  if (tierNumber && DEFAULT_TIER_THEMES_BY_LEVEL[tierNumber]) {
    return TIER_THEMES[DEFAULT_TIER_THEMES_BY_LEVEL[tierNumber]];
  }
  return TIER_THEMES.bronze_ember;
}
