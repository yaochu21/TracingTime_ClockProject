import * as THREE from 'three';
import { Layers } from 'three';
import { Vector3 } from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';
//import {NodeArray,Clock} from 'classes.js';

//#region scene setup
const bgColor = new THREE.Color(0xfefefe);
const my_scene = new THREE.Scene();
my_scene.background = bgColor;

const width = 500;
const height = 250;
const near = 1;
const far = 100;
const camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, near, far );
camera.position.z = 10;
my_scene.add( camera );

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
//#endregion

//#region materials

const color_jade = 0x00c480
const color_black = 0x0
const color_grey = 0x8a8a8a
const color_light_grey = 0xb8b8b8
const color_blue = 0x009fe3
const color_red = 0xd00000

const material_black = new THREE.MeshBasicMaterial({
    color: color_black
});

const material_jade = new THREE.MeshBasicMaterial({
    color: color_jade
})

const material_grey = new THREE.MeshBasicMaterial({
    color: color_grey
})

const material_light_grey = new THREE.MeshBasicMaterial({
    color: color_light_grey
})

const material_bg = new THREE.MeshBasicMaterial({
    color: bgColor,
})



const material_line_black = new THREE.LineBasicMaterial( { color: color_black, linewidth: 0.5 } );

const material_line_blue = new THREE.LineBasicMaterial( { color: color_blue, linewidth: 0.5 } );

const material_line_red = new THREE.LineBasicMaterial( { color: color_red, linewidth: 0.5 } );

const material_line_jade = new THREE.LineBasicMaterial( { color: color_jade, linewidth: 0.5 } );


//#endregion

//#region classes
function clockShape(x,y,radius,thickness=0.5,outline_material=material_black,face_material=material_bg) {
    const circleIn = new THREE.Shape();
    const circleOut = new THREE.Shape();
    circleIn.absarc(0, 0, radius);
    circleOut.absarc(0, 0, radius+thickness);
    const segments = 200;
    const geometry_1 = new THREE.ShapeGeometry(circleIn, segments / 2);
    const geometry_2 = new THREE.ShapeGeometry(circleOut, segments / 2);

    const mesh_1 = new THREE.Mesh(geometry_1, face_material);
    const mesh_2 = new THREE.Mesh(geometry_2, outline_material);
    mesh_1.position.set(x,y,0);

    return [mesh_1,mesh_2]
}

function circle(x,y,r) {
    const geometry = new THREE.CircleGeometry( r, 32 ); 
    const circle = new THREE.Mesh( geometry, material_black );
    circle.position.set(x,y,0);
    return circle;
}

function arrow(start_x,start_y,pos_x,pos_y,dir,dist,material=material_line_black,z = 0,) {
    const points = [];
    const o = new THREE.Vector3( start_x, start_y, z )
    const end = new THREE.Vector3(start_x, start_y, z).addScaledVector(dir.normalize(),dist);
    points.push( o );
    points.push(end);

    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const line = new THREE.Line( geometry, material );
    line.position.set(pos_x,pos_y,z);
    return line;
}

class Clock {
    constructor(scene,pos_x,pos_y,radius,border_width=0.5,factor=60,speed_second=0.005,speed_minute=null,speed_hour=null) {
        this.pos_x = pos_x;
        this.pos_y = pos_y;
        this.radius = radius;
        this.border_width = border_width;
        this.speed_second = speed_second;
        this.speed_minute = speed_minute ? speed_minute : this.speed_second / factor;
        this.speed_hour = speed_hour ? speed_hour : this.speed_minute / factor;
        this.node_links = [];
        this.scene = scene;
        this.Instantiate();
    }

    Instantiate() {
        const [in_circle,out_circle] = clockShape(this.pos_x,this.pos_y,this.radius,this.border_width);
        const hour = arrow(0,0,0,0,new THREE.Vector3(1,1,0),this.radius / 2);
        const minute = arrow(0,0,0,0,new THREE.Vector3(0,1,0),this.radius * 3 / 4);
        const second = arrow(-this.radius/10,-this.radius/10,0,0,new THREE.Vector3(1,1,0),this.radius);
        const dot = circle(0,0,0.7 * this.radius / 40);
        dot.renderOrder = 1;

        this.hourhand = hour;
        this.minutehand = minute;
        this.secondhand = second;
        this.dot = dot;
        this.in_circle = in_circle;
        this.out_circle = out_circle;

        const group = new THREE.Group();
        group.add(hour);
        group.add(minute);
        group.add(second);
        group.add(out_circle);
        group.add(dot);
        my_scene.add(group);
        this.group = group;
        this.in_circle.add(group);
        this.scene.add(this.in_circle);
    }

    Tick() {
        this.hourhand.rotateZ(this.speed_hour);
        this.minutehand.rotateZ(this.speed_minute);
        this.secondhand.rotateZ(this.speed_second);
    }

    
}

