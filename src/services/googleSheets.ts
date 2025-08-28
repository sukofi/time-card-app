interface GoogleSheetsConfig {
  serviceAccountKey: string; // JSON文字列
  spreadsheetId: string;
}

interface SheetData {
  range: string;
  values: any[][];
}

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export class GoogleSheetsService {
  private config: GoogleSheetsConfig;
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
    
    // サービスアカウントキーの基本的な検証
    if (!config.serviceAccountKey || config.serviceAccountKey.trim() === '') {
      throw new Error('Google Sheets service account key is required');
    }
    
    if (!config.spreadsheetId || config.spreadsheetId.trim() === '') {
      throw new Error('Google Sheets spreadsheet ID is required');
    }
    
    // サービスアカウントキーのJSONフォーマット検証
    try {
      const keyData = JSON.parse(config.serviceAccountKey);
      if (!keyData.private_key || !keyData.client_email) {
        throw new Error('Invalid service account key format');
      }
    } catch (error) {
      throw new Error('Invalid service account key JSON format');
    }
  }

  // 文字列を正規化（全角→半角変換、空白文字の統一）
  private normalizeString(str: string): string {
    if (!str) return '';
    
    return str
      .trim() // 前後の空白を削除
      .replace(/　/g, ' ') // 全角スペースを半角スペースに変換
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => {
        // 全角英数字を半角に変換
        return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
      });
  }

  // JWTトークンを生成
  private async generateJWT(): Promise<string> {
    const serviceAccount: ServiceAccountKey = JSON.parse(this.config.serviceAccountKey);
    
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600, // 1時間後に期限切れ
      iat: now
    };

    // Base64URL エンコード
    const base64UrlEncode = (obj: any): string => {
      return btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };

    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payload);
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // RSA-SHA256署名を生成（Web Crypto API使用）
    const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
    
    try {
      const keyData = await crypto.subtle.importKey(
        'pkcs8',
        this.pemToArrayBuffer(privateKey),
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        keyData,
        new TextEncoder().encode(unsignedToken)
      );

      const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      return `${unsignedToken}.${base64Signature}`;
    } catch (error) {
      console.error('JWT generation error:', error);
      throw new Error('Failed to generate JWT token');
    }
  }

  // PEM形式の秘密鍵をArrayBufferに変換
  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64Lines = pem.replace(/-----BEGIN PRIVATE KEY-----/, '')
                        .replace(/-----END PRIVATE KEY-----/, '')
                        .replace(/\s/g, '');
    const byteString = atob(b64Lines);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    return byteArray.buffer;
  }

  // アクセストークンを取得
  private async getAccessToken(): Promise<string> {
    // トークンが有効な場合は再利用
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken as string;
    }

    try {
      const jwt = await this.generateJWT();
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Token request failed:', errorData);
        throw new Error(`Failed to get access token: ${response.status}`);
      }

      const tokenData = await response.json();
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // 1分早めに期限切れとする

      return this.accessToken;
    } catch (error) {
      console.error('Access token generation error:', error);
      throw new Error('Failed to authenticate with Google Sheets API');
    }
  }

  // スプレッドシートからデータを読み取り
  async readSheet(range: string): Promise<any[][]> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}`;
      
      // より長いタイムアウトを設定
      const response = await this.fetchWithTimeout(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }, 15000); // 15秒タイムアウト
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('401 - Authentication failed');
        } else if (response.status === 403) {
          throw new Error('403 - Access denied');
        } else if (response.status === 404) {
          throw new Error('404 - Spreadsheet not found');
        } else if (response.status === 429) {
          throw new Error('429 - Rate limit exceeded');
        } else {
          const errorText = await response.text();
          throw new Error(`Google Sheets API error: ${response.status} - ${errorText}`);
        }
      }
      
      const data = await response.json();
      console.log(`Successfully read from range: ${range}, rows: ${data.values?.length || 0}`);
      return data.values || [];
    } catch (error) {
      console.error('Error reading from Google Sheets:', error);
      throw error;
    }
  }

  // スプレッドシートにデータを書き込み
  async writeSheet(range: string, values: any[][]): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
      
      // より長いタイムアウトを設定
      const response = await this.fetchWithTimeout(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: values
        })
      }, 20000); // 20秒タイムアウト

      const responseText = await response.text();
      if (!response.ok) {
        console.error('[GoogleSheets] writeSheet error', { range, values, status: response.status, responseText });
        if (response.status === 401) {
          throw new Error('401 - Authentication failed');
        } else if (response.status === 403) {
          throw new Error('403 - Access denied');
        } else if (response.status === 404) {
          throw new Error('404 - Spreadsheet not found');
        } else if (response.status === 429) {
          throw new Error('429 - Rate limit exceeded');
        } else {
          throw new Error(`Google Sheets API error: ${response.status} - ${responseText}`);
        }
      }
      console.log(`[GoogleSheets] Successfully wrote to range: ${range}`, { values, responseText });
    } catch (error) {
      console.error('[GoogleSheets] Error writing to Google Sheets:', error, { range, values });
      throw error;
    }
  }

  // タイムアウト付きfetch
  private async fetchWithTimeout(
    url: string, 
    options: RequestInit, 
    timeoutMs: number = 10000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - ネットワークが遅いか、サーバーが応答していません');
      }
      throw error;
    }
  }

  // 特定のセルを更新
  async updateCell(range: string, value: string): Promise<void> {
    try {
      await this.writeSheet(range, [[value]]);
      console.log(`[GoogleSheets] updateCell success: ${range} = ${value}`);
    } catch (error) {
      console.error(`[GoogleSheets] updateCell error: ${range} = ${value}`, error);
      throw error;
    }
  }

  // 部署シートの初期化
  async initializeDepartmentSheet(departmentName: string, employees: string[]): Promise<void> {
    const sheetName = departmentName;
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    // 月の日数を取得
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // ヘッダー行を作成（職員名 + 各日付）
    const headerRow = ['職員名'];
    for (let day = 1; day <= daysInMonth; day++) {
      headerRow.push(`${month}/${day}`);
    }
    
    // データ行を作成（各職員の行）
    const dataRows = employees.map(employee => {
      const row = [employee];
      // 各日付に空のセルを追加
      for (let day = 1; day <= daysInMonth; day++) {
        row.push('');
      }
      return row;
    });
    
    const allData = [headerRow, ...dataRows];
    
    try {
      await this.writeSheet(`${sheetName}!A1:${this.getColumnLetter(headerRow.length)}${allData.length}`, allData);
    } catch (error) {
      console.error(`Error initializing sheet for ${departmentName}:`, error);
      throw error;
    }
  }

  // 打刻データを記録
  async recordAttendance(
    departmentName: string,
    employeeName: string,
    attendanceType: string,
    timestamp: Date
  ): Promise<void> {
    try {
      const sheetName = departmentName;
      const day = timestamp.getDate();
      const timeString = timestamp.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // 連続リクエストを避けるため待機時間を延長
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // 職員名の行を見つける
      const employeeData = await this.readSheet(`${sheetName}!A:A`);
      const normalizedEmployeeName = this.normalizeString(employeeName);
      const employeeRowIndex = employeeData.findIndex((row: string[]) => 
        this.normalizeString(row[0]) === normalizedEmployeeName
      );
      
      if (employeeRowIndex === -1) {
        // 職員が見つからない場合は自動的に追加
        console.log(`Employee ${employeeName} not found in ${departmentName} sheet, adding automatically`);
        await this.addEmployeeToSheet(departmentName, employeeName);
        
        // 再度職員を検索
        await new Promise(resolve => setTimeout(resolve, 250)); // 0.25秒待機
        // タイムアウト付きで再取得
        const withTimeout = (promise: Promise<any>, ms = 5000) =>
          Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: readSheet did not return')), ms))
          ]);
        const updatedEmployeeData = await withTimeout(this.readSheet(`${sheetName}!A:A`), 5000);
        const updatedEmployeeRowIndex = updatedEmployeeData.findIndex(row => 
          this.normalizeString(row[0]) === normalizedEmployeeName
        );
        
        if (updatedEmployeeRowIndex === -1) {
          throw new Error(`Failed to add employee ${employeeName} to ${departmentName} sheet`);
        }
        
        // 新しく追加された職員の行インデックスを使用
        const columnIndex = day + 1;
        const columnLetter = this.getColumnLetter(columnIndex);
        const rowNumber = updatedEmployeeRowIndex + 1;
        const cellRange = `${sheetName}!${columnLetter}${rowNumber}`;
        const newEntry = `${timeString} ${attendanceType}`;
        
        await new Promise(resolve => setTimeout(resolve, 150));
        await this.updateCell(cellRange, newEntry);
        
        console.log(`Successfully recorded attendance for new employee: ${employeeName} - ${attendanceType} at ${timeString}`);
        return;
      }
      
      // 該当する日付の列を計算（A列が職員名なので、日付は2列目から）
      const columnIndex = day + 1; // 1日は2列目（B列）
      const columnLetter = this.getColumnLetter(columnIndex);
      const rowNumber = employeeRowIndex + 1; // スプレッドシートは1から始まる
      
      // 既存のデータを取得
      const cellRange = `${sheetName}!${columnLetter}${rowNumber}`;
      
      // 読み取りと書き込みの間に待機時間を延長
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const existingData = await this.readSheet(cellRange);
      const existingValue = existingData[0]?.[0] || '';
      
      // 既存のデータを解析して同じ打刻種類があるかチェック
      const existingLines = existingValue ? existingValue.split('\n') : [];
      const newEntry = `${timeString} ${attendanceType}`;
      
      // 同じ打刻種類の既存エントリを探す
      const existingEntryIndex = existingLines.findIndex((line: string) => 
        line.trim().endsWith(attendanceType)
      );
      
      let newValue: string;
      if (existingEntryIndex !== -1) {
        // 同じ打刻種類が存在する場合は時刻を更新
        existingLines[existingEntryIndex] = newEntry;
        newValue = existingLines.join('\n');
      } else {
        // 新しい打刻種類の場合は追加
        newValue = existingValue 
          ? `${existingValue}\n${newEntry}`
          : newEntry;
      }
      
      // 書き込み前に待機時間を延長
      await new Promise(resolve => setTimeout(resolve, 150));
      
      await this.updateCell(cellRange, newValue);
      
      // 成功ログ
      console.log(`Successfully recorded attendance: ${employeeName} - ${attendanceType} at ${timeString}`);
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw error;
    }
  }

  // 列番号をアルファベットに変換（1=A, 2=B, ...）
  private getColumnLetter(columnNumber: number): string {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }

  // 部署の全職員を取得
  async getDepartmentEmployees(departmentName: string): Promise<string[]> {
    try {
      const sheetName = departmentName;
      const data = await this.readSheet(`${sheetName}!A:A`);
      
      // 最初の行（ヘッダー）を除いて職員名を取得
      return data.slice(1).map((row: any) => this.normalizeString(row[0])).filter((name: string) => name);
    } catch (error) {
      console.error(`Error getting employees for ${departmentName}:`, error);
      return [];
    }
  }

  // 職員をスプレッドシートに追加
  async addEmployeeToSheet(departmentName: string, employeeName: string): Promise<void> {
    try {
      const sheetName = departmentName;
      
      // 待機時間を追加してAPI制限を回避
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // 現在のA列のデータを取得
      const columnData = await this.readSheet(`${sheetName}!A:A`);
      
      // 最下部の行番号を計算（空行を除く）
      let lastRowIndex = 0;
      for (let i = columnData.length - 1; i >= 0; i--) {
        if (columnData[i] && columnData[i][0] && columnData[i][0].trim() !== '') {
          lastRowIndex = i;
          break;
        }
      }
      
      // 新しい職員を最下部に追加
      const newRowIndex = lastRowIndex + 2; // スプレッドシートは1から始まるので+1、さらに次の行なので+1
      const cellRange = `${sheetName}!A${newRowIndex}`;
      
      // 書き込み前に待機
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 職員名を正規化して保存
      await this.updateCell(cellRange, this.normalizeString(employeeName));
      
      // 月の日数分の空のセルも追加
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const daysInMonth = new Date(year, month, 0).getDate();
      
      // 次の書き込み前に待機
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // B列からその月の日数分の空のセルを追加
      const emptyCells = Array(daysInMonth).fill('');
      const rowRange = `${sheetName}!B${newRowIndex}:${this.getColumnLetter(daysInMonth + 1)}${newRowIndex}`;
      await this.writeSheet(rowRange, [emptyCells]);
      
      console.log(`Successfully added employee ${employeeName} to ${departmentName} sheet`);
      
    } catch (error) {
      console.error(`Error adding employee ${employeeName} to ${departmentName} sheet:`, error);
      throw error;
    }
  }

  // 接続テスト用メソッド
  async testConnection(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}/${this.config.spreadsheetId}`;
      
      const response = await this.fetchWithTimeout(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }, 10000);
      
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // シート構成の検証メソッド
  async validateSheetStructure(sheetName: string): Promise<boolean> {
    try {
      const data = await this.readSheet(`${sheetName}!A1:Z1`);
      if (!data || !data[0] || data[0][0] !== '職員名') {
        console.warn(`[GoogleSheets] シート${sheetName}のA1セルが「職員名」ではありません`);
        return false;
      }
      // B列以降が日付形式か簡易チェック
      for (let i = 1; i < data[0].length; i++) {
        if (!/^\d{1,2}\/\d{1,2}$/.test(data[0][i])) {
          console.warn(`[GoogleSheets] シート${sheetName}の${i+1}列目ヘッダーが日付形式ではありません: ${data[0][i]}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error(`[GoogleSheets] validateSheetStructure error: ${sheetName}`, error);
      return false;
    }
  }
}