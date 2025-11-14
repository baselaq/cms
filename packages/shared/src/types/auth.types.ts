export interface IAuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: "active" | "inactive" | "suspended";
  roles: string[];
  permissions: string[];
}

export interface IMeResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: "active" | "inactive" | "suspended";
  roles: string[];
  permissions: string[];
}
