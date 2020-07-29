import User from '../model/user';

import Session from '../model/session';

// Authentication state type
export interface AuthUserState {
  session: Session
  user?: User
};

// Authentication state properties
export interface AuthUserStateProp {
  auth: AuthUserState
};

export const initialAuthState = (): AuthUserState => 
  <AuthUserState>{
    session: new Session()
  };
