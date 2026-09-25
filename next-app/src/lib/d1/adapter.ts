import { getD1, initD1Tables } from './db'
import { verifySessionToken } from '../auth/jwt'
import { comparePassword, hashPassword } from '../auth/password'

type D1DatabaseType = any

export class D1QueryBuilder {
  private tableName: string
  private dbPromise: Promise<D1DatabaseType | null>
  private columns: string = '*'
  private whereConditions: { column: string; operator: string; value: any }[] = []
  private orderByClause: string = ''
  private limitCount: number | null = null
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private valuesToInsert: any[] = []
  private valuesToUpdate: Record<string, any> | null = null

  constructor(tableName: string, dbPromise: Promise<D1DatabaseType | null>) {
    this.tableName = tableName
    this.dbPromise = dbPromise
  }

  select(columns: string = '*'): this {
    this.columns = columns
    return this
  }

  eq(column: string, value: any): this {
    this.whereConditions.push({ column, operator: '=', value })
    return this
  }

  neq(column: string, value: any): this {
    this.whereConditions.push({ column, operator: '!=', value })
    return this
  }

  ilike(column: string, value: any): this {
    this.whereConditions.push({ column, operator: 'LIKE', value: String(value).replace(/%/g, '') })
    return this
  }

  is(column: string, value: any): this {
    if (value === null) {
      this.whereConditions.push({ column, operator: 'IS', value: null })
    } else {
      this.whereConditions.push({ column, operator: '=', value })
    }
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    const dir = options?.ascending === false ? 'DESC' : 'ASC'
    this.orderByClause = `ORDER BY "${column}" ${dir}`
    return this
  }

  limit(count: number): this {
    this.limitCount = count
    return this
  }

  insert(values: any | any[], _options?: any): this {
    this.operation = 'insert'
    this.valuesToInsert = Array.isArray(values) ? values : [values]
    return this
  }

  upsert(values: any | any[], _options?: any): this {
    return this.insert(values, _options)
  }

  update(values: Record<string, any>): this {
    this.operation = 'update'
    this.valuesToUpdate = values
    return this
  }

  delete(): this {
    this.operation = 'delete'
    return this
  }

  private buildWhere(): { clause: string; params: any[] } {
    if (this.whereConditions.length === 0) {
      return { clause: '', params: [] }
    }
    const parts: string[] = []
    const params: any[] = []
    for (const cond of this.whereConditions) {
      if (cond.operator === 'IS' && cond.value === null) {
        parts.push(`"${cond.column}" IS NULL`)
      } else {
        parts.push(`"${cond.column}" ${cond.operator} ?`)
        params.push(cond.value)
      }
    }
    return { clause: `WHERE ${parts.join(' AND ')}`, params }
  }

  async execute(): Promise<{ data: any[] | null; error: any }> {
    try {
      const db = await this.dbPromise
      if (!db) {
        return { data: null, error: new Error('Database not connected') }
      }

      await initD1Tables(db)

      if (this.operation === 'select') {
        const { clause, params } = this.buildWhere()
        let sql = `SELECT ${this.columns} FROM "${this.tableName}" ${clause} ${this.orderByClause}`
        if (this.limitCount !== null) {
          sql += ` LIMIT ${this.limitCount}`
        }
        const stmt = db.prepare(sql).bind(...params)
        const { results } = await stmt.all()
        return { data: (results || []) as any, error: null }
      }

      if (this.operation === 'insert') {
        if (this.valuesToInsert.length === 0) {
          return { data: [] as any, error: null }
        }

        const insertedRows: any[] = []
        for (const row of this.valuesToInsert) {
          const keys = Object.keys(row)
          const cols = keys.map(k => `"${k}"`).join(', ')
          const placeholders = keys.map(() => '?').join(', ')
          const vals = keys.map(k => {
            const v = row[k]
            if (typeof v === 'boolean') return v ? 1 : 0
            return v
          })

          const sql = `INSERT OR REPLACE INTO "${this.tableName}" (${cols}) VALUES (${placeholders}) RETURNING *`
          const inserted = await db.prepare(sql).bind(...vals).first()
          insertedRows.push(inserted || row)
        }

        return {
          data: (this.valuesToInsert.length === 1 ? insertedRows[0] : insertedRows) as any,
          error: null
        }
      }

      if (this.operation === 'update') {
        if (!this.valuesToUpdate) {
          return { data: null, error: null }
        }
        const keys = Object.keys(this.valuesToUpdate)
        const setParts = keys.map(k => `"${k}" = ?`).join(', ')
        const updateVals = keys.map(k => {
          const v = this.valuesToUpdate![k]
          if (typeof v === 'boolean') return v ? 1 : 0
          return v
        })

        const { clause, params } = this.buildWhere()
        const sql = `UPDATE "${this.tableName}" SET ${setParts} ${clause} RETURNING *`
        const allParams = [...updateVals, ...params]
        const { results } = await db.prepare(sql).bind(...allParams).all()
        return { data: (results || []) as any, error: null }
      }

      if (this.operation === 'delete') {
        const { clause, params } = this.buildWhere()
        const sql = `DELETE FROM "${this.tableName}" ${clause}`
        await db.prepare(sql).bind(...params).run()
        return { data: [] as any, error: null }
      }

      return { data: null, error: null }
    } catch (err: any) {
      console.error(`D1 Query Error (${this.tableName}):`, err)
      return { data: null, error: err }
    }
  }

