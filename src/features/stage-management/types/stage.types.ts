export interface Stage {
  id: string;
  name: string;
  display_order: number;
  color_code: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
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
}