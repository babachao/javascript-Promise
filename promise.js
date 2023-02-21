const PENDING = 'PENDING';
const FULFILLED = 'FULFILLED';
const REJECTED = 'REJECTED';

function resolvePromise(promise2, x, resolve, reject) {

  if (promise2 === x) {
    const error = '[出现错误: 检测到Promise链接循环 #<Promise>]';
    return reject(new TypeError(error));
  }

  if (x !== null && ['object', 'function'].includes(typeof x)) {
    let called = false;
    try {
      let then = x.then; // 取出then，下面使用
      if (typeof then === 'function') {
        // 返回的promise成功时调用
        function success(data) {
          if (called) return;
          called = true;
          // 递归解析直到是普通值为止
          resolvePromise(promise2, data, resolve, reject);
        };

        // 返回失败时调用
        function error(err) {
          if (called) return;
          called = true;
          reject(err)
        };

        /**
        * 直接采用上一次的取出来的then方法
        * 使用x.then会重新取值，导致触发get
        */
        then.call(x, success, error);
      } else {
        // 进来这，说明then就是一个对象而已
        resolve(x);
      }
    } catch (e) {
      if (called) return;
      called = true;
      reject(e); // 取then的时候报错意味着出错了
    }
  } else {
    resolve(x); // 普通值直接成功即可
  }
};

class Promise {
  constructor(executor) {
    this.status = PENDING;
    this.value = null;
    this.errorReason = null;
    this.resolvedCallbacks = [];
    this.rejectedCallbacks = [];

    // 用户调用的成功时的处理函数
    const resolve = (value) => {
      if (this.status === PENDING) {
        this.value = value
        this.status = FULFILLED
        this.resolvedCallbacks.forEach(fn => fn());
      }
    }

    // 用户调用的失败时的处理函数
    const reject = (error) => {
      if (this.status === PENDING) {
        this.errorReason = error
        this.status = REJECTED
        this.rejectedCallbacks.forEach(fn => fn());
      }
    }

    // 当执行器出现异常时，直接进入reject
    try {
      executor(resolve, reject)
    } catch (error) {
      // 这个异常就作为失败的原因
      reject(error)
    }
  }

  then(onFulfilled, onRejected) {

    // 给onFulfilled和onRejected添加默认值
    onFulfilled = typeof onFulfilled == 'function' ? onFulfilled : v => v;
    onRejected = typeof onRejected == 'function' ? onRejected : err => { throw err };

    let promise2 = new Promise((resolve, reject) => {

      // 处理resolve状态的逻辑
      if (this.status === FULFILLED) {
        setTimeout(() => {
          try {
            let x = onFulfilled(this.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e)
          }
        })
      };

      // 处理reject状态的逻辑
      if (this.status === REJECTED) {
        setTimeout(() => {
          try {
            let x = onRejected(this.errorReason)
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e)
          }
        })
      };

      // 处理pending状态的逻辑
      if (this.status === PENDING) {
        this.resolvedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onFulfilled(this.value)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
        });

        this.rejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onRejected(this.errorReason)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
        });
      };

    });

    return promise2;

  }
}

Promise.deferred = function () {
  let dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  })
  return dfd;
}

module.exports = Promise;