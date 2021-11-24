# ANDROID ABD WLAN README

## New Future 0.0.6 

1. Support Android R+ connecting to a device over Wi-Fi
- You dont have to enter Paring Code if your OS is Windows or Linux
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

1. Connect the USB (Android 11+ both USB and Wireless)
2. Make sure that your mobile and pc on the same WLAN
3. Active extension

* Using icon button upper right ⭐
* Using command `ctrl + shift + p` ;

### Commands

``` txt
- Android adb wlan connect 
- Android adb wlan restart
- Android adb wlan show devices
```

## Notification
1. **I just tested on Windows. There is no guarantee that everyone can use it normally**  
2. **Not support VM**

3. The device must be on the same LAN
4. lf something went wrong you can try restart ADB or report bug to [](https://github.com/deskbtm/android-adb-wlan) 
5. The primary version is for myself, many devices cloud not work
