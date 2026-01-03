import api from './client';

export interface User {
  id: number;
  username: string;
  fullName: string;
  roleId: number;
  storeId: number | null;
  isActive: boolean;
  createdAt: string;
  role?: {
    id: number;
    code: string;
    name: string;
  };
  store?: {
    id: number;
    name: string;
  };
}

export interface CreateUserDto {
  username: string;
  password: string;
  fullName: string;
  roleId: number;
  storeId?: number | null;
}

export interface UpdateUserDto extends Partial<CreateUserDto> {
  isActive?: boolean;
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },

  getById: async (id: number): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: CreateUserDto): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data;
  },

  update: async (id: number, data: UpdateUserDto): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
