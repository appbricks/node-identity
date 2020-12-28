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
  AuthMultiFactorAuthPayload, 
  VERIFY_TOTP_REQ 
} from '../action';
import { AuthStateProps } from '../state';
import { AUTH_MFA_TOTP } from '../constants';

export const verifyTOTPAction = 
  (dispatch: redux.Dispatch<redux.Action>, mfaCode: string) => 
    dispatch(createAction(VERIFY_TOTP_REQ, <AuthMultiFactorAuthPayload>{ mfaCode, mfaType: AUTH_MFA_TOTP }));

export const verifyTOTPEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthMultiFactorAuthPayload, AuthStateProps>(
    VERIFY_TOTP_REQ, 
    async (action, state$) => {
      if (!await csProvider.isLoggedIn()) {
        throw Error('No user logged in. You can verify TOTP for logged in users only.')
      }

      let mfaCode = action.payload!.mfaCode;
      if (mfaCode) {
        await csProvider.verifyTOTP(mfaCode);
        return createFollowUpAction(action, SUCCESS);
      } else {
        throw Error('verifyTOTP request action does not have an MFA code to verify.');
      }
    }
  );
}
