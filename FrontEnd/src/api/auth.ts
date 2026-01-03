import api from './client';

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    roleCode: string;
    storeId: number;
  };
}

export const authApi = {
  login: async (data: LoginDto): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
};
