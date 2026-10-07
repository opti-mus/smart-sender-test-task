import {
    createBrowserRouter,
    createRoutesFromElements,
    Navigate,
    Outlet,
    Route,
    RouterProvider
} from 'react-router-dom'
import { clientAPI } from '../api/client'
import { queryClient } from '../api/queryClient'
import { privateRoutes, publicRoutes, routes } from './routes'

const NavigateToLogin = () => {
    if (!clientAPI.isAuthenticated) {
        return <Navigate to={routes.auth.login} />
    }
    return <Outlet />
}

const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route element={<NavigateToLogin />}>
                {Object.values(privateRoutes).map(({ Element, path }) => (
                    <Route key={path} path={path} element={<Element />} />
                ))}
            </Route>
            <Route element={<Outlet />}>
                {Object.values(publicRoutes).map(({ Element, path }) => (
                    <Route key={path} path={path} element={<Element />} />
                ))}
            </Route>

            <Route path="*" element={<Navigate to={routes.auth.login} />} />
        </>
    )
)

clientAPI.onLogout = () => {
    queryClient.clear()
    router.navigate(routes.auth.login, { replace: true })
}

export const AppRouter = () => {
    return <RouterProvider router={router} />
}
