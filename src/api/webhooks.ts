import { clientAPI } from './client'

export interface Webhook {
    id: number
    name: string
    url: string
    active: boolean
    created_at: string
}

export interface WebhooksResponse {
    data: Webhook[]
    paging: {
        pages: {
            current: number
            last: number
        }
        results: {
            total: number
            limitation: number
        }
    }
}

export interface WebhooksListParams {
    page: number
    limit: number
    search: string
}

export type WebhookUpdatePayload = Pick<Webhook, 'name' | 'url'>

export const webhooksList = async (params: WebhooksListParams): Promise<WebhooksResponse> => {
    const response = await clientAPI.getWebhooks(params)
    return response.data
}

export const webhookGet = async (id: number): Promise<Webhook> => {

    const response = await clientAPI.api.get(`/v1/webhooks/${id}`)
    return response.data
}

export const webhookUpdate = async (id: number, data: WebhookUpdatePayload): Promise<Webhook> => {
    const response = await clientAPI.api.put(`/v1/webhooks/${id}`, data)
    return response.data
}