class NodeArray {
    constructor(scene,clock,count = 1, offset = 4,size = 2, material = material_grey, start_angle = 0,) {
        this.clock = clock;
        this.offset = offset;
        this.count = count;
        this.size = size;
        this.material = material;
        this.start_angle = start_angle;
        this.scene = scene;
        this.Instantiate();
    }

    Instantiate() {
        const x = this.clock.radius + this.clock.border_width + this.offset;
        const segments = 100;
        const angle_offset = 2*Math.PI / this.count;
        for (var i = 0; i < this.count; i++) {
            const circle = new THREE.Shape();
            circle.absarc(x,0,this.size);
            const geometry = new THREE.ShapeGeometry(circle,segments/2);
            const mesh = new THREE.Mesh(geometry,this.material);
            mesh.rotateZ(angle_offset*i);
            mesh.userData = this;
            mesh.layers.enable(NODELAYER);
            this.clock.in_circle.add(mesh);
        }
    }
}

class NodeLink {
    constructor(scene,node_a,node_b,clock_a,clock_b,func_index=0,func_args=null) {

        this.mats = [material_line_black,material_line_blue,material_line_jade,material_line_red];
        this.funcs = [this.Default,this.Accelerate,this.Decelerate,this.Repulsion]
        this.scene = scene;

        this.node_a = node_a;
        this.node_b = node_b;
        this.src_clock = clock_a;
        this.dst_clock = clock_b;
        this.active_func_index = func_index;
        this.func_args = func_args;

        console.log(clock_a);
        clock_a.node_links.push(this);

        this.Instantiate();
        
    }

    Instantiate() {
        console.log(this);
        const points = [];
        var pos_a = new Vector3();
        var pos_b = new Vector3();
        this.node_a.getWorldPosition(pos_a);
        this.node_b.getWorldPosition(pos_b);

        const o = new THREE.Vector3( pos_a.x, pos_a.y, 0 )
        const end = new THREE.Vector3(pos_b.x, pos_b.y, 0)
        points.push( o );
        points.push(end);

        const geometry = new THREE.BufferGeometry().setFromPoints( points );
        const line = new THREE.Line( geometry, this.mats[this.active_func_index] );

        console.log(line);

        this.shape = line;
        this.scene.add(line);
    }

    Effect() {

    }


    Default(src,dst) {

    }
    
    Accelerate(src,dst) {
    
    }
    
    Decelerate(src,dst) {
    
    }
    
    Repulsion(src,dst) {
        
    }

}


//#endregion

var clicked = []
var hovered = null;
var NODELAYER = 5;
const pointer = new THREE.Vector2();
const nodeRaycaster = new THREE.Raycaster();
nodeRaycaster.layers.set(NODELAYER);

function onPointerMove( event ) {

	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    nodeRaycaster.setFromCamera(pointer,camera);
    const intersects = nodeRaycaster.intersectObjects(my_scene.children);

    if (intersects.length > 0) {
        var obj = intersects[0].object;
        if (clicked.indexOf(obj) == -1) {
            obj.material = material_light_grey;
            hovered = obj;
        }
    }
    else {
        if (hovered) {
            if (clicked.indexOf(hovered) == -1) {
                hovered.material = material_grey;
                hovered = null;
            }
        }
    }
    

}

function onPointerClick( event ) {
    nodeRaycaster.setFromCamera( pointer, camera );
    const intersects = nodeRaycaster.intersectObjects( my_scene.children );

    console.log(intersects);
    if (intersects.length <= 0) {
        if (clicked.length > 0) {
            for (var i = 0; i < clicked.length; i++) {
                clicked[i].material = material_grey;
            }
            clicked = []
        }
        return;
    }
    
    if (clicked.length >= 2) {
        clicked = []
    }
    console.log("clicked on node")
    var obj = intersects[0].object;
    clicked.push(obj);
    obj.material = material_black;

    if (clicked.length == 2) {

        processNodeLink(clicked);
    }
}

function processNodeLink(nodes) {
    console.log("processing Node Link")
    if (clicked.length < 2) {
        return;
    }
    var node_a = nodes[0]
    var node_b = nodes[1]

    if (node_a.userData == node_b.userData) {
        console.log("nodes in same node array")
        return;
    }

    console.log("instantiating node link")
    var node_link = new NodeLink(my_scene,node_a,node_b,node_a.userData.clock,node_b.userData.clock);

    
}


//#region main
const clock_a = new Clock(my_scene,0,0,40,0.5,10,0.008);
const clock_b = new Clock(my_scene,10,10,40,0.5,10,0.01);
const node_arr_a = new NodeArray(my_scene,clock_a,4);
const node_arr_b = new NodeArray(my_scene,clock_b,4);

const controls = new DragControls( [clock_a.in_circle,clock_b.in_circle], camera, renderer.domElement );
controls.recursive = false;

function draw() {
	requestAnimationFrame( draw );

    clock_a.Tick();
    clock_b.Tick();

	renderer.render( my_scene, camera );
}
draw();

window.addEventListener( 'pointermove', onPointerMove );
window.addEventListener('pointerdown', onPointerClick);

//#endregion