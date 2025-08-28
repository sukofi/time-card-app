interface GoogleSheetsConfig {
  serviceAccountKey: string;
  spreadsheetId: string;
}

interface AttendanceRecord {
  departmentName: string;
  employeeName: string;
  attendanceType: string;
  timestamp: Date;
}

export class GoogleSheetsService {
  private config: GoogleSheetsConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig() {
    if (!this.config.serviceAccountKey || this.config.serviceAccountKey.trim() === '') {
      throw new Error('Google Sheets service account key is required');
    }
    
    if (!this.config.spreadsheetId || this.config.spreadsheetId.trim() === '') {
      throw new Error('Google Sheets spreadsheet ID is required');
    }
    
    try {
      const keyData = JSON.parse(this.config.serviceAccountKey);
      if (!keyData.private_key || !keyData.client_email) {
        throw new Error('Invalid service account key format');
      }
    } catch (error) {
      throw new Error('Invalid service account key JSON format');
    }
  }

  // JWTトークンを生成
  private async generateJWT(): Promise<string> {
    const serviceAccount = JSON.parse(this.config.serviceAccountKey);
    
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const base64UrlEncode = (obj: any): string => {
      return btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };

    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payload);
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // RSA-SHA256署名を生成
    const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
    
    try {
      const keyData = await crypto.subtle.importKey(
        'pkcs8',
        this.base64ToArrayBuffer(this.pemToBase64(privateKey)),
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

      const encodedSignature = this.arrayBufferToBase64(signature)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      return `${unsignedToken}.${encodedSignature}`;
    } catch (error) {
      console.error('JWT generation error:', error);
      throw new Error('Failed to generate JWT token');
    }
  }

  // アクセストークンを取得
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const jwt = await this.generateJWT();
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1分前に期限切れとして扱う

      return this.accessToken;
    } catch (error) {
      console.error('Access token error:', error);
      throw new Error('Failed to get access token');
    }
  }

  // シートにデータを追加
  private async appendToSheet(range: string, values: any[][]): Promise<void> {
    const token = await this.getAccessToken();
    
    // タイムアウト付きのfetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒でタイムアウト
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: values
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Sheet update failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Google Sheets API request timed out');
      }
      throw error;
    }
  }

  // 打刻記録を追加
  async recordAttendance(record: AttendanceRecord): Promise<void> {
    try {
      const timestamp = record.timestamp.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const values = [[
        timestamp,
        record.departmentName,
        record.employeeName,
        record.attendanceType
      ]];

      await this.appendToSheet('Sheet1!A:D', values);
      console.log('[GoogleSheets] Attendance recorded successfully:', record);
    } catch (error) {
      console.error('[GoogleSheets] Failed to record attendance:', error);
      throw error;
    }
  }

  // 接続テスト
  async testConnection(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}?fields=properties.title`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return !!data.properties?.title;
    } catch (error) {
      console.error('[GoogleSheets] Connection test failed:', error);
      return false;
    }
  }

  // ユーティリティ関数
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private pemToBase64(pem: string): string {
    return pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');
  }
}
