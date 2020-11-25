import { State, ActionResult } from '@appbricks/utils';

import User, { VerificationInfo } from '../model/user';
import Session from '../model/session';

// Authentication state type
export interface AuthState extends State {
  session: Session
  isLoggedIn: boolean

  user?: User
  awaitingUserConfirmation?: VerificationInfo
  awaitingMFAConfirmation?: number
};

// Authentication state properties
export interface AuthStateProps {
  auth: AuthState
};

export const initialAuthState = (): AuthState => 
  <AuthState>{
    actionStatus: {
      result: ActionResult.none
    },

    session: new Session(),
    isLoggedIn: false
  };
