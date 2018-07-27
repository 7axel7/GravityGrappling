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

var polarize = function(x,y){
	pheight = Math.sqrt(x*x+y*y);
	pangle = atan2(y/x);
	return (pheight,pangle)
}

var depolarize = function(pheight,pangle){
	x = pheight*Math.cos(pangle);
	y = pheight*Math.sin(pangle);
	return (x,y)
}

var Entity = function(){
	var self = {
		fric:1, //how much friction affects movement
		x:0,
		y:0,
		spdX:0,
		spdY:0,
		accX:0,
		accY:0,
		grav:0, //Personal gravity stat
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
		var friction = self.fric;
		if (self.spdX < 0){
			friction = -1*friction;
		}
		if (Math.abs(friction) < Math.abs(self.spdX)){ // friction doesnt completely stop object
			self.spdX -= friction;
		} else {
			self.spdX = 0; // friction completely stops object
		}
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

    self.determineSpd = function(velocity,direction,spdStat){
        var temp = direction*spdStat; // spdStat is speed limit
        var speed = 1*direction*Math.min(Math.abs(temp-velocity),Math.abs(temp)); // function that decreases speed as it nears the limit
        // changing 1 to some other value will change how fast acceleration is.
        return speed;
    }

    self.updateSpd = function(){
        if(self.pressingRight){
        	self.accX += self.determineSpd(self.spdX,1,self.spdStat)
        }

        if(self.pressingLeft){
        	self.accX += self.determineSpd(self.spdX,-1,self.spdStat)

        }
    
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
			number:player.number,
			pId:player.id
		});
	}
	return pack;
}
var Terrain = function(id){
	var self = {
		x1:0,
		y1:0,
		x2:0,
		y2:0,
		dir:0,
		fric:0, //friction coefficient
		type:0,
		id:""
	}
	return self;
}
var Wall = function(id){
	var self = Terrain();
	self.id = id;
	Wall.list[id] = self;
	return self;
}

Wall.list = {};

var Block = function(id){
	var self = Terrain();
	self.id = id;
	self.type = 1;
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
	blockTest.x1=-5;
	blockTest.y1=-300;
	blockTest.x2=10;
	blockTest.y2=600;

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
		socket.emit('newPositions',pack,i); 
	}

	
},1000/25);
