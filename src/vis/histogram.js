import * as d3 from 'd3';
import {calculateSVGWH} from "../utils";

export default class Histogram {
	constructor(containerId, svgId, stationData) {
		this.svg = d3.select(svgId);

		let {viewWidth, viewHeight} = calculateSVGWH(containerId);
		this.viewWidth = viewWidth;
		this.viewHeight = viewHeight - 150;
		this.contextHeight = 50;
		this.contextWidth = viewWidth;

		this.svg
			.attr('width', viewWidth + 100)
			.attr('height', viewHeight);

		this.createMainGroup(viewWidth, viewHeight);


		this.station_area_map = new Map();
		this.stationdata = stationData.map(x => this.station_area_map.set(x.station, x.province_code));

		this.active_stations = new Set();
	}

	createMainGroup() {
		// create group or remove existing
		d3.selectAll("#mainGroup").remove();

		this.group = this.svg
			.append('g')
			.attr('id', 'mainGroup')
	}

	initAxis(width, height, contextHeight, keys) {
		this.x = d3.scaleTime().range([0, width]);
		this.contextX = d3.scaleTime().range([0, width]);
		this.y = d3.scaleLinear().range([height, 0]);
		this.contextY = d3.scaleLinear().range([contextHeight, 0]);

		this.color = d3.scaleOrdinal()
			// indices are used
			.domain([0, keys.length - 1])
			.range(d3.schemeCategory10);

		this.xAxis = d3.axisBottom(this.x);
		this.xContextAxis = d3.axisBottom(this.contextX);
		this.yAxis = d3.axisLeft(this.y);
	}

	initHelpers(width, height, contextHeight) {
		this.brush = d3.brushX()
			.extent([[0, 0], [width, contextHeight]])
			// .on("brush end", () => this.brushed());

		// TODO: maybe find a way to find max zoom based on the data
		let maxZoom = 100;

		this.zoom = d3.zoom()
			.scaleExtent([1, maxZoom])
			.translateExtent([[0, 0], [width, height]])
			.extent([[0, 0], [width, height]])
			// .on("zoom", () => this.zoomed());

	}

	brushed() {
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
		let s = d3.event.selection || this.contextX.range();
		let dates = s.map(this.contextX.invert, this.contextX);
		this.x.domain(dates);

		this.redrawRects();
		this.focus.select(".axis--x").call(this.xAxis);
		this.svg.select(".zoom").call(this.zoom.transform, d3.zoomIdentity
			.scale(this.viewWidth / (s[1] - s[0]))
			.translate(-s[0], 0));
	}

	zoomed() {
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
		let t = d3.event.transform;
		let dates = t.rescaleX(this.contextX).domain();
		this.x.domain(dates);

		this.redrawRects();
		this.focus.select(".axis--x").call(this.xAxis);
		this.context.select(".brush").call(this.brush.move, this.x.range().map(t.invertX, t));
	}

	redrawRects() {
		this.focus
			.selectAll('rect')
			.attr('x', (d, i) => {
				// Somehow x0 values that are out of the x-range are shown
				// Therefore we check here if the point is in the current range
				let range = this.x.range();
				let x0 = this.x(d.data.x0);
				let x1 = this.x(d.data.x1);

				if (range[0] <= x0 && x1 <= range[1]) {
					return x0;
				} else {
					return -1000;
				}
			})
			.attr('width', d => (this.x(d.data.x1) - this.x(d.data.x0)));
	}

	setElements(width, height) {
		this.group.append("defs").append("clipPath")
			.attr("id", "clip")
			.append("rect")
			.attr("width", width)
			.attr("height", height);

		this.focus = this.group.append("g")
			.attr("class", "focus")
			.attr("transform", "translate(40,20)");

		this.context = this.group.append("g")
			.attr("class", "context")
			.attr("transform", `translate(${40},${this.viewHeight + this.contextHeight})`);
	}

