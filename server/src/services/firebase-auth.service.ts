import jwt from 'jsonwebtoken';

interface FirebaseTokenPayload {
  iss: string;
  aud: string;
  sub: string;
  uid: string;
  phone_number?: string;
  email?: string;
  auth_time: number;
  exp: number;
  iat: number;
}

export class FirebaseAuthService {
  private static cachedCerts: Record<string, string> | null = null;
  private static certsExpiry = 0;

  /**
   * Fetches Google's public x509 certificates used to verify Firebase ID tokens.
   */
  private static async getGooglePublicCerts(): Promise<Record<string, string>> {
    const now = Date.now();
    if (this.cachedCerts && now < this.certsExpiry) {
      return this.cachedCerts;
    }

    try {
      const res = await fetch(
        'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch Google public certs: HTTP ${res.status}`);
      }

      // Check max-age cache-control header
      const cacheControl = res.headers.get('cache-control') || '';
      const match = cacheControl.match(/max-age=(\d+)/);
      const maxAgeSeconds = match ? parseInt(match[1], 10) : 3600;

      const certs = (await res.json()) as Record<string, string>;
      this.cachedCerts = certs;
      this.certsExpiry = now + maxAgeSeconds * 1000;
      return certs;
    } catch (err: any) {
      console.error('[Firebase Auth] Error fetching Google public certs:', err.message);
      if (this.cachedCerts) {
        return this.cachedCerts;
      }
      throw err;
    }
  }

  /**
   * Verifies a Firebase ID token cryptographically using RS256 and Google public certs.
   * Ensures the token was genuinely signed by Firebase, not expired, and belongs to our project.
   */
  static async verifyIdToken(idToken: string): Promise<{
    valid: boolean;
    uid?: string;
    phoneNumber?: string;
    error?: string;
  }> {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'meta-chat-5180c';

    if (!idToken || typeof idToken !== 'string') {
      return { valid: false, error: 'No Firebase ID token provided.' };
    }

    try {
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded || !decoded.header || !decoded.payload) {
        return { valid: false, error: 'Malformed Firebase ID token.' };
      }

      const kid = decoded.header.kid;
      if (!kid) {
        return { valid: false, error: 'Firebase ID token missing key identifier (kid).' };
      }

      const certs = await this.getGooglePublicCerts();
      const cert = certs[kid];
      if (!cert) {
        return { valid: false, error: 'Corresponding public key not found for token verification.' };
      }

      // Cryptographically verify RS256 signature against Google cert
      const payload = jwt.verify(idToken, cert, {
        algorithms: ['RS256'],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
      }) as FirebaseTokenPayload;

      const phoneNumber = payload.phone_number;
      const uid = payload.sub || payload.uid;

      return {
        valid: true,
        uid,
        phoneNumber,
      };
    } catch (err: any) {
      console.error('[Firebase Auth] Verification error:', err.message);
      return {
        valid: false,
        error: err.message || 'Firebase ID token verification failed.',
      };
    }
  }
}
