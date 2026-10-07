import axios, { AxiosError, isAxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { routes } from '../router/routes';
import { getFingerprint, setFingerprint } from '../store/storage';
import { revokeAuthToken, rotateAuthToken } from './auth/token';
import type { ApiErrorResponse } from './errors';



type RetryableRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean
    _authVersion?: number
}

export const getApiError = (error: unknown) => isAxiosError<ApiErrorResponse>(error) ? error.response?.data?.error : undefined

export class ClientAPI {
    public api: AxiosInstance
    public csrf = ''
    public isAuthenticated = false
    public csrfAllowedMethods: InternalAxiosRequestConfig['method'][] = ['post', 'put']
    public onLogout?: () => void

    private rotatePromise: Promise<void> | null = null
    private authVersion = 0

    constructor() {
        this.api = axios.create({
            baseURL: '/',
        })
        setFingerprint(crypto.randomUUID())
        this.setupInterceptors()
    }

    private rotateOnce(): Promise<void> {

        if (!this.rotatePromise) {
            this.rotatePromise = rotateAuthToken({
                fingerprint: getFingerprint(),
            }).then(() => {
                this.authVersion++
            }).finally(() => {
                this.rotatePromise = null
            })
        }

        return this.rotatePromise
    }

    private setupInterceptors() {
        this.api.interceptors.request.use(async (config: RetryableRequestConfig) => {
            // Новые запросы ждут уже идущую ротацию, чтобы не уйти со старым токеном
            if (this.rotatePromise) {
                await this.rotatePromise.catch(() => undefined)
            }
            if (this.csrfAllowedMethods.includes(config.method)) {
                config.headers['X-CSRF-TOKEN'] = this.csrf

            }
            console.log('@config', config)
            config._authVersion = this.authVersion

            config.headers['X-Requested-With'] = 'XMLHttpRequest'


            return config
        })

        this.api.interceptors.response.use(
            response => response,

            async (error: AxiosError) => {
                if (!this.isAuthenticated) {
                    return Promise.reject(error)
                }
                const originalRequest = error.config as RetryableRequestConfig | undefined

                if (!originalRequest || error.response?.status !== 401) {
                    return Promise.reject(error)
                }

                // Повторный 401 после ротации — сессию уже не восстановить
                if (originalRequest._retry) {
                    this.logout()
                    return Promise.reject(error)
                }

                originalRequest._retry = true

                // Если токен обновили уже после отправки этого запроса, ротация не нужна — просто повторяем
                if (originalRequest._authVersion === this.authVersion) {
                    try {
                        await this.rotateOnce()
                    } catch (rotateError) {
                        this.logout()
                        return Promise.reject(rotateError)
                    }
                }

                return this.api(originalRequest)
            },
        )
    }

    public logout() {
        // Параллельные запросы могут упасть одновременно — завершаем сессию один раз
        if (!this.isAuthenticated) return

        this.isAuthenticated = false
        this.rotatePromise = null
        this.authVersion++

        revokeAuthToken({ fingerprint: getFingerprint() })
            .catch(() => undefined)
            .finally(() => {
                this.csrf = ''
            })

        if (this.onLogout) this.onLogout()
        else window.location.replace(routes.auth.login)
    }

    public getWebhooks(params?: {
        page?: number
        limit?: number
        search?: string
    }) {
        return this.api.get('/v1/webhooks', {
            params,
        })
    }


}

export const clientAPI = new ClientAPI()


