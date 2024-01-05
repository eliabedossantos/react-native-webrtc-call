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

const calcVLCPlayerHeight = (windowWidth,aspetRatio) => {
  return windowWidth * aspetRatio;
};

export default function App({}) {
  const [type, setType] = useState('JOIN');
  const [stateEndpoint, setStateEndpoint] = useState();
  const [stateAccount, setStateAccount] = useState();
  const [localStream, setLocalStream] = useState();
  const [localMicOn, setLocalMicOn] = useState(true);
  const [remoteStream, setRemoteStream] = useState();
  const [callerId, setCallerId] = useState();
  const [callerName, setCallerName] = useState();
  const [callReceivedEvent, setCallReceivedEvent] = useState();


  const endpoint = new Endpoint();

  const createAccount = async () => {
    let deviceId = await DeviceInfo.getUniqueId();
    
    let configuration = {
      name: "",
      username: "",
      domain: "",
      password: "",
      proxy: null,
      regHeaders: {
        "X-Custom-Header": "Value"
      },
      regContactParams: `;unique-device-token-id=${deviceId}`,
      regOnAdd: false,
      android: `;im-type=sip`,
      transport: "UDP",
      audioCodecs: ["PCMU", "PCMA", "G722", "G729", "opus"],
    };
    

    const state = await endpoint.start({
      service: {
        ua: Platform.select({ios: "RnSIP iOS", android: "RnSIP Android"})
      },
      network: {
        useWifi: true,
        useOtherNetworks: true,
      }
    }).then((state) => {
      console.log('state', state);
      setStateEndpoint(state);
      return state;
    }).catch((error) => {
      console.log('error', error);
    })
  
    const account = await endpoint.createAccount(configuration).then((account) => {
      console.log('account', account);
        setTimeout(() => {
          endpoint.registerAccount(account, true);
      }, 5000);
      setStateAccount(account);
      return account;
    }).catch((error) => {
      console.log('error', error);
    })

  }

  useEffect(() => {
    createAccount();
  }, []);

  // useEffect(() => {
  //   InCallManager.start();
  //   InCallManager.setKeepScreenOn(true);
  //   InCallManager.setForceSpeakerphoneOn(true);
  //   InCallManager.setMicrophoneMute(false);
  
  //   return () => {
  //     InCallManager.stop();
  //   };
  // }, []);
  

  const acceptCall = () => {
    // Aceitar a chamada
    endpoint.answerCall(callReceivedEvent, {
      statusCode: 200,
    });

    InCallManager.start({ media: 'audio', auto: true, });
    InCallManager.stopRingtone();
    InCallManager.setKeepScreenOn(true);
    InCallManager.setForceSpeakerphoneOn(true);
    InCallManager.setMicrophoneMute(false);


  };
  

  endpoint.on('registration_changed', (event) => {
    console.log('registration_changed', event);
  });

  endpoint.on('call_received', (event) => {
    console.log('call_received', event);
    setCallerId(event._callId);
    setCallerName(event._remoteName);
    setCallReceivedEvent(event);
    setType('INCOMING_CALL');
    InCallManager.startRingtone('_DEFAULT_');
  });


  endpoint.on('call_changed', (event) => {
    console.log('call_changed', event);

    if (event.getState() === 'PJSIP_INV_STATE_CONFIRMED') {
      console.log('PJSIP_INV_STATE_CONFIRMED', event.getState());
      
      setType('WEBRTC_ROOM');
    } else if (event.getState() === 'PJSIP_INV_STATE_DISCONNECTED') {
      console.log('PJSIP_INV_STATE_DISCONNECTED', event.getState());
      setType('JOIN');
    }
  });

  endpoint.on('call_terminated', (event) => {
    console.log('call_terminated', event);

    if (event.getState() === 'PJSIP_INV_STATE_DISCONNECTED') {
      console.log('PJSIP_INV_STATE_DISCONNECTED', event.getState());
      InCallManager.stop();

    }
  });



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
                  91002
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
                  setType('OUTGOING_CALL');
                  // processCall();
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
                  Ligar agora
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
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <TouchableOpacity
            onPress={() => {
              // processAccept();
              // setType('WEBRTC_ROOM');
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
        </View>
      </View>
    );
  };

  function toggleMic() {
    localMicOn ? setLocalMicOn(false) : setLocalMicOn(true);
    localStream.getAudioTracks().forEach(track => {
      localMicOn ? (track.enabled = false) : (track.enabled = true);
    });
  }

  // function leave() {
  //   peerConnection.current.close();
  //   setLocalStream(null);
  //   setType('JOIN');
  // }

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
              source={{ uri: "rtsp://"}}
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
          <IconContainer
            style={{
              borderWidth: 1.5,
              borderColor: '#2B3034',
            }}
            backgroundColor={!localMicOn ? '#fff' : 'transparent'}
            onPress={() => {
              toggleMic();
            }}
            Icon={() => {
              return localMicOn ? (
                <MicOn height={24} width={24} fill="#FFF" />
              ) : (
                <MicOff height={28} width={28} fill="#1D2939" />
              );
            }}
          />
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
