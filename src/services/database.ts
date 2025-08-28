import initSqlJs, { Database } from 'sql.js';

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  department_id: string;
}

interface AttendanceRecord {
  id: string;
  department_id: string;
  department_name: string;
  employee_id: string;
  employee_name: string;
  type: string;
  type_name: string;
  timestamp: string;
  date: string;
  synced?: boolean;
}

export class DatabaseService {
  private db: Database | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`
      });

      // 既存のデータベースファイルがあるかチェック
      const savedDb = localStorage.getItem('attendance_database');
      
      if (savedDb) {
        // 既存のデータベースを復元
        const uint8Array = new Uint8Array(JSON.parse(savedDb));
        this.db = new SQL.Database(uint8Array);
      } else {
        // 新しいデータベースを作成
        this.db = new SQL.Database();
        await this.createTables();
        await this.insertDefaultDepartments();
      }

      this.isInitialized = true;
      
      // 毎月10日のクリーンアップをチェック
      this.checkAndPerformMonthlyCleanup();
      
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // 部署テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )
    `);

    // 職員テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        department_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments (id)
      )
    `);

    // 打刻記録テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL,
        department_name TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        type TEXT NOT NULL,
        type_name TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        date TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments (id),
        FOREIGN KEY (employee_id) REFERENCES employees (id)
      )
    `);

    // 設定テーブル
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // インデックスを作成
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_employees_department ON employees (department_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_department ON attendance_records (department_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records (employee_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records (date);
      CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_records (timestamp);
    `);

    this.saveDatabase();
  }

  private async insertDefaultDepartments(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const departments = [
      { id: 'doctor', name: '医師' },
      { id: 'rehabilitation', name: 'リハビリ' },
      { id: 'daycare', name: '通所介護' },
      { id: 'care1f', name: '１階介護' },
      { id: 'care2f', name: '２階介護' },
      { id: 'nursing', name: '看護' },
      { id: 'office', name: '事務' },
      { id: 'operations', name: '業務職員' },
      { id: 'kitchen', name: '厨房' }
    ];

    const stmt = this.db.prepare('INSERT OR IGNORE INTO departments (id, name) VALUES (?, ?)');
    
    for (const dept of departments) {
      stmt.run([dept.id, dept.name]);
    }
    
    stmt.free();
    this.saveDatabase();
  }

  private saveDatabase(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const dataArray = Array.from(data);
      localStorage.setItem('attendance_database', JSON.stringify(dataArray));
    } catch (error) {
      console.error('Failed to save database:', error);
      throw error; // 追加
    }
  }

  // 部署一覧を取得
  async getDepartments(): Promise<Department[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT id, name FROM departments ORDER BY name');
    const result = stmt.getAsObject({});
    const departments: Department[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      departments.push({
        id: row.id as string,
        name: row.name as string
      });
    }
    
    stmt.free();
    return departments;
  }

  // 職員を追加
  async addEmployee(name: string, departmentId: string): Promise<Employee> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString();
    const stmt = this.db.prepare('INSERT INTO employees (id, name, department_id) VALUES (?, ?, ?)');
    stmt.run([id, name, departmentId]);
    stmt.free();
    
    this.saveDatabase();
    
    return { id, name, department_id: departmentId };
  }

  // 部署の職員一覧を取得
  async getEmployeesByDepartment(departmentId: string): Promise<Employee[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT id, name, department_id FROM employees WHERE department_id = ? ORDER BY name');
    stmt.bind([departmentId]);
    
    const employees: Employee[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      employees.push({
        id: row.id as string,
        name: row.name as string,
        department_id: row.department_id as string
      });
    }
    
    stmt.free();
    return employees;
  }

  // 職員を削除
  async deleteEmployee(employeeId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM employees WHERE id = ?');
    stmt.run([employeeId]);
    stmt.free();
    
    this.saveDatabase();
  }

  // 打刻記録を追加
  async addAttendanceRecord(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    if (!this.db) throw new Error('Database not initialized');
    try {
      const id = Date.now().toString();
      const stmt = this.db.prepare(`
        INSERT INTO attendance_records 
        (id, department_id, department_name, employee_id, employee_name, type, type_name, timestamp, date, synced) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);
      stmt.run([
        id,
        record.department_id,
        record.department_name,
        record.employee_id,
        record.employee_name,
        record.type,
        record.type_name,
        record.timestamp,
        record.date
      ]);
      stmt.free();
      this.saveDatabase();
      return { id, ...record };
    } catch (error) {
      console.error('addAttendanceRecord failed:', error);
      throw error;
    }
  }

  // 打刻記録を更新
  async updateAttendanceRecord(recordId: string, timestamp: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('UPDATE attendance_records SET timestamp = ? WHERE id = ?');
    stmt.run([timestamp, recordId]);
    stmt.free();
    
    this.saveDatabase();
  }

  // 同日同内容の打刻記録を検索
  async findDuplicateRecord(departmentId: string, employeeId: string, type: string, date: string): Promise<AttendanceRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT * FROM attendance_records 
      WHERE department_id = ? AND employee_id = ? AND type = ? AND date = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    
    stmt.bind([departmentId, employeeId, type, date]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return {
        id: row.id as string,
        department_id: row.department_id as string,
        department_name: row.department_name as string,
        employee_id: row.employee_id as string,
        employee_name: row.employee_name as string,
        type: row.type as string,
        type_name: row.type_name as string,
        timestamp: row.timestamp as string,
        date: row.date as string
      };
    }
    
    stmt.free();
    return null;
  }

  // 月間打刻記録を取得
  async getMonthlyAttendanceRecords(departmentId: string, employeeId: string, year: number, month: number): Promise<AttendanceRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const stmt = this.db.prepare(`
      SELECT * FROM attendance_records 
      WHERE department_id = ? AND employee_id = ? 
      AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `);
    
    stmt.bind([
      departmentId, 
      employeeId, 
      startDate.toISOString(), 
      endDate.toISOString()
    ]);
    
    const records: AttendanceRecord[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      records.push({
        id: row.id as string,
        department_id: row.department_id as string,
        department_name: row.department_name as string,
        employee_id: row.employee_id as string,
        employee_name: row.employee_name as string,
        type: row.type as string,
        type_name: row.type_name as string,
        timestamp: row.timestamp as string,
        date: row.date as string
      });
    }
    
    stmt.free();
    return records;
  }

  // 設定を保存
  async saveSetting(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run([key, value]);
    stmt.free();
    this.saveDatabase();
  }

  // 設定を取得
  async getSetting(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    stmt.bind([key]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row.value as string;
    }
    
    stmt.free();
    return null;
  }

  // 毎月10日のクリーンアップをチェック
  private async checkAndPerformMonthlyCleanup(): Promise<void> {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();
    
    // 毎月10日にクリーンアップを実行
    if (currentDay === 10) {
      const lastCleanupKey = 'last_cleanup_month';
      const lastCleanup = await this.getSetting(lastCleanupKey);
      const currentMonthKey = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
      
      // 今月まだクリーンアップしていない場合
      if (lastCleanup !== currentMonthKey) {
        await this.performMonthlyCleanup();
        await this.saveSetting(lastCleanupKey, currentMonthKey);
        console.log('Monthly cleanup completed');
      }
    }
  }

  // 過去の打刻ログを削除（部署・職員情報は保持）
  private async performMonthlyCleanup(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // 3ヶ月より古い打刻記録を削除
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const stmt = this.db.prepare('DELETE FROM attendance_records WHERE timestamp < ?');
    stmt.run([threeMonthsAgo.toISOString()]);
    stmt.free();
    
    // データベースを最適化
    this.db.exec('VACUUM');
    
    this.saveDatabase();
    console.log(`Deleted attendance records older than ${threeMonthsAgo.toISOString()}`);
  }

  // 手動クリーンアップ（管理者用）
  async manualCleanup(): Promise<void> {
    await this.performMonthlyCleanup();
  }

  // データベース統計を取得
  async getDatabaseStats(): Promise<{
    totalEmployees: number;
    totalAttendanceRecords: number;
    oldestRecord: string | null;
    newestRecord: string | null;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const employeeCount = this.db.exec('SELECT COUNT(*) as count FROM employees')[0]?.values[0][0] as number || 0;
    const recordCount = this.db.exec('SELECT COUNT(*) as count FROM attendance_records')[0]?.values[0][0] as number || 0;
    
    const oldestResult = this.db.exec('SELECT MIN(timestamp) as oldest FROM attendance_records')[0]?.values[0][0] as string || null;
    const newestResult = this.db.exec('SELECT MAX(timestamp) as newest FROM attendance_records')[0]?.values[0][0] as string || null;

    return {
      totalEmployees: employeeCount,
      totalAttendanceRecords: recordCount,
      oldestRecord: oldestResult,
      newestRecord: newestResult
    };
  }

  // 打刻記録の同期フラグを更新
  async markAttendanceRecordSynced(recordId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('UPDATE attendance_records SET synced = 1 WHERE id = ?');
    stmt.run([recordId]);
    stmt.free();
    this.saveDatabase();
  }

  // 未同期レコードを取得
  async getUnsyncedAttendanceRecords(): Promise<AttendanceRecord[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM attendance_records WHERE synced = 0');
    const records: AttendanceRecord[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      records.push({
        id: row.id as string,
        department_id: row.department_id as string,
        department_name: row.department_name as string,
        employee_id: row.employee_id as string,
        employee_name: row.employee_name as string,
        type: row.type as string,
        type_name: row.type_name as string,
        timestamp: row.timestamp as string,
        date: row.date as string
      });
    }
    stmt.free();
    return records;
  }
}

// シングルトンインスタンス
export const databaseService = new DatabaseService();