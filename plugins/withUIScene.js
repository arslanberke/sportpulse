const { withInfoPlist, withDangerousMod, withXcodeProject, withAppDelegate } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SCENE_DELEGATE_FILENAME = 'SceneDelegate.swift';

const SCENE_DELEGATE_SOURCE = `import UIKit
import React

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    // Sahne yasam dongusunde uygulamayi baslatan URL launchOptions'a hic
    // girmez, sahneye connectionOptions ile gelir. React Native'in
    // Linking.getInitialURL'i ise launchOptions'a baktigi icin bu URL'yi
    // aktarmazsak nil doner: soguk baslangicta hem deep link hedefi hem de
    // Supabase'in e-posta ile giris baglantisi sessizce dusurulur.
    //
    // URL'yi burada RCTLinkingManager'a olay olarak vermek ise ise yaramaz;
    // JS paketi henuz calismadigi icin olayi dinleyen kimse yoktur.
    var launchOptions = appDelegate.reactNativeLaunchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    appDelegate.reactNativeFactory?.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions
    )

    if let userActivity = connectionOptions.userActivities.first {
      RCTLinkingManager.application(
        UIApplication.shared,
        continue: userActivity,
        restorationHandler: { _ in }
      )
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
`;

/**
 * iOS 27 SDK ile derlenen uygulamalar UIScene yasam dongusunu benimsemek zorunda,
 * aksi halde hic baslamiyor (Apple TN3187). Expo 57 bunu henuz saglamadigi icin
 * SceneDelegate'i bu eklenti uretir.
 */
function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

function withSceneDelegateFile(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const projectName = cfg.modRequest.projectName;
      const target = path.join(cfg.modRequest.platformProjectRoot, projectName, SCENE_DELEGATE_FILENAME);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, SCENE_DELEGATE_SOURCE, 'utf8');
      return cfg;
    },
  ]);
}

function withSceneDelegateInTarget(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName;
    const relativePath = `${projectName}/${SCENE_DELEGATE_FILENAME}`;

    if (project.hasFile(relativePath)) {
      return cfg;
    }

    const groupKey = project.findPBXGroupKey({ name: projectName });
    if (!groupKey) {
      throw new Error(`withUIScene: '${projectName}' grubu Xcode projesinde bulunamadi.`);
    }

    project.addSourceFile(relativePath, { target: project.getFirstTarget().uuid }, groupKey);
    return cfg;
  });
}

/**
 * Stok AppDelegate pencereyi didFinishLaunchingWithOptions icinde olusturur.
 * Sahne yasam dongusunde pencereyi SceneDelegate sahiplenmeli, bu yuzden
 * baslatma oraya tasinir ve launchOptions saklanir.
 */
function withAppDelegateSceneSupport(config) {
  return withAppDelegate(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (!contents.includes('reactNativeLaunchOptions')) {
      contents = contents.replace(
        /(\n\s*var reactNativeFactory: RCTReactNativeFactory\?\n)/,
        '$1  var reactNativeLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?\n'
      );
    }

    contents = contents.replace(
      /#if os\(iOS\) \|\| os\(tvOS\)[\s\S]*?#endif\n/,
      '    reactNativeLaunchOptions = launchOptions\n'
    );

    if (!contents.includes('reactNativeLaunchOptions = launchOptions')) {
      throw new Error('withUIScene: AppDelegate.swift beklenen yapida degil, pencere baslatma blogu bulunamadi.');
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = function withUIScene(config) {
  config = withSceneManifest(config);
  config = withAppDelegateSceneSupport(config);
  config = withSceneDelegateFile(config);
  config = withSceneDelegateInTarget(config);
  return config;
};