	setStackedData(data) {
		let line = d3.line()
			// place line in the middel of the interval
			.x(d => (this.x(d.data.x0) - this.x(d.data.x1) / 2))
			.y(d => (this.y(d.total_duration)))

		;


		// this.focus
		// 	.selectAll('g')
		// 	.data(data)
		// 	.enter().append('g')
		// 	// TODO: colors for the stacks
		// 	.attr('fill', (d, i) => this.color(i))
		// 	// .attr('fill', 'steelblue')
		// 	.selectAll('rect')
		// 	.data(d => d)
		// 	.enter().append("rect")
		// 	// .attr('class', "area")
		// 	.attr('x', (d, i) => this.x(d.data.x0))
		// 	.attr('y', (d) => this.y(d[1]))
		// 	.attr('height', d => this.y(d[0]) - this.y(d[1]))
		// 	.attr('width', d => (this.x(d.data.x1) - this.x(d.data.x0)))
		this.focus
			.selectAll('g')
			.data(data)
			.enter()
			.append('g')
			.selectAll('path')
			.data(d => {
				console.log(d);
				console.log(Object.entries(d));
				return Object.entries(d)

			})
			.append('path')
			.attr('d', d => {
				console.log(d)
				return line(d)

			})
			// .attr('d', d => console.log(d))
			// .attr('fill', (d, i) => this.color(i))

		this.focus.append("g")
			.attr("class", "axis axis--x")
			.attr("transform", "translate(0," + this.viewHeight + ")")
			.call(this.xContextAxis);

		this.focus.append("g")
			.attr("class", "axis axis--y")
			.call(this.yAxis);

		this.context
			.selectAll('g')
			.data(data)
			.enter().append('g')
			.attr('fill', (d, i) => this.color(i))
			.selectAll('rect')
			.data(d => d)
			.enter().append("rect")
			// .attr('class', "area")
			.attr('x', (d, i) => this.contextX(d.data.x0))
			.attr('y', (d) => this.contextY(d[1]))
			.attr('height', d => this.contextY(d[0]) - this.contextY(d[1]))
			.attr('width', d => (this.contextX(d.data.x1) - this.contextX(d.data.x0)));

		this.context.append("g")
			.attr("class", "axis axis--x")
			.attr("transform", "translate(0," + this.contextHeight + ")")
			.call(this.xContextAxis);

		this.context.append("g")
			.attr("class", "brush")
			.call(this.brush)
			.call(this.brush.move, this.x.range());

		this.svg.append("rect")
			.attr("class", "zoom")
			.attr("width", this.viewWidth)
			.attr("height", this.viewHeight)
			.attr("transform", "translate(40,20)")
			.call(this.zoom);
	}

