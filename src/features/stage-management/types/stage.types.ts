export interface Stage {
  id: string;
  name: string;
  display_order: number;
  color_code: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  threshold_minutes?: number | null; // US-6.3: per-stage override (null = use global)
  created_at: string;
  updated_at: string;
}

export interface CreateStageInput {
  name: string;
  color_code: string;
  description?: string;
}

export interface UpdateStageInput {
  id: string;
  name?: string;
  color_code?: string;
  description?: string;
  threshold_minutes?: number | null; // US-6.3
}