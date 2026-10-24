// Caixa de e-mail somente em memória. Nunca entrega mensagens a destinatários externos.
import net from 'node:net';
import http from 'node:http';
const mensagens = [];
let falhar = false;
net.createServer(socket=>{
  socket.setEncoding('utf8');
  socket.setTimeout(20000,()=>socket.destroy());
  socket.write('220 era-test SMTP\r\n');
  let buffer='', dados=false, linhas=[];
  socket.on('data',trecho=>{
    buffer+=trecho;
    if (buffer.length>100000) return socket.destroy();
    let fim;
    while ((fim=buffer.indexOf('\r\n'))>=0) {
      const linha=buffer.slice(0,fim);buffer=buffer.slice(fim+2);
      if (dados) {
        if (linha==='.') {
          dados=false;
          if (falhar) socket.write('550 Teste de falha SMTP\r\n');
          else {mensagens.push(linhas.join('\r\n'));socket.write('250 armazenada somente no teste\r\n');}
          linhas=[];
        } else linhas.push(linha.replace(/^\.\./,'.'));
      } else if (/^(EHLO|HELO)/i.test(linha)) socket.write('250 era-test\r\n');
      else if (/^DATA/i.test(linha)) {dados=true;socket.write('354 termine com ponto\r\n');}
      else if (/^QUIT/i.test(linha)) {socket.end('221 tchau\r\n');}
      else socket.write('250 OK\r\n');
    }
  });
  socket.on('error',()=>{});
}).listen(2525,'0.0.0.0');
http.createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  if (req.method==='POST'&&req.url==='/falhar') {falhar=true;res.end('{}');}
  else if (req.method==='POST'&&req.url==='/restaurar') {falhar=false;res.end('{}');}
  else if (req.method==='GET'&&req.url==='/mensagens') res.end(JSON.stringify(mensagens));
  else {res.statusCode=404;res.end('{}');}
}).listen(8025,'0.0.0.0');
