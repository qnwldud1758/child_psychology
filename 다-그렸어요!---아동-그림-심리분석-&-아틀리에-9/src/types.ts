export interface DrawingPoint {
  x: number;
  y: number;
  time: number;
}

export interface DrawingStroke {
  color: string;
  thickness: number;
  startTime: number;
  points: DrawingPoint[];
}

export interface RuleInsights {
  summary: string;
  appliedRules: string[];
  areaRatio: number;
  centerYRatio: number;
  speed: number;
}

export interface Artwork {
  id: string;
  imgData: string;
  date: string;
  timestamp: number;
  mode: 'simple' | 'analysis';
  ruleInsights?: RuleInsights;
  title?: string;
}

export interface DiaryEntry {
  id: string;
  artworkId?: string;
  imgData: string;
  text: string;
  weather?: string;
  date: string;
  timestamp: number;
}

export interface PsychologyRecord {
  id: string;
  artworkId?: string;
  imgData: string;
  analysisHtml: string;
  date: string;
  timestamp: number;
  ruleInsights?: RuleInsights;
  parentEmailSent?: boolean;
  sentEmailAddress?: string;
}

export interface UserProfile {
  id: string;
  google_id?: string | null;
  kakao_id?: string | null;
  provider: 'kakao' | 'google' | 'email' | 'guest';
  email: string;
  name: string;
  avatar: string;
  role: string;
  createdAt: string;
}

declare global {
  interface Window {
    Kakao?: any;
  }
}


