import { Pool, QueryResult } from 'pg';
import { UserEntity } from '../types/registration.types';

export interface IUserRepository {
  findById(userId: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  create(
    id: string,
    username: string,
    email: string,
    passwordHash: string,
    name: string,
  ): Promise<UserEntity>;
  updateLastLoginAt(userId: string, lastLoginAt: Date): Promise<void>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  updateName(userId: string, name: string): Promise<void>;
  delete(userId: string): Promise<void>;
}

function rowToEntity(row: Record<string, unknown>): UserEntity {
  return {
    id: row['id'] as string,
    username: row['username'] as string,
    email: row['email'] as string,
    passwordHash: row['password_hash'] as string,
    name: row['name'] as string,
    lastLoginAt: row['last_login_at'] ? new Date(row['last_login_at'] as string) : null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

export class UserRepository implements IUserRepository {
  constructor(private readonly db: Pool) {}

  async findById(userId: string): Promise<UserEntity | null> {
    const result: QueryResult = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [userId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToEntity(result.rows[0] as Record<string, unknown>);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const result: QueryResult = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToEntity(result.rows[0] as Record<string, unknown>);
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const result: QueryResult = await this.db.query(
      'SELECT * FROM users WHERE username = $1',
      [username],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToEntity(result.rows[0] as Record<string, unknown>);
  }

  async create(
    id: string,
    username: string,
    email: string,
    passwordHash: string,
    name: string,
  ): Promise<UserEntity> {
    const result: QueryResult = await this.db.query(
      `INSERT INTO users (id, username, email, password_hash, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [id, username, email, passwordHash, name],
    );
    return rowToEntity(result.rows[0] as Record<string, unknown>);
  }

  async updateLastLoginAt(userId: string, lastLoginAt: Date): Promise<void> {
    await this.db.query(
      'UPDATE users SET last_login_at = $1 WHERE id = $2',
      [lastLoginAt, userId],
    );
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId],
    );
  }

  async updateName(userId: string, name: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET name = $1 WHERE id = $2',
      [name, userId],
    );
  }

  async delete(userId: string): Promise<void> {
    await this.db.query(
      'DELETE FROM users WHERE id = $1',
      [userId],
    );
  }
}