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
  RESEND_SIGN_UP_CODE_REQ, 
  SERVICE_RESPONSE_OK 
} from '../action';
import { AuthStateProps } from '../state';

export const resendSignUpCodeAction = 
  (dispatch: redux.Dispatch<redux.Action>, username: string) => 
    dispatch(createAction(RESEND_SIGN_UP_CODE_REQ, <AuthUsernamePayload>{ username }));

export const resendSignUpCodeEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthUsernamePayload, AuthStateProps>(
    RESEND_SIGN_UP_CODE_REQ, 
    async (action, state$) => {
      let info = await csProvider.resendSignUpCode(action.payload!.username);
      return createFollowUpAction<AuthVerificationPayload>(action, SERVICE_RESPONSE_OK, { info });
    }
  );
}
