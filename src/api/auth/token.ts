import axios from "axios"
import { clientAPI } from "../client"

export type LoginUserTokenType = {
    device_session_token: string
    fingerprint: string
}


export const loginUserToken = async (data: LoginUserTokenType) => {

    const response = await clientAPI.api.post('/auth/token/issue', data,
        {
            headers: {
                'X-Captcha-Token': '123'
            }
        }
    )
    return response.data

}
export const rotateAuthToken = async (data: Pick<LoginUserTokenType, 'fingerprint'>) => {
    // Отдельный axios без интерцепторов: 401 от rotate не должен снова запускать rotate.
    // Ошибку не глушим — клиент должен узнать, что rotate не удался
    const response = await axios.post('/auth/token/rotate', data, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    return response.data
}
export const revokeAuthToken = async (data: Pick<LoginUserTokenType, 'fingerprint'>) => {
    const response = await clientAPI.api.post('/auth/token/revoke', data)
    return response.data
}