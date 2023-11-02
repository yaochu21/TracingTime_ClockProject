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
const color_dark_blue = 0x0048bf
const color_dark_red = 0xd00000
const color_red = 0xed7d7d
const color_light_green = 0x84ce84
const color_orange = 0xffab36

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


const mat_line_black_thick = new THREE.LineBasicMaterial( { color: color_black, linewidth: 1 } );

const mat_line_black = new THREE.LineBasicMaterial( { color: color_black, linewidth: 0.5 } );

const mat_line_blue = new THREE.LineBasicMaterial( { color: color_blue, linewidth: 0.5 } );

const mat_line_dark_blue = new THREE.LineBasicMaterial( { color: color_dark_blue, linewidth: 0.5 } );

const mat_line_dark_red = new THREE.LineBasicMaterial( { color: color_dark_red, linewidth: 0.5 } );

const mat_line_red = new THREE.LineBasicMaterial( { color: color_red, linewidth: 0.5 } );

const mat_line_orange = new THREE.LineBasicMaterial( { color: color_orange, linewidth: 0.5 } );

const mat_line_jade = new THREE.LineBasicMaterial( { color: color_jade, linewidth: 0.5 } );

const mat_line_l_green = new THREE.LineBasicMaterial( {color: color_light_green, linewidth: 0.5 })

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

function clock_hand(start_x,start_y,pos_x,pos_y,dir,dist,material=mat_line_black,z = 0,) {
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
    constructor(scene,id,pos_x,pos_y,radius,border_width=0.5,factor=60,speed_second=0.005,node_count=4,speed_minute=null,speed_hour=null) {
        this.pos_x = pos_x;
        this.pos_y = pos_y;
        this.radius = radius;
        this.border_width = border_width;
        this.base_speed = speed_second;
        this.speed_second = speed_second;
        this.speed_minute = speed_minute ? speed_minute : this.speed_second / factor;
        this.speed_hour = speed_hour ? speed_hour : this.speed_minute / factor;
        this.node_links = [];
        this.dst_nodes = [];
        this.src_nodes = [];
        this.node_count = node_count;
        this.scene = scene;
        this.time_factor = factor;
        this.second_hand_rot = 0;
        this.minute_hand_rot = 0;
        this.hour_hand_rot = 0;
        this.internal_counter = 0;
        this.id = id;
        this.active = true;
        this.Instantiate();
    }

    Instantiate() {
        const [in_circle,out_circle] = clockShape(this.pos_x,this.pos_y,this.radius,this.border_width);
        const hour = clock_hand(0,0,0,0,new THREE.Vector3(1,1,0),this.radius / 2);
        const minute = clock_hand(0,0,0,0,new THREE.Vector3(0,1,0),this.radius * 3 / 4);
        const second = clock_hand(-this.radius/10,-this.radius/10,0,0,new THREE.Vector3(1,1,0),this.radius);
        const dot = circle(0,0,0.7 * this.radius / 40);
        dot.renderOrder = 2;

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
        this.in_circle.userData = this;

        this.node_array = new NodeArray(this.scene,this,this.node_count);
    }

    Tick() {
        if (!this.active) {
            return;
        }
        this.hourhand.rotateZ(this.speed_hour);
        this.minutehand.rotateZ(this.speed_minute);
        this.secondhand.rotateZ(this.speed_second);
        this.hour_hand_rot += this.speed_hour;
        this.minute_hand_rot += this.speed_minute;
        this.second_hand_rot += this.speed_second;
        this.internal_counter += 1;
        this.node_links.forEach((l) => l.Effect());
        if (!(this.internal_counter % 150) && this.id.includes("debug")) {
            console.log(this.id + ":" + this.speed_second);
        }
    }

    UpdateNodeLinks() {
        this.node_links.forEach((l) => l.updateGeometry());
    }

    UpdateSpeed(s,m,h,baseSecond=false) {
        if (!this.active) {
            return;
        }
        var a = this.speed_second;
        this.speed_second = s;
        if (baseSecond) {
            this.speed_minute = s / this.time_factor
            this.speed_hour = this.speed_minute / this.time_factor
        }
        else {
            this.speed_minute = m;
            this.speed_hour = h;
        }
        // if (!(this.internal_counter % 150) && this.id.includes("debug")) {
        //     console.log(this.speed_second - a);
        // }
        
    }

    Pause() {
        this.active = false;
    }

    Play() {
        this.active = true;
    }

    PauseAndReset() {
        this.UpdateSpeed(this.base_speed,0,0,true);
        this.active = false;
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
            circle.absarc(0,0,this.size);
            const geometry = new THREE.ShapeGeometry(circle,segments/2);
            const mesh = new THREE.Mesh(geometry,this.material);
            var pos_x = x * Math.cos(angle_offset*i)
            var pos_y = x * Math.sin(angle_offset*i);
            mesh.position.set(pos_x,pos_y,0);

            mesh.userData = this;
            mesh.layers.enable(NODELAYER);
            this.clock.in_circle.add(mesh);
        }
    }
}

