/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'notification-service',
  name: 'ClubeFlorescerNSE',
  displayName: 'Florescer NSE',
  bundleIdentifier: '.notification-service',
  deploymentTarget: '15.1',
  frameworks: ['UserNotifications'],
});
