import { Store } from 'redux';
import { execAfter } from '@appbricks/utils';
import { time } from 'console';

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
        console.log('State change:', this.counter)
        this.testFn(this.counter, state);
      } catch (err) {
        console.error('Test Error', this.counter, err, state);
        this.testErr = err;
      }
    }
  }

  isOk() {
    if (this.testErr) {
      fail(this.testErr);
    }
  }

  async until(counterAt: number): Promise<void> {
    const checkCounter = this.checkCounter.bind(this);
    let timer = execAfter(() => this.counter < counterAt, 100, true);
    await timer.promise;
  }

  private checkCounter(counterAt: number): boolean {
    return (this.counter >= counterAt);
  }
}
