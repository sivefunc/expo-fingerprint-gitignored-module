// Copies shared/SharedAttributes.swift into the local module on each prebuild, so the module
// compiles the same file as another target. The copy is listed in .gitignore.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withSharedAttributes(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const root = config.modRequest.projectRoot;
      fs.copyFileSync(
        path.join(root, 'shared', 'SharedAttributes.swift'),
        path.join(root, 'modules', 'my-module', 'ios', 'SharedAttributes.swift')
      );
      return config;
    },
  ]);
};
