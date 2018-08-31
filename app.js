var express = require('express'); //Uses express
var app = express(); //app is an instance of express
var serv = require('http').Server(app); //Requires HTTP module; serv is an http object
var fs = require('fs'); // Uses File System

app.get('/', function(req, res) { //When a GET request is made, i.e. someone tries to access the site
res.sendFile(__dirname + '/index.html'); // send them index.html
});

app.use('/', express.static(__dirname)); //when any request is made give them everything in the root
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
				var a = (self.x - wall.x1) * (-wall.y2 + wall.y1) + (self.y - wall.y1) * (wall.x2 - wall.x1);
			var b = Math.sqrt((-wall.y2 + wall.y1) * (-wall.y2 + wall.y1) + (wall.x2 - wall.x1) * (wall.x2 - wall.x1));
			var dist = Math.abs(a / b);
				//find distance from player's center to the closest point on the line
				if(dist <= self.rad){
					var wAng = Math.atan2(wall.y2 - wall.y1,wall.x2 - wall.x1);
						var pVec = polarize(self.spdX, self.spdY); //find the angle you're moving in, and the mag
						var angDiff = Math.abs(pVec[1] - (wAng - Math.PI/2)); //take theta
						var normalForce = pVec[0]*Math.cos(angDiff) ; //mg cosTheta
						var bumpSpd = depolarize(-1*normalForce, (wAng - Math.PI/2)); //counteract the normal force
						var bumpOut = depolarize(self.rad - dist, (wAng - Math.PI/2)); //plus extra to push you out of the wall
						self.x += bumpOut[0];
						self.y += bumpOut[1];	
						self.spdX += bumpSpd[0];
						self.spdY += bumpSpd[1];	
						self.touching.push(wall);
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
	self.pressingGrapple = false;
	self.mouseCoords = [];
	self.spdLim = 6;
	self.rad = 10;
	self.jumpheight = 5;
	self.grapplex = 0;
	self.grappley = 0;
	self.grappleDir = 0;
	self.grappleStartLen = 500;
	self.grappleLen = 0;
self.grappleState = 0; //0 means off, 1 means mid-air, 2 means attached
self.camAngle = 0;
self.moveSpd = 1;

var super_update = self.update;

self.update = function(){
	self.updateGrapple();
	self.updateSpd();
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
			rMov = depolarize(ms, (self.camAngle + Math.PI*2)%(2*Math.PI)); //+ math.PI = +180 degrees
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
			dMov = depolarize(ms, (self.camAngle + Math.PI/2)%(2*Math.PI)); //takes camera angle and adds 1/2 pi (90 degrees), modulo for sanitation
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
    			jump = depolarize(self.jumpheight / self.touching.length, wAng - Math.PI/2); //jump according to normal
    			self.spdX += jump[0];
    			self.spdY += jump[1];
    		}
    	}
    }
}

