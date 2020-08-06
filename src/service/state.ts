import { State, ActionResult } from '@appbricks/utils';

import User, { VerificationInfo } from '../model/user';
import Session from '../model/session';

// Authentication state type
export interface AuthUserState extends State {
  session: Session
  isLoggedIn: boolean

  user?: User
  awaitingUserConfirmation?: VerificationInfo;
  awaitingMFAConfirmation?: string
};

// Authentication state properties
export interface AuthUserStateProp {
  auth: AuthUserState
};

export const initialAuthState = (): AuthUserState => 
  <AuthUserState>{
    actionStatus: {
      result: ActionResult.none
    },
    
    session: new Session(),
    isLoggedIn: false
  };
