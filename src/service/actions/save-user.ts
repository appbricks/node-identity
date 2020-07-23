import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import User from '../../model/user';
import { AuthUserState } from '../../state/state';
import { AuthUserPayload, SAVE_USER_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const saveUserAction = 
  (dispatch: redux.Dispatch<redux.Action>, user: User) => 
    dispatch(createAction(SAVE_USER_REQ, <AuthUserPayload>{ user }));

export const saveUserEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    SAVE_USER_REQ, 
    async (action: Action, state$: StateObservable<State>) => {
      if (!await csProvider.isLoggedIn()) {
        throw Error('No user logged in. The user needs to be logged in before it can be saved.')
      }

      await csProvider.saveUser((<AuthUserPayload>action.payload).user);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
