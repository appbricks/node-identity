import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { 
  Logger, 
  NOOP, 
  Action, 
  createAction, 
  createFollowUpAction, 
  createErrorAction, 
  serviceEpicFanOut 
} from '@appbricks/utils';

import Provider from '../provider';
import { 
  AuthSignInPayload, 
  AuthLoggedInPayload, 
  SIGN_IN_REQ, 
  READ_USER_REQ, 
  SERVICE_RESPONSE_OK 
} from '../action';
import { AuthStateProps } from '../state';

export const signInAction = 
  (dispatch: redux.Dispatch<redux.Action>, username: string, password: string) => 
    dispatch(createAction(SIGN_IN_REQ, {username, password}));

export const signInEpic = (csProvider: Provider): Epic => {

  return serviceEpicFanOut<AuthSignInPayload, AuthStateProps>(
    SIGN_IN_REQ,
    {
      signIn: async (action, state$, callSync) => {
        try {
          const payload = action.payload!;

          if (await csProvider.isLoggedIn(payload.username)) {
            return createErrorAction(new Error('The current session is already logged in.'), action);          
          } else if (await csProvider.validateSession()) {
            Logger.trace('signInEpic', 'Signing out of logged in session for different user');
            await csProvider.signOut();
          }

          const mfaType = await csProvider.signIn(payload.username, payload.password);
          const isLoggedIn = await csProvider.isLoggedIn(payload.username);
          return createFollowUpAction<AuthLoggedInPayload>(action, SERVICE_RESPONSE_OK, { isLoggedIn, mfaType });
        } catch (err) {
          return createErrorAction(err, action);
        }
      },
      readUser: async (action, state$, callSync) => {
        // wait for sign-in service call to complete
        let dependsAction = await callSync['signIn'];

        // if sign-in was successful then dispatch 
        // an action to read the user details
        if (dependsAction.type == SERVICE_RESPONSE_OK
          && dependsAction.payload!.isLoggedIn) {
          
          return createFollowUpAction(dependsAction, READ_USER_REQ);;
        } else {
          return createAction(NOOP);
        }
      }
    }
  );
}
