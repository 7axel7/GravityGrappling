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
	var pangle = Math.atan2(y,x);
	return [pheight,pangle];
}

var depolarize = function(pheight,pangle){
	var x = pheight*Math.cos(pangle);
	var y = pheight*Math.sin(pangle);
	return [x, y];
}

var Entity = function(){
	var self = {
		fric:7, //how much friction affects movement
		x:0,
		y:1,
		spdX:0,
		spdY:0,
		grav:-1/10, //Personal gravity stat
		render:800, // Render Distance
		rad:0, //hitbox radius
		touching: [], //list of everything it's touching
		id:""
	}

	self.update = function(){
		self.updatePosition();
		self.applyGravity();
		self.applyCollision();
		self.applyFriction();
	}

	self.applyGravity = function(){
		var Grangle = Math.atan2(0 - self.y, 0 - self.x); //find angle towards 0,0
		var gravVector = [];
		var gravVector = depolarize(self.grav, Grangle);
		self.spdX += gravVector[0];
		self.spdY += gravVector[1];
		//console.log(gravVector,self.spdX, self.spdY);
	} //apply gravity to player's velocity

	self.applyCollision = function(){
		//console.log(self.x,self.y)
		self.touching = [];
		for(var i in Wall.list){
			var wall = Wall.list[i]; //loop through all walls
			if (Math.sqrt(Math.pow(wall.midx - self.x, 2) + 
				Math.pow(wall.midy - self.y, 2))<= self.render){ //first stage detection (tests wall's midpoint for render distance)
				if (Math.min(wall.x1, wall.x2) - self.rad < self.x &&
					Math.max(wall.x1, wall.x2) + self.rad > self.x &&
					Math.min(wall.y1, wall.y2) - self.rad < self.y &&
					Math.max(wall.y1, wall.y2) + self.rad > self.y){ //second stage detection (minimum bounding box + player's radius)
					if (wall.x1 == wall.x2){ //vertical wall special case
						var wAng = Math.atan2(wall.y2 - wall.y1,wall.x2 - wall.x1);
						var pVec = polarize(self.spdX, self.spdY); //find the angle you're moving in, and the mag 
						var angDiff = Math.abs(pVec[1] - (wAng + Math.PI/2)); //take theta
						var normalForce = pVec[0]*Math.cos(angDiff) ; //mg cosTheta
						var bumpSpd = depolarize(-1*normalForce, (wAng + Math.PI/2)); //counteract the normal force
						var bumpOut = depolarize(self.rad - Math.abs(Math.abs(self.x) - Math.abs(wall.x1)), (wAng + Math.PI/2)); //plus extra to push you out of the wall
						self.x += bumpOut[0];
						self.y += bumpOut[1];
						self.spdX += bumpSpd[0];
						self.spdY += bumpSpd[1];	
						self.touching[i] = wall;
						//console.log(bumpOut);
					}
					else if(wall.y1 == wall.y2){ // horizontal wall special case
						var wAng = Math.atan2(wall.y2 - wall.y1,wall.x2 - wall.x1);
						var pVec = polarize(self.spdX, self.spdY); //find the angle you're moving in, and the mag
						var angDiff = Math.abs(pVec[1] - (wAng + Math.PI/2)); //take theta
						var normalForce = pVec[0]*Math.cos(angDiff) ; //mg cosTheta
						var bumpSpd = depolarize(-1*normalForce, (wAng + Math.PI/2)); //counteract the normal force
						var bumpOut = depolarize(self.rad - Math.abs(Math.abs(self.y) - Math.abs(wall.y1)), (wAng + Math.PI/2)); //plus extra to push you out of the wall
						self.x += bumpOut[0];
						self.y += bumpOut[1];
						self.spdX += bumpSpd[0];
						self.spdY += bumpSpd[1];	
						self.touching[i] = wall;
						//console.log(bumpOut);
					}
					else{ //all other walls; have to do more math to detect collision
						var wa = wall.y2 - wall.y1;
						var wb = -1 * (wall.x2 - wall.x1);
						var wc = (wall.x2 - wall.x1) * wall.y1 -
							 (wall.y2 - wall.y1) * wall.x1; //find A,B,C in line's standard form equation
							 var wm = self.x + self.spdX + (wc + wb * self.y)/wa;
						var wn = self.y + self.spdY + (wc + wa * self.x)/wb; //do some math magic relating to player's position
						var dist = Math.abs((wm * wn) / Math.sqrt(Math.pow(wm, 2) + Math.pow(wn, 2))); 
						//find distance from player's center to the closest point on the line
						if(dist <= self.rad){
							var wAng = Math.atan2(wall.y2 - wall.y1,wall.x2 - wall.x1);
							var pVec = polarize(self.spdX, self.spdY); //find the angle you're moving in, and the mag
							var angDiff = Math.abs(pVec[1] - (wAng + Math.PI/2)); //take theta
							var normalForce = pVec[0]*Math.cos(angDiff) ; //mg cosTheta
							var bumpSpd = depolarize(-1*normalForce, (wAng + Math.PI/2)); //counteract the normal force
							var bumpOut = depolarize(self.rad - dist, (wAng + Math.PI/2)); //plus extra to push you out of the wall
							self.x += bumpOut[0];
							self.y += bumpOut[1];	
							self.spdX += bumpSpd[0];
							self.spdY += bumpSpd[1];	
							self.touching.push(wall);
						}
					}
				}
			}
		}
	//console.log(self.touching);
	} //find applicable walls and applies collision
	self.applyFriction = function() {
		if (self.touching.length >= 1){
			for (var i in self.touching){
				var wall = self.touching[i];
				var mom = polarize(self.spdX, self.spdY); //get polar vector for momentum
				var ur = [];
				var wAng = Math.atan2(wall.y2 - wall.y1,wall.x2 - wall.x1);
				var angDiff = Math.abs(mom[1] - (wAng + Math.PI/2)); //take theta
				var normalForce = mom[0]*Math.cos(angDiff) ;
				var friction = self.fric+normalForce;
				if (friction < mom[0]){ // friction doesnt completely stop object
					mom[0] -= friction;
					ur = depolarize(mom[0], mom[1]);
					self.spdX = ur[0];
					self.spdY = ur[1];
				} else {
					self.spdX = 0;
					self.spdY = 0; // friction completely stops object
				}
			}
		}
	}
	self.updatePosition = function(){
		self.x += self.spdX;
		self.y += self.spdY;
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
	self.pressingSpace = false;
	self.pressingLeftClick = false;
	self.grapple = false;
	self.mouseAngle = 0;
	self.spdLim = 6;
	self.rad = 10;
	self.jumpheight = 5;
	self.grapplex = 0;
	self.grappley = 0;
	self.grappledir = 0;
	self.grappleinit = true;
	self.camAngle = 0;
	self.moveSpd = 1;

	var super_update = self.update;

	self.update = function(){
		self.updateSpd();
		self.updateGrapple();
		self.updatecamAngle();
		super_update();
	}

	self.determineSpd = function(velocity,direction,spdLim){
        var temp = direction*spdLim; // spdLim is speed limit
        var speed = 0.5*direction*Math.min(Math.abs(temp-velocity),Math.abs(temp)); // function that decreases speed as it nears the limit
        // changing 1 to some other value will change how fast acceleration is.
        return speed;
    }
    
    self.updateSpd = function(){
    	var tVel = polarize (self.spdX, self.spdY); //total velocity
    	var ms = self.determineSpd(tVel[0], self.moveSpd, self.spdLim); //determine speed

    	if(self.pressingRight){
    		if (self.touching.length >= 1){
    			var rMov = []; //di force towards right
    			rMov = depolarize(ms, (self.camAngle + Math.PI*2)%(2*Math.PI)); //takes camera angle and adds 1/2 pi (90 degrees), modulo for sanitation
    			self.spdX += rMov[0];
    			self.spdY += rMov[1];
    		}
    	}

    	if(self.pressingLeft){
    		if (self.touching.length >= 1){	
    			var lMov = [];
    			lMov = depolarize(ms, (self.camAngle + Math.PI)%(2*Math.PI)); 
    			self.spdX += lMov[0];
    			self.spdY += lMov[1];
    		}
    	}

    	if(self.pressingDown){ //note!!! maybe remove vertical DI in future????
    		if (self.touching.length >= 1){
    			var dMov = []; 
    			dMov = depolarize(ms, (self.camAngle + Math.PI/2)%(2*Math.PI)); //+ math.PI = +180 degrees
    			self.spdX += dMov[0];
    			self.spdY += dMov[1];
    		}
    	}

    	if(self.pressingUp){
    		if (self.touching.length >= 1){
    			var uMov = []; 
    			uMov = depolarize(ms, (self.camAngle + Math.PI*3/2)%(2*Math.PI));
    			self.spdX += uMov[0];
    			self.spdY += uMov[1];
    		}
    	}

    	if(self.pressingSpace){
        	if (self.touching.length >= 1){ // if player is touching a wall
        		for (var i in self.touching){
        			var wall = self.touching[i];
        			var wAng = Math.atan2(wall.y2 - wall.y1,wall.x2 - wall.x1); //find out wall's angle
        			var jump = [];
        			jump = depolarize(self.jumpheight / self.touching.length, wAng + Math.PI/2); //jump according to normal
        			self.X += jump[0];
        			self.Y += jump[1];
        			self.spdX += jump[0];
        			self.spdY += jump[1];
        		}
        	}
        }
    }

    self.updateGrapple = function(){
    	if(self.grapple){
    		if(self.grappleinit){
    			self.grapplex = self.x;
    			self.grappley = self.y;
    			self.grappledir = self.mouseAngle;
    			self.grappleinit = false;
    		}
    		self.grapplex += 10*Math.cos(self.grappledir);
    		self.grappley += 10*Math.sin(self.grappledir);
    	} else {
    		self.grappleinit = true;
    	}
    }

    self.updatecamAngle = function(){
    	var Pangle = Math.atan2(0 - self.y, 0 - self.x);
    	self.camAngle = (Pangle - (Math.PI * 3 / 2)) % (2*Math.PI);
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
		else if(data.inputId === 'space')
			player.pressingSpace = data.state;
		else if(data.inputId === 'lClick')
			player.pressingLeftClick = data.state;
		else if(data.inputId === 'mouseAngle')
			player.mouseAngle = data.state;
		else if(data.inputId === 'grapple')
			player.grapple = data.state;
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
			pId:player.id,
			spdX:player.spdX,
			spdY:player.spdY,
			rot:player.camAngle
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
		ttype:0, //terrain type if we ever need it
		id:""
	}
	return self;
}

var Wall = function(id){
	var self = Terrain();
	self.id = id;
	self.midx = (self.x1 + self.x2)/2 //avg the coords for midpoint
	self.midy = (self.y1 + self.y2)/2
	Wall.list[id] = self;
	return self;
}

Wall.list = {}; // init wall list

Wall.update = function(){
	var pack = [];

	for(var i in Wall.list){
		var wall = Wall.list[i];
		pack.push({
			x1:wall.x1,
			y1:wall.y1,
			x2:wall.x2,
			y2:wall.y2,
		});
	}
	return pack;
}

Player.hookupdate = function(){
	var pack = [];

	for(var i in Player.list){
		var player = Player.list[i];
		if(player.grapple){
			pack.push({ 
				x1:player.x,
				y1:player.y,
				x2:player.grapplex,
				y2:player.grappley,
			});
		}
	}
	return pack;
}

var wallTest = new Wall(1);
wallTest.x1 = 150
wallTest.y1 = 100
wallTest.x2 = -150
wallTest.y2 = 100

var wallTesty = new Wall(2);
wallTesty.x1 = 300
wallTesty.y1 = -50
wallTesty.x2 = 150
wallTesty.y2 = 100

var wallTester = new Wall(3);
wallTester.x1 = 300
wallTester.y1 = -350
wallTester.x2 = 300
wallTester.y2 = -50

var wallTesty = new Wall(4);
wallTesty.x1 = 150
wallTesty.y1 = -200
wallTesty.x2 = -200
wallTesty.y2 = 150

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

});

setInterval(function(){

	var pack = {
		player:Player.update(),
		block:Block.update(),
		wall:Wall.update(),
		hook:Player.hookupdate(),
	}
	for(var i in SOCKET_LIST){ //Loop through all players
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions',pack,i); 
	}

},1000/120);