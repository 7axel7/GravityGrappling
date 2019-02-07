var express = require('express'); //Uses express
var app = express(); //app is an instance of express
var serv = require('http').Server(app); //Requires HTTP module; serv is an http object
var fs = require('fs'); // Uses File System

app.get('/', function(req, res) { //When a GET request is made, i.e. someone tries to access the site
	res.sendFile(__dirname + '/index.html'); // send them index.html
});

app.use('/', express.static(__dirname)); //when any request is made give them everything in the root
serv.listen(process.env.PORT || 2000); // Server port localhost:2000
console.log('Server started.');

var SOCKET_LIST = {};

////////////////////
//GLOBAL FUNCTIONS//
////////////////////

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

var rotato = function(x, y, rtheta){
    var r = [
    [Math.cos(rtheta), Math.sin(rtheta)],
    [-Math.sin(rtheta), Math.cos(rtheta)]
    ];
    var rX = r[0][0] * x + r[0][1] * y;
    var rY = r[1][0] * x + r[1][1] * y;
    return [rX, rY];
}

//////////
//Entity//
//////////

var Entity = function(){
	var self = {
		pos: [0,0],
		vel: [0,0],
		fric:7, //how much friction affects movement
		grav:-1/10, //Personal gravity stat
		render:800, // Render Distance
		rad:5, //hitbox radius
		touching: [], //list of everything it's touching
		newPos: [0,0],
		id:""
	}
	self.update = function(){
		self.newPos[0] += self.vel[0]
		self.newPos[1] += self.vel[1]
		self.applyGravity();
		self.applyCollision();
		self.applyFriction();
		self.pos[0] = self.newPos[0];
		self.pos[1] = self.newPos[1];
	}

	self.applyGravity = function(){
		var Grangle = Math.atan2(0 - self.pos[1], 0 - self.pos[0]); //find angle towards 0,0
		var gravVector = depolarize(self.grav, Grangle);
		self.vel[0] += gravVector[0];
		self.vel[1] += gravVector[1];
		//console.log(gravVector,self.vel[0], self.vel[1]);
	} //apply gravity to player's velocity

	self.applyCollision = function(){
		//console.log(self.pos[0],self.pos[1])
		self.touching = [];
		for(var i in Wall.list){
			var wall = Wall.list[i]; //loop through all walls
			minX = Math.min(wall.x1,wall.x2) - 2*self.rad;
			maxX = Math.max(wall.x1,wall.x2) + 2*self.rad;
			minY = Math.min(wall.y1,wall.y2) - 2*self.rad;
			maxY = Math.max(wall.y1,wall.y2) + 2*self.rad;
			if (minX <= self.pos[0] && self.pos[0] <= maxX && minY <= self.pos[1] && self.pos[1] <= maxY){
				self.collideSnap(wall);
			}
			
		}
	} //find applicable walls and applies collision

	self.applyFriction = function() {
		if (self.touching.length >= 1){
			for (var i in self.touching){
				var wall = self.touching[i];
				var mom = polarize(self.vel[0], self.vel[1]); //get polar vector for momentum
				var ur = [];
				var wallAng = Math.atan2(wall.y2 - wall.y1,wall.x2 - wall.x1);
				var angDiff = Math.abs(mom[1] - (wallAng + Math.PI/2)); //take theta
				var normalForce = mom[0]*Math.cos(angDiff) ;
				var friction = self.fric+normalForce;
				if (friction < mom[0]){ // friction doesnt completely stop object
					mom[0] -= friction;
					ur = depolarize(mom[0], mom[1]);
					self.vel[0] = ur[0];
					self.vel[1] = ur[1];
				} else {
					self.vel[0] = 0;
					self.vel[1] = 0; // friction completely stops object
				}
			}
		}
	}

	self.collideSnap = function(wall) { // boundary is [x1,y1,x2,y2]
		//check if it intersects
		// v × w -> v.x w.y − v.y w.x
		// https://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
		var x = [self.pos[0], self.newPos[0], wall.x1, wall.x2]
		var y = [self.pos[1], self.newPos[1], wall.y1, wall.y2]
		var r = [x[1] - x[0], y[1] - y[0]]
		var s = [x[3] - x[2], y[3] - y[2]]
		var v = [x[2] - x[0], y[2] - y[0]] //q - p
		var w = r[0] * s[1] - r[1] * s[0] // r * s
		var minDistance;
		var t;
		var u;
		if (w != 0){
			t = (v[0] * s[1] - v[1] * s[0]) / w  //(q − p) × s / (r × s)
			u = (v[0] * r[1] - v[1] * r[0]) / w  //(q − p) × r / (r × s)
		}

		var distances = [null,null,null,null];
		var intX;
		var intY;
		for (i = 0; i < 4; i++) {
			if (i < 2){ //Check the wall if it's the player's movement
				wallX1 = x[2]
				wallX2 = x[3]
				wallY1 = y[2]
				wallY2 = y[3]
			}
			else{ //Check the player's movement if it's the wall
				wallX1 = x[0]
				wallX2 = x[1]
				wallY1 = y[0]
				wallY2 = y[1]
			}
			z = ((x[i] - wallX1)*(wallX2 - wallX1) + (y[i] - wallY1)*(wallY2 - wallY1)) / Math.hypot(wallX2-wallX1,wallY2-wallY1)
			intX = wallX1 + z*(wallX2 - wallX1)
			intY = wallY1 + z*(wallY2 - wallY1)
			distances[i] = Math.hypot(x[i]-intX, y[i]-intY)
			//console.log(x[i],intX, y[i],intY)
		}
		minDistance = Math.min(distances[0],distances[1],distances[2],distances[3]);
		console.log(minDistance)
		if (minDistance < self.rad) { //If the wall is touched
			var wallAng = Math.atan2(y[3] - y[2], x[3] - x[2]);
			var playerAng = Math.atan2(y[1]-y[0], x[1]-x[0]); //find the angle you're moving in, and the mag
			var angDiff = Math.abs(playerAng - wallAng); //take theta
			var bumpOut = depolarize(1/Math.sin(angDiff)*self.rad,-playerAng); //plus extra to push you out of the wall
			var maybePos = [0,0];
			maybePos[0] = intX; 
			maybePos[1] = intY;
			//console.log(self.newPos,bumpOut)
			maybePos[0] += bumpOut[0];
			maybePos[1] += bumpOut[1];
			if (Math.hypot(maybePos[0] - x[0], maybePos[1] - y[0]) >= Math.hypot(self.newPos[0] - x[0], self.newPos[1] - y[0])){
				self.newPos = maybePos
				self.vel[0] += Math.hypot(self.vel[0],self.vel[1])*Math.cos(angDiff)
				self.vel[1] += Math.hypot(self.vel[0],self.vel[1])*Math.sin(angDiff)
				self.touching.pop();	
				self.touching.push(wall);
			}
		}
	}
	return self;
}

