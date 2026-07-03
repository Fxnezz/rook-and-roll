import { io } from "socket.io-client";
import { SignJWT } from "jose";
import { readFileSync } from "node:fs";

const URL = "http://localhost:4055";
const secret = new TextEncoder().encode(readFileSync("/tmp/admin_secret.txt","utf8").trim());
const mint = () => new SignJWT({role:"admin"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("10m").setAudience("rr-admin").sign(secret);
const wait = ms => new Promise(r=>setTimeout(r,ms));
const tc = { id:"untimed", initialMs:null, incrementMs:0, category:"untimed" };

const a = io(URL,{transports:["websocket"]}), b = io(URL,{transports:["websocket"]});
const idA={userId:"guest:bugA",username:"BugA",rating:1200,guest:true};
const idB={userId:"guest:bugB",username:"BugB",rating:1200,guest:true};
let room=null;
let aFenAfterForce=null, aMovesLenAfterForce=null;

a.on("queue:matched",({roomId})=>{room=roomId;a.emit("room:join",{roomId,identity:idA});});
b.on("queue:matched",({roomId})=>b.emit("room:join",{roomId,identity:idB}));

(async()=>{
  await wait(400);
  a.emit("queue:join",{identity:idA,timeControl:tc,rated:false});
  b.emit("queue:join",{identity:idB,timeControl:tc,rated:false});
  await wait(900);

  // play a couple of real moves first so there's history to lose
  const white = (await new Promise(res => {
    a.once("game:state", s => res(s.players.white.userId === idA.userId ? a : b));
  }));
  const black = white === a ? b : a;
  white.emit("move",{roomId,from:"e2",to:"e4"});
  await wait(300);
  black.emit("move",{roomId,from:"e7",to:"e5"});
  await wait(400);

  // admin connects and forces a move
  const admin = io(URL,{transports:["websocket"]});
  await wait(200);
  admin.emit("admin:hello",{token: await mint()});
  await wait(300);
  admin.emit("admin:attach",{roomId});
  await wait(200);

  // capture player A's board state AFTER the forced move
  a.once("game:state", s => { aFenAfterForce = s.fen; aMovesLenAfterForce = s.moves.length; });
  admin.emit("admin:forceMove",{roomId, from:"d1", to:"h5"}); // queen sortie, bypasses legality
  await wait(700);

  const expectedFenPieces = aFenAfterForce ? aFenAfterForce.split(" ")[0] : null;
  const isStandardStart = expectedFenPieces === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
  console.log(JSON.stringify({
    fenAfterForce: aFenAfterForce,
    movesLenAfterForce: aMovesLenAfterForce,
    playerBoardIncorrectlyReset: isStandardStart,
  }, null, 2));

  [a,b,admin].forEach(s=>s.close());
  process.exit(0);
})();
