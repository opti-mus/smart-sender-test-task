import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { webhookGet, webhookUpdate, type Webhook, type WebhookUpdatePayload } from '../../api/webhooks'
import { getApiError } from '../../api/client'

type FieldErrors = Partial<Record<keyof WebhookUpdatePayload, string>>

interface EditWebhookFormProps {
    webhook: Webhook
    onClose: () => void
}

const FORM_ID = 'edit-webhook-form'

const EditWebhookForm = ({ webhook, onClose }: EditWebhookFormProps) => {
    const queryClient = useQueryClient()
    const [values, setValues] = useState<WebhookUpdatePayload>({ name: webhook.name, url: webhook.url })
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

    const { mutate: updateWebhook, isPending } = useMutation({
        mutationFn: (data: WebhookUpdatePayload) => webhookUpdate(webhook.id, data),
        onSuccess: updated => {
            queryClient.setQueryData(['webhook', updated.id], updated)
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
            onClose()
        },
        onError: error => {
            const apiError = getApiError(error)
            if (apiError?.type !== 'ValidationException' || !apiError.payload) return

            setFieldErrors({
                name: apiError.payload.name?.[0],
                url: apiError.payload.url?.[0]
            })
        }
    })

    const handleChange = (field: keyof WebhookUpdatePayload) => (value: string) => {
        setValues(prev => ({ ...prev, [field]: value }))
        setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }

    const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()

        updateWebhook({ name: values.name.trim(), url: values.url.trim() })
    }

    return (
        <>
            <DialogContent>
                <Box
                    id={FORM_ID}
                    component="form"
                    onSubmit={handleSubmit}
                    noValidate
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label="Name"
                        fullWidth
                        autoFocus
                        value={values.name}
                        onChange={e => handleChange('name')(e.target.value)}
                        error={!!fieldErrors.name}
                        helperText={fieldErrors.name}
                        disabled={isPending}
                    />
                    <TextField
                        label="URL"
                        fullWidth
                        value={values.url}
                        onChange={e => handleChange('url')(e.target.value)}
                        error={!!fieldErrors.url}
                        helperText={fieldErrors.url}
                        disabled={isPending}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isPending}>
                    Cancel
                </Button>
                <Button type="submit" form={FORM_ID} variant="contained" loading={isPending}>
                    Save
                </Button>
            </DialogActions>
        </>
    )
}

interface EditWebhookDialogProps {
    webhookId: number | null
    onClose: () => void
}

export const EditWebhookDialog = ({ webhookId, onClose }: EditWebhookDialogProps) => {
    const { data, isPending, isError, error, refetch } = useQuery({
        queryKey: ['webhook', webhookId],
        queryFn: () => webhookGet(webhookId!),
        enabled: webhookId !== null,
        staleTime: 0
    })

    const renderContent = () => {
        if (isPending) {
            return (
                <DialogContent sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={32} />
                </DialogContent>
            )
        }

        if (isError) {
            const notFound = isAxiosError(error) && error.response?.status === 404

            return (
                <>
                    <DialogContent>
                        <Alert
                            severity="error"
                            action={
                                !notFound && (
                                    <Button color="inherit" size="small" onClick={() => refetch()}>
                                        Retry
                                    </Button>
                                )
                            }>
                            {notFound ? 'Webhook not found' : 'Failed to load webhook'}
                        </Alert>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={onClose}>Close</Button>
                    </DialogActions>
                </>
            )
        }

        return <EditWebhookForm key={data.id} webhook={data} onClose={onClose} />
    }

    return (
        <Dialog open={webhookId !== null} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Edit webhook</DialogTitle>
            {webhookId !== null && renderContent()}
        </Dialog>
    )
}
