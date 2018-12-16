import * as d3 from 'd3';

/**
 * Display colors on map.
 */
export default class Timeline {

	constructor(containerid, svgid, min, max) {

		this.container = document.getElementById(containerid);
		this.timeline = d3.select(svgid);
		this.minDate = min;
		this.maxDate = max;

	}

	/**
	 * Draw timeline.
	 */
	draw() {

		// calculate width/height
		this.calculateWH();

		let parseDate = d3.timeParse("%b %Y");

		let x = d3.scaleTime().range([0, this.viewWidth]),
			y = d3.scaleLinear().range([this.viewHeight, 0]);

		let xAxis = d3.axisBottom(x);

		let brush = d3.brushX()
			.extent([[0, 0], [this.viewWidth, this.viewHeight]])
			.on("brush end", brushed);

		let zoom = d3.zoom()
			.scaleExtent([1, Infinity])
			.translateExtent([[0, 0], [this.viewWidth, this.viewHeight]])
			.extent([[0, 0], [this.viewWidth, this.viewHeight]])
			.on("zoom", this.zoomed);

		let area2 = d3.area()
			.curve(d3.curveMonotoneX)
			.x(function (d) {
				return x(d.date);
			})
			.y0(this.viewHeight)
			.y1(function (d) {
				console.log(d);
				return y(d.price);
			});

		this.timeline.append("defs").append("clipPath")
			.attr("id", "clip")
			.append("rect")
			.attr("width", this.viewWidth)
			.attr("height", this.viewHeight);

		// let focus = this.timeline.append("g")
		// 	.attr("class", "focus")
			// .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		let context = this.timeline.append("g")
			.attr("class", "context")
			// .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

		d3.csv("sp500.csv", type, function (error, data) {
			if (error) throw error;

			x.domain(d3.extent(data, function (d) {
				return d.date;
			}));
			y.domain([0, d3.max(data, function (d) {
				return d.price;
			})]);
			x2.domain(x.domain());
			y2.domain(y.domain());

			focus.append("path")
				.datum(data)
				.attr("class", "area")
				.attr("d", area);

			focus.append("g")
				.attr("class", "axis axis--x")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			focus.append("g")
				.attr("class", "axis axis--y")
				.call(yAxis);

			context.append("path")
				.datum(data)
				.attr("class", "area")
				.attr("d", area2);

			context.append("g")
				.attr("class", "axis axis--x")
				.attr("transform", "translate(0," + height2 + ")")
				.call(xAxis2);

			context.append("g")
				.attr("class", "brush")
				.call(brush)
				.call(brush.move, x.range());

			svg.append("rect")
				.attr("class", "zoom")
				.attr("width", width)
				.attr("height", height)
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
				.call(zoom);
		})
	}

	brushed() {
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
		var s = d3.event.selection || x2.range();
		x.domain(s.map(x2.invert, x2));
		focus.select(".area").attr("d", area);
		focus.select(".axis--x").call(xAxis);
		svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
			.scale(width / (s[1] - s[0]))
			.translate(-s[0], 0));
	}

	zoomed() {
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
		var t = d3.event.transform;
		x.domain(t.rescaleX(x2).domain());
		focus.select(".area").attr("d", area);
		focus.select(".axis--x").call(xAxis);
		context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
	}

	type(d) {
		d.date = parseDate(d.date);
		d.price = +d.price;
		return d;
	}

	/**
	 * Calculates width and height of map.
	 */
	calculateWH() {
		let style = getComputedStyle(this.container);
		this.viewHeight = this.container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
		this.viewWidth = this.container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
	}

	/**
	 * Add data to map.
	 * @param measurements List of records. Required fields: 'STN', 'DATE', 'measurement'.
	 */
	setData(measurements) {

		// Calculate averages for the selected data, per province
		let data = {};

		// TODO: might be improved with native d3 code
		measurements.forEach((row) => {

			// Get area code
			let PV = this.station_area_map.get(parseInt(row.STN));

			// Add measurements to data object
			if (typeof (data[PV]) == "undefined") data[PV] = {};
			if (typeof (data[PV][row.DATE]) == "undefined") data[PV][row.DATE] = [];
			data[PV][row.DATE].push(parseInt(row.measurement));
		});

		// Calculate averages per province for all data
		for (let province in data) {
			let average = 0, days = 0;

			// Calculate sum for all measurements on this day
			for (let date in data[province]) {
				average += data[province][date].filter(x => !isNaN(x)).reduce((avg, value, _, {length}) => avg + (value / 10) / length, 0);
				days++;
			}

			// Calculate average for this province
			data[province] = average / days;
		}

		// Store data
		this.data = data;
	}

	/**
	 * Plot data that is associated with this map.
	 *
	 * @param data List of records. Required fields: 'STN', 'DATE', 'measurement'.
	 */
	plot() {

		// Color provinces
		this.timeline.selectAll("path").style("fill", d => this.color(d));

		this.drawLabels(d => {
			let val = this.data[d.id];
			return isNaN(val) ? "" : Number(val).toFixed(1) + "°C";
		});

		// Add click handler for delta comparisons
		this.addEventHandler("click", d => this.setBaseline(d));
	}

	drawLabels(func) {

		// Remove existing labels
		this.labels.selectAll(".label").remove()

		// Draw labels
		this.labels.selectAll(".label")
			.data(this.timelinedata.features)
			.enter()
			.append("text")
			.attr("class", "label")
			.attr("x", d => this.path.centroid(d)[0])
			.attr("y", d => this.path.centroid(d)[1])
			.text(func);
	}

	/**
	 * Calculate color for province based on a color scale.
	 *
	 * @param d Province object.
	 * @param scale Color scale.
	 * @returns {*} Color for province.
	 */
	color(d, scale) {
		if (typeof scale == "undefined") scale = this.colorScale;

		let value = this.data[d.id];
		if (typeof (value) == "undefined") return "url(#na)";

		return scale(value);
	}

}