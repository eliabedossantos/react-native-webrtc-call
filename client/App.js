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
import SocketIOClient from 'socket.io-client';
import {
  mediaDevices,
  RTCPeerConnection,
  // RTCView,
  RTCIceCandidate,
  RTCSessionDescription,
} from 'react-native-webrtc';
import CallEnd from './asset/CallEnd';
import CallAnswer from './asset/CallAnswer';
import MicOn from './asset/MicOn';
import MicOff from './asset/MicOff';
import IconContainer from './components/IconContainer';
import InCallManager from 'react-native-incall-manager';
import { VLCPlayer, VlCPlayerView } from 'react-native-vlc-media-player';

const calcVLCPlayerHeight = (windowWidth,aspetRatio) => {
  return windowWidth * aspetRatio;
};

export default function App({}) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [type, setType] = useState('JOIN');
  const [callerId] = useState(Math.floor(100000 + Math.random() * 900000).toString());
  const [localMicOn, setLocalMicOn] = useState(true);
  const otherUserId = useRef(null);
  const vlcPlayerRef = useRef(null);
  const [isPlayerReady, setPlayerReady] = useState(false);
  
  const socket = SocketIOClient('http://192.168.0.10:3500', {
    transports: ['websocket'],
    query: {
      callerId,
    },
  });
  
  const peerConnection = useRef(new RTCPeerConnection({
    iceServers: [],
  }));
  
  let remoteRTCMessage = useRef(null);
  
  useEffect(() => {
    const initializePeerConnection = async () => {
      try {
        const newPeerConnection = new RTCPeerConnection({
          iceServers: [],
        });
  
        peerConnection.current = newPeerConnection;
  
        const stream = await mediaDevices.getUserMedia({ audio: true });
  
        setLocalStream(stream);
        peerConnection.current.addStream(stream);
  
        peerConnection.current.onaddstream = event => {
          setRemoteStream(event.stream);
        };
  
        peerConnection.current.onicecandidate = event => {
          if (event.candidate) {
            sendICEcandidate({
              calleeId: otherUserId.current,
              rtcMessage: {
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate,
              },
            });
          } else {
            console.log('End of candidates.');
          }
        };
      } catch (error) {
        console.error("Erro ao inicializar a conexão peer:", error);
      }
    };
  
    initializePeerConnection();
  
    socket.on('newCall', data => {
      remoteRTCMessage.current = data.rtcMessage;
      otherUserId.current = data.callerId;
      setType('INCOMING_CALL');
    });
  
    socket.on('callAnswered', data => {
      remoteRTCMessage.current = data.rtcMessage;
      peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(remoteRTCMessage.current),
      );
      setType('WEBRTC_ROOM');
    });
  
    socket.on('ICEcandidate', data => {
      let message = data.rtcMessage;
  
      if (peerConnection.current) {
        peerConnection?.current
          .addIceCandidate(
            new RTCIceCandidate({
              candidate: message.candidate,
              sdpMid: message.id,
              sdpMLineIndex: message.label,
            }),
          )
          .then(data => {
            console.log('SUCCESS');
          })
          .catch(err => {
            console.log('Erro', err);
          });
      }
    });
  
    return () => {
      socket.off('newCall');
      socket.off('callAnswered');
      socket.off('ICEcandidate');
    };
  }, []);
  
  useEffect(() => {
    InCallManager.start();
    InCallManager.setKeepScreenOn(true);
    InCallManager.setForceSpeakerphoneOn(true);
  
    return () => {
      InCallManager.stop();
    };
  }, []);

    
  
  function sendICEcandidate(data) {
    socket.emit('ICEcandidate', data);
  }
  
  async function processCall() {
    const sessionDescription = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(sessionDescription);
    sendCall({
      calleeId: otherUserId.current,
      rtcMessage: sessionDescription,
    });
  }
  
  async function processAccept() {
    peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(remoteRTCMessage.current),
    );
    const sessionDescription = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(sessionDescription);
    answerCall({
      callerId: otherUserId.current,
      rtcMessage: sessionDescription,
    });
  }
  
  function answerCall(data) {
    socket.emit('answerCall', data);
  }
  
  function sendCall(data) {
    socket.emit('call', data);
  }
  
  function toggleMic() {
    setLocalMicOn(prevState => !prevState);
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !localMicOn;
    });
  }
  
  function leave() {
    peerConnection.current.close();
    setLocalStream(null);
    setType('JOIN');
  }

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
                  {callerId}
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
              <TextInputContainer
                placeholder={'Ramal'}
                value={otherUserId.current}
                setValue={text => {
                  otherUserId.current = text;
                  console.log('TEST', otherUserId.current);
                }}
                keyboardType={'number-pad'}
              />
              <TouchableOpacity
                onPress={() => {
                  setType('OUTGOING_CALL');
                  processCall();
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
            {otherUserId.current}
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
              otherUserId.current = null;
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
              fontSize: 36,
              marginTop: 12,
              color: '#ffff',
            }}>
            {otherUserId.current} está ligando
          </Text>
        </View>
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <TouchableOpacity
            onPress={() => {
              processAccept();
              setType('WEBRTC_ROOM');
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

  function leave() {
    peerConnection.current.close();
    setLocalStream(null);
    setType('JOIN');
  }

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
              // url="rtsp://"
              source={{ uri: ""}}
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
