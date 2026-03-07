export interface Ward {
    id: string
    name: string
    code: string
    description: string | null
    is_active: boolean
    created_at: Date
    updated_at: Date
}

export type CreateWardInput = {
    name: string
    code: string
    description?: string
}
