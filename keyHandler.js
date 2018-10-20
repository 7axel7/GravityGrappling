var keyList = [
  [1, 2],
  [3, 4],
  [5, 6]
];

document.onkeydown = function(event){ //Key Down Detector
    if(event.keyCode === 68)      //d
        socket.emit('keyPress',{inputId:'right',state:true});
    else if(event.keyCode === 83) //s
        socket.emit('keyPress',{inputId:'down',state:true});
    else if(event.keyCode === 65) //a
        socket.emit('keyPress',{inputId:'left',state:true});
    else if(event.keyCode === 87) //w
        socket.emit('keyPress',{inputId:'up',state:true});
    else if(event.keyCode === 32) //space
        socket.emit('keyPress',{inputId:'space',state:true});
    else if(event.keyCode === 69) //e
        socket.emit('keyPress',{inputId:'grapple',state:true});

}

document.onkeyup = function(event){ // Key Up Detector
    if(event.keyCode === 68)      //d
        socket.emit('keyPress',{inputId:'right',state:false});
    else if(event.keyCode === 83) //s
        socket.emit('keyPress',{inputId:'down',state:false});
    else if(event.keyCode === 65) //a
        socket.emit('keyPress',{inputId:'left',state:false});
    else if(event.keyCode === 87) //w
        socket.emit('keyPress',{inputId:'up',state:false});
    else if(event.keyCode === 32) //space
        socket.emit('keyPress',{inputId:'space',state:false});
    else if(event.keyCode === 69) //e
        socket.emit('keyPress',{inputId:'grapple',state:false});
}



document.onmousedown = function(event){ //Mouse Down Detector
	socket.emit('keyPress',{inputId:'lClick',state:true});
}

document.onmouseup = function(event){ //Mouse Down Detector
	socket.emit('keyPress',{inputId:'lClick',state:false});
}

document.onmousemove = function(event){ //Mouse Move Detector
    var mouseCoords = rotato(event.clientX - scrC[0], event.clientY - scrC[1], 2 * Math.PI - theta);
    //console.log(mouseCoords);
    socket.emit('keyPress',{inputId:'mouseCoords',state:mouseCoords});

}