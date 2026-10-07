import { Edit, Search } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    InputAdornment,
    LinearProgress,
    Pagination,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography
} from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { webhooksList } from '../../api/webhooks'
import { EditWebhookDialog } from './EditWebhookDialog'

const PAGE_SIZE = 10
const COLUMNS_COUNT = 4
const SEARCH_DEBOUNCE_MS = 400

const parsePage = (value: string | null) => {
    const page = Number(value)
    return Number.isInteger(page) && page > 0 ? page : 1
}

export const Webhooks = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const page = parsePage(searchParams.get('page'))
    const search = searchParams.get('search') ?? ''

    const [searchInput, setSearchInput] = useState(search)
    const [syncedSearch, setSyncedSearch] = useState(search)
    const [editingId, setEditingId] = useState<number | null>(null)

    if (search !== syncedSearch) {
        setSyncedSearch(search)
        setSearchInput(search)
    }

    const { data, isPending, isFetching, isError, refetch } = useQuery({
        queryKey: ['webhooks', { page, search }],
        queryFn: () => webhooksList({ page, limit: PAGE_SIZE, search }),
        placeholderData: keepPreviousData
    })

    useEffect(() => {
        if (searchInput.trim() === search) return

        const timeout = setTimeout(() => {
            setSearchParams(prev => {
                const next = new URLSearchParams(prev)
                const value = searchInput.trim()

                if (value) next.set('search', value)
                else next.delete('search')
                next.delete('page')

                return next
            })
        }, SEARCH_DEBOUNCE_MS)

        return () => clearTimeout(timeout)
    }, [searchInput, search])

    const handlePageChange = (_: unknown, value: number) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev)

            if (value > 1) next.set('page', String(value))
            else next.delete('page')

            return next
        })
    }

    const webhooks = data?.data ?? []
    const pagesCount = data?.data?.length ? (data?.paging.pages.last ?? 0) : 0

    const renderBody = () => {
        if (isPending) {
            return (
                <TableRow>
                    <TableCell colSpan={COLUMNS_COUNT} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={32} />
                    </TableCell>
                </TableRow>
            )
        }

        if (isError) {
            return (
                <TableRow>
                    <TableCell colSpan={COLUMNS_COUNT} sx={{ py: 4 }}>
                        <Alert
                            severity="error"
                            action={
                                <Button color="inherit" size="small" onClick={() => refetch()}>
                                    Retry
                                </Button>
                            }>
                            Failed to load webhooks
                        </Alert>
                    </TableCell>
                </TableRow>
            )
        }

        if (!webhooks.length) {
            return (
                <TableRow>
                    <TableCell colSpan={COLUMNS_COUNT} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        {search ? `No webhooks found for "${search}"` : 'No webhooks yet'}
                    </TableCell>
                </TableRow>
            )
        }

        return webhooks.map(webhook => (
            <TableRow key={webhook.id} hover>
                <TableCell>{webhook.name}</TableCell>
                <TableCell sx={{ wordBreak: 'break-all' }}>{webhook.url}</TableCell>
                <TableCell>
                    <Chip
                        size="small"
                        label={webhook.active ? 'Active' : 'Inactive'}
                        color={webhook.active ? 'success' : 'default'}
                        variant={webhook.active ? 'filled' : 'outlined'}
                    />
                </TableCell>
                <TableCell align="right">
                    <Tooltip title="Edit">
                        <IconButton
                            size="small"
                            aria-label={`Edit ${webhook.name}`}
                            onClick={() => setEditingId(webhook.id)}>
                            <Edit fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            </TableRow>
        ))
    }

    return (
        <Box sx={{ maxWidth: 1100, mx: 'auto', p: 3 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
                Webhooks
            </Typography>

            <TextField
                placeholder="Search by name"
                size="small"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search fontSize="small" />
                            </InputAdornment>
                        )
                    }
                }}
            />

            <Paper variant="outlined" sx={{ position: 'relative', overflow: 'hidden' }}>
                {isFetching && !isPending && (
                    <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
                )}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, width: '30%' }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>URL</TableCell>
                                <TableCell sx={{ fontWeight: 600, width: 140 }}>Status</TableCell>
                                <TableCell sx={{ width: 64 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>{renderBody()}</TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {!isError && pagesCount > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination count={pagesCount} page={page} onChange={handlePageChange} color="primary" />
                </Box>
            )}

            <EditWebhookDialog webhookId={editingId} onClose={() => setEditingId(null)} />
        </Box>
    )
}

export default Webhooks
