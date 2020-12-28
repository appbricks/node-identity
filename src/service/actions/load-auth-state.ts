import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { 
  Logger,
  SUCCESS,
  NOOP,
  Action, 
  createAction, 
  createFollowUpAction, 
  serviceEpic 
} from '@appbricks/utils';

import Provider from '../provider';
import { 
  AuthStatePayload, 
  LOAD_AUTH_STATE_REQ 
} from '../action';
import { AuthStateProps } from '../state';

export const loadAuthStateAction = 
  (dispatch: redux.Dispatch<redux.Action>) => 
    dispatch(createAction(LOAD_AUTH_STATE_REQ));

export const loadAuthStateEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthStatePayload, AuthStateProps>(
    LOAD_AUTH_STATE_REQ, 
    async (action, state$) => {
      const auth = state$.value.auth;
      const isLoggedIn = await csProvider.isLoggedIn();
      const username = csProvider.getLoggedInUsername();

      if (!auth!.session.isValid()) {
        // if session is not loaded then follow up with an OK 
        // to indicate to the reducer to initialize the session
  
        return createFollowUpAction<AuthStatePayload>(
          action, 
          SUCCESS, 
          { 
            isLoggedIn,
            username
          }
        );
      } else if (!!!auth!.isLoggedIn && isLoggedIn) {
        // if underlying provider is logged in but the auth state
        // is not then force a signout in the provider
        Logger.trace(
          'loadAuthState', 
          'Forcing signout of stale logged in provider session for user', 
          username, auth
        );
        
        await csProvider.signOut();
      }

      Logger.trace(
        'loadAuthState', 
        'Session is valid. Sending a NOOP response for auth/LOAD_AUTH_STATE_REQ action.', 
        username
      );
      
      return createAction(NOOP);
    }
  );
}
