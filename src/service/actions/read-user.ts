import * as redux from 'redux';
import { Epic } from 'redux-observable';
import gravatar from 'gravatar';
import axios from 'axios';

import { 
  Logger,
  Action, 
  createAction, 
  createFollowUpAction, 
  serviceEpic 
} from '@appbricks/utils';

import Provider from '../provider';
import { 
  AuthUserPayload, 
  READ_USER_REQ, 
  SERVICE_RESPONSE_OK 
} from '../action';
import { AuthStateProps } from '../state';

export const readUserAction = 
  (dispatch: redux.Dispatch<redux.Action>) => 
    dispatch(createAction(READ_USER_REQ));

export const readUserEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthUserPayload, AuthStateProps>(
    READ_USER_REQ, 
    async (action, state$) => {
      if (!await csProvider.isLoggedIn()) {
        throw Error('No user logged in. The user needs to be logged in before it can be read.')
      }

      const user = await csProvider.readUser();

      // *** AVATAR retrieval should be moved to the profile module ***
      //
      // determine gravatar image url using the user login/email
      if (user.emailAddress) {
        const gravatarUrl = gravatar.url(
          user.emailAddress,
          {
            protocol: 'https',
            default: '404',
            size: '42'
          }
        );
        await axios.get(gravatarUrl)
          .then( () => {
            Logger.trace(
              'readUser', 
              'Found Gravatar profile image for email:', 
              user.emailAddress, 
              gravatarUrl
            );
            user.profilePictureUrl = gravatarUrl;
          })
          .catch(() => {
            Logger.trace(
              'readUser', 
              'Gravatar profile image not found:', 
              user.emailAddress, 
              gravatarUrl
            );
          });
      }
      // **************************************************************
      
      return createFollowUpAction<AuthUserPayload>(action, SERVICE_RESPONSE_OK, { user });
    }
  );
}
