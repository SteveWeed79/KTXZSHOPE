import { validateEnv } from "@/lib/envValidation";

export function register() {
  validateEnv();
}
