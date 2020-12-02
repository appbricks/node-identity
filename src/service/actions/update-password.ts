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
  UPDATE_PASSWORD_REQ, 
  SERVICE_RESPONSE_OK 
} from '../action';
import { AuthStateProps } from '../state';

export const updatePasswordAction = 
  (dispatch: redux.Dispatch<redux.Action>, username: string, password: string, code: string) => 
    dispatch(createAction(UPDATE_PASSWORD_REQ, <AuthUsernamePayload>{ username, password, code }));

export const updatePasswordEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthUsernamePayload, AuthStateProps>(
    UPDATE_PASSWORD_REQ, 
    async (action, state$) => {
      let payload = action.payload!;
      await csProvider.updatePassword(payload.username, payload.password!, payload.code!);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
