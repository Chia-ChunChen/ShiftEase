module.exports = function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
};
