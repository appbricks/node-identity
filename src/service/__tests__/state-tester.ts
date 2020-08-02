import { Store } from 'redux';

export class StateTester<T> {

  counter = 0;
  testErr?: any;

  testFn: (counter: number, state: T) => void;

  constructor(testFn: (counter: number, state: T) => void) {
    this.testFn = testFn;
    this.testErr = undefined;
  }

  tester(store: Store): () => void {

    return () => {
      this.counter++;
      const state = <T>store.getState().auth;

      try {
        this.testFn(this.counter, state);
      } catch (err) {
        console.error('Test Error', err, state);
        this.testErr = err;
      }
    }
  }

  isOk() {
    if (this.testErr) {
      fail(this.testErr);
    }
  }
}
