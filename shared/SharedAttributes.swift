// Shared between the app's local module and another target (for example, a widget extension).
// plugins/withSharedAttributes.js copies this file into modules/my-module/ios/ on each prebuild.
public struct SharedAttributes: Codable {
  public var title: String
}
