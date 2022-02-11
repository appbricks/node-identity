import User from './user';

const TIMEOUT_15M = 15 * 60 * 1000;      // 15 minutes
const TIMEOUT_24H = 24 * 60 * 60 * 1000; // 24 hours

export default class Session {

  timestamp: number = -1;

  // persisted properties
  activityTimestamp: number = -1;

  reset() {
    if (this.timestamp == -1) {
      this.timestamp = Date.now();
    }
    this.activityTimestamp = -1;
  }

  updateActivityTimestamp() {
    this.activityTimestamp = Date.now();
  }

  /**
   * Check if session is valid
   */
  isValid(): boolean {
    return this.timestamp != -1;
  }

  /**
   * Check if the user has timed out
   * 
   * @param {User} user  the user to check timeout
   */
  isTimedout(user: User): boolean {
    if (user.rememberFor24h) {
      return (this.activityTimestamp + TIMEOUT_24H) < Date.now();
    }

    // default session timeout is 15m
    return (this.activityTimestamp + TIMEOUT_15M) < Date.now();
  }

  /**
   * Get number of milliseconds before session times out
   * 
   * @param {User} user  the user to check timeout
   */
  timeoutIn(user: User): number {    
    const now = Date.now();
    const timestamp = this.activityTimestamp == -1 ? now : this.activityTimestamp;

    if (user.rememberFor24h) {
      return (TIMEOUT_24H - (now - timestamp));
    }

    // default session timeout is 15m
    return (TIMEOUT_15M - (now - timestamp));
  }

  fromJSON(data: {
    activityTimestamp: number
  }) {
    this.activityTimestamp = data.activityTimestamp;
  }

  toJSON() {
    return {
      activityTimestamp: this.activityTimestamp
    };
  }
}
