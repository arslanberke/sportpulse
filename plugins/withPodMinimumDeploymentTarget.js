const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'FORCE_MIN_IOS_DEPLOYMENT_TARGET';

/**
 * Bazi pod'lar (RNSVG, RNCAsyncStorage, lottie-ios ...) podspec'lerinde hala
 * iOS 12.4-13.4 hedefliyor. Xcode 27 en az iOS 15.0 istedigi icin bunlar
 * "requires a minimum deployment target of iOS 15.0" hatasiyla derlenmiyor.
 *
 * expo-build-properties yalnizca Podfile'in platform satirini ayarlar; tek tek
 * pod hedeflerini yukseltmez. Bu eklenti Podfile'in post_install blogunu
 * genisleterek esigin altinda kalan her yapilandirmayi yukseltir.
 */
module.exports = function withPodMinimumDeploymentTarget(config, { deploymentTarget = '16.4' } = {}) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes(MARKER)) {
        return cfg;
      }

      const patch = [
        '',
        `    # ${MARKER}`,
        `    min_ios = podfile_properties['ios.deploymentTarget'] || '${deploymentTarget}'`,
        '    projects = [installer.pods_project]',
        '    projects += installer.generated_projects if installer.respond_to?(:generated_projects)',
        '    projects.compact.uniq.each do |project|',
        '      project.targets.each do |target|',
        '        target.build_configurations.each do |build_config|',
        "          current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']",
        '          if current.nil? || current.to_f < min_ios.to_f',
        "            build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios",
        '          end',
        '        end',
        '      end',
        '      project.save',
        '    end',
        '',
      ].join('\n');

      const anchor = /(react_native_post_install\([\s\S]*?\n {4}\)\n)/;
      if (!anchor.test(contents)) {
        throw new Error(
          'withPodMinimumDeploymentTarget: Podfile icinde react_native_post_install cagrisi bulunamadi.'
        );
      }

      fs.writeFileSync(podfilePath, contents.replace(anchor, `$1${patch}`), 'utf8');
      return cfg;
    },
  ]);
};
