/**
 * torus.js
 * 
 */ 

export { init, draw };

import { vec3, normalize, flatten } from './MV.js';

const points = [];
const normals = [];
const faces = [];
const edges = [];

let points_buffer;
let normals_buffer;
let faces_buffer;
let edges_buffer;

var torus_PPD=30;
var torus_DISKS=30;
var torus_DISK_RADIUS = 0.2;
var torus_RADIUS = 0.5;

function init(gl, ppd=torus_PPD, nd=torus_DISKS, big_r = torus_RADIUS, small_r = torus_DISK_RADIUS) {
    _build(ppd, nd, big_r, small_r);
    _uploadData(gl);
}

function _getIndex(ppd, nd, d, p){
    const diskOffset = d%nd*ppd;
    return diskOffset+(p%ppd);
}

// Generate points using polar coordinates
function _build(ppd, nd, big_r, small_r) 
{ 
    var diskStep = 2*Math.PI/nd;
    var pointStep = 2*Math.PI/ppd;
    
    // Generate points
    for(let phi=0; phi<2*Math.PI; phi+=diskStep) {
        for(let theta=0; theta<2*Math.PI; theta+=pointStep) {
            // "em pé"
            /*var pt = vec3(
                (big_r+small_r*Math.cos(theta))*Math.cos(phi),
                (big_r+small_r*Math.cos(theta))*Math.sin(phi),
                small_r*Math.sin(theta)
            );*/
            // "deitado"
            var pt = vec3(
                (big_r+small_r*Math.cos(theta))*Math.cos(phi),
                small_r*Math.sin(theta),
                (big_r+small_r*Math.cos(theta))*Math.sin(phi)
            );
            points.push(pt);
            // normal - "deitado"
            var normal = vec3(
                (small_r*Math.cos(theta))*Math.cos(phi),
                small_r*Math.sin(theta),
                (small_r*Math.cos(theta))*Math.sin(phi)
            ); 
            normals.push(normalize(normal));
        }
    }
    
    //Edges
    for(let d=0; d<nd; d++){
        for(let p=0; p<ppd; p++){
            //Edge from point to next point in disk
            edges.push(_getIndex(ppd, nd, d,p));
            edges.push(_getIndex(ppd, nd, d,p+1));
            
            //Edge from point to same point in next disk
            edges.push(_getIndex(ppd, nd, d,p));
            edges.push(_getIndex(ppd, nd, d+1,p));  

        }
    }
    
    //Faces
    for(let d=0; d<nd; d++){
        const diskOffset = d*ppd;
        for(let p=0; p<ppd; p++){
            faces.push(_getIndex(ppd, nd, d,p));
            faces.push(_getIndex(ppd, nd, d,p+1));
            faces.push(_getIndex(ppd, nd, d+1,p)); 
            
            faces.push(_getIndex(ppd, nd, d+1,p));
            faces.push(_getIndex(ppd, nd, d,p+1));
            faces.push(_getIndex(ppd, nd, d+1,p+1)); 
        }
    }
    
}

function _uploadData(gl)
{
    points_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, points_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    
    normals_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normals_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    
    faces_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faces_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
    
    edges_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edges_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(edges), gl.STATIC_DRAW);
}

function draw(gl, program, primitive)
{
    gl.useProgram(program);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, points_buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, normals_buffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primitive == gl.LINES ? edges_buffer : faces_buffer);
    gl.drawElements(primitive, primitive == gl.LINES ? edges.length : faces.length, gl.UNSIGNED_SHORT, 0);
}