self.updateGrapple = function(){
	var grappleDist = polarize(self.grapplex-self.x, self.grappley - self.y);
	if(self.grappleState == 0){ //grapple is off
		self.grapplex = self.x;
		self.grappley = self.y;
		if(self.pressingGrapple){ // if player is pressing grapple button
			self.grappleLen = self.grappleStartLen;
			var mouseAng = polarize(self.mouseCoords[0] - 5, self.mouseCoords[1] - 5);
			self.grappleDir = mouseAng[1];
			self.grappleState = 1;
		}
	}
	if(self.grappleState == 1){ //grapple is midair
		self.grapplex += 10*Math.cos(self.grappleDir);
		self.grappley += 10*Math.sin(self.grappleDir);
		if(grappleDist[0] > self.grappleLen){ //
			self.grappleState = 0
		}

		for(var i in Wall.list){
			var wall = Wall.list[i]; //loop through all walls
			if (Math.sqrt(Math.pow(wall.midx - self.grapplex, 2) + 
				Math.pow(wall.midy - self.grappley, 2))<= self.render){ //first stage detection (tests wall's midpoint for render distance)
				if(wall.x1 == wall.x2){ //vertical wall
					if (Math.min(wall.y1, wall.y2)-5 < self.grappley &&
						Math.max(wall.y1, wall.y2)+5 > self.grappley &&
						Math.min(wall.x1, wall.x2)-5 < self.grapplex &&
						Math.max(wall.x1, wall.x2)+5 > self.grapplex){
						self.grappleState = 2;
					self.grapplex = wall.x1;
				}
			}
				else if(wall.y1 == wall.y2){ //horizontal wall
					if (Math.min(wall.y1, wall.y2)-5 < self.grappley &&
						Math.max(wall.y1, wall.y2)+5 > self.grappley &&
						Math.min(wall.x1, wall.x2)-5 < self.grapplex &&
						Math.max(wall.x1, wall.x2)+5 > self.grapplex){
						self.grappleState = 2;
					self.grappley = wall.y1;
				}
			}
			else {
				var newX = self.grapplex + 10*Math.cos(self.grappleDir);
				var newY = self.grappley + 10*Math.sin(self.grappleDir);
				var a = (self.grapplex * newY - self.grappley * newX);
				var b = (wall.x1 * wall.y2 - wall.y1 * wall.x2);
				var cx = (self.grapplex - newX);
				var dx = (wall.x1 - wall.x2);
				var cy = (self.grappley - newY);
				var dy = (wall.y1 - wall.y2);
				var px = (a * dx - cx * b) / (cx * dy - cy * dx);
				var py = (a * dy - cy * b) / (cx * dy - cy * dx);
				if (Math.min(wall.x1, wall.x2) < px &&
					Math.max(wall.x1, wall.x2) > px &&
					Math.min(wall.y1, wall.y2) < py &&
					Math.max(wall.y1, wall.y2) > py &&
					Math.min(self.grapplex, newX) < px &&
					Math.max(self.grapplex, newX) > px &&
					Math.min(self.grappley, newY) < py &&
					Math.max(self.grappley, newY) > py){
					self.grappleState = 2;
				self.grapplex = px;
				self.grappley = py;
			}
		}
	}
}
}	
if(self.grappleState == 2){
	if(grappleDist[0] > self.grappleLen){
		var ang = Math.atan2(self.grappley - self.y, self.grapplex - self.x);
		var pVec = polarize(self.spdX, self.spdY)
			var angDiff = Math.abs(pVec[1] - ang); //take theta
			var normalForce = pVec[0]*Math.cos(angDiff) ; //mg cosTheta
			var bumpSpd = depolarize(-1*normalForce, ang); //counteract the normal force
			var bumpOut = depolarize(grappleDist[0] - self.grappleLen, ang); //plus extra to push you out of the wall
			self.x += bumpOut[0];
			self.y += bumpOut[1];	
			self.spdX += bumpSpd[0];
			self.spdY += bumpSpd[1];
			//console.log(ang, self.x, self.y, bumpOut);	
		}
		if (self.pressingRight){
			var rMov = []; //di force towards right
			rMov = depolarize(0.1, (self.camAngle + Math.PI*2)%(2*Math.PI)); //+ math.PI = +180 degrees
			self.spdX += rMov[0];
			self.spdY += rMov[1];
		}
		if (self.pressingLeft){
			var rMov = []; //di force towards right
			rMov = depolarize(0.1, (self.camAngle + Math.PI)%(2*Math.PI)); //+ math.PI = +180 degrees
			self.spdX += rMov[0];
			self.spdY += rMov[1];
		}
		if(self.pressingUp && self.grappleLen>5){
			self.grappleLen-=3;
		}
		if(self.pressingDown && self.grappleLen<500){
			self.grappleLen+=3;
		}
	}
	if(self.grappleState != 0){ //grapple is not off
		if(self.pressingSpace){ // press space to bring it back
			self.grappleState = 0;
		}
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
		else if(data.inputId === 'mouseCoords')
			player.mouseCoords = data.state;
		else if(data.inputId === 'grapple')
			player.pressingGrapple = data.state;
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
self.id = id;
return self;
}

var Wall = function(coords, id){
	var self = Terrain();
	self.x1 = Number(coords[0]);
	self.y1 = Number(coords[1]);
	self.x2 = Number(coords[2]);
	self.y2 = Number(coords[3]);
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
		if(player.grappleState > 0){
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

var rotato = function(x, y, rtheta){
    var r = [
    [Math.cos(rtheta), Math.sin(rtheta)],
    [-Math.sin(rtheta), Math.cos(rtheta)]
    ]
    var rX = r[0][0] * x + r[0][1] * y;
    var rY = r[1][0] * x + r[1][1] * y;
    return [rX, rY];
//console.log(r[0][0], r[0][1], r[1][0], r[1][1]);
}

var mapRead = function(){ //reads map and makes walls according to it
fs.readFile(__dirname + '/map.txt', 'utf8', function(err, data){ //reads the content of map.txt and returns it as a string
	if (err){
		return console.log(err);
	}
	//console.log(data);
	var map = data.split("\n"); //split lines into separate strings
	var mirrorNo = 4 //times to mirror map rotationally
	for(i in map){
		var wCoords = map[i].split(" "); //split strings into separate coords
		for(p = 1; p <= mirrorNo; p++){ // loop through all lines
			var p1 = rotato(wCoords[0], wCoords[1], p * 2 * Math.PI / mirrorNo);
			var p2 = rotato(wCoords[2], wCoords[3], p * 2 * Math.PI / mirrorNo);
			var rCoords = [p1[0],p1[1],p2[0],p2[1]];
			var wInit = new Wall(rCoords, (i - 1)*mirrorNo + p); //makes new wall
		}
	}
});
}

mapRead();

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