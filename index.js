if (typeof __DEV__ !== "undefined" && __DEV__) {
  try {
    // Keep Expo runtime side-effects aligned with the default registerRootComponent path.
    require("expo/src/Expo.fx");

    const expo = require("expo");
    const { AppRegistry, Platform } = require("react-native");

    // Root fix: bypass Expo's dev wrapper (`withDevTools`) which calls keep-awake
    // too early on Android before there is an active activity.
    expo.registerRootComponent = (component) => {
      AppRegistry.registerComponent("main", () => component);

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const rootTag = document.getElementById("root");
        if (!rootTag) {
          throw new Error('Required HTML element with id "root" was not found in the document HTML.');
        }

        AppRegistry.runApplication("main", {
          rootTag,
          hydrate: globalThis.__EXPO_ROUTER_HYDRATE__,
        });
      }
    };
  } catch (error) {
    console.warn("Failed to apply dev root registration override:", error);
  }
}

require("expo-router/entry");
