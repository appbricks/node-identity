import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { 
  Action, 
  createAction, 
  createFollowUpAction, 
  serviceEpic 
} from '@appbricks/utils';

import User from '../../model/user';
import Provider from '../provider';
import { 
  AuthUserPayload, 
  SAVE_USER_REQ, 
  SERVICE_RESPONSE_OK 
} from '../action';
import { AuthStateProps } from '../state';

export const saveUserAction = 
  (dispatch: redux.Dispatch<redux.Action>, user: User) => 
    dispatch(createAction(SAVE_USER_REQ, <AuthUserPayload>{ user }));

export const saveUserEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthUserPayload, AuthStateProps>(
    SAVE_USER_REQ, 
    async (action, state$) => {
      if (!await csProvider.isLoggedIn()) {
        throw Error('No user logged in. The user needs to be logged in before it can be saved.')
      }

      await csProvider.saveUser(action.payload!.user);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
