export type Role = 'super_admin' | 'admin' | 'athlete' | 'viewer'
export type TournamentStatus = 'draft' | 'group_stage' | 'knockout_stage' | 'finished'
export type TournamentType = 'classic' | 'categories'
export type MatchStatus = 'pending' | 'finished' | 'walkover'

export interface Profile {
  id: string
  name: string
  role: Role
  created_at: string
}

export interface Athlete {
  id: string
  name: string
  photo_url: string | null
  user_id: string | null
  created_at: string
}

export interface Tournament {
  id: string
  name: string
  description: string | null
  edition: number
  status: TournamentStatus
  type: TournamentType
  groups_count: number
  players_per_group: number
  is_current: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface TournamentCategory {
  id: string
  tournament_id: string
  name: string
  groups_count: number
  players_per_group: number
  created_at: string
}

export interface CategoryAthlete {
  id: string
  tournament_id: string
  category_id: string
  athlete_id: string
  group_number: number | null
  group_rank: number | null
  athlete?: Athlete
}

export interface TournamentAthlete {
  id: string
  tournament_id: string
  athlete_id: string
  group_number: number | null
  group_rank: number | null
  athlete?: Athlete
}

export interface GroupMatch {
  id: string
  tournament_id: string
  group_number: number
  athlete1_id: string
  athlete2_id: string
  athlete1_sets: number
  athlete2_sets: number
  winner_id: string | null
  status: MatchStatus
  match_order: number | null
  created_at: string
  athlete1?: Athlete
  athlete2?: Athlete
}

export interface KnockoutMatch {
  id: string
  tournament_id: string
  bracket_rank: number
  round: number
  match_number: number
  athlete1_id: string | null
  athlete2_id: string | null
  athlete1_sets: number
  athlete2_sets: number
  winner_id: string | null
  status: MatchStatus
  created_at: string
  athlete1?: Athlete
  athlete2?: Athlete
}

export interface GroupStanding {
  athlete: Athlete
  tournamentAthleteId: string
  wins: number
  losses: number
  setsWon: number
  setsLost: number
  setDiff: number
  rank?: number
}

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
        Relationships: []
      }
      athletes: {
        Row: Athlete
        Insert: { name: string; photo_url?: string | null }
        Update: { name?: string; photo_url?: string | null }
        Relationships: []
      }
      tournaments: {
        Row: Tournament
        Insert: Omit<Tournament, 'id' | 'created_at'>
        Update: Partial<Omit<Tournament, 'id' | 'created_at'>>
        Relationships: []
      }
      tournament_athletes: {
        Row: TournamentAthlete
        Insert: { tournament_id: string; athlete_id: string; group_number?: number | null; group_rank?: number | null }
        Update: { group_number?: number | null; group_rank?: number | null }
        Relationships: []
      }
      group_matches: {
        Row: GroupMatch
        Insert: Omit<GroupMatch, 'id' | 'created_at' | 'athlete1' | 'athlete2'>
        Update: Partial<Omit<GroupMatch, 'id' | 'created_at' | 'athlete1' | 'athlete2'>>
        Relationships: []
      }
      knockout_matches: {
        Row: KnockoutMatch
        Insert: Omit<KnockoutMatch, 'id' | 'created_at' | 'athlete1' | 'athlete2'>
        Update: Partial<Omit<KnockoutMatch, 'id' | 'created_at' | 'athlete1' | 'athlete2'>>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
