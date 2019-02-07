var rotato = function(x, y, thetaa){
  var r = [
    [Math.cos(thetaa), Math.sin(thetaa)],
    [-Math.sin(thetaa), Math.cos(thetaa)]
  ]
  var rX = r[0][0] * x + r[0][1] * y;
  var rY = r[1][0] * x + r[1][1] * y;
  return [rX, rY];
  //console.log(r[0][0], r[0][1], r[1][0], r[1][1]);
}
var keyList = [
  [-1], //LClick
  [-1], //RClick
  [87], //W
  [65], //A
  [83], //S
  [68], //D
  [32], //SPACE
  [69],  //E
  [16],
  [49],
  [50],
  [51]
];
var keys = [];

for (var i = 0; i < keyList.length; i ++) {
  keys.push(false);
}


var isTyping = false;

var updateKeys = false;
keyUpdate = function(){
    if (updateKeys){
        socket.emit('keyPress',{inputId:'keys',state:keys});
    }
        updateKeys = false;

}

document.onkeydown = function(event){ //Key Down Detector
    if (isTyping == false){
        keyHandler(event.keyCode,true)
    } else {

    }
}

document.onkeyup = function(event){ //Key Down Detector
    if (isTyping == false){
        keyHandler(event.keyCode,false)
    }
}

keyHandler = function(code, type){
    updateKeys = true;
    for (var i = 0; i < keyList.length; i ++) {
        for (var j = 0; j < keyList[i].length; j ++) {
            if (code === keyList[i][j]) {
                keys[i] = type;
            }
        }
    }
}

document.onmousedown = function(event){ //Mouse Down Detector
    keys[0] = true;
}
document.onmouseup = function(event){ //Mouse Down Detector
    keys[0] = false;
}

document.onmousemove = function(event){ //Mouse Move Detector
    var mouseCoords = rotato(event.clientX - scrC[0], event.clientY - scrC[1], 2 * Math.PI - theta);
    //console.log(mouseCoords);
    socket.emit('keyPress',{inputId:'mouseCoords',state:mouseCoords});
}
