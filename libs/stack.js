import { mat4, mult, translate, scalem, rotateX, rotateY, rotateZ } from "./MV.js";
export {modelView, loadIdentity, loadMatrix, pushMatrix, popMatrix, multMatrix, multTranslation, multScale, multRotationX, multRotationY, multRotationZ};


/**
 * This mimics the stack implementations of OpenGL. 
 * The model-view matrix is the matrix on the top of the stack
 */
const stack = [ mat4() ];

// Replaces the current modelView (at the top of the stack) with an identity matrix
function loadIdentity()
{
    stack[stack.length-1] = mat4();
}

// Replaces the current modelView (at the top of the stack) with a given matrix
function loadMatrix(m)
{
    stack[stack.length-1] = mat4(m[0], m[1], m[2], m[3]);
}

// The modelView matrix is the matrix on the top of the stack.
// This function returns a copy of it.
function modelView()
{
    let m = stack[stack.length-1];
    return mat4(m[0], m[1], m[2], m[3]);
}

// Stack related operations

// Push a copy of the current model view matrix
function pushMatrix() {
    const mv = stack[stack.length-1];
    var m = mat4(mv[0], mv[1], mv[2], mv[3]);
    stack.push(m);
}

// Removes the matrix at the top of the stack
function popMatrix() {
    stack.pop();
}

// Append transformations to modelView
function multMatrix(m) {
    stack[stack.length-1] = mult(stack[stack.length-1], m);
}

// Append a translation to the modelView
function multTranslation(t) {
    stack[stack.length-1] = mult(stack[stack.length-1], translate(t));
}

// Append a scale to the modelView
function multScale(s) { 
    stack[stack.length-1] = mult(stack[stack.length-1], scalem(s)); 
}

// Appens a rotation around X to the modelView
function multRotationX(angle) {
    stack[stack.length-1] = mult(stack[stack.length-1], rotateX(angle));
}

// Appens a rotation around Y to the modelView
function multRotationY(angle) {
    stack[stack.length-1] = mult(stack[stack.length-1], rotateY(angle));
}

// Appens a rotation around Z to the modelView
function multRotationZ(angle) {
    stack[stack.length-1] = mult(stack[stack.length-1], rotateZ(angle));
}