  async single(): Promise<{ data: any; error: any }> {
    const res = await this.execute()
    if (res.error) return res
    if (Array.isArray(res.data)) {
      if (res.data.length === 0) return { data: null, error: new Error('No rows found') }
      return { data: res.data[0], error: null }
    }
    return res
  }

  async maybeSingle(): Promise<{ data: any; error: any }> {
    const res = await this.execute()
    if (res.error) return res
    if (Array.isArray(res.data)) {
      return { data: res.data[0] || null, error: null }
    }
    return res
  }

  then<TResult1 = { data: any[] | null; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any[] | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected)
  }
}

export function createD1Client(cookieStore?: any) {
  const dbPromise = getD1()

  return {
    from(table: string): D1QueryBuilder {
      return new D1QueryBuilder(table, dbPromise)
    },

    auth: {
      async getUser() {
        try {
          const cookieList = cookieStore ? await cookieStore : null
          const token = cookieList?.get?.('auth_session')?.value
          if (!token) return { data: { user: null }, error: null }

          const session = await verifySessionToken(token)
          if (!session) return { data: { user: null }, error: null }

          return {
            data: {
              user: {
                id: session.id,
                email: session.email,
                app_metadata: { role: session.role },
                user_metadata: { role: session.role },
              }
            },
            error: null
          }
        } catch (e: any) {
          return { data: { user: null }, error: e }
        }
      },

      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const cleanEmail = email.trim().toLowerCase()
        const db = await dbPromise
        if (!db) return { data: { session: null, user: null }, error: new Error('DB not available') }

        await initD1Tables(db)

        const user = await db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').bind(cleanEmail).first()
        if (!user) {
          return { data: { session: null, user: null }, error: new Error('Invalid email or password') }
        }

        const valid = await comparePassword(password, user.passwordHash)
        if (!valid) {
          return { data: { session: null, user: null }, error: new Error('Invalid email or password') }
        }

        const role = (user.role === 'ADMIN' || cleanEmail.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'
        const appUser = {
          id: user.id,
          email: user.email,
          role,
          app_metadata: { role },
          user_metadata: { role },
        }

        return {
          data: {
            session: { user: appUser },
            user: appUser,
          },
          error: null
        }
      },

      admin: {
        async listUsers() {
          const db = await dbPromise
          if (!db) return { data: { users: [] }, error: null }
          await initD1Tables(db)
          const { results } = await db.prepare('SELECT * FROM users').all()
          return {
            data: {
              users: (results || []).map((u: any) => ({
                id: u.id,
                email: u.email,
                role: u.role,
                user_metadata: { role: u.role },
                app_metadata: { role: u.role },
              }))
            },
            error: null
          }
        },

        async createUser({ email, password, user_metadata }: any) {
          const db = await dbPromise
          if (!db) return { data: { user: null }, error: new Error('DB not available') }
          await initD1Tables(db)

          const cleanEmail = email.trim().toLowerCase()
          const hash = await hashPassword(password)
          const role = user_metadata?.role || (cleanEmail.startsWith('admin') ? 'ADMIN' : 'RESIDENT')
          const id = crypto.randomUUID()

          await db.prepare('INSERT OR REPLACE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, datetime("now"), datetime("now"))')
            .bind(id, cleanEmail, hash, role)
            .run()

          return {
            data: {
              user: {
                id,
                email: cleanEmail,
                role,
                user_metadata: { role },
                app_metadata: { role }
              }
            },
            error: null
          }
        },

        async updateUserById(userId: string, { password, user_metadata }: any) {
          const db = await dbPromise
          if (!db) return { data: { user: null }, error: new Error('DB not available') }
          await initD1Tables(db)

          if (password) {
            const hash = await hashPassword(password)
            await db.prepare('UPDATE users SET passwordHash = ?, updatedAt = datetime("now") WHERE id = ?')
              .bind(hash, userId)
              .run()
          }

          if (user_metadata?.role) {
            await db.prepare('UPDATE users SET role = ?, updatedAt = datetime("now") WHERE id = ?')
              .bind(user_metadata.role, userId)
              .run()
          }

          return { data: { user: { id: userId } }, error: null }
        },

        async deleteUser(userId: string) {
          const db = await dbPromise
          if (!db) return { data: null, error: new Error('DB not available') }
          await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
          return { data: { id: userId }, error: null }
        }
      }
    }
  }
}
