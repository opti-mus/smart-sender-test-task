import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { ClientAPI } from '../api/client'

let rotated = false
let rotateCount = 0
let webhooksCalls = 0

const server = setupServer(
    http.post('/auth/token/rotate', async () => {
        rotateCount++
        rotated = true
        return new HttpResponse(null, { status: 200 })
    }),
    http.get('/v1/webhooks', () => {
        webhooksCalls++
        if (!rotated) {
            return HttpResponse.json(
                { error: { type: 'AuthenticationException', message: 'Unauthenticated.' } },
                { status: 401 },
            )
        }
        return HttpResponse.json({ data: [] })
    }),
)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

it('two parallel requests with 401 trigger a single rotate and both retries succeed', async () => {
    const client = new ClientAPI()
    client.isAuthenticated = true

    const [first, second] = await Promise.all([client.getWebhooks(), client.getWebhooks()])

    expect(rotateCount).toBe(1)
    expect(webhooksCalls).toBe(4)
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
})
