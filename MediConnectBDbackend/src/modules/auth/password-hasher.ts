/**
 * Password hashing boundary used by AuthService and test doubles. The runtime implementation uses
 * bcrypt cost 12; only hashes are persisted, and passwords must never enter logs or API responses.
 */

import { compare, hash } from "bcryptjs";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return hash(password, 12);
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }
}
