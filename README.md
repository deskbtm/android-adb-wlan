# ANDROID ABD WLAN README

## New Future 0.0.6 

1. Support Android R+ connecting to a device over Wi-Fi
- You can not enter Paring Code if your system is Windows os Linux
- Details [https://developer.android.com/studio/command-line/adb#connect-to-a-device-over-wi-fi-android-11+](https://developer.android.com/studio/command-line/adb#connect-to-a-device-over-wi-fi-android-11+)
2. Add status bar and devices list

   ![](./doc/1.png)

3. Optimize IP selection

4. Remove keybinding


## Features

1. Android debug through WLAN
2. Support multiple devices

## Screenshot

![](./doc/usage.gif)

## Usage

1. Connect the USB (Android 11+ both usb and wireless)
2. Make sure that your mobile and pc on the same WLAN
3. active extension

* Using icon button upper right ⭐
* Using command `ctrl + shift + p` ;

### Commands

``` txt
- Android adb wlan connect 
- Android adb wlan restart
- Android adb wlan show devices
```

## Notification
1. **I just tested on windows. There is no guarantee that everyone can use it normally**  
2. **Not support VM**

3. The device must be on the same LAN
4. lf something went wrong you can try restart ADB or commit bug to [](https://github.com/deskbtm/android-adb-wlan) 
5. The first version is only for me personally, so many devices cannot connect

## Release Notes

#### 0.0.6 2021/9/3

#### 0.0.5 2020/12/7

1. Support android 10 +
2. Support input ip manually

#### 0.0.3

1\. Fix bugs
2\. Support multiple devices
3\. Update readme

#### 0.0.2

1. update readme

#### 0.0.1