import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { 
  SUCCESS,
  Action, 
  createAction, 
  createFollowUpAction, 
  serviceEpic 
} from '@appbricks/utils';

import Provider from '../provider';
import { 
  AuthTOTPSecretPayload,
  SETUP_TOTP_REQ 
} from '../action';
import { AuthStateProps } from '../state';

export const setupTOTPAction = 
  (dispatch: redux.Dispatch<redux.Action>) => 
    dispatch(createAction(SETUP_TOTP_REQ));

export const setupTOTPEpic = (csProvider: Provider): Epic => {

  return serviceEpic<void, AuthStateProps>(
    SETUP_TOTP_REQ, 
    async (action, state$) => {
      if (!await csProvider.isLoggedIn()) {
        throw Error('No user logged in. You can setup TOTP for logged in users only.')
      }
      
      const secret = await csProvider.setupTOTP();        
      return createFollowUpAction<AuthTOTPSecretPayload>(action, SUCCESS, { secret });
    }
  );
}
