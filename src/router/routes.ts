import { lazy, type JSX, type LazyExoticComponent } from "react"

const LoginPage = lazy(() => import('../pages/auth/LoginPage/LoginPage'))
const WebhooksPage = lazy(() => import('../pages/Webhooks/Webhooks'))

export interface PageMeta {
    title: string
    description: string
}

export interface RouteType {
    Element: LazyExoticComponent<() => JSX.Element>
    path: string
    namespace?: string
    meta?: PageMeta
}

export const routes = {
    webhooks: '/webhooks',
    auth: {
        login: '/login',
    },

}

const allRoutes = {
    // Public routes

    login: {
        Element: LoginPage,
        path: routes.auth.login,
        namespace: 'login',
        meta: {
            title: 'Log In',
            description: 'Sign in to your admin dashboard'
        }
    },

    // Private routes
    webhooks: {
        Element: WebhooksPage,
        path: routes.webhooks,
        namespace: 'Webhooks',
        meta: {
            title: 'Webhooks',
            description: 'Manage your Webhooks'
        }
    },

} as const


export const publicRoutes: Record<string, RouteType> = {
    login: allRoutes.login,
}

export const privateRoutes: Record<string, RouteType> = {
    webhooks: allRoutes.webhooks
}