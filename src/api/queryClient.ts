import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

const MAX_RETRIES = 3

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
                const status = isAxiosError(error) ? error.response?.status : undefined
                if (status && status >= 400 && status < 500) return false
                return failureCount < MAX_RETRIES
            }
        }
    }
})