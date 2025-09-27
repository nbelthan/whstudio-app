/**
 * World ID verification utilities
 * Re-exports from lib/world/verify.ts for easier importing
 */

export {
  verifyWorldIDProof,
  isValidProofFormat,
  checkVerificationRateLimit,
  actions,
  type WorldIDProof,
  type VerificationResponse,
  type VerifiedUser,
  type WorldIDAction
} from './world/verify';

// Handle alternative function name imports to maintain compatibility
export { verifyWorldIDProof as verifyWorldIdProof } from './world/verify';

// Alias for handleWorldIdVerification (same as verifyWorldIDProof)
export { verifyWorldIDProof as handleWorldIdVerification } from './world/verify';