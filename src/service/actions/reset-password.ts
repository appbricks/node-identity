import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { 
  Action, 
  createAction, 
  createFollowUpAction, 
  serviceEpic 
} from '@appbricks/utils';

import Provider from '../provider';
import { 
  AuthUsernamePayload, 
  RESET_PASSWORD_REQ, 
  SERVICE_RESPONSE_OK 
} from '../action';
import { AuthStateProps } from '../state';

export const resetPasswordAction = 
  (dispatch: redux.Dispatch<redux.Action>, username: string) => 
    dispatch(createAction(RESET_PASSWORD_REQ, <AuthUsernamePayload>{ username }));

export const resetPasswordEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthUsernamePayload, AuthStateProps>(
    RESET_PASSWORD_REQ, 
    async (action, state$) => {
      await csProvider.resetPassword(action.payload!.username);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
