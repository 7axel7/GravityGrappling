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
		fric:7, //how much friction affects movement
		spdX:0,
		spdY:0,
		grav:-1/10, //Personal gravity stat
		render:800, // Render Distance
		rad:0, //hitbox radius
		touching: [], //list of everything it's touching
		newPos: [0,0],
		id:""
	}
	self.update = function(){
		
		self.updatePosition();
	}

	self.applyGravity = function(){
		var Grangle = Math.atan2(0 - self.pos[1], 0 - self.pos[0]); //find angle towards 0,0
		var gravVector = depolarize(self.grav, Grangle);
		self.spdX += gravVector[0];
		self.spdY += gravVector[1];
		//console.log(gravVector,self.spdX, self.spdY);
	} //apply gravity to player's velocity

	self.applyCollision = function(){
		//console.log(self.pos[0],self.pos[1])
		self.touching = [];
		for(var i in Wall.list){
			var wall = Wall.list[i]; //loop through all walls
			self.collideSnap(wall);
			
		}
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

	self.collideSnap = function(wall){ // boundary is [x1,y1,x2,y2]
		if (Math.sqrt(Math.pow(wall.midx - self.pos[0], 2) + 
			Math.pow(wall.midy - self.pos[1], 2))<= self.render){ //first stage detection (tests wall's midpoint for render distance)
				if (Math.min(wall.x1, wall.x2) - self.rad < self.pos[0] &&
				Math.max(wall.x1, wall.x2) + self.rad > self.pos[0] &&
				Math.min(wall.y1, wall.y2) - self.rad < self.pos[1] &&
				Math.max(wall.y1, wall.y2) + self.rad > self.pos[1]){ //second stage detection (minimum bounding box + player's radius)
					
					//////////////////////////////////////////////////////////////
					////Check min. distance from line segment to line segment.////
					//////////////////////////////////////////////////////////////

						//check if it intersects

					var x1 = self.pos[0];
					var y1 = self.pos[1];
					var x2 = self.newPos[0];
					var y2 = self.newPos[1];
					var x3 = wall.x1;
					var y3 = wall.y1;
					var x4 = wall.x2;
					var y4 = wall.y2;
					var a = ((y3-y4)*(x1-x3) + (x4-x3)*(y1-y3))/((x4-x3)*(y1-y2)-(x1-x2)*(y4-y3)); //intersection point scalar 1
					var b = ((y1-y2)*(x1-x3) + (x2-x1)*(y1-y3))/((x4-x3)*(y1-y2)-(x1-x2)*(y4-y3)); //intersection point scalar 2
					if (0<=a<=1 && 0<=b<=1){
						
					}

					if linesegs do not intersect:
						if point a intersects at least one of [lineseg2.perp]: 
							D1 = distance from point a to line 2
						else:
							D1 = min(distance from point a to points c and d)
						
						if point b intersects lineseg2.perp: 
							D2 = distance from point b to line 2
						else:
							D2 = min(distance from point b to points c and d)

						if point c intersects lineseg1.perp: 
							D3 = distance from point c to line 2
						else:
							D3 = min(distance from point c to points a and b)

						if point d intersects lineseg1.perp: 
							D4 = distance from point d to line 2
						else:
							D4 = min(distance from point d to points a and b)

						Mindistanceee = Min(D1,D2,D3,D4);
					
					else:
						mindistanceeee = 0

					if mindisatnceeee < self.rad {
						if intersects the circle:
							return intersect with circle
						if intersects with the rectancle:
							return intersect with rectancle
					}


					/*var x1 = self.pos[0];
					var y1 = self.pos[1];
					var x2 = self.newPos[0];
					var y2 = self.newPos[1];
					var x3 = wall.x1;
					var y3 = wall.y1;
					var x4 = wall.x2;
					var y4 = wall.y2;
					var a = ((y3-y4)*(x1-x3) + (x4-x3)*(y1-y3))/((x4-x3)*(y1-y2)-(x1-x2)*(y4-y3)); //intersection point scalar 1
					var b = ((y1-y2)*(x1-x3) + (x2-x1)*(y1-y3))/((x4-x3)*(y1-y2)-(x1-x2)*(y4-y3)); //intersection point scalar 2
					if (0<=a<=1 && 0<=b<=1){
						var wAng = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
						var pAng = Math.atan2(self.spdY, self.spdX); //find the angle you're moving in, and the mag
						var angDiff = Math.abs(pAng - wAng); //take theta

						var bumpOut = depolarize(1/Math.sin(angDiff)*self.rad,-pAng); //plus extra to push you out of the wall
						
						self.newPos[0] = x1 + a*(x2-x1);
						self.newPos[1] = y1 + a*(x2-x1);
						self.newPos[0] += bumpOut[0];
						self.newPos[1] += bumpOut[1];
						self.touching.pop();	
						self.touching.push(wall);

					}*/
				}
			}
		//Test if that position is closer than new position
		DISTANCE FORUMULAA??
	}
	self.updatePosition = function(){
		self.pos[0] = self.newPos[0];
		self.pos[1] = self.newPos[1];
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
	self.mDirection = 0;
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
		//console.log(self.keys);
		self.updateCooldowns();
		super_update();
		self.applyFriction();
		self.applyGravity();
		self.updateSpd();
		self.collideSnap();
		self.updateGrapple();
		self.applyCollision();
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
    	self.mDirection = polarize(self.mouseCoords[0], self.mouseCoords[1])[1];
    	var tVel = polarize (self.spdX, self.spdY); //total velocity
    	var ms = self.determineSpd(tVel[0], self.moveSpd, self.spdLim); //determine speed

    	if(self.keys[5]){
    		if (self.touching.length >= 1){
    			var rMov = []; //di force towards right
    			rMov = depolarize(ms, (self.camAngle + Math.PI*2)%(2*Math.PI)); //+ math.PI = +180 degrees
    			self.spdX += rMov[0];
    			self.spdY += rMov[1];
    		}
    	}

    	if(self.keys[3]){
    		if (self.touching.length >= 1){	
    			var lMov = [];
    			lMov = depolarize(ms, (self.camAngle + Math.PI)%(2*Math.PI)); 
    			self.spdX += lMov[0];
    			self.spdY += lMov[1];
    		}
    	}

    	if(self.keys[4]){ //note!!! maybe remove vertical DI in future????
    		if (self.touching.length >= 1){
    			var dMov = []; 
    			dMov = depolarize(ms, (self.camAngle + Math.PI/2)%(2*Math.PI)); //takes camera angle and adds 1/2 pi (90 degrees), modulo for sanitation
    			self.spdX += dMov[0];
    			self.spdY += dMov[1];
    		}
    	}

    	if(self.keys[2]){
    		if (self.touching.length >= 1){
    			var uMov = []; 
    			uMov = depolarize(ms, (self.camAngle + Math.PI*3/2)%(2*Math.PI));
    			self.spdX += uMov[0];
    			self.spdY += uMov[1];
    		}
    	}

    	if(self.keys[6]){
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
				self.grappleDir = self.mDirection;
				//self.grappleDir = polarize(self.mouseCoords[0], self.mouseCoords[1])[1];
				self.grappleState = 1;
				self.grapplePoints = [];
			}
		}
		if(self.grappleState == 1){ //grapple is midair
			self.grapplex += 15*Math.cos(self.grappleDir);
			self.grappley += 15*Math.sin(self.grappleDir);
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
						Math.min(wall.x1, wall.x2)-5 < self.grapplex &&
						Math.max(wall.x1, wall.x2)+5 > self.grapplex){
							self.grapplePoints.push([self.grapplex,self.grappley]);
							self.grappleState = 2;
							self.grapplex = wall.x1;
							self.grappleLen = polarize(self.grapplex - self.pos[0], self.grappley - self.pos[1])[0];
						}
					}
					else if(wall.y1 == wall.y2){ //horizontal wall
						if (Math.min(wall.y1, wall.y2)-5 < self.grappley &&
						Math.max(wall.y1, wall.y2)+5 > self.grappley &&
						Math.min(wall.x1, wall.x2)-5 < self.grapplex &&
						Math.max(wall.x1, wall.x2)+5 > self.grapplex){
							self.grapplePoints.push([self.grapplex,self.grappley]);
							self.grappleState = 2;
							self.grappley = wall.y1;
							self.grappleLen = polarize(self.grapplex - self.pos[0], self.grappley - self.pos[1])[0];
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
			var pVec = polarize(self.spdX, self.spdY);
			var angDiff = Math.abs(pVec[1] - ang);
			var normalForce = pVec[0]*Math.cos(angDiff) ; //mg cosTheta
			if(grappleDist[0] > self.grappleLen){
				if(angDiff > Math.PI/2){// doesn't create a boundary if moving towards center
					var bumpSpd = depolarize(-1*normalForce, ang); //counteract the normal force	
					self.spdX += bumpSpd[0];
					self.spdY += bumpSpd[1];
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
					if ((a2 + a3 + a4).toFixed(2) == a1.toFixed(2)){//uses variables above to check if you swang past a corner
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
				self.spdX += rMov[0];
				self.spdY += rMov[1];
			}
			if (self.keys[3]){
				var rMov = []; //di force towards right
				rMov = depolarize(0.1, (self.camAngle + Math.PI)%(2*Math.PI)); //+ math.PI = +180 degrees
				self.spdX += rMov[0];
				self.spdY += rMov[1];
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
		self.caster.spdX += strength * Math.cos(direction);
		self.caster.spdY += strength * Math.sin(direction);
	}
	self.stop = function(){
		self.caster.spdX = 0;
		self.caster.spdY = 0;
	}
	return self;
}

Ability.cast = function(ability) {
	if (ability.kind == "directional boost"){
		strength = 5;
		ability.move(ability.caster.mDirection,strength);
	}
	else if (ability.kind == "negative directional boost"){
		strength = -5;
		ability.move(ability.caster.mDirection,strength);
	} else if (ability.kind == "fly"){
		strength = 0.25;
		ability.move(ability.caster.mDirection,strength);
	} else if (ability.kind == "negative fly"){
		strength = -0.25;
		ability.move(ability.caster.mDirection,strength);
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
				x1:player.x,
				y1:player.y,
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