const { Server } = require("socket.io");
let IO;

module.exports.initIO = (httpServer) => {
  IO = new Server(httpServer);

  IO.use((socket, next) => {
    if (socket.handshake.query) {
      let callerId = socket.handshake.query.callerId;
      socket.user = callerId;
      next();
    }
  });

  IO.on("connection", (socket) => {
    console.log(socket.user, "Connected");
  
    // Adicione o log abaixo para ver o ID da sessão do socket
    console.log("Socket ID:", socket.id);
  
    socket.join(socket.user);
  
    socket.on("call", (data) => {
      let calleeId = data.calleeId;
      let rtcMessage = data.rtcMessage;
  
      console.log(`${socket.user} is calling ${calleeId}`);
  
      socket.to(calleeId).emit("newCall", {
        callerId: socket.user,
        rtcMessage: rtcMessage,
      });
    });
  
    socket.on("answerCall", (data) => {
      let callerId = data.callerId;
      rtcMessage = data.rtcMessage;
  
      console.log(`${socket.user} answered a call from ${callerId}`);
  
      socket.to(callerId).emit("callAnswered", {
        callee: socket.user,
        rtcMessage: rtcMessage,
      });
    });
  
    socket.on("ICEcandidate", (data) => {
      console.log(`${socket.user} sent an ICE candidate to ${data.calleeId}`);
      let calleeId = data.calleeId;
      let rtcMessage = data.rtcMessage;
  
      socket.to(calleeId).emit("ICEcandidate", {
        sender: socket.user,
        rtcMessage: rtcMessage,
      });
    });
  
    // Adicione um manipulador de eventos 'disconnect' para registrar quando um usuário se desconecta
    socket.on("disconnect", () => {
      console.log(`${socket.user} disconnected`);
    });
  });
  
};

module.exports.getIO = () => {
  if (!IO) {
    throw Error("IO not initilized.");
  } else {
    return IO;
  }
};