//////////
//Player//
//////////

var Player = function(id){
	var self = Entity();
	self.id = id;
	self.number = "" + Math.floor(10 * Math.random());
	/*
	self.keys = 
	[false, // LClick
	false, // RClick
	false, // Up
	false, // Left
	false, // Down
	false, // Right
	false, // Jump
	false]; // Grapple
	*/
	self.keys = [];
	for (var i = 0; i < 12; i ++) {
	  self.keys.push(false);
	}
	self.mouseCoords = [0,0];
	self.spdLim = 6;
	self.rad = 10;
	self.mouseDirection = 0;
	self.jumpheight = 5;
	self.grapplex = 0;
	self.grappley = 0;
	self.grappleDir = 0;
	self.grappleLenMax = 500;
	self.grappleLen = 0;
	self.grappleState = 0; //0 means off, 1 means mid-air, 2 means attached
	self.camAngle = 0;
	self.moveSpd = 1;
	self.grapplePoints = [];
	self.posHist = [[0,0],[0,0]]; //position history [last frame],[this frame]
	//                 [E    ,SHIFT];
	self.abilityList = [null , null,  null,  null];
	self.abilityKeys = [false, false, false, false];
	self.abilityMaxCooldown = [100,100,100,100];
	self.abilityDuration = [1,1,50,50];
	self.abilityCurrCooldown = [0,0,0,0];

	self.abilityList[0] = new Ability(0,self,"directional boost")
	self.abilityList[1] = new Ability(1,self,"negative directional boost")
	self.abilityList[2] = new Ability(2,self,"fly")
	self.abilityList[3] = new Ability(3,self,"stationary")

	var super_update = self.update;

	self.update = function(){
		//console.log(self.pos);
		self.updateCooldowns();
		super_update();
		self.updateSpd();
		self.updateGrapple();
		self.updateAbilities();
		self.updatecamAngle();

		self.posHist.shift();
		self.posHist.push([self.pos[0], self.pos[1]]);
	}

	self.updateCooldowns = function(){
		//console.log(self.abilityList[0],self.abilityKeys[0])
		for (var i = 0; i < 4; i ++) {
			if (self.abilityCurrCooldown[i] < self.abilityMaxCooldown[i]){self.abilityKeys[i] = false;}
			if (self.abilityCurrCooldown[i] > 0){self.abilityCurrCooldown[i] -=1;}
		}
		for (var i = 0; i < 4; i ++) {
			if (self.keys[8+i] && self.abilityCurrCooldown[i] == 0){
				self.abilityCurrCooldown[i] = self.abilityMaxCooldown[i] + self.abilityDuration[i];
				self.abilityKeys[i] = true;
			}
		}
	}

	self.determineSpd = function(velocity,direction,spdLim){
        var temp = direction*spdLim; // spdLim is speed limit
        var speed = 0.5*direction*Math.min(Math.abs(temp-velocity),Math.abs(temp)); // function that decreases speed as it nears the limit
        // changing 1 to some other value will change how fast acceleration is.
        return speed;
    }
    
    self.updateSpd = function(){
    	self.mouseDirection = polarize(self.mouseCoords[0], self.mouseCoords[1])[1];
    	var tVel = polarize (self.vel[0], self.vel[1]); //total velocity
    	var ms = self.determineSpd(tVel[0], self.moveSpd, self.spdLim); //determine speed

    	if(self.keys[5]){
    		if (self.touching.length >= 1){
    			var rMov = []; //di force towards right
    			rMov = depolarize(ms, (self.camAngle + Math.PI*2)%(2*Math.PI)); //+ math.PI = +180 degrees
    			self.vel[0] += rMov[0];
    			self.vel[1] += rMov[1];
    		}
    	}

    	if(self.keys[3]){
    		if (self.touching.length >= 1){	
    			var lMov = [];
    			lMov = depolarize(ms, (self.camAngle + Math.PI)%(2*Math.PI)); 
    			self.vel[0] += lMov[0];
    			self.vel[1] += lMov[1];
    		}
    	}

    	if(self.keys[4]){ //note!!! maybe remove vertical DI in future????
    		if (self.touching.length >= 1){
    			var dMov = []; 
    			dMov = depolarize(ms, (self.camAngle + Math.PI/2)%(2*Math.PI)); //takes camera angle and adds 1/2 pi (90 degrees), modulo for sanitation
    			self.vel[0] += dMov[0];
    			self.vel[1] += dMov[1];
    		}
    	}

    	if(self.keys[2]){
    		if (self.touching.length >= 1){
    			var uMov = []; 
    			uMov = depolarize(ms, (self.camAngle + Math.PI*3/2)%(2*Math.PI));
    			self.vel[0] += uMov[0];
    			self.vel[1] += uMov[1];
    		}
    	}

    	if(self.keys[6]){
        	if (self.touching.length >= 1){ // if player is touching a wall
        		for (var i in self.touching){
        			var wall = self.touching[i];
        			var wallAng = Math.atan2(wall.y2 - wall.y1,wall.x2 - wall.x1); //find out wall's angle
        			var jump = [];
        			jump = depolarize(self.jumpheight / self.touching.length, wallAng - Math.PI/2); //jump according to normal
        			self.vel[0] += jump[0];
        			self.vel[1] += jump[1];
        		}
        	}
        }
    }

    self.updateAbilities = function(){
		for(var i in self.abilityKeys){
			if (self.abilityKeys[i] == true){
				if (self.abilityList[i] != null){
					Ability.cast(self.abilityList[i]);
				}
			}
		}
	}

    self.updateGrapple = function(){
 
		var grappleDist = polarize(self.grapplex-self.pos[0], self.grappley - self.pos[1]);
		if(self.grappleState == 0){ //grapple is off
			self.grapplex = self.pos[0];
			self.grappley = self.pos[1];
			self.grapplePoints = [];
			self.grappleLenMax = 500;
			if(self.keys[7]){ // if player is pressing grapple button
				self.grappleLen = self.grappleLenMax;
				self.grappleDir = self.mouseDirection;
				//self.grappleDir = polarize(self.mouseCoords[0], self.mouseCoords[1])[1];
				self.grappleState = 1;
				self.grapplePoints = [];
			}
		}
		if(self.grappleState == 1){ //grapple is midair
			var grapSpd = 20
			self.grapplex += grapSpd*Math.cos(self.grappleDir);
			self.grappley += grapSpd*Math.sin(self.grappleDir);
			if(grappleDist[0] > self.grappleLenMax){ //
				self.grappleState = 0
			}
			for(var i in Wall.list){
				var wall = Wall.list[i]; //loop through all walls
				if (Math.sqrt(Math.pow(wall.midx - self.grapplex, 2) + 
				Math.pow(wall.midy - self.grappley, 2))<= self.render){ //first stage detection (tests wall's midpoint for render distance)
					if(wall.x1 == wall.x2){ //vertical wall
						if (Math.min(wall.y1, wall.y2)-5 < self.grappley &&
						Math.max(wall.y1, wall.y2)+5 > self.grappley && 
						Math.sign(self.grapplex - wall.x1) != Math.sign((self.grapplex + grapSpd*Math.cos(self.grappleDir)) - wall.x1)){
							self.grapplex = wall.x1;
							self.grapplePoints.push([self.grapplex,self.grappley]);
							self.grappleState = 2;
							self.grapplex = wall.x1;
							self.grappleLen = polarize(self.grapplex - self.pos[0], self.grappley - self.pos[1])[0];
						}
					}
					else if(wall.y1 == wall.y2){ //horizontal wall
						if (Math.sign(self.grappley - wall.y1) != Math.sign((self.grappley + grapSpd*Math.sin(self.grappleDir)) - wall.y1) &&
						Math.min(wall.x1, wall.x2)-5 < self.grapplex &&
						Math.max(wall.x1, wall.x2)+5 > self.grapplex){
							self.grappley = wall.y1;
							self.grapplePoints.push([self.grapplex,self.grappley]);
							self.grappleState = 2;
							self.grappley = wall.y1;
							self.grappleLen = polarize(self.grapplex - self.pos[0], self.grappley - self.pos[1])[0];
						}
					}
					else {
						var newX = self.grapplex + grapSpd*Math.cos(self.grappleDir);
						var newY = self.grappley + grapSpd*Math.sin(self.grappleDir);
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
							self.grapplePoints.push([px,py]);
							self.grappleState = 2;
							self.grappleLen = polarize(self.grapplex - self.pos[0], self.grappley - self.pos[1])[0]; 
							self.grapplex = px;
							self.grappley = py;
							
							
						}
					}
				}	
			}
		}

		if(self.grappleState == 2){ // if the grapple is attached to a wall
			var ang = Math.atan2(self.grappley - self.pos[1], self.grapplex - self.pos[0]);
			var pVec = polarize(self.vel[0], self.vel[1]);
			var angDiff = Math.abs(pVec[1] - ang);
			var normalForce = pVec[0]*Math.cos(angDiff) ; //mg cosTheta
			if(grappleDist[0] > self.grappleLen){
				if(angDiff > Math.PI/2){// doesn't create a boundary if moving towards center
					var bumpSpd = depolarize(-1*normalForce, ang); //counteract the normal force	
					self.vel[0] += bumpSpd[0];
					self.vel[1] += bumpSpd[1];
				}		
			}
			
			if(self.grappleLen > self.grappleLenMax){
				self.grappleLen = self.grappleLenMax;
			}

			var a = self.posHist[0]; //last frame position
			var b = self.posHist[1]; //current position
			var o = [self.grapplex,self.grappley]//the current wrap point
			var unwrapTF = false;

			if (self.grapplePoints.length > 1){
				o = self.grapplePoints.slice(-1)[0]; 
				var q = self.grapplePoints.slice(-2)[0];
				var vQO = [o[0]-q[0],o[1]-q[1]];
				var vOA = [a[0]-o[0],a[1]-o[1]];
				var vOB = [b[0]-o[0],b[1]-o[1]];
				while (Math.sign(vQO[0]*vOA[1]-vQO[1]*vOA[0]) != Math.sign(vQO[0]*vOB[1]-vQO[1]*vOB[0])){
					self.grappleLen += o[2];
					self.grappleLenMax += o[2];
					self.grapplePoints.pop();
					o = self.grapplePoints.slice(-1)[0]; 
					q = self.grapplePoints.slice(-2)[0];
					vQO = [o[0]-q[0],o[1]-q[1]];
					vOA = [a[0]-o[0],a[1]-o[1]];
					vOB = [b[0]-o[0],b[1]-o[1]];
					unwrapTF = true;
				}
			}

			if(!unwrapTF){
				for(var i in cornerList){
					var p = cornerList[i];
					var a1 = Math.abs(a[0]*(b[1]-o[1]) + b[0]*(o[1]-a[1]) + o[0]*(a[1]-b[1]))
					var a2 = Math.abs(p[0]*(b[1]-o[1]) + b[0]*(o[1]-p[1]) + o[0]*(p[1]-b[1]))
					var a3 = Math.abs(a[0]*(p[1]-o[1]) + p[0]*(o[1]-a[1]) + o[0]*(a[1]-p[1]))
					var a4 = Math.abs(a[0]*(b[1]-p[1]) + b[0]*(p[1]-a[1]) + p[0]*(a[1]-b[1]))
					if ((a2 + a3 + a4).toFixed(2) == a1.toFixed(2)){//uses variables above to check if you swallAng past a corner
						//records length of the wrapped-around segment
						if(p[0] != o[0] || p[1] != o[1]){ //if p is not the current point
							p[2] = polarize(p[0]-o[0],p[1]-o[1])[0];
							self.grapplePoints.push(p);
							self.grapplex = p[0];
							self.grappley = p[1];
							self.grappleLenMax -= p[2];
							self.grappleLen -= p[2];
						}
					}
				}
			}		
			else{
				self.grapplex = o[0];
				self.grappley = o[1];
			}

			if (self.keys[5]){
				var rMov = []; //di force towards right
				rMov = depolarize(0.1, (self.camAngle + Math.PI*2)%(2*Math.PI)); //+ math.PI = +180 degrees
				self.vel[0] += rMov[0];
				self.vel[1] += rMov[1];
			}
			if (self.keys[3]){
				var rMov = []; //di force towards right
				rMov = depolarize(0.1, (self.camAngle + Math.PI)%(2*Math.PI)); //+ math.PI = +180 degrees
				self.vel[0] += rMov[0];
				self.vel[1] += rMov[1];
			}
			if(self.keys[2] && self.grappleLen>5){
				self.grappleLen -= 4;
			}
			if(self.keys[4] && self.grappleLen<self.grappleLenMax){
				self.grappleLen += 4 - normalForce;
			}

		}
		if(self.grappleState != 0){ //grapple is not off
			if(self.keys[6]){ // press space to bring it back
				self.grappleState = 0;
			}
		}	
	}

    self.updatecamAngle = function(){
    	var Pangle = Math.atan2(0 - self.pos[1], 0 - self.pos[0]);
    	self.camAngle = (Pangle - (Math.PI * 3 / 2)) % (2*Math.PI);
    }

    Player.list[id] = self;
    return self;
}