class NodeLink {
    constructor(scene,node_a,node_b,clock_a,clock_b,func_index=0) {

        this.funcs_mats = [
                    [this.Default,mat_line_black], 
                    [this.PullBaseSpeed,mat_line_l_green],
                    [this.AccelerateLinear,mat_line_red],
                    [this.AccelerateExponential,mat_line_dark_red],
                    [this.AccelerateByExpDelta,mat_line_orange],
                    [this.DecelerateExponential,mat_line_blue],
                    [this.DecelerateByExpDelta,mat_line_dark_blue]];
        console.log(this.funcs_mats);
        this.scene = scene;

        this.node_a = node_a;
        this.node_b = node_b;
        this.src_clock = clock_a;
        this.dst_clock = clock_b;
        this.active_func_index = func_index;

        clock_a.node_links.push(this);
        clock_b.node_links.push(this);

        this.Instantiate();
        
    }

    Instantiate() {
        console.log(this);
        var pos_a = new Vector3();
        var pos_b = new Vector3();
        this.node_a.getWorldPosition(pos_a);
        this.node_b.getWorldPosition(pos_b);

        // draws line from node a to node b
        const o = new THREE.Vector3( pos_a.x, pos_a.y, 0 )
        const end = new THREE.Vector3(pos_b.x, pos_b.y, 0)

        const geometry = new THREE.BufferGeometry().setFromPoints( [o,end] );
        const line_mesh = new THREE.Line( geometry, this.funcs_mats[this.active_func_index][1] );
        line_mesh.layers.enable(NODELINKLAYER);
        line_mesh.userData = this;

        this.line = line_mesh;
        this.scene.add(line_mesh);

        // draws arrow that points to node b
        var vec_end_o = new Vector3().subVectors(end,o).normalize();
        var vec_end_o_perp = new Vector3(-vec_end_o.y,vec_end_o.x,vec_end_o.z).normalize();
        var p0 = end.clone();
        p0.addScaledVector(vec_end_o,-4).addScaledVector(vec_end_o_perp,-3);
        var p2 = end.clone();
        p2.addScaledVector(vec_end_o,-4).addScaledVector(vec_end_o_perp,3);
        var p1 = end.clone();

        const arrow_geometry = new THREE.BufferGeometry().setFromPoints( [p0,p1,p2] );
        const arrow_mesh = new THREE.Line( arrow_geometry, this.funcs_mats[this.active_func_index][1] );
        this.arrow = arrow_mesh;
        this.scene.add(arrow_mesh);

        // cover node a with large circle
        var c = circle(pos_a.x,pos_a.y,3);
        c.renderOrder = 2;
        this.src_clock.in_circle.attach(c);

    }

    updateGeometry() {
        var o = new Vector3();
        var end = new Vector3();
        this.node_a.getWorldPosition(o);
        this.node_b.getWorldPosition(end);

        const line_geometry = this.line.geometry;
        const line_positions = line_geometry.attributes.position;
        line_positions.setXYZ(0, o.x, o.y, o.z);
        line_positions.setXYZ(1, end.x, end.y, end.z);
        line_geometry.attributes.position.needsUpdate = true;

        const arrow_geometry = this.arrow.geometry;
        const arrow_positions = arrow_geometry.attributes.position;
        
        var vec_end_o = new Vector3().subVectors(end,o).normalize();
        var vec_end_o_perp = new Vector3(-vec_end_o.y,vec_end_o.x,vec_end_o.z).normalize();
        var p0 = end.clone();
        p0.addScaledVector(vec_end_o,-4).addScaledVector(vec_end_o_perp,-3);
        var p2 = end.clone();
        p2.addScaledVector(vec_end_o,-4).addScaledVector(vec_end_o_perp,3);
        var p1 = end.clone();

        arrow_positions.setXYZ(0,p0.x,p0.y,p0.z);
        arrow_positions.setXYZ(1,p1.x,p1.y,p1.z);
        arrow_positions.setXYZ(2,p2.x,p2.y,p2.z);
        arrow_geometry.attributes.position.needsUpdate = true;
        
    }

