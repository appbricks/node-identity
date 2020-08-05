import User, { VerificationInfo } from "./user";

const TIMEOUT_15M = 15 * 60 * 1000;      // 15 minutes
const TIMEOUT_24H = 24 * 60 * 60 * 1000; // 24 hours

export default class Session {

  // persisted properties
  timestamp: number = -1;
  awaitingConfirmation?: VerificationInfo;

  // transient properties
  isLoggedIn: boolean = false;
  updatePending: boolean = false;
  awaitingMFA?: string;

  resetTimestamp() {
    this.timestamp = Date.now();
  }

  /**
   * Check if the user has timed out
   * 
   * @param {User} user  the user to check timeout
   */
  isTimedout(user: User) {
    if (user.rememberFor24h) {
      return (this.timestamp + TIMEOUT_24H) < Date.now();
    }

    // default session timeout is 15m
    return (this.timestamp + TIMEOUT_15M) < Date.now();
  }

  fromJSON(data: {
    timestamp: number
    awaitingConfirmation?: VerificationInfo
  }) {
    this.timestamp = data.timestamp;
    this.awaitingConfirmation = data.awaitingConfirmation;
  }

  toJSON() {
    return {
      timestamp: this.timestamp,
      awaitingConfirmation: this.awaitingConfirmation
    };
  }
}
