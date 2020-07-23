import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import { AuthUserPayload, READ_USER_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const readUserAction = 
  (dispatch: redux.Dispatch<redux.Action>) => 
    dispatch(createAction(READ_USER_REQ));

export const readUserEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    READ_USER_REQ, 
    async (action: Action<AuthUserPayload>, state$: StateObservable<State>) => {
      if (!await csProvider.isLoggedIn()) {
        throw Error('No user logged in. The user needs to be logged in before it can be read.')
      }

      action.payload = <AuthUserPayload>{
        user: await csProvider.readUser()
      };
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
