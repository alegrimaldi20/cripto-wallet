# Setting Up React Native


Visit the react native docs to setup react native for Android and IOS.

## Install Dependencies
Run from project root folder

Using npm:

``npm install``

Using yarn:

``yarn``

Install pods for ios:

``npx pod-install``

## Resolve build issues

1.Go to 'node_modules/react-native-webview/android/gradle.properties'


2.Change 'ReactNativeWebView_kotlinVersion' property value to 1.7.20


## Run Android Build

Using npm:

``npx react-native run-android``


Using yarn:


``yarn android``
Run IOS Build


Using npm:

``npx react-native run-ios``


Using yarn:


``yarn ios``
