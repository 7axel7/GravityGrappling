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

var Entity = function(){
	var self = {
		x:250,
		y:250,
		spdX:0,
		spdY:0,
		grav:10, //Personal gravity stat
		id:""
	}
	self.update = function(){
		self.updatePosition();
		self.spdY += self.grav
	}
	self.updatePosition = function(){
		;
		self.x += self.spdX;
		self.y += self.spdY;
	}
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
	}
	return self;
}

var Player = function(id){
    var self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.pressingLeftClick = false;
    self.mouseAngle = 0;
    self.maxSpd = 10;
    
    var super_update = self.update;
    self.update = function(){
    	self.updateSpd();
    	super_update();
    }

    self.updateSpd = function(){
        
    	if(self.pressingRight && self.pressingLeft) 
        	self.spdX = 0;
        else if(self.pressingRight)
            self.spdX = self.maxSpd;
        else if(self.pressingLeft)
            self.spdX = -self.maxSpd;
        else
        	self.spdX = 0;

        if(self.pressingUp && self.pressingDown)
        	self.spdY = 0;
        else if(self.pressingUp)
            self.spdY = -self.maxSpd;
        else if(self.pressingDown)
            self.spdY = self.maxSpd;
    }
    Player.list[id] = self;
    return self;
}

Player.list = {};

Player.onConnect = function(socket){
	
	var player = Player(socket.id);

	socket.on('keyPress',function(data){
        if(data.inputId === 'left')
            player.pressingLeft = data.state;
        else if(data.inputId === 'right')
            player.pressingRight = data.state;
        else if(data.inputId === 'up')
            player.pressingUp = data.state;
        else if(data.inputId === 'down')
            player.pressingDown = data.state;
        else if(data.inputId === 'lClick')
        	player.pressingLeftClick = data.state;
        else if(data.inputId === 'mouseAngle')
        	player.mouseAngle = data.state;
    });
}
Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
}

Player.update = function(){
	var pack = [];

	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		pack.push({
			x:player.x,
			y:player.y,
			number:player.number
		});
	}
	return pack;
}

var Block = function(id){
	var self = {
		x1:0,
		y1:0,
		x2:0,
		y2:0,
		id:""
	}
	self.id = id;
	Block.list[id] = self;
}

Block.list = {};

Block.update = function(){
	var pack = [];

	for(var i in Block.list){
		var block = Block.list[i];
		Block.update();
		pack.push({
			x:block.x,
			y:block.y,
		});
	}
	return pack;
}

var blockTest = new Block(1);
	blockTest.x1=100;
	blockTest.y1=100;
	blockTest.x2=300;
	blockTest.y2=350;


var io = require('socket.io')(serv,{});//listens when someone connects
io.sockets.on('connection',function(socket){
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	Player.onConnect(socket);

	console.log('socket connection'); 

	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});

	//socket.on('happy',function(data){ //listens for message happy
	//	console.log('happy because' + data.reason);
	//});

	//socket.emit('serverMsg',{
	//	msg:'hello',
	//});
});

setInterval(function(){
	var pack = {
		player:Player.update(),
		block:Block.update()
	}
	for(var i in SOCKET_LIST){ //Loop through all players
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions',pack); 
	}

	
},1000/25);
