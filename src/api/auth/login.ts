import { clientAPI } from "../client"

export type LoginUserType = {
    email: string
    password: string
    fingerprint: string
}



export const loginUser = async (data: LoginUserType) => {
    const response = await clientAPI.api.post('/auth/login', data,
        {
            headers: {
                'X-Captcha-Token': '123'
            }
        }
    )
    return response.data
}

