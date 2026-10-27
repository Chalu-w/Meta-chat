"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseAuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class FirebaseAuthService {
    static cachedCerts = null;
    static certsExpiry = 0;
    /**
     * Fetches Google's public x509 certificates used to verify Firebase ID tokens.
     */
    static async getGooglePublicCerts() {
        const now = Date.now();
        if (this.cachedCerts && now < this.certsExpiry) {
            return this.cachedCerts;
        }
        try {
            const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
            if (!res.ok) {
                throw new Error(`Failed to fetch Google public certs: HTTP ${res.status}`);
            }
            // Check max-age cache-control header
            const cacheControl = res.headers.get('cache-control') || '';
            const match = cacheControl.match(/max-age=(\d+)/);
            const maxAgeSeconds = match ? parseInt(match[1], 10) : 3600;
            const certs = (await res.json());
            this.cachedCerts = certs;
            this.certsExpiry = now + maxAgeSeconds * 1000;
            return certs;
        }
        catch (err) {
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
    static async verifyIdToken(idToken) {
        const projectId = process.env.FIREBASE_PROJECT_ID || 'meta-chat-5180c';
        if (!idToken || typeof idToken !== 'string') {
            return { valid: false, error: 'No Firebase ID token provided.' };
        }
        try {
            const decoded = jsonwebtoken_1.default.decode(idToken, { complete: true });
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
            const payload = jsonwebtoken_1.default.verify(idToken, cert, {
                algorithms: ['RS256'],
                audience: projectId,
                issuer: `https://securetoken.google.com/${projectId}`,
            });
            const phoneNumber = payload.phone_number;
            const uid = payload.sub || payload.uid;
            return {
                valid: true,
                uid,
                phoneNumber,
            };
        }
        catch (err) {
            console.error('[Firebase Auth] Verification error:', err.message);
            return {
                valid: false,
                error: err.message || 'Firebase ID token verification failed.',
            };
        }
    }
}
exports.FirebaseAuthService = FirebaseAuthService;
