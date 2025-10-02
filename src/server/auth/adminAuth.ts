import crypto from 'crypto';

interface AdminCredentials {
  username: string;
  password: string;
  createdAt: Date;
}

class AdminAuthManager {
  private static instance: AdminAuthManager;
  private credentials: AdminCredentials;
  private activeSessions: Set<string> = new Set();

  private constructor() {
    this.credentials = this.generateCredentials();
    this.logCredentialsToConsole();
  }

  public static getInstance(): AdminAuthManager {
    if (!AdminAuthManager.instance) {
      AdminAuthManager.instance = new AdminAuthManager();
    }
    return AdminAuthManager.instance;
  }

  private generateCredentials(): AdminCredentials {
    // Generate 16-character alphanumeric password
    const password = crypto.randomBytes(12).toString('base64').slice(0, 16);
    
    return {
      username: 'admin',
      password,
      createdAt: new Date()
    };
  }

  private logCredentialsToConsole(): void {
    const border = '═'.repeat(60);
    const spacer = ' '.repeat(18);
    
    console.log('\n');
    console.log(`╔${border}╗`);
    console.log(`║${spacer}🔐 ADMIN CREDENTIALS 🔐${spacer}║`);
    console.log(`╠${border}╣`);
    console.log(`║  Username: ${this.credentials.username.padEnd(45)} ║`);
    console.log(`║  Password: ${this.credentials.password.padEnd(45)} ║`);
    console.log(`║${spacer.repeat(3)}                           ║`);
    console.log(`║  ⚠️  COPY THESE CREDENTIALS NOW!            ║`);
    console.log(`║  🔒 Password changes on every restart       ║`);
    console.log(`║  🌐 Admin Panel: http://localhost:3028/admin ║`);
    console.log(`╚${border}╝`);
    console.log('\n');
  }

  public validateCredentials(username: string, password: string): boolean {
    return username === this.credentials.username && password === this.credentials.password;
  }

  public createSession(): string {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    this.activeSessions.add(sessionToken);
    return sessionToken;
  }

  public validateSession(token: string): boolean {
    return this.activeSessions.has(token);
  }

  public destroySession(token: string): void {
    this.activeSessions.delete(token);
  }

  public getCredentials(): { username: string } {
    return { username: this.credentials.username };
  }

  public regeneratePassword(): string {
    this.credentials = this.generateCredentials();
    this.logCredentialsToConsole();
    // Invalidate all sessions
    this.activeSessions.clear();
    return this.credentials.password;
  }
}

export default AdminAuthManager;