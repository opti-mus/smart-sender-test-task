import { Visibility, VisibilityOff } from '@mui/icons-material'
import { Box, Button, CircularProgress, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../../../api/auth/login'
import { loginUserToken, type LoginUserTokenType } from '../../../api/auth/token'
import { clientAPI, getApiError } from '../../../api/client'
import { routes } from '../../../router/routes'
import { getFingerprint } from '../../../store/storage'

interface FormErrors {
    email?: string
    password?: string
}

export const LoginPage = () => {
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [errors, setErrors] = useState<FormErrors>({})

    const { isSuccess } = useQuery({
        queryKey: ['csrf'],
        queryFn: async () => clientAPI.api.get('/csrf')
    })

    const {
        mutate: login,
        isPending,
        data: loginData
    } = useMutation({
        mutationFn: loginUser,
        onError: error => {
            const apiError = getApiError(error)

            if (apiError?.type !== 'ValidationException' || !apiError.payload) return

            setErrors({
                email: apiError.payload.email?.[0],
                password: apiError.payload.password?.[0]
            })
        }
    })

    const { mutate: loginUserTokenMutation, isPending: isLoginUserTokenPending } = useMutation<
        LoginUserTokenType,
        unknown,
        LoginUserTokenType
    >({
        mutationFn: async data => {
            return await loginUserToken(data)
        },
        onSuccess: () => {
            clientAPI.isAuthenticated = true
            navigate(routes.webhooks)
        }
    })

    useEffect(() => {
        if (!isSuccess || !loginData?.device_session_token) return

        loginUserTokenMutation({
            device_session_token: loginData.device_session_token,
            fingerprint: getFingerprint()
        })
    }, [isSuccess, loginData])

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        login({
            email,
            password,
            fingerprint: getFingerprint()
        })
    }

    return (
        <Box
            sx={{
                minHeight: '100svh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
                p: 2
            }}>
            <Paper elevation={3} sx={{ width: '100%', maxWidth: 400, p: 4 }}>
                <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
                    Log In
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    Sign in to your admin dashboard
                </Typography>

                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    noValidate
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        fullWidth
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        error={!!errors.email}
                        helperText={errors.email}
                    />
                    <TextField
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        fullWidth
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        error={!!errors.password}
                        helperText={errors.password}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            onClick={() => setShowPassword(prev => !prev)}
                                            edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }
                        }}
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={isPending || isLoginUserTokenPending}>
                        {isPending ? <CircularProgress size={20} /> : 'Log In'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    )
}

export default LoginPage
