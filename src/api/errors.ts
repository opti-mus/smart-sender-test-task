export type ApiErrorType =
    | 'BadRequestException'
    | 'AuthenticationException'
    | 'NotFoundException'
    | 'TokenMismatchException'
    | 'ValidationException'

export type ApiErrorResponse = {
    error: {
        type: ApiErrorType
        message: string
        payload?: Record<string, string[]>
    }
}
