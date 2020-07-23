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

// React-Redux component property association with redux state
export function mapStateToProps<S extends AuthUserStateProp>(state: S): AuthUserStateProp {
  return {
    auth: state.auth
  };
}