    IncrementEffectIndex() {
        this.active_func_index += 1;
        if (this.active_func_index >= this.funcs_mats.length) {
            this.active_func_index = 0;
        }
        this.line.material = this.funcs_mats[this.active_func_index][1];
        this.arrow.material = this.funcs_mats[this.active_func_index][1];
        console.log("current effect:"+this.funcs_mats[this.active_func_index][0].name)

        this.dstSpeedOnEffectChange = this.dst_clock.speed_second;
        this.srcSpeedOnEffectChange = this.src_clock.speed_second;
    }

    Effect() {
        this.funcs_mats[this.active_func_index][0](this.src_clock,this.dst_clock,this.srcSpeedOnEffectChange,this.dstSpeedOnEffectChange);
    }

    Default(src,dst,src_init,dst_init) {

    }

    AverageBaseSpeed(src,dst,src_init,dst_init,proportion=0.00025) {
        return;
        var speed_src = src.speed_second
        var speed_dst = dst.speed_second

        var true_avg = (speed_dst + speed_src) / 2.0;
        var speed_src_new = THREE.MathUtils.lerp(speed_src,true_avg,proportion);
        var speed_dst_new = THREE.MathUtils.lerp(speed_dst,true_avg,proportion);
        src.UpdateSpeed(speed_src_new,0,0,true);
        dst.UpdateSpeed(speed_dst_new,0,0,true);
    }

    PullBaseSpeed(src,dst,src_init,dst_init,proportion=0.00025) {
        var speed_src = src.speed_second
        var speed_dst = dst.speed_second

        var true_avg = (speed_dst + speed_src) / 2.0;
        var speed_dst_new = THREE.MathUtils.lerp(speed_dst,true_avg,proportion);
        dst.UpdateSpeed(speed_dst_new,0,0,true);
    }
    
    AccelerateLinear(src,dst,src_init,dst_init,f=0.0005) {
        var speed_dst_new = dst.speed_second + dst.base_speed * f;
        speed_dst_new = Math.min(10,speed_dst_new);

        dst.UpdateSpeed(speed_dst_new,0,0,true);
    }

    AccelerateExponential(src,dst,src_init,dst_init,f=0.0006) {
        var speed_dst_new = dst.speed_second * (1 + f);
        speed_dst_new = Math.min(10,speed_dst_new);

        dst.UpdateSpeed(speed_dst_new,0,0,true);
    }

    AccelerateByExpDelta(src,dst,src_init,dst_init,f=0.0008) {
        var speed_delta = Math.max(0,src.speed_second - dst.speed_second);
        var h = 1 - Math.exp(-speed_delta+Math.log(1/2));
        var speed_dst_new = dst.speed_second * (1 + f * h)
        speed_dst_new = Math.min(10,speed_dst_new);

        dst.UpdateSpeed(speed_dst_new,0,0,true);
        
    }
    
    DecelerateExponential(src,dst,src_init,dst_init,f=0.0006) {
        var speed_dst_new = dst.speed_second * (1 - f)
        dst.UpdateSpeed(speed_dst_new,0,0,true);
    }

    DecelerateByExpDelta(src,dst,src_init,dst_init,f=0.0008) {
        var speed_delta = Math.max(0,dst.speed_second-src.speed_second);
        var h = 1 - Math.exp(-speed_delta+Math.log(1/2));
        var speed_dst_new = dst.speed_second * (1 - f * h)

        dst.UpdateSpeed(speed_dst_new,0,0,true);
    }

}


//#endregion

