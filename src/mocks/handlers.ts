import { delay, http, HttpResponse, type PathParams } from 'msw'
import type { LoginUserType } from '../api/auth/login'
import type { LoginUserTokenType } from '../api/auth/token'
import { clientAPI } from '../api/client'
import type { ApiErrorResponse } from '../api/errors'
import type { WebhookUpdatePayload } from '../api/webhooks'
import { webhooksMock } from './webhooks'

const SESSION_DURATION = 30_000

let device_session_token = ''
let fingerprint = ''
let session: {
    expiresAt: number
} | null = null


const errors = {
    badRequest: (message = 'Bad request.') =>
        HttpResponse.json<ApiErrorResponse>(
            { error: { type: 'BadRequestException', message } },
            { status: 400 },
        ),
    unauthenticated: () =>
        HttpResponse.json<ApiErrorResponse>(
            { error: { type: 'AuthenticationException', message: 'Unauthenticated.' } },
            { status: 401 },
        ),
    notFound: () =>
        HttpResponse.json<ApiErrorResponse>(
            { error: { type: 'NotFoundException', message: 'Not found.' } },
            { status: 404 },
        ),
    tokenMismatch: () =>
        HttpResponse.json<ApiErrorResponse>(
            { error: { type: 'TokenMismatchException', message: 'CSRF token mismatch.' } },
            { status: 419 },
        ),
    validation: (payload: Record<string, string[]>) =>
        HttpResponse.json<ApiErrorResponse>(
            { error: { type: 'ValidationException', message: 'The given data was invalid.', payload } },
            { status: 422 },
        ),
}

const hasActiveSession = () => {
    if (!session || Date.now() >= session.expiresAt) {
        session = null
        return false
    }
    return true
}

const isValidHttpUrl = (value: string) => {
    try {
        const { protocol } = new URL(value)
        return protocol === 'http:' || protocol === 'https:'
    } catch {
        return false
    }
}

const validateHeaders = (request: Request) => {
    if (!request.headers.get('X-Captcha-Token')) {
        return errors.badRequest('X-Captcha-Token header is required.')
    }

    if (!request.headers.get('X-CSRF-TOKEN')) {
        return errors.tokenMismatch()
    }

    return null
}

export const handlers = [
    http.get('/csrf', () => {
        clientAPI.csrf = crypto.randomUUID()

        return HttpResponse.json(null, { status: 204 })
    }),
    http.post<PathParams, LoginUserType>('/auth/login', async ({ request }) => {
        const error = validateHeaders(request)
        await delay(1000)
        if (error) {
            return error
        }

        const newLogin = await request.clone().json()
        console.log('@newLogin', newLogin)
        if (newLogin?.email && newLogin.email.trim() !== 'example@example.com') {
            return errors.validation({ email: ['The email must be a incorrect.'] })
        }
        if (newLogin?.password && newLogin.password.trim() !== 'String123') {
            return errors.validation({ password: ['The password must be a incorrect.'] })
        }
        if (newLogin?.fingerprint.trim() === '') {
            return errors.validation({ fingerprint: ['The fingerprint must be a valid.'] })
        }
        device_session_token = crypto.randomUUID()
        fingerprint = newLogin.fingerprint

        return HttpResponse.json({
            device_session_token: device_session_token
        }, { status: 200 })
    }),
    http.post<PathParams, LoginUserTokenType>('/auth/token/issue', async ({ request }) => {
        const body = await request.json()

        const payload: Record<string, string[]> = {}
        if (body.device_session_token !== device_session_token) {
            payload.device_session_token = ['The device session token is invalid.']
        }
        if (body.fingerprint !== fingerprint) {
            payload.fingerprint = ['The fingerprint is invalid.']
        }
        if (Object.keys(payload).length > 0) {
            return errors.validation(payload)
        }


        session = {
            expiresAt: Date.now() + SESSION_DURATION,
        }

        return new HttpResponse(null, { status: 200 })
    }),
    http.post<PathParams, Pick<LoginUserTokenType, 'fingerprint'>>('/auth/token/rotate', async ({ request }) => {
        const body = await request.json()

        if (body.fingerprint !== fingerprint) {
            return errors.badRequest('Invalid fingerprint.')
        }

        session = {
            expiresAt: Date.now() + SESSION_DURATION,
        }

        return new HttpResponse(null, { status: 200 })
    }),

    http.post<PathParams, Pick<LoginUserTokenType, 'fingerprint'>>('/auth/token/revoke', async ({ request }) => {
        const body = await request.json()
        if (body.fingerprint !== fingerprint) {
            return errors.badRequest('Invalid fingerprint.')
        }
        session = null
        return new HttpResponse(null, { status: 204 })
    }),


    http.get('/v1/webhooks', async ({ request }) => {
        if (!session || Date.now() >= session.expiresAt) {
            session = null

            return errors.unauthenticated()
        }
        await delay(1000)
        const url = new URL(request.url)

        const page = Number(url.searchParams.get('page')) || 1
        const limit = Number(url.searchParams.get('limit')) || 10
        const search = (url.searchParams.get('search') || '').trim().toLowerCase()


        const filtered = webhooksMock.data.filter((webhook) =>
            webhook.name.toLowerCase().includes(search)
        )

        const start = (page - 1) * limit
        const end = start + limit

        const data = filtered.slice(start, end)

        return HttpResponse.json({
            data,
            paging: {
                pages: {
                    current: page,
                    last: Math.ceil(filtered.length / limit),
                },
                results: {
                    total: filtered.length,
                    limitation: limit,
                },
            },
        })
    }),

    http.get<{ id: string }>('/v1/webhooks/:id', ({ params }) => {
        if (!hasActiveSession()) {
            return errors.unauthenticated()
        }

        const webhook = webhooksMock.data.find(item => item.id === Number(params.id))
        if (!webhook) {
            return errors.notFound()
        }

        return HttpResponse.json(webhook, { status: 200 })
    }),

    http.put<{ id: string }, Partial<WebhookUpdatePayload>>('/v1/webhooks/:id', async ({ params, request }) => {
        if (!hasActiveSession()) {
            return errors.unauthenticated()
        }

        const webhook = webhooksMock.data.find(item => item.id === Number(params.id))
        if (!webhook) {
            return errors.notFound()
        }

        const body = await request.json()
        const name = typeof body?.name === 'string' ? body.name.trim() : ''
        const url = typeof body?.url === 'string' ? body.url.trim() : ''

        const payload: Record<string, string[]> = {}
        if (!name) {
            payload.name = ['The name field is required.']
        } else if (name.length > 255) {
            payload.name = ['The name may not be greater than 255 characters.']
        }
        if (!url) {
            payload.url = ['The url field is required.']
        } else if (!isValidHttpUrl(url)) {
            payload.url = ['The url format is invalid.']
        }
        if (Object.keys(payload).length > 0) {
            return errors.validation(payload)
        }

        webhook.name = name
        webhook.url = url

        return HttpResponse.json(webhook, { status: 200 })
    })
]