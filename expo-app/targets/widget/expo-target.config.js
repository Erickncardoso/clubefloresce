/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "widget",
  name: "ClubeFlorescerWidget",
  displayName: "Clube Florescer",
  icon: "../../assets/icon.png",
  deploymentTarget: "16.2",
  frameworks: ["SwiftUI", "ActivityKit", "WidgetKit"],
});