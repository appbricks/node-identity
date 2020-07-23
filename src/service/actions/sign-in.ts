import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { NOOP, State, Action, ErrorPayload, createAction, createFollowUpAction, createErrorAction, serviceEpicFanOut } from '@appbricks/utils';

import { AuthSignInPayload, SIGN_IN_REQ, READ_USER_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const signInAction = 
  (dispatch: redux.Dispatch<redux.Action>, username: string, password: string) => 
    dispatch(createAction(SIGN_IN_REQ, {username, password}));

export const signInEpic = (csProvider: Provider): Epic => {

  return serviceEpicFanOut(
    SIGN_IN_REQ,
    {
      signIn: async (
        action: Action<AuthSignInPayload>, 
        state$: StateObservable<State>, 
        callSync: { [type: string]: Promise<Action<AuthSignInPayload | ErrorPayload>> }
      ) => {
        if (await csProvider.isLoggedIn()) {
          return createErrorAction(new Error('The current session is already logged in.'), action);
        }

        try {
          let payload = <AuthSignInPayload>action.payload;
          payload.mfaType = await csProvider.signIn(payload.username, payload.password);
          payload.isLoggedIn = await csProvider.isLoggedIn();
          return createFollowUpAction(action, SERVICE_RESPONSE_OK);  
        } catch (err) {
          return createErrorAction(err, action);
        }
      },
      readUser: async (
        action: Action<AuthSignInPayload>, 
        state$: StateObservable<State>, 
        callSync: { [type: string]: Promise<Action<AuthSignInPayload | ErrorPayload>> }
      ) => {
        // wait for sign-in service call to complete
        let dependsAction = await callSync['signIn'];

        // is sign-in was successful then dispatch 
        // an action to read the user details
        if (dependsAction.type == SERVICE_RESPONSE_OK
          && dependsAction.meta.relatedAction
          && (<AuthSignInPayload>dependsAction.meta.relatedAction!.payload).isLoggedIn) {
          
          return createFollowUpAction(dependsAction, READ_USER_REQ);;
        } else {
          return createAction(NOOP);
        }
      }
    }
  )
}
