window.requestNextAnimationFrame = (function () {
    return window.requestAnimationFrame       ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame    ||
           window.msRequestAnimationFrame     ||
           function (callback, element) {
               var self = this,
                   start,
                   finish;
               window.setTimeout(function() {
                   start = +new Date();
                   callback(start);
                   finish = +new Date();
                   self.timeout = 1000 / 60 - (finish - start);
               }, self.timeout);
           };
}());

var MCPI = MCPI || {};

MCPI.inside = function(point) {
    return (Math.pow(point.x, 2) + Math.pow(point.y, 2)) < 1;
};

MCPI.randomPoint = function() {
    return {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1
    };
};

MCPI.Model = function() {
    this.counters = {
        inside: 0,
        outside: 0
    };
    this.handlers = [];
    this.points = [];
};

MCPI.Model.prototype = {

    constructor: MCPI.Model,

    addPoint: function(point) {
        this.points.push(point);
        this.updateCounters(point);
    },

    addRandomPoint: function() {
        var randomPoint = MCPI.randomPoint();
        this.addPoint(randomPoint);
        this.trigger("pointAdded", [this, point]);
    },

    addRandomPoints: function(number) {
        var points = [];
        for (var i = 0; i < number; i++) {
            var randomPoint = MCPI.randomPoint();
            this.addPoint(randomPoint);
            points.push(randomPoint);
        }
        this.trigger("pointsAdded", [this, points]);
    },

    bind: function(handler) {
        this.handlers.push(handler);
        if ("ready" in handler) {
            handler.ready.call(handler);
        }
    },

    calculatePi: function() {
        var pointsInside = this.counters.inside;
        var numPoints = this.points.length;
        return (4.0 * pointsInside) / numPoints;
    },

    reset: function() {
        this.points = [];
        this.counters.inside = 0;
        this.counters.outside = 0;
        this.trigger("reset", [this]);
    },

    trigger: function(event, params) {
        this.handlers.forEach(function(handler) {
            if (event in handler) {
                handler[event].apply(handler, params);
            }
        });
    },

    updateCounters: function(point) {
        var side = MCPI.inside(point) ? "inside" : "outside";
        this.counters[side]++;
    }

};

MCPI.Controller = function(model, sampleSize) {
    this.model = model;
    this.sampleSize = sampleSize;
    this.play = false;
    this.handlers = [];
};

MCPI.Controller.prototype = {

    constructor: MCPI.Controller,

    bind: function(handler) {
        this.handlers.push(handler);
    },

    next: function() {
        if (this.play && this.model.points.length < this.sampleSize) {
            this.model.addRandomPoints(5000);
            window.requestNextAnimationFrame(function() {
                this.next();
            }.bind(this));
        }
    },

    reset: function() {
        this.play = false;
        this.model.reset();
    },

    start: function() {
        this.model.reset();
        this.play = true;
        this.trigger("start", [this]);
        window.requestNextAnimationFrame(function() {
            this.next();
        }.bind(this));
    },

    trigger: function(event, params) {
        this.handlers.forEach(function(handler) {
            if (event in handler) {
                handler[event].apply(handler, params);
            }
        });
    }

};

MCPI.DashboardView = function(options) {
    this.controller = options.controller;
    this.completionBar = options.completionBar;
    this.counters = {
        inside: options.counters.inside,
        outside: options.counters.outside
    };
    this.equation = options.equation;
    this.pointSize = options.pointSize;
    this.sampleSize = options.sampleSize;
    this.startButton = options.startButton;
    this.addListeners();
};

