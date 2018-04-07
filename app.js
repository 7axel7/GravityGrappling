var express = require('express'); //Uses express
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) { //Makes it redirect localhost:2000 to
	res.sendFile(__dirname + '/client/index.html'); //client/index.html
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000); // Server port localhost:2000
console.log('Server started.');

var SOCKET_LIST = {};
var io = require('socket.io')(serv,{});//listens when someone connects
io.sockets.on('connection',function(socket){
	socket.id = Math.random();
	socket.x = 0;
	socket.y = 0;
	SOCKET_LIST[socket.id] = socket;
	console.log('socket connection') 

	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
	});

/* socket.on('keyPress',function(data){
        if(data.inputId === 'left')
            player.pressingLeft = data.state;
        else if(data.inputId === 'right')
            player.pressingRight = data.state;
        else if(data.inputId === 'up')
            player.pressingUp = data.state;
        else if(data.inputId === 'down')
            player.pressingDown = data.state;
        else if(data.inputId === 'attack')
        	player.pressingAttack = data.state;
        else if(data.inputId === 'mouseAngle')
        	player.mouseAngle = data.state;
    });
*/

	//socket.on('happy',function(data){ //listens for message happy
	//	console.log('happy because' + data.reason);
	//});

	//socket.emit('serverMsg',{
	//	msg:'hello',
	//});
});

setInterval(function(){
	var pack = [];
	for(var i in SOCKET_LIST){ //Loop through all players
		var socket = SOCKET_LIST[i];
		socket.x++;
		socket.y++;
		pack.push({
			x:socket.x,
			y:socket.y
		});
	}
	for(var i in SOCKET_LIST){ //Loop through all players
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions',pack); 
	}

	
},1000/25);
