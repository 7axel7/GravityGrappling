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
	var pheight = Math.sqrt(x*x+y*y);
	var pangle = atan2(y/x);
	return [pheight,pangle]
}

var depolarize = function(pheight,pangle){
	var x = pheight*Math.cos(pangle);
	var y = pheight*Math.sin(pangle);
	return [x,y]
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
		grav:5, //Personal gravity stat
		id:""
	}
	self.update = function(){
		self.applyGravity();
		self.applyCollision();
		self.updatePosition();

	}

	self.applyGravity = function(){
		var gravVector = [ //The vector that represents the direction and magnitude of the pull of gravity
			depolarize(polarize(self.x,self.y)[0] -= self.grav, polarize(self.x,self.y)[1])[0] - self.x,
			depolarize(polarize(self.x,self.y)[0] -= self.grav, polarize(self.x,self.y)[1])[1] - self.y,
		];

		self.spdX += gravVector[0];
		self.spdY += gravVector[1];
	} //apply gravity to player's velocity

	self.applyCollision = function(){

	} //find applicable walls and applies collision

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
    self.spdLim = 10;

    var super_update = self.update;

    self.update = function(){
    	self.updateSpd();
    	super_update();
    }

    self.determineSpd = function(velocity,direction,spdLim){
        var temp = direction*spdLim; // spdLim is speed limit
        var speed = 1*direction*Math.min(Math.abs(temp-velocity),Math.abs(temp)); // function that decreases speed as it nears the limit
        // changing 1 to some other value will change how fast acceleration is.
        return speed;
    }

    self.updateSpd = function(){
        if(self.pressingRight){
        	self.accX += self.determineSpd(self.spdX,1,self.spdLim)
        }

        if(self.pressingLeft){
        	self.accX += self.determineSpd(self.spdX,-1,self.spdLim)

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

Player.update = function(){ // packs player info every update
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
		fric:0, //friction coefficient
		ttype:0, //terrain type if we ever need it
		id:""
	}
	return self;
}

var Wall = function(id){
	var self = Terrain();
	self.id = id;
	self.ang = 0; //angle of the wall (rads)
	self.norm = 0; //normal of the wall (ang +90 degrees)
	self.fric = 1;
	Wall.list[id] = self;
	return self;
}

Wall.list = {}; // init wall list

Wall.init = function(id) { 
//when making a wall use Wall.init to automatically set ang and norm using the points
	Wall.list[id].ang = Math.atan2(
		Wall.list[id].y2 - Wall.list[id].y1, 
		Wall.list[id].x2 - Wall.list[id].x1
	); //set dir
	Wall.list[id].norm = Wall.list[id],dir + 90;
}

var Block = function(id){
	var self = Terrain();
	self.id = id;
	self.ttype = 1;
	self.fric = 1;
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