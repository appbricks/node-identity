import User, { VerificationInfo } from "./user";

const TIMEOUT_15M = 15 * 60 * 1000;      // 15 minutes
const TIMEOUT_24H = 24 * 60 * 60 * 1000; // 24 hours

export default class Session {

  timestamp: number = -1;
  isLoggedIn: boolean = false;
  updatePending: boolean = false;
  awaitingConfirmation?: VerificationInfo;
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
    isLoggedIn: boolean
    updatePending: boolean
    awaitingMFA?: string
  }) {
    this.timestamp = data.timestamp;
    this.isLoggedIn = data.isLoggedIn;
    this.updatePending = data.updatePending;
    this.awaitingMFA = data.awaitingMFA;
  }

  toJSON() {
    return {
      timestamp: this.timestamp,
      isLoggedIn: this.isLoggedIn,
      updatePending: this.updatePending,
      awaitingMFA: this.awaitingMFA
    }
  }
}
