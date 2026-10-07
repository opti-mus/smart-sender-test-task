import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient } from './api/queryClient'
import { AppRouter } from './router'
import { theme } from './theme'

async function enableMocking() {
    if (import.meta.env.DEV) {
        const { worker } = await import('./mocks/setup')

        await worker.start()
    }
}

enableMocking().then(() => {
    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <QueryClientProvider client={queryClient}>
                    <AppRouter />
                </QueryClientProvider>
            </ThemeProvider>
        </StrictMode>
    )
})