Player.list = {};

var Ability = function(id, caster, kind){
	var self = {
		kind: kind,
		id: id,
		caster: caster,
	}
	self.move = function(direction, strength){
		self.caster.vel[1] += strength * Math.cos(direction);
		self.caster.vel[0] += strength * Math.sin(direction);
	}
	self.stop = function(){
		self.caster.vel[1] = 0;
		self.caster.vel[0] = 0;
	}
	return self;
}

Ability.cast = function(ability) {
	if (ability.kind == "directional boost"){
		strength = 5;
		ability.move(ability.caster.mouseDirection,strength);
	}
	else if (ability.kind == "negative directional boost"){
		strength = -5;
		ability.move(ability.caster.mouseDirection,strength);
	} else if (ability.kind == "fly"){
		strength = 0.25;
		ability.move(ability.caster.mouseDirection,strength);
	} else if (ability.kind == "negative fly"){
		strength = -0.25;
		ability.move(ability.caster.mouseDirection,strength);
	}else if (ability.kind == "stationary"){
		strength = 0;
		ability.stop();
	}
}

Player.onConnect = function(socket){
	
	var player = Player(socket.id);

	socket.on('keyPress',function(data){
		if(data.inputId === 'mouseCoords')
			player.mouseCoords = data.state;
		if(data.inputId === 'keys')
			player.keys = data.state;
	});
}

Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
}

