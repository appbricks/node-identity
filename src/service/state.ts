import User from '../model/user';

// Authentication state type
export interface AuthUserState {
  user: User
  session: {
    isLoggedIn: boolean
    updatePending: boolean
    awaitingMFA: string  
  }
};

// Authentication state properties
export interface AuthUserStateProp {
  auth: AuthUserState
};
