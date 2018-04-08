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
		accX:0,
		accY:0,
		grav:10, //Personal gravity stat
		id:""
	}
	self.update = function(){
		self.updatePosition();
		self.spdY += self.grav
	}
	self.updatePosition = function(){
		self.spdX += self.accX;
		self.spdY += self.accY;
		self.x += self.spdX;
		self.y += self.spdY;
		self.accX = 0;
		self.accY = 0;
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
    self.spdStat = 10;

    
    var super_update = self.update;
    self.update = function(){
    	self.updateSpd();
    	super_update();
    }

    self.updateSpd = function(){
        if(self.pressingRight)
        	if(self.spdX > 0)
            	self.accX += self.spdStat/(1+self.spdX);
        	else 
        		self.accX += self.spdStat;
   	 	
        if(self.pressingLeft)
        	if(self.spdX < 0)
            	self.accX += -self.spdStat/(1-self.spdX);
        	else 
        		self.accX += -self.spdStat;

    	if(self.spdX > 0){
    		if(self.spdX > 1.5){self.accX -= 1.5;
    		} else {self.spdX = 0;}
    		
    	}

    	if(self.spdX < 0){
    		if(self.spdX < -1.5){self.accX += 1.5;
    		} else {self.spdX = 0;}
    	}

        self.spdX += self.accX;
		self.spdY += self.accY;
		self.accX = 0;
		self.accY = 0;
    
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
	return self;
}

Block.list = {};

Block.update = function(){
	var pack = [];

	for(var i in Block.list){
		var block = Block.list[i];
		pack.push({
			x1:block.x1,
			y1:block.y1,
			x2:block.x2,
			y2:block.y2,
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
