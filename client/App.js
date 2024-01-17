import React, {useEffect, useState, useRef} from 'react';
import {
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import TextInputContainer from './components/TextInputContainer';

import CallEnd from './asset/CallEnd';
import CallAnswer from './asset/CallAnswer';
import MicOn from './asset/MicOn';
import MicOff from './asset/MicOff';
import IconContainer from './components/IconContainer';
import { VLCPlayer, VlCPlayerView } from 'react-native-vlc-media-player';
import InCallManager from 'react-native-incall-manager';
import {Endpoint} from 'react-native-pjsip';
import DeviceInfo from 'react-native-device-info';
import config from './utils/config';
import RNNotificationCall from 'react-native-full-screen-notification-incoming-call';
import BackgroundService from 'react-native-background-actions';
import { initVoip } from './services/Voip';
import AsyncStorage from '@react-native-async-storage/async-storage';
const calcVLCPlayerHeight = (windowWidth,aspetRatio) => {
  return windowWidth * aspetRatio;
};

export default function App({}) {
  const [type, setType] = useState('JOIN');
  const [stateEndpoint, setStateEndpoint] = useState();
  const [stateAccount, setStateAccount] = useState();
  const [localMicOn, setLocalMicOn] = useState(true);
  const [callerId, setCallerId] = useState();
  const [callerName, setCallerName] = useState();
  const [callReceivedEvent, setCallReceivedEvent] = useState();


  const endpoint = new Endpoint();

  const sleep = (time) => new Promise((resolve) => setTimeout(() => resolve(), time));

  const veryIntensiveTask = async (taskDataArguments) => {
    // Example of an infinite loop task
    const { delay } = taskDataArguments;
    await new Promise( async (resolve) => {
        for (let i = 0; BackgroundService.isRunning(); i++) {
            initVoip();
            await sleep(delay);
        }
        
    });
  };

  let currentCall = {}



  const options = {
    taskName: 'Voip',
    taskTitle: 'Voip BHS',
    taskDesc: 'BHS em execução',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#ff00ff',
    linkingURI: 'yourSchemeHere://chat/jane', // See Deep Linking for more info
    parameters: {
      delay: 20000,
    },
};

  useEffect(() => {
    console.log('startBackgroundService');
    BackgroundService.start(veryIntensiveTask, options);
  }, []);

  useEffect(() => {
    InCallManager.start({media: 'audio'});
    InCallManager.setKeepScreenOn(true);
    InCallManager.setForceSpeakerphoneOn(true);
    // InCallManager.setMicrophoneMute(false);
  
    return () => {
      InCallManager.stop();
    };
  }, []);
  

  const acceptCall = () => {
    // Aceitar a chamada
    endpoint.answerCall(callReceivedEvent, {
      statusCode: 200,
    });
  };

  const rejectCall = () => {
    // Rejeitar a chamada
    endpoint.hangupCall(callReceivedEvent, {
      statusCode: 603,
    });
    setType('JOIN');
  };

  const leave = async () => {
    // Desligar a chamada
    endpoint.hangupCall(callReceivedEvent, {
      statusCode: 200,
    });
  };

  
  useEffect(() => {
    let testAsyncStorage = async () => {
      try {
        const value1 = await AsyncStorage.getItem('@voipApp:endpoint')
        const value2 = await AsyncStorage.getItem('@voipApp:callStatus')
        const value3 = await AsyncStorage.getItem('@voipApp:callEvent')
        setCallReceivedEvent(JSON.parse(value3));
        console.log('value1', value1);
        console.log('value2', value2);
        console.log('value3', value3);
      } catch(e) {
        // error reading value
      }
    }
    testAsyncStorage();
  }, []);
  
  useEffect(() => {

    const handleAnswer = (data) => {
      RNNotificationCall.backToApp();
      const { callUUID, payload } = data;
      console.log('press answer', callUUID);
      acceptCall();
      // Sua lógica adicional para lidar com o evento 'answer'
    };

    const handleEndCall = (data) => {
      const { callUUID, endAction, payload } = data;
      console.log('press endCall', callUUID);
      leave();
      // Sua lógica adicional para lidar com o evento 'endCall'
    };

    RNNotificationCall.addEventListener('answer', handleAnswer);
    RNNotificationCall.addEventListener('endCall', handleEndCall);

    return () => {
      // Limpar event listeners ao desmontar o componente
      RNNotificationCall.removeEventListener('answer');
      RNNotificationCall.removeEventListener('endCall');
    };
  }, []); // O segundo argumento vazio indica que este efeito só é executado uma vez, equivalente ao componentDidMount


  const JoinScreen = () => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          backgroundColor: '#050A0E',
          justifyContent: 'center',
          paddingHorizontal: 42,
        }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <>
            <View
              style={{
                padding: 35,
                backgroundColor: '#1A1C22',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 14,
              }}>
              <Text
                style={{
                  fontSize: 18,
                  color: '#D0D4DD',
                }}>
                Seu Ramal
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  marginTop: 12,
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    fontSize: 32,
                    color: '#ffff',
                    letterSpacing: 6,
                  }}>
                  {config.user}
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: '#1A1C22',
                padding: 40,
                marginTop: 25,
                justifyContent: 'center',
                borderRadius: 14,
              }}>
              <Text
                style={{
                  fontSize: 18,
                  color: '#D0D4DD',
                }}>
                Insira o Ramal de Destino
              </Text> 
              {/* <TextInputContainer
                placeholder={'Ramal'}
                value={otherUserId.current}
                setValue={text => {
                  otherUserId.current = text;
                  console.log('TEST', otherUserId.current);
                }}
                keyboardType={'number-pad'}
              /> */}
              <TouchableOpacity
                onPress={() => {
                  // setType('OUTGOING_CALL');
                  // processCall();
                  BackgroundService.stop();
                }}
                style={{
                  height: 50,
                  backgroundColor: '#5568FE',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 12,
                  marginTop: 16,
                }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: '#FFFFFF',
                  }}>
                 parar
                </Text>
              </TouchableOpacity>
            </View> 
          </>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  };

  const OutgoingCallScreen = () => {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'space-around',
          backgroundColor: '#050A0E',
        }}>
        <View
          style={{
            padding: 35,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 14,
          }}>
          <Text
            style={{
              fontSize: 16,
              color: '#D0D4DD',
            }}>
            Ligando para
          </Text>

          <Text
            style={{
              fontSize: 36,
              marginTop: 12,
              color: '#ffff',
              letterSpacing: 6,
            }}>
           {callerName ? callerName : 'sem nome'} - {callerId ? callerId : 'sem id'}
          </Text>
        </View>
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <TouchableOpacity
            onPress={() => {
              setType('JOIN');
              // otherUserId.current = null;
            }}
            style={{
              backgroundColor: '#FF5D5D',
              borderRadius: 30,
              height: 60,
              aspectRatio: 1,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: 12,
            }}>
            <CallEnd width={50} height={12} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const IncomingCallScreen = () => {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'space-around',
          backgroundColor: '#050A0E',
        }}>
        <View
          style={{
            padding: 35,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 14,
          }}>
          <Text
            style={{
              fontSize: 18,
              marginTop: 12,
              color: '#ffff',
            }}>
            {callerName ? callerName : 'sem nome'} está ligando
          </Text>
        </View>
        <View 
          style={{
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 12,
          }}
          >
          <VLCPlayer
              style={{
                width: '100%',
                height: calcVLCPlayerHeight(Dimensions.get('window').width, 9/16),
                
              }}
              videoAspectRatio="16:9"
              source={{ uri: config.vlcStream}}
            />
          </View>
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
          }}>
          <TouchableOpacity
            onPress={() => {
              // processAccept();
              setType('WEBRTC_ROOM');
              acceptCall(callerId);
            }}
            style={{
              backgroundColor: 'green',
              borderRadius: 30,
              height: 60,
              aspectRatio: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <CallAnswer height={28} fill={'#fff'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              // processAccept();
              // setType('WEBRTC_ROOM');
              rejectCall(callerId);
            }}
            style={{
              backgroundColor: '#FF5D5D',
              borderRadius: 30,
              height: 60,
              aspectRatio: 1,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: 16,
            }}>
            <CallEnd height={28} fill={'#fff'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const WebrtcRoomScreen = () => {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#050A0E',
          paddingHorizontal: 12,
          paddingVertical: 12,
        }}>
        <View 
          style={{
            flex: 1,
            backgroundColor: '#050A0E',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <VLCPlayer
              style={{
                width: '100%',
                height: calcVLCPlayerHeight(Dimensions.get('window').width, 9/16),
                
              }}
              videoAspectRatio="16:9"
              source={{ uri: config.vlcStream}}
          />
        </View>
        <View
          style={{
            marginVertical: 12,
            flexDirection: 'row',
            justifyContent: 'space-evenly',
          }}>
          <IconContainer
            backgroundColor={'red'}
            onPress={() => {
              leave();
            }}
            Icon={() => {
              return <CallEnd height={26} width={26} fill="#FFF" />;
            }}
          />
          {/* <IconContainer
            style={{
              borderWidth: 1.5,
              borderColor: '#2B3034',
            }}
            backgroundColor={!localMicOn ? '#fff' : 'transparent'}
            onPress={() => {
              // toggleMic();
            }}
            Icon={() => {
              return localMicOn ? (
                <MicOn height={24} width={24} fill="#FFF" />
              ) : (
                <MicOff height={28} width={28} fill="#1D2939" />
              );
            }}
          /> */}
        </View>
      </View>
    );
  };

  switch (type) {
    case 'JOIN':
      return JoinScreen();
    case 'INCOMING_CALL':
      return IncomingCallScreen();
    case 'OUTGOING_CALL':
      return OutgoingCallScreen();
    case 'WEBRTC_ROOM':
      return WebrtcRoomScreen();
    default:
      return null;
  }
}