//#region UI Operations
var clicked = []
var hovered = null;
const NODELAYER = 5;
const NODELINKLAYER = 6;
const UILAYER = 7;
const pointer = new THREE.Vector2();
const nodeRaycaster = new THREE.Raycaster();
nodeRaycaster.layers.set(NODELAYER);

const nodeLinkRaycaster = new THREE.Raycaster();
nodeLinkRaycaster.layers.set(NODELINKLAYER);

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

    if (checkNodeRaycast(event)) {
        return;
    }
    if (checkNodeLinkRaycast(event)) {
        return;
    }

}

function checkNodeRaycast(event) {
    nodeRaycaster.setFromCamera( pointer, camera );
    const intersects = nodeRaycaster.intersectObjects( my_scene.children );

    if (intersects.length <= 0) {
        if (clicked.length > 0) {
            for (var i = 0; i < clicked.length; i++) {
                clicked[i].material = material_grey;
            }
            clicked = []
        }
        return false;
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

    return true;
}


function checkNodeLinkRaycast(event) {
    nodeLinkRaycaster.setFromCamera(pointer,camera);
    const intersects = nodeLinkRaycaster.intersectObjects(my_scene.children);

    if (intersects.length <= 0) {
        return false;
    }
    console.log("clicked on node link");
    const node_link = intersects[0].object.userData;
    node_link.IncrementEffectIndex();
}

function processNodeLink(nodes) {
    console.log("processing Node Link")
    if (clicked.length < 2) {
        return;
    }
    var node_a = nodes[0]
    var node_b = nodes[1]

    if (node_a.userData == node_b.userData) {
        console.log("nodes in same node array");
        return;
    }

    if (node_a.userData.clock.dst_nodes.indexOf(node_b) !== -1) {
        console.log("link already exists");
        return;
    }
    if (node_b.userData.clock.dst_nodes.indexOf(node_a) !== -1) {
        console.log("link already exists");
        return;
    }

    console.log("instantiating node link")
    var node_link = new NodeLink(my_scene,node_a,node_b,node_a.userData.clock,node_b.userData.clock);
    node_a.userData.clock.dst_nodes.push(node_b);
    node_b.userData.clock.src_nodes.push(node_a);
}

function onDrag(event) {
    var clock = event.object.userData;
    clock.UpdateNodeLinks();
}

function onKeyPress(event) {
    console.log(event);

    switch (event.which) {
        case 32:
            if (paused) {
                my_clocks.forEach((c) => c.Play());
                paused = false;
                console.log("play");
            }
            else {
                my_clocks.forEach((c) => c.Pause());
                paused = true;
                console.log("pause");
            }
            break;
        case 113:
            my_clocks.forEach((c) => c.PauseAndReset());
            paused = true;
            console.log("reset")
            break;
        case 101:
            GenerateRandomClock();
            break;
    }
}

function GenerateRandomClock() {
    var key = Math.random().toString();
    var base_speed = THREE.MathUtils.randInt(5,100) * 0.0001;
    var pos_x = 285*THREE.MathUtils.randFloat(-1,1);
    var pos_y = 145*THREE.MathUtils.randFloat(-1,1);
    var num_nodes = THREE.MathUtils.randInt(2,8);
    my_clocks.push(new Clock(my_scene,key,pos_x,pos_y,40,0.5,10,base_speed,num_nodes));
    
    var controls = new DragControls( my_clocks.map((c) => c.in_circle), camera, renderer.domElement );
    controls.recursive = false;
    controls.activate();
    controls.addEventListener('drag',onDrag)
}

//#endregion


//#region MAIN
var my_clocks = []
var paused = false;
my_clocks.push(new Clock(my_scene,"a",0,10,40,0.5,10,0.01));

var controls = new DragControls( my_clocks.map((c) => c.in_circle), camera, renderer.domElement );
controls.recursive = false;
controls.activate();
controls.addEventListener('drag',onDrag)

function draw() {
	requestAnimationFrame( draw );

    my_clocks.forEach((c) => c.Tick());

	renderer.render( my_scene, camera );
}
draw();

window.addEventListener( 'pointermove', onPointerMove );
window.addEventListener('pointerdown', onPointerClick);
window.addEventListener('keypress',onKeyPress);

//#endregion