	transformData(data, keys, binSize, dateHandler, stationHandler) {
		// First we need to set the domains because this is need for our transformation
		this.x.domain(d3.extent(data, dateHandler));
		this.contextX.domain(this.x.domain());
		this.contextY.domain(this.y.domain());

		// Make bins of binSize, which could be a year, month, week or day
		let hist = d3.histogram()
			.domain(this.x.domain())
			.value(dateHandler)
			.thresholds(this.x.ticks(binSize))
		;

		// Now preprocess before we can apply stacking
		let stackData = [];
		let bins = hist(data);
		// console.log(bins);


		// let lineData = [];
		// for (let bin of bins) {
		// 	let obj = {};
		// 	obj.x0 = bin.x0;
		// 	obj.x1 = bin.x1;
		//
		//
		// 	let stationsData =
		// 	let lines = [];
		//
		//
		// 	console.log(bin)
		// }

		let maxY = -100;
		for (let bin in bins) {
			//console.log(bins[bin].x0, bins[bin].x1)
			let pushableObject = {};
			// add the time boundaries.
			// pushableObject.x0 = bins[bin].x0;
			// pushableObject.x1 = bins[bin].x1;
			// for each bin, split the data into the different keys.
			bins[bin].forEach((d) => {
				// console.log(d);
				let stn = stationHandler(d);
				if (!pushableObject[stn]) {
					pushableObject[stn] = [d]
				}
				else pushableObject[stn].push(d);
			});
			// if any of the keys didn't get represented in this bin, give them empty arrays for the stack function.
			keys.forEach((key) => {
				if (!pushableObject[key]) {
					pushableObject[key] = [];
					pushableObject[key].total_duration = 0;
					pushableObject[key].total_percentage = 0;
					pushableObject[key].x0 = bins[bin].x0;
					pushableObject[key].x1 = bins[bin].x1;
				} else {
					// compute totals etc.
					pushableObject[key].total_duration = d3.sum(pushableObject[key], d => d.duration);
					pushableObject[key].total_percentage = d3.sum(pushableObject[key], d => d.percentage);
					pushableObject[key].x0 = bins[bin].x0;
					pushableObject[key].x1 = bins[bin].x1;

					if (pushableObject[key].total_duration > maxY ) {
						maxY = pushableObject[key].total_duration;
					}

				}
			});

			stackData.push(pushableObject);
		}

		// Now stack the data based on the stations
		// let stack = d3.stack()
		// 	.keys(keys)
		// 	.value((d, key) => d[key].total_duration)
		// ;
		// let stacks = stack(stackData);
		// console.log(stackData);

		// Top stack always contains the y-axis maximum because data is stacked
		// let maxY = d3.max(stacks[stacks.length - 1], d => d[1]);
		// let maxY = d3.max(stackData, d => stacks[stacks.length - 1], d => d[1]);
		console.log(maxY);
		this.y.domain([0, maxY]);
		this.contextY.domain(this.y.domain());

		return stackData;
	}

	// transformToLineData(data, keys, bin)

	getAveragesPerProvince(measurements) {
		// Calculate averages for the selected data, per province
		let data = {};

		this.active_stations = new Set();

		// TODO: might be improved with native d3 code
		measurements.forEach((row) => {

			let stnID = parseInt(row.STN);
			this.active_stations.add(stnID);

			// Get area code
			let PV = this.station_area_map.get(stnID);

			// Add measurements to data object
			if (typeof (data[PV]) === "undefined") data[PV] = {};
			if (typeof (data[PV][row.date]) === "undefined") data[PV][row.date] = [];
			data[PV][row.date].push(parseInt(row.duration));
		});

		console.log(data);

		// Calculate averages per province for all data
		for (let province in data) {
			let average = 0, days = 0;

			// Calculate sum for all measurements on this day
			for (let date in data[province]) {
				average += data[province][date].filter(x => !isNaN(x)).reduce((avg, value, _, {length}) => avg + (value / 10) / length, 0);
				days++;
			}

			// Calculate average for this province
			// data[province] = average / days;
		}

		// Store data
		return data;
	}

	plotData(data) {
		console.log(data);
		const dateHandler = d => d.date;
		const binSize = d3.timeWeek;

		// clean and transform to date to JS date object
		data = data.filter(d => {
			return d.duration !== undefined && d.percentage !== undefined
		});
		let parseDate = d3.timeParse("%Y-%m-%d");
		data = data.map(d => {
			return {
				...d,
				date: parseDate(d.date),
			}
		});

		// let m = this.getAveragesPerProvince(data);
		// console.log(m);

		// Compute stations keys
		const stationHandler = d => d.STN;
		let keys = d3.map(data, stationHandler).keys();

		// Create axis, zoom, brush, focus and context element
		this.createMainGroup();
		this.initAxis(this.viewWidth, this.viewHeight, this.contextHeight, keys);

		// const amountOfDays = d3.timeDay.count(...d3.extent(data, dateHandler));
		this.initHelpers(this.viewWidth, this.viewHeight, this.contextHeight);
		this.setElements(this.viewWidth, this.viewHeight);

		// Transform the data to the stacked version
		let stacked = this.transformData(data, keys, binSize, dateHandler, stationHandler);
		this.setStackedData(stacked);
	}
}
