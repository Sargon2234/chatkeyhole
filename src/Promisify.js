export const promisify = (fn) => new Promise((resolve, reject) => fn(resolve));
