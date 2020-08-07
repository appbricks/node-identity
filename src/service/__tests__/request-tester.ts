import { Reducer } from 'redux';
import { Logger, ERROR, Action, ErrorPayload } from '@appbricks/utils';

import { SERVICE_RESPONSE_OK } from '../action';
import { AuthUserState, initialAuthState } from '../state';
import User from '../../model/user';

export class ServiceRequestTester<T1, T2 = T1> {

  logger: Logger;

  errorCounter: number = 0;
  okCounter: number = 0;
  reqCounter: number = 0;

  initialAuthState = initialAuthState();

  matchRelatedAction: boolean;

  reqActionType: string;
  reqActionValidator: ActionValidator<T1>;
  okActionValidator: ActionValidator<T2>;
  errorActionValidator: ActionValidator<ErrorPayload>;

  constructor(
    logger: Logger,
    reqActionType: string,
    reqActionValidator: ActionValidator<T1>,
    okActionValidator: ActionValidator<T2>,
    errorActionValidator: ActionValidator<ErrorPayload> = (counter, state, action): AuthUserState => {
      fail('no errors conditions are being tested');
      return state;
    },
    matchRelatedAction = true
  ) {
    this.matchRelatedAction = matchRelatedAction;

    this.logger = logger;
    this.reqActionType = reqActionType;
    this.reqActionValidator = reqActionValidator;
    this.okActionValidator = okActionValidator;
    this.errorActionValidator = errorActionValidator;
  }

  setInitialUserInState(user: User) {
    this.initialAuthState.user = user;
  }

  reducer(): Reducer<AuthUserState, Action<T1 | ErrorPayload>> {
    const tester = this;

    return (state: AuthUserState = this.initialAuthState, action: Action): AuthUserState => {
      tester.logger.trace('Reducer called with action', action.type);
      try {
        switch (action.type) {
          case tester.reqActionType:
            tester.reqCounter++;
            expect(action.meta.relatedAction).toBeUndefined();
            return tester.reqActionValidator(tester.reqCounter, state, <Action<T1>>action);
          case SERVICE_RESPONSE_OK:
            tester.okCounter++;
            expect(action.meta.relatedAction).toBeDefined();
            if (this.matchRelatedAction) {
              expect(action.meta.relatedAction!.type).toEqual(tester.reqActionType);
            }
            return tester.okActionValidator(tester.okCounter, state, <Action<T2>>action);
          case ERROR:
            tester.errorCounter++;
            expect(action.payload).toBeDefined();
            expect(action.meta.relatedAction).toBeDefined();
            if (this.matchRelatedAction) {
              expect(action.meta.relatedAction!.type).toEqual(tester.reqActionType);
            }
            return tester.errorActionValidator(tester.errorCounter, state, <Action<ErrorPayload>>action);
        }
      } catch (err) {
        tester.logger.error('Test reducer failed with', err);
        throw err;
      }
      return state;
    }
  }
}
type ActionValidator<T1> = (
  counter: number,
  state: AuthUserState,
  action: Action<T1>
) => AuthUserState;