MCPI.DashboardView.prototype = {

    constructor: MCPI.DashboardView,

    addListeners: function() {
        this.startButton.addEventListener("click", function() {
            if (this.startButton.value === "start") {
                this.controller.start();
            } else if (this.startButton.value === "stop") {
                this.controller.reset();
            }
        }.bind(this));
        this.sampleSize.addEventListener("change", function(event) {
            this.controller.sampleSize = parseInt(event.srcElement.value, 10);
        }.bind(this));
        this.pointSize.addEventListener("change", function(event) {
            alert('test');
            this.pointSize = parseInt(event.srcElement.value, 10);
        }.bind(this));
    },

    pointAdded: function(model) {
        this.renderEquation(model);
        this.renderCounters(model);
        this.renderCompletionBar(model);
    },

    pointsAdded: function(model) {
        this.renderEquation(model);
        this.renderCounters(model);
        this.renderCompletionBar(model);
    },

    // Controller callbacks

    reset: function(model) {
        this.renderEquation(model);
        this.renderCounters(model);
        this.renderCompletionBar(model);
        this.startButton.className = "mcpiStartStop mcpiStart";
        this.startButton.innerHTML = "START";
        this.startButton.value = "start";
        this.sampleSize.disabled = false;
        this.pointSize.disabled = false;
    },

    start: function() {
        this.sampleSize.disabled = true;
        this.pointSize.disabled = true;
        this.startButton.className = "mcpiStartStop mcpiStop";
        this.startButton.innerHTML = "RESET";
        this.startButton.value = "stop";
    },

    renderCompletionBar: function(model) {
        var numPoints = model.points.length;
        var sampleSize = parseInt(this.sampleSize.value, 10);
        var barWidth = 249;
        var completionbarWidth = (numPoints * barWidth) / sampleSize;
        this.completionBar.setAttribute("width", "" + completionbarWidth);
    },

    renderCounters: function(model) {
        this.counters.inside.innerHTML = model.counters.inside;
        this.counters.outside.innerHTML = model.counters.outside;
    },

    renderEquation: function(model) {
        var pi = model.calculatePi();
        if (model.points.length % 50 == 0) {
            var math = MathJax.Hub.getAllJax(this.equation.id)[0];
            MathJax.Hub.Queue(["Text",math,"\\pi \\approx 4 \\frac{" +
               model.counters.inside + "}{" + model.points.length + "} = " + pi.toFixed(4)]);
        }
    }

};

MCPI.CanvasView = function(options) {
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext("2d");
    this.colors = options.colors;
    // this.pointSize = options.pointSize;
    this.pointSize = 1;
    this.canvas.width = options.size;
    this.canvas.height = options.size;
};

MCPI.CanvasView.prototype = {

    constructor: MCPI.CanvasView,

    // Callbacks

    pointAdded: function(model, point) {
        var circleSide = MCPI.inside(point) ? "inside" : "outside",
            color = this.colors[circleSide];
        this.renderPoint(point, color);
    },

    pointsAdded: function(model, points) {
        for (var i = 0; i < points.length; i++) {
            this.pointAdded(model, points[i]);
        }
    },

    reset: function() {
        this.ready();
    },

    // Object

    ready: function() {
        this.renderBorder();
        this.renderBackground();
        this.renderCircle();
    },

    renderBackground: function() {
        this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.fill();
    },

    renderBorder: function() {
        var borderSize = Math.round(this.canvas.width * 0.05);
        this.canvas.style.border = borderSize + "px solid " + this.colors.circle;
    },

    renderCircle: function() {
        var centerX = this.canvas.width / 2,
            centerY = this.canvas.height / 2,
            radius = this.canvas.width / 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.colors.circle;
        this.ctx.fill();
    },

    renderPoint: function(point, color) {
        var centerX = this.canvas.width * ((point.x + 1) / 2),
            centerY = this.canvas.height * ((point.y + 1) / 2);
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.pointSize, 0, Math.PI * 2, false);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

};

(function() {

    var model = new MCPI.Model();

    var controller = new MCPI.Controller(model, 5000);

    var canvasView = new MCPI.CanvasView({
        canvas: document.getElementById("mcpiCanvasView"),
        pointSize: parseInt(document.getElementById("mcpiPointSize").value, 10),
        size: 300,
        colors: {
            bg: "#F2D6B3",      // light brown
            circle: "#D9B89C",  // brown
            inside: "#2980b9",  // blue
            outside: "#c0392b"  // red
        }
    });

    var dashboardView = new MCPI.DashboardView({
        colors: {
            inside: "#2980b9",  // blue
            outside: "#c0392b"  // red
        },
        completionBar: document.getElementById("mcpiRect"),
        counters: {
            inside: document.getElementById("mcpiInsideCounter"),
            outside: document.getElementById("mcpiOutsideCounter")
        },
        equation: document.getElementById("mcpiEquation"),
        sampleSize: document.getElementById("mcpiSampleSize"),
        pointSize: document.getElementById("mcpiPointSize"),
        startButton: document.getElementById("mcpiStartButton"),
        controller: controller
    });

    model.bind(canvasView);
    model.bind(dashboardView);
    controller.bind(dashboardView);
    
}());
