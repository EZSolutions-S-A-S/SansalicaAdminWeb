export interface LoginRequest {
  username: string;
  password: string;
}

export interface Tokens {
  access: string;
  refresh: string;
}

export interface AdminProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  photo_url: string | null;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
