import DeviceInfo from "react-native-device-info";
import config from "../utils/config";
import {Endpoint} from 'react-native-pjsip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNNotificationCall from 'react-native-full-screen-notification-incoming-call';

const ENDPOINT_KEY = '@voipApp:endpoint';
const CALL_KEY = '@voipApp:callStatus';
const CALL_EVENT = '@voipApp:callEvent';
const CALL_STATUS = {
  IDLE: 'IDLE',
  RINGING: 'RINGING',
  CONNECTING: 'CONNECTING',
  CALLING: 'CALLING',
  CONNECTED: 'CONNECTED',
  ACTIVE: 'ACTIVE',
  DISCONNECTED: 'DISCONNECTED',
}
const endpoint = new Endpoint();

export const initVoip = async () => {
  let deviceId = await DeviceInfo.getUniqueId();
  endpoint.setMaxListeners(15); // ou qualquer número que seja suficiente para o seu caso
  let configuration = {
    name: "Eliabe",
    username: config.user,
    password: config.password,
    domain: config.voipHost,
    proxy: null,
    regHeaders: {
      "X-Custom-Header": "Value",
    },
    regContactParams: `;unique-device-token-id=${deviceId}`,
    regOnAdd: false,
    android: `;im-type=sip`,
    transport: "UDP",
    codecs: ["opus", "PCMU", "G729", "PCMA"]
  };
  
  await endpoint.start({
    service: {
      ua: Platform.select({ios: "RnSIP iOS", android: "RnSIP Android"})
    },
    network: {
      useWifi: true,
      useOtherNetworks: true,
    }
  }).then((state) => {
    // console.log('state', state);
    if (state.accounts.length === 0) {
      createAccount(configuration);
    } else {
      register(state.accounts[0]);
    }
    return state;
  }).catch((error) => {
    console.log('error', error);
  })

  AsyncStorage.setItem(ENDPOINT_KEY, JSON.stringify(endpoint));

  endpoint.on("registration_changed", (account) => {
    // console.log('account', account);
  });

  endpoint.on('call_received', (event) => {
    console.log('call_received', event);
    sendCallNotification(event._callId, event._remoteName);
    AsyncStorage.setItem(CALL_KEY, CALL_STATUS.RINGING);
    AsyncStorage.setItem(CALL_EVENT, JSON.stringify(event));
    RNNotificationCall.addEventListener('answer', () => {
      endpoint.answerCall(event, {
        statusCode: 200,
      });
    });
    RNNotificationCall.addEventListener('endCall', () => {
      endpoint.hangupCall(event, {
        statusCode: 200,
      });
    });
  });

  endpoint.on('call_changed', (event) => {
    console.log('call_changed', event);
     switch (event.getState()) {
      case 'PJSIP_INV_STATE_CALLING':
        console.log('PJSIP_INV_STATE_CALLING', event.getState());
        AsyncStorage.setItem(CALL_KEY, CALL_STATUS.CONNECTING);
        break;
      case 'PJSIP_INVSTATE_CONFIRMED':
        console.log('PJSIP_INVSTATE_CONFIRMED', event.getState());
        AsyncStorage.setItem(CALL_KEY, CALL_STATUS.CONNECTED);
        RNNotificationCall.hideNotification();
        break;
        case 'PJSIP_INV_STATE_DISCONNECTED':
          console.log('PJSIP_INV_STATE_DISCONNECTED', event.getState());
          AsyncStorage.setItem(CALL_KEY, CALL_STATUS.DISCONNECTED);
          RNNotificationCall.hideNotification();
          RNNotificationCall.removeEventListener('answer');
          RNNotificationCall.removeEventListener('endCall');
          break;
        case 'PJSIP_INV_STATE_CONNECTING':
          AsyncStorage.setItem(CALL_KEY, CALL_STATUS.CONNECTING);
          RNNotificationCall.hideNotification();
          RNNotificationCall.removeEventListener('answer');
          RNNotificationCall.removeEventListener('endCall');
        console.log('PJSIP_INV_STATE_CONNECTING', event.getState());
        break;
      default:
        break;
    }
  });

}

const createAccount = async (configuration) => {
 await endpoint.createAccount(configuration).then((account) => {
    console.log('account', account);
    setTimeout(() => {
       register(account);
    }, 10000);
    
    return account;
  }).catch((error) => {
    console.log('error', error);
  })
}

const register = async (account) => {
  endpoint.registerAccount(account, true);
}

const sendCallNotification = (callUid, callerName) => {
  RNNotificationCall.displayNotification(
    callUid,
    null,
    30000,
    {
      channelId: 'com.linhvo.rnnotificationcall',
      channelName: 'RNNotificationCall',
      notificationIcon: 'ic_launcher', //mipmap
      notificationTitle: callerName ? callerName : 'sem nome',
      notificationBody: 'Ligando...',
      answerText: 'Atender',
      declineText: 'Desligar',
      notificationColor: 'colorAccent',
      notificationSound: 'ringtone',
      payload:{
        name: callerName ? callerName : 'sem nome',
        Body: 'Ligando...',
      }
    }
  );
};

