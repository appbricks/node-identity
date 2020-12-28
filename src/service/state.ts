import { State, ActionResult } from '@appbricks/utils';

import User, { VerificationInfo } from '../model/user';
import Session from '../model/session';

// Authentication state type
export interface AuthState extends State {
  session: Session
  isLoggedIn: boolean

  user?: User

  // new user signup
  awaitingUserConfirmation?: VerificationInfo

  // secret for TOTP setup
  tokenSecret?: string

  // 2nd factor auth code
  awaitingMFAConfirmation?: number
};

// Authentication state properties
export interface AuthStateProps {
  auth?: AuthState
};

export const initialAuthState = (): AuthState => 
  <AuthState>{
    status: [],

    session: new Session(),
    isLoggedIn: false
  };
