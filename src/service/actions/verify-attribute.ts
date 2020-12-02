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
  AuthLoggedInUserAttrPayload, 
  VERIFY_ATTRIBUTE_REQ, 
  SERVICE_RESPONSE_OK 
} from '../action';
import { AuthStateProps } from '../state';

export const verifyAttributeAction = 
  (dispatch: redux.Dispatch<redux.Action>, attrName: string) => 
    dispatch(createAction(VERIFY_ATTRIBUTE_REQ, <AuthLoggedInUserAttrPayload>{ attrName }));

export const verifyAttributeEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthLoggedInUserAttrPayload, AuthStateProps>(
    VERIFY_ATTRIBUTE_REQ, 
    async (action, state$) => {
      if (!await csProvider.isLoggedIn()) {
        throw Error('No user logged in. You can validate an attribute only for logged in user.')
      }

      let attrName = action.payload!.attrName;
      if (attrName) {
        await csProvider.sendVerificationCodeForAttribute(attrName);
        return createFollowUpAction(action, SERVICE_RESPONSE_OK);
      } else {
        throw Error('sendVerificationCodeForAttribute request action does not have an attribute name to verify.');
      }
    }
  );
}
