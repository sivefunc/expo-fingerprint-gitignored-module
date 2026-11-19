"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHashSourcesAsync = getHashSourcesAsync;
const spawn_async_1 = __importDefault(require("@expo/spawn-async"));
const chalk_1 = __importDefault(require("chalk"));
const minimatch_1 = require("minimatch");
const semver_1 = __importDefault(require("semver"));
const ExpoConfig_1 = require("../ExpoConfig");
const ExpoResolver_1 = require("../ExpoResolver");
const Path_1 = require("../utils/Path");
const Profile_1 = require("../utils/Profile");
const Bare_1 = require("./Bare");
const Expo_1 = require("./Expo");
const Packages_1 = require("./Packages");
const PatchPackage_1 = require("./PatchPackage");
const debug = require('debug')('expo:fingerprint:sourcer:Sourcer');
async function getHashSourcesAsync(projectRoot, options) {
    const { config: expoConfig, loadedModules } = await (0, ExpoConfig_1.getExpoConfigAsync)(projectRoot, options);
    const expoAutolinkingVersion = (0, ExpoResolver_1.resolveExpoAutolinkingVersion)(projectRoot) ?? '0.0.0';
    const useRNCoreAutolinkingFromExpo = 
    // expo-modules-autolinking supports the `react-native-config` core autolinking from 1.11.2.
    // To makes the `useRNCoreAutolinkingFromExpo` default to `true` for Expo SDK 52 and higher.
    // We check the expo-modules-autolinking version from 1.12.0.
    typeof options.useRNCoreAutolinkingFromExpo === 'boolean'
        ? options.useRNCoreAutolinkingFromExpo
        : semver_1.default.gte(expoAutolinkingVersion, '1.12.0');
    const results = await Promise.all([
        // expo
        (0, Profile_1.profile)(options, Expo_1.getExpoAutolinkingAndroidSourcesAsync)(projectRoot, options, expoAutolinkingVersion),
        (0, Profile_1.profile)(options, Expo_1.getExpoAutolinkingIosSourcesAsync)(projectRoot, options, expoAutolinkingVersion),
        (0, Profile_1.profile)(options, Expo_1.getExpoConfigSourcesAsync)(projectRoot, expoConfig, loadedModules, options),
        (0, Profile_1.profile)(options, Expo_1.getEasBuildSourcesAsync)(projectRoot, options),
        (0, Profile_1.profile)(options, Expo_1.getExpoCNGPatchSourcesAsync)(projectRoot, options),
        // bare managed files
        (0, Profile_1.profile)(options, Bare_1.getGitIgnoreSourcesAsync)(projectRoot, options),
        (0, Profile_1.profile)(options, Bare_1.getPackageJsonScriptSourcesAsync)(projectRoot, options),
        // bare native files
        (0, Profile_1.profile)(options, Bare_1.getBareAndroidSourcesAsync)(projectRoot, options),
        (0, Profile_1.profile)(options, Bare_1.getBareIosSourcesAsync)(projectRoot, options),
        // react-native core autolinking
        (0, Profile_1.profile)(options, Bare_1.getCoreAutolinkingSourcesFromExpoAndroid)(projectRoot, options, useRNCoreAutolinkingFromExpo),
        (0, Profile_1.profile)(options, Bare_1.getCoreAutolinkingSourcesFromExpoIos)(projectRoot, options, useRNCoreAutolinkingFromExpo),
        (0, Profile_1.profile)(options, Bare_1.getCoreAutolinkingSourcesFromRncCliAsync)(projectRoot, options, useRNCoreAutolinkingFromExpo),
        // patch-package
        (0, Profile_1.profile)(options, PatchPackage_1.getPatchPackageSourcesAsync)(projectRoot, options),
        // some known dependencies, e.g. react-native
        (0, Profile_1.profile)(options, Packages_1.getDefaultPackageSourcesAsync)(projectRoot, options),
    ]);
    // extra sources
    if (options.extraSources) {
        for (const source of options.extraSources) {
            debug(`Adding extra source - ${chalk_1.default.dim(JSON.stringify(source))}`);
        }
        results.push(options.extraSources);
    }
    // flatten results
    const sources = [].concat(...results);
    await (0, Profile_1.profile)(options, ignoreGitIgnoredLocalModuleFilesAsync)(projectRoot, sources, options);
    return sources;
}
/**
 * Exclude the files that git ignores from the autolinked directories outside `node_modules`.
 * These are local modules, e.g. `modules/my-module/ios`. A config plugin can write an ignored file
 * into a local module during prebuild. Without this, the fingerprint before prebuild (local
 * machine, CI) and after prebuild (EAS Build) is different.
 */
async function ignoreGitIgnoredLocalModuleFilesAsync(projectRoot, sources, options) {
    const localModuleDirs = sources.flatMap((source) => source.type === 'dir' &&
        source.reasons.some((reason) => reason.startsWith('expoAutolinking') || reason.startsWith('rncoreAutolinking')) &&
        !source.filePath.split('/').includes('node_modules')
        ? [source.filePath]
        : []);
    if (localModuleDirs.length === 0) {
        return;
    }
    let stdout;
    try {
        // Read only the `.gitignore` files. `--exclude-standard` also reads `.git/info/exclude` and
        // `core.excludesFile`, which are different on each machine.
        ({ stdout } = await (0, spawn_async_1.default)('git', [
            'ls-files',
            '--others',
            '--ignored',
            '--exclude-per-directory=.gitignore',
            '--directory',
            '-z',
            '--',
            ...localModuleDirs,
        ], { cwd: projectRoot }));
    }
    catch (e) {
        debug(chalk_1.default.red(`Error listing the gitignored files in local modules.\n${e}`));
        return;
    }
    const ignoredPaths = stdout.split('\0').filter(Boolean);
    for (const ignoredPath of ignoredPaths) {
        debug(`Ignoring gitignored path in a local module - ${chalk_1.default.dim(ignoredPath)}`);
        (0, Path_1.appendIgnorePath)(options.ignorePathMatchObjects, ignoredPath.endsWith('/') ? `${(0, minimatch_1.escape)(ignoredPath.slice(0, -1))}/**/*` : (0, minimatch_1.escape)(ignoredPath));
    }
    if (ignoredPaths.length > 0) {
        options.ignoreDirMatchObjects = (0, Path_1.buildDirMatchObjects)(options.ignorePathMatchObjects);
    }
}
