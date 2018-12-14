import * as d3 from 'd3';

/**
 * Display colors on map.
 */
export default class Choropleth {

	constructor(containerid, svgid, mapdata, stationdata) {

		this.container = document.getElementById(containerid);
		this.map = d3.select(svgid);

		this.mapdata = mapdata;
		this.stationdata = stationdata;

		this.colorScale = d3.scaleSequential(d3.interpolateRgbBasis(['#C85153', '#FFBA39', '#ffcd07', "#d4e5ee", "#97bee5", "#1d82c5", "#00467d"].reverse())).domain([-5, 20]);
		this.minMaxScale = d3.scaleLinear().range(['#fc8d59', '#ffffff', '#91bfdb'].reverse());

		this.station_area_map = new Map();
		this.stationdata.map(x => this.station_area_map.set(x.station, x.province_code));
	}

	/**
	 * Draw map projection.
	 */
	drawMap() {

		// Update dimensions
		this.calculateWH();

		// Fit projection to size
		this.projection = d3.geoMercator().fitSize([this.viewWidth, this.viewHeight], this.mapdata);
		this.path = d3.geoPath().projection(this.projection);


		// create group or use existing one
		d3.selectAll("#map *").remove();

		// features paths
		this.map.selectAll('path')
			.data(this.mapdata.features)
			.enter()
			.append('path')
			.attr('d', this.path)
			.attr('vector-effect', 'non-scaling-stroke') // keeps stroke-width the same if we transform
			.on('mouseover', (d, i, nodes) => {
				d3.select(nodes[i]).classed('hover', true);
				this.map.classed("hover", true);
			})
			.on('mouseout', (d, i, nodes) => {
				d3.select(nodes[i]).classed('hover', false);
				this.map.classed("hover", false);
			});

		// Draw stations
		this.addStations();

		this.labels = this.map.append("g").attr("class", "label-group");

	}

	/**
	 * Add station markers to map.
	 */
	addStations() {

		// Remove existing stations (e.g. on resize)
		d3.selectAll("#map g").remove();

		// Add stations
		let points = this.map.append('g');
		points.selectAll('circle')
			.data(this.stationdata)
			.enter()
			.append('circle')
			.attr('cx', (d) => this.projection([d.lon, d.lat])[0])
			.attr('cy', (d) => this.projection([d.lon, d.lat])[1])
			.attr('r', 6)
			.style('fill', 'white')
			.style('fill-opacity', .75)
			.style('stroke', 'black')
			.style('stroke-width', 1);
	}

	addEventHandler(event, callback) {
		this.map.selectAll('path').on(event, callback);
	}


	/**
	 * Applies a linear color scale with this area's value at the center.
	 *
	 * @param d Area/province to use as baseline.
	 */
	setBaseline(d) {

		// Calculate domain based on min/max distance to clicked value
		let [min, max] = d3.extent(Object.values(this.data));
		let mean = this.data[d.id];
		let delta = Math.max(Math.abs(min - mean), Math.abs(max - mean));

		// Set domain
		this.minMaxScale.domain([mean - delta, mean, mean + delta]);

		// Recolor provinces
		this.map.selectAll("path").style("fill", x => this.color(x, this.minMaxScale))

		// Unset hover
		d3.selectAll("*.hover").classed("hover", false);
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
	plotData(data) {
		this.setData(data);

		// Color provinces
		this.map.selectAll("path").style("fill", d => this.color(d));

		// Draw labels
		this.labels.selectAll(".label")
			.data(this.mapdata.features)
			.enter()
			.append("text")
			.attr("class", "label")
			.attr("x", d => this.path.centroid(d)[0])
			.attr("y", d => this.path.centroid(d)[1])
			.text(d => {
				let val = this.data[d.id];
				return isNaN(val) ? "" : Number(val).toFixed(1) + "°C";
			});

		// Add click handler for delta comparisons
		this.addEventHandler("click", (d) => this.setBaseline(d));
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