Player.hookupdate = function(){
	var pack = [];

	for(var i in Player.list){
		var player = Player.list[i];
		if(player.grappleState > 0){
			pack.push({ 
				x1:player.pos[0],
				y1:player.pos[1],
				x2:player.grapplex,
				y2:player.grappley,
			});
		}
	}
	return pack;
}

Player.update = function(){ // packs player info every update
	var pack = [];

	for(var i in Player.list){

		var player = Player.list[i];
		player.update();
		pack.push({
			x:player.pos[0],
			y:player.pos[1],
			number:player.number,
			pId:player.id,
			spdX:player.vel[0],
			spdY:player.vel[1],
			rot:player.camAngle
		});
	}
	return pack;
}

///////////
//Terrain//
///////////

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

/////////
//Walls//
/////////

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

////////////////
//GENERATE MAP//
////////////////

var mirrorNo = 16; //times to mirror map rotationally
var cornerList = [];

var mapRead = function(){ //reads map and makes walls according to it
	fs.readFile(__dirname + '/map.txt', 'utf8', function(err, data){ //reads the content of map.txt and returns it as a string
		if (err){
			return console.log(err);
		}
		var map = data.split("\n"); //split lines into separate strings
		for(i in map){
			var wCoords = map[i].split(" "); //split strings into separate coords
			for(p = 0; p < mirrorNo; p++){ // loop through all lines
				var p1 = rotato(wCoords[0], wCoords[1], p * 2 * Math.PI / mirrorNo);
				var p2 = rotato(wCoords[2], wCoords[3], p * 2 * Math.PI / mirrorNo);
				var rCoords = [p1[0],p1[1],p2[0],p2[1]];
				var copy1 = false;
				var copy2 = false;
				for(q in cornerList){
					if(p1.toString() == cornerList[q].toString()){
						copy1 = true
					}

					if(p2.toString() == cornerList[q].toString()){
						copy2 = true
					}
				}
				if(copy1 == false){
					cornerList.push(p1);
				}
				if(copy2 == false){
					cornerList.push(p2);
				}
				var wInit = new Wall(rCoords, i*mirrorNo+p); //makes new wall
			}
		}
	})

}

mapRead();

/////////////////////////
//SERVER STUFF AND LOOP//
/////////////////////////

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
		wall:Wall.update(),
		hook:Player.hookupdate(),
	}
	for(var i in SOCKET_LIST){ //Loop through all players
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions',pack,i); 
	}

},1000/120);