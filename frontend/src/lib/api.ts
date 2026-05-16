import axios from "axios";
import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 60000,
});

let _token: string | null = null;

export function setAuthToken(token: string | null) {
  _token = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export function getAuthToken() {
  return _token;
}

export async function bootstrapToken(): Promise<string | null> {
  const t = await storage.secureGet<string>("stash_token", "");
  if (t && typeof t === "string") {
    setAuthToken(t);
    return t;
  }
  return null;
}

export async function persistToken(token: string | null) {
  if (token) {
    await storage.secureSet("stash_token", token);
  } else {
    await storage.secureRemove("stash_token");
  }
}

export type StashItem = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  metadata: Record<string, any>;
  raw_text?: string | null;
  image_base64?: string | null;
  note?: string | null;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
  last_resurfaced?: string | null;
};

export type UserPublic = {
  id: string;
  email: string;
  is_admin: boolean;
};
