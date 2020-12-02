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
  AuthVerificationPayload, 
  CONFIRM_SIGN_UP_CODE_REQ, 
  SERVICE_RESPONSE_OK 
} from '../action';
import { AuthStateProps } from '../state';

export const confirmSignUpCodeAction = 
  (dispatch: redux.Dispatch<redux.Action>, username: string, code: string) => 
    dispatch(createAction(CONFIRM_SIGN_UP_CODE_REQ, <AuthUsernamePayload>{ username, code }));

export const confirmSignUpCodeEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthUsernamePayload, AuthStateProps>(
    CONFIRM_SIGN_UP_CODE_REQ, 
    async (action, state$) => {
      const verified = await csProvider.confirmSignUpCode(action.payload!.username, action.payload!.code!);
      return createFollowUpAction<AuthVerificationPayload>(action, SERVICE_RESPONSE_OK, {
        info: {
          isConfirmed: verified
        }
      });
    }
  );